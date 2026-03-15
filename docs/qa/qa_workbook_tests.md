# QA Workbook Test İmplementasyonu — Durum Özeti

**Tarih:** 2026-03-15
**Referans:** `docs/testing/qa_workbook_prompt.md`
**Test suite sonucu:** 36 dosya, 276 test — tümü geçiyor ✓

> Sprint 1–3 risk-bazlı genişleme tamamlandı (2026-03-15). Önceki workbook gap-closing fazına ek olarak 32 yeni katalog girişi ve 32 yeni test eklendi. Önceki faz özeti dokümanın sonunda korundu.

---

## Sprint 1–3: Risk-Bazlı Test Genişlemesi

### qa-catalog.json Değişimi

| Faz | Giriş Sayısı |
|---|---|
| Gap-closing (önceki faz) | 160 |
| Sprint 1–3 eklentisi | +32 |
| **Toplam** | **192** |

---

### Sprint 1 — Jury Sync + Flow + Permissions Lock

#### `src/jury/__tests__/useJuryState.writeGroup.test.js` *(genişletildi)*

Yeni describe blokları: **"jury.sync — save payload and sync state"**, **"permissions.lock — edit lock behavior"**

| Test ID | Senaryo |
|---|---|
| `jury.sync.01` | `handleScoreBlur` → `upsertScore` doğru semesterId/projectId/jurorId/scores ile çağrılıyor |
| `jury.sync.02` | `upsertScore` reject edince `saveStatus` = `"error"` oluyor |
| `jury.sync.03` | Başarısız yazımın ardından başarılı yazım `saveStatus`'ü `"saved"` yapıyor |
| `jury.sync.04` | Blur öncesinde birden fazla değişiklik yapılınca sadece son değer yazılıyor |
| `permissions.lock.01` | `editLockActive=true` iken `writeGroup` `upsertScore`'u çağırmıyor |
| `permissions.lock.02` | `upsertScore` `semester_locked` hatası döndürünce `editLockActive=true` oluyor |
| `permissions.lock.03` | `edit_allowed=true` olan done juror → `handleEditScores` → `step="eval"`, `editLockActive=false` |
| `permissions.lock.04` | `lock_active=false` ile açılan yeni oturum `editLockActive=false` ile başlıyor |

#### `src/jury/__tests__/useJuryState.test.js` *(genişletildi)*

Yeni describe bloğu: **"jury.flow — flow mechanics"**

| Test ID | Senaryo |
|---|---|
| `jury.flow.01` | Eksik kriterler varken auto-done tetiklenmiyor (`confirmingSubmit=false` kalıyor) |
| `jury.flow.02` | Tüm gruplar synced olunca `confirmingSubmit=true` oluyor |
| `jury.flow.03` | `handleEditScores` → scores, comments, `groupSynced` kayıtlı veriden yükleniyor |
| `jury.flow.04` | Bir sonraki gruba navigasyonda önceki grubun skorları değişmiyor |

---

### Sprint 2 — Rankings + Consistency + PIN Reset

#### `src/admin/__tests__/RankingsTab.test.jsx` *(genişletildi)*

| Test ID | Senaryo |
|---|---|
| `results.rank.01` | `totalAvg=null` olan proje ranked listede görünmüyor |
| `results.rank.02` | Eşit `totalAvg`'de iki proje rank 1 alıyor, sonraki rank 3 oluyor (competition ranking: 1,1,3) |
| `results.rank.03` | Arama filtresi görünür projenin mutlak rank numarasını değiştirmiyor |
| `results.rank.04` | `totalAvg=null` olan projenin bulunması diğer projelerin rank sıralamasını kaydırmıyor |

**Not:** Algoritma competition ranking (1,1,3) — dense ranking değil (1,1,2). Catalog entry `results.rank.02` buna göre güncellendi.

#### `src/admin/__tests__/ScoreDetails.test.jsx` *(genişletildi)*

| Test ID | Senaryo |
|---|---|
| `results.consistency.01` | Juror Status "Completed" filtresi sadece `finalSubmittedAt` dolu, editing olmayan jurorları gösteriyor |
| `results.consistency.02` | Score Status "Scored" filtresi sadece `total` dolu olan satırları gösteriyor |
| `results.consistency.03` | Score Status "Partial" filtresi sadece bazı kriterleri dolu olan satırları gösteriyor |
| `results.consistency.04` | Updated At range filtresi (from + to) aralık dışındaki satırları gizliyor |

#### `src/admin/__tests__/PinResetDialog.test.jsx` *(genişletildi)*

Yeni describe bloğu: **"PinResetDialog — loading and stale state"**

| Test ID | Senaryo |
|---|---|
| `pin.reset.06` | `pinResetLoading=true` iken buton "Resetting…" gösteriyor ve disabled |
| `pin.reset.07` | `resetPinInfo` yeni PIN ile güncellenince yeni PIN görünüyor (stale PIN değil) |
| `pin.reset.08` | Farklı juror için dialog açılınca yeni juror adı görünüyor (stale juror değil) |

---

### Sprint 3 — Export + A11y

#### `src/admin/__tests__/export.test.js` *(yeni dosya)*

`exportGridXLSX`, `exportRankingsXLSX`, `buildExportFilename` — `xlsx-js-style` mock'lanarak `aoa_to_sheet` çağrısı capture edildi.

| Test ID | Senaryo |
|---|---|
| `export.filename.01` | `buildExportFilename` → `vera_{type}_{semester}_{YYYY-MM-DD}_{HHMM}.xlsx` pattern'i |
| `export.grid.01` | `exportGridXLSX` → header row: Juror, Institution / Department, Status + grup kolonları |
| `export.grid.02` | `exportGridXLSX` → sadece geçirilen satırlar yazılıyor (1 row = header + 1 data) |
| `export.rank.01` | `exportRankingsXLSX` → eşit `totalAvg`'de iki proje rank=1, sonraki rank=3 |

#### `src/admin/__tests__/ScoreGrid.aria.test.jsx` *(genişletildi)*

Yeni describe bloğu: **"ScoreGrid — ARIA sort"**

| Test ID | Senaryo |
|---|---|
| `a11y.table.01` | Sortable column header'lar her zaman geçerli bir `aria-sort` attribute'u taşıyor (`ascending`/`descending`/`none`) |

#### `src/test/a11y.test.jsx` *(genişletildi)*

Yeni describe blokları: **"Dialog accessibility"**, **"Form accessibility"**, **"Live region accessibility"**

| Test ID | Senaryo |
|---|---|
| `a11y.dialog.01` | `PinResetDialog` → `role="dialog"` ve `aria-modal="true"` var |
| `a11y.dialog.02` | Cancel butonu accessible name taşıyor ve `onClose` callback'ini çağırıyor |
| `a11y.form.01` | `ScoringGrid` score input'larının `aria-label` attribute'u var |
| `a11y.banner.01` | `SaveIndicator` → `role="status"` ve `aria-live="polite"` |

---

### Catalog Entry Düzeltmeleri (Sprint sırasında güncellenenler)

| ID | Değişiklik |
|---|---|
| `results.rank.02` | Scenario ve risk metni güncellendi: dense değil competition ranking (1,1,3) |
| `pin.reset.06` | Story değişti: "Reset Failure Shows Error" → "Reset PIN Loading State Shows Feedback" (PinResetDialog'da error prop yok) |
| `a11y.dialog.01` | Scenario güncellendi: focus management yerine structural ARIA contract testi |
| `a11y.dialog.02` | Scenario güncellendi: Escape handler yok — Cancel butonu accessible close mekanizması |

---

### Değiştirilen Dosyalar (Sprint 1–3)

```
# Güncellenen katalog
src/test/qa-catalog.json                         160 → 192 giriş

# Genişletilen test dosyaları
src/jury/__tests__/useJuryState.writeGroup.test.js   +8 test (jury.sync.*, permissions.lock.*)
src/jury/__tests__/useJuryState.test.js              +4 test (jury.flow.*)
src/admin/__tests__/RankingsTab.test.jsx             +4 test (results.rank.*)
src/admin/__tests__/ScoreDetails.test.jsx            +4 test (results.consistency.*)
src/admin/__tests__/PinResetDialog.test.jsx          +3 test (pin.reset.06-08)
src/admin/__tests__/ScoreGrid.aria.test.jsx          +1 test (a11y.table.01)
src/test/a11y.test.jsx                               +4 test (a11y.dialog.*, a11y.form.01, a11y.banner.01)

# Yeni test dosyası
src/admin/__tests__/export.test.js                   +4 test (export.*)
```

---

---

## Neler Yapıldı

### 1. Kaynak Kodu Değişikliği

**`src/admin/settings/PinResetDialog.jsx`**

Result adımında (yeni PIN üretildikten sonra) juror adı satırı eklendi. Önceden sadece PIN kodu gösteriliyordu; artık "Juror: Alice" satırı da var. Birden fazla art arda reset yapan adminlerin yanlış kişinin PIN'ini göndermemesi için bağlam sağlar.

**Etkilenen workbook satırı:** TC-021

---

### 2. Yeni Test Dosyaları

#### `src/admin/__tests__/PinResetDialog.test.jsx` *(yeni)*

| Test ID | Senaryo |
|---|---|
| `pin.reset.01` | Onay adımında juror adı görünüyor |
| `pin.reset.02` | Onay adımında semester etiketi görünüyor |
| `pin.reset.03` | Cancel ve Reset PIN butonları mevcut |
| `pin.reset.04` | Result adımında 4 haneli PIN görünüyor |
| `pin.reset.05` | Result adımında juror adı görünüyor (kaynak kodu değişikliği sonrası) |

**Karşıladığı workbook satırları:** TC-020, TC-021

---

#### `src/admin/__tests__/ScoreGrid.aria.test.jsx` *(yeni)*

| Test ID | Senaryo |
|---|---|
| `scoregrid.aria.01` | Score matrix tablosu `role="grid"` taşıyor |
| `scoregrid.aria.02` | Juror hücreleri `role="rowheader"` taşıyor |

**Karşıladığı workbook satırı:** TC-018

Mock yapısı: `useScoreGridData`, `useGridSort`, `useScrollSync`, `useGridExport`, `useResponsiveFilterPresentation` mock'landı. `jurorFinalMap` ve `jurorWorkflowMap` düzgün `Map` nesneleri olarak, `groupAverages` dizi olarak verildi.

---

### 3. Genişletilen Mevcut Test Dosyaları

#### `src/admin/__tests__/ManageProjectsPanel.test.jsx`

Yeni describe bloğu: **"ManageProjectsPanel — import summary"**

| Test ID | Senaryo |
|---|---|
| `groups.csv.summary.01` | Başarılı importtan sonra "Import complete: 1 added, 1 skipped" mesajı görünüyor |

**Karşıladığı workbook satırı:** TC-019

Davranış notu: Özet mesajı client-side hesaplanıyor — `projects` prop'undaki mevcut `group_no` değerleri ile CSV'deki değerler karşılaştırılarak belirleniyor. `onImport` çağrısı öncesinde set ediliyor.

---

#### `src/admin/__tests__/smoke.test.jsx`

Yeni describe bloğu: **"ChartDataTable — reduced motion"**

| Test ID | Senaryo |
|---|---|
| `analytics.motion.01` | `prefers-reduced-motion: reduce` aktifken `<details>` elementi `open` olarak render ediliyor |

**Karşıladığı workbook satırı:** TC-017

`ChartDataTable` doğrudan test edildi (`AnalyticsTab` üzerinden değil) — daha izole ve güvenilir.

---

#### `src/jury/__tests__/EvalStep.test.jsx`

2 adet bare `it()` çağrısı `qaTest()` formatına dönüştürüldü:

| Eski | Yeni ID | Senaryo |
|---|---|---|
| `it("Submit All button is hidden...")` | `jury.eval.07` | `allComplete=false` iken Submit butonu görünmüyor |
| `it("Group synced banner is hidden...")` | `jury.eval.08` | `editMode=true` iken synced banner görünmüyor |

Kullanılmayan `it` import'u da temizlendi.

---

### 4. `src/test/qa-catalog.json`

11 yeni giriş eklendi:

| ID | Modül | Severity |
|---|---|---|
| `pin.reset.01` | Admin / Settings | critical |
| `pin.reset.02` | Admin / Settings | critical |
| `pin.reset.03` | Admin / Settings | normal |
| `pin.reset.04` | Admin / Settings | normal |
| `pin.reset.05` | Admin / Settings | normal |
| `groups.csv.summary.01` | Admin / Settings | normal |
| `analytics.motion.01` | Admin / Analytics | normal |
| `scoregrid.aria.01` | Scores / Grid | normal |
| `scoregrid.aria.02` | Scores / Grid | normal |
| `jury.eval.07` | Jury / Evaluation | critical |
| `jury.eval.08` | Jury / Evaluation | normal |

---

## Workbook Boşluk Kapanma Durumu

| Workbook TC | Senaryo | Önceki Durum | Sonraki Durum |
|---|---|---|---|
| TC-017 | Reduced motion → data table açık | ❌ Yok | ✅ `analytics.motion.01` |
| TC-018 | ScoreGrid ARIA rolleri korunuyor | ❌ Yok | ✅ `scoregrid.aria.01–02` |
| TC-019 | CSV import sonrası özet mesajı | ⚠️ Kısmen | ✅ `groups.csv.summary.01` |
| TC-020 | PIN reset onayı semester bağlamını içeriyor | ❌ Yok | ✅ `pin.reset.01–03` |
| TC-021 | PIN reset sonuç adımı juror adını içeriyor | ❌ Yok + kod değişikliği gerekli | ✅ `pin.reset.04–05` + kaynak kodu |
| EvalStep bare `it()` | 2 test QA sistemine dahil değildi | ⚠️ Bare `it()` | ✅ `jury.eval.07–08` |

---

## Değişmeyen Alanlar

Aşağıdaki workbook TC'leri zaten kapsamlı şekilde test ediliyordu, dokunulmadı:

- TC-002/003: PinStep → `jury.pin.01–04`
- TC-004: PinRevealStep → `jury.pin.*`
- TC-007: Son grup Next butonu disabled → `jury.eval.03`
- TC-008: Submit visibility → `jury.eval.04` + yeni `jury.eval.07`
- TC-009: Lock state → `jury.eval.05`
- TC-011: Admin yanlış şifre → `security.validation.*`
- TC-022: Semester sil uyarısı → `semester.crud.*`

---

## Test Çalıştırma Kılavuzu

### Lokalde Çalıştırma

#### 1. Hızlı kontrol (watch mode)

```bash
npm test
```

Dosya kaydettiğinde otomatik yeniden çalışır. Terminal'de yeşil/kırmızı çıktı.

#### 2. Tek seferlik CI-style run

```bash
npm test -- --run
```

#### 3. Allure + Excel raporlu tam çalıştırma

```bash
npm run test:report                      # testleri çalıştır, JSON + allure-results üretir
npm run allure:generate                  # allure-results/ → allure-report/ HTML
npm run allure:open                      # tarayıcıda aç
node scripts/generate-test-report.cjs   # test-results/test-report.xlsx üretir
```

- Excel raporu: `test-results/test-report.xlsx`
- Allure HTML raporu: `allure-report/` klasörü, tarayıcıda interaktif görünüm

---

### GitHub'da CI Akışı

Her **push** (main/master) ve her **pull request**'te otomatik çalışır:

```
push / PR
  └─ test job
       ├─ npm run test:report              (Vitest + Allure reporter)
       ├─ node scripts/generate-test-report.cjs  → test-report.xlsx
       ├─ npm run allure:generate          → allure-report/
       ├─ artifact: test-report-excel-{run_number}.xlsx   (30 gün saklanır)
       └─ artifact: test-report-allure-{run_number}/      (30 gün saklanır)
```

GitHub Actions → ilgili workflow run → **Artifacts** bölümünden Excel ve Allure raporunu indirebilirsin.

CI başarısız olursa push **bloklanmaz** (branch protection rule yoksa), ama Actions sekmesinde kırmızı ✗ görünür.

E2E job şu an devre dışı (`if: false`) — izole test DB olmadığı için lokalde manuel çalıştırılıyor:

```bash
npm run e2e          # Playwright testleri
npm run e2e:report   # Playwright HTML raporu aç
```

---

## Dosya Envanteri

```
# Yeni dosyalar
src/admin/__tests__/PinResetDialog.test.jsx
src/admin/__tests__/ScoreGrid.aria.test.jsx

# Değiştirilen kaynak kodu
src/admin/settings/PinResetDialog.jsx

# Değiştirilen test dosyaları
src/admin/__tests__/ManageProjectsPanel.test.jsx
src/admin/__tests__/smoke.test.jsx
src/jury/__tests__/EvalStep.test.jsx

# Güncellenen katalog
src/test/qa-catalog.json
```
