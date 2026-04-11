# Floating UI Layering — Design Spec

**Date:** 2026-04-11  
**Scope:** Global dropdown/popover/menu/select/tooltip katmanlama düzeltmesi  
**Status:** Approved, ready for implementation

---

## Problem

VERA'daki açılır paneller (dropdown, popover, select, filter menu) parent container'ın `overflow` ve stacking context kısıtlarına takılıyor. Örnek: "Security & Sessions" kartındaki status dropdown, alttaki kartın altında kalıyor. Bu tek bir ekrana özgü değil; DOM akışında `position: absolute` kullanan tüm floating bileşenler bu riske açık.

**Root cause kategorileri:**

| # | Kategori | Detay |
|---|----------|-------|
| 1 | Portal eksikliği | CustomSelect, GroupedCombobox, TenantSearchDropdown, filter menüler DOM akışında absolute — parent `overflow:hidden` veya `transform` bağlamında kesiliyor |
| 2 | Stacking context tetikleyiciler | `backdrop-filter:blur()` ve `transform:translateX()` on drawer/card → yeni stacking context → lokal z-index sıfırlanıyor |
| 3 | Z-index dağınıklığı | 6 CSS dosyasına yayılmış değerler (10, 50, 60, 70, 120, 200, 300, 301, 9999) — merkezi ölçek yok, 301→9999 gap |

---

## Çözüm Stratejisi

**Custom `useFloating` hook + Portal + CSS z-index ölçeği.**

- `@base-ui/react` stilsel bağımsızlık için kullanılmıyor; mevcut Tooltip.jsx ve UserAvatarMenu.jsx'teki kanıtlı portal pattern genelleştiriliyor.
- Her floating panel `document.body`'ye portal edilir — stacking context ve overflow sorunu kökten çözülür.
- Tüm z-index değerleri CSS custom property'lere taşınır, hardcode kalmaz.

---

## Z-Index Ölçeği

`src/styles/variables.css`'e eklenir:

```css
/* ── Floating UI Z-Index Scale ── */
--z-base:           1;
--z-sticky:        50;   /* sidebar, demo banner, sticky headers */
--z-sidebar-menu:  70;   /* sidebar tenant/account popup menus */
--z-dropdown:     200;   /* dropdown, popover, select panel, filter menu */
--z-tooltip:      250;   /* tooltip — her zaman dropdown üstünde */
--z-modal-overlay:300;   /* drawer/modal karartma katmanı */
--z-modal:        310;   /* drawer/modal içeriği */
--z-modal-dropdown:350;  /* modal/drawer içindeki dropdown */
--z-toast:        400;   /* toast, kritik alert */
```

**Eski değerlerin güncelleneceği CSS dosyaları:**
- `src/styles/layout.css` — sidebar (50 → `--z-sticky`, 60/70 → `--z-sidebar-menu`)
- `src/styles/components.css` — filter-dropdown-menu (120 → `--z-dropdown`), premium tooltip / avatar menu (9999 → `--z-tooltip` veya `--z-dropdown`)
- `src/styles/modals.css` — overlay (300 → `--z-modal-overlay`), modal (301 → `--z-modal`)
- `src/styles/drawers.css` — overlay (300 → `--z-modal-overlay`), drawer (301 → `--z-modal`)
- `src/styles/auth.css` — grouped-cb-dropdown (50 → `--z-dropdown`)
- `src/styles/charts.css` — recharts-tooltip-wrapper (10 → `--z-base`)

---

## useFloating Hook

**Dosya:** `src/shared/hooks/useFloating.js`

UserAvatarMenu.jsx'teki positioning mantığı genelleştirilerek çıkarılır. Hook, tüm DOM-bound floating bileşenlerin paylaştığı tek kaynak olur.

### API

```js
const { floatingRef, floatingStyle, updatePosition } = useFloating({
  triggerRef,      // RefObject — açan öğe
  isOpen,          // boolean — dışarıdan kontrol
  onClose,         // () => void — kapatma callback'i
  placement,       // 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' — default: 'bottom-start'
  offset,          // number — trigger'dan mesafe px, default: 4
  closeOnScroll,   // boolean — scroll'da kapat, default: true
})
```

### Otomatik Davranışlar

- **Portal:** `createPortal(panel, document.body)` — caller render'da kullanır
- **Positioning:** `getBoundingClientRect()` ile trigger konumu → `position: fixed; top; left` hesabı
- **Collision flip:** Viewport sağına/altına taşarsa placement otomatik ters döner
- **Outside click:** `mousedown` listener — triggerRef ve floatingRef dışına tıklanırsa `onClose()`
- **Escape:** `keydown` listener — `onClose()`
- **Scroll close:** Scroll event'inde `onClose()` (closeOnScroll: true ise)
- **Resize:** `window.resize` → `updatePosition()` yeniden hesaplar
- **Cleanup:** `isOpen` false olunca tüm listener'lar temizlenir

### floatingStyle

Hook, `position: fixed; top; left; z-index: var(--z-dropdown)` içeren bir style objesi döner.  
Modal içinde kullanılıyorsa caller `zIndex: 'var(--z-modal-dropdown)'` override edebilir.

---

## Portal'a Taşınacak Bileşenler

### 1. CustomSelect.jsx

`src/shared/ui/CustomSelect.jsx` — şu an `position: relative` wrapper içinde `position: absolute` `.filter-dropdown-menu`.

**Değişiklik:**
- `triggerRef` wrapper button'a bağlanır
- `useFloating({ triggerRef, isOpen: open, onClose: () => setOpen(false) })` çağrılır
- `.filter-dropdown-menu` div'i `createPortal(..., document.body)` içine alınır, `floatingStyle` uygulanır
- Mevcut outside-click / escape useEffect'leri kaldırılır (hook halleder)
- `position: relative` wrapper kaldırılır — artık gerekli değil

### 2. GroupedCombobox.jsx

`src/shared/ui/GroupedCombobox.jsx` — `.grouped-cb-dropdown` div'i şu an `.grouped-cb-wrap` içinde.

**Değişiklik:**
- `wrapRef` yerine `triggerRef` (input-wrap veya trigger button) + `floatingRef` ayrılır
- `useFloating` entegre edilir
- `.grouped-cb-dropdown` `createPortal` ile body'ye taşınır
- Keyboard nav mantığı (scroll-into-view) `floatingRef` üzerinden çalışmaya devam eder
- Mevcut outside-click useEffect kaldırılır

### 3. TenantSearchDropdown.jsx

`src/auth/components/TenantSearchDropdown.jsx` — benzer pattern, aynı değişiklik.

### 4. Filter Dropdown Menüler (CSS-driven)

`components.css`'teki `.filter-dropdown-menu` sınıfı şu an birden fazla komponent tarafından kullanılıyor.

**Değişiklik:**
- Hangi bileşenlerin bu sınıfı doğrudan render ettiği keşfedilir
- Her biri `useFloating` + portal'a taşınır
- Sınıfın `position: absolute` tanımı `position: fixed`'a güncellenir (portal sonrası doğru davranış için)

### 5. Card/Table Action Menüleri

Keşif sırasında bulunacak diğer action menu bileşenleri aynı pattern ile taşınır.

---

## Dokunulmayan Bileşenler

| Bileşen | Durum |
|---------|-------|
| `Tooltip.jsx` | Zaten portal — sadece z-index değeri CSS variable'a güncellenir |
| `UserAvatarMenu.jsx` | Zaten portal — z-index CSS variable'a güncellenir, positioning mantığı `useFloating` hook'a taşınır (kod tekrarı kaldırılır) |
| `Modal.jsx` | z-index CSS variable'a güncellenir, render değişmez |
| `Drawer.jsx` | z-index CSS variable'a güncellenir, render değişmez |

---

## Dosya Değişikliği Özeti

| Dosya | Değişiklik |
|-------|-----------|
| `src/styles/variables.css` | `--z-*` custom property ölçeği eklenir |
| `src/styles/layout.css` | Hardcode z-index → `var(--z-*)` |
| `src/styles/components.css` | Hardcode z-index → `var(--z-*)`; `.filter-dropdown-menu` → `position: fixed` |
| `src/styles/modals.css` | Hardcode z-index → `var(--z-*)` |
| `src/styles/drawers.css` | Hardcode z-index → `var(--z-*)` |
| `src/styles/auth.css` | Hardcode z-index → `var(--z-*)` |
| `src/styles/charts.css` | Hardcode z-index → `var(--z-*)` |
| `src/shared/hooks/useFloating.js` | **YENİ** — shared hook |
| `src/shared/ui/CustomSelect.jsx` | Portal + useFloating entegrasyonu |
| `src/shared/ui/GroupedCombobox.jsx` | Portal + useFloating entegrasyonu |
| `src/auth/components/TenantSearchDropdown.jsx` | Portal + useFloating entegrasyonu |
| Keşifle bulunan action/filter menüler | Portal + useFloating entegrasyonu |

---

## Kabul Kriterleri

- [ ] Açılır panel komşu kartların altında kalmıyor
- [ ] Parent `overflow:hidden` tarafından clip olmuyor
- [ ] Drawer/modal içindeki dropdown modal üstünde açılıyor (z-index 350 > 310)
- [ ] Viewport kenarına yakın açılırken doğru yöne flip yapıyor
- [ ] Masaüstü ve mobilde (portrait/landscape) doğru çalışıyor
- [ ] Dark mode görsel dili bozulmuyor
- [ ] Mevcut modal/drawer/toast katman sırası korunuyor
- [ ] Hiçbir yerde hardcode `z-index: 9999` kalmıyor

---

## Manuel Test Checklist

1. Admin overview → herhangi bir CustomSelect'e tıkla → panel komşu kartın üstünde açılsın
2. Drawer içindeki bir CustomSelect'e tıkla → panel drawer üstünde açılsın
3. Sayfayı scroll et, dropdown açıkken scroll yap → dropdown kapansın
4. Viewport'un en altındaki bir trigger'ı aç → panel yukarda flip yapsın
5. Viewport'un sağ kenarındaki bir trigger'ı aç → panel sola flip yapsın
6. Mobile portrait/landscape'de filter menü → panel kartın altında kalmasın
7. Escape tuşu → dropdown kapansın
8. Toast/alert tetikle, dropdown açıkken → toast dropdown üstünde görünsün
