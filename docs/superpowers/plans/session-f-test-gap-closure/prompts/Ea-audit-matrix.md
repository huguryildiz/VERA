VERA — Session F Fa: Audit Matrix Expansion

## Your job

Extend `src/shared/api/admin/__tests__/auditLogCompleteness.test.js` from 15 to 35+ tests.
Cover admin RPC wrappers not yet tested. Update qa-catalog.json. Run `npm test -- --run`.

## Strict scope — only touch these two files

- `src/shared/api/admin/__tests__/auditLogCompleteness.test.js`
- `src/test/qa-catalog.json` (ONLY add `audit.completeness.*` entries — no other namespaces)

Do NOT create new files. Do NOT modify source files.

## Context

VERA is a multi-tenant academic jury platform. Admin actions must produce audit log entries.
The existing test file verifies that calling admin functions triggers the correct Supabase RPC.

Current state: 15 tests (`audit.completeness.01` through `audit.completeness.15`) covering:
`writeAuditLog`, `writeAuthFailureEvent`, `revokeEntryToken`, `logExportInitiated`,
`forceCloseJurorEditMode`, `listAuditLogs`.

The mock pattern (already in place at the top of the file):

```js
const { mockRpc, mockFrom } = vi.hoisted(() => ({ mockRpc: vi.fn(), mockFrom: vi.fn() }));
vi.mock("@/shared/lib/supabaseClient", () => ({
  supabase: { rpc: mockRpc, from: mockFrom, auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));
const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }));
vi.mock("@/shared/api/core/invokeEdgeFunction", () => ({ invokeEdgeFunction: mockInvoke }));
```

## Step 1: Read these files to understand actual RPC names

1. `src/shared/api/admin/__tests__/auditLogCompleteness.test.js` — understand existing pattern
2. `src/shared/api/admin/jurors.js` — find: `createJuror`, `updateJuror`, `deleteJuror`, `resetJurorPin`, `unlockJurorPin`
3. `src/shared/api/admin/projects.js` — find: `createProject`, `deleteProject`
4. `src/shared/api/admin/periods.js` — find: `createPeriod`, `deletePeriod`, `setEvalLock`, `publishPeriod`, `closePeriod`, `duplicatePeriod`, `savePeriodCriteria`
5. `src/shared/api/admin/tokens.js` — find: `generateEntryToken` (`revokeEntryToken` already tested — skip)
6. `src/test/qa-catalog.json` — understand format before adding entries

## Step 2: Add tests (IDs: audit.completeness.16 onwards)

For each function, verify it calls `supabase.rpc` with the correct RPC name.

Pattern to follow (example from existing file):

```js
qaTest("audit.completeness.12", async () => {
  mockRpc.mockResolvedValue({ error: null });
  await forceCloseJurorEditMode({ jurorId: "j1", periodId: "p1" });
  expect(mockRpc).toHaveBeenCalledWith(
    "rpc_admin_force_close_juror_edit_mode",
    expect.any(Object)
  );
});
```

Functions to cover (read actual RPC name from source before writing the test):

- `createJuror`
- `updateJuror`
- `deleteJuror`
- `resetJurorPin`
- `unlockJurorPin`
- `createProject`
- `deleteProject`
- `createPeriod`
- `deletePeriod`
- `setEvalLock`
- `publishPeriod`
- `closePeriod`
- `duplicatePeriod`
- `savePeriodCriteria`
- `generateEntryToken`

Add imports at the top of the test file alongside existing imports:

```js
import { createJuror, updateJuror, deleteJuror, resetJurorPin, unlockJurorPin } from "../jurors.js";
import { createProject, deleteProject } from "../projects.js";
import { createPeriod, deletePeriod, setEvalLock, publishPeriod, closePeriod, duplicatePeriod, savePeriodCriteria } from "../periods.js";
import { generateEntryToken } from "../tokens.js";
```

## Step 3: Update qa-catalog.json

Add one entry per new test. Match the exact JSON format of existing entries.
Add catalog entries BEFORE writing tests (qaTest IDs must exist in catalog first).

## Step 4: Run tests and write report

```bash
npm test -- --run
```

Verify 0 failures.

Write implementation report to:
`docs/superpowers/plans/session-f-test-gap-closure/implementation_reports/Fa-audit-matrix.md`

Include: tests added count, final total, which functions now covered.

## Rules

- NEVER commit
- ONLY touch the two allowed files
- Add catalog entries FIRST, then write tests that reference those IDs
- Run and verify 0 failures before writing report
