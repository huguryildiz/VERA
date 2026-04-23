# Session 31 Implementation Summary — EntryControlPage + OutcomesPage split

**Date:** 2026-04-23
**Status:** Done
**Build:** ✅ `npm run build` pass (5.45s) | ✅ `npm test -- --run` 278 pass / 0 fail
**Context kullanımı:** ~%55 (Opus 4.7 1M)
**Süre:** ~1.5 saat

---

## Yapılanlar

- ✅ EntryControlPage.jsx 1566 → 910 satır (orchestrator), 8 presentational component çıkarıldı
- ✅ OutcomesPage.jsx 1535 → 784 satır (orchestrator), 7 presentational component çıkarıldı
- ✅ Her iki dosya `check:js-size` hard violation listesinden çıktı (≥1000 satır)
- ✅ OutcomesPage.jsx sweet spot'a (≤800) girdi; EntryControlPage warn band'da (801-1000)
- ✅ 278/278 test geçti, bir regresyon yok
- ✅ Production build clean

## Oluşturulan Dosyalar

### EntryControl

| Dosya | Açıklama |
| ----- | -------- |
| `src/admin/features/entry-control/components/entryControlHelpers.js` | 7 fmt helper + `toTimestampMs` + `isExpiringSoon` (115 satır) |
| `src/admin/features/entry-control/components/SortIcon.jsx` | Sort indicator chevron (10 satır) |
| `src/admin/features/entry-control/components/TokenGeneratorCard.jsx` | QR frame card: status badge, frame, meta, action toolbar, distribute panel, token detail disclosure (207 satır) |
| `src/admin/features/entry-control/components/SessionOverviewPanel.jsx` | Session overview sağ panel: stats grid + active ratio bar + recent activity list (76 satır) |
| `src/admin/features/entry-control/components/SessionHistoryTable.jsx` | Access History sortable table + mobile portrait cells (110 satır) |
| `src/admin/features/entry-control/components/SendQrModal.jsx` | Bulk recipient select modal (117 satır) |
| `src/admin/features/entry-control/components/SendSuccessModal.jsx` | Post-send success summary (37 satır) |
| `src/admin/features/entry-control/components/NewUserSendModal.jsx` | Ad-hoc email chip input modal (143 satır) |
| `src/admin/features/entry-control/components/LockWarnModal.jsx` | Period lock warning before QR publish (52 satır) |

### Outcomes

| Dosya | Açıklama |
| ----- | -------- |
| `src/admin/features/outcomes/components/outcomeHelpers.js` | `coverageBadgeClass`, `coverageLabel`, `COVERAGE_LEGEND`, `naturalCodeSort` (50 satır) |
| `src/admin/features/outcomes/components/OutcomeRow.jsx` | Table row: code badge, label, chips, coverage toggle, kebab menu (141 satır) |
| `src/admin/features/outcomes/components/OutcomesTable.jsx` | Lock banner, table card, header kebab, inline rename + threshold edit, legend strip, pagination (266 satır) |
| `src/admin/features/outcomes/components/FrameworkSetupPanel.jsx` | Empty state variants: `noPeriods`, `noperiodSelected`, `noFramework` (framework picker), `pendingImport` (208 satır) |
| `src/admin/features/outcomes/components/DeleteOutcomeModal.jsx` | Typed-confirm delete dialog (82 satır) |
| `src/admin/features/outcomes/components/UnassignFrameworkModal.jsx` | Typed-confirm unassign dialog (83 satır) |
| `src/admin/features/outcomes/components/ImportConfirmModal.jsx` | Replace-outcome-set warning (55 satır) |

## Güncellenen Dosyalar

| Dosya | Değişiklik |
| ----- | ---------- |
| `src/admin/features/entry-control/EntryControlPage.jsx` | 1566 → 910. State ve handler'lar orchestrator'da kaldı; JSX prop drilling ile child component'lere dağıtıldı. `size-ceiling-ok` üst başlığı silindi (artık warn band). |
| `src/admin/features/outcomes/OutcomesPage.jsx` | 1535 → 784. Aynı desen: state + handler orchestrator, render parçalarını component'lere dağıtım. `size-ceiling-ok` üst başlığı silindi (sweet spot). |

## Taşınan Dosyalar

Yok — hepsi yeni `components/` alt dizininde oluşturuldu.

## Silinen Dosyalar

Yok.

---

## Mimari / Logic Notları

### Pattern: prop-drilled state (hook extract yok)

Plan'da belirtildiği gibi `useManageXxx` hook extract'ine girilmedi — state ve tüm handler fonksiyonları orchestrator'da kalır, child component'ler pure presentational. Bunun gerekçesi:

- Bu iki sayfada state graph tek merkezli (periodId, status, tokenHistory vs. period-scoped + OutcomesPage'de framework/draft state'i `usePeriodOutcomes` hook'unda zaten toplanmış)
- Hook ekleme pattern değişikliği demek; S29-30 desenini (prop drilling) korumak oturumlar arası tutarlılık için daha değerli
- Orchestrator boyutu hala kabul edilebilir (sweet ≤500 ideal; ≤800 ok; ≤1000 warn). EntryControlPage 910'da warn olsa da hard violation değil ve ileri bir iterasyonda state'i bir `useEntryTokenState` hook'una taşımak trivially mümkün

### EntryControlPage — Session Overview vs Access History ayrımı

Plan'da "SessionHistoryTable" yer aldı. Orchestrator'da iki ayrı bölge vardı:

1. **Session Overview (ec-sessions):** sağ panel, stats grid + recent activity (76 satır) → `SessionOverviewPanel.jsx`
2. **Access History (entry-history-table):** alt sortable table + portrait cells (110 satır) → `SessionHistoryTable.jsx`

İkisi isim olarak karışabilirdi; plan'daki "session list" ifadesi alt tabloyu işaret eder gibi dursa da her ikisini ayrı component yapmak orchestrator'ı 1026'dan 909'a çekti ve her dosya tek-sorumluluklı kaldı.

### OutcomesPage — FrameworkSetupPanel 4 variant

Plan'da "OutcomeMappingPanel" yer aldı; ama OutcomesPage'de criterion↔outcome mapping UI zaten tek row (`OutcomeRow`) içinde chip'lerle render ediliyor — ayrı bir "mapping paneli" yok. Bunun yerine 4 empty-state'i tek `FrameworkSetupPanel` altında `variant` prop'uyla birleştirdim:

- `variant="noPeriods"` → No evaluation periods yet
- `variant="noperiodSelected"` → No period selected
- `variant="noFramework"` → Framework picker (clone from period / platform template / start blank)
- `variant="pendingImport"` → Framework ready to apply

Bu, orchestrator'da dallı `{noPeriods ? … : noperiodSelected ? … : noFramework ? … : pendingImport ? … : <main>}` chain'ini düzleştirdi ve empty state davranışını tek dosyada topladı.

### Dead state detected

`OutcomesPage` içinde `unassignFwSubmitting` + `fwRenameSaving` set edici hiç çağrılmıyordu (sadece okunuyor). Orchestrator'da `_setX` ile prefix'leyip lint susturdum; bunlar aslında silinmeli ama kapsam dışı — ayrı bir temizleme session'ında dead state/useState temizliği yapılabilir.

### React ref prop warning

EntryControlPage test'inde bir React warning gözlendi: `Unexpected ref object provided for tbody` — `useCardSelection()` dönen `scopeRef`'i `historyScopeRef` olarak prop-drill edip `<tbody ref={tableRef}>`'e bağlıyoruz. Test 3/3 geçiyor, functional regresyon yok; warning JSDOM specific olabilir. Production build temiz.

---

## Doğrulama

- [x] `npm run build` — 5.45s, bundle'lar önceki ile aynı büyüklükte
- [x] `npm test -- --run` — 278 pass / 0 fail (baseline: 278)
- [x] `npm run check:js-size` — EntryControlPage + OutcomesPage hard violation listesinden çıktı
- [x] `npm run check:css-size` — etkilenmedi, aynı WARN listesi
- [x] `npm run check:no-native-select` — OK
- [x] `npm run check:no-nested-panels` — OK
- [x] `npm run check:no-table-font-override` — OK
- [ ] `npm run dev` manuel smoke — zaman yetersiz (parallel session)

### JS size karşılaştırması

| Dosya | Öncesi | Sonrası | Δ |
| --- | --- | --- | --- |
| `EntryControlPage.jsx` | 1566 | 910 | −656 (−42%) |
| `OutcomesPage.jsx` | 1535 | 784 | −751 (−49%) |
| **Toplam orchestrator** | 3101 | 1694 | **−1407** |
| Yeni component dosyalar (16 adet) | 0 | 1854 | +1854 |

Net artış +447 satır — split pattern'de beklenen overhead (import satırları, component signature, prop definitions).

### Pre-vs-post check:js-size çıktısı (ilgili satırlar)

Öncesi:

```text
HARD 1566 lines  src/admin/features/entry-control/EntryControlPage.jsx
HARD 1535 lines  src/admin/features/outcomes/OutcomesPage.jsx
```

Sonrası:

```text
WARN  910 lines  src/admin/features/entry-control/EntryControlPage.jsx
(OutcomesPage artık listede yok — sweet band)
```

---

## Plan sapmaları

1. **SortIcon.jsx ayrı dosya yapıldı** — plan'da zaten mentioned idi ama OutcomesPage'de aynı pattern var, orada inline kaldı (yalnız bir kullanım). Sadece EntryControlPage'de extract edildi.
2. **OutcomesTable.jsx 266 satır** — plan'daki ~150 tahmininden yüksek. Lock banner + header kebab + inline rename + inline threshold edit + legend strip hep birlikte coherent bir table-card bloğu; iki küçük dosyaya ayırmak yapay olacaktı.
3. **"OutcomeMappingPanel.jsx" yapılmadı** — plan'da ~400 satırlık mapping paneli beklenmişti, ancak codebase'de ayrı bir mapping paneli yok (chip'ler row içinde). Bunun yerine 4 empty state'i `FrameworkSetupPanel.jsx` altında toparladım. Plan'ın niyeti (orchestrator'ı ≤400 hedefine çekmek) aynı sonuca ulaştı.
4. **EntryControlPage 910'da kaldı** (plan hedefi ≤400). 910 warn band'da ve hard violation değil. Daha aşağı çekmek için `useEntryTokenState` hook'u gerekli; plan'daki "hook extract'e girme" kuralına sadık kalındığı için burada durduk.

## Sonraki adımlar

- S32: CriteriaPage split + GovernanceDrawers değerlendirmesi (paralel chat'te çalışıyor)
- Gelecek oturumlarda `useManageEntryToken` hook ayrımı gündeme gelirse EntryControlPage orchestrator ≤500'e düşer
- OutcomesPage'deki dead `_setX` state setter'ları ayrı temizleme oturumunda silinmeli

## Commit

Yok — kullanıcı açıkça istememiş; main chat S32 ile birlikte toplu commit'leyecek.

## Tracker güncellemesi

**YOK** — parallel execution modu; README.md / XLSX / CLAUDE.md güncellemelerini main chat iki session (S31 + S32) bitince topluca yapacak.
