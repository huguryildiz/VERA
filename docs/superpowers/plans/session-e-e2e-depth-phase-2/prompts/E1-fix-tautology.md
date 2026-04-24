# E1-fix — Outcome attainment tautology fix

Copy-paste into a fresh Claude Code window. **Model: Opus** (refactoring + import-path detective work).

---

```
Session E — Sprint E1-fix: Outcome attainment tautology fix

═══════════════════════════════════════════════════════════
BAĞLAM
═══════════════════════════════════════════════════════════

Proje: VERA
Repo root: /Users/huguryildiz/Documents/GitHub/VERA
Master plan: docs/superpowers/plans/session-e-e2e-depth-phase-2/README.md
E1 report: docs/superpowers/plans/session-e-e2e-depth-phase-2/implementation_reports/E1-outcome-attainment.md

E1 zaten commit'li (c32fbaab, branch test/e1-outcome-attainment).
4 test geçiyor. AMA code review açığa çıkardı ki:

e2e/helpers/outcomeFixture.ts içindeki `readAttainment` fonksiyonu,
src/shared/api/admin/scores.js:309-317'deki production formülünü
TypeScript'te YENİDEN implement ediyor. Test:
  "readAttainment(DB state) = 65 mi?" 
diye sorguluyor. Ama readAttainment'in kendisi production kodu değil,
onun kopyası. Üretim kodunda bug olsa (örn. * 100 yerine * 200), test
hâlâ 65 dönecek ve geçecek. Tautology.

═══════════════════════════════════════════════════════════
BU SPRINT: E1-fix — Gerçek production math yolunu test et
═══════════════════════════════════════════════════════════

HEDEF:
readAttainment'ı production fonksiyonuna bağla, ya da UI tarafından 
okumayı ekle — test artık production math regression'ını yakalasın.

İKİ SEÇENEK VAR (sen duruma göre karar ver):

─── SEÇENEK A: Production fonksiyonunu direkt import et ───

src/shared/api/admin/scores.js -> getOutcomeAttainmentTrends.
Bu fonksiyon `supabase.from("score_sheets")...` kullanıyor — yani 
default supabase client'a bağımlı. e2e context'inde bu client
VITE_DEMO_SUPABASE_URL + ANON_KEY ile çalışıyor, ama test 
tenant-admin auth ile. Ya:

  (a) Testte tenant-admin oturumu aç (buildAdminSession helper'ı 
      var, oauthSession.ts'te), oturumu inject et, sonra
      getOutcomeAttainmentTrends'i çağır. 
      Çıktı artık gerçek production path'ten geçmiş olur.
  
  (b) Service role ile override — daha karmaşık, vite build 
      bağımlılığı çıkar. ÖNERMİYORUM.

─── SEÇENEK B: UI üzerinden oku ───

Admin /admin/analytics sayfasında outcome attainment chart'ı var.
Chart component'ine data-testid ekle (her outcome için):
  analytics-outcome-attainment-${outcomeCode}
Değer text'i olarak "65%" veya sadece "65" render edilsin.

Test:
  - Fixture setup (mevcut)
  - Admin login
  - /admin/analytics?period=<fixture.periodId>
  - Chart render olmasını bekle
  - byTestId("analytics-outcome-attainment-OA").textContent
  - Parse edip 65'e yakın assert

Avantaj: UI path, gerçek client state
Dezavantaj: Component testid eklemek gerekir; chart render'ın 
fixture.periodId'yi seçmesi için period dropdown tıklama gerekli

─── HANGİSİ ───

Önce SEÇENEK A'yı dene (1 saat içinde getOutcomeAttainmentTrends
çağırılabiliyor mu). Import edememe, client initialization sorunu
vb. çıkarsa SEÇENEK B'ye geç.

GÖREV:

1. Branch: git checkout -b test/e1-fix-real-production-math

2. Keşif:
   - src/shared/api/admin/scores.js oku, getOutcomeAttainmentTrends
     imzası + dependency'leri (supabase client, hangi fonksiyonlar
     çağrılıyor) çıkar
   - src/shared/api/core/client.js oku, supabase singleton'ı nasıl
     yaratılıyor (env vars)
   - Playwright node context'ten import edilebilir mi — .mjs vs .js
     uyumu, CJS/ESM interop kontrol

3. SEÇENEK A:
   - e2e/helpers/outcomeFixture.ts — readAttainment'ı yeniden yaz:
     import { getOutcomeAttainmentTrends } from "../../src/shared/api/admin/scores.js";
     // veya benzer relative path
     
     export async function readAttainment(periodId: string, orgId: string) {
       const result = await getOutcomeAttainmentTrends({ 
         periodId, 
         organizationId: orgId,
         // diğer parametreler — signature'dan çıkar
       });
       // result: { trends: [{ outcome_code, avg }, ...] }
       // Bu formatı test'in beklediği { OA: 80, OB: 60 } map'ine çevir
       return Object.fromEntries(result.trends.map(t => [t.outcome_code, t.avg]));
     }
   
   - Eğer getOutcomeAttainmentTrends default supabase client'ı 
     kullanıyorsa, test context'inde auth session inject etmen gerekir.
     vite build asset'leri ile runtime sorunları çıkarsa (process.env vs 
     import.meta.env), dynamic import veya custom build gerekebilir.
     Burada takılırsan 45 dakika içinde SEÇENEK B'ye geç.

4. SEÇENEK B (A çalışmazsa):
   - src/admin/features/analytics/components/ altına bak, hangi 
     component outcome attainment render ediyor (OutcomeAttainmentChart 
     veya benzeri)
   - Her outcome sayısının render edildiği element'e 
     data-testid='analytics-outcome-attainment-<code>' ekle
   - e2e/admin/outcome-attainment.spec.ts'e YENİ describe ekle:
     "outcome attainment via UI (production path)"
     Mevcut 4 test dursun (schema contract testi olarak).
     Yeni 2-3 test (UI üzerinden) ekle — aynı fixture, attainment değerini 
     UI'dan oku. 

5. Deliberately-break:
   - SEÇENEK A varsa: scores.js:314'te `* 100` yerine `* 200` yazarak 
     local'de test çalıştır → testler FAIL olmalı. Sonra geri al.
   - SEÇENEK B varsa: aynı (UI aynı fonksiyonu çağırır)

6. Flake check:
   npm run e2e -- --grep "outcome attainment" --repeat-each=3 --workers=1

7. Tam suite:
   npm run e2e — mevcut test sayısı ± yeni testler

8. Rapor: 
   docs/superpowers/plans/session-e-e2e-depth-phase-2/implementation_reports/E1-fix-real-production-math.md
   - Hangi seçeneği uyguladın, neden
   - Deliberately-break kanıtı (production kodunu gerçekten test ettiğinin ispatı)
   - Eski readAttainment'ı tuttun mu yoksa kaldırdın mı, gerekçe
   - Schema contract testleri ne kadar etkilendi

9. Commit:
   git add e2e/helpers/outcomeFixture.ts e2e/admin/outcome-attainment.spec.ts
           src/admin/features/analytics/...  (testid eklediysen)
           docs/.../E1-fix-real-production-math.md
   git commit -m "test(e2e): E1-fix — real production path for outcome attainment"

═══════════════════════════════════════════════════════════
DOKUNMA
═══════════════════════════════════════════════════════════

- scores.js PRODUCTION kodu — sadece testid eklemek için okuma
- E3 paralel çalışıyor, analytics.spec.ts dosyasına ekleme yapabilir,
  sen outcome-attainment.spec.ts'e yazıyorsun → conflict yok
- E5 paralel, auth/jury dosyalarına dokunuyor → conflict yok

═══════════════════════════════════════════════════════════
KURALLAR
═══════════════════════════════════════════════════════════

- Deliberately-break ZORUNLU — bu sprint'in TEK AMACI bu doğrulama
- --workers=1 flake check
- Commit yap, push etme
- Takıldığın yerde sor (özellikle import path / client init konusunda)

Süre: ~1.5-2 saat (Seçenek A 1h, zor ise B'ye geçince +1h)

Hazırsan başla.
```
