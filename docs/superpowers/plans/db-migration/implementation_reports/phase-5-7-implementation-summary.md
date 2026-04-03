# Faz 5 + 6 + 7 Uygulama Raporu

> **Tarih:** 2026-04-03
> **Fazlar:** 5 (Frontend Jüri Yolu), 6 (Frontend Admin API), 7 (Dinamik Kriter Temeli)

---

## Yapılanlar

### Faz 5 — Frontend Jüri Yolu

- `freezePeriodSnapshot(periodId)` API fonksiyonu eklendi (`src/shared/api/juryApi.js`)
- `listPeriods` sorgusu genişletildi: `framework_id, snapshot_frozen_at` alanları eklendi
- `_loadPeriod` içine snapshot dondurma mantığı eklendi: `period.framework_id && !period.snapshot_frozen_at` koşuluyla `freezePeriodSnapshot` çağrısı (non-fatal — hata yakalayıp devam eder)
- `upsertScore` → zaten JSONB `[{key, value}]` formatına geçirilmişti, değişiklik gerekmedi
- `listProjects` → zaten `scores_compat` VIEW'ını kullanıyordu, değişiklik gerekmedi
- `useJuryAutosave` → zaten `criteriaConfig` parametresini geçiriyordu, değişiklik gerekmedi

### Faz 6 — Frontend Admin API

- `src/shared/api/admin/scores.js` → tüm sorgular zaten `scores_compat` kullanıyordu
- `src/admin/hooks/useAdminRealtime.js` → zaten `score_sheets` + `score_sheet_items` aboneliklerini kullanıyordu
- İki dosya da değişiklik gerektirmedi — önceki fazlarda tamamlanmıştı

### Faz 7 — Dinamik Kriter Temeli

- `normalizeCriterionFromDb(row)` fonksiyonu eklendi (`src/shared/criteria/criteriaHelpers.js`)
  - `period_criteria` DB satırlarını (`short_label`, `max_score`, `rubric_bands`, `description`) canonical view-model'e dönüştürür
  - `mudek: []` — outcome mapping `period_criterion_outcome_maps` üzerinden ayrıca yüklenir
- `getActiveCriteria()` duck-typing güncellendi: `"max_score" in config[0]` koşuluyla DB satırları (`normalizeCriterionFromDb`) vs JSONB config satırları (`normalizeCriterion`) ayrıştırılır — `AdminPanel.jsx` backward compat korundu
- `listPeriodCriteria(periodId)` eklendi (`src/shared/api/admin/scores.js`) — `period_criteria` tablosunu `sort_order` sırasıyla çeker
- Export zinciri güncellendi: `admin/index.js` → `src/shared/api/index.js`
- `_loadPeriod` güncellendi: `period.criteria_config` JSONB yerine `listPeriodCriteria` DB sorgusu kullanıyor; boş dönerse `null` geçiyor (→ `getActiveCriteria(null)` → static CRITERIA fallback)
- `freezePeriodSnapshot` export'u `src/shared/api/index.js`'e eklendi

---

## Dosya Değişiklikleri

### Güncellenen dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `src/shared/api/juryApi.js` | `listPeriods` genişletildi, `freezePeriodSnapshot` eklendi |
| `src/shared/api/admin/scores.js` | `listPeriodCriteria` eklendi |
| `src/shared/api/admin/index.js` | `listPeriodCriteria` export eklendi |
| `src/shared/api/index.js` | `freezePeriodSnapshot` + `listPeriodCriteria` export eklendi |
| `src/shared/criteria/criteriaHelpers.js` | `normalizeCriterionFromDb` eklendi, `getActiveCriteria` duck-typing güncellendi |
| `src/jury/hooks/useJurySessionHandlers.js` | `_loadPeriod` snapshot freeze + DB kriter yükleme eklendi |

### Değişiklik gerektirmeyen dosyalar (zaten uyumlu)

- `src/shared/api/admin/scores.js` (scores_compat) — Faz 6 tamamlanmıştı
- `src/admin/hooks/useAdminRealtime.js` — score_sheets aboneliği zaten mevcuttu
- `src/jury/hooks/useJuryAutosave.js` — criteriaConfig parametresi zaten geçiriliyordu

---

## Şema Notları

- `scores_compat` VIEW — hem admin hem jüri okuma yolu bunu kullanıyor; flat skor sütunları (`technical`, `written`, `oral`, `teamwork`) doğru aggregate ediliyor
- `period_criteria` tablosu — `rpc_period_freeze_snapshot` ile doldurulur; sorgu boş dönerse `getActiveCriteria(null)` → `config.js CRITERIA` fallback devreye girer
- Duck-typing seçimi: `"max_score" in config[0]` güvenilir — DB satırlarında her zaman `max_score` var, JSONB config'de yok

---

## İlerleme Tablosu Güncellemesi

Faz 5, 6, 7 satırları ✅ Tamamlandı olarak işaretlendi.

---

## Mantık / Bağlantı Notları

- `AdminPanel.jsx` `getActiveCriteria(selectedPeriod?.criteria_config)` ile çağırır — JSONB config path backward compat korundu
- `freezePeriodSnapshot` non-fatal: abort dışı hatalar loglanmaz, yükleme devam eder
- `listPeriodCriteria` non-fatal: abort dışı hatalar sessizce atlanır → `criteriaConfigForState = null` → static CRITERIA devreye girer
- `criteriaConfig` state artık DB satırları (`period_criteria` rows) veya `null` tutabilir; eski JSONB config da backward compat olarak çalışmaya devam eder

---

## Test Sonuçları

- Tüm testler çalıştırıldı: `npm test -- --run`
- Mevcut başarısızlıklar (40 adet) pre-existing — `.env.local` içinde `VITE_DEMO_MODE=true` ayarı `useJuryWorkflow.js:60` içinde `useState("qr_showcase")` başlangıç adımı vermekte, jüri akışı testleri "pin" adımını beklediği için başarısız olmakta
- Bu değişikliklerden kaynaklanan yeni test başarısızlığı yok (stash baseline ile aynı hata profili)

---

## Sonraki Adım

**Faz 4B** — Premium Demo Seed (`sql/seeds/002_demo_premium_seed.sql`) yeni şemaya göre sıfırdan yazım (`seed_generation_prompt.md` referans alınacak)

**veya**

**Faz 8** — E2E jüri akışı testi ve prod deploy doğrulaması
