# Faz 2 Implementation Summary — Snapshot + Scoring (005–006)

> **Tarih:** 2026-04-02
> **Durum:** Tamamlandı

---

## Yapılanlar

- ✅ `sql/migrations/005_snapshots.sql` yazıldı
- ✅ `sql/migrations/006_scoring.sql` yazıldı
- ✅ `scores_compat` VIEW oluşturuldu (backward-compat köprüsü)
- ✅ `rpc_period_freeze_snapshot` RPC yazıldı

## Dosya Değişiklikleri

### Eklenen Dosyalar

- `sql/migrations/005_snapshots.sql`
- `sql/migrations/006_scoring.sql`

---

## Snapshot Tabloları

### period_criteria

- `framework_criteria`'nın period bazlı değişmez kopyası
- `source_criterion_id` traceability için saklanır (FK değil, çünkü framework silinebilir)
- `UNIQUE(period_id, key)` — aynı period içinde aynı kriter anahtarı olamaz

### period_outcomes

- `framework_outcomes`'ın period bazlı değişmez kopyası
- `source_outcome_id` traceability için

### period_criterion_outcome_maps

- `framework_criterion_outcome_maps`'in period bazlı kopyası
- `period_criteria` ve `period_outcomes` UUID FK'lerine bağlanır

---

## rpc_period_freeze_snapshot

**İmza:** `rpc_period_freeze_snapshot(p_period_id UUID) RETURNS JSON`

**Davranış:**

1. Period varlığını ve `framework_id`'sini doğrular
2. `snapshot_frozen_at IS NOT NULL` ise idempotent dönüş yapar (`already_frozen: true`)
3. `framework_criteria` → `period_criteria` INSERT...SELECT
4. `framework_outcomes` → `period_outcomes` INSERT...SELECT
5. `framework_criterion_outcome_maps` → `period_criterion_outcome_maps` INSERT...SELECT
   (period snapshot ID'leri üzerinden JOIN ile)
6. `periods.snapshot_frozen_at = now()` günceller
7. `{ok, already_frozen, criteria_count, outcomes_count}` döndürür

**Hata durumları:**

| Durum | Dönüş |
|-------|-------|
| Period bulunamadı | `{ok: false, error: "period_not_found"}` |
| Period'un framework'ü yok | `{ok: false, error: "period_has_no_framework"}` |

---

## Scoring Tabloları

### score_sheets

- `(juror_id, project_id)` UNIQUE — bir juror bir projeyi bir kez değerlendirir
- `status`: draft → in_progress → submitted
- `started_at`, `last_activity_at` — UI'daki ilerleme göstergesi için

### score_sheet_items

- `(score_sheet_id, period_criterion_id)` UNIQUE
- `score_value NULL` → henüz puanlanmamış
- `period_criterion_id` FK → snapshot'a bağlı (framework değişikliğinden etkilenmez)

---

## scores_compat VIEW

Mevcut admin sayfaları (adminApi.js, fieldMapping.js) düz sütun formatını (`technical`,
`written`, `oral`, `teamwork`) bekler. VIEW bu köprüyü sağlar.

```
framework_criteria key  →  VIEW sütunu
technical              →  technical
design                 →  written
delivery               →  oral
teamwork               →  teamwork
```

`fieldMapping.js`'deki `dbScoresToUi` mapping'i değişiklik gerektirmez.

### Kritik Seçim: MAX...FILTER

```sql
MAX(ssi.score_value) FILTER (WHERE pc.key = 'technical') AS technical
```

`MAX` kullanımı kasıtlıdır: `UNIQUE(score_sheet_id, period_criterion_id)` garantisi sayesinde
her criterion anahtarı için en fazla bir satır olacak. `MAX` bu durumda tek değeri döndürür
ve NULL-safe'dir (tüm satırlar NULL ise NULL döner).

---

## İndeksler

| İndeks | Amaç |
|--------|------|
| `idx_score_sheets_period` | Period bazlı skor sorguları (admin analytics) |
| `idx_score_sheets_juror` | Juror bazlı skor sorguları |
| `idx_score_sheet_items_sheet` | Bir score_sheet'in tüm item'larını hızlı getir |

---

## Faz 2 Doğrulama Kontrol Listesi

- [ ] `rpc_period_freeze_snapshot` elle çağrıldığında `period_criteria` dolar
- [ ] `scores_compat` VIEW, `score_sheets` + `score_sheet_items` join sonucunu doğru döndürür
- [ ] `already_frozen: true` dönüşü — ikinci çağrıda snapshot değişmez
- [ ] Snapshot olmayan period'a skor yazmaya çalışıldığında davranış (Faz 3'te test edilecek)
