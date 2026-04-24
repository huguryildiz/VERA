# VERA — Session G1: Critical Business Logic Edge Functions (5 fonksiyon)

## Hedef

5 critical business logic Supabase Edge Function'ı için gerçek Deno testi yaz. Mevcut harness'i (`supabase/functions/_test/`) **olduğu gibi** kullan. `npm run test:edge` 0 fail. `qa-catalog.json` her test için entry. **Source `index.ts`'lere dokunma.**

**Bu sprint:** 5 fonksiyon × ~6 test = **~30 test**. Edge coverage 8/21 → 13/21.

**Paralel sprintler:** G2 (critical infra, 3 fn) + G3 (mail templates, 5 fn). Bu prompt'lar ayrı pencerelerde aynı anda çalışıyor olabilir; **çakışma yok** çünkü her sprint farklı `_test/*.test.ts` dosyalarına yazıyor.

---

## Bu sprint'in 5 fonksiyonu

| Fonksiyon | LOC | Risk · Dikkat noktası |
|---|---|---|
| `on-auth-event` | 163 | Auth event router; new user → tenant setup. Webhook signature kontrolü varsa mock |
| `request-score-edit` | 364 | Tenant boundary; super_admin bypass; period closed olmamalı kontrol |
| `send-export-report` | 345 | Tenant isolation; org-A user, org-B export request → 403; size limit |
| `auto-backup` | 209 | İki auth path: service role bearer (cron) + super_admin JWT (manual); backup JSON shape |
| `receive-email` | 116 | Inbound webhook; signature verification (varsa); routing logic |

---

## Adım 1: Harness'i ve referans testleri oku

```
supabase/functions/_test/harness.ts          ← captureHandler() pattern
supabase/functions/_test/mock-supabase.ts    ← setMockConfig + recordCall
supabase/functions/_test/import_map.json     ← module map
```

**Pattern referansı olarak iki test dosyasını oku:**

- `supabase/functions/log-export-event/index.test.ts` — audit-on-failure fail-closed garantisi (G1'de `request-score-edit` ve `send-export-report` için kritik)
- `supabase/functions/admin-session-touch/index.test.ts` — Bearer JWT validation pattern

Bu iki dosyanın yapısını kafaya yerleştir; tüm yeni testler aynı yapıyı izleyecek.

**Kritik kuralı bilinçle uygula:**

- Test, edge function'ın `Deno.serve(handler)` çağrısını intercept ederek handler'ı yakalar (`captureHandler(modulePath)`).
- Handler `serve()` import etmezse adapt etmek için **source'a dokunma yok** — harness adapter ekle veya Known Gap olarak belgele.
- `src/shared/api/edge/__tests__/edgeFunctions.test.js` referans değildir — orada paralel re-implementation var, gerçek test yok.

---

## Adım 2: Her fonksiyonun source'unu oku

Test yazmadan önce her `index.ts` dosyasını oku ve şu 6 soruyu çıkar:

1. **Auth nasıl kontrol ediliyor?** (Bearer token? `auth.getUser`? service role bypass? webhook signature?)
2. **Hangi RPC / table çağrıları yapıyor?**
3. **Hangi response shape'ler dönüyor?** (200 + JSON? 200 + text? 204?)
4. **Hangi error path'leri var?** (400 / 401 / 403 / 404 / 500)
5. **Resend / external HTTP kullanıyor mu?** (varsa `stubFetch()` ile mock)
6. **Audit log yazıyor mu?** (varsa fail-closed mu, fail-soft mu?)

Bu cevaplar olmadan test yazma — yoksa "happy path geçti" tipi sahte testler olur.

---

## Adım 3: 5 test dosyası yaz

**Çıktı:**

- `supabase/functions/_test/on-auth-event.test.ts` — ~6 test
- `supabase/functions/_test/request-score-edit.test.ts` — ~7 test (tenant boundary kritik, en az 7)
- `supabase/functions/_test/send-export-report.test.ts` — ~7 test (cross-org test zorunlu)
- `supabase/functions/_test/auto-backup.test.ts` — ~6 test (iki auth path için ayrı testler)
- `supabase/functions/_test/receive-email.test.ts` — ~5 test

**Standart pattern (her dosya için adapt et):**

```ts
import { captureHandler } from "./harness.ts";
import { setMockConfig, resetMockConfig } from "./mock-supabase.ts";
import { assertEquals, assertStringIncludes } from "https://deno.land/std/assert/mod.ts";

const MODULE = "../<fn-name>/index.ts";

Deno.test("<fn> — OPTIONS returns 200 with CORS", async () => { /* ... */ });
Deno.test("<fn> — non-POST returns 405", async () => { /* ... */ });
Deno.test("<fn> — missing Authorization → 401", async () => { /* ... */ });
Deno.test("<fn> — invalid JWT → 401", async () => { /* ... */ });
Deno.test("<fn> — unauthorized role → 403", async () => { /* ... */ });
Deno.test("<fn> — missing required field <X> → 400", async () => { /* ... */ });
Deno.test("<fn> — happy path → 200 + expected response", async () => { /* ... */ });
Deno.test("<fn> — DB/RPC error → 500 propagation", async () => { /* ... */ });
// Eğer audit-write yapıyorsa:
Deno.test("<fn> — audit insert failure → 500 (fail-closed)", async () => { /* ... */ });
```

**Bu sprint için özel testler:**

- **`request-score-edit` ve `send-export-report`:** Tenant boundary kritik — `Deno.test("...— org-A user, org-B request → 403")` zorunlu
- **`auto-backup`:** İki auth path için ayrı test — `Deno.test("...— cron path: service role bearer → 200")` + `Deno.test("...— manual path: super_admin JWT → 200")` + `Deno.test("...— tenant_admin manual trigger → 403")`
- **`auto-backup`:** Backup JSON shape testi zorunlu — `assertEquals(body.organizations !== undefined, true)` + benzeri

---

## Adım 4: Deliberately-break (zorunlu)

Bu sprint için **2 test'i kasıtlı kır** ve FAIL olduğunu kanıtla:

1. `request-score-edit` testinde tenant boundary'yi gevşet (mock'ta org_id check'i bypass et) → tenant isolation testi FAIL etmeli
2. `auto-backup` testinde service role check'i kaldır (mock'ta env'i boşalt) → "cron path: service role bearer → 200" testi FAIL etmeli

Bu kanıtları implementation report'a yaz; testler **gerçekten** koruyor olmalı.

---

## Adım 5: `qa-catalog.json` güncelle

Her yeni Deno testi için `src/test/qa-catalog.json` içine entry ekle. Namespace: `edge.real.<fn-slug>.<NN>`.

Örnek:

```json
{
  "id": "edge.real.request-score-edit.01",
  "story": "tenant boundary — org-A user requesting org-B score edit returns 403",
  "area": "edge.request-score-edit",
  "suite": "deno"
}
```

Her test için 1:1 entry. ~30 yeni entry.

**Çakışma uyarısı:** G2 ve G3 paralel çalışıyorsa `qa-catalog.json`'a aynı anda yazıyor olabiliriz. **Sadece kendi namespace'in (`edge.real.on-auth-event.*`, `edge.real.request-score-edit.*`, `edge.real.send-export-report.*`, `edge.real.auto-backup.*`, `edge.real.receive-email.*`) içine yaz.** Başka entry'lere dokunma. Merge sırasında diğer sprint'lerin entry'leri korunmalı.

---

## Adım 6: Çalıştır + doğrula

```bash
npm run test:edge      # Deno — bu sprint testleri 0 fail; ~30+ yeni test
npm test -- --run      # Vitest — 234 dosya, 917+ test, 0 regression
```

Coverage doğrulama (bu sprint'ten sonra):

```bash
for fn in on-auth-event request-score-edit send-export-report auto-backup receive-email; do
  test -f supabase/functions/_test/${fn}.test.ts && echo "✅ $fn" || echo "❌ $fn"
done
```

Tüm 5 satır ✅ olmalı.

---

## Adım 7: Implementation report yaz

`docs/superpowers/plans/session-g-edge-coverage-closure/implementation_reports/G1-critical-business.md` dosyasını yaz. İçerik:

- Her fonksiyon için: test sayısı, kapsanan senaryolar, deliberately-break kanıtı
- Atlanan / Known Gap olarak belgelenen fonksiyon (varsa) — sebep + ne gerekir
- Final test sayısı: "before 82 → after N"
- `qa-catalog.json` entry sayısı (yeni eklenen)
- `npm run test:edge` ve `npm test -- --run` son çıktıları

---

## Kurallar (sıkı)

- **NEVER** modify source `index.ts` files — only `_test/*.test.ts` ve `qa-catalog.json`
- **NEVER** commit
- **NEVER** use `vi.mock()` — bu Deno değil, vitest
- Handler export edilmiyorsa `captureHandler` ile yakalandığı için sorun değil; capture **çalışmıyorsa** Known Gap olarak belgele ve adapter eklemek için **source'a dokunmadan** harness'e adapter ekle
- ID namespace: `edge.real.*` — `edge.contract.*` entry'lere dokunma (eski/yanlış pattern)
- Tüm yeni testler **işlevsel** olmalı: render-smoke / tautology yok. Session D denetiminin tespit ettiği shallow pattern'lere düşme

---

## Beklenen sonuç (bu sprint)

| Metrik | Önce | Sonra |
|---|---|---|
| Edge fonksiyon kapsamı | 8/21 (%38) | 13/21 (%62) |
| Deno test sayısı | 82 | ~112 |
| Critical business kapsamı | 0/5 | **5/5 (deep)** |
| `edge.real.*` qa-catalog entry | ~50 | ~80 |
