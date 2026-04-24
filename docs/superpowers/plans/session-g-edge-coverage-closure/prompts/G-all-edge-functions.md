# VERA — Session G: Full Edge Function Coverage Closure (13 fonksiyon)

## Hedef

13 untested Supabase Edge Function için gerçek Deno testi yaz. Mevcut harness'i (`supabase/functions/_test/`) **olduğu gibi** kullan. `npm run test:edge` 0 fail. `qa-catalog.json` her test için entry. **Source `index.ts`'lere dokunma.**

**Kapsam:** Bu prompt **tüm 13 untested fonksiyonu** kapsıyor — Session F E4'ün 8 kritik kapsamı + bilinçli atlanan 5 mail şablonu. Hedef: 21/21 (%100) gerçek Deno coverage.

---

## Bağlam

VERA çoklu kiracılı (multi-tenant) bir akademik jüri platformu. 21 Edge Function'ı var; sadece 8'i test edilmiş. Bu prompt'un yürütülmesi sonunda 21/21 olacak. Pattern Session D P3-Deno (8 fonksiyon) tarafından kuruldu; sen sadece pattern'i tekrar uygulayacaksın.

**Kritik kuralı bilinçle uygula:**

- **Test, edge function'ın `Deno.serve(handler)` çağrısını intercept ederek handler'ı yakalar** (`captureHandler(modulePath)`).
- **Handler `serve()` import etmezse adapt etmek için source'a dokunma yok** — harness adapter ekle veya Known Gap olarak belgele.
- **`src/shared/api/edge/__tests__/edgeFunctions.test.js` referans değildir** — orada paralel re-implementation var, gerçek test yok.

---

## Adım 1: Harness'i ve mevcut testleri oku

```
supabase/functions/_test/harness.ts          ← captureHandler() pattern
supabase/functions/_test/mock-supabase.ts    ← setMockConfig + recordCall
supabase/functions/_test/import_map.json     ← module map
```

**Pattern referansı olarak iki test dosyasını oku** (en zengin pattern'ler):

- `supabase/functions/log-export-event/index.test.ts` — audit-on-failure fail-closed garantisi
- `supabase/functions/request-pin-reset/index.test.ts` — Resend API mock (success + non-2xx + missing API key)

Bu iki dosyanın yapısını kafaya yerleştir; tüm yeni testler aynı yapıyı izleyecek.

---

## Adım 2: Her fonksiyonun source'unu oku

Test yazmadan önce her fonksiyonun `index.ts` dosyasını oku ve şu 6 soruyu çıkar:

1. **Auth nasıl kontrol ediliyor?** (Bearer token? `auth.getUser`? service role bypass? webhook signature?)
2. **Hangi RPC / table çağrıları yapıyor?**
3. **Hangi response shape'ler dönüyor?** (200 + JSON? 200 + text? 204?)
4. **Hangi error path'leri var?** (400 / 401 / 403 / 404 / 500)
5. **Resend / external HTTP kullanıyor mu?** (varsa `stubFetch()` ile mock)
6. **Audit log yazıyor mu?** (varsa fail-closed mu, fail-soft mu?)

Bu cevaplar olmadan test yazma — yoksa "happy path geçti" tipi sahte testler olur.

---

## Adım 3: 13 test dosyası yaz

### Grup A — Critical business logic (5 fonksiyon, ~6 test/fonksiyon)

| Fonksiyon | LOC | Dikkat noktası |
|---|---|---|
| `on-auth-event` | 163 | Auth event router; new user → tenant setup; webhook signature varsa mock |
| `request-score-edit` | 364 | Tenant boundary; super_admin bypass; period closed olmamalı kontrol |
| `send-export-report` | 345 | Tenant isolation; org-A user, org-B export request → 403 |
| `auto-backup` | 209 | İki auth path: service role bearer (cron) + super_admin JWT (manual); backup JSON shape |
| `receive-email` | 116 | Inbound webhook; signature verification (varsa); routing logic |

**Çıktı dosyaları:**

- `supabase/functions/_test/on-auth-event.test.ts`
- `supabase/functions/_test/request-score-edit.test.ts`
- `supabase/functions/_test/send-export-report.test.ts`
- `supabase/functions/_test/auto-backup.test.ts`
- `supabase/functions/_test/receive-email.test.ts`

### Grup B — Critical infrastructure (3 fonksiyon, ~7 test/fonksiyon)

| Fonksiyon | LOC | Dikkat noktası |
|---|---|---|
| `notify-maintenance` | 402 | En büyük dosya; queue priority + recipient deduplication; standart 5 senaryo yetmeyebilir, 8-10 yaz |
| `password-reset-email` | 175 | Rate limit logic'i (varsa); recovery token generation; Resend contract |
| `email-verification-send` | 194 | Verification token lifecycle (generate → DB write → mail); idempotency |

**Çıktı dosyaları:**

- `supabase/functions/_test/notify-maintenance.test.ts`
- `supabase/functions/_test/password-reset-email.test.ts`
- `supabase/functions/_test/email-verification-send.test.ts`

### Grup C — Mail şablonları (5 fonksiyon, **minimum 4 test/fonksiyon**)

Bu grup Session F E4'te "düşük değer" diye atlanmıştı. **Atlamıyoruz.** PII sızıntı + Resend API contract koruması için minimum:

| Fonksiyon | LOC | Minimum 4 test |
|---|---|---|
| `notify-juror` | 340 | auth gate · body validation · Resend success · Resend non-2xx |
| `send-juror-pin-email` | 259 | auth gate · PIN body var mı · tenant boundary · Resend contract |
| `send-entry-token-email` | 253 | auth gate · token format · tenant boundary · Resend contract |
| `password-changed-notify` | 206 | event-trigger gate · body shape · Resend success · Resend non-2xx |
| `notify-unlock-request` | 272 | auth gate · severity-based recipient routing · Resend success · Resend non-2xx |

**Çıktı dosyaları:**

- `supabase/functions/_test/notify-juror.test.ts`
- `supabase/functions/_test/send-juror-pin-email.test.ts`
- `supabase/functions/_test/send-entry-token-email.test.ts`
- `supabase/functions/_test/password-changed-notify.test.ts`
- `supabase/functions/_test/notify-unlock-request.test.ts`

---

## Adım 4: Standart test senaryoları

Her test dosyası için **şu pattern'i uygula** (her fonksiyon için ilgili olanları seç; en az 4 senaryo):

```ts
import { captureHandler } from "./harness.ts";
import { setMockConfig, resetMockConfig } from "./mock-supabase.ts";
import { assertEquals, assertStringIncludes } from "https://deno.land/std/assert/mod.ts";

const MODULE = "../<fn-name>/index.ts";

Deno.test("<fn> — OPTIONS returns 200 with CORS", async () => {
  const { handler } = await captureHandler(MODULE);
  const res = await handler(new Request("http://x", { method: "OPTIONS" }));
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("access-control-allow-origin"), "*");
});

Deno.test("<fn> — non-POST returns 405", async () => { /* ... */ });
Deno.test("<fn> — missing Authorization → 401", async () => { /* ... */ });
Deno.test("<fn> — invalid JWT → 401", async () => { /* ... */ });
Deno.test("<fn> — unauthorized role → 403", async () => { /* ... */ });
Deno.test("<fn> — missing required field <X> → 400", async () => { /* ... */ });
Deno.test("<fn> — happy path → 200 + expected response", async () => { /* ... */ });
Deno.test("<fn> — DB/RPC error → 500 propagation", async () => { /* ... */ });
// Eğer Resend kullanıyorsa:
Deno.test("<fn> — Resend success → sent=true, fetch called with expected payload", async () => { /* ... */ });
Deno.test("<fn> — Resend non-2xx → sent=false, error populated, still 200", async () => { /* ... */ });
// Eğer audit-write yapıyorsa:
Deno.test("<fn> — audit insert failure → 500 (fail-closed)", async () => { /* ... */ });
```

**Resend mock pattern** (`request-pin-reset.test.ts`'den devral):

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
} finally {
  globalThis.fetch = originalFetch;
}
```

---

## Adım 5: Deliberately-break (zorunlu)

Her grup için en az **1 testi kasıtlı kır** ve FAIL olduğunu kanıtla:

- **Grup A:** `request-score-edit` testinde tenant boundary'yi gevşet (mock'ta org_id check'i bypass et) → tenant isolation testi FAIL etmeli
- **Grup B:** `password-reset-email` testinde rate limit guard'ı kaldır → "ikinci istek 429" testi FAIL etmeli
- **Grup C:** `notify-juror` testinde Resend mock'u 200 yerine 401 dönsün → "Resend success" testi FAIL etmeli

Bu kanıtları implementation report'a yaz; testler **gerçekten** koruyor olmalı.

---

## Adım 6: `qa-catalog.json` güncelle

Her yeni Deno testi için `src/test/qa-catalog.json` içine entry ekle. Namespace: `edge.real.<fn-slug>.<NN>`.

Örnek:

```json
{
  "id": "edge.real.notify-juror.01",
  "story": "auth gate — missing Authorization header returns 401",
  "area": "edge.notify-juror",
  "suite": "deno"
}
```

Her test için 1:1 entry. Test eklerken catalog'a entry yoksa test FAIL olur (`qaTest()` kuralı). Toplam ~70-80 yeni entry beklenebilir.

---

## Adım 7: Çalıştır + doğrula

```bash
npm run test:edge      # Deno — 0 fail; ~145+ test
npm test -- --run      # Vitest — 234 dosya, 917+ test, 0 regression
```

Coverage doğrulama:

```bash
for fn in $(ls supabase/functions/ | grep -v "^_" | grep -v "deno\."); do
  test -f supabase/functions/_test/${fn}.test.ts && echo "✅ $fn" || echo "❌ $fn"
done
```

**Tüm 21 satır ✅** olmalı.

---

## Adım 8: Implementation report yaz

`docs/superpowers/plans/session-g-edge-coverage-closure/implementation_reports/G-all-edge-functions.md` dosyasını yaz. İçerik:

- Her fonksiyon için: test sayısı, kapsanan senaryolar, deliberately-break kanıtı
- Atlanan / Known Gap olarak belgelenen fonksiyon (varsa) — sebep + ne gerekir
- Final test sayısı: "before 82 → after N"
- `qa-catalog.json` entry sayısı
- `npm run test:edge` ve `npm test -- --run` son çıktıları

---

## Kurallar (sıkı)

- **NEVER** modify source `index.ts` files — only `_test/*.test.ts` ve `qa-catalog.json`
- **NEVER** commit
- **NEVER** use `vi.mock()` — bu Deno değil, vitest
- Handler export edilmiyorsa `captureHandler` ile yakalandığı için sorun değil; ama capture **çalışmıyorsa** (örn. fonksiyon `serve()` yerine custom HTTP server kullanıyorsa) Known Gap olarak belgele ve adapter eklemek için **source'a dokunmadan** harness'e adapter ekle
- ID namespace: `edge.real.*` — `edge.contract.*` entry'lere dokunma (eski/yanlış pattern)
- Tüm yeni testler **işlevsel** olmalı: render-smoke / tautology yok. Session D denetiminin tespit ettiği shallow pattern'lere düşme

---

## Beklenen sonuç

| Metrik | Önce | Sonra |
|---|---|---|
| Edge fonksiyon kapsamı | 8/21 (%38) | **21/21 (%100)** |
| Deno test sayısı | 82 | ~145-160 |
| `qa-catalog.json` `edge.real.*` entry | ~50 | ~120-130 |
| Mail şablonu kapsamı | 0/5 | 5/5 (smoke) |
| Critical infra kapsamı | 0/3 | 3/3 (deep) |
| Critical business kapsamı | 0/5 | 5/5 (deep) |

Bu prompt'un yürütülmesi tek seferde **VERA'nın edge function test boşluğunu kapatır.**
