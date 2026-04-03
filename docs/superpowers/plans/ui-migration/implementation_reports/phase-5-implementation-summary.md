# Phase 5 — Heatmap Page — Implementation Summary

## Yapılanlar

- ✅ `src/admin/HeatmapPage.jsx` sıfırdan yazıldı (ScoreGrid.jsx zaten silinmişti)
- ✅ `src/styles/pages/heatmap.css` prototype'tan extract edilerek yazıldı
- ✅ `src/admin/ScoresTab.jsx` güncellendi: `ScoreGrid` → `HeatmapPage` import ve render
- ✅ `src/admin/__tests__/HeatmapPage.aria.test.jsx` güncellendi: HeatmapPage mock ve render'ına uyarlandı
- ✅ `useScoreGridData` → `useHeatmapData` rename (dosya, export, tüm import/mock'lar)
- ✅ `score-grid.css` silindi (heatmap.css ile replace edildi)
- ✅ ARIA testleri geçiyor: `scoregrid.aria.01`, `scoregrid.aria.02`, `a11y.table.01`

## Dosya Değişiklikleri

### Silinen dosyalar

- `src/admin/ScoreGrid.jsx` — önceki phase'de silinmişti
- `src/admin/GridExportPrompt.jsx` — önceki phase'de silinmişti
- `src/styles/pages/score-grid.css` — heatmap.css ile replace edildi

### Sıfırdan yazılan dosyalar

- `src/admin/HeatmapPage.jsx`
- `src/styles/pages/heatmap.css`

### Rename edilen dosyalar

- `src/admin/useScoreGridData.js` → `src/admin/useHeatmapData.js`
- `src/admin/__tests__/useScoreGridData.test.jsx` → `src/admin/__tests__/useHeatmapData.test.jsx`
- `src/admin/__tests__/useScoreGridData.safety.test.jsx` → `src/admin/__tests__/useHeatmapData.safety.test.jsx`
- `src/admin/__tests__/ScoreGrid.aria.test.jsx` → `src/admin/__tests__/HeatmapPage.aria.test.jsx`
- `src/admin/__tests__/ScoreGrid.momentum.test.js` → `src/admin/__tests__/HeatmapPage.momentum.test.js`

### Güncellenen dosyalar

- `src/admin/ScoresTab.jsx` — `import ScoreGrid` → `import HeatmapPage`; `<ScoreGrid>` → `<HeatmapPage>`
- `src/admin/layout/AdminLayout.jsx` — HeatmapPage import + `scoresView === "grid"` render case eklendi
- `src/shared/api/admin/scores.js` — `getProjectSummary` return'üne `group_no` eklendi
- `src/admin/useGridSort.js`, `src/admin/useGridExport.js`, `src/admin/selectors/gridSelectors.js` — yorum güncellemeleri
- `src/test/qa-catalog.json` — ScoreGrid → Heatmap area/story/scenario güncellemeleri

## Parity Notları

- Prototype satır 13199–13288 tam olarak implement edildi
- Criteria tabs: All / Technical / Design / Delivery / Teamwork; aktif tab score sütununu değiştiriyor
- Score band renkleri yüzdelik eşiklerle belirleniyor: ≥90% excellent, ≥80% high, ≥75% good, ≥70% adequate, ≥60% low, <60% poor
- CSS değişkenleri: `--score-excellent-bg`, `--score-high-bg`, `--score-good-bg`, `--score-adequate-bg`, `--score-low-bg`, `--score-poor-bg`
- Footer legend: renk bar (poor→excellent), puan aralığı gösterimi, partial score notu
- Export panel: collapsible, xlsx/csv/pdf format seçimi, `requestExport()` çağrısı
- Juror avatar: baş harfler + renk (`getAvatarColor(key)` deterministic hash)
- Frozen first column (juror kolonu sticky): `position: sticky; left: 0`
- `tfoot` ortalama satırı: yalnızca görünür juror'lara göre hesaplanıyor (`computeVisibleAverages`)
- ARIA compliance: `role="grid"` table üzerinde, `role="rowheader"` juror sticky cell'de, `aria-sort` sıralanabilir tüm th'lerde

## Parity Tracker Güncellemesi

| Screen | Prototype Range | Target React File | Status | Parity | Notes |
| ------ | --------------- | ----------------- | ------ | ------ | ----- |
| Heatmap | 13199-13288 | src/admin/HeatmapPage.jsx | ✅ | Full | [Phase 5 Report](phase-5-implementation-summary.md) |

## Logic / Wiring Notları

### Hook bağlantıları (değişmeden korundu)

- `useHeatmapData({ data, jurors, groups, criteriaConfig })` → `{ lookup, jurorFinalMap, jurorWorkflowMap, groupAverages, buildExportRows }`
- `useGridSort(visibleJurors, groups, lookup)` → `{ visibleJurors, sortGroupId, sortGroupDir, sortJurorDir, sortMode, jurorFilter, groupScoreFilters, toggleGroupSort, toggleJurorSort, setJurorFilter, clearSort, setGroupScoreFilter, clearGroupScoreFilter, clearAllFilters }`
- `useGridExport({ buildExportRows, groups, periodName, visibleJurors })` → `{ requestExport }`

### Yeni yardımcı fonksiyonlar (HeatmapPage.jsx içinde)

- `getScoreBgVar(score, max)` — yüzdelik eşiklere göre CSS değişkeni döner
- `getInitials(name)` — juror adından 1-2 baş harf çıkarır
- `getAvatarColor(key)` — juror key'den deterministik arka plan rengi döner
- `getCellDisplay(entry, activeTab, activeCriteria)` — aktif tab'a göre score/max çifti döner
- `computeVisibleAverages()` — görünür juror'ların group bazlı ortalamalarını hesaplar

### Kritik davranışlar

- "all" tab aktifken: `entry.total` / `activeCriteria toplam max`
- Kriter tab'ı aktifken: `entry[criterionId]` / `criterion.max`
- Partial score (tüm kriterler girilmemiş): hücrede `⚑` bayrağı gösterilir
- criteriaConfig prop: verilmezse `config.js`'den `CRITERIA` fallback

### Test mock eklentisi

`useAuth` mock'u eklendi (`../../shared/auth`) — `useGridExport` içinde `useAuth()` çağırıldığı için HeatmapPage testlerinde gereklidir.

## Sonraki Adım

**Phase 6 — Reviews Page** (`src/admin/ReviewsPage.jsx`)

- Prototype kaynak: satır 13291–13490
- Silinecek: `src/admin/ScoreDetails.jsx` + `src/admin/components/details/*.jsx`
- Yazılacak: `src/admin/ReviewsPage.jsx` + `src/styles/pages/reviews.css`
- Hook bağlantısı: `useScoreDetailsFilters` (korunuyor)
