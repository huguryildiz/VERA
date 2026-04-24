import { adminClient } from "./supabaseAdmin";
import { E2E_PERIODS_ORG_ID } from "../fixtures/seed-ids";

/**
 * Outcome attainment fixture for E1 math-correctness tests.
 *
 * Builds a fully isolated period with criteria, outcomes, criterion→outcome
 * mappings, one juror, one project, and one submitted score sheet. The period
 * is locked at the end so the configuration matches the real "analytics can
 * read this period" state.
 *
 * `readAttainment` replicates the per-outcome weighted-average formula at
 * [src/shared/api/admin/scores.js:259-345](src/shared/api/admin/scores.js#L259-L345)
 * (`getOutcomeAttainmentTrends`). The test reads DB state through service role,
 * applies the same math, and returns `{ [outcomeCode]: avg }`.
 *
 * Schema note: two `weight` fields exist.
 *   - `period_criteria.weight`   → stored, NOT used by attainment math
 *   - `period_criterion_outcome_maps.weight` → used by attainment math
 * The fixture lets callers configure both independently.
 */

export interface CriterionSpec {
  key: string;
  weight: number;   // period_criteria.weight (metadata; NOT used in attainment)
  max: number;      // period_criteria.max_score (divisor in attainment math)
}

export interface MappingSpec {
  outcomeCode: string;
  criterionKey: string;
  weight: number;                          // period_criterion_outcome_maps.weight (used in math)
  coverage_type?: "direct" | "indirect";   // default "direct"
}

export interface ScoreSpec {
  key: string;      // criterion key
  value: number;    // score_sheet_items.score_value
}

export interface SetupOutcomeFixtureOpts {
  criteriaWeights: CriterionSpec[];
  outcomeMappings: MappingSpec[];
  scores: ScoreSpec[];
  namePrefix?: string;
}

export interface OutcomeFixture {
  periodId: string;
  orgId: string;
  jurorId: string;
  projectId: string;
  scoreSheetId: string;
  /** criterionKey → period_criteria.id */
  criteriaIds: Record<string, string>;
  /** outcomeCode → period_outcomes.id */
  outcomeIds: Record<string, string>;
  /** `${outcomeCode}::${criterionKey}` → period_criterion_outcome_maps.id */
  mappingIds: Record<string, string>;
}

const uniqueSuffix = (): string => `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
const mappingKey = (outcomeCode: string, criterionKey: string): string => `${outcomeCode}::${criterionKey}`;

export async function setupOutcomeFixture(opts: SetupOutcomeFixtureOpts): Promise<OutcomeFixture> {
  const suffix = uniqueSuffix();
  const periodName = `${opts.namePrefix ?? "E1 Outcome"} ${suffix}`;

  // 1. Period (unlocked so child INSERTs pass block_period_*_on_locked triggers)
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
    throw new Error(`setupOutcomeFixture period insert failed: ${periodErr?.message}`);
  }
  const periodId = period.id as string;

  // 2. Criteria — unique key per period (key scoped with suffix to avoid collisions
  //    across concurrent fixture instances within the same org)
  const criteriaRows = opts.criteriaWeights.map((c, idx) => ({
    period_id: periodId,
    key: `${c.key}_${suffix}`,
    label: c.key,
    max_score: c.max,
    weight: c.weight,
    sort_order: idx,
  }));
  const { data: criteria, error: critErr } = await adminClient
    .from("period_criteria")
    .insert(criteriaRows)
    .select("id, key, sort_order");
  if (critErr || !criteria) {
    throw new Error(`setupOutcomeFixture criteria insert failed: ${critErr?.message}`);
  }

  // Map input key ("C1") → inserted id, via sort_order (stable across DB reorders)
  const criteriaIds: Record<string, string> = {};
  for (const c of criteria) {
    const input = opts.criteriaWeights[c.sort_order];
    if (!input) continue;
    criteriaIds[input.key] = c.id as string;
  }

  // 3. Outcomes — derive unique codes from mappings
  const outcomeCodes = Array.from(new Set(opts.outcomeMappings.map((m) => m.outcomeCode)));
  const outcomeRows = outcomeCodes.map((code, idx) => ({
    period_id: periodId,
    code,
    label: code,
    sort_order: idx,
  }));
  const { data: outcomes, error: outErr } = await adminClient
    .from("period_outcomes")
    .insert(outcomeRows)
    .select("id, code");
  if (outErr || !outcomes) {
    throw new Error(`setupOutcomeFixture outcomes insert failed: ${outErr?.message}`);
  }
  const outcomeIds: Record<string, string> = {};
  for (const o of outcomes) outcomeIds[o.code as string] = o.id as string;

  // 4. Criterion→outcome mappings
  const mapRows = opts.outcomeMappings.map((m) => {
    const criterionId = criteriaIds[m.criterionKey];
    const outcomeId = outcomeIds[m.outcomeCode];
    if (!criterionId) throw new Error(`setupOutcomeFixture: unknown criterionKey ${m.criterionKey}`);
    if (!outcomeId) throw new Error(`setupOutcomeFixture: unknown outcomeCode ${m.outcomeCode}`);
    return {
      period_id: periodId,
      period_criterion_id: criterionId,
      period_outcome_id: outcomeId,
      coverage_type: m.coverage_type ?? "direct",
      weight: m.weight,
    };
  });
  const { data: maps, error: mapErr } = await adminClient
    .from("period_criterion_outcome_maps")
    .insert(mapRows)
    .select("id, period_criterion_id, period_outcome_id");
  if (mapErr || !maps) {
    throw new Error(`setupOutcomeFixture mappings insert failed: ${mapErr?.message}`);
  }
  // Reverse-index mapping IDs
  const outcomeCodeById = Object.fromEntries(
    Object.entries(outcomeIds).map(([code, id]) => [id, code])
  );
  const criterionKeyById = Object.fromEntries(
    Object.entries(criteriaIds).map(([key, id]) => [id, key])
  );
  const mappingIds: Record<string, string> = {};
  for (const m of maps) {
    const code = outcomeCodeById[m.period_outcome_id as string];
    const key = criterionKeyById[m.period_criterion_id as string];
    if (code && key) mappingIds[mappingKey(code, key)] = m.id as string;
  }

  // 5. Juror (org-scoped)
  const { data: juror, error: jurorErr } = await adminClient
    .from("jurors")
    .insert({
      organization_id: E2E_PERIODS_ORG_ID,
      juror_name: `E1 Juror ${suffix}`,
      affiliation: "E1 Test Affiliation",
    })
    .select("id")
    .single();
  if (jurorErr || !juror) {
    throw new Error(`setupOutcomeFixture juror insert failed: ${jurorErr?.message}`);
  }
  const jurorId = juror.id as string;

  // 6. juror_period_auth — F1 rule: session_token_hash explicitly null
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
    throw new Error(`setupOutcomeFixture juror_period_auth insert failed: ${authErr.message}`);
  }

  // 7. Project (project_no auto-assigned)
  const { data: project, error: projErr } = await adminClient
    .from("projects")
    .insert({
      period_id: periodId,
      title: `E1 Project ${suffix}`,
      members: [],
    })
    .select("id")
    .single();
  if (projErr || !project) {
    throw new Error(`setupOutcomeFixture project insert failed: ${projErr?.message}`);
  }
  const projectId = project.id as string;

  // 8. score_sheet (submitted status — attainment math does not filter by status,
  //    but "submitted" mirrors a real evaluation)
  const now = new Date().toISOString();
  const { data: sheet, error: sheetErr } = await adminClient
    .from("score_sheets")
    .insert({
      period_id: periodId,
      project_id: projectId,
      juror_id: jurorId,
      status: "submitted",
      started_at: now,
      last_activity_at: now,
    })
    .select("id")
    .single();
  if (sheetErr || !sheet) {
    throw new Error(`setupOutcomeFixture score_sheet insert failed: ${sheetErr?.message}`);
  }
  const scoreSheetId = sheet.id as string;

  // 9. score_sheet_items — one per score spec
  const itemRows = opts.scores.map((s) => {
    const critId = criteriaIds[s.key];
    if (!critId) throw new Error(`setupOutcomeFixture: score references unknown criterion ${s.key}`);
    return {
      score_sheet_id: scoreSheetId,
      period_criterion_id: critId,
      score_value: s.value,
    };
  });
  if (itemRows.length) {
    const { error: itemsErr } = await adminClient.from("score_sheet_items").insert(itemRows);
    if (itemsErr) {
      throw new Error(`setupOutcomeFixture score_sheet_items insert failed: ${itemsErr.message}`);
    }
  }

  // 10. Lock period (mirrors real active-period state)
  const { error: lockErr } = await adminClient
    .from("periods")
    .update({ is_locked: true, activated_at: new Date().toISOString() })
    .eq("id", periodId);
  if (lockErr) {
    throw new Error(`setupOutcomeFixture period lock failed: ${lockErr.message}`);
  }

  return {
    periodId,
    orgId: E2E_PERIODS_ORG_ID,
    jurorId,
    projectId,
    scoreSheetId,
    criteriaIds,
    outcomeIds,
    mappingIds,
  };
}

/**
 * Reads per-outcome attainment (`avg` field) from DB state.
 *
 * Formula mirrors `getOutcomeAttainmentTrends` at
 * [src/shared/api/admin/scores.js:259-345](src/shared/api/admin/scores.js#L259-L345):
 *   per evaluation  evalScore = Σ (raw/max * 100 * weight) / Σ weight
 *   per outcome     avg       = mean(evalScores); rounded to 1 decimal
 *
 * Returns `{ [outcomeCode]: avg }`. Outcomes with no contributors are omitted.
 */
export async function readAttainment(periodId: string): Promise<Record<string, number>> {
  const [criteriaRes, mapsRes, sheetsRes] = await Promise.all([
    adminClient
      .from("period_criteria")
      .select("id, key, max_score")
      .eq("period_id", periodId),
    adminClient
      .from("period_criterion_outcome_maps")
      .select("period_criterion_id, weight, period_outcomes(code)")
      .eq("period_id", periodId),
    adminClient
      .from("score_sheets")
      .select("id, score_sheet_items(score_value, period_criteria(key))")
      .eq("period_id", periodId),
  ]);
  if (criteriaRes.error) throw new Error(`readAttainment criteria query failed: ${criteriaRes.error.message}`);
  if (mapsRes.error) throw new Error(`readAttainment maps query failed: ${mapsRes.error.message}`);
  if (sheetsRes.error) throw new Error(`readAttainment sheets query failed: ${sheetsRes.error.message}`);

  // criterion id → { key, max }
  const criteriaById: Record<string, { key: string; max: number }> = {};
  for (const c of criteriaRes.data || []) {
    criteriaById[c.id as string] = { key: c.key as string, max: Number(c.max_score) };
  }

  // outcome code → [{ key, max, weight }, ...]
  const outcomeContributors: Record<string, Array<{ key: string; max: number; weight: number }>> = {};
  for (const m of mapsRes.data || []) {
    // supabase-js types nested joins as array | object depending on FK cardinality;
    // period_outcomes is a single-row join, so treat as object.
    const code = (m.period_outcomes as { code?: string } | null)?.code;
    const critId = m.period_criterion_id as string;
    const criterion = criteriaById[critId];
    if (!code || !criterion) continue;
    const weight = typeof m.weight === "number" ? m.weight : 1;
    (outcomeContributors[code] ||= []).push({ key: criterion.key, max: criterion.max, weight });
  }

  // Pivot each score_sheet into { criterionKey: value }
  const evals: Array<Record<string, number>> = [];
  for (const sheet of sheetsRes.data || []) {
    const row: Record<string, number> = {};
    for (const item of (sheet.score_sheet_items as Array<{ score_value: number; period_criteria: { key?: string } | null }> | null) || []) {
      const key = item.period_criteria?.key;
      if (!key) continue;
      const val = item.score_value != null ? Number(item.score_value) : NaN;
      if (Number.isFinite(val)) row[key] = val;
    }
    evals.push(row);
  }

  const result: Record<string, number> = {};
  for (const [code, contributors] of Object.entries(outcomeContributors)) {
    const evalScores: number[] = [];
    for (const evalRow of evals) {
      let weightedSum = 0;
      let effectiveWeight = 0;
      for (const c of contributors) {
        const raw = evalRow[c.key];
        if (raw == null || !Number.isFinite(Number(raw)) || c.max === 0) continue;
        weightedSum += (Number(raw) / c.max) * 100 * c.weight;
        effectiveWeight += c.weight;
      }
      if (effectiveWeight > 0) evalScores.push(weightedSum / effectiveWeight);
    }
    if (!evalScores.length) continue;
    const avg = evalScores.reduce((s, v) => s + v, 0) / evalScores.length;
    result[code] = Math.round(avg * 10) / 10;
  }
  return result;
}

/**
 * Idempotent teardown. Unlocks the period (so block_period_*_on_locked triggers
 * don't reject DELETE cascades on child tables), then deletes the period
 * (CASCADE removes projects, score_sheets, score_sheet_items, period_criteria,
 * period_outcomes, period_criterion_outcome_maps, juror_period_auth rows), then
 * deletes the standalone juror row.
 *
 * Safe to call with null/undefined or a partial fixture — use in afterEach/afterAll.
 */
export async function teardownOutcomeFixture(
  fixture: OutcomeFixture | null | undefined
): Promise<void> {
  if (!fixture) return;

  if (fixture.periodId) {
    try {
      await adminClient
        .from("periods")
        .update({ is_locked: false })
        .eq("id", fixture.periodId);
    } catch {
      // continue — delete below will surface the real failure
    }
    try {
      await adminClient.from("periods").delete().eq("id", fixture.periodId);
    } catch {
      // swallow — partial cleanup is acceptable in afterEach
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

/**
 * Deletes a single criterion↔outcome mapping while the period is unlocked, then
 * re-locks the period. Used by Test 4 to verify attainment responds to mapping
 * removal.
 */
export async function deleteMapping(
  fixture: OutcomeFixture,
  outcomeCode: string,
  criterionKey: string
): Promise<void> {
  const mapId = fixture.mappingIds[mappingKey(outcomeCode, criterionKey)];
  if (!mapId) throw new Error(`deleteMapping: no mapping found for ${outcomeCode}::${criterionKey}`);

  const { error: unlockErr } = await adminClient
    .from("periods")
    .update({ is_locked: false })
    .eq("id", fixture.periodId);
  if (unlockErr) throw new Error(`deleteMapping unlock failed: ${unlockErr.message}`);

  const { error: delErr } = await adminClient
    .from("period_criterion_outcome_maps")
    .delete()
    .eq("id", mapId);
  if (delErr) throw new Error(`deleteMapping delete failed: ${delErr.message}`);

  const { error: relockErr } = await adminClient
    .from("periods")
    .update({ is_locked: true, activated_at: new Date().toISOString() })
    .eq("id", fixture.periodId);
  if (relockErr) throw new Error(`deleteMapping relock failed: ${relockErr.message}`);

  delete fixture.mappingIds[mappingKey(outcomeCode, criterionKey)];
}
