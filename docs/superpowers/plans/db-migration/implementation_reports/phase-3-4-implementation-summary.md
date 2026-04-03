# Faz 3 + Faz 4 Implementation Summary — Auth RPCs + Audit + RLS (007–008)

> **Tarih:** 2026-04-02
> **Durum:** Tamamlandı

---

## Yapılanlar

- ✅ `sql/migrations/007_auth_and_tokens.sql` yazıldı (11 RPC)
- ✅ `sql/migrations/008_audit_and_rls.sql` yazıldı (2 trigger + 21 tablo RLS)

---

## Faz 3 — 007_auth_and_tokens.sql

### Kapsam

Tablo tanımları Faz 1'de `004_periods_and_execution.sql`'e alınmıştı
(`juror_period_auth`, `entry_tokens`, `audit_logs`). Bu dosya yalnızca RPC'leri içerir.

### RPC Listesi

| Fonksiyon | Tür | Grant |
|-----------|-----|-------|
| `rpc_jury_authenticate(UUID, TEXT, TEXT, BOOLEAN)` | Jüri | anon, authenticated |
| `rpc_jury_verify_pin(UUID, TEXT, TEXT, TEXT)` | Jüri | anon, authenticated |
| `rpc_jury_validate_entry_token(TEXT)` | Jüri | anon, authenticated |
| `rpc_jury_upsert_score(UUID, UUID, UUID, TEXT, JSONB, TEXT)` | Jüri | anon, authenticated |
| `rpc_jury_finalize_submission(UUID, UUID, TEXT)` | Jüri | anon, authenticated |
| `rpc_juror_reset_pin(UUID, UUID)` | Admin | authenticated |
| `rpc_juror_toggle_edit_mode(UUID, UUID, BOOLEAN, TEXT, INT)` | Admin | authenticated |
| `rpc_juror_unlock_pin(UUID, UUID)` | Admin | authenticated |
| `rpc_entry_token_generate(UUID)` | Admin | authenticated |
| `rpc_entry_token_revoke(UUID)` | Admin | authenticated |
| `rpc_admin_approve_application(UUID)` | Super-admin | authenticated |

### v0 → v1 RPC Farkları

#### rpc_jury_authenticate

| Değişiklik | v0 | v1 |
|-----------|----|----|
| PIN saklama | `pin TEXT` plain text | `pin_hash TEXT` bcrypt (`crypt(pin, gen_salt('bf'))`) |
| Auth row insert | `ON CONFLICT DO UPDATE SET pin = EXCLUDED.pin` | `ON CONFLICT DO NOTHING` (mevcut PIN sıfırlanmaz) |
| Döndürülen PIN | Her seferinde `pin` döner | Yalnızca `v_needs_pin = true` ise `pin_plain_once` döner |

#### rpc_jury_verify_pin

| Değişiklik | v0 | v1 |
|-----------|----|----|
| PIN doğrulama | `WHERE pin = p_pin` | `pin_hash = crypt(p_pin, pin_hash)` (bcrypt) |
| Kilitleme | Yalnızca `locked_until` set edilir | + `locked_at = now()` set edilir |
| Başarılı giriş | `session_token` güncellenir | + `session_expires_at = now() + interval '12 hours'` |
| Kilit süresi dolduğunda | `failed_attempts`, `locked_until` sıfırlanır | + `locked_at = NULL` da sıfırlanır |

#### rpc_jury_validate_entry_token

| Değişiklik | v0 | v1 |
|-----------|----|----|
| last_used_at | Güncellenmez | Başarılı doğrulama sonrası `UPDATE entry_tokens SET last_used_at = now()` |

#### rpc_jury_upsert_score (SIFIRDAN YAZILDI)

| Alan | v0 (düz kolon) | v1 (JSONB normalize) |
|------|----------------|----------------------|
| İmza | `p_technical, p_written, p_oral, p_teamwork NUMERIC` | `p_scores JSONB` (`[{key, value}]`) |
| Fonksiyon adı | `rpc_jury_upsert_scores` (çoğul) | `rpc_jury_upsert_score` (tekil) |
| Hedef tablo | `scores` (flat) | `score_sheets` + `score_sheet_items` (normalize) |
| Status takibi | Yok | `score_sheets.status`: draft / in_progress / submitted |
| Session expiry | Kontrol edilmez | `session_expires_at` varsa kontrol edilir |
| Döndürülen | `{ok, total}` | `{ok, score_sheet_id, total}` |

Mantık:

1. Session token + `session_expires_at` doğrula
2. Period kilitli değil kontrol et
3. `score_sheets` UPSERT (`ON CONFLICT juror_id, project_id`)
4. `p_scores` dizisindeki her `{key, value}` için `period_criteria`'dan `period_criterion_id` bul, `score_sheet_items` UPSERT
5. Tamamlanma oranına göre `status` güncelle
6. `juror_period_auth.last_seen_at = now()`
7. `{ok, score_sheet_id, total}` döndür

#### rpc_admin_approve_application

| Değişiklik | v0 | v1 |
|-----------|----|----|
| Tablo | `tenant_applications` | `org_applications` |
| Auth kontrolü | Manuel `memberships` sorgusu | `current_user_is_super_admin()` yardımcısı |

#### Yeni RPC'ler (v0'da yoktu)

- **`rpc_juror_reset_pin`** — Org admin: yeni bcrypt PIN üret + hash'le, lockout sıfırla
- **`rpc_juror_toggle_edit_mode`** — Org admin: edit_enabled + edit_reason + edit_expires_at yönet
- **`rpc_juror_unlock_pin`** — Org admin: failed_attempts / locked_until / locked_at sıfırla
- **`rpc_entry_token_generate`** — Org admin: `gen_random_bytes(32)` ile token üret
- **`rpc_entry_token_revoke`** — Org admin: `is_revoked = true` set et

---

## Faz 4 — 008_audit_and_rls.sql

### Trigger: trigger_set_updated_at

Uygulanan tablolar:

- `organizations`, `periods`, `projects`, `jurors`, `juror_period_auth`
- `score_sheets`, `score_sheet_items`

### Trigger: trigger_audit_log

v0 → v1 farkları:

| Tablo | v0 | v1 |
|-------|----|----|
| `scores` | Audit hedefiydi | Kaldırıldı (tablo artık yok) |
| `score_sheets` | Yoktu | Eklendi (`period_id → organization_id` lookup) |
| `entry_tokens` | Yoktu | Eklendi (`period_id → organization_id` lookup) |

Uygulanan tablolar: `organizations`, `periods`, `projects`, `jurors`,
`score_sheets`, `memberships`, `entry_tokens`

### RLS Politikaları

Toplam 21 tablo. Tüm tablolarda `ENABLE ROW LEVEL SECURITY`.

#### Yeniden adlandırılan tablolar

| v0 tablo | v1 tablo | Politika değişikliği |
|----------|----------|----------------------|
| `tenant_applications` | `org_applications` | Politika adları güncellendi |
| `outcomes` | `framework_outcomes` | `framework_id` üzerinden org kapsamı (v0 ile aynı mantık) |
| `criterion_outcome_mappings` | `framework_criterion_outcome_maps` | `organization_id` sütunu yok — `framework_id → frameworks.organization_id` üzerinden |
| `scores` | Kaldırıldı | — |

#### Yeni tablolar (7 adet)

| Tablo | Org kapsam zinciri |
|-------|--------------------|
| `score_sheets` | `period_id → periods → organization_id` |
| `score_sheet_items` | `score_sheet_id → score_sheets → period_id → periods → organization_id` |
| `period_criteria` | `period_id → periods → organization_id` |
| `period_outcomes` | `period_id → periods → organization_id` |
| `period_criterion_outcome_maps` | `period_id → periods → organization_id` |
| `framework_criteria` | `framework_id → frameworks → organization_id` |
| `framework_criterion_outcome_maps` | `framework_id → frameworks → organization_id` |

#### Standart politika şablonu

Tüm tablolar 4 politika alır (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) ile şu kural:

- Org admin: `memberships` tablosunda `organization_id = <ilgili_org>` olan kayıt
- Super admin: `current_user_is_super_admin()` — `002_identity.sql`'de tanımlı

İstisnalar:

- `profiles`: yalnızca `id = auth.uid()` (org kapsamı yok)
- `audit_logs`: yalnızca `SELECT` politikası (INSERT/UPDATE/DELETE yalnızca trigger/service role)
- `frameworks`: `organization_id IS NULL` olan yerleşik framework'ler herkese görünür
- `framework_outcomes/criteria/maps`: üst framework'ün `organization_id IS NULL` ise herkese görünür

---

## Notlar

### Bcrypt PIN güvenliği

PIN'ler artık düz metin yerine `crypt(pin, gen_salt('bf'))` ile saklanıyor.
`pgcrypto` extension'ı `001_extensions.sql`'de etkinleştirilmişti.
Doğrulama: `pin_hash = crypt(p_pin, pin_hash)` (salt embedding otomatik).

### Admin auth pattern

Admin RPC'leri (`rpc_juror_*`, `rpc_entry_token_*`) için `auth.uid()` + `memberships` sorgusu:

```sql
SELECT EXISTS(
  SELECT 1 FROM memberships
  WHERE user_id = auth.uid()
    AND (organization_id = v_org_id OR organization_id IS NULL)
) INTO v_is_admin;
```

`organization_id IS NULL` koşulu super_admin'leri yakalar.
Ayrı bir `current_user_is_admin_of(org_id)` yardımcısı eklenmedi — basit inline sorgu yeterli.

### Güvenlik Patch — 009_security_hash_tokens.sql

Faz 3+4 tamamlandıktan sonra uygulanan ek migration:

| Alan | v0 / Faz 3 | Patch (009) |
|------|------------|-------------|
| `entry_tokens.token` | `TEXT NOT NULL UNIQUE` (plain) | `token_hash TEXT NOT NULL UNIQUE` (SHA-256) |
| `juror_period_auth.session_token` | `TEXT` (plain) | `session_token_hash TEXT` (SHA-256) |

Değişen RPC'ler: `rpc_jury_validate_entry_token`, `rpc_jury_verify_pin`,
`rpc_jury_upsert_score`, `rpc_jury_finalize_submission` — hepsi
`encode(digest(plain_value, 'sha256'), 'hex')` ile hash hesaplar, plain token DB'ye hiç yazılmaz.

**Sebep:** Yüksek entropili token'lar için bcrypt gerekmez; SHA-256 DB sızıntısına karşı yeterli
koruma sağlar, performans kaybı yoktur.

### rpc_jury_upsert_score vs scores_compat VIEW

`rpc_jury_upsert_score` `score_sheets` + `score_sheet_items`'a yazar.
Admin sayfaları `scores_compat` VIEW'i okur (`006_scoring.sql`'de tanımlı).
Bu ayrım Faz 5'e kadar admin tarafında sıfır değişiklik sağlar.

### Faz 1 sapması

Plan `juror_period_auth` ve `entry_tokens`'ı Faz 3'te (007) oluşturacaktı.
Faz 1 implementasyonu bu tabloları 004'e taşıdı (birlikte mantıklıydı).
007 bu nedenle yalnızca RPC'leri içeriyor — tablolar 004'te.

---

## Uygulama Sırası

```text
001_extensions.sql
002_identity.sql
003_frameworks.sql
004_periods_and_execution.sql
005_snapshots.sql
006_scoring.sql
007_auth_and_tokens.sql   ← Faz 3
008_audit_and_rls.sql     ← Faz 4
```
