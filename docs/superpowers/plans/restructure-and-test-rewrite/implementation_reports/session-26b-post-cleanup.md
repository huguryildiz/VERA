# Session 26b Implementation Summary — Post-S26 Cleanup

**Date:** 2026-04-23
**Status:** Done (değerlendirme — yeni kod yok)
**Build:** ✅ `npm run build` pass | ✅ `npm test -- --run` (278 pass)
**Context kullanımı:** ~%50 (Opus, S26 sonrası aynı oturum)
**Süre:** ~20 dk

---

## Yapılanlar

S26 raporunun "Sonraki Oturuma Devir" bölümündeki 4 kalem değerlendirildi. 1'i tamam olarak işaretlendi, 2'si "dedicated sprint gerektirir" olarak ertelendi, 1'i kullanıcı elinde.

### 1. qa-catalog audit → ✅ Tamam

- Toplam entry: **312**
- Orphan (src/supabase/sql/tests altında referansı bulunmayan): **0**
- Dağılım:

| Prefix | Count |
|---|---:|
| ui | 54 |
| admin | 53 |
| jury | 42 |
| api | 40 |
| edge | 40 |
| auth | 37 |
| lib | 20 |
| hooks | 15 |
| storage | 11 |

Tracker'daki "qa-catalog.json sıfırla + yeniden yaz ⬜ Bekliyor" satırı ✅ olarak düzeltildi. Gerçekten S15-S24 boyunca yeniden dolduruluyordu, tracker güncellenmemişti.

### 2. Dead CSS silme → ⏸️ Per-class audit gerekir (ayrı sprint)

`legacy-*` (5 dosya) + `mop-*` (3 dosya) toplam 8 dosya incelendi. Hepsi `src/styles/main.css`'ten import ediliyor:

```css
@import './ui-base/mop-base.css';
@import './ui-base/mop-dark-outcome.css';
@import './landing/legacy-shell.css';
@import './landing/legacy-eyebrow.css';
@import './landing/legacy-responsive.css';
@import './landing/legacy-sections.css';
@import './landing/legacy-light-mode.css';
```

Sample class spot-check — JSX kullanım sayıları:

| Class | JSX kullanımı | Kaynak dosya |
|---|---:|---|
| `btn-landing-primary` | 6 | legacy-shell.css |
| `landing-section-label` | 8 | legacy-eyebrow.css |
| `admin-gallery-grid` | **0** | legacy-sections.css |
| `ag-card` | **0** | legacy-sections.css |
| `mop-btn-primary` | 1 | mop-base.css |
| `mop-container` | 1 | mop-base.css |
| `outcome-editor-block-reasons-list` | 1 | mop-dark-outcome.css |

Karışık. "Legacy" öneki yanıltıcı — çoğu hâlâ kullanımda. `legacy-sections.css` içinden `admin-gallery-grid`/`ag-card` gerçekten ölü ama dosya tümden silme güvensiz.

**Öneri:** Ayrı bir CSS audit sprinti. Her legacy/mop dosyası için:
1. İçindeki her class'ı listele
2. JSX/JS'de kullanımı say
3. 0 kullanımlı class'ları tek tek sil
4. Hiçbir class kalmayan dosya varsa kaldır

### 3. Dark mode tokenize → ⏸️ Ayrı sprint

- 46 CSS dosyası
- 198 `body.dark-mode` override bloğu

Plan'da opsiyonel işaretliydi. Dominant-token stratejisi (variables.css'te dark mode token'larını default yap, bireysel override'ları sil) 2-4 saatlik, regresyon riski yüksek. Tek otonom turda yapılmamalı.

### 4. E2E çalıştırma → Kullanıcı

`npm run e2e` dev server + DB state ister. S25'te 13 yeni spec yazıldı, `playwright test --list` 21 dosya / 57 test tanıyor. Çalıştırma kullanıcı elinde.

## Güncellenen Dosyalar

| Dosya | Değişiklik |
| ----- | ---------- |
| `docs/.../README.md` | qa-catalog tracker satırı ✅, toplam 11/11 altyapı tamam, Progress Log'a S26b satırı |

## Oluşturulan Dosyalar

| Dosya | Açıklama |
| ----- | -------- |
| `implementation_reports/session-26b-post-cleanup.md` | Bu dosya |

## Doğrulama

- [x] qa-catalog node script → 312 entry, 0 orphan
- [x] Legacy/mop class kullanım spot-check → 5/7 class hâlâ kullanımda
- [x] Build yeşil (değişiklik yok)
- [x] Tests yeşil (değişiklik yok)

## Parity Tracker Güncellemesi

| Satır | Eski durum | Yeni durum |
|---|---|---|
| qa-catalog.json sıfırla + yeniden yaz | ⬜ Bekliyor | ✅ Tamamlandı (312 entry, 0 orphan) |

Toplam altyapı: **11 / 11 task tamam** (dark mode tokenize opsiyonel, atlandı).

## Sonraki Adım

Planla ilgili yeni bir oturum yok. Eğer kullanıcı isterse:

1. **CSS audit sprinti** — legacy/mop dosyalarını per-class temizle
2. **Dark mode tokenize sprinti** — variables.css dominant-token refactor
3. **E2E çalıştırma** — `npm run e2e`, flaky spec'leri raporla
4. **Coverage bumping** — admin/auth/jury integration testleri

Hepsi bağımsız iş, plan dışı backlog'a taşınır.
