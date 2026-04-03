# VERA v1 DB Migration — Uygulama Planı

> **Tarih:** 2026-04-02
> **Durum:** Onay bekliyor
> **Referans:** `docs/superpowers/plans/db-migration/00-canonical-model-and-role-review.md`

---

## Bağlam

Mevcut veritabanı (14 tablo, sabit kodlanmış `technical/written/oral/teamwork` skor
kolonları) prototype'ın dinamik kriter yapısını desteklemiyor. Canonical model dokümanı
19 tablolu normalize edilmiş modeli tanımlıyor. Bu plan o modeli 8 fazda implement eder.

**Temel strateji:** `scores_compat` VIEW sayesinde mevcut admin sayfaları sıfır değişiklik
ile çalışmaya devam eder. Jüri yazma yolu normalize modele geçer, admin okuma yolu compat
view üzerinden çalışır.

**Seed stratejisi:** Mevcut `sql/seeds/002_demo_premium_seed.sql` eski şemaya (flat scores,
`short_name`, `outcomes`, `criteria_config` JSONB) bağımlıydı — sıfırdan yeniden yazıldı.
Yeni seed: `sql/seeds/1_demo_premium_seed.sql` (4104 satır). Detaylı gereksinimler
`docs/superpowers/plans/db-migration/seed_generation_prompt.md` dosyasında tanımlı.
**✅ Faz 4B tamamlandı.**

**Raporlama:** Her tamamlanan faz için ayrı bir implementation raporu oluşturulacak.
Raporlar `docs/superpowers/plans/db-migration/implementation_reports/` altında tutulacak.
Dosya adı formatı: `phase-1-implementation-summary.md`, `phase-2-implementation-summary.md`, vb.

---

## Faz 1: Arşivleme + Yeni Şema (001-004)

**Amaç:** Eski migration dosyalarını arşivle, yeni identity/framework/period/execution
tablolarını yaz.

### Adım 1.1 — Eski migration'ları arşivle

```bash
mkdir -p sql/migrations-v0
mv sql/migrations/001_schema.sql sql/migrations-v0/
mv sql/migrations/002_rls_policies.sql sql/migrations-v0/
mv sql/migrations/003_jury_rpcs.sql sql/migrations-v0/
mv sql/migrations/004_triggers.sql sql/migrations-v0/
```

Supabase migration'larına dokunma — bunlar prod'da uygulanmış, ayrı kalsın.

### Adım 1.2 — `sql/migrations/001_extensions.sql` oluştur

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Adım 1.3 — `sql/migrations/002_identity.sql` oluştur

Tablolar: `organizations`, `profiles`, `memberships`, `org_applications`

Mevcut şemadan farklar:

- `organizations`: `code TEXT UNIQUE NOT NULL` ekle, `institution_name TEXT` ekle, `settings JSONB DEFAULT '{}'` ekle, `updated_at TIMESTAMPTZ` ekle; `short_name` → `code` olarak yeniden adlandır
- `memberships.role`: CHECK değerleri `org_admin|super_admin` (eskiden `admin|super_admin`)
- `tenant_applications` → `org_applications` olarak yeniden adlandır: status CHECK'e `cancelled` ekle
- Yardımcı fonksiyon: `current_user_is_super_admin()` (eski 002_rls_policies.sql'den al)

### Adım 1.4 — `sql/migrations/003_frameworks.sql` oluştur

Tablolar: `frameworks`, `framework_outcomes`, `framework_criteria`, `framework_criterion_outcome_maps`

Mevcut şemadan farklar:

- `frameworks`: `version TEXT`, `default_threshold NUMERIC DEFAULT 70`, `outcome_code_prefix TEXT DEFAULT 'PO'` ekle
- `outcomes` → `framework_outcomes` olarak yeniden adlandır
- YENİ: `framework_criteria` tablosu (key, label, short_label, description, max_score, weight, color, rubric_bands JSONB, sort_order)
- `criterion_outcome_mappings` → `framework_criterion_outcome_maps`: `criterion_key TEXT` yerine `framework_criteria(id)`'ye FK

### Adım 1.5 — `sql/migrations/004_periods_and_execution.sql` oluştur

Tablolar: `periods`, `projects`, `jurors`

Mevcut şemadan farklar:

- `periods`: `criteria_config JSONB` ve `outcome_config JSONB` KALDIR; `poster_date DATE`, `snapshot_frozen_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ` EKLE
- `projects`: `members TEXT` → `members JSONB DEFAULT '[]'`; `advisor TEXT` → `advisor_name TEXT` + `advisor_affiliation TEXT` olarak böl; `project_no INT` ve `updated_at TIMESTAMPTZ` EKLE; `UNIQUE(period_id, project_no) WHERE project_no IS NOT NULL` ekle
- `jurors`: `avatar_color TEXT` ve `updated_at TIMESTAMPTZ` EKLE

### Faz 1 Doğrulama

- 4 dosya sözdizimi hatası vermeden parse edilir
- Eski dosyalar güvenle `sql/migrations-v0/` altında
- Frontend'de değişiklik yok — hiçbir şey kırılmaz

---

## Faz 2: Snapshot'lar + Puanlama (005-006)

**Amaç:** Snapshot tabloları + normalize puanlama + uyumluluk view'ı oluştur.

### Adım 2.1 — `sql/migrations/005_snapshots.sql` oluştur

Tablolar: `period_criteria`, `period_outcomes`, `period_criterion_outcome_maps`

RPC: `rpc_period_freeze_snapshot(p_period_id UUID) RETURNS JSON`

- Period'un var olduğunu ve `framework_id`'si olduğunu doğrula
- `snapshot_frozen_at IS NULL` kontrol et (idempotent — zaten dondurulmuşsa ok dön)
- `framework_criteria`'dan `period_criteria`'ya INSERT...SELECT
- `framework_outcomes`'dan `period_outcomes`'a INSERT...SELECT
- `framework_criterion_outcome_maps`'den `period_criterion_outcome_maps`'e INSERT...SELECT
- `periods` tablosunda `snapshot_frozen_at = now()` güncelle
- `{ok: true, criteria_count, outcomes_count}` döndür
- `GRANT EXECUTE TO authenticated`

### Adım 2.2 — `sql/migrations/006_scoring.sql` oluştur

Tablolar: `score_sheets`, `score_sheet_items`

**score_sheets:**

```sql
CREATE TABLE score_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  juror_id UUID NOT NULL REFERENCES jurors(id) ON DELETE CASCADE,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_progress','submitted')),
  started_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(juror_id, project_id)
);
```

**score_sheet_items:**

```sql
CREATE TABLE score_sheet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_sheet_id UUID NOT NULL REFERENCES score_sheets(id) ON DELETE CASCADE,
  period_criterion_id UUID NOT NULL REFERENCES period_criteria(id),
  score_value NUMERIC CHECK (score_value >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(score_sheet_id, period_criterion_id)
);
```

**Uyumluluk View'ı** — en kritik parça:

```sql
CREATE OR REPLACE VIEW scores_compat AS
SELECT
  ss.id,
  ss.juror_id,
  ss.project_id,
  ss.period_id,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'technical') AS technical,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'design') AS written,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'delivery') AS oral,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'teamwork') AS teamwork,
  ss.comment AS comments,
  ss.created_at,
  ss.updated_at
FROM score_sheets ss
LEFT JOIN score_sheet_items ssi ON ssi.score_sheet_id = ss.id
LEFT JOIN period_criteria pc ON pc.id = ssi.period_criterion_id
GROUP BY ss.id;
```

Not: VIEW `design→written` ve `delivery→oral` eşlemesi yapar, eski DB kolon adlarıyla
uyumlu olsun diye. Bu sayede `fieldMapping.js` (`dbScoresToUi`) değişiklik olmadan çalışmaya
devam eder.

**İndeksler:**

```sql
CREATE INDEX idx_score_sheets_period ON score_sheets(period_id);
CREATE INDEX idx_score_sheets_juror ON score_sheets(juror_id);
CREATE INDEX idx_score_sheet_items_sheet ON score_sheet_items(score_sheet_id);
```

### Faz 2 Doğrulama

- `scores_compat` VIEW, eski `scores` tablosuyla aynı yapıda sonuç döndürür
- Snapshot RPC elle çağrıldığında çalışır

---

## Faz 3: Kimlik Doğrulama + Jüri RPC'leri (007)

**Amaç:** Normalize puanlama için jüri RPC'lerini yeniden yaz.

### Adım 3.1 — `sql/migrations/007_auth_and_tokens.sql` oluştur

Tablolar: `juror_period_auth`, `entry_tokens`

**juror_period_auth** mevcut şemadan farklar:

- `pin TEXT` → `pin_hash TEXT` (bcrypt)
- `session_expires_at TIMESTAMPTZ` EKLE
- `edit_reason TEXT` EKLE
- `edit_expires_at TIMESTAMPTZ` EKLE
- `locked_at TIMESTAMPTZ` EKLE

**entry_tokens** farklar:

- `last_used_at TIMESTAMPTZ` EKLE

> **Güvenlik notu (Faz 3 sonrası patch):** İki alan raw TEXT olarak saklanıyor:
>
> 1. `entry_tokens.token TEXT` — 24h TTL var ama DB sızıntısında aktif token'lar anında
>    kullanılabilir. Çözüm: `token_hash TEXT` (SHA-256), doğrulamada `digest(p_token, 'sha256')`.
> 2. `juror_period_auth.session_token TEXT` — 12h TTL var, aynı risk profili. Çözüm: aynı
>    SHA-256 pattern — `session_token_hash TEXT` olarak sakla, doğrulamada hash karşılaştır.
>
> bcrypt gerekmez (her iki değer de yüksek entropili — brute-force riski yok).
> **✅ Çözüldü: `009_security_hash_tokens.sql` patch migration'ı ile uygulandı.**

### Adım 3.2 — Jüri RPC'leri (aynı dosyada)

**`rpc_jury_authenticate`** — çoğunlukla aynı mantık, PIN artık bcrypt hash olarak saklanır:

- 4 haneli PIN üret
- `crypt(pin, gen_salt('bf'))` olarak `pin_hash`'te sakla
- Plain PIN'i yanıtta bir kerelik döndür (`pin_plain_once`)
- İmza değişmez: `(p_period_id UUID, p_juror_name TEXT, p_affiliation TEXT, p_force_reissue BOOLEAN DEFAULT false) RETURNS JSON`

**`rpc_jury_verify_pin`** — bcrypt ile doğrula:

- Değişiklik: `WHERE pin = p_pin` → `WHERE pin_hash = crypt(p_pin, pin_hash)`
- EKLE: kilitleme tetiklendiğinde `locked_at = now()` ata
- EKLE: başarılı girişte `session_expires_at = now() + interval '12 hours'` ata
- İmza değişmez: `(p_period_id UUID, p_juror_name TEXT, p_affiliation TEXT, p_pin TEXT) RETURNS JSON`

**`rpc_jury_validate_entry_token`** — aynı mantık + `last_used_at` güncelle:

- EKLE: `UPDATE entry_tokens SET last_used_at = now() WHERE id = v_token_row.id`
- İmza değişmez: `(p_token TEXT) RETURNS JSON`

**`rpc_jury_upsert_score`** — normalize model için SIFIRDAN YAZILDI:

```sql
CREATE OR REPLACE FUNCTION rpc_jury_upsert_score(
  p_period_id UUID,
  p_project_id UUID,
  p_juror_id UUID,
  p_session_token TEXT,
  p_scores JSONB,        -- [{key: "technical", value: 28}, ...]
  p_comment TEXT DEFAULT NULL
) RETURNS JSON
```

Mantık:

1. Session token + period kilitli değil doğrula (mevcut ile aynı)
2. `score_sheets` UPSERT (ON CONFLICT juror_id, project_id)
3. `p_scores` JSONB dizisindeki her öğe için:
   - `period_criteria`'da (period_id, key) ile `period_criterion_id` bul
   - `score_sheet_items` UPSERT (ON CONFLICT score_sheet_id, period_criterion_id)
4. `score_sheets.last_activity_at = now()` güncelle
5. `score_sheets.status`'u öğe sayısı / kriter sayısına göre güncelle
6. `juror_period_auth.last_seen_at = now()` güncelle
7. `{ok: true, score_sheet_id, total}` döndür

**`rpc_jury_finalize_submission`** — minimal değişiklik:

- Aynı mantık, `final_submitted_at` atar
- İmza değişmez

**`rpc_admin_approve_application`** — değişiklik yok, eski 003'ten kopyala

**Ek RPC'ler:**

- `rpc_juror_reset_pin(p_period_id UUID, p_juror_id UUID) RETURNS JSON` — admin işlemi
- `rpc_juror_toggle_edit_mode(p_period_id UUID, p_juror_id UUID, p_enabled BOOLEAN, p_reason TEXT DEFAULT NULL, p_duration_hours INT DEFAULT 2) RETURNS JSON`
- `rpc_juror_unlock_pin(p_period_id UUID, p_juror_id UUID) RETURNS JSON`
- `rpc_entry_token_generate(p_period_id UUID) RETURNS JSON`
- `rpc_entry_token_revoke(p_token_id UUID) RETURNS JSON`

### Faz 3 Doğrulama

- `rpc_jury_upsert_score` JSONB parametresiyle çalışır
- Normalize insert sonrası `scores_compat` VIEW doğru veri döndürür
- PIN bcrypt doğrulaması çalışır

---

## Faz 4: Denetim + RLS (008)

**Amaç:** Denetim trigger'ları, RLS politikaları.

### Adım 4.1 — `sql/migrations/008_audit_and_rls.sql` oluştur

**Trigger fonksiyonları:** (eski 004_triggers.sql'den uyarlanmış)

- `trigger_set_updated_at()` — uygulanacak tablolar: score_sheets, score_sheet_items, organizations, periods, projects, jurors, juror_period_auth
- `trigger_audit_log()` — uygulanacak tablolar: organizations, periods, projects, jurors, score_sheets, memberships, entry_tokens

**RLS Politikaları:** (eski 002_rls_policies.sql'den uyarlanmış)

- Mevcut 14 tablonun tüm politikaları (yeniden adlandırmalara uyarlanmış)
- YENİ: `score_sheets` — period_id üzerinden org kapsamlı
- YENİ: `score_sheet_items` — score_sheet → period → org üzerinden
- YENİ: `period_criteria` — period → org üzerinden org kapsamlı
- YENİ: `period_outcomes` — aynı yöntem
- YENİ: `period_criterion_outcome_maps` — aynı yöntem
- YENİ: `framework_criteria` — framework → org üzerinden org kapsamlı
- YENİ: `framework_criterion_outcome_maps` — aynı yöntem

### Faz 4 Doğrulama

- `npm run build` geçer
- Tüm RLS politikaları uygulanmış
- Denetim trigger'ları INSERT/UPDATE/DELETE işlemlerinde tetiklenir

---

## Faz 4B: Premium Demo Seed Yeniden Yazımı

**Amaç:** `sql/seeds/002_demo_premium_seed.sql` dosyasını yeni canonical şemaya uygun
olarak sıfırdan yeniden yaz. Eski flat scores, `short_name`, `outcomes`, `criteria_config`
JSONB referansları tamamen kaldırılacak.

**Kaynak doküman:** `docs/superpowers/plans/db-migration/seed_generation_prompt.md`
— bu dokümandaki TÜM gereksinimlere birebir uyulmalı.

### Adım 4B.1 — `sql/seeds/002_demo_premium_seed.sql` dosyasını sıfırdan yeniden yaz

Mevcut dosya (1163 satır) eski şemaya bağımlı. Tamamen sil ve sıfırdan yaz.

**Hedef tablolar (seed sırası):**

```text
 1. organizations        — 6 org: TEDU EE, CMU CS, TEKNOFEST, TUBITAK 2204-A, IEEE AP-S SDC, CanSat
 2. frameworks           — 6 framework, her org için 1 default
 3. framework_outcomes   — org'a özel outcome setleri
 4. framework_criteria   — org'a özel kriter setleri (prompt'taki key'leri kullan)
 5. framework_criterion_outcome_maps — birincil/ikincil ağırlıklandırma modeli
 6. periods              — her org için 1 aktif + 3 tarihsel = 24 period
 7. period_criteria      — snapshot: framework_criteria'dan kopyala, her period için ayrı
 8. period_outcomes      — snapshot: framework_outcomes'dan kopyala
 9. period_criterion_outcome_maps — snapshot: maps kopyala
10. projects             — TEDU EE: 10, diğer org'lar: 4-6; members JSONB, advisor_name + advisor_affiliation
11. jurors               — org başına 4-10; gerçekçi Türk + uluslararası isimler
12. juror_period_auth    — karışık durumlar: active, blocked, locked, edit_enabled, finalized; pin_hash bcrypt
13. entry_tokens         — active, expired, revoked, last_used_at çeşitli
14. score_sheets + score_sheet_items — NORMALİZE: flat scores kullanma!
15. audit_logs           — zengin aktivite akışı
```

### Adım 4B.2 — Seed veri gereksinimleri (prompt'tan)

**Organizasyonlar:** Kademeli yoğunluk:

- TEDU EE = en zengin veri seti (ana demo)
- CMU CS + TEKNOFEST = orta yoğunluk
- TUBITAK, IEEE, CanSat = daha hafif ama gerçekçi

**Kriterler:** Her org için prompt'ta tanımlı org'a özel kriter key'lerini kullan:

- TEDU EE: `technical_depth`, `engineering_design`, `experimental_validation`, `communication`, `teamwork`
- CMU CS: `problem_solving`, `system_design`, `implementation_quality`, `communication`, `teamwork`
- TEKNOFEST: `preliminary_report`, `critical_design`, `technical_performance`, `team_execution`
- CanSat: `design_compliance`, `mission_execution`, `data_and_documentation`, `safety_and_recovery`
- TUBITAK: `originality`, `scientific_method`, `impact_and_presentation`
- IEEE: `creativity`, `technical_merit`, `application_and_presentation`

**Puanlama desenleri (senaryo odaklı):**

- Yıldız performans (düşük varyans)
- Yüksek varyanslı proje
- Sınırda / dikkat gerektiren
- Zayıf iletişim, güçlü teknik
- Güçlü takım çalışması, zayıf teknik
- Tamamlanmamış / kısmi değerlendirmeler
- Geç gönderilmiş ama güçlü
- Bazı jüri-proje kombinasyonlarında score_sheet YOK (başlanmamış)
- Bazı score_sheet'ler kısmi (eksik item'lar)
- Sert vs cömert jüri farklılıkları

**Jüri kimlik doğrulama durumları:**

- Normal aktif
- `edit_enabled = true` (birkaç tane)
- `failed_attempts > 0` (birkaç tane)
- `locked_until` atanmış (kilitli)
- `is_blocked = true` (admin tarafından engellenmiş)
- Sonlandırılmış (`final_submitted_at` atanmış)
- `edit_reason` + `edit_expires_at` (düzenleme modu açık)

**PIN hash:** `pin_hash` alanı için `crypt('1234', gen_salt('bf'))` bcrypt hash kullan.
Düz metin PIN seed'leme.

**Giriş token'ları:** Aktif, süresi dolmuş, iptal edilmiş, yakın zamanda kullanılmış
(`last_used_at`) karışımı.

**Denetim logları:** Zengin aktivite akışı:

- `juror_added`, `project_imported`, `token_generated`, `token_revoked`
- `score_submitted`, `score_updated`, `juror_login_failed`, `pin_locked`
- `period_locked`, `snapshot_frozen`, `application_approved`, `application_rejected`

### Adım 4B.3 — Uygulama kuralları

1. **İdempotent:** `ON CONFLICT DO NOTHING`, belirleyici UUID'ler, `WHERE NOT EXISTS`
2. **Belirleyici:** Sabit zaman damgaları, `SELECT setseed(0.20260402)` ile başla
3. **BEGIN/COMMIT** transaction sarmalayıcı
4. **001_seed.sql uyumluluğu:** Demo admin/profil kayıtlarını bozma
5. **Eski yapılar yok:** `scores` tablosuna INSERT yapma, `criteria_config` kullanma
6. **Gerçekçi zaman damgaları:** Son 6 ay içinde, aktif period için son 2 hafta yoğunluklu
7. **Üyeler JSONB formatı:** `'[{"name":"Ali Yılmaz","order":1},{"name":"Ayşe Demir","order":2}]'::jsonb`
8. **Snapshot tutarlılığı:** `period_criteria` satırları ilgili `framework_criteria`'dan kopyalanmış olmalı

### Adım 4B.4 — scores_compat VIEW doğrulaması

Seed sonrası `scores_compat` VIEW'in doğru çalışması için:

- score_sheet_items'daki `period_criterion_id` doğru `period_criteria` satırlarına FK olmalı
- `period_criteria.key` değerleri org'a özel olmalı (yukarıdaki key'ler)
- `scores_compat` VIEW sadece `technical/design/delivery/teamwork` key'li kriterler için
  düz projeksiyon yapar — org'a özel key'ler için çalışmaz (beklenen davranış, compat view
  TEDU eski uyumluluk içindir)

### Faz 4B Doğrulama

- SQL sözdizimi kontrolü: `psql -f sql/seeds/002_demo_premium_seed.sql` hatasız çalışır
- Tüm 18 tabloya veri eklenmiş
- `score_sheets` + `score_sheet_items` var, düz `scores` tablosuna INSERT yok
- `period_criteria` satırları `framework_criteria`'dan doğru kopyalanmış
- Jüri kimlik doğrulama durumları çeşitli (aktif, kilitli, engellenmiş, sonlandırılmış, düzenleme)
- Giriş token'ları çeşitli (aktif, süresi dolmuş, iptal edilmiş)
- Denetim logları zengin ve çeşitli
- TEDU EE en zengin veri seti, diğer org'lar kademeli
- Yaklaşık: 6 org, 6 framework, 24 period, 100+ proje, 36+ jüri, 400+ score_sheets, 1500+ score_sheet_items, 80+ audit_logs

---

## Faz 5: Frontend Jüri Yolu

**Amaç:** Jüri puanlama hook'ları normalize modele geçer. Admin tarafına dokunulmaz.

### Adım 5.1 — `src/shared/api/juryApi.js` güncelle

**`upsertScore()` fonksiyonu yeniden yazımı:**

Mevcut imza:

```javascript
export async function upsertScore(periodId, projectId, jurorId, sessionToken, scores, comment)
```

Yeni uygulama:

```javascript
export async function upsertScore(periodId, projectId, jurorId, sessionToken, scores, comment, criteriaConfig) {
  // Düz {technical: 28, design: 25, ...} nesnesini JSONB dizisine dönüştür
  // [{key: "technical", value: 28}, {key: "design", value: 25}, ...]
  const p_scores = (criteriaConfig || CRITERIA).map(c => ({
    key: c.key || c.id,
    value: scores[c.id] ?? scores[c.key] ?? null
  })).filter(s => s.value !== null && s.value !== undefined);

  const { data, error } = await supabase.rpc("rpc_jury_upsert_score", {
    p_period_id: periodId,
    p_project_id: projectId,
    p_juror_id: jurorId,
    p_session_token: sessionToken,
    p_scores: p_scores,
    p_comment: comment || null,
  });
  // ... hata yönetimi mevcut ile aynı
}
```

Kritik: fonksiyon hâlâ hook'lardan gelen düz `scores` nesnesini kabul eder — dahili olarak
JSONB dizisine dönüştürür. Bu sayede **puanlama hook'larında sıfır değişiklik** gerekir.

**`listProjects()` fonksiyonu güncellemesi:**

- `scores` tablosu yerine `scores_compat` view'ından sorgula
- Geri kalan aynı — `dbScoresToUi()` çalışmaya devam eder çünkü compat view
  `technical, written, oral, teamwork` döndürür

### Adım 5.2 — `src/shared/api/fieldMapping.js` güncelle

Değişiklik gerekmez! Compat view eski `scores` tablosuyla aynı kolon adlarını döndürür.
`dbScoresToUi()` ve `uiScoresToDb()` çalışmaya devam eder.

`uiScoresToDb()` artık `upsertScore()`'dan çağrılmıyor (JSONB dizisi yerine geçti), ama
fonksiyonu geriye uyumluluk için tut — başka yerlerde kullanılıyor olabilir.

### Adım 5.3 — `src/jury/hooks/useJuryAutosave.js` güncelle

**`writeGroup()` fonksiyonu güncellemesi:**

Tek değişiklik: `upsertScore`'a `criteriaConfig` geç:

```javascript
// Mevcut:
await upsertScore(periodId, projectId, jurorId, sessionToken, snapshot.normalizedScores, comment);

// Yeni:
await upsertScore(periodId, projectId, jurorId, sessionToken, snapshot.normalizedScores, comment, stateRef.current.criteriaConfig);
```

Geri kalan her şey aynı — `buildScoreSnapshot()`, tekilleştirme mantığı, hata yönetimi.

### Adım 5.4 — Snapshot dondurma entegrasyonu

`src/jury/hooks/useJurySessionHandlers.js` içinde veya `_loadSemester`/`_loadPeriod`'un
bulunduğu yerde:

- Period yüklendikten sonra, projeler yüklenmeden önce, gerekirse snapshot dondur:

```javascript
// Period'un framework'ü var ama snapshot'ı yoksa dondur
if (periodInfo.framework_id && !periodInfo.snapshot_frozen_at) {
  await supabase.rpc('rpc_period_freeze_snapshot', { p_period_id: periodId });
}
```

Bu, puanlama başlamadan önce kriterlerin snapshot'landığını garanti eder.

### Adım 5.5 — `src/shared/api/juryApi.js` — `listProjects` güncelle

Skor sorgusunu `scores` yerine `scores_compat`'tan oku:

```javascript
// Mevcut: .from("scores")
// Yeni: .from("scores_compat")
```

### Faz 5 Doğrulama

- `npm run dev` — jüri akışı uçtan uca çalışır
- Bir proje puanla → `score_sheets` ve `score_sheet_items` tablolarında normalize veri var
- `scores_compat` view doğru düz veri döndürür
- Admin sayfaları hâlâ çalışır (değişiklik yok, compat view üzerinden okur)
- Çalıştır: `npm test -- --run src/jury/__tests__/`

---

## Faz 6: Frontend Admin API

**Amaç:** Admin API'nin scores.js dosyası compat view üzerinden çalışsın.

### Adım 6.1 — `src/shared/api/admin/scores.js` güncelle

**`getScores(periodId)` güncellemesi:**

```javascript
// Değişiklik: .from("scores") → .from("scores_compat")
// Geri kalan her şey aynı — alan adları eşleşir
```

**`getProjectSummary(periodId)` güncellemesi:**

```javascript
// Değişiklik: .from("scores") → .from("scores_compat")
// AVG hesaplamaları aynı — compat view aynı kolonlara sahip
```

**`getOutcomeTrends(periodIds)` güncellemesi:**

```javascript
// Değişiklik: .from("scores") → .from("scores_compat")
// Aynı toplama mantığı
```

**`listJurorsSummary(periodId)` güncellemesi:**

- Bu zaten `juror_period_auth` + `jurors`'dan okuyor — skor kolon referansı yok
- Tek değişiklik: eğer skorları sayıyorsa `.from("scores")` → `.from("scores_compat")`

### Adım 6.2 — `src/admin/hooks/useAdminRealtime.js` güncelle

Gerçek zamanlı aboneliği değiştir:

```javascript
// Mevcut: .channel('scores-changes').on('postgres_changes', { table: 'scores' }, ...)
// Yeni: .channel('scores-changes').on('postgres_changes', { table: 'score_sheets' }, ...)
```

`score_sheet_items` değişikliklerine de abone ol (veya sadece `score_sheets` — item'lar
cascade eder).

### Adım 6.3 — Doğrudan `scores` tablosuna referans veren admin hook'ları güncelle

`useAdminData.js`, `useAnalyticsData.js` kontrol et — eğer API fonksiyonlarını çağırıyorlarsa
değişiklik gerekmez (API tablo adını yönetir). Eğer doğrudan Supabase sorgusu yapıyorlarsa
tablo adını güncelle.

### Faz 6 Doğrulama

- Tüm admin sayfaları verilerle doğru render eder
- Rankings, Analytics, Heatmap, Reviews hepsi doğru skorları gösterir
- Gerçek zamanlı güncellemeler çalışır (skor değiştir, admin paneli yenilenir)
- Çalıştır: `npm test -- --run src/admin/__tests__/`

---

## Faz 7: Dinamik Kriter Temeli

**Amaç:** Kriterler artık DB'den geliyor, statik config.js geri dönüş korunuyor.

### Adım 7.1 — API'ye `listPeriodCriteria(periodId)` ekle

`src/shared/api/admin/scores.js` veya yeni `criteria.js` dosyasında:

```javascript
export async function listPeriodCriteria(periodId) {
  const { data, error } = await supabase
    .from("period_criteria")
    .select("*")
    .eq("period_id", periodId)
    .order("sort_order");
  if (error) throw error;
  return data; // [{id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order}]
}
```

### Adım 7.2 — `src/shared/criteria/criteriaHelpers.js` güncelle

**`getActiveCriteria(config)` güncellemesi:**

```javascript
// Mevcut: period.criteria_config JSONB'den okur veya config.js CRITERIA'ya döner
// Yeni: DB'den period_criteria satırlarını kabul eder, veya config.js CRITERIA'ya döner

export function getActiveCriteria(periodCriteriaRows) {
  if (periodCriteriaRows && periodCriteriaRows.length > 0) {
    return periodCriteriaRows.map(normalizeCriterionFromDb);
  }
  return CRITERIA; // Statik geri dönüş
}

function normalizeCriterionFromDb(row) {
  return {
    id: row.key,
    key: row.key,
    label: row.label,
    shortLabel: row.short_label || row.label,
    color: row.color || '#6B7280',
    max: row.max_score,
    weight: row.weight,
    blurb: row.description || '',
    mudek: [], // period_criterion_outcome_maps üzerinden eşlenir, kriter üzerinde saklanmaz
    rubric: row.rubric_bands || [],
  };
}
```

### Adım 7.3 — Jüri yüklemesinde period kriterlerini çek

`src/jury/hooks/useJuryLoading.js` veya `useJurySessionHandlers.js` içinde:

```javascript
// Period bilgisi yüklendikten sonra period kriterlerini çek
const periodCriteria = await listPeriodCriteria(periodId);
// criteriaConfig state'ine geçir
setCriteriaConfig(periodCriteria.length > 0 ? periodCriteria : null);
```

Eğer `periodCriteria` boşsa (henüz snapshot yoksa), `getActiveCriteria(null)` config.js'ten
statik CRITERIA döndürür — geriye uyumlu.

### Adım 7.4 — `src/config.js` CRITERIA'yı statik geri dönüş olarak tut

config.js'ten CRITERIA'yı SİLME. Şu amaçlara hizmet eder:

1. Period'un snapshot'ı olmadığında geri dönüş
2. Varsayılan framework için seed veri referansı
3. Demo modu kriterleri

### Faz 7 Doğrulama

- Snapshot'lanmış period'a sahip jüri akışı DB kriterlerini kullanır
- Snapshot'sız jüri akışı config.js CRITERIA'ya döner
- Admin sayfaları hâlâ çalışır (kriter türetmesi şimdilik değişmedi)
- Tam test suite'i çalıştır: `npm test -- --run`

---

## Değiştirilen Dosyalar (Özet)

### SQL — Yeni dosyalar (8)

- `sql/migrations/001_extensions.sql`
- `sql/migrations/002_identity.sql`
- `sql/migrations/003_frameworks.sql`
- `sql/migrations/004_periods_and_execution.sql`
- `sql/migrations/005_snapshots.sql`
- `sql/migrations/006_scoring.sql`
- `sql/migrations/007_auth_and_tokens.sql`
- `sql/migrations/008_audit_and_rls.sql`

### SQL — Seed verisi (1 yeniden yazılan)

- `sql/seeds/002_demo_premium_seed.sql` — canonical şemaya uygun SIFIRDAN YAZIM

### SQL — Arşivlenen (4)

- `sql/migrations-v0/001_schema.sql`
- `sql/migrations-v0/002_rls_policies.sql`
- `sql/migrations-v0/003_jury_rpcs.sql`
- `sql/migrations-v0/004_triggers.sql`

### Frontend — Değiştirilecek (5-8 dosya)

- `src/shared/api/juryApi.js` — upsertScore JSONB dönüşümü + listProjects tablo değişikliği
- `src/jury/hooks/useJuryAutosave.js` — upsertScore'a criteriaConfig geçir
- `src/jury/hooks/useJurySessionHandlers.js` — snapshot dondurma çağrısı + period kriter yüklemesi
- `src/shared/api/admin/scores.js` — tablo adı `scores` → `scores_compat`
- `src/admin/hooks/useAdminRealtime.js` — abonelik tablo adı değişikliği
- `src/shared/criteria/criteriaHelpers.js` — DB kriter satırlarını destekle

### Frontend — Değişiklik yok (compat view karşılıyor)

- `src/shared/api/fieldMapping.js` — DEĞİŞİKLİK YOK
- `src/config.js` — DEĞİŞİKLİK YOK (geri dönüş olarak kalır)
- `src/admin/OverviewPage.jsx` — DEĞİŞİKLİK YOK
- `src/admin/RankingsPage.jsx` — DEĞİŞİKLİK YOK
- `src/admin/AnalyticsPage.jsx` — DEĞİŞİKLİK YOK
- `src/admin/HeatmapPage.jsx` — DEĞİŞİKLİK YOK
- `src/admin/ReviewsPage.jsx` — DEĞİŞİKLİK YOK
- `src/admin/scoreHelpers.js` — DEĞİŞİKLİK YOK
- `src/admin/selectors/filterPipeline.js` — DEĞİŞİKLİK YOK
- `src/jury/hooks/useJuryScoring.js` — DEĞİŞİKLİK YOK
- `src/jury/hooks/useJuryScoreHandlers.js` — DEĞİŞİKLİK YOK
- `src/jury/utils/scoreSnapshot.js` — DEĞİŞİKLİK YOK
- `src/jury/utils/scoreState.js` — DEĞİŞİKLİK YOK

---

## Doğrulama Kontrol Listesi

Tüm 8 faz (1-4, 4B, 5-7) tamamlandıktan sonra:

1. [ ] `npm run build` geçer
2. [ ] `npm test -- --run` — mevcut tüm testler geçer
3. [ ] Jüri akışı: token → kimlik → PIN → puanlama → sonlandırma çalışır
4. [ ] Skor verisi `score_sheets` + `score_sheet_items`'da görünür (normalize)
5. [ ] `scores_compat` VIEW, eski `scores` tablosu yapısıyla eşleşen düz veri döndürür
6. [ ] Admin Overview/Rankings/Analytics/Heatmap/Reviews hepsi doğru render eder
7. [ ] Gerçek zamanlı güncellemeler çalışır (skor değişikliği admin yenilemesini tetikler)
8. [ ] Period snapshot dondurma çalışır (framework → period_criteria kopyalanmış)
9. [ ] Statik CRITERIA geri dönüşü çalışır (snapshot yokken)
10. [ ] PIN bcrypt hash çalışır (hash sakla, crypt() ile doğrula)
11. [ ] Denetim logları score_sheets mutasyonlarında tetiklenir

---

## Geri Alma

Her faz bağımsız olarak geri alınabilir:

- Faz 1-4 (sadece SQL): Yeni dosyaları sil, `sql/migrations-v0/`'den geri yükle
- Faz 5-7 (frontend): Commit başına `git revert`
- Nükleer: Başlamadan önce `git tag pre-db-migration`; `git reset --hard pre-db-migration`

---

## Yanıt Formatı (ZORUNLU)

Her faz tamamlandığında aşağıdaki formatta rapor verilecek:

### Yapılanlar

- Tamamlanan işler
- Kısmen tamamlanan / dikkat gerekenler
- Sonraki faz'a kalanlar

### Dosya Değişiklikleri

- Silinen dosyalar
- Eklenen dosyalar
- Sıfırdan yazılan dosyalar
- Güncellenen dosyalar

### Şema Notları

- Canonical model ile birebir uyum açısından kritik noktalar
- Compat view'ın doğru çalıştığının teyidi

### İlerleme Tablosu Güncellemesi

Aşağıdaki tablonun ilgili satırı güncellenir.

### Mantık / Bağlantı Notları

- Hook/API/selector contract değişikliği olup olmadığı
- Frontend'de kırılma riski olan noktalar

### Uygulama Raporu

- `docs/superpowers/plans/db-migration/implementation_reports/phase-X-implementation-summary.md`
- Bu fazın detaylı uygulama raporu buraya kaydedilecek
- İlerleme tablosu `Notlar` alanında bu rapora link verilecek

### Sonraki Adım

- Sadece sıradaki faz

---

## İlerleme Tablosu

Bu tablo her faz sonunda güncellenir. `Notlar` alanında ilgili uygulama rapor dosyasına
referans verilir.

**Durum:** ✅ Tamamlandı | ⚠️ Kısmen tamamlandı / dikkat gerekiyor | ⏳ Başlanmadı
**Uyum:** Tam | Kısmi | Eksik

| Faz | Kapsam | Hedef Dosyalar | Durum | Uyum | Notlar |
|-----|--------|---------------|-------|------|--------|
| Faz 1 | Arşivleme + Kimlik + Framework'ler + Yürütme | sql/migrations/001-004 | ✅ | Tam | [Rapor](implementation_reports/phase-1-implementation-summary.md) |
| Faz 2 | Snapshot'lar + Puanlama + Compat View | sql/migrations/005-006 | ✅ | Tam | [Rapor](implementation_reports/phase-2-implementation-summary.md) |
| Faz 3 | Kimlik Doğrulama + Jüri RPC'leri | sql/migrations/007 | ✅ | Tam | [Rapor](implementation_reports/phase-3-4-implementation-summary.md) |
| Faz 4 | Denetim + RLS | sql/migrations/008 | ✅ | Tam | [Rapor](implementation_reports/phase-3-4-implementation-summary.md) |
| Patch | Güvenlik: token/session SHA-256 hash + project_no rename | sql/migrations/009 + 004 güncelleme | ✅ | Tam | `entry_tokens.token_hash`, `session_token_hash`, `group_no→project_no` |
| Faz 4B | Premium Demo Seed | sql/seeds/1_demo_premium_seed.sql | ✅ | Tam | [Rapor](implementation_reports/phase-4b-implementation-summary.md) — 4104 satır, 6 org, durum semantiği düzeltildi |
| Faz 5 | Frontend Jüri Yolu | src/shared/api/juryApi.js, hooks | ✅ | Tam | [Rapor](implementation_reports/phase-5-7-implementation-summary.md) |
| Faz 6 | Frontend Admin API | src/shared/api/admin/scores.js | ✅ | Tam | [Rapor](implementation_reports/phase-5-7-implementation-summary.md) |
| Faz 7 | Dinamik Kriter Temeli | src/shared/criteria/, hooks | ✅ | Tam | [Rapor](implementation_reports/phase-5-7-implementation-summary.md) |

### Raporlama Kuralları

- Her tamamlanan faz için ayrı bir uygulama raporu Markdown dosyası oluşturulacak
- Raporlar `docs/superpowers/plans/db-migration/implementation_reports/` altında tutulacak
- Dosya adı formatı: `phase-1-implementation-summary.md`, `phase-2-implementation-summary.md`, vb.

---

## Referans Dosyalar

- Canonical model: `docs/superpowers/plans/db-migration/00-canonical-model-and-role-review.md`
- Seed oluşturma prompt'u: `docs/superpowers/plans/db-migration/seed_generation_prompt.md`
- Mevcut şema: `sql/migrations-v0/001_schema.sql` (arşivleme sonrası)
- Mevcut RPC'ler: `sql/migrations-v0/003_jury_rpcs.sql`
- Mevcut RLS: `sql/migrations-v0/002_rls_policies.sql`
- Mevcut trigger'lar: `sql/migrations-v0/004_triggers.sql`
- Eski seed (sadece referans): `sql/seeds/001_seed.sql`
- Mevcut premium seed (yeniden yazılacak): `sql/seeds/002_demo_premium_seed.sql`
- Supabase migration'ları: `supabase/migrations/002-007` (dokunulmadı)
- UI prototype: `docs/concepts/vera-premium-prototype.html`
- Config kriterleri: `src/config.js` (CRITERIA dizisi)
- Alan eşleme: `src/shared/api/fieldMapping.js`
- Jüri API: `src/shared/api/juryApi.js`
- Admin skorları API: `src/shared/api/admin/scores.js`
- Jüri otomatik kayıt: `src/jury/hooks/useJuryAutosave.js`
- Jüri oturum yöneticileri: `src/jury/hooks/useJurySessionHandlers.js`
- Kriter yardımcıları: `src/shared/criteria/criteriaHelpers.js`
- Admin gerçek zamanlı: `src/admin/hooks/useAdminRealtime.js`

---

## Context Window Planlama (Sonnet High)

8 fazın Sonnet context window'larına dağılım analizi.

### Kısıtlar

- Her SQL migration dosyası 2000-4000 satır
- Seed dosyası tek başına 3000-5000 satır (24 period, 100+ proje, 1500+ score_sheet_item)
- Frontend değişiklikleri küçük — toplam ~100-150 satır değişiklik
- Her window'da plan dokümanı + referans dosyalar context'e yüklenmeli

### Dağılım

| Window | Fazlar | İçerik | Tahmini Çıktı | Gerekçe |
|--------|--------|--------|---------------|---------|
| **Window 1** | Faz 1 + Faz 2 | 001-004 şema + 005-006 snapshot/scoring | ~3000-4000 satır SQL | ✅ Tamamlandı |
| **Window 2** | Faz 3 + Faz 4 + Patch | 007 auth/RPC + 008 audit/RLS + 009 güvenlik hash | ~3000-4000 satır SQL | ✅ Tamamlandı |
| **Window 3** | Faz 4B | Seed sıfırdan yazım | ~4000-5000 satır SQL | ⏳ Sıradaki — 6 org, 24 period, 100+ proje, 36 jüri, 400+ score_sheet, 1500+ item, 80+ audit_log |
| **Window 4** | Faz 5 + Faz 6 + Faz 7 | Frontend jüri + admin + dinamik kriter | ~100-150 satır JS değişiklik | ⏳ Hepsi küçük değişiklikler: tablo adı değiştir, JSONB dönüşüm ekle, kriter yükleme ekle |

### Toplam: 4 context window

### Riskler

- **Window 3 (Seed)** en riskli — dosya çok büyük. Eğer context'e sığmazsa ikiye
  bölünebilir:
  - Window 3a: Framework + period + snapshot + proje + jüri seed'i
  - Window 3b: Puanlama (score_sheets + score_sheet_items) + audit_logs seed'i
- **Window 1-2** güvenli — SQL DDL yapıları öngörülebilir ve tekrarlı
- **Window 4** en kolay — birkaç dosyada birkaç satır değişiklik

### Her Window İçin Context Hazırlığı

| Window | Yüklenmesi Gereken Referanslar |
|--------|-------------------------------|
| Window 1 | Bu plan + canonical model + eski 001_schema.sql (referans) + eski 002_rls (helper fn) |
| Window 2 | Bu plan + canonical model + Faz 1-2 çıktıları (yeni 001-006 dosyaları) + eski 003_jury_rpcs.sql |
| Window 3 | Bu plan + seed_generation_prompt.md + Faz 1-4 çıktıları (tüm tablo yapıları) + config.js (CRITERIA) |
| Window 4 | Bu plan + Faz 1-4 çıktıları + mevcut frontend dosyaları (juryApi.js, scores.js, criteriaHelpers.js, useAdminRealtime.js, useJuryAutosave.js) |
