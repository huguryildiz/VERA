# Phase 3 — Rankings Page Implementation Summary

## Yapılanlar

- ✅ `src/admin/RankingsPage.jsx` — Prototype'tan sıfırdan yazıldı
- ✅ `src/admin/layout/AdminLayout.jsx` — RankingsPage wired (scores + rankings view)
- ✅ `src/styles/pages/rankings.css` — Yapısal stiller vera.css'de, override placeholder oluşturuldu
- ✅ `src/admin/__tests__/RankingsTab.test.jsx` — Yeni RankingsPage API'sine göre yeniden yazıldı
- ✅ Tüm 7 test geçiyor

## Dosya Değişiklikleri

### Silinen

- `src/admin/RankingsTab.jsx` — (Phase 0/1'de silinmişti, zaten yoktu)
- `src/admin/scores/RankingsTable.jsx` — (Phase 0/1'de silinmişti, zaten yoktu)

### Eklenen / Yeniden Yazılan

- `src/admin/RankingsPage.jsx` — Yeni, sıfırdan yazıldı
- `src/admin/__tests__/RankingsTab.test.jsx` — Sıfırdan yeniden yazıldı

### Güncellenen

- `src/admin/layout/AdminLayout.jsx` — RankingsPage import + render bloğu eklendi
- `src/styles/pages/rankings.css` — Yorum bloğu güncellendi

## Parity Notları

### Prototype ile Birebirlik

- `.scores-header` (başlık + alt başlık) ✅
- `.scores-kpi-strip` (5 KPI kartı: Projects, Jurors, Avg Score, Top Score, Full Coverage) ✅
- `.filter-panel` (Consensus / Avg Range / Search dropdowns + Clear) ✅
- `.active-filters-bar` (aktif filter pills) ✅
- `.export-panel` (XLSX / CSV / PDF format seçimi + download button) ✅
- `#sub-rankings` tablosu (10 kolon: rank, proje, üyeler, 4 heat-cell, avg, consensus badge, jurors) ✅
- Ranking medal'ları: 🥇🥈🥉 emoji + `role="img"` + `aria-label` ✅
- Rank 4+ için rank-num badge (span ile sayı) ✅
- Heat cells: renkli alt indikatör + yüzde tooltip ✅
- Consensus badge: σ hesaplaması, High/Moderate/Disputed seviyeleri ✅
- Loading skeleton state ✅

### Kritik Kararlar

**Competition Ranking:** Eşit skorlarda aynı rank paylaşılır, sonraki rank atlanır
(örnek: iki rank-1 tie → sonraki rank 3, 2 değil). `computeRanks()` fonksiyonu bu kuralı uygular.

**Rank Stability Through Filtering:** `ranksMap`, `filteredRows` değil `rankedRows` (tam liste)
üzerinden hesaplanır. Arama/filtreleme bir projenin mutlak rank numarasını değiştirmez.

**Null Exclusion:** `totalAvg: null` olan projeler ranked list'e dahil edilmez, boş/unscored
olarak ayrıca gösterilmez. Rank pozisyonlarını kaydırmaz.

**Always-in-DOM Panels:** Filter ve export panel'leri her zaman DOM'da olur (CSS class ile
açılır/kapanır). Bu sayede RTL testleri panel kapalıyken de input/button'ları bulabilir.

**Medal ARIA:** `<span role="img" aria-label="1st place">🥇</span>` pattern'i RTL'nin
`getAllByRole("img", { name: /1st place/i })` query'si ile çalışır. `getAllByAltText`
kullanılmaz — RTL bu query'yi sadece `img/input/area/custom-element` tag'lerinde arar.

## Logic / Wiring Notları

- Yeni hook veya API değişikliği yok
- `summaryData` prop shape: `{ id, title, members, totalAvg, avg: { technical, design, delivery, teamwork } }`
- `rawScores` prop: consensus σ hesabı için kullanılır (rawScores boşsa consensus gösterilmez)
- `periodName` prop (test compat): `selectedPeriod?.name` yoksa fallback olarak kullanılır
- AdminLayout'a `rawScores`, `allJurors`, `selectedPeriod` propları da geçiliyor

## Parity Tracker Güncellemesi

| Screen | Prototype Range | Target React File | Status | Parity | Notes |
| ------ | --------------- | ----------------- | ------ | ------ | ----- |
| Rankings | 11985-12200 | src/admin/RankingsPage.jsx | ✅ | Full | Phase 3 Report (bu dosya) |

## Sonraki Adım

**Phase 4 — Analytics Page** (Prototype satır 12200-13199, ~1000 satır)
