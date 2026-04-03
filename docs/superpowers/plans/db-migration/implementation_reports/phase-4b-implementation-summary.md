# Faz 4B Implementation Summary — Premium Demo Seed

> **Tarih:** 2026-04-03
> **Durum:** Tamamlandı

---

## Yapılanlar

- ✅ `sql/seeds/1_demo_premium_seed.sql` yazıldı (4104 satır)
- ✅ Çift `BEGIN;` bug'u düzeltildi
- ✅ Erken `COMMIT;` bug'u düzeltildi (entry_tokens + audit_logs dışarıda kalıyordu)
- ✅ `token_hash` kolon adı doğrulandı (009 migration sonrası doğru)
- ✅ Jüri/skor durum semantiği düzeltildi ve yeniden üretildi (Completed/Editing/InProgress/Ready/NotStarted)

## Not: Dosya Adı Sapması

Plan `sql/seeds/001_seed.sql` hedefini belirtmişti. Seed
`sql/seeds/1_demo_premium_seed.sql` olarak oluşturuldu. Eski
`002_demo_premium_seed.sql` v0 şemasını kullanıyor (kaldırılabilir).

---

## Seed İçeriği

### Kapsam

| Varlık | Adet |
|--------|------|
| Organizations | 6 |
| Profiles + Memberships | 13 (1 super_admin, 12 org_admin) |
| Org Applications | 6 (approved/rejected/cancelled/pending karışımı) |
| Frameworks | 6 |
| Framework outcomes + criteria | 6 × 4–8 outcome, 3–5 criteria |
| Framework criterion-outcome maps | weighted many-to-many |
| Periods | 18 (6 org × 3 period) |
| Period snapshots (criteria + outcomes + maps) | 18 period × org'a özel kriter sayısı |
| Projects | 70+ (TEDU-EE en zengin) |
| Jurors | 35+ |
| juror_period_auth | 35+ (bcrypt PIN hash) |
| score_sheets | ~500 (submitted + in_progress) |
| score_sheet_items | ~2000 |
| entry_tokens | 32 (token_hash, SHA-256) |
| audit_logs | 60+ |

### Organizasyonlar

| ID prefix | Kurum | Kod | Framework |
|-----------|-------|-----|-----------|
| e802a6cb | TED University / EE | TEDU-EE | MUDEK 2024 |
| b94595d6 | Carnegie Mellon / CS | CMU-CS | ABET 2024 |
| d8214e32 | TEKNOFEST | TEKNOFEST | Competition Framework 2026 |
| 088f5054 | TUBITAK | TUBITAK-2204A | Research Framework 2026 |
| ff81ecf1 | IEEE AP-S SDC | IEEE-APSSDC | Design Framework 2026 |
| e802... 6. org | CanSat 2025 | CANSAT-2025 | CanSat Framework 2026 |

### Period Durumları (org başına 3 period)

| Season | is_current | is_locked | Açıklama |
|--------|------------|-----------|----------|
| Spring 2026 | true | false | Aktif dönem (puanlama devam ediyor) |
| Fall 2025 | false | true | Tamamlandı |
| Spring 2025 | false | true | Tamamlandı |

### Jüri Durum Semantiği

`juror_period_auth` satırları 5 farklı durumu temsil edecek şekilde üretildi:

| Durum | Koşul |
|-------|-------|
| **Completed** | `final_submitted_at` SET, `edit_enabled = false` |
| **Editing** | `final_submitted_at` SET + `edit_enabled = true` |
| **InProgress** | `last_seen_at` SET, kısmi score_sheet'ler var |
| **Ready** | `last_seen_at` SET, henüz skor girilmemiş |
| **NotStarted** | Sadece `pin_hash` var |

Ek: bir jüride `failed_attempts > 0` ve `locked_until` atanmış (kilitli senaryo).

### Puanlama Senaryo Dağılımı

Score sheet'ler 2 statüste üretildi:

- **submitted** — tüm kriterler puanlandı, `final_submitted_at` atanmış
- **in_progress** — bazı kriterler eksik, kısmi `score_sheet_items`

Senaryolar: yıldız performans, yüksek varyanslı, sınırda, zayıf iletişim/güçlü teknik,
güçlü takım/zayıf teknik, tamamlanmamış, bazı juror-proje kombinasyonlarında score_sheet yok.

### Entry Tokens

Her aktif period için 2–3 token:

- 2 adet `is_revoked = false` (aktif)
- 1 adet `is_revoked = true` + `last_used_at` set (iptal edilmiş referans)

Token değerleri SHA-256 hash olarak saklanıyor (`token_hash` kolonu).

### PIN Hash Stratejisi

`juror_period_auth.pin_hash`: `$2a$06$...` formatında bcrypt hash.
Seed'deki tüm jüriler aynı örnek hash kullanıyor (demo amaçlı).

---

## Transaction Düzeltmeleri

Seed oluşturulurken iki transaction hatası mevcuttu:

### Sorun 1: Çift `BEGIN;`

```sql
-- Önceki (hatalı):
BEGIN;           -- line 5 (outer)
...
BEGIN;           -- line 745 (Scoring bölümü başında — iç içe)
...
COMMIT;          -- line 3903 (outer'ı kapatıyordu, erken commit)
...
COMMIT;          -- line 4006 (artık no-op, dışarıda)
```

**Etki:** PostgreSQL iç içe transaction desteklemiyor. İkinci `BEGIN;` uyarıyla
yok sayılır ama ilk `COMMIT;` dış transaction'ı kapatıyor — entry_tokens ve
audit_logs inserts otomatik commit modunda çalışıyordu.

### Düzeltme

```sql
-- Sonrası (doğru):
BEGIN;           -- line 5 (tek transaction)
...
-- Scoring
...
-- Entry Tokens (Hashed)
...
-- Audit Logs
...
COMMIT;          -- line 4001 (tek commit, tümünü kapsar)
```

---

## Şema Uyumluluk Notları

| Kolon | Durum | Açıklama |
|-------|-------|----------|
| `entry_tokens.token_hash` | ✅ Doğru | 009_security_hash_tokens.sql sonrası adı `token_hash` |
| `juror_period_auth.session_token_hash` | ✅ Seed'de yok | Seed PIN hash sağlıyor, session runtime'da oluşuyor |
| `organizations.code` | ✅ Doğru | v1'de `short_name` → `code` |
| `memberships.role` | ✅ Doğru | v1'de `admin` → `org_admin` |
| `projects.project_no` | ✅ Doğru | v1 şemasında `project_no INT` mevcut |

---

## Uygulama Sırası

```text
001_extensions.sql
002_identity.sql
003_frameworks.sql
004_periods_and_execution.sql
005_snapshots.sql
006_scoring.sql
007_auth_and_tokens.sql
008_audit_and_rls.sql
009_security_hash_tokens.sql
↓
sql/seeds/1_demo_premium_seed.sql   ← Faz 4B
```
