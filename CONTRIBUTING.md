# Contributing to VERA

VERA is proprietary software — see [`LICENSE.md`](LICENSE.md). The repository is
publicly viewable, but the codebase is not open for general contribution.

This document exists for two audiences:

1. **Authorized contributors** — the maintainer and collaborators with write access, plus institutions working under a commercial license agreement.
2. **Everyone else** — people who want to report a bug, request a feature, or flag a security issue without contributing code.

## For Everyone

| I want to… | Do this |
| --- | --- |
| Report a security vulnerability | Follow [`SECURITY.md`](SECURITY.md) — email, never a public issue |
| Report a bug | Open a GitHub issue with reproduction steps and environment |
| Request a feature | Open a GitHub issue describing the evaluation workflow it serves |
| License VERA for an institution | Email [huguryildiz@gmail.com](mailto:huguryildiz@gmail.com) |

Unsolicited pull requests are generally closed without merge. If you have a fix
you believe belongs in VERA, open an issue first and describe it — code submitted
without prior agreement cannot be accepted, because contributions to a
proprietary codebase require an explicit copyright assignment.

## For Authorized Contributors

### Prerequisites

- Node.js 20 (the version CI runs)
- npm
- Access to a Supabase project for local development

### Setup

```bash
npm install
npm run dev     # localhost:5173
```

Create `.env.local` before starting the dev server. It must contain:

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_RPC_SECRET=<vault-rpc_secret-value>
```

Full reference: [`docs/deployment/environment-variables.md`](docs/deployment/environment-variables.md).

### Project Conventions

The working rules live in [`CLAUDE.md`](CLAUDE.md) and [`.claude/rules/`](.claude/rules/).
Read the relevant rule file before touching an area:

| Area | Rule file |
| --- | --- |
| Git and commit flow | [`.claude/rules/git.md`](.claude/rules/git.md) |
| General workflow | [`.claude/rules/workflow.md`](.claude/rules/workflow.md) |
| Database migrations | [`.claude/rules/db-migrations.md`](.claude/rules/db-migrations.md) |
| Edge Functions | [`.claude/rules/edge-functions.md`](.claude/rules/edge-functions.md) |
| Realtime subscriptions | [`.claude/rules/realtime.md`](.claude/rules/realtime.md) |
| UI/UX conventions | [`.claude/rules/ui-conventions.md`](.claude/rules/ui-conventions.md) |
| Testing (how) | [`.claude/rules/testing.md`](.claude/rules/testing.md) |
| Testing (what) | [`.claude/rules/test-writing.md`](.claude/rules/test-writing.md) |

Architecture and routing are documented in [`docs/architecture/`](docs/architecture/)
and the decision records in [`docs/decisions/`](docs/decisions/).

Non-negotiables worth stating up front:

- **Migrations are snapshot-based.** Fix the existing file in `sql/migrations/`; do not add patch files. Apply to both `vera-prod` and `vera-demo` in the same step, and update `sql/README.md`.
- **Edge Functions deploy to both projects** — a function present in prod but missing in demo fails silently.
- **No native form controls.** Use `CustomSelect`, `ConfirmDialog`, `FbAlert` — never `<select>`, `window.confirm`, or inline error text.
- **Tests ship with the implementation**, in the same commit. Every `qaTest()` ID must exist in `src/test/qa-catalog.json` first.
- **Documentation updates ship with the change**, not afterward. See the Doc Sync table in [`CLAUDE.md`](CLAUDE.md).

### Development Workflow

```bash
npm run dev            # dev server
npm test -- --run      # unit tests, CI-style
npm run e2e            # Playwright (admin + other + maintenance)
npm run test:edge      # Edge Function tests (Deno)
npm run build          # production build
```

### Before Opening a PR

Run the full local gate:

```bash
npm run check:no-native-select
npm run check:no-nested-panels
npm run check:css-size
npm run check:js-size
npm run check:rls-tests
npm run check:rpc-tests
npm run check:edge-schema
npm run check:guideline-coverage
npm test -- --run
npm run build
```

Then verify against the running app with a real database. A green build and green
unit tests do not catch schema mismatches, missing RPCs, or runtime rendering
failures — only opening the affected page does.

New `test.skip()` calls require an update to `docs/qa/skip-baseline.json` plus a
written justification. The skip baseline only ratchets down.

### Commit Messages

Conventional Commits, matching the existing history:

```text
feat(admin): add outcome attainment export
fix(auth): preserve session for remember-me-off flows
chore(release): prepare v1.0.2
ci: pin Supabase CLI setup
docs(security): add vulnerability reporting policy
```

Common scopes: `admin`, `jury`, `auth`, `db`, `edge`, `ui`, `e2e`, `security`, `release`.

Keep the subject imperative and under 72 characters. Explain *why* in the body
when the change is not self-evident.

### Pull Requests

- One logical change per PR; keep diffs reviewable.
- Describe the user-visible behavior change, not just the code.
- List the verification you actually performed, including live-app checks.
- Note any migration applied to `vera-prod` / `vera-demo` and any Edge Function deployed.
- CI must be green: typecheck, lint gates, unit tests, build, Edge Function tests, pgTAP, drift sentinels, and the E2E `admin` / `other` / `maintenance` projects.

### Contributor Rights

By contributing code, documentation, or assets to this repository, you assign all
copyright in your contribution to the copyright holder named in
[`LICENSE.md`](LICENSE.md), and confirm you have the right to do so.
