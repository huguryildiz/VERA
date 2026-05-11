// src/jury/juryPreloadCache.js
// In-memory prefetch cache populated by JuryGatePage during the verification
// screen's 3.5s window. Two consumers:
//   1. useJuryLoading on mount — uses periodInfo + projectCount to render the
//      arrival/identity landing card without a duplicate fetch.
//   2. _loadPeriod (post-PIN) — uses `projects` as a fallback when the live
//      listProjects call returns an empty array. Prevents the juror from being
//      stranded with "No projects available" when the fetch hits a transient
//      RLS/auth/abort race after PIN.
//
// TTL is generous because (1) consumes early and (2) consumes late — the gap
// can be a minute or more if the juror takes time on identity/PIN. Use
// `consumeJuryPreload` if you want the auto-clear-on-read semantics; use
// `peekJuryPreload` to read without clearing (fallback path).

const TTL_MS = 5 * 60_000; // 5 minutes — covers slow identity + PIN entry

let entry = null; // { periodId, periods, periodInfo, projectCount, projects, ts }

export function setJuryPreload({ periodId, periods, periodInfo, projectCount, projects }) {
  entry = {
    periodId: periodId || null,
    periods: Array.isArray(periods) ? periods : null,
    periodInfo: periodInfo || null,
    projectCount: Number.isFinite(projectCount) ? projectCount : null,
    projects: Array.isArray(projects) ? projects : null,
    ts: Date.now(),
  };
}

function readFresh(expectedPeriodId) {
  if (!entry) return null;
  const fresh = Date.now() - entry.ts < TTL_MS;
  const matches = !expectedPeriodId || entry.periodId === expectedPeriodId;
  return fresh && matches ? entry : null;
}

/** Read and clear the preload. Returns null if absent, stale, or wrong period. */
export function consumeJuryPreload(expectedPeriodId) {
  const out = readFresh(expectedPeriodId);
  entry = null;
  return out;
}

/** Read the preload without clearing it. Use when another path may still need it. */
export function peekJuryPreload(expectedPeriodId) {
  return readFresh(expectedPeriodId);
}

export function clearJuryPreload() {
  entry = null;
}
