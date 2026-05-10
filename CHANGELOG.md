# Changelog

All notable changes to VERA are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] — 2026-05-07

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/huguryildiz/VERA/main/src/assets/vera_logo_dark.png">
    <img src="https://raw.githubusercontent.com/huguryildiz/VERA/main/src/assets/vera_logo_white.png" alt="VERA" width="360">
  </picture>
</p>

VERA is a modern jury evaluation platform that turns the entire assessment journey — from QR scan to accreditation-ready reporting — into one guided, secure, and data-rich flow. 📱📊

This first public release follows 1,500+ commits of production hardening and design work for broader academic adoption. 🎓

### ✨ Highlights

#### 📲 Guided Jury Flow
A mobile-first scoring experience with no accounts and no installs. QR → identity → PIN → evaluation → submission, with autosave on every blur, tab-hide, and navigation event. Jurors can resume on any device, while the server remains the single source of truth.

#### 🖥️ Admin Workspace
A full event-lifecycle operator surface for live score grids, project rankings, juror activity, period and criteria configuration, entry-token control, audit review, and formatted XLSX export. Powered by Supabase Realtime with debounced refreshes.

#### 📊 Real-Time Analytics
Score distributions, attainment rates, threshold gaps, outcome heatmaps, juror consistency matrices, programme averages, and submission timelines — all aligned with the framework configured for each evaluation period: MÜDEK, ABET, or custom.

#### 🏢 Multi-Tenant by Design
Each organization operates in complete isolation, enforced through Row-Level Security on every table, Edge Function–protected admin operations, and a structured tenant onboarding workflow with server-side user provisioning.

#### 🔒 Tamper-Evident Audit
Every privileged admin action — PIN resets, period locks, deletions, and membership changes — is chained with SHA-256 hashing into an append-only audit log. Accreditation-ready and forensically verifiable.

### 🏗️ Stack

- ⚛️ **Frontend** — React 18 · Vite · React Router v6 · Recharts
- 🗄️ **Backend** — Supabase: PostgreSQL 15, PL/pgSQL RPCs, Row-Level Security, Realtime
- ⚡ **Edge** — Deno Edge Functions for auth events, email, notifications, audit, and exports
- 🔑 **Auth** — Supabase Auth: email/password, Google OAuth, juror QR token, bcrypt PIN
- 🧪 **Testing** — Vitest · Testing Library · Playwright E2E · pgTAP
- 🚀 **Deployment** — Vercel frontend · Supabase backend

### 🌐 Live

🔗 Production: [vera-eval.app](https://vera-eval.app)

### 📚 Documentation

Full documentation is available in [`docs/`](docs/), including architecture, decisions, walkthroughs, operations, deployment, and testing guides.

---

<p align="center">
  <em>🎯 Built for institutions that evaluate seriously.</em>
</p>

[Unreleased]: https://github.com/huguryildiz/VERA/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/huguryildiz/VERA/releases/tag/v1.0.0
