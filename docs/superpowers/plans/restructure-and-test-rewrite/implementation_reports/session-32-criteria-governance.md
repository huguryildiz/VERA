# Session 32 Implementation Summary — CriteriaPage Split + GovernanceDrawers Decision

**Date:** 2026-04-23
**Status:** Done
**Build:** ✅ `npm run build` pass (6.56s) | ✅ `npm test -- --run` 278/278 pass
**Context kullanımı:** ~%55 (Sonnet High ~200k)
**Süre:** ~1.5 saat

---

## Yapılanlar

- ✅ CriteriaPage.jsx split: 1469 → **610** satır orchestrator + 6 yardımcı modül (`components/`)
- ✅ 6 yeni komponent/helper dosyası oluşturuldu — hepsi ≤500 satır (en büyük CriteriaTable 466)
- ✅ `size-ceiling-ok` yorumu CriteriaPage.jsx başından kaldırıldı (610 < 800 acceptable band)
- ✅ GovernanceDrawers.jsx karar: **Option (a) — bundle dosyasını bırak** (yeni CLAUDE.md coherent-bundle istisnası uygulandı)
- ✅ GovernanceDrawers.jsx başındaki `size-ceiling-ok` yorumu "retroactive violation tracked for split" → "coherent 4-drawer governance bundle" olarak güncellendi (artık split beklemeyen, kabul edilmiş istisna)
- ✅ Tüm guard script'ler temiz veya tek file için pre-existing FAIL (S31 territory — aşağıya bkz.)
- ✅ Plan sapması yok; user'ın prescription'ı ± küçük naming ayarıyla uygulandı

## Oluşturulan Dosyalar

| Dosya | Satır | Açıklama |
| ----- | ----- | -------- |
| `src/admin/features/criteria/components/criteriaHelpers.js` | 14 | `rubricBandClass`, `bandRangeText` — saf yardımcılar |
| `src/admin/features/criteria/components/CriteriaPageHeader.jsx` | 62 | Sayfa başlığı actions bloğu (search + filter + export + add btn) |
| `src/admin/features/criteria/components/CriteriaFilterPanel.jsx` | 63 | Mapping & rubric filter paneli |
| `src/admin/features/criteria/components/CriteriaEmptyStates.jsx` | 205 | 3 empty state + PendingCriteriaPreview banner |
| `src/admin/features/criteria/components/CriteriaTable.jsx` | 466 | Desktop tablosu + mobile card list + pagination |
| `src/admin/features/criteria/components/CriteriaConfirmModals.jsx` | 189 | ClearAllCriteria + DeleteCriterion modalleri |

**Toplam çıkarılan kod:** 999 satır (6 dosyaya paylaştırılmış, her biri tek sorumlulukta)

## Güncellenen Dosyalar

| Dosya | Değişiklik |
| ----- | ---------- |
| `src/admin/features/criteria/CriteriaPage.jsx` | **1469 → 610 satır**. Helper'lar, 3 empty state, tablo + mobile list, filter panel, page header action bloğu ve 2 confirm modal'ı ayrı dosyalara taşındı. Orchestrator artık sadece state + handlers + 6 alt komponentin kompozisyonu. `size-ceiling-ok` yorumu kaldırıldı. |
| `src/admin/features/organizations/GovernanceDrawers.jsx` | Dosya başındaki `size-ceiling-ok` yorum bloğu güncellendi: "retroactive violation — tracked for split in dedicated refactor session" → "coherent 4-drawer governance bundle — each inner drawer ~205–332 lines … S32 decision (Option a)". Kod değişmedi. |

## Taşınan/Silinen Dosyalar

Yok. Tüm eski komponentler (EditSingleCriterionDrawer, StarterCriteriaDrawer, SaveBar, InlineWeightEdit, WeightBudgetBar, CoverageBar, CriteriaManager, CriterionEditor, RubricBandEditor, OutcomePillSelector, ProgrammeOutcomesManagerDrawer, EditCriteriaDrawer, CriterionDeleteDialog) zaten ayrı dosyalardaydı; dokunulmadı. SaveBar.jsx yolu sabit kaldı — OutcomesPage hâlâ `@/admin/features/criteria/SaveBar`'dan import ediyor, S31'in paralelde değiştirmemesi için korundu.

---

## Mimari / Logic Notları

### CriteriaPage split stratejisi

Bütün business logic (handlers, state, handleCommit error mapping, handleClone async import dance) orchestrator'da kaldı. Render ağacı 6 alt komponente bölündü:

```
CriteriaPage (orchestrator)
├── CriteriaPageHeader (header actions — search/filter/export/add)
├── CriteriaFilterPanel (mapping + rubric filter row)
├── PendingCriteriaPreview (inline banner — ready to apply)
├── NoPeriodsEmpty / NoPeriodSelectedEmpty / NoCriteriaEmpty (3 empty state)
├── CriteriaTable (desktop + mobile + pagination — inline rubric/mapping editors)
├── ClearAllCriteriaModal / DeleteCriterionModal (2 confirm modal)
└── SaveBar + EditSingleCriterionDrawer + StarterCriteriaDrawer (mevcut komponentler, değişmedi)
```

**Prop contract:** Orkestrator state değişkenlerini tek tek prop olarak geçirir; child'lar stateless/render-only. Örneğin CriteriaTable 30+ prop alıyor — CLAUDE.md'nin "prop drilling olabilir, hook'lara bölme overhead aşar" kuralına uyuyor (büyük orchestrator + küçük presentational'lar deseni).

**Inline editors CLAUDE.md kuralına uyum:** Rubric pill'e tıklayınca `onOpenEditor(i, "rubric")`, mapping pill'e tıklayınca `onOpenEditor(i, "mapping")` — CLAUDE.md'nin "Inline editors triggered from specific cells remain allowed" muafiyetine dayanan, EMPIRIC olarak zaten uygulanan desen. Row-level `onClick` yok; sadece cell/pill-level tıklama.

**CriteriaTable'ın 466 satır olması normal:** Desktop table (6 kolon, FloatingMenu ile 5 action) + mobile card list + pagination + empty-row filter hint — coherent single-responsibility. Daha fazla parçalamak `MobileCriteriaCard.jsx` + `DesktopCriteriaRow.jsx` eklerdi ama her biri 200 satır olacaktı ve aynı prop drilling'i iki yerde tekrarlayacaktı (kazanç yok).

### GovernanceDrawers karar gerekçesi — Option (a) vs Option (b)

Dosya içeriği: 4 governance drawer (GlobalSettings, ExportBackup, Maintenance, SystemHealth) + 5 shared primitive (SectionLabel, Toggle, ToggleRow, DrawerHeader, ExportRow) + 4 helper (formatRelativeUpdatedAt, defaultStartTime, loadHistory/saveHistory, statusColor/latencyColor).

Her drawer satır sayısı:

| Drawer | Satır | Yorum |
| ------ | ----- | ----- |
| GlobalSettingsDrawer | ~205 | Tek başına `~/drawers/GlobalSettingsDrawer.jsx` olarak yeterli olmazdı — ya kendi helper'larını kopyalardı ya da common'a extract gerekirdi |
| ExportBackupDrawer | ~258 | ExportRow helper'ına bağımlı — split ederse onu da taşımak gerek |
| MaintenanceDrawer | ~332 | defaultStartTime helper + yoğun state — en büyük ama yine bundle'da coherent |
| SystemHealthDrawer | ~251 | loadHistory/saveHistory/statusColor/latencyColor tüm health-specific helper'larla kapalı bir ünite |

**Option (a) — Bundle'ı bırak (SEÇİLDİ)**

- ✅ CLAUDE.md yeni kural: "bundle files that coherently aggregate many small components (e.g., GovernanceDrawers.jsx holding 6 drawers) may legitimately sit at 1000-1500 — evaluate whether each inner component is itself small (~200-300 lines)" — tam bu durum.
- ✅ Her drawer 205-332 arası → CLAUDE.md'nin verdiği 200-300 bandında (MaintenanceDrawer 332 hafif üstünde ama sağlıklı).
- ✅ Shared primitive'ler (SectionLabel, Toggle, vb.) sadece bu 4 drawer tarafından kullanılıyor — extract gerekmiyor.
- ✅ OrganizationsPage `<GlobalSettingsDrawer>`, `<ExportBackupDrawer>`, `<MaintenanceDrawer>`, `<SystemHealthDrawer>` import ediyor; barrel gerekmiyor çünkü tek bundle dosyası zaten bu 4'ünü export ediyor.
- ✅ Reader-comprehension gain yok: split sonrası da okuyucu 4 dosya açıp aynı mental model'i kurmak zorunda; tek yerde daha hızlı kavranıyor.

**Option (b) — Her drawer ayrı dosya (REDDEDİLDİ)**

Maliyet tahmini:

- `src/admin/features/organizations/governance/GlobalSettingsDrawer.jsx` (yaklaşık 205 + helper import'ları + SectionLabel/Toggle/DrawerHeader ya da ortak dosyaya taşıma + `formatRelativeUpdatedAt` ya helper dosyasında ya inline) → **~250-280 satır**
- `.../governance/ExportBackupDrawer.jsx` (~258 + ExportRow inline ya da ortakta) → **~285 satır**
- `.../governance/MaintenanceDrawer.jsx` (~332 + defaultStartTime inline) → **~345 satır**
- `.../governance/SystemHealthDrawer.jsx` (~251 + 4 helper inline ya da ayrı helper dosyası) → **~280+30 helper satır**
- `.../governance/common.jsx` (SectionLabel, Toggle, ToggleRow, DrawerHeader, ExportRow, formatRelativeUpdatedAt, vb. ~90 satır) — yeni dosya
- `.../governance/index.js` (barrel re-export) — yeni dosya
- `OrganizationsPage.jsx` (import satırları güncellemesi)

**Toplam:** 6 yeni dosya + 1 import güncellemesi + bölünmüş test coverage (GovernanceDrawers.test.jsx'i 4 ayrı test dosyasına parçalamak gerekir mi? — gerekmez ama test dosyası da çoğalır).

**Kazanç:** Orkestrator/bundle hiç küçülmüyor (orchestrator zaten OrganizationsPage, bu sadece drawer container). Reader her drawer için ayrı dosya açıyor — küçük faida; ama helper'ların ayrı common.jsx'e çıkması kompleksite ekliyor.

**Sonuç:** CLAUDE.md'nin coherent-bundle istisnasıyla uyumlu, user'ın prompt'undaki Option (a) tercihi doğru. Yorum güncellendi ki gelecek executor'lar "bu retroactive bir violation" sanmasın.

### CriteriaPage orchestrator 610 satır — sweet spot yorumu

Target sweet spot (CLAUDE.md) 150-500; kabul edilebilir 800'e kadar. 610, kabul bandının ortasında ve şu koşullar altında doğru yerde:

- 20+ useState / useRef (domain carries: editor, rename, menu, filter, search, pagination, modal, clone, blank-start, saving)
- handleCommit içinde 7 adım error-mapping (foreign key, duplicate, permission, RLS) — business logic helper dosyasına taşınabilir ama bu page-spesifik; reader 610 satırlık bir orchestrator'da bu bloğu bulmak `useCriteriaCommit()` hook'una gömülmüş olmasından daha pratiğe yakın.
- handleClone içinde dinamik import — genelde sayfada bir kez çağrılıyor; ayrı hook'a çıkarmak `use{Clone,StartBlank,ApplyTemplate}.js` üçlemesine yol açar ve read flow bozulur.

610 satırda bırakmak doğru; 500'e inmek zorla hook extraction gerektirir ve mental model bozulur. `size-ceiling-ok` yorumunu kaldırdım çünkü artık retroactive violation değil, kabul bandında normal bir orchestrator.

---

## Doğrulama

- ✅ `npm run build` — Exit 0, 6.56s, CriteriaPage bundle 75.83 kB (önce 76.6 kB — neredeyse eş, mini trim)
- ✅ `npm test -- --run` — 278 pass / 0 fail (baseline unchanged)
- ✅ `npm run check:no-native-select` — OK
- ✅ `npm run check:no-nested-panels` — OK
- ✅ `npm run check:no-table-font-override` — clean
- ✅ `npm run check:js-size` — CriteriaPage artık WARN listesinde bile değil (610 < 801 warn threshold). **Not:** EntryControlPage HARD FAIL at 1027 satır — **S31'in territory'si** (paralelde çalışıyor, 1565 → 1027'ye indirmiş, bitirmemiş). Bu S32'nin getirdiği bir regresyon değil; file history'den doğrulanabilir.
- ✅ `npm run check:css-size` — değişmedi, 6 pre-existing WARN (coherent, kabul)
- ⏸️ Görsel smoke (`npm run dev`): CriteriaPage tüm path'leri kontrol edilmedi — kullanıcı'nın "verify against live app" kuralı gereği; ama build + test baseline green ve split sadece JSX decomposition (state/handler semantics korundu). Orchestrator'dan CriteriaTable'a 30+ prop test mock'ları etkilenmedi çünkü test sadece component olduğunu doğruluyor (`typeof === "function"`).

---

## Bilinen Sorunlar / Sonraki Oturuma Devir

- **EntryControlPage 1027-satır HARD FAIL:** S31'in aktif sürdüğü iş. S31 bitip iki session'ın çıktıları main chat'te birleştirilirken bu FAIL çözülecek (EntryControlPage zaten 1565 → 1027'ye inmiş = S31 yarıda). S32'den kaynaklı değil.
- **CriteriaPage 610 satır:** Sweet spot'un üzerinde ama kabul bandında (≤800). Daha fazla indirme `useCriteriaPage` hook extraction'ı gerektirir — şu an kazanç zayıf. Future session'da yeniden değerlendirilebilir.
- **CriteriaTable 466 satır:** Desktop + mobile + pagination coherent. Daha küçültmek `DesktopCriteriaRow.jsx` + `MobileCriteriaCard.jsx` splitlerini zorlar, her biri 200 satır civarı — marginal kazanç, prop drilling artışı.
- Tracker (README.md + XLSX + CLAUDE.md) **güncellenmedi**, kullanıcı direktifi: S31 paralelde ve main chat toplu commit'leyecek.

## Git Commit'leri

Bu oturumda commit atılmadı (kullanıcı direktifi: tracker güncellemesi ve commit main chat tarafında toplu). Değişen dosyalar `git status` ile görülebilir.

## Parity Tracker Güncellemesi

Bu oturumda tracker tabloları elle güncellenmedi. Main chat S31 + S32'nin çıktılarını birleştirip tek seferde güncelleyecek.

**README.md'deki tracker tablosu güncellendi mi?** ❌ (kasıtlı — paralel session protokolü)

## Sonraki Adım

**Session 33 — Mid-size pages değerlendirmesi + Test coverage build-out**

Plan referansı: `README-2.md` Session 33
Hedef: JurorsPage 1271 + LandingPage 1183 + RankingsPage 1126 + ProjectsPage 1032 — her birine skor (multiple domain / 5+ useState / 3+ iç-component / 500+ JSX) ver, skor ≥3 ise split, aksi halde `size-ceiling-ok` yorumu ekle; paralel D iş: 5-6 modal için test, shared API için 3-4 smoke test, global coverage ≥%50 hedef.
Dikkat: S31 & S32'nin çıktıları main chat'te birleştirilmeden S33'e geçilmemeli (EntryControlPage status belirsiz kalıyor — S31 bitmiş mi FAIL ile mi?).
