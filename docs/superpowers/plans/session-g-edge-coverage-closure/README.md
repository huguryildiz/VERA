# Session G — Edge Function Coverage Closure

**Tarih:** 2026-04-25
**Status:** Planlandı, başlatılmadı
**Ön koşul:** Session D P3-Deno tamamlandı (8 fonksiyon, harness kuruldu) · Session F E4 (8 kritik fonksiyon) plan aşamasında

**Önceki:**

- Session D — `../session-d-unit-test-quality-audit/P3-deno-edge-coverage-plan.md` (harness)
- Session F E4 — `../session-f-test-gap-closure/prompts/E4-edge-functions.md` (8 kritik için prompt)

---

## Motivasyon

Edge fonksiyon kapsamı: **8/21 (%38)**. 13 fonksiyon hiç test edilmiyor. Session F E4 sadece 8 "kritik" fonksiyonu hedefliyordu; 5 mail şablonu **bilinçli atlanmıştı** ("düşük değer"). Bu plan o kararı geri alıp **13/13 closure** hedefliyor.

**Sebep:** Mail şablonları "düşük değer" gibi görünür ama:

- Yanlış adrese mail giderse **PII sızıntısı** (özellikle PIN, recovery link, audit raporu)
- `notify-juror` 340 LOC, sessiz pattern hatası tüm bildirimleri durdurabilir
- Resend API failure path'i ve audit-on-failure davranışı (request-pin-reset'teki gibi) test edilmiyor
- Single-tenant'tan multi-tenant'a geçiş (`Project Vision`) sırasında mail logic'i çoğalacak — şimdi koruma yoksa sonra çok geç

**Honest take:** "8/13 long-tail" satır okumayı zorlaştırıyor. **13/13** ya da **belgeli closure** istiyoruz. Smoke-only mail şablonlarına da minimum 3 test (auth gate + body validation + Resend API contract) yetiyor.

---

## Kapsam — 13 fonksiyon, 3 grup

### Grup 1 — Critical business logic (5 fonksiyon)

Bu grup Session F E4 ile aynı kapsam, **aynı prompt'u devral**:

| Fonksiyon | LOC | Risk |
|---|---|---|
| `on-auth-event` | 163 | Auth event routing, tenant setup; yanlış davranış = onboarding kırılır |
| `request-score-edit` | 364 | Score edit izin gate'i + tenant boundary; sızıntı = data integrity |
| `send-export-report` | 345 | Tenant isolation + size limit; yanlış org → PII sızıntısı |
| `auto-backup` | 209 | Cron tetikli, service role gate; sessiz fail = backup yok |
| `receive-email` | 116 | Inbound routing; yanlış parse = mail loop |

### Grup 2 — Critical infrastructure (3 fonksiyon)

| Fonksiyon | LOC | Risk |
|---|---|---|
| `notify-maintenance` | 402 | Queue delivery, en büyük dosya; failure = tüm sysadmin bildirim sessizliği |
| `password-reset-email` | 175 | Token + rate limit; bypass edilirse = account takeover vector |
| `email-verification-send` | 194 | Verification token lifecycle; bypass = tenant verification kırılır |

### Grup 3 — Mail şablonları (5 fonksiyon, "long-tail")

Session F E4'te atlanmıştı. Bu plan **eklemiyor değil, kapatıyor**. Her biri için **minimum 3 test**:

| Fonksiyon | LOC | Minimum kapsam |
|---|---|---|
| `notify-juror` | 340 | auth gate, body validation, Resend success/fail |
| `send-juror-pin-email` | 259 | tenant boundary, PIN body var mı, Resend contract |
| `send-entry-token-email` | 253 | token format, expiry header, Resend contract |
| `password-changed-notify` | 206 | event-trigger gate, body shape, Resend contract |
| `notify-unlock-request` | 272 | severity-based recipient routing, Resend contract |

**Toplam:** 13 fonksiyon · ~70-80 yeni Deno test · ~2-3 günlük iş paralel.

---

## Tasarım ilkeleri

1. **Harness reuse** — `supabase/functions/_test/{harness,mock-supabase}.ts` zaten kurulu; yeni harness yazma
2. **`captureHandler(modulePath)` pattern** — mevcut 8 testin uyguladığı `Deno.serve(handler)` capture örüntüsü; her yeni testi aynı pattern'e oturt
3. **Standart 5 senaryo / fonksiyon** (kritik gruplar):
   - OPTIONS → 200 + CORS
   - Eksik/geçersiz JWT → 401
   - Yetkisiz rol → 403 (varsa)
   - Body validation → 400
   - Happy path → 200 + beklenen response shape
   - DB error → 500 propagation
   - (varsa) Resend API failure → audit-on-failure + 200/500 contract
4. **Mail şablonu grubu için 3 senaryo:**
   - auth gate (eksik token → 401, yanlış role → 403)
   - body validation (eksik field → 400)
   - Resend API success + failure response (sent flag)
5. **Audit assertion** — Session D'nin keşfettiği `_audit_write` fail-closed garantisi (örn. `log-export-event`) hangi fonksiyonlarda var, test et
6. **`qa-catalog.json` her test için entry** — namespace `edge.real.<fn-slug>.<NN>`
7. **Source dosyalara dokunma** — sadece `_test/` altına yaz; handler export edilmiyorsa Known Gap olarak belge ve **skip etme — fonksiyonu Deno.serve capture ile çağır**
8. **Deliberately-break zorunlu** — 5 fonksiyon başına en az 1 test'i kasıtlı kır (payload tip değiştir, mock RPC error döndür) → FAIL olduğunu kanıtla

---

## Sprint planı

### G1 — Critical business logic (5 fonksiyon)

**Devralma:** Session F `prompts/E4-edge-functions.md` 8 fonksiyonun ilk 5'i (mail olmayanlar). O prompt'u **olduğu gibi yürüt**, çıktıyı bu plana al.

**Hedef:** 5 fonksiyon × ~6 test = **~30 test**

**Çıktı dosyaları:**

- `supabase/functions/_test/on-auth-event.test.ts`
- `supabase/functions/_test/request-score-edit.test.ts`
- `supabase/functions/_test/send-export-report.test.ts`
- `supabase/functions/_test/auto-backup.test.ts`
- `supabase/functions/_test/receive-email.test.ts`

**Exit:** `npm run test:edge` 0 fail; 30+ yeni test green.

### G2 — Critical infrastructure (3 fonksiyon)

**Hedef:** 3 fonksiyon × ~7 test = **~21 test**

**Çıktı dosyaları:**

- `supabase/functions/_test/notify-maintenance.test.ts`
- `supabase/functions/_test/password-reset-email.test.ts`
- `supabase/functions/_test/email-verification-send.test.ts`

**Özel dikkat:**

- `password-reset-email` — rate limit logic'i mock'la; çift istek aralığı kontrolü
- `email-verification-send` — token lifecycle: generate → set in DB → email
- `notify-maintenance` — 402 LOC, en büyük; queue priority + recipient deduplication

**Exit:** `npm run test:edge` 0 fail; 21+ yeni test green; deliberately-break kanıtı.

### G3 — Mail şablonları (5 fonksiyon)

**Hedef:** 5 fonksiyon × 3 test = **~15 test** (minimum smoke)

**Çıktı dosyaları:**

- `supabase/functions/_test/notify-juror.test.ts`
- `supabase/functions/_test/send-juror-pin-email.test.ts`
- `supabase/functions/_test/send-entry-token-email.test.ts`
- `supabase/functions/_test/password-changed-notify.test.ts`
- `supabase/functions/_test/notify-unlock-request.test.ts`

**Pattern (her fonksiyon için):**

```ts
test("X — eksik token → 401");
test("X — body validation: eksik <field> → 400");
test("X — Resend API success → sent=true");
test("X — Resend API non-2xx → sent=false, error populated, hâlâ 200");
```

**Sebep ki minimum:** Bu fonksiyonlar şablon ağırlıklı; iş mantıkları az. Ama auth + Resend contract test edilmezse PII sızıntısı veya sessiz fail riski hâlâ var.

**Exit:** `npm run test:edge` 0 fail; 15+ yeni test green.

---

## Paralel pencere dağılımı

```
Window 1: G1 (Sonnet)  — pattern net, mekanik, ~3 saat
Window 2: G2 (Sonnet)  — biraz daha karmaşık (rate limit, lifecycle), ~2.5 saat
Window 3: G3 (Sonnet)  — pure pattern repeat, ~1.5 saat
```

**Çakışma:** Yok. Her sprint farklı `_test/*.test.ts` dosyalarına yazıyor. `qa-catalog.json` çakışması var (3 sprint de ekliyor) — pencere kapatma sırasında merge.

**Toplam paralel takvim:** ~3.5 saat.

---

## Hedef metrikler

| Metrik | Şu an | Session G sonu |
|---|---|---|
| Edge fonksiyon kapsamı | 8/21 (%38) | **21/21 (%100)** |
| Deno test sayısı | 82 | ~145-160 |
| Mail fonksiyonu kapsamı | 0/5 | 5/5 (smoke) |
| Critical infra kapsamı | 0/3 | 3/3 (deep) |
| Critical business kapsamı | 0/5 | 5/5 (deep) |
| `edge.real.*` qa-catalog entry | ~50 | ~110-130 |

---

## Verification

**Her sprint sonunda:**

1. `npm run test:edge` — full Deno suite green
2. Yeni testlerin her biri için en az 1 deliberately-break commit'siz kanıt
3. `qa-catalog.json` entry sayısı / yeni test sayısı eşleşmesi (1:1)
4. Vitest regresyonu yok: `npm test -- --run` 234 dosya, 917+ test pass

**Suite-wide (G3 sonu):**

1. `npm run test:edge` 0 fail, 145+ test
2. `find supabase/functions -name "index.ts" -not -path "*/_*" | wc -l` = 21
3. `find supabase/functions/_test -name "*.test.ts" | wc -l` = 21 (her fonksiyon için bir test dosyası)
4. Coverage manuel rapor:

   ```bash
   for fn in $(ls supabase/functions/ | grep -v "^_" | grep -v "deno\."); do
     test -f supabase/functions/_test/${fn}.test.ts && echo "✅ $fn" || echo "❌ $fn"
   done
   ```

   Tüm satırlar ✅ olmalı.

---

## Risk ve trade-off

1. **Mail şablonu testleri "smoke" gibi görünebilir** — ama Session D denetimi göstermişti ki "smoke" testler bile auth gate ve API contract'ı yakalarsa değer üretir. Kriter: gerçek failure mode'u (Resend 401, Resend 429, PII leak) test eden senaryo varsa smoke değil.
2. **Resend API mock realism** — `request-pin-reset` testi pattern göstermiş: `stubFetch()` ile Resend success + non-2xx + missing API key path'leri. Bu pattern'i devral.
3. **Handler export edilmiyor** — Mevcut 8 fonksiyon `Deno.serve(handler)` top-level çağrısı yapıyor; `captureHandler(modulePath)` import sırasında handler'ı yakalıyor. **Source'a dokunma**.
4. **`auto-backup` cron auth path'i** — Service role bearer kabul ediyor; super_admin JWT path'i de var. İki yolu da test et.
5. **`receive-email` inbound routing** — Resend webhook olabilir; signature verification varsa mock'la, yoksa "no signature → 401" senaryosu yaz.
6. **`notify-maintenance` 402 LOC** — En büyük dosya; iş mantığı complex olabilir. Önce `index.ts` oku, sonra test tasarla; standart 5 senaryo yetmezse 8-10 test yaz.

---

## İlgili dokümanlar

- Harness: `supabase/functions/_test/harness.ts` + `mock-supabase.ts`
- Pattern referansı: `supabase/functions/log-export-event/index.test.ts` (audit-on-failure örneği), `supabase/functions/request-pin-reset/index.test.ts` (Resend API mock örneği)
- Session D P3 plan: `../session-d-unit-test-quality-audit/P3-deno-edge-coverage-plan.md`
- Session F E4 prompt (devralınacak): `../session-f-test-gap-closure/prompts/E4-edge-functions.md`

---

## Sonraki adım

1. ✅ Tek combined prompt yazıldı: `prompts/G-all-edge-functions.md` (13 fonksiyon, üç grup tek dosyada)
2. (User onayı) Promptu yürüt — paralel istenirse 3 worktree'ye böl (Grup A / B / C)
3. Sprint sonu `implementation_reports/G-all-edge-functions.md` yaz
4. Session F E4 prompt'u **superseded** — Session G bu işi devraldı; F E4'e deprecation header eklenmeli

---

## Open questions

1. **Mail şablonlarında PII assertion derinliği** — Mail body'sini parse edip "PIN değeri var mı" kontrol etmek anlamlı mı, yoksa sadece "Resend'e doğru `to` ile çağrıldı" yetiyor mu? **Öneri:** Resend payload assertion (to, subject, contains-key); body parse YAGNI.
2. **`auto-backup` data integrity** — Backup JSON'unun shape'i test edilmeli mi yoksa "fonksiyon çağrıldı, 200 döndü" yetiyor mu? **Öneri:** En az 1 test backup payload'unun beklenen shape'ini (organizations, projects, jurors keys) doğrulasın.
3. **Edge function source kodunda `Deno.serve` yoksa** — bazı fonksiyonlar `serve()` import edip kullanıyor olabilir. `captureHandler` pattern'i bu durumda çalışır mı? **Aksiyon:** G1 başlamadan tek bir fonksiyon (`receive-email`) test edilip pattern doğrulansın; çalışmazsa adapter yaz.
