# Faz 1 Implementation Summary — Arşivleme + Yeni Şema (001–004)

> **Tarih:** 2026-04-02
> **Durum:** Tamamlandı

---

## Yapılanlar

- ✅ Eski 4 migration arşivlendi: `sql/migrations-v0/`
- ✅ `sql/migrations/001_extensions.sql` yazıldı
- ✅ `sql/migrations/002_identity.sql` yazıldı
- ✅ `sql/migrations/003_frameworks.sql` yazıldı
- ✅ `sql/migrations/004_periods_and_execution.sql` yazıldı

## Dosya Değişiklikleri

### Arşivlenen Dosyalar

- `sql/migrations/001_schema.sql` → `sql/migrations-v0/001_schema.sql`
- `sql/migrations/002_rls_policies.sql` → `sql/migrations-v0/002_rls_policies.sql`
- `sql/migrations/003_jury_rpcs.sql` → `sql/migrations-v0/003_jury_rpcs.sql`
- `sql/migrations/004_triggers.sql` → `sql/migrations-v0/004_triggers.sql`

### Eklenen Dosyalar

- `sql/migrations/001_extensions.sql`
- `sql/migrations/002_identity.sql`
- `sql/migrations/003_frameworks.sql`
- `sql/migrations/004_periods_and_execution.sql`

---

## v0 → v1 Farkları (tablo bazında)

### organizations

| Alan | v0 | v1 | Karar |
|------|----|----|-------|
| `short_name` | TEXT | — | Kaldırıldı |
| `code` | — | TEXT UNIQUE NOT NULL | Eklendi (short_name yerini aldı) |
| `institution_name` | — | TEXT | Eklendi |
| `settings` | — | JSONB DEFAULT '{}' | Eklendi |
| `updated_at` | — | TIMESTAMPTZ | Eklendi |
| `status` CHECK | active/limited/disabled/archived | active/disabled/archived | `limited` kaldırıldı |

### memberships

| Alan | v0 | v1 | Karar |
|------|----|----|-------|
| `role` CHECK | admin/super_admin | org_admin/super_admin | `admin` → `org_admin` |

### tenant_applications → org_applications

| Alan | v0 | v1 | Karar |
|------|----|----|-------|
| Tablo adı | `tenant_applications` | `org_applications` | Yeniden adlandırıldı |
| `organization_name` | TEXT NOT NULL | — | Kaldırıldı (FK yeterli) |
| `status` CHECK | pending/approved/rejected | + cancelled | `cancelled` eklendi |

### frameworks

| Alan | v0 | v1 | Karar |
|------|----|----|-------|
| `version` | — | TEXT | Eklendi |
| `default_threshold` | — | NUMERIC DEFAULT 70 | Eklendi |
| `outcome_code_prefix` | — | TEXT DEFAULT 'PO' | Eklendi |

### outcomes → framework_outcomes

| Alan | v0 | v1 | Karar |
|------|----|----|-------|
| Tablo adı | `outcomes` | `framework_outcomes` | Yeniden adlandırıldı |

### framework_criteria (YENİ)

v0'da yoktu — criteria_config JSONB içinde saklanıyordu. v1'de normalize edildi.

### criterion_outcome_mappings → framework_criterion_outcome_maps

| Alan | v0 | v1 | Karar |
|------|----|----|-------|
| Tablo adı | `criterion_outcome_mappings` | `framework_criterion_outcome_maps` | Yeniden adlandırıldı |
| `organization_id` | UUID FK | — | Kaldırıldı (framework üzerinden zaten org kapsamlı) |
| `criterion_key` | TEXT | — | Kaldırıldı |
| `criterion_id` | — | UUID FK → framework_criteria | Eklendi |
| `framework_id` | — | UUID FK → frameworks | Eklendi (explicit scope) |

### periods

| Alan | v0 | v1 | Karar |
|------|----|----|-------|
| `criteria_config` | JSONB | — | Kaldırıldı (snapshot tablolarına taşındı) |
| `outcome_config` | JSONB | — | Kaldırıldı |
| `poster_date` | — | DATE | Eklendi |
| `snapshot_frozen_at` | — | TIMESTAMPTZ | Eklendi |
| `updated_at` | — | TIMESTAMPTZ | Eklendi |

### projects

| Alan | v0 | v1 | Karar |
|------|----|----|-------|
| `members` | TEXT | JSONB DEFAULT '[]' | Tip değişti — sıralı üye listesi için |
| `advisor` | TEXT | — | Kaldırıldı |
| `advisor_name` | — | TEXT | Eklendi |
| `advisor_affiliation` | — | TEXT | Eklendi |
| `project_no` | — | INT (nullable) | Eklendi + UNIQUE constraint |
| `updated_at` | — | TIMESTAMPTZ | Eklendi |

### jurors

| Alan | v0 | v1 | Karar |
|------|----|----|-------|
| `avatar_color` | — | TEXT | Eklendi |
| `updated_at` | — | TIMESTAMPTZ | Eklendi |

### juror_period_auth

| Alan | v0 | v1 | Karar |
|------|----|----|-------|
| `pin` | TEXT (plain) | — | Kaldırıldı |
| `pin_hash` | — | TEXT (bcrypt) | Eklendi |
| `session_expires_at` | — | TIMESTAMPTZ | Eklendi |
| `edit_reason` | — | TEXT | Eklendi |
| `edit_expires_at` | — | TIMESTAMPTZ | Eklendi |
| `locked_at` | — | TIMESTAMPTZ | Eklendi |

### entry_tokens

| Alan | v0 | v1 | Karar |
|------|----|----|-------|
| `last_used_at` | — | TIMESTAMPTZ | Eklendi |

---

## Notlar

- `current_user_is_super_admin()` helper fonksiyonu `002_identity.sql`'e taşındı
  (v0'da `002_rls_policies.sql` içindeydi).
- `UNIQUE NULLS NOT DISTINCT (period_id, project_no)` — PostgreSQL 15+ syntax;
  project_no NULL olan birden fazla projeye izin verir, NULL olmayanlarda UNIQUE enforce edilir.
- Tablo sırası FK bağımlılıklarını karşılar:
  001_extensions → 002_identity → 003_frameworks → 004_periods_and_execution
