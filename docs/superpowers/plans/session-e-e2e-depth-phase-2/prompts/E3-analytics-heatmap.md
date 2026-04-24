# E3 — Analytics + Heatmap data accuracy

Copy-paste into a fresh Claude Code window. **Model: Opus** (fixture extension + chart assertion detective work).

---

```
Session E — Sprint E3: Analytics + Heatmap data accuracy

═══════════════════════════════════════════════════════════
BAĞLAM
═══════════════════════════════════════════════════════════

Proje: VERA
Repo root: /Users/huguryildiz/Documents/GitHub/VERA
Master plan: docs/superpowers/plans/session-e-e2e-depth-phase-2/README.md
Flake log: docs/superpowers/plans/session-c-e2e-depth-integrity/flake-log.md

Miras helper'lar (reuse):
- e2e/helpers/scoringFixture.ts (C4) — period + 2 criteria + 2 projects + juror + scores
- e2e/helpers/supabaseAdmin.ts — adminClient
- e2e/fixtures/seed-ids.ts

Mevcut spec'ler (L0 smoke):
- e2e/admin/analytics.spec.ts — 2 test: chart container görünür + nav
- e2e/admin/heatmap.spec.ts — 2 test: grid görünür + nav

═══════════════════════════════════════════════════════════
BU SPRINT: E3 — Chart ve Heatmap'te GÖRÜNEN değerler doğru mu
═══════════════════════════════════════════════════════════

PROBLEM:
analytics.spec.ts "chart container var mı" diye kontrol ediyor.
heatmap.spec.ts "grid element var mı" diye kontrol ediyor.
İçlerindeki SAYILAR + RENKLER asla assert edilmiyor. Backend feed
bozuk olsa, aggregation yanlış olsa, hiç fark edilmez.

HEDEF:
Bilinen skor dağılımıyla fixture kur → sayfayı render et →
chart/heatmap'teki SAYISAL ve GÖRSEL değerlerin beklenen output'la
eşleştiğini assert et.

GÖREV:

1. Branch: git checkout -b test/e3-analytics-heatmap-data

2. scoringFixture genişletme (gerekirse):
   - Mevcut setupScoringFixture bir juror ile 2 project score'luyor
   - E3 için: ikinci bir juror + farklı score pattern ile dağılım 
     istiyoruz. setupScoringFixture opts'una `jurors: number` ekle
     (default 1, E3 2 kullanır). Teardown buna göre genişletilir.
   - Alternatif: iki ayrı fixture instance kur, E3 kendi 2-juror 
     variant'ını `scoringFixture` içinde kullanmadan yapar. Hangi yol 
     daha az invaziv ise onu seç.

3. Analytics keşfi:
   - src/admin/features/analytics/ altındaki component'ları oku
   - Hangi chart'lar var: outcome attainment, score distribution, 
     KPI (avg score, submitted count vs)
   - Her chart'ın rendered sayısal element'ine data-testid ekle:
     - analytics-kpi-avg-score
     - analytics-kpi-submitted-count
     - analytics-kpi-in-progress-count
     - analytics-kpi-draft-count
   - Eksikleri component'a ekle (behavior değiştirme, sadece testid)

4. Analytics testleri — e2e/admin/analytics.spec.ts içine yeni describe:
   
   test.describe("analytics data accuracy (E3)") {
     let fixture;
     
     test.beforeAll(async () => {
       fixture = await setupScoringFixture({
         namePrefix: "E3 Analytics",
         // 2 juror, 1 submitted score_sheet, 1 in_progress, 1 draft
         // Deterministic: score_sheets.status = 'submitted'|'in_progress'|'draft'
         // Exact counts depend on writeScoresAsJuror() logic
       });
     });
     test.afterAll(async () => { await teardownScoringFixture(fixture); });
     
     // TEST 1: Submitted/InProgress/Draft counts correct
     test("KPI strip counts match seeded score_sheets distribution", async ({ page }) => {
       // Login + select fixture period + navigate to /admin/analytics
       // Assert:
       //   page.getByTestId("analytics-kpi-submitted-count").textContent → expected "1"
       //   page.getByTestId("analytics-kpi-in-progress-count") → "1"
       //   page.getByTestId("analytics-kpi-draft-count") → "1"
     });
     
     // TEST 2: Avg score correct
     test("KPI avg score matches calculated average across submitted sheets", async ({ page }) => {
       // Seed: sheet1 score_value 10+5=15, sheet2 score_value 8+2=10 → avg = 12.5
       // Assert: getByTestId("analytics-kpi-avg-score") içerir "12.5" veya benzer format
     });
   }

5. Heatmap keşfi:
   - src/admin/features/heatmap/ altındaki component'lar
   - Hücre state'i nasıl render ediliyor? class='scored' | 'partial' | 'empty' ?
   - Hücre testid'i (muhtemelen heatmap-cell-<juror_id>-<project_id>)
   - Eksikse ekle:
     - heatmap-cell-{jurorId}-{projectId} (testid)
     - Class-based veya data-status attribute

6. Heatmap testleri — e2e/admin/heatmap.spec.ts içine yeni describe:
   
   test.describe("heatmap cell states (E3)") {
     let fixture;
     
     test.beforeAll(async () => {
       fixture = await setupScoringFixture({
         namePrefix: "E3 Heatmap",
         jurors: 2,
         scoringPattern: {
           // Juror1 → P1 fully scored, P2 partial
           // Juror2 → P1 not scored (empty), P2 fully scored
         }
       });
     });
     test.afterAll(async () => { await teardownScoringFixture(fixture); });
     
     // TEST 3: Cell states match seed
     test("heatmap cells show correct state (scored/partial/empty)", async ({ page }) => {
       // Login + goto heatmap + select fixture period
       // For each (juror, project) pair, read cell and assert class/attribute
       //   cell(J1, P1) → 'scored' (green)
       //   cell(J1, P2) → 'partial' (amber)
       //   cell(J2, P1) → 'empty' (gray)
       //   cell(J2, P2) → 'scored'
     });
     
     // TEST 4: Deliberately-break
     test("deliberately-break: mutating DB score changes cell state", async ({ page }) => {
       // Initial render: assert cell(J1, P1) = 'scored'
       // Delete all score_sheet_items for that sheet → status → 'draft' veya partial?
       //   (scoringFixture.writeScoresAsJuror logic'ine bak, yoksa direct DB update)
       // Reload heatmap page
       // Assert cell(J1, P1) != 'scored'
     });
   }

7. Aggregation code path keşfi:
   - Analytics aggregation nerede yapılıyor? (client-side scores.js mi, 
     backend RPC mi?) Eğer client-side'daysa E1-fix'teki tautology 
     tehlikesi var — direkt client kullandığımız için test gerçek kod 
     çalışıyor, tautology yok. Heatmap aynı.
   - getOutcomeAttainmentTrends gibi E1'deki yalnız helper yeniden 
     implementation yapma. UI render path'ini tara, gerçek hesap orada 
     olduğu için tautology otomatik yok olur.

8. Deliberately-break (her test için):
   - TEST 1: fixture.status counts beklentisi yanlış assert et (örn. 
     "Submitted: 99") → FAIL olmalı
   - TEST 2: avg score'u 999 bekle → FAIL olmalı
   - TEST 3: cell state'i yanlış assert et → FAIL olmalı
   - TEST 4: Bu zaten deliberately-break

   En az 2 tanesi için FAIL log'unu raporda paylaş.

9. Flake check:
   npm run e2e -- --grep "analytics|heatmap" --repeat-each=3 --workers=1

10. Tam suite: npm run e2e — E1+E2+E4 sonrası ~103 + 4 = ~107

11. Rapor:
    docs/superpowers/plans/session-e-e2e-depth-phase-2/implementation_reports/E3-analytics-heatmap.md
    - Pass-rate delta
    - Eklenen testid'ler (tam liste)
    - scoringFixture değişiklikleri (multi-juror support vs)
    - Aggregation path (client vs backend) notu — tautology riski var mı
    - 2+ deliberately-break kanıtı
    - Sürprizler (status enum, partial vs in_progress ayrımı vs)

12. Commit:
    git add e2e/admin/analytics.spec.ts e2e/admin/heatmap.spec.ts 
            e2e/helpers/scoringFixture.ts (değiştirildiyse)
            src/admin/features/analytics/... src/admin/features/heatmap/... (testid)
            docs/.../E3-analytics-heatmap.md
    git commit -m "test(e2e): E3 — analytics KPI + heatmap cell state data accuracy"

═══════════════════════════════════════════════════════════
DOKUNMA / DİKKAT
═══════════════════════════════════════════════════════════

- e2e/helpers/outcomeFixture.ts — E1-fix paralel çalışıyor, dokunma
- e2e/admin/outcome-attainment.spec.ts — E1-fix paralel, dokunma
- E5 paralel, auth/jury dosyaları — çakışma yok
- scoringFixture.ts — SEN genişletebilirsin; E1-fix ve E5 buraya dokunmuyor
- e2e/legacy/ — dokunma

═══════════════════════════════════════════════════════════
PARALEL KOORDİNASYON
═══════════════════════════════════════════════════════════

- scoringFixture'a multi-juror opsiyonu eklersen, geriye dönük uyumlu 
  tut (default jurors=1). Mevcut C4 testleri kırılmasın.
- periods tablosuna insert yaparken unique suffix (default pattern) 
  kullan; E5 periods'a dokunmuyor, E1-fix sadece mevcut fixture 
  kullanıyor → conflict yok.

═══════════════════════════════════════════════════════════
KURALLAR
═══════════════════════════════════════════════════════════

- data-testid zorunlu (component'a yeni testid'ler eklenecek)
- Deliberately-break zorunlu (her yeni test için ayrı kanıt)
- --workers=1 flake check
- scoringFixture extension geriye uyumlu olmalı
- Commit yap, push etme

Sprint zorluk: Orta-yüksek. Multi-juror fixture + 2 farklı component 
keşfi + aggregation path takibi. Tahmin ~2 saat.

Hazırsan başla.
```
