# VERA — Session G2: Critical Infrastructure Edge Functions (3 fonksiyon)

## Hedef

3 critical infrastructure Supabase Edge Function'ı için gerçek Deno testi yaz. Mevcut harness'i (`supabase/functions/_test/`) **olduğu gibi** kullan. `npm run test:edge` 0 fail. `qa-catalog.json` her test için entry. **Source `index.ts`'lere dokunma.**

**Bu sprint:** 3 fonksiyon × ~7 test = **~21 test**. Bu fonksiyonlar büyük ve karmaşık (en büyük 402 LOC); standart 5 senaryo yetmeyebilir, 8-10 yaz.

**Paralel sprintler:** G1 (critical business, 5 fn) + G3 (mail templates, 5 fn). Bu prompt'lar ayrı pencerelerde aynı anda çalışıyor olabilir; **çakışma yok** çünkü her sprint farklı `_test/*.test.ts` dosyalarına yazıyor.

---

## Bu sprint'in 3 fonksiyonu

| Fonksiyon | LOC | Risk · Dikkat noktası |
|---|---|---|
| `notify-maintenance` | 402 | En büyük dosya; queue priority + recipient deduplication; standart 5 senaryo yetmeyebilir, 8-10 yaz |
| `password-reset-email` | 175 | Rate limit logic'i (varsa); recovery token generation; **bypass = account takeover vector** |
| `email-verification-send` | 194 | Verification token lifecycle (generate → DB write → mail); idempotency |

**Bu sprint neden ayrı:** Rate-limit ve token lifecycle logic'i G1'in business pattern'inden farklı. Ayrı odakla yazılması kalite üretiyor.

---

## Adım 1: Harness'i ve referans testleri oku

```
supabase/functions/_test/harness.ts          ← captureHandler() pattern
supabase/functions/_test/mock-supabase.ts    ← setMockConfig + recordCall
supabase/functions/_test/import_map.json     ← module map
```

**Pattern referansı olarak iki test dosyasını oku:**

- `supabase/functions/request-pin-reset/index.test.ts` — **Resend API mock** pattern (success + non-2xx + missing API key); G2'nin 3 fonksiyonu da Resend kullanıyor
- `supabase/functions/email-verification-confirm/index.test.ts` — token lifecycle pattern (generate → confirm); `email-verification-send`'in eşleniği

Bu iki dosyanın yapısını kafaya yerleştir; tüm yeni testler aynı yapıyı izleyecek.

**Resend mock pattern (devral):**

```ts
const fetchCalls: { url: string; init: RequestInit }[] = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  fetchCalls.push({ url: url.toString(), init: init! });
  return new Response(JSON.stringify({ id: "msg_123" }), { status: 200 });
};
try {
  // ... test body ...
  assertEquals(fetchCalls[0].url, "https://api.resend.com/emails");
  const payload = JSON.parse(fetchCalls[0].init.body as string);
  assertEquals(payload.to, ["expected@email"]);
} finally {
  globalThis.fetch = originalFetch;
}
```

**Kritik kuralı bilinçle uygula:**

- Test, edge function'ın `Deno.serve(handler)` çağrısını intercept ederek handler'ı yakalar (`captureHandler(modulePath)`).
- Handler `serve()` import etmezse adapt etmek için **source'a dokunma yok** — harness adapter ekle veya Known Gap olarak belgele.
- `src/shared/api/edge/__tests__/edgeFunctions.test.js` referans değildir.

---

## Adım 2: Her fonksiyonun source'unu oku

Test yazmadan önce her `index.ts` dosyasını oku ve şu sorulara cevap çıkar:

1. **Auth nasıl kontrol ediliyor?** (Bearer token? `auth.getUser`? service role bypass?)
2. **Hangi RPC / table çağrıları yapıyor?**
3. **Rate limit nasıl uygulanıyor?** (Time-window check? DB column? In-memory?)
4. **Token lifecycle:** generate → store → send. Her aşamada hangi state mutation'ı oluyor?
5. **Resend payload:** to / subject / template — hangi alanları assert edilmeli?
6. **Audit log yazıyor mu?** (varsa fail-closed mu, fail-soft mu?)

Bu cevaplar olmadan test yazma — yoksa "happy path geçti" tipi sahte testler olur.

---

## Adım 3: 3 test dosyası yaz

**Çıktı:**

- `supabase/functions/_test/notify-maintenance.test.ts` — **8-10 test** (en büyük dosya; queue + dedup logic)
- `supabase/functions/_test/password-reset-email.test.ts` — **7 test** (rate limit kritik)
- `supabase/functions/_test/email-verification-send.test.ts` — **7 test** (token lifecycle)

**Standart pattern (her dosya için adapt et):**

```ts
Deno.test("<fn> — OPTIONS returns 200 with CORS", async () => { /* ... */ });
Deno.test("<fn> — non-POST returns 405", async () => { /* ... */ });
Deno.test("<fn> — missing Authorization → 401", async () => { /* ... */ });
Deno.test("<fn> — invalid JWT → 401", async () => { /* ... */ });
Deno.test("<fn> — missing required field <X> → 400", async () => { /* ... */ });
Deno.test("<fn> — happy path → 200 + expected response", async () => { /* ... */ });
Deno.test("<fn> — Resend success → sent=true, fetch called with expected payload", async () => { /* ... */ });
Deno.test("<fn> — Resend non-2xx → sent=false, error populated, still 200", async () => { /* ... */ });
Deno.test("<fn> — missing RESEND_API_KEY → sent=false, error='RESEND_API_KEY not configured'", async () => { /* ... */ });
```

**Bu sprint için özel testler:**

### `notify-maintenance` (8-10 test)

- `Deno.test("...— queue priority: critical messages sent before info")` — eğer kod queue içeriyorsa
- `Deno.test("...— recipient deduplication: same email twice → fetch called once")`
- `Deno.test("...— super_admin role required → tenant_admin returns 403")`
- `Deno.test("...— RPC failure (e.g. get_maintenance_recipients) → 500")`
- Standart auth/CORS/Resend testleri

### `password-reset-email` (7 test)

- **`Deno.test("...— rate limit: second request within window → 429")`** — bu testi öncelikle yaz; rate limit kritik
- `Deno.test("...— rate limit: request after window expires → 200")`
- `Deno.test("...— recovery token generated and stored in DB before email sent")` — `adminGenerateLink` mock'unu doğrula
- `Deno.test("...— unknown email → 200 (no enumeration leak)")` — security pattern: kullanıcı yoksa da 200 dön
- Standart Resend success/fail testleri

### `email-verification-send` (7 test)

- `Deno.test("...— token written to DB before email sent (transactional order)")`
- `Deno.test("...— idempotency: same email twice → second call updates token, doesn't duplicate")`
- `Deno.test("...— expired token → new token generated")`
- Standart auth/Resend testleri

---

## Adım 4: Deliberately-break (zorunlu)

Bu sprint için **2 test'i kasıtlı kır** ve FAIL olduğunu kanıtla:

1. `password-reset-email` testinde rate limit guard'ı kaldır (mock'ta time-window check'i bypass et) → "ikinci istek 429" testi FAIL etmeli
2. `email-verification-send` testinde DB write'ı no-op yap (mock'ta `tables.user_verification.insert` boş bırak) → "token written to DB before email" testi FAIL etmeli

Bu kanıtları implementation report'a yaz; testler **gerçekten** koruyor olmalı.

---

## Adım 5: `qa-catalog.json` güncelle

Her yeni Deno testi için `src/test/qa-catalog.json` içine entry ekle. Namespace: `edge.real.<fn-slug>.<NN>`.

Örnek:

```json
{
  "id": "edge.real.password-reset-email.03",
  "story": "rate limit — second request within time window returns 429",
  "area": "edge.password-reset-email",
  "suite": "deno"
}
```

Her test için 1:1 entry. ~21 yeni entry.

**Çakışma uyarısı:** G1 ve G3 paralel çalışıyorsa `qa-catalog.json`'a aynı anda yazıyor olabiliriz. **Sadece kendi namespace'in (`edge.real.notify-maintenance.*`, `edge.real.password-reset-email.*`, `edge.real.email-verification-send.*`) içine yaz.** Başka entry'lere dokunma.

---

## Adım 6: Çalıştır + doğrula

```bash
npm run test:edge      # Deno — bu sprint testleri 0 fail; ~21+ yeni test
npm test -- --run      # Vitest — 234 dosya, 917+ test, 0 regression
```

Coverage doğrulama (bu sprint'ten sonra):

```bash
for fn in notify-maintenance password-reset-email email-verification-send; do
  test -f supabase/functions/_test/${fn}.test.ts && echo "✅ $fn" || echo "❌ $fn"
done
```

Tüm 3 satır ✅ olmalı.

---

## Adım 7: Implementation report yaz

`docs/superpowers/plans/session-g-edge-coverage-closure/implementation_reports/G2-critical-infra.md` dosyasını yaz. İçerik:

- Her fonksiyon için: test sayısı, kapsanan senaryolar, deliberately-break kanıtı
- Rate limit logic'i nasıl test edildi (time mock, in-memory state, DB column?)
- Token lifecycle test edilen aşamalar (generate / store / send / expire)
- Atlanan / Known Gap olarak belgelenen fonksiyon (varsa) — sebep + ne gerekir
- Final test sayısı: "before 82 → after N"
- `npm run test:edge` ve `npm test -- --run` son çıktıları

---

## Kurallar (sıkı)

- **NEVER** modify source `index.ts` files — only `_test/*.test.ts` ve `qa-catalog.json`
- **NEVER** commit
- **NEVER** use `vi.mock()` — bu Deno değil, vitest
- Rate limit logic'i karmaşıksa (örn. Redis veya pg `pg_advisory_lock`) Known Gap belge — ama önce mock'la denenmeli
- ID namespace: `edge.real.*` — `edge.contract.*` entry'lere dokunma
- Tüm yeni testler **işlevsel** olmalı: render-smoke / tautology yok

---

## Beklenen sonuç (bu sprint)

| Metrik | Önce | Sonra |
|---|---|---|
| Edge fonksiyon kapsamı | 8/21 (%38) → 13/21 (G1) | **16/21 (%76)** |
| Deno test sayısı | 82 → 112 (G1) | **~133** |
| Critical infra kapsamı | 0/3 | **3/3 (deep)** |
| `edge.real.*` qa-catalog entry | ~50 → ~80 (G1) | **~101** |

> Not: G1, G2, G3 paralel çalışıyorsa "Önce" kolonu G1+G3'ün de katkılarını içeriyor olacak; her sprint kendi delta'sını implementation report'a yazsın.
