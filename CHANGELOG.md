# Changelog

All notable changes to VERA are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] — 2026-05-07

First public release. See the [GitHub release notes](https://github.com/huguryildiz/VERA/releases/tag/v1.0.0) for the full announcement.

### Added

- **Guided Jury Flow** — Mobile-first scoring experience with QR entry, PIN authentication, autosave on blur and tab-hide, and resume-on-any-device support.
- **Admin Workspace** — Full event-lifecycle operator surface covering live score grids, project rankings, juror activity, period and criteria configuration, entry-token control, audit review, and formatted XLSX export.
- **Real-Time Analytics** — Score distributions, attainment rates, threshold gaps, outcome heatmaps, juror consistency matrices, programme averages, and submission timelines, aligned with the framework configured per evaluation period (MÜDEK, ABET, or custom).
- **Multi-Tenant Architecture** — Per-organization isolation enforced through Row-Level Security on every table, Edge Function–protected admin operations, and structured tenant onboarding with server-side user provisioning.
- **Tamper-Evident Audit** — SHA-256 hash-chained, append-only audit log covering PIN resets, period locks, deletions, membership changes, and other privileged actions.
- **Demo Environment** — `/demo/*` pathname-resolved sandbox running against an isolated Supabase instance.
- **Comprehensive Test Suite** — Vitest unit and component tests, Playwright E2E specs (admin, jury, security, demo), pgTAP SQL tests for RLS, RPC contracts, and triggers, and Deno tests for Edge Functions.

### Stack

- React 18 · Vite · React Router v6 · Recharts
- Supabase (PostgreSQL 15, PL/pgSQL RPCs, Row-Level Security, Realtime)
- Deno Edge Functions
- Supabase Auth (email/password, Google OAuth) + juror QR token + bcrypt PIN
- Vercel (frontend) · Supabase (backend)

[Unreleased]: https://github.com/huguryildiz/VERA/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/huguryildiz/VERA/releases/tag/v1.0.0
