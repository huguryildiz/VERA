## VERA v1 From-Scratch Backend Plan (Supabase-native, Strict Prototype Parity)

### Summary
- Mimari: **Supabase-native** (Postgres + RLS + PostgREST + Edge Functions), API stili **REST + az sayıda action endpoint**.
- Veri modeli: **normalized scoring** (`score_sheets` + `score_sheet_items`), **immutable period snapshot**, **total derived-only**.
- Scope: `vera-premium-prototype.html` içindeki tüm veri alanları backend’de karşılanacak (core + settings + export/backup + maintenance).
- Juror: **PIN ile scoring** + ayrıca **read-only juror portal** (auth bağlı) desteklenecek.

### DB Design (Canonical Tables)
- `organizations`: `id, code, name, short_label, status, org_type, meta(jsonb: institution_name, unit_name, org_contact_email, notes), created_at, updated_at`.
- `profiles`, `memberships`: kullanıcı ve rol (`super_admin`, `org_admin`) ilişkileri.
- `organization_admin_applications`: başvuru süreci (`pending/approved/rejected/cancelled`) + review alanları.
- `frameworks`: `organization_id, name, version, description, default_threshold, outcome_code_prefix, is_default`.
- `framework_outcomes`: `framework_id, code, short_label, desc_en, desc_tr, sort_order`.
- `framework_criteria`: `framework_id, key, label, short_label, max_score, weight, color, blurb, rubric_json, sort_order`.
- `framework_criterion_outcome_maps`: criterion-outcome bağları (`coverage_type`, `weight`).
- `periods`: `organization_id, name, season, description, start_date, end_date, poster_date, framework_id, is_current, is_locked, is_visible`.
- `period_snapshot_criteria`, `period_snapshot_outcomes`, `period_snapshot_maps`: period açıldığında framework’den kopyalanan ve kilitlenen snapshot.
- `projects`: `period_id, project_no, title, members, advisor, description` + unique(`period_id`,`project_no`).
- `jurors`: `organization_id, juror_name, affiliation, email(nullable), notes`.
- `juror_period_auth`: PIN/session/edit/final state (PIN scoring akışı).
- `juror_portal_accounts`: auth user ↔ juror linki (read-only portal erişimi).
- `score_sheets`: `period_id, project_id, juror_id, comment, created_at, updated_at`.
- `score_sheet_items`: `score_sheet_id, criterion_snapshot_id, score_value` + unique(`score_sheet_id`,`criterion_snapshot_id`).
- `entry_tokens`, `audit_logs`.
- `system_settings`: global/org scoped key-value (typed).
- `maintenance_windows`: mode (`scheduled/immediate`), message, starts_at, ends_at, active.
- `export_jobs`, `backup_jobs`: format (`sql/csv/json/xlsx`), status, file_path, requested_by, started/finished timestamps.

### Public API / Contracts
- REST kaynakları: `/organizations`, `/applications`, `/frameworks`, `/outcomes`, `/criteria`, `/criterion-outcome-maps`, `/periods`, `/projects`, `/jurors`, `/settings`, `/maintenance`, `/exports`, `/backups`, `/audit-logs`.
- Action endpointleri (Edge Function/RPC): `/actions/jury/start-pin`, `/actions/jury/verify-pin`, `/actions/jury/upsert-score`, `/actions/jury/finalize`, `/actions/periods/freeze-snapshot`, `/actions/backups/restore`.
- Juror portal (auth): `/juror-portal/me/periods`, `/juror-portal/me/projects`, `/juror-portal/me/scores` (read-only).
- Scoring response contractı: `criterion_scores[]` canonical döner; ayrıca prototype parity için `technical/design/delivery/teamwork` projection alanları da response’a eklenir (derived, stored değil).
- Prototype alan eşleşmeleri: `project-group -> projects.project_no`, `co-name/co-label -> organizations.name/code`, `fw-add-threshold/prefix -> frameworks.default_threshold/outcome_code_prefix`, `maint-mode/maintenance-confirm -> maintenance_windows + confirmation policy`, `export-fmt -> export_jobs.format`.

### Migration Plan (`sql/migrations`)
- `001_v1_identity_org.sql`: organizations, profiles, memberships, admin applications.
- `002_v1_frameworks.sql`: frameworks, outcomes, criteria, mappings.
- `003_v1_periods_snapshots.sql`: periods + snapshot tabloları + snapshot freeze trigger/policy.
- `004_v1_execution_core.sql`: projects, jurors, juror_period_auth, juror_portal_accounts, entry_tokens.
- `005_v1_scoring.sql`: score_sheets, score_sheet_items, derived-total views/functions.
- `006_v1_system_ops.sql`: system_settings, maintenance_windows, export_jobs, backup_jobs, audit_logs.
- `007_v1_rls.sql`: strict organization RLS + role policies + juror portal read-only policies.
- `008_v1_api_rpcs.sql`: jury action RPC’leri + admin action RPC’leri.
- `009_v1_seed.sql`: prototype parity seed (default framework + classic criteria keys dahil).
- Not: eski migration zinciri kullanılmayacak; yeni zincir temiz başlangıç kabul edilir.

### Test Plan
- Schema/constraint testleri: unique/check/FK, snapshot immutability, project_no uniqueness.
- RLS testleri: cross-tenant read/write deny, super_admin allow, org_admin scoped allow, juror portal read-only.
- Jury flow integration: PIN start/verify, upsert score, finalize, submit sonrası edit kısıtları.
- Prototype parity testleri: form alanlarının her biri için request validation + DB persistence doğrulaması.
- Ops testleri: maintenance mode write-blocking, export/backups job lifecycle, restore confirmation flow.
- Analytics consistency: derived total ve outcome attainment hesaplarının deterministic olması.

### Assumptions & Defaults
- Tüm zaman damgaları UTC tutulacak.
- `total` ve attainment stored edilmeyecek; read-time derived olacak.
- Export/backup dosyaları Supabase Storage’da tutulacak (`exports/`, `backups/` bucket).
- PIN scoring için juror email zorunlu değil; portal erişimi olan jurorlarda auth link ayrı yönetilecek.
- Core organization tablosunda kolon adı `name` olacak; `organization_name` sadece snapshot/metin (örn. audit/export/application) amaçlı kullanılacak.
- Ayrı `organization_profiles` tablosu olmayacak; prototipteki kurum detayları `organizations.meta` altında tutulacak.
- v1’de tek schema (`public`) kullanılacak; tenant izolasyonu tamamen RLS + `organization_id` üzerinden yapılacak.

---

## Current Repo Status (As-Is Audit)

Aşağıdaki durum, planlanan v1 hedefi ile mevcut repo gerçekliğinin farkını gösterir.

```txt
# v1-backend-blueprint.md durum özeti

[✅ VAR]
- Core DB iskeleti var: organizations, profiles, memberships, periods, projects, jurors, scores, entry_tokens, audit_logs
- Jury akışı var: authenticate PIN / verify PIN / upsert score / finalize
- Admin CRUD API var: organizations, periods, projects, jurors, frameworks, scores

[🟡 KISMİ / ÇAKIŞMALI]
- Organization modeli çakışmalı: hook tarafı code/university/department bekliyor, API/DB tarafı name/short_name/contact_email yazıyor (v1 hedefi: organizations.meta altında institution_name/unit_name/org_contact_email/notes)
- criteria_config shape çakışmalı: runtime array bekliyor, seed wrapper {"criteria":[...]} yazıyor
- outcomes modeli kısmi: var ama planlanan desc_en/desc_tr, short_label standardı henüz yok
- groupNo tüketiliyor ama projects tablosunda fiziksel project_no kolonu yok

[❌ YOK]
- organizations.meta standardı (institution_name, unit_name, org_contact_email, notes)
- organization_admin_applications (isim/kontrat olarak; şu an tenant_applications var)
- framework_criteria
- framework_criterion_outcome_maps (isim/kontrat olarak; şu an criterion_outcome_mappings var)
- period_snapshot_* tabloları
- juror_portal_accounts
- score_sheets + score_sheet_items (normalized scoring)
- system_settings
- maintenance_windows
- export_jobs
- backup_jobs
- planlanan yeni migration dosyaları (001_v1_... 009_v1_...)
```

### Evidence (Current Repo)
- `sql/migrations/001_schema.sql`
- `sql/migrations/003_jury_rpcs.sql`
- `src/shared/api/admin/organizations.js`
- `src/admin/hooks/useManageOrganizations.js`
- `src/shared/api/admin/projects.js`
- `src/shared/api/admin/scores.js`
- `src/shared/api/fieldMapping.js`
- `src/shared/criteria/criteriaHelpers.js`
- `sql/seeds/001_seed.sql`

## Prototype Field Coverage Matrix

| Prototip sayfa/alan beklentisi | Mevcut durumda | Önerilen v1 çözümü |
|---|---|---|
| **Jurors form**: `juror-name`, `juror-affiliation`, `juror-email`, `juror-notes` | ✅ Karşılanıyor (`jurors.juror_name/affiliation/email/notes`) — `src/shared/api/admin/jurors.js` | Aynı alanlar korunur; `jurors` canonical kalır. |
| **Projects form**: `project-title`, `project-supervisor`, `project-desc` | ✅ Karşılanıyor (`projects.title/advisor/description`) — `src/shared/api/admin/projects.js` | Aynı alanlar korunur. |
| **Projects form**: `project-group` (Group Number) | ❌ Karşılanmıyor (`projects` tablosunda `project_no` yok) — `sql/migrations/001_schema.sql` | `projects.project_no NOT NULL` + `UNIQUE(period_id, project_no)` eklenir. |
| **Criteria editor**: `crit-name`, `crit-label`, `crit-max`, `crit-weight` | 🟡 Kısmi: period JSON config ile tutuluyor; normalize tablo yok — `periods.criteria_config` | `framework_criteria` + `period_snapshot_criteria` tablolarıyla normalize edilir. |
| **Jury score inputs**: `s-tech`, `s-design`, `s-delivery`, `s-team`, `dj-comment-input` | ✅ Karşılanıyor (fixed columns mapping: `technical/written/oral/teamwork/comments`) — `src/shared/api/fieldMapping.js` | V1’de canonical `score_sheet_items` olacak; response’ta legacy projection korunur. |
| **Outcomes add form**: `add-outcome-code`, `add-outcome-short`, `add-outcome-desc` | 🟡 Kısmi: `outcomes.code/label/description` var; `desc_en/desc_tr` yok | `framework_outcomes(code, short_label, desc_en, desc_tr)` olarak genişletilir. |
| **Framework add form**: `fw-add-threshold`, `fw-add-prefix` | ❌ Karşılanmıyor (`frameworks` içinde bu alanlar yok) | `frameworks.default_threshold` ve `frameworks.outcome_code_prefix` eklenir. |
| **Organization create**: `co-name`, `co-label` (+ kurum profili alanları) | 🟡 Kısmi/çakışmalı: API `name/short_name` yazıyor, hook `code/university/department` bekliyor | `organizations(code,name,short_label, meta...)` ile net canonical yapılır; `meta` içinde `institution_name`, `unit_name`, `org_contact_email`, `notes` tutulur. |
| **Organization edit status**: `edit-org-status-select` | ✅ Karşılanıyor (`organizations.status`) — `src/shared/api/admin/organizations.js` | Aynı kalır; status sözlüğü tek yerde sabitlenir. |
| **Set active period**: `set-period` | ✅ Karşılanıyor (`periods.is_current`) — `src/shared/api/admin/periods.js` | Aynı kalır; sadece action endpoint standardize edilir. |
| **Toggle org status**: `toggle-org-status` (`active/limited/disabled`) | ✅ Karşılanıyor (`organizations.status` check seti bunu kapsıyor) | Aynı kalır. |
| **Export format radios**: `export-fmt` (`sql/csv/json`) | ❌ Karşılanmıyor (mevcut panel ağırlıkla XLSX + JSON backup) — `src/admin/settings/ExportBackupPanel.jsx` | `export_jobs.format` + job worker ile `sql/csv/json/xlsx` unify edilir. |
| **Maintenance controls**: `maint-mode`, `maintenance-confirm` | ❌ Karşılanmıyor (DB/API model yok) | `maintenance_windows` + `system_settings` + admin action endpoint eklenir. |
| **Admin application lifecycle** (create/approve/reject/cancel) | 🟡 Kısmi: akış var, ama status check `cancelled` ile uyumsuz | `organization_admin_applications` tablosunda status enum `pending/approved/rejected/cancelled` olarak netleştirilir. |
| **Period criteria config runtime shape** (array bekleniyor) | 🟡 Çakışmalı: runtime array bekliyor, seed wrapper `{"criteria":[...]}` yazıyor | V1 seed/API yalnızca canonical array/snapshot shape döndürür. |
| **Juror read-only portal** (kendi geçmişini görme) | ❌ Karşılanmıyor (PIN scoring var, juror auth portal yok) | `juror_portal_accounts` + `/juror-portal/me/*` read-only endpointleri eklenir. |
