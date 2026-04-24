# VERA — Session G3: Mail Templates Edge Functions (5 fonksiyon)

## Hedef

5 mail şablonu Supabase Edge Function'ı için gerçek Deno testi yaz. Mevcut harness'i (`supabase/functions/_test/`) **olduğu gibi** kullan. `npm run test:edge` 0 fail. `qa-catalog.json` her test için entry. **Source `index.ts`'lere dokunma.**

**Bu sprint:** 5 fonksiyon × 4 test = **~20 test**. Pattern saf tekrar; mekanik iş. Önceki Session F E4 planı bu fonksiyonları "düşük değer" diye atlamıştı — bu sprint o kararı geri alıyor çünkü:

- Yanlış adrese mail giderse PII sızıntısı (özellikle PIN, recovery link, audit raporu)
- Resend API failure path'i ve audit-on-failure davranışı test edilmiyor
- Multi-tenant geçişte mail logic'i çoğalacak — şimdi koruma yoksa sonra çok geç

**Paralel sprintler:** G1 (critical business, 5 fn) + G2 (critical infra, 3 fn). Bu prompt'lar ayrı pencerelerde aynı anda çalışıyor olabilir; **çakışma yok** çünkü her sprint farklı `_test/*.test.ts` dosyalarına yazıyor.

---

## Bu sprint'in 5 fonksiyonu

| Fonksiyon | LOC | Minimum 4 test |
|---|---|---|
| `notify-juror` | 340 | auth gate · body validation · Resend success · Resend non-2xx |
| `send-juror-pin-email` | 259 | auth gate · PIN body var mı (PII assertion) · tenant boundary · Resend contract |
| `send-entry-token-email` | 253 | auth gate · token format · tenant boundary · Resend contract |
| `password-changed-notify` | 206 | event-trigger gate · body shape · Resend success · Resend non-2xx |
| `notify-unlock-request` | 272 | auth gate · severity-based recipient routing · Resend success · Resend non-2xx |

**Bu sprint neden ayrı:** Pattern saf tekrar — pure copy-paste-adapt iş. Sonnet çalışırsa tek session'da rahat biter. Opus burada overkill.

---

## Adım 1: Harness'i ve referans testi oku

```
supabase/functions/_test/harness.ts          ← captureHandler() pattern
supabase/functions/_test/mock-supabase.ts    ← setMockConfig + recordCall
supabase/functions/_test/import_map.json     ← module map
```

**Pattern referansı olarak tek dosyaya odaklan:**

- `supabase/functions/request-pin-reset/index.test.ts` — **Resend API mock** pattern (success + non-2xx + missing API key); G3'ün 5 fonksiyonu da Resend kullanıyor

Bu dosyayı kafaya yerleştir; G3'ün 5 testi doğrudan bu pattern'i kopyalayıp adapt edecek.

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

1. **Auth nasıl kontrol ediliyor?** (Bearer token? Webhook signature? Event payload validation?)
2. **Recipient nasıl seçiliyor?** (RPC çağrısı? Direct table query? Severity-based routing?)
3. **Resend payload'unda ne var?** (to / subject / html — hangi field'ları assert edilmeli?)
4. **PII riski olan field'lar:** PIN, token, recovery link, name — bunlar payload'da olmalı mı veya olmamalı mı?

Bu cevaplar olmadan test yazma — yoksa "Resend çağrıldı" tipi sahte testler olur.

---

## Adım 3: 5 test dosyası yaz

**Çıktı:**

- `supabase/functions/_test/notify-juror.test.ts` — 4 test
- `supabase/functions/_test/send-juror-pin-email.test.ts` — 4 test
- `supabase/functions/_test/send-entry-token-email.test.ts` — 4 test
- `supabase/functions/_test/password-changed-notify.test.ts` — 4 test
- `supabase/functions/_test/notify-unlock-request.test.ts` — 4 test

**Standart pattern (her dosya için minimum 4 test):**

```ts
import { captureHandler } from "./harness.ts";
import { setMockConfig, resetMockConfig } from "./mock-supabase.ts";
import { assertEquals, assertExists } from "https://deno.land/std/assert/mod.ts";

const MODULE = "../<fn-name>/index.ts";

Deno.test("<fn> — missing Authorization → 401", async () => { /* ... */ });
Deno.test("<fn> — missing required field <X> → 400", async () => {
  // body validation: at least the most critical field
});
Deno.test("<fn> — Resend success → sent=true, fetch called with expected to/subject", async () => {
  // assert payload.to, payload.subject contains relevant key
});
Deno.test("<fn> — Resend non-2xx (429) → sent=false, error populated, still 200", async () => { /* ... */ });
```

**Bu sprint için özel testler (her fonksiyona ek):**

### `notify-juror`

- Standart 4 test yeterli; ekstra: `Deno.test("...— super_admin or org_admin role required → tenant member returns 403")`

### `send-juror-pin-email` — PII assertion zorunlu

- `Deno.test("...— PIN value present in Resend payload (PII delivery)")` — payload.html veya payload.subject içinde PIN olmalı; assertEquals ile doğrula
- `Deno.test("...— tenant boundary: org-A admin sending org-B juror PIN → 403")`

### `send-entry-token-email` — token format

- `Deno.test("...— token format: payload contains 8-char alphanumeric token (or expected format)")`
- `Deno.test("...— tenant boundary: cross-org request → 403")`

### `password-changed-notify` — event-trigger pattern

- Auth signature'ı muhtemelen webhook olur (Supabase Auth event); test'te Bearer yerine signature header
- `Deno.test("...— missing signature header → 401")`
- `Deno.test("...— invalid signature → 401")`
- `Deno.test("...— event type mismatch (e.g. user.created instead of password.changed) → 400 or 200 no-op")`

### `notify-unlock-request` — severity routing

- `Deno.test("...— severity=high routes to admin emails, sent=true")`
- `Deno.test("...— severity=low routes to fallback contact_email")`
- `Deno.test("...— no admin emails and no contact_email → 404")`

---

## Adım 4: Deliberately-break (zorunlu)

Bu sprint için **2 test'i kasıtlı kır** ve FAIL olduğunu kanıtla:

1. `send-juror-pin-email` testinde PIN payload assertion'ını gevşet (`assertEquals(payload.html.includes(pin), true)` yerine `true === true`) → orijinal halde çalıştığında PIN payload'dan kaldırılırsa test FAIL etmeli — bu kanıtı yaz: source'da PIN'i payload'dan çıkar (mental simulation, source'a dokunma) → test FAIL eder mi?
2. `notify-unlock-request` testinde severity routing'i bypass et (mock'ta `severity` her zaman aynı recipient'a yönlendirsin) → "severity=high routes to admin emails" testi FAIL etmeli

Bu kanıtları implementation report'a yaz; testler **gerçekten** koruyor olmalı.

---

## Adım 5: `qa-catalog.json` güncelle

Her yeni Deno testi için `src/test/qa-catalog.json` içine entry ekle. Namespace: `edge.real.<fn-slug>.<NN>`.

Örnek:

```json
{
  "id": "edge.real.send-juror-pin-email.03",
  "story": "PII delivery — PIN value present in Resend payload html",
  "area": "edge.send-juror-pin-email",
  "suite": "deno"
}
```

Her test için 1:1 entry. ~20 yeni entry.

**Çakışma uyarısı:** G1 ve G2 paralel çalışıyorsa `qa-catalog.json`'a aynı anda yazıyor olabiliriz. **Sadece kendi namespace'in (`edge.real.notify-juror.*`, `edge.real.send-juror-pin-email.*`, `edge.real.send-entry-token-email.*`, `edge.real.password-changed-notify.*`, `edge.real.notify-unlock-request.*`) içine yaz.** Başka entry'lere dokunma.

---

## Adım 6: Çalıştır + doğrula

```bash
npm run test:edge      # Deno — bu sprint testleri 0 fail; ~20+ yeni test
npm test -- --run      # Vitest — 234 dosya, 917+ test, 0 regression
```

Coverage doğrulama (bu sprint'ten sonra):

```bash
for fn in notify-juror send-juror-pin-email send-entry-token-email password-changed-notify notify-unlock-request; do
  test -f supabase/functions/_test/${fn}.test.ts && echo "✅ $fn" || echo "❌ $fn"
done
```

Tüm 5 satır ✅ olmalı.

---

## Adım 7: Implementation report yaz

`docs/superpowers/plans/session-g-edge-coverage-closure/implementation_reports/G3-mail-templates.md` dosyasını yaz. İçerik:

- Her fonksiyon için: test sayısı, kapsanan senaryolar, deliberately-break kanıtı
- PII assertion derinliği (hangi fonksiyonlarda payload field içeriği assert edildi)
- Atlanan / Known Gap olarak belgelenen fonksiyon (varsa) — sebep + ne gerekir
- Final test sayısı: "before 82 → after N"
- `npm run test:edge` ve `npm test -- --run` son çıktıları

---

## Kurallar (sıkı)

- **NEVER** modify source `index.ts` files — only `_test/*.test.ts` ve `qa-catalog.json`
- **NEVER** commit
- **NEVER** use `vi.mock()` — bu Deno değil, vitest
- Mail şablonu testleri "smoke" gibi görünebilir — **ama** auth gate + Resend payload assertion + PII presence/absence kontrolü varsa smoke değil
- **YAGNI:** Mail body HTML'sini tam parse etme — sadece kritik field'ı (PIN, token, recovery link) `includes()` ile kontrol et
- ID namespace: `edge.real.*` — `edge.contract.*` entry'lere dokunma
- Tüm yeni testler **işlevsel** olmalı: render-smoke / tautology yok

---

## Beklenen sonuç (bu sprint)

| Metrik | Önce | Sonra |
|---|---|---|
| Edge fonksiyon kapsamı | 8/21 (%38) | **13/21 (G3 alone)** veya **21/21 (G1+G2+G3)** |
| Deno test sayısı | 82 | **~102 (G3 alone)** veya **~145-160 (full Session G)** |
| Mail şablonu kapsamı | 0/5 | **5/5 (smoke + PII assertion)** |
| `edge.real.*` qa-catalog entry | ~50 | **~70 (G3 alone)** veya **~120-130 (full Session G)** |

> Not: G1, G2, G3 paralel çalışıyorsa final metrikleri merge sırasında hesapla; her sprint kendi delta'sını implementation report'a yazsın.
