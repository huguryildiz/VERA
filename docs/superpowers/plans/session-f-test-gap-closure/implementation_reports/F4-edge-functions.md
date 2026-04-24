# F4 — Edge Functions Deno Test Suite

**Date:** 2026-04-25
**Branch:** test/e1-fix-real-production-math

## Summary

Wrote real Deno test files for 3 Supabase Edge Functions (19 new tests) and registered 52 QA catalog entries covering 8 edge functions in the `edge.real.*` namespace. All 134 Deno edge tests pass; 938 unit tests pass with 0 regressions.

## Test Files Created

| File | Tests | QA IDs |
|------|-------|--------|
| `supabase/functions/receive-email/index.test.ts` | 5 | `edge.real.receive-email.01–05` |
| `supabase/functions/password-reset-email/index.test.ts` | 6 | `edge.real.password-reset-email.01–06` |
| `supabase/functions/email-verification-send/index.test.ts` | 8 | `edge.real.email-verification-send.01–08` |

## QA Catalog Entries Added (`src/test/qa-catalog.json`)

52 new entries across 8 functions (IDs .01–.08 each, or as specified):

- `edge.real.on-auth-event.01–08`
- `edge.real.request-score-edit.01–06`
- `edge.real.send-export-report.01–06`
- `edge.real.auto-backup.01–07`
- `edge.real.notify-maintenance.01–06`
- `edge.real.receive-email.01–05`
- `edge.real.password-reset-email.01–06`
- `edge.real.email-verification-send.01–08`

## Test Run Results

```
# Edge tests (Deno)
cd supabase/functions && deno test --allow-net --allow-env --allow-read --import-map=_test/import_map.json
134 tests passed in 736ms

# Unit tests (Vitest)
npm test -- --run
Test Files  234 passed (234)
Tests       938 passed (938)
```

## Implementation Notes

### receive-email

Env vars (`SUPABASE_URL`, `SERVICE_ROLE_KEY`, `RESEND_API_KEY`) are captured at **module level** — the test file uses two separate setup functions to control whether `RESEND_API_KEY` is set before `captureHandler` is called. The 405/400 responses return **plain text** (not JSON), so those tests use `res.text()` instead of `readJson()`.

### password-reset-email

Env is read inside the handler, so a single shared `setup()` suffices. On `generateLink` error the function returns `200 {ok:true}` deliberately — no account existence leak. The `adminGenerateLink` mock key in `mock-supabase.ts` maps to `auth.admin.generateLink()`.

### email-verification-send

Three-stage auth path: env check → bearer token → `auth.getUser()` → profile lookup → token upsert. The `email_verification_tokens` insert chain (`.insert().select("token").maybeSingle()`) resolves through `selectMaybeSingle` in the mock because `maybeSingle()` always reads `tableMock().selectMaybeSingle` regardless of the preceding operation. Setting `email_verified_at: null` in the profiles mock allows the test to reach the token creation stage; a truthy string triggers the early-exit "already verified" path.
