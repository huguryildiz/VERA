```
██╗   ██╗███████╗██████╗  █████╗
██║   ██║██╔════╝██╔══██╗██╔══██╗
██║   ██║█████╗  ██████╔╝███████║
╚██╗ ██╔╝██╔══╝  ██╔══██╗██╔══██║
 ╚████╔╝ ███████╗██║  ██║██║  ██║
  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝
```

# VERA — Documentation

> _Last updated: 2026-05-07_

Multi-tenant academic jury evaluation platform. This directory is the single
source of truth for architecture, deployment, testing, and design decisions.

---

## Start here

- [Getting started](getting-started.md) — dev environment in 30 minutes.
- [Contributing](contributing.md) — branch strategy, commit conventions, PR flow.
- [Glossary](glossary.md) — accreditation + multi-tenant SaaS vocabulary in one place.
- [Known limitations](known-limitations.md) — what VERA does not yet do; intentional vs. planned vs. operational gaps.
- [Data retention and privacy](data-retention-and-privacy.md) — PII inventory, retention rules, GDPR / KVKK posture.

---

## Sections

| Section | Contents |
| --- | --- |
| [tutorials/](tutorials/README.md) | **Product tour** — screenshot-driven admin and juror walkthroughs for sales and onboarding conversations. |
| [architecture/](architecture/README.md) | System design, routing, storage policy, period lifecycle, multi-tenancy, framework outcomes, edge-function patterns, E2E architecture primer. |
| [decisions/](decisions/README.md) | Architectural Decision Records — pathname routing, no client caching, JWT auth, jury entry token, snapshot migrations. |
| [walkthroughs/](walkthroughs/README.md) | Tutorial-style end-to-end narratives — jury day, tenant onboarding, period lifecycle, audit trail, multi-tenant data flow. |
| [operations/](operations/README.md) | Audit system coverage, backup & recovery, demo environment, incident response runbooks. |
| [deployment/](deployment/README.md) | Environment variables, Supabase setup, Vercel deployment, migrations operational guide. |
| [testing/](testing/README.md) | Unit, E2E, SQL (pgTAP), Edge Function tests; smoke checklist; current quality assessment. |
| [design/](design/README.md) | UI reference prototypes and archived mockups. |
| [v2-roadmap.md](v2-roadmap.md) | Technical roadmap for v2 — architectural simplification, RPC reduction, TypeScript migration, and frontend slim-down. |
