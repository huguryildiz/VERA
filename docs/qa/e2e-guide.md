# TEDU VERA — E2E Test Rehberi

Playwright tabanlı uçtan uca testler. Gerçek tarayıcıda, gerçek Supabase demo veritabanına karşı çalışır.

---

## Kurulum

Playwright zaten `package.json`'da tanımlı. İlk kez çalıştırmadan önce browser binary'lerini indir:

```bash
npx playwright install
```

---

## Komutlar

```bash
# Tüm E2E testleri çalıştır (headless)
npm run e2e

# HTML raporu aç (son koşumun sonuçları)
npm run e2e:report

# Canlı UI ile çalıştır — her adımı izle
npx playwright test --ui

# Belirli bir dosyayı çalıştır
npx playwright test e2e/jury-flow.spec.ts

# Başarısız olan testleri tekrar çalıştır
npx playwright test --last-failed

# Headed (tarayıcı görünür) modda çalıştır
npx playwright test --headed
```

---

## Env Değişkenleri

Testlerin bir kısmı gerçek kimlik bilgisi gerektirir. `.env.local` dosyasına ekle:

```env
# Admin testleri için zorunlu
E2E_ADMIN_PASSWORD=your_admin_password

# Jury full-flow testi için zorunlu (jury.e2e.01)
E2E_JUROR_NAME=Test Juror
E2E_JUROR_DEPT=EE
E2E_JUROR_PIN=1234
E2E_SEMESTER_NAME=2026 Spring

# Lock testi için zorunlu (jury.e2e.02) — semester DB'de kilitli olmalı
E2E_LOCKED=true
```

Env var eksikse ilgili test otomatik olarak **skip** olur — CI'da hata vermez.

---

## Test Dosyaları

| Dosya | Test ID | Senaryo |
| --- | --- | --- |
| `e2e/jury-flow.spec.ts` | — | InfoStep UI smoke testleri |
| `e2e/jury-flow.spec.ts` | `jury.e2e.01` | Jüri identity → PIN → semester → eval ekranı |
| `e2e/jury-lock.spec.ts` | `jury.e2e.02` | Kilitli semester → banner görünür, inputlar disabled |
| `e2e/admin-login.spec.ts` | — | Admin panel login smoke |
| `e2e/admin-results.spec.ts` | `admin.e2e.02` | Admin → Scores → Rankings tab yüklenir |
| `e2e/admin-export.spec.ts` | `admin.e2e.03` | Rankings → Excel butonu → `.xlsx` indirilir |
| `e2e/admin-import.spec.ts` | `admin.e2e.01` | Settings → Projects → CSV import dialog açılır |

---

## HTML Raporu

`npm run e2e` çalıştırdıktan sonra:

```bash
npm run e2e:report
```

Tarayıcıda `http://localhost:9323` açılır. Burada görebileceklerin:

- Her testin **pass / fail / skip** durumu ve süresi
- **Başarısız testlerde screenshot** — tam olarak hangi anda patladığı
- **Video kaydı** — tüm test boyunca ekran kaydı
- **Trace viewer** — adım adım hangi element'e tıklandı, hangi assertion bekleniyordu

Trace viewer'ı açmak için başarısız bir testin üstüne tıkla → `Traces` sekmesi.

---

## Skip Mantığı

Testler iki kategoride:

**Her zaman çalışır** (env var gerektirmez):
- InfoStep UI testleri — saf HTML etkileşimi
- Admin login — `E2E_ADMIN_PASSWORD` varsa

**Credentials gated** (env var yoksa skip):
- `jury.e2e.01` — `E2E_JUROR_PIN` + `E2E_SEMESTER_NAME` gerekir
- `jury.e2e.02` — ayrıca `E2E_LOCKED=true` gerekir

CI ortamında sadece `E2E_ADMIN_PASSWORD` secret'ı tanımlanmışsa admin testleri çalışır, jury flow testleri skip olur — bu beklenen davranıştır.

---

## Playwright Config

`playwright.config.ts` ayarları:

| Ayar | Değer |
| --- | --- |
| Browser | Chromium |
| Base URL | `http://localhost:5173` (veya `E2E_BASE_URL`) |
| Timeout | 30 saniye / test |
| Retry (CI) | 2 |
| Screenshot | Sadece hata durumunda |
| Video | Hata durumunda saklanır |
| Web server | `npm run dev` otomatik başlatılır |

---

## Excel Raporları

Test sonuçlarını Excel'e aktarmak için:

```bash
# Sadece E2E sonuçları → test-results/e2e-report-YYYY-MM-DD_HHMM.xlsx
npm run e2e:excel

# Sadece unit test sonuçları → test-results/test-report-YYYY-MM-DD_HHMM.xlsx
npm run test:report && node scripts/generate-test-report.cjs

# İkisi birden — tek komutla her şeyi üret
npm run report:all
```

`npm run e2e:excel` çalıştırmadan önce `npm run e2e` koşulmuş olmalı — JSON çıktısı `test-results/playwright-results.json` dosyasından okunur.

Excel dosyaları `test-results/` klasörüne düşer:

| Dosya | İçerik |
| --- | --- |
| `test-results/e2e-report-*.xlsx` | E2E: Summary + tüm testler (status, süre, hata) |
| `test-results/test-report-*.xlsx` | Unit: Summary + modül bazlı + QA coverage |

---

## Hızlı Kontrol — Poster Günü Öncesi

```bash
# 1. Unit testler — tümü geçmeli
npm test -- --run

# 2. E2E — admin testleri + UI smoke
npm run e2e

# 3. Raporu aç ve kontrol et
npm run e2e:report

# 4. (Opsiyonel) Excel çıktısı al
npm run report:all
```

Bu komutlar tüm otomatik test katmanını kapsar.
