# E5 — Auth flow deepening (forgot-password + session reload + edit-mode)

Copy-paste into a fresh Claude Code window. **Model: Sonnet** (3 independent concerns, pattern-repeated).

---

```
Session E — Sprint E5: Auth flow deepening

═══════════════════════════════════════════════════════════
BAĞLAM
═══════════════════════════════════════════════════════════

Proje: VERA
Repo root: /Users/huguryildiz/Documents/GitHub/VERA
Master plan: docs/superpowers/plans/session-e-e2e-depth-phase-2/README.md
Flake log: docs/superpowers/plans/session-c-e2e-depth-integrity/flake-log.md

Miras helper'lar:
- e2e/helpers/supabaseAdmin.ts — adminClient + generateRecoveryLink + 
  resetJurorAuth (F1 compliant) + readJurorAuth
- e2e/poms/JuryPom.ts, JuryEvalPom.ts
- e2e/fixtures/seed-ids.ts — EVAL_PERIOD_ID, EVAL_JURORS

═══════════════════════════════════════════════════════════
BU SPRINT: Üç bağımsız auth derinlik testi
═══════════════════════════════════════════════════════════

(I) Forgot-password reset link tam flow (1 test)
(II) Jury session browser refresh persistence (2 test)
(III) Edit-mode after submit (2 test)

Toplam 5 yeni test, tek commit.

GÖREV:

1. Branch: git checkout -b test/e5-auth-deepening

═══════════════════════════════════════════════════════════
(I) Forgot-password recovery link flow
═══════════════════════════════════════════════════════════

Mevcut e2e/auth/forgot-password.spec.ts 3 test:
  - Input görünür
  - Button enabled  
  - Submit → success banner

EKSİK: Link takibi, yeni şifre oluşturma, sonraki login.

2. e2e/auth/forgot-password.spec.ts — 1 yeni test ekle:
   
   test("recovery link → reset password → login with new password", async ({ page }) => {
     const recoveryEmail = "e5-recovery-test@vera-eval.app"; // seed'de veya yaratıp cleanup et
     // Alternatif: tenant-admin@vera-eval.app kullan, ama şifre değişimi 
     // diğer testleri bozar. SAFE path: e5-specific bir user yarat.
     
     // 1. adminClient.auth.admin.createUser ile e5-recovery-test user yarat
     //    (ama profiles + memberships gerektiriyor mu? sadece recovery 
     //    link için gerekmeyebilir; createUser sonrası shouldBypassEmail=true
     //    olsun). Check supabaseAdmin docs.
     // 2. generateRecoveryLink(email) → action_link
     //    extractInviteHash pattern'ine benzer şekilde redirect'i takip 
     //    et, hash'i ve token'ı çıkar
     // 3. page.goto(hashURL) → /reset-password sayfasına gider
     // 4. Yeni şifre formu doldur: "NewE5Pass2026!"
     //    testid: reset-password, reset-confirm (veya gerçekte ne varsa)
     // 5. Submit → success → login sayfasına redirect
     // 6. Login sayfasında email + yeni şifre ile sign in
     // 7. Admin shell render olmalı
     // 8. Cleanup: deleteUserByEmail(e5-recovery-test)
   });

SUPABASE KISITLAMASI: redirect_to allowed-URL listesinde olmak zorunda. 
extractInviteHash pattern'i bu sorunu manual fetch ile çözmüş. Recovery 
link için aynı pattern gerekir. supabaseAdmin.ts'teki extractInviteHash 
fonksiyonunu generic'leştirip extractAuthHash(type: 'recovery'|'invite', 
email, appBase) haline getirmek en temiz yol.

═══════════════════════════════════════════════════════════
(II) Jury session browser refresh persistence
═══════════════════════════════════════════════════════════

Mevcut e2e/jury/resume.spec.ts 1 test: "Welcome Back" text. BUNLAR YOK:
- page.reload() sonrası state persistence
- Eval step'te skor girilmiş, reload → skorlar hâlâ orada

3. e2e/jury/resume.spec.ts — 2 yeni test ekle:
   
   test("progress step — reload preserves juror identity", async ({ page }) => {
     // Juror flow: arrival → identity → PIN → progress
     const jury = new JuryPom(page);
     // ... navigate to progress step (EVAL_JURORS[0] kullan)
     await expect(jury.progressTitle()).toBeVisible();
     
     await page.reload();
     
     // Reload sonrası kullanıcı progress step'e dönmeli, tekrar identity 
     // girmek ZORUNDA OLMAMALI (session resume çalışıyor)
     await expect(jury.progressTitle()).toBeVisible({ timeout: 10_000 });
     // Veya identity input görünür mü diye kontrol et, görünmemeli
     await expect(jury.identityName()).not.toBeVisible();
   });
   
   test("eval step — reload after score input preserves DB state", async ({ page }) => {
     // Juror flow: ... → eval step
     const evalPom = new JuryEvalPom(page);
     await evalPom.waitForEvalStep();
     
     const firstInput = evalPom.allScoreInputs().first();
     await firstInput.fill("7");
     await firstInput.blur();
     
     // DB save tetiklensin
     await expect(evalPom.saveStatus()).toBeVisible(); // veya saveStatusSaving
     
     // DB'de kaydın olduğunu service role ile doğrula
     const sheets = await readRubricScores(jurorId, EVAL_PERIOD_ID);
     expect(sheets.length).toBeGreaterThan(0);
     const sevenItem = sheets[0].score_sheet_items?.find(i => i.score_value === 7);
     expect(sevenItem).toBeDefined();
     
     // RELOAD
     await page.reload();
     
     // Eval step'e döndü mü? Input'ta 7 hâlâ görünüyor mu?
     await evalPom.waitForEvalStep();
     const value = await evalPom.allScoreInputs().first().inputValue();
     expect(value).toBe("7");
   });

jurorId keşfi: EVAL_JURORS array'inden sabit bir tanesini kullan, testler 
arası state resetle (resetJurorAuth helper) beforeEach'te.

F1 RULE: juror_period_auth'a yazıyorsan session_token_hash: null 
payload'da olmalı. resetJurorAuth helper'ı zaten bunu yapıyor. O'nu 
kullan.

═══════════════════════════════════════════════════════════
(III) Edit-mode after submit
═══════════════════════════════════════════════════════════

Mevcut HİÇ yok.

Jury final_submit ettikten sonra admin edit-mode açarsa juror tekrar 
skor güncelleyebiliyor. RPC'ler:
- rpc_juror_toggle_edit_mode (admin) — src/shared/api/admin/ altında ara
- rpc_jury_upsert_score — final_submitted_at check'i var; edit_enabled 
  + edit_expires_at'a bakıyor (005_rpcs_jury.sql:508-528)

4. e2e/jury/edit-mode.spec.ts (YENİ DOSYA) — 2 test:
   
   test("admin opens edit mode → juror can update submitted scores", async () => {
     // Setup: EVAL_JURORS[1] kullan (dedicated for E5 maybe)
     // Juror final_submitted_at set + eski skorlar var (seed veya manuel)
     // adminClient ile juror_period_auth.edit_enabled=true, 
     // edit_expires_at=now()+1h set et (veya real RPC call: 
     // rpc_juror_toggle_edit_mode)
     
     // Juror session kur (session_token_hash set + plaintext token)
     // rpc_jury_upsert_score çağır, yeni skorlarla
     // Beklenen: ok=true (reddedilmedi çünkü edit_enabled=true)
     
     // DB'de score_sheet_items'ın yeni değerlere update olduğunu doğrula
   });
   
   test("edit window expired → rpc returns edit_window_expired", async () => {
     // Aynı juror
     // edit_enabled=true ama edit_expires_at=now()-1m (geçmiş)
     // rpc_jury_upsert_score → error_code='edit_window_expired'
     
     // Bonus: DB'de juror_period_auth.edit_enabled=false olarak resetlendi mi?
     //   (RPC body 514-524 bunu yapıyor)
     // readJurorAuth ile doğrula
   });

═══════════════════════════════════════════════════════════
DELIBERATELY-BREAK
═══════════════════════════════════════════════════════════

Her 3 grup için ayrı kanıt:
- (I): Recovery link URL'ini bozuk yap (`?token_hash=WRONG`) → reset 
  form error göstermeli / yeni şifre submit reddedilmeli
- (II): reload sonrası progress değil identity step'e dönmek → testi 
  FAIL et → beklenti doğru mu kanıtla
- (III): edit_enabled=false iken RPC çağır → period_closed veya 
  final_submit_required dönmeli; testi edit_enabled=true pass 
  beklentisiyle bırakırsan → FAIL olmalı

En az 2 kanıt raporda.

═══════════════════════════════════════════════════════════
DIĞER ADIMLAR
═══════════════════════════════════════════════════════════

5. Flake check: 
   npm run e2e -- --grep "recovery|resume|edit-mode" --repeat-each=3 --workers=1

6. Tam suite: ~107 + 5 = ~112

7. Rapor:
   docs/superpowers/plans/session-e-e2e-depth-phase-2/implementation_reports/E5-auth-deepening.md
   - Pass-rate delta
   - Yeni helpers (extractAuthHash generic'leştirildi mi)
   - Recovery flow setup kısıtlamaları (redirect_to whitelist)
   - Edit-mode RPC gerçek imzası
   - 2+ deliberately-break kanıtı
   - Session persistence: browser storage policy ile uyumlu mu

8. Commit:
   git add e2e/auth/forgot-password.spec.ts e2e/jury/resume.spec.ts 
           e2e/jury/edit-mode.spec.ts e2e/helpers/supabaseAdmin.ts 
           docs/.../E5-auth-deepening.md
   git commit -m "test(e2e): E5 — auth deepening (recovery + session reload + edit-mode)"

═══════════════════════════════════════════════════════════
DOKUNMA / DİKKAT
═══════════════════════════════════════════════════════════

- e2e/helpers/outcomeFixture.ts — E1-fix paralel, dokunma
- e2e/helpers/scoringFixture.ts — E3 değiştiriyor, dokunma
- supabaseAdmin.ts — extractAuthHash generic fonksiyon ekleme, mevcut 
  generateRecoveryLink zaten var. E1-fix ve E3 buraya dokunmuyor → 
  conflict yok
- EVAL_JURORS hardcoded array: C1 evaluate testleri de kullanıyor. 
  beforeEach'te resetJurorAuth ile state sıfırla (F1 rule).
- e2e/legacy/ — dokunma

═══════════════════════════════════════════════════════════
KURALLAR
═══════════════════════════════════════════════════════════

- F1: juror_period_auth reset payload'da session_token_hash: null
- --workers=1 flake check (F1)
- Deliberately-break 3 ayrı (3 farklı konsept için)
- Commit yap, push etme
- Takıldığın yerde sor — özellikle recovery redirect whitelist ve 
  edit-mode RPC imzası

Sprint zorluk: Orta. 3 farklı konsept, pattern aynı.
Tahmin ~1.5-2 saat.

Hazırsan başla.
```
