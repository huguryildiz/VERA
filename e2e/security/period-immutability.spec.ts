import { test, expect } from "@playwright/test";
import { adminClient } from "../helpers/supabaseAdmin";

// Period structural immutability:
//   trigger_block_periods_on_locked_mutate fires as BEFORE UPDATE on any period
//   where is_locked = true and a structural column (name, season, description,
//   start_date, end_date, framework_id, organization_id) changes.
//   The trigger raises ERRCODE='check_violation'. Service role is subject to
//   this trigger because current_user_is_super_admin() checks auth.uid(), which
//   is NULL for service role → returns false → trigger runs.
//
// Score write gap (documented, not a pass/fail):
//   score_sheets_insert RLS only checks org membership, not closed_at.
//   There is no trigger on score_sheets that enforces closed_at.
//   Score writes to closed periods succeed (enforcement gap).

// ─────────────────────────────────────────────────────────────────────────────
// Structural immutability
// ─────────────────────────────────────────────────────────────────────────────

test.describe("period structural immutability (locked-period trigger)", () => {
  let testPeriodId: string | null = null;

  test.afterEach(async () => {
    if (testPeriodId) {
      // Always unlock the period, even if the test failed midway.
      // The trigger allows is_locked changes (it only blocks structural columns).
      await adminClient
        .from("periods")
        .update({ is_locked: false })
        .eq("id", testPeriodId);
      testPeriodId = null;
    }
  });

  test("BEFORE UPDATE trigger blocks structural column change on a locked period", async () => {
    const { data: periods } = await adminClient
      .from("periods")
      .select("id, name")
      .eq("is_locked", false)
      .limit(1);

    if (!periods?.length) {
      test.skip();
      return;
    }

    const { id: periodId, name: originalName } = periods[0];

    // Lock the period so the trigger becomes active.
    // Trigger allows: OLD.is_locked=false → returns immediately (no column check).
    const { error: lockError } = await adminClient
      .from("periods")
      .update({ is_locked: true })
      .eq("id", periodId);
    expect(lockError).toBeNull();

    testPeriodId = periodId; // afterEach will unlock this

    // Attempt a structural column change on the now-locked period.
    // Trigger should raise ERRCODE=23514 (check_violation) → error not null.
    const { data, error } = await adminClient
      .from("periods")
      .update({ name: "IMMUTABILITY-HACKED" })
      .eq("id", periodId)
      .select("name");

    expect(error).not.toBeNull();
    expect(data).toBeNull();

    // Verify the name was not changed in the database.
    const { data: verify } = await adminClient
      .from("periods")
      .select("name")
      .eq("id", periodId)
      .single();

    expect(verify?.name).toBe(originalName);
  });

  // ── Deliberately-break evidence ────────────────────────────────────────────
  // Proves the trigger is scoped to locked periods only, not all updates.
  test("deliberately-break: structural column update on an unlocked period succeeds", async () => {
    const { data: periods } = await adminClient
      .from("periods")
      .select("id, name")
      .eq("is_locked", false)
      .limit(1);

    if (!periods?.length) {
      test.skip();
      return;
    }

    const { id: periodId, name: originalName } = periods[0];
    const testName = `E2E-IMMUTABILITY-BREAK-${Date.now()}`;

    const { data, error } = await adminClient
      .from("periods")
      .update({ name: testName })
      .eq("id", periodId)
      .select("name");

    // Trigger is inactive for unlocked periods — update must succeed.
    expect(error).toBeNull();
    expect(Array.isArray(data) && data[0]?.name).toBe(testName);

    // Restore the original name.
    await adminClient
      .from("periods")
      .update({ name: originalName })
      .eq("id", periodId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Score write gap
// ─────────────────────────────────────────────────────────────────────────────

test.describe("closed period score write protection (enforcement gap)", () => {
  let insertedSheetId: string | null = null;

  test.afterEach(async () => {
    if (insertedSheetId) {
      await adminClient.from("score_sheets").delete().eq("id", insertedSheetId);
      insertedSheetId = null;
    }
  });

  // GAP: The score_sheets_insert RLS policy checks only org membership — not
  // closed_at. No trigger on score_sheets enforces the closed state. This test
  // documents the gap by verifying that a service-role insert into a closed
  // period's score_sheets succeeds (error === null).
  //
  // Constraint note: score_sheets has UNIQUE(juror_id, project_id). The test
  // searches for a (juror, project) pair with no existing sheet to avoid a
  // 23505 conflict error masking the gap result.
  test("score_sheets insert succeeds for a closed period — closed_at not enforced (gap)", async () => {
    const { data: closedPeriods } = await adminClient
      .from("periods")
      .select("id, organization_id")
      .not("closed_at", "is", null)
      .limit(10);

    if (!closedPeriods?.length) {
      test.skip();
      return;
    }

    let periodId: string | null = null;
    let projectId: string | null = null;
    let jurorId: string | null = null;

    outer: for (const period of closedPeriods) {
      const { data: projects } = await adminClient
        .from("projects")
        .select("id")
        .eq("period_id", period.id)
        .limit(5);
      if (!projects?.length) continue;

      const { data: jurors } = await adminClient
        .from("jurors")
        .select("id")
        .eq("organization_id", period.organization_id)
        .limit(20);
      if (!jurors?.length) continue;

      for (const project of projects) {
        const { data: existingSheets } = await adminClient
          .from("score_sheets")
          .select("juror_id")
          .eq("project_id", project.id);

        const alreadyScored = new Set(
          (existingSheets ?? []).map((s: { juror_id: string }) => s.juror_id),
        );
        const cleanJuror = jurors.find((j: { id: string }) => !alreadyScored.has(j.id));
        if (!cleanJuror) continue;

        periodId = period.id;
        projectId = project.id;
        jurorId = cleanJuror.id;
        break outer;
      }
    }

    if (!periodId || !projectId || !jurorId) {
      test.skip();
      return;
    }

    const { data, error } = await adminClient
      .from("score_sheets")
      .insert({
        period_id: periodId,
        project_id: projectId,
        juror_id: jurorId,
        status: "draft",
      })
      .select("id")
      .single();

    // GAP: insert succeeds — no closed_at check in policy or trigger.
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();

    insertedSheetId = data?.id ?? null;
  });
});
