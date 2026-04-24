# Flake Log

One line per intermittently-failing spec, with suspected root cause and owning sprint for follow-up.

Format: `<spec path>:<line> — <symptom> — <suspected cause> — owner: <sprint>`

---

- ~~`e2e/admin/projects.spec.ts:74`~~ **FIXED B5** — Root cause traced to two separate races: (1) `usePageRealtime` (used by `useManagePeriods`) lacked a `VITE_E2E` guard, allowing periods CREATE realtime events → 400ms debounce → `refreshPeriods()` DB query → stale snapshot overwrites `removePeriod()` optimistic state; (2) `viewPeriodId` loading race in `useManageProjects` — `handleAddProject` returns `{ ok: false }` when period not yet loaded, drawer stays open. Fixes: (a) added `if (import.meta.env.VITE_E2E) return` guard to `usePageRealtime.js`; (b) added `data-testid="projects-no-period"` sentinel to `ProjectsTable.jsx` and updated `ProjectsPom.waitForReady()` to wait for sentinel count=0. Verified 3×3 = 0 flakes.
- ~~`e2e/admin/projects-import.spec.ts:33`~~ **FIXED B5** — Resolved as a side-effect of the `usePageRealtime` fix above. No additional changes needed. Verified 3×3 = 0 flakes.
