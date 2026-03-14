# TEDU Capstone Portal

TED Üniversitesi EE 491/492 bitirme projesi jüri değerlendirme uygulaması. Jüriler, poster günü projeleri 4 kriter üzerinden puanlar; yöneticiler dönem, proje ve jüri yönetimini bu panel üzerinden yapar.

**Kullanım:** Yılda 2–3 gün (poster günü + hazırlık).

---

## Teknoloji

| Katman | Araç |
|--------|------|
| Frontend | React 18 + Vite |
| Backend | Supabase (PostgreSQL + RPC + RLS) |
| Auth | Admin: RPC şifresi · Jüri: 4 haneli PIN |
| Test | Vitest (unit) · Playwright (E2E) |
| Export | xlsx-js-style |
| DnD | @dnd-kit |

---

## Kurulum

```bash
npm install
```

`.env.local` dosyası oluştur:

```env
VITE_SUPABASE_URL=https://<proje-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_RPC_SECRET=<vault-rpc_secret-değeri>
```

Supabase Vault'ta `rpc_secret` adında bir secret oluştur ve değerini `VITE_RPC_SECRET` ile eşleştir.

### Veritabanı

```bash
# Supabase SQL Editor'da çalıştır:
sql/000_bootstrap.sql
```

İlk kurulumda şifreleri bootstrap et (admin paneline girince Security sekmesinden de yapılabilir):

```sql
SELECT rpc_admin_bootstrap_password('güçlü-admin-şifresi');
SELECT rpc_admin_bootstrap_delete_password('silme-şifresi', 'admin-şifresi');
SELECT rpc_admin_bootstrap_backup_password('yedek-şifresi', 'admin-şifresi');
```

---

## Geliştirme

```bash
npm run dev          # dev server (localhost:5173)
npm test             # unit testler (watch)
npm test -- --run    # unit testler (tek seferlik)
npm run e2e          # Playwright E2E testleri
npm run build        # production build
```

E2E testleri için `.env.local`'a test jüri bilgileri ekle:

```env
E2E_JUROR_NAME=Test Juror
E2E_JUROR_DEPT=EE
E2E_JUROR_PIN=1234
```

---

## Proje Yapısı

```text
src/
├── App.jsx                 # Kök — sayfa yönlendirme (home / jury / admin)
├── AdminPanel.jsx          # Admin paneli kök bileşeni
├── JuryForm.jsx            # Jüri akışı kök bileşeni
├── config.js               # Kriterler, MÜDEK çıktıları (tek kaynak)
├── admin/                  # Admin sekmeleri ve hook'ları
├── jury/                   # Jüri akışı (5 adım)
│   ├── useJuryState.js     # Tüm jüri akışı state makinesi
│   ├── InfoStep.jsx        # Kimlik girişi
│   ├── PinStep.jsx         # PIN doğrulama
│   ├── EvalStep.jsx        # Değerlendirme formu (orkestratör)
│   ├── EvalHeader.jsx      # Yapışkan başlık
│   ├── GroupStatusPanel.jsx# Durum banner'ları
│   └── ScoringGrid.jsx     # Kriter kartları + rubric
├── charts/                 # Modüler grafik bileşenleri
└── shared/
    ├── api.js              # Tüm Supabase RPC çağrıları
    └── stats.js            # İstatistik hesaplamaları
sql/
└── 000_bootstrap.sql       # Tam DB şeması, fonksiyonlar, grant'lar
```

---

## Değerlendirme Kriterleri

| Kriter | Puan |
|--------|------|
| Technical Report (Written) | 0–30 |
| Oral Presentation (Delivery) | 0–30 |
| Technical Content | 0–30 |
| Teamwork | 0–10 |
| **Toplam** | **100** |

Kriter tanımları ve MÜDEK eşleşmeleri: `src/config.js`

---

## Jüri Akışı

1. **InfoStep** — Ad ve kurum girişi
2. **PinStep** — 4 haneli PIN doğrulama
3. **EvalStep** — Tüm grupları puanla
4. **DoneStep** — Teslim onayı

Yeni jüriler ilk girişte PIN alır (PinRevealStep). Tüm DB yazmaları `src/shared/api.js` üzerinden geçer.

---

## Güvenlik

- **RLS**: Tüm tablolarda varsayılan olarak kapalı — sadece `SECURITY DEFINER` fonksiyonları erişebilir
- **Admin auth**: Her RPC çağrısında şifre parametresi (`p_admin_password`)
- **RPC secret**: `_verify_rpc_secret` — Supabase Vault'tan okunur, tüm admin RPC'lerde çalışır
- **PIN**: Bcrypt hash, 3 yanlış denemede 15 dakika kilit
- **Audit log**: Tüm kritik operasyonlar `audit_logs` tablosuna yazılır

---

## Test Durumu

```
Unit:  189/189 ✓
E2E:     5/5   ✓
```
