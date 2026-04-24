import { adminClient } from "./supabaseAdmin";
import { E2E_PERIODS_ORG_ID } from "../fixtures/seed-ids";

/**
 * Scoring fixture for C4 scoring-correctness tests.
 *
 * Creates a fully isolated period with its own criteria, projects, juror, and
 * juror_period_auth row, then locks the period so it auto-selects as the admin
 * default (pickDefaultPeriod prefers published/locked with most recent
 * activated_at).
 *
 * VERA's getProjectSummary computes totalAvg as the unweighted raw sum of
 * score_sheet_items.score_value across all criteria, averaged across jurors.
 * period_criteria.weight is stored but NOT used by the ranking pipeline —
 * max_score is the effective scaling factor. Tests must pick score values that
 * yield the expected raw sum, not values that assume weight-multiplier math.
 */

export interface ScoringFixture {
  periodId: string;
  periodName: string;
  criteriaAId: string;
  criteriaBId: string;
  p1Id: string;
  p2Id: string;
  jurorId: string;
}

export interface SetupScoringFixtureOpts {
  aMax?: number;
  bMax?: number;
  aWeight?: number;
  bWeight?: number;
  namePrefix?: string;
}

export interface ProjectScores {
  a: number;
  b: number;
}

const uniqueSuffix = (): string => `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

export async function setupScoringFixture(
  opts: SetupScoringFixtureOpts = {},
): Promise<ScoringFixture> {
  const aMax = opts.aMax ?? 30;
  const bMax = opts.bMax ?? 70;
  const aWeight = opts.aWeight ?? aMax;
  const bWeight = opts.bWeight ?? bMax;
  const suffix = uniqueSuffix();
  const periodName = `${opts.namePrefix ?? "C4 Scoring"} ${suffix}`;

  // Step 1 — create period unlocked so criteria & projects inserts are allowed
  // by the block_period_*_on_locked triggers.
  const { data: period, error: periodErr } = await adminClient
    .from("periods")
    .insert({
      organization_id: E2E_PERIODS_ORG_ID,
      name: periodName,
      is_locked: false,
      season: "Spring",
    })
    .select("id")
    .single();
  if (periodErr || !period) {
    throw new Error(`setupScoringFixture period insert failed: ${periodErr?.message}`);
  }
  const periodId = period.id as string;

  // Step 2 — two criteria with sort_order so we can resolve A vs B
  const { data: criteria, error: critErr } = await adminClient
    .from("period_criteria")
    .insert([
      {
        period_id: periodId,
        key: `c4_a_${suffix}`,
        label: "Criterion A",
        max_score: aMax,
        weight: aWeight,
        sort_order: 0,
      },
      {
        period_id: periodId,
        key: `c4_b_${suffix}`,
        label: "Criterion B",
        max_score: bMax,
        weight: bWeight,
        sort_order: 1,
      },
    ])
    .select("id, sort_order");
  if (critErr || !criteria) {
    throw new Error(`setupScoringFixture criteria insert failed: ${critErr?.message}`);
  }
  const criteriaAId = criteria.find((c) => c.sort_order === 0)?.id as string | undefined;
  const criteriaBId = criteria.find((c) => c.sort_order === 1)?.id as string | undefined;
  if (!criteriaAId || !criteriaBId) {
    throw new Error("setupScoringFixture: could not resolve criteria IDs from insert");
  }

  // Step 3 — two projects; project_no auto-assigned by assign_project_no trigger
  const { data: projects, error: projErr } = await adminClient
    .from("projects")
    .insert([
      { period_id: periodId, title: `C4 P1 ${suffix}`, members: [] },
      { period_id: periodId, title: `C4 P2 ${suffix}`, members: [] },
    ])
    .select("id, title");
  if (projErr || !projects) {
    throw new Error(`setupScoringFixture projects insert failed: ${projErr?.message}`);
  }
  const p1Id = projects.find((p) => p.title.startsWith("C4 P1"))?.id as string | undefined;
  const p2Id = projects.find((p) => p.title.startsWith("C4 P2"))?.id as string | undefined;
  if (!p1Id || !p2Id) {
    throw new Error("setupScoringFixture: could not resolve project IDs from insert");
  }

  // Step 4 — juror (org-scoped)
  const { data: juror, error: jurorErr } = await adminClient
    .from("jurors")
    .insert({
      organization_id: E2E_PERIODS_ORG_ID,
      juror_name: `C4 Judge ${suffix}`,
      affiliation: "C4 Test Affiliation",
    })
    .select("id")
    .single();
  if (jurorErr || !juror) {
    throw new Error(`setupScoringFixture juror insert failed: ${jurorErr?.message}`);
  }
  const jurorId = juror.id as string;

  // Step 5 — juror_period_auth (F1 rule: session_token_hash explicitly null)
  const { error: authErr } = await adminClient
    .from("juror_period_auth")
    .insert({
      juror_id: jurorId,
      period_id: periodId,
      pin_hash: null,
      session_token_hash: null,
      failed_attempts: 0,
      locked_until: null,
      final_submitted_at: null,
    });
  if (authErr) {
    throw new Error(`setupScoringFixture juror_period_auth insert failed: ${authErr.message}`);
  }

  // Step 6 — lock period + set activated_at so pickDefaultPeriod auto-selects it
  const { error: lockErr } = await adminClient
    .from("periods")
    .update({
      is_locked: true,
      activated_at: new Date().toISOString(),
    })
    .eq("id", periodId);
  if (lockErr) {
    throw new Error(`setupScoringFixture period lock failed: ${lockErr.message}`);
  }

  return { periodId, periodName, criteriaAId, criteriaBId, p1Id, p2Id, jurorId };
}

/**
 * Submits score sheets for both fixture projects on behalf of the fixture juror.
 * Uses upsert so callers can re-score after mutating fixture state.
 */
export async function writeScoresAsJuror(
  fixture: ScoringFixture,
  scores: { p1: ProjectScores; p2: ProjectScores },
): Promise<void> {
  const now = new Date().toISOString();

  const { data: sheets, error: sheetErr } = await adminClient
    .from("score_sheets")
    .upsert(
      [
        {
          period_id: fixture.periodId,
          project_id: fixture.p1Id,
          juror_id: fixture.jurorId,
          status: "submitted",
          started_at: now,
          last_activity_at: now,
        },
        {
          period_id: fixture.periodId,
          project_id: fixture.p2Id,
          juror_id: fixture.jurorId,
          status: "submitted",
          started_at: now,
          last_activity_at: now,
        },
      ],
      { onConflict: "juror_id,project_id" },
    )
    .select("id, project_id");
  if (sheetErr || !sheets) {
    throw new Error(`writeScoresAsJuror sheets upsert failed: ${sheetErr?.message}`);
  }
  const p1Sheet = sheets.find((s) => s.project_id === fixture.p1Id);
  const p2Sheet = sheets.find((s) => s.project_id === fixture.p2Id);
  if (!p1Sheet || !p2Sheet) {
    throw new Error("writeScoresAsJuror: could not resolve score sheets from upsert");
  }

  const { error: itemsErr } = await adminClient
    .from("score_sheet_items")
    .upsert(
      [
        { score_sheet_id: p1Sheet.id, period_criterion_id: fixture.criteriaAId, score_value: scores.p1.a },
        { score_sheet_id: p1Sheet.id, period_criterion_id: fixture.criteriaBId, score_value: scores.p1.b },
        { score_sheet_id: p2Sheet.id, period_criterion_id: fixture.criteriaAId, score_value: scores.p2.a },
        { score_sheet_id: p2Sheet.id, period_criterion_id: fixture.criteriaBId, score_value: scores.p2.b },
      ],
      { onConflict: "score_sheet_id,period_criterion_id" },
    );
  if (itemsErr) {
    throw new Error(`writeScoresAsJuror items upsert failed: ${itemsErr.message}`);
  }
}

/**
 * Unlocks the fixture period, rewrites the two criteria with new max/weight,
 * clears prior score sheets (so a fresh writeScoresAsJuror doesn't collide on
 * the UNIQUE(juror_id, project_id) constraint with stale data), then re-locks
 * and refreshes activated_at so the period remains the admin's default pick.
 */
export async function reweightFixture(
  fixture: ScoringFixture,
  aMax: number,
  bMax: number,
  aWeight?: number,
  bWeight?: number,
): Promise<void> {
  const { error: unlockErr } = await adminClient
    .from("periods")
    .update({ is_locked: false })
    .eq("id", fixture.periodId);
  if (unlockErr) {
    throw new Error(`reweightFixture unlock failed: ${unlockErr.message}`);
  }

  // Clear existing sheets (cascades score_sheet_items). Avoids stale scores
  // if a caller only re-scores one project.
  const { error: clearErr } = await adminClient
    .from("score_sheets")
    .delete()
    .eq("period_id", fixture.periodId);
  if (clearErr) {
    throw new Error(`reweightFixture score_sheets clear failed: ${clearErr.message}`);
  }

  const [aRes, bRes] = await Promise.all([
    adminClient
      .from("period_criteria")
      .update({ max_score: aMax, weight: aWeight ?? aMax })
      .eq("id", fixture.criteriaAId),
    adminClient
      .from("period_criteria")
      .update({ max_score: bMax, weight: bWeight ?? bMax })
      .eq("id", fixture.criteriaBId),
  ]);
  if (aRes.error) throw new Error(`reweightFixture criterion A update failed: ${aRes.error.message}`);
  if (bRes.error) throw new Error(`reweightFixture criterion B update failed: ${bRes.error.message}`);

  const { error: relockErr } = await adminClient
    .from("periods")
    .update({
      is_locked: true,
      activated_at: new Date().toISOString(),
    })
    .eq("id", fixture.periodId);
  if (relockErr) {
    throw new Error(`reweightFixture relock failed: ${relockErr.message}`);
  }
}

/**
 * Idempotent teardown. Unlocks the period (so CASCADE-delete doesn't trip the
 * block_period_*_on_locked triggers on child tables), deletes the period
 * (cascading to projects, period_criteria, score_sheets, score_sheet_items,
 * juror_period_auth for that period), then deletes the juror row.
 *
 * Safe to call with an undefined / partial fixture — used as afterAll cleanup.
 */
export async function teardownScoringFixture(
  fixture: ScoringFixture | null | undefined,
): Promise<void> {
  if (!fixture) return;

  if (fixture.periodId) {
    try {
      await adminClient
        .from("periods")
        .update({ is_locked: false })
        .eq("id", fixture.periodId);
    } catch {
      // continue — delete attempt below will surface real failure
    }
    try {
      await adminClient.from("periods").delete().eq("id", fixture.periodId);
    } catch {
      // swallow — partial cleanup is acceptable in afterAll
    }
  }

  if (fixture.jurorId) {
    try {
      await adminClient.from("jurors").delete().eq("id", fixture.jurorId);
    } catch {
      // swallow
    }
  }
}
