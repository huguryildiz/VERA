# Security Policy

VERA holds evaluation data that feeds accreditation reporting: juror scores,
project rankings, tenant membership, and a tamper-evident audit trail. A security
defect in this system can distort academic outcomes, so reports are taken
seriously and handled quickly.

## Supported Versions

| Version | Supported |
| --- | --- |
| 1.0.x | ✅ Security fixes provided |
| < 1.0 | ❌ Unsupported |

Only the latest released `1.0.x` version receives security fixes. Deployments
running older builds should upgrade before reporting.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security problems.**

Email [huguryildiz@gmail.com](mailto:huguryildiz@gmail.com) with the subject line `VERA SECURITY: <short summary>`.

Please include:

- a description of the vulnerability and its impact;
- the affected area (URL path, RPC name, Edge Function, SQL policy, or file path);
- reproduction steps or a proof-of-concept request;
- the environment you observed it in (production, demo, or local);
- your assessment of severity, if you have one.

Do not include real juror, student, or project data in your report. Redact
personal information and use synthetic values wherever possible.

### Response Timeline

| Stage | Target |
| --- | --- |
| Acknowledgement of report | 3 business days |
| Initial triage and severity assessment | 7 business days |
| Fix or mitigation for critical issues | 14 days |
| Fix for high / medium issues | Next scheduled release |

You will receive an update at each stage. If a report is declined, the reasoning
is explained.

## Disclosure

Please practice coordinated disclosure: give us a reasonable window to ship a fix
before publishing details. With your consent, reporters are credited in the
release notes for the version containing the fix.

## Scope

In scope:

- the production application at `vera-eval.app`;
- the demo environment under `/demo`;
- Supabase Row Level Security policies, RPC functions, and triggers in `sql/migrations/`;
- Edge Functions in `supabase/functions/`;
- the jury entry-token and PIN authentication flow;
- the admin authentication, session, and tenant-membership model;
- the audit log hash chain.

Out of scope:

- denial-of-service and volumetric traffic testing;
- social engineering of users, staff, or the maintainer;
- vulnerabilities in third-party services (Supabase, Vercel) — report those to the respective vendor;
- missing security headers or best-practice findings with no demonstrated impact;
- automated scanner output submitted without a working proof of concept;
- self-XSS and issues requiring physical access to an unlocked device.

## Testing Rules

Testing is permitted **only against the demo environment or your own local
instance.** Never test against production data.

- Do not access, modify, or exfiltrate data belonging to another tenant.
- Do not degrade service availability for real users.
- Stop as soon as you have confirmed the vulnerability, and report it.

## Security Model

The architectural controls behind these boundaries — tenant isolation via RLS,
JWT-based admin authentication, single-use jury entry tokens, and audit hash
chaining — are documented in:

- [`docs/architecture/multi-tenancy.md`](docs/architecture/multi-tenancy.md) — auth model, tenant resolution, RLS enforcement
- [`docs/decisions/`](docs/decisions/) — architectural decision records
- [`docs/operations/`](docs/operations/) — audit system and incident runbooks

## Secrets

If you discover a credential, API key, or service-role token exposed in this
repository or in a deployed bundle, report it immediately by email and do not use
it. Never commit secrets: environment variables belong in `.env.local` (git-ignored)
and in the Vercel / Supabase project settings, as described in
[`docs/deployment/environment-variables.md`](docs/deployment/environment-variables.md).
