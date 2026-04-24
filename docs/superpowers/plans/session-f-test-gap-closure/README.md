# Session F — Unit Test Gap Closure

**Başlangıç notları:** 2026-04-25
**Status:** Planlandı, başlatılmadı
**Ön koşul:** Session D bitti (P0 → P1 → P2 → P2-Fix → P3-Deno)

---

## Motivasyon

Session D'nin dürüst sonu:

> Suite matematik hatalarını yakalar, seçilmiş 6-7 kritik jüri/auth akışının davranış regresyonlarını yakalar, geri kalan admin UI yüzeyinde, ranking pipeline'ında, tenant isolation boundary'sinde, audit matrix'inde, 13 edge function'da ve A4-A6 shallow mirasında tamamen kör.

**1016/1016 pass** pazarlama rakamı. Session F bu rakamın **gerçekten anlamlı** olmasını hedefliyor.

---

## Kapanacak 5 grup

| Grup | Kapsam | Tür |
|------|--------|-----|
| **E1 — Mimari/kod düzeltme** | `rpc-proxy` inconsistency kararı, cross-org client-side defensive filter | Kaynak kod + dok |
| **E2 — Shallow mop-up (Grup A)** | A4-A6'dan kalan ~92 shallow test — **agresif silme** stratejisi | Mekanik + yargı |
| **Ea — Audit matrix (Grup C)** | 40+ admin RPC wrapper'ının audit log coverage'ı | Mekanik, tekrarlı |
| **E3 — Eksik iş mantığı (Grup B)** | Ranking compute, criteria weight apply, `useJuryState` step guard **doğrudan**, token private helper'ları | P1 tipinde iş |
| **E4 — Edge function long-tail (Grup D)** | 13 function'dan **8 kritik** (5 mail şablonu atlanır) | P3-Deno pattern tekrarı |

---

## Sıra ve paralel yürütme

```
Window 1:      [E1 solo] — kod şekli önce netleşmeli
Windows 2-5:   [E2 main] + [Ea paralel arka plan agent]
Windows 6-7:   [E3 solo]
Windows 8-10:  [E4 solo]
```

**Toplam:** ~9 window (paralel olmadan 11-13)

---

## Kararlar (karar verildi, değişmez)

### D — 8 kritik edge function seçimi

**Test edilecek (8):**
1. `on-auth-event` — Auth event routing, tenant setup
2. `request-score-edit` — Score edit izni, tenant boundary
3. `send-export-report` — 345 LOC, size limit, tenant isolation
4. `auto-backup` — Data integrity
5. `notify-maintenance` — 402 LOC, queue delivery
6. `receive-email` — Inbound routing
7. `password-reset-email` — Rate limit + token
8. `email-verification-send` — Verification token lifecycle

**Atlanacak (5 — Known Gaps'e belgelenecek):**
- `notify-juror`, `send-juror-pin-email`, `send-entry-token-email`, `password-changed-notify`, `notify-unlock-request` → mail şablonu, düşük değer

**Session F sonu hedef:** 12/21 gerçek Deno kapsam (21/21 değil — gerçekçi).

### A — Agresif silme + boşluk bayraklama

**Strateji:** 70-80 dosya sil, 12-22 yükselt.

**Sebep:** 1016 test 800 test + 216 yalan'dan daha iyi değil. Shallow'ı yükseltmek sıfırdan yazmakla aynı maliyet — korumak ekonomik değil.

**Tek kural:** Silme öncesi öksüz component kontrolü.

```bash
grep -l "import.*<Component>" src/**/*.test.*
```

Başka test dosyası varsa sil. Yoksa → minimal gerçek test yaz ya da Known Gaps'e kabul edilmiş zero-cov olarak belgele. **Sessiz coverage kaybı yasak.**

### C — Paralel agent ile hızlandırma

**C agent scope (katı):**
- Dokunabileceği dosyalar: `src/shared/api/admin/__tests__/auditLogCompleteness.test.js` + `src/test/qa-catalog.json` (`audit.completeness.*` namespace)
- Diğer dosyalara dokunma yasak

Bu disiplin sayesinde A ile çakışmaz (A admin test dosyalarında silme yapacak; C sadece audit file'ı genişletir).

---

## Model seçimi (faz başına)

| Faz | Model | Neden |
|-----|-------|-------|
| E1 | **Opus** | Kaynak kod değişikliği, çok katmanlı karar |
| E2 | **Sonnet** | Mekanik silme + upgrade — görev tasarımı sübjektivite minimum |
| Ea | **Sonnet** | Yapısal tekrar — her RPC × spy pattern |
| E3 | **Opus** | `useJuryState` step guard + ranking compute çok katmanlı |
| E4 | **Sonnet** | P3-Deno pattern'inin tekrarı, harness hazır |

---

## Session F sonu beklenen durum

| Metrik | Şu an | Session F sonu |
|--------|-------|----------------|
| Vitest test | 934 | ~900 (silme + eklenti) |
| Deno test | 82 | ~130 (8 function × 6 test ort.) |
| Toplam | 1016 | ~1030 |
| Shallow oranı | ~%70 | **~%25-30** |
| Gerçek regression koruma | ~%30 | **~%70** |
| Kapsanan edge function | 8/21 | 12/21 |
| Audit coverage (admin RPC) | 5/40+ | 35+/40+ |
| Ranking compute | 0 test | izole test |
| Criteria weight apply | 0 test | sum=100 zorlama test |
| Cross-org boundary | belgeli, closure yok | **closure** (kod + test) |

---

## Açık sorular (Session F başlarken cevaplanacak)

1. **E1 `rpc-proxy` kararı:** ✅ Kapatıldı. Dosya hiç yok (`supabase/functions/rpc-proxy/` dizini yok, `src/` içinde `USE_PROXY` referansı yok). CLAUDE.md'deki stale paragraf silindi. E1 grubundan çıktı.
2. **A öksüz component kontrolü:** 92 dosyadan kaç tanesi öksüz bırakacak? Ön tarama yapılmadı. İlk iş bu olur.
3. **C paralel agent platformu:** Arka plan `Agent` tool ile mi yürütelim yoksa ayrı terminal/conversation mı?
4. **E4 için hedef genişletme:** 5 atlanan mail function'ı için minimum smoke test (var mı / doğru env'e fetch atıyor mu) mantıklı mı, yoksa tamamen dışarıda mı bıraksak?

---

## İlgili dokümanlar

- Session D denetim: `../session-d-unit-test-quality-audit/README.md`
- Session D implementation reports: `../session-d-unit-test-quality-audit/implementation_reports/`
- P3-Deno pattern referansı: `../session-d-unit-test-quality-audit/P3-deno-edge-coverage-plan.md`
- Shared mock factory: `src/test/adminApiMocks.js`
- Deno harness: `supabase/functions/_test/`

---

## Sonraki adım

Session F başlatılacağında:

1. Bu dokümanı güncelle (açık soruları cevapla)
2. `implementation_reports/` dizini aç
3. E1 promptu yaz → çalıştır
4. E2 + Ea promptlarını yaz → paralel çalıştır
5. Her faz sonrası sadece raporu değil, **koddan da doğrula** (Session D'deki gibi)

> **Session D öğrenimi:** Agent raporu ≠ gerçek teslim. Her faz sonunda grep/read ile denetle. P2-Fix buradan doğdu.
