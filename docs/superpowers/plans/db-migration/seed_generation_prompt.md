# Task: Rewrite `sql/seeds/001_seed.sql`

Rewrite from scratch to match the **new VERA v1 canonical schema** and produce a
**premium demo dataset** for the UI.

## Primary references

Use these as the main references together:

- `docs/superpowers/plans/db-migration/00-canonical-model-and-role-review.md`
- new migration files under `sql/migrations/`
- `sql/seeds/001_seed.sql` only as a **style/reference source** for realistic seed
  writing patterns, idempotency style, timestamp discipline, and preserving existing
  demo/admin records where compatible
- `docs/concepts/vera-premium-prototype.html` as the UI/context reference for realistic
  naming and dataset richness

## Critical rule

Do **not** patch old assumptions.
Do **not** salvage legacy schema ideas such as:

- `tenants`
- `semesters`
- `tenant_id`
- `semester_id`
- `juror_semester_auth`
- `criteria_scores`
- fixed wide-row `scores(technical, written, oral, teamwork, ...)`
- `periods.criteria_config`
- `periods.outcome_config`

Rewrite completely from scratch using the **new normalized canonical schema**.

---

## Real schema to target

Target the new schema defined by the migration plan and canonical review.
The seed must use the real table names and relationships from the new migration set.

```text
organizations
profiles
memberships
org_applications
frameworks
framework_outcomes
framework_criteria
framework_criterion_outcome_maps
periods
period_criteria
period_outcomes
period_criterion_outcome_maps
projects
jurors
juror_period_auth
entry_tokens
score_sheets
score_sheet_items
audit_logs
```

### Canonical modeling rules

- `frameworks` = editable design-time template source
- `period_*` tables = immutable runtime snapshot for each period
- `score_sheets` + `score_sheet_items` = canonical scoring storage
- any old flat score representation is **not storage**, only temporary compatibility
- `total`, attainment, rankings and summary metrics are **derived**, not stored
- jurors are **not** admin-role members
- juror access is modeled through `juror_period_auth`, not through `memberships`

---

## Goal

Create a **scenario-driven, UI-first, premium demo seed** that makes these screens feel
rich and operational:

- overview dashboard
- rankings
- analytics
- heatmap
- reviews
- jurors
- projects
- periods
- criteria
- outcomes & mapping
- entry token control
- locked / blocked juror states
- audit log
- current vs historical period views

This is a **demo dataset**, not merely a schema smoke test.
The dataset should make the product look believable, active, and analytically interesting.

---

## Organizations

Create exactly 6 organizations with a mix of university departments and competition
contexts:

| # | Institution | Department/Program | Code | Type |
|---|---|---|---|---|
| 1 | TED University | Electrical-Electronics Engineering | `TEDU-EE` | University department |
| 2 | Carnegie Mellon University | Computer Science | `CMU-CS` | University department |
| 3 | TEKNOFEST | Technology Competitions | `TEKNOFEST` | Technology competition |
| 4 | TUBITAK | 2204-A Research Projects | `TUBITAK-2204A` | Research competition |
| 5 | IEEE | AP-S Student Design Contest | `IEEE-APSSDC` | Design contest |
| 6 | CanSat Competition | 2025 Season | `CANSAT-2025` | Competition |

Tiered density model:

- **Tier 1 (TEDU-EE):** Richest dataset — 10 jurors, 10 projects, full scoring coverage
- **Tier 2 (CMU-CS, TEKNOFEST):** Medium density — 6-8 jurors, 6 projects each
- **Tier 3 (TUBITAK, IEEE, CanSat):** Lighter — 4-5 jurors, 4 projects each

All orgs status = `active`. Use `institution_name` for the university/institution,
`name` for department/program, `code` for the short code.

---

## Identity / Admin layer

Preserve existing `001_seed.sql` demo admin/profile records.
Extend compatibly with:

- 1 super admin profile (org_id NULL in memberships)
- 1-2 org_admin memberships per organization
- A set of `org_applications` in mixed states:
  - 2 pending
  - 2 approved
  - 1 rejected
  - 1 cancelled

Use realistic Turkish + international applicant names.

---

## Frameworks, Criteria & Outcomes

Each organization gets exactly 1 default framework.

### TEDU-EE: MUDEK 2024 Framework

**Criteria (5):**

| Key | Label | Short | Max | Weight | Color |
|---|---|---|---|---|---|
| `technical_depth` | Technical Depth & Knowledge | Technical | 25 | 25 | `#F59E0B` |
| `engineering_design` | Engineering Design Quality | Design | 25 | 25 | `#3B82F6` |
| `experimental_validation` | Experimental Validation | Validation | 20 | 20 | `#8B5CF6` |
| `communication` | Communication & Presentation | Communication | 20 | 20 | `#EC4899` |
| `teamwork` | Teamwork & Collaboration | Teamwork | 10 | 10 | `#10B981` |

Total max: **100 points**

**Rubric bands for each criterion** (scale proportional to max):

For a criterion with max=25:

```json
[
  {"min": 22, "max": 25, "label": "Excellent", "description": "Outstanding performance"},
  {"min": 17, "max": 21, "label": "Good", "description": "Above average, minor gaps"},
  {"min": 12, "max": 16, "label": "Developing", "description": "Meets minimum, needs improvement"},
  {"min": 0, "max": 11, "label": "Insufficient", "description": "Below acceptable standard"}
]
```

Scale proportionally for max=20 (18-20/14-17/10-13/0-9) and max=10 (9-10/7-8/5-6/0-4).

**Outcomes (11 MUDEK-style):**

| Code | Label |
|---|---|
| `PO-1` | Knowledge Application |
| `PO-2` | Problem Analysis |
| `PO-3` | Design and Development |
| `PO-4` | Investigation and Research |
| `PO-5` | Tool Usage |
| `PO-6` | Professional and Ethical Responsibility |
| `PO-7` | Communication |
| `PO-8` | Project Management and Entrepreneurship |
| `PO-9` | Individual and Teamwork |
| `PO-10` | Lifelong Learning |
| `PO-11` | Societal and Environmental Impact |

**Criterion-Outcome Mappings:**

| Criterion | Outcomes (weight) |
|---|---|
| `technical_depth` | PO-1 (0.5), PO-2 (0.3), PO-4 (0.2) |
| `engineering_design` | PO-3 (0.6), PO-5 (0.25), PO-11 (0.15) |
| `experimental_validation` | PO-4 (0.5), PO-2 (0.3), PO-5 (0.2) |
| `communication` | PO-7 (0.7), PO-6 (0.3) |
| `teamwork` | PO-9 (0.6), PO-8 (0.4) |

All `coverage_type = 'direct'`.

### CMU-CS: ABET 2024 Framework

**Criteria (5):**

| Key | Label | Short | Max | Weight | Color |
|---|---|---|---|---|---|
| `problem_solving` | Problem Solving & Analysis | Problem | 25 | 25 | `#EF4444` |
| `system_design` | System Design & Architecture | Design | 25 | 25 | `#3B82F6` |
| `implementation_quality` | Implementation Quality | Impl | 20 | 20 | `#F59E0B` |
| `communication` | Communication & Documentation | Comm | 20 | 20 | `#EC4899` |
| `teamwork` | Teamwork & Collaboration | Team | 10 | 10 | `#10B981` |

Total max: **100 points**

**Outcomes (7 ABET-style):**

| Code | Label |
|---|---|
| `SO-1` | Complex Problem Solving |
| `SO-2` | Engineering Design |
| `SO-3` | Effective Communication |
| `SO-4` | Ethics and Professional Responsibility |
| `SO-5` | Teamwork |
| `SO-6` | Experimentation and Analysis |
| `SO-7` | Lifelong Learning |

**Mappings:**

| Criterion | Outcomes (weight) |
|---|---|
| `problem_solving` | SO-1 (0.6), SO-6 (0.4) |
| `system_design` | SO-2 (0.7), SO-1 (0.3) |
| `implementation_quality` | SO-6 (0.5), SO-2 (0.3), SO-7 (0.2) |
| `communication` | SO-3 (0.7), SO-4 (0.3) |
| `teamwork` | SO-5 (1.0) |

### TEKNOFEST: Competition Framework 2026

**Criteria (4):**

| Key | Label | Short | Max | Weight | Color |
|---|---|---|---|---|---|
| `preliminary_report` | Preliminary Design Report (ODR) | Report | 25 | 25 | `#6366F1` |
| `critical_design` | Critical Design Review (KTR) | CDR | 30 | 30 | `#F59E0B` |
| `technical_performance` | Technical Performance & Demo | Performance | 30 | 30 | `#EF4444` |
| `team_execution` | Team Execution & Presentation | Team | 15 | 15 | `#10B981` |

Total max: **100 points**

**Outcomes (4):**

| Code | Label |
|---|---|
| `TC-1` | Preliminary Evaluation Report Quality |
| `TC-2` | Critical Design Maturity |
| `TC-3` | Field Performance and Jury Presentation |
| `TC-4` | General Team Competency |

**Mappings:**

| Criterion | Outcomes (weight) |
|---|---|
| `preliminary_report` | TC-1 (1.0) |
| `critical_design` | TC-2 (0.7), TC-1 (0.3) |
| `technical_performance` | TC-3 (0.8), TC-2 (0.2) |
| `team_execution` | TC-4 (0.6), TC-3 (0.4) |

### TUBITAK-2204A: Research Competition Framework

**Criteria (3):**

| Key | Label | Short | Max | Weight | Color |
|---|---|---|---|---|---|
| `originality` | Originality & Creativity | Originality | 35 | 35 | `#8B5CF6` |
| `scientific_method` | Scientific Method & Rigor | Method | 40 | 40 | `#3B82F6` |
| `impact_and_presentation` | Impact & Presentation | Impact | 25 | 25 | `#F59E0B` |

Total max: **100 points**

**Outcomes (5):**

| Code | Label |
|---|---|
| `RC-1` | Originality and Creativity |
| `RC-2` | Scientific Method |
| `RC-3` | Results and Recommendations |
| `RC-4` | Applicability and Feasibility |
| `RC-5` | Broader Impact |

**Mappings:**

| Criterion | Outcomes (weight) |
|---|---|
| `originality` | RC-1 (0.7), RC-4 (0.3) |
| `scientific_method` | RC-2 (0.5), RC-3 (0.5) |
| `impact_and_presentation` | RC-5 (0.5), RC-3 (0.3), RC-4 (0.2) |

### IEEE-APSSDC: Design Contest Framework

**Criteria (3):**

| Key | Label | Short | Max | Weight | Color |
|---|---|---|---|---|---|
| `creativity` | Creativity & Innovation | Creativity | 30 | 30 | `#EC4899` |
| `technical_merit` | Technical Merit | Technical | 40 | 40 | `#3B82F6` |
| `application_and_presentation` | Application & Presentation | Presentation | 30 | 30 | `#F59E0B` |

Total max: **100 points**

**Outcomes (4):**

| Code | Label |
|---|---|
| `DC-1` | Creativity |
| `DC-2` | Technical Merit |
| `DC-3` | Practical Application |
| `DC-4` | Educational Value |

**Mappings:**

| Criterion | Outcomes (weight) |
|---|---|
| `creativity` | DC-1 (0.7), DC-4 (0.3) |
| `technical_merit` | DC-2 (0.8), DC-3 (0.2) |
| `application_and_presentation` | DC-3 (0.5), DC-4 (0.3), DC-1 (0.2) |

### CANSAT-2025: Mission Framework

**Criteria (4):**

| Key | Label | Short | Max | Weight | Color |
|---|---|---|---|---|---|
| `design_compliance` | Design Constraints Compliance | Compliance | 20 | 20 | `#6366F1` |
| `mission_execution` | Mission Execution & Telemetry | Mission | 35 | 35 | `#EF4444` |
| `data_and_documentation` | Data Analysis & Documentation | Data | 25 | 25 | `#3B82F6` |
| `safety_and_recovery` | Safety & Recovery | Safety | 20 | 20 | `#10B981` |

Total max: **100 points**

**Outcomes (6):**

| Code | Label |
|---|---|
| `CS-1` | Design Constraints Compliance |
| `CS-2` | Primary Mission Execution |
| `CS-3` | Descent Control and Recovery |
| `CS-4` | Safety and Restrictions Compliance |
| `CS-5` | Secondary Mission Originality |
| `CS-6` | Data Analysis and Documentation Quality |

**Mappings:**

| Criterion | Outcomes (weight) |
|---|---|
| `design_compliance` | CS-1 (0.7), CS-4 (0.3) |
| `mission_execution` | CS-2 (0.5), CS-5 (0.3), CS-3 (0.2) |
| `data_and_documentation` | CS-6 (0.7), CS-2 (0.3) |
| `safety_and_recovery` | CS-4 (0.5), CS-3 (0.5) |

---

## Periods and Snapshots

Each organization gets 4 periods: 1 active (current) + 3 historical (locked).

| Organization | Active | Historical #1 | Historical #2 | Historical #3 |
|---|---|---|---|---|
| TEDU-EE | Spring 2026 (Spring) | Fall 2025 (Fall) | Spring 2025 (Spring) | Fall 2024 (Fall) |
| CMU-CS | Spring 2026 (Spring) | Fall 2025 (Fall) | Spring 2025 (Spring) | Fall 2024 (Fall) |
| TEKNOFEST | 2026 Season (NULL) | 2025 Season (NULL) | 2024 Season (NULL) | 2023 Season (NULL) |
| TUBITAK-2204A | 2026 Competition (NULL) | 2025 Competition (NULL) | 2024 Competition (NULL) | 2023 Competition (NULL) |
| IEEE-APSSDC | 2026 Contest (NULL) | 2025 Contest (NULL) | 2024 Contest (NULL) | 2023 Contest (NULL) |
| CANSAT-2025 | 2026 Season (Spring) | 2025 Season (Spring) | 2024 Season (Spring) | 2023 Season (Spring) |

Active periods: `is_current=true`, `is_locked=false`, `is_visible=true`
Historical periods: `is_current=false`, `is_locked=true`, `is_visible=true`

Having 4 periods per org enables:

- **Trend analytics:** 4 data points per outcome = smooth trend lines with visible
  patterns (improving, declining, recovering, stable)
- **Historical comparison:** period dropdown with real depth
- **UI richness:** trend charts look professional with 4 data points, not just 2-3
- **Realistic lifecycle:** university departments naturally have Fall/Spring cycles,
  competitions have annual seasons

**Timestamp windows:**

| Period | Universities (semester) | Competitions (annual) |
|---|---|---|
| Historical #3 (oldest) | 2024-09-01 to 2025-01-15 | 2023-06-01 to 2023-08-15 |
| Historical #2 | 2025-02-01 to 2025-06-15 | 2024-06-01 to 2024-08-15 |
| Historical #1 (recent) | 2025-09-01 to 2025-12-20 | 2025-06-01 to 2025-08-15 |
| Active | 2026-02-01 to 2026-06-15 | 2026-06-01 to 2026-08-15 |

- `poster_date`: 2 weeks before end_date
- `snapshot_frozen_at`: 1 day after start_date for active, at start for historical

**Snapshot rules:**

Each period MUST have its own snapshot rows copied from the org's framework:

- `period_criteria` — one row per framework_criteria, with `source_criterion_id` pointing
  back. Same key/label/max_score/weight/color/rubric_bands values.
- `period_outcomes` — one row per framework_outcome, with `source_outcome_id` pointing back.
- `period_criterion_outcome_maps` — one row per framework mapping, using the period snapshot
  FKs (not framework FKs).

This means 24 periods x their criteria/outcomes = ~160 period_criteria rows, ~200
period_outcomes rows, ~240 period_criterion_outcome_maps rows.

**Historical period data density:**

| Period | Projects | Jurors | Scoring | Purpose |
|---|---|---|---|---|
| Active | Full (10 TEDU, 6 others) | Full | Mixed states (partial, submitted, not started) | Live demo |
| Historical #1 | Full (8 TEDU, 5 others) | Full | All finalized | Recent comparison |
| Historical #2 | Medium (6 TEDU, 4 others) | Most | All finalized | Trend mid-point |
| Historical #3 | Light (4 TEDU, 3 others) | Fewer (4-6) | All finalized | Trend baseline |

This creates realistic trend data: oldest period has lower N, each successive period
grows — reflecting a program's natural expansion over semesters.

---

## Projects

### TEDU-EE Active Period (10 projects)

Use realistic Turkish senior design / capstone titles:

| # | Group | Title | Advisor | Members (3-4 each) |
|---|---|---|---|---|
| 1 | 1 | FPGA-Based Real-Time Signal Processing for 5G NR | Prof. Mehmet Karaca (TEDU EE) | 3 members |
| 2 | 2 | Low-Power IoT Sensor Network for Smart Agriculture | Dr. Elif Soysal (TEDU EE) | 4 members |
| 3 | 3 | Autonomous Drone Navigation with LiDAR SLAM | Prof. Ahmet Yildirim (TEDU EE) | 3 members |
| 4 | 4 | GaN Power Amplifier Design for Sub-6 GHz 5G | Dr. Canan Dagdeviren (TEDU EE) | 3 members |
| 5 | 5 | Edge AI Accelerator on RISC-V for Anomaly Detection | Prof. Burak Ozbay (TEDU EE) | 4 members |
| 6 | 6 | Reconfigurable Intelligent Surface for Indoor mmWave | Dr. Selin Avsar (TEDU EE) | 3 members |
| 7 | 7 | Solar MPPT Controller with Machine Learning Optimization | Prof. Hasan Demirel (TEDU EE) | 3 members |
| 8 | 8 | Bioimpedance Spectroscopy System for Tissue Analysis | Dr. Zeynep Akbulut (TEDU EE) | 4 members |
| 9 | 9 | Visible Light Communication Transceiver Prototype | Prof. Mehmet Karaca (TEDU EE) | 3 members |
| 10 | 10 | Multi-Robot Coordination via Distributed Consensus | Dr. Elif Soysal (TEDU EE) | 3 members |

Members: Use realistic Turkish names like Arda Kaya, Zeynep Yilmaz, Emre Demir,
Buse Celik, Can Ozturk, Selin Aksoy, etc. Format as JSONB:
`[{"name":"Arda Kaya","order":1},{"name":"Zeynep Yilmaz","order":2},...]`

### TEDU-EE Historical Period (6 projects, same format, different titles)

### CMU-CS Active Period (6 projects)

Use realistic CS capstone titles: distributed systems, ML pipelines, security tools, etc.
English names. Advisor format: `Prof. First Last (CMU SCS)`.

### TEKNOFEST Active Period (5 projects)

Competition system names: drone, underwater vehicle, autonomous vehicle, etc.
Turkish team names. Advisor: faculty or industry mentor.

### TUBITAK-2204A Active Period (4 projects)

High school research project titles in Turkish science topics.
Turkish student names (lise). Advisor: teacher or university mentor.

### IEEE-APSSDC Active Period (4 projects)

Antenna/RF/EM design titles: patch antenna, metamaterial lens, MIMO array, etc.
International names. Advisor: university researcher.

### CANSAT-2025 Active Period (4 projects)

CanSat mission names: telemetry payload, descent control, environmental sensing, etc.
Mixed international names. Advisor: faculty.

### Historical #1 periods (recent): 5-8 projects each, simpler titles

### Historical #2 periods (mid): 4-6 projects each

### Historical #3 periods (oldest): 3-4 projects each, basic titles

Historical projects should have different titles from active period — these are previous
cohorts/teams, not the same projects.

---

## Jurors

### TEDU-EE (10 jurors for active period)

| # | Name | Affiliation | Type |
|---|---|---|---|
| 1 | Prof. Ozgur Ercetin | Sabanci University, EE | External academic |
| 2 | Dr. Aylin Yener | Ohio State University, ECE | International academic |
| 3 | Prof. Levent Demirekler | METU, EE | External academic |
| 4 | Dr. Gozde Unal | Istanbul Technical University, CS | External academic |
| 5 | Mehmet Fatih Aydogan | Aselsan, RF Systems Division | Industry |
| 6 | Dr. Burcu Karagol | TUBITAK BILGEM | Research institute |
| 7 | Prof. Sinan Gezici | Bilkent University, EE | External academic |
| 8 | Kemal Isik | Turk Telekom, R&D Center | Industry |
| 9 | Dr. Neslihan Serap Sengor | Istanbul Technical University, EE | External academic |
| 10 | Dr. Emre Aktas | Hacettepe University, EE | External academic |

### CMU-CS (7 jurors)

Mix of US academics and industry professionals. Use realistic names like:
Dr. Sarah Chen (Stanford CS), Prof. James Miller (MIT CSAIL), Maria Rodriguez (Google Research), etc.

### TEKNOFEST (6 jurors)

Mix of Turkish academics, industry professionals, military/defense. Realistic names.

### TUBITAK-2204A (5 jurors)

Mix of Turkish university professors and TUBITAK researchers. Realistic names.

### IEEE-APSSDC (4 jurors)

International antenna/RF experts. Mix of US, European, Asian names.

### CANSAT-2025 (4 jurors)

Aerospace/space engineering experts. International mix.

All jurors: `email` can be NULL for some, realistic for others.
`avatar_color`: assign from a palette (`#F59E0B`, `#3B82F6`, `#8B5CF6`, `#EC4899`,
`#10B981`, `#EF4444`, `#6366F1`, `#14B8A6`, `#F97316`, `#A855F7`).

---

## Juror Auth States

For each juror in the **active period**, create a `juror_period_auth` row.
For historical periods, create auth rows for jurors who participated (all finalized).

### Active Period Auth State Distribution (per org)

| State | Count (TEDU-EE) | Description |
|---|---|---|
| Active + all scored | 4 | `final_submitted_at` set, all score_sheets submitted |
| Active + partial | 3 | Some score_sheets, no finalization |
| Active + editing | 1 | `edit_enabled=true`, `edit_reason` set, `edit_expires_at` = now + 2h |
| Locked (PIN) | 1 | `failed_attempts=3`, `locked_until` = now + 10min, `locked_at` set |
| Blocked (admin) | 1 | `is_blocked=true` |

Smaller orgs: proportionally fewer, but always include at least 1 partial and 1 completed.

### PIN hash

Use `crypt('1234', gen_salt('bf'))` for all demo jurors. This produces a deterministic-ish
bcrypt hash. In the seed, use a pre-computed hash value:

```sql
-- Pre-computed bcrypt hash of '1234' for seed purposes
-- Use: SELECT crypt('1234', gen_salt('bf'));
-- Example result: '$2a$06$...' (compute once and hardcode)
```

For the actual seed, compute the hash inline: `crypt('1234', gen_salt('bf'))`.
Since we use `SELECT setseed(0.20260402)`, the salt will be reproducible.

---

## Scoring Patterns

### Score Distribution Design (TEDU-EE as reference)

Design scores as **realistic evaluation data**, not random noise. Each project should
have a personality:

| Project | Archetype | Score Range (of 100) | Variance |
|---|---|---|---|
| #1 FPGA 5G | Star performer | 82-92 | Low (jurors agree) |
| #2 IoT Agriculture | Solid performer | 74-85 | Low-medium |
| #3 Drone SLAM | High variance | 60-88 | High (controversial) |
| #4 GaN Amplifier | Technical strong, comm weak | 70-80 | Medium |
| #5 Edge AI RISC-V | Well-rounded | 75-82 | Low |
| #6 RIS mmWave | Borderline | 58-72 | Medium |
| #7 Solar MPPT | Weak technical, strong team | 55-68 | Medium |
| #8 Bioimpedance | Strong but late | 78-88 | Low |
| #9 VLC Transceiver | Incomplete evaluations | 65-75 | -- (partial) |
| #10 Multi-Robot | Average | 68-76 | Low |

### Per-criterion score patterns

For each project, scores should reflect its archetype:

- **Star performer (#1):** All criteria high (22-25/25, 18-20/20, 9-10/10)
- **Technical strong, comm weak (#4):** `technical_depth` 22-24, `communication` 12-15
- **Weak technical, strong team (#7):** `technical_depth` 12-15, `teamwork` 8-9
- **High variance (#3):** One juror gives 88, another gives 60

### Juror personality types

- **Jurors 1-3 (experienced academics):** Score close to mean, fair distribution
- **Juror 4 (strict):** Consistently 5-10% below mean
- **Juror 5 (generous):** Consistently 5-8% above mean
- **Juror 6-7 (standard):** Average scoring
- **Juror 8 (industry, practical focus):** Higher on teamwork/communication, lower on theory
- **Juror 9-10 (variable):** Some projects scored high, some low

### Score sheet states

| State | How to model | Count (TEDU-EE) |
|---|---|---|
| Not started | No `score_sheet` row for that juror+project pair | ~10 combinations |
| In progress | `score_sheet` exists, `status='in_progress'`, 2-3 of 5 `score_sheet_items` | ~8 combinations |
| Submitted | `score_sheet` exists, `status='submitted'`, all 5 items present | ~72 combinations |

For 10 jurors x 10 projects = 100 possible combinations:
- ~72 fully scored (submitted)
- ~8 partially scored (in_progress)
- ~10 not started (no sheet)
- ~10 from finalized jurors (submitted + juror auth has final_submitted_at)

### Score value rules

- All score values are integers (no decimals)
- `score_value` must be between 0 and `period_criteria.max_score`
- Every `score_sheet_item.period_criterion_id` must reference the correct period's
  `period_criteria` row (not framework_criteria!)
- Partial sheets: only 2-3 items present, others missing (not NULL value, but no row)

### Other organizations

Apply similar patterns at smaller scale:
- CMU-CS: 7 jurors x 6 projects = ~42 combinations, ~30 submitted, ~6 partial, ~6 not started
- TEKNOFEST: 6 jurors x 5 projects = ~30 combinations, ~22 submitted, ~4 partial, ~4 not started
- Smaller orgs: mostly submitted with 1-2 partial

---

## Entry Tokens

Per active period, create 3-5 tokens:

| State | Tokens (TEDU-EE) | Description |
|---|---|---|
| Active | 2 | `is_revoked=false`, `expires_at` = now + 20h |
| Expired | 1 | `expires_at` = 2 days ago |
| Revoked | 1 | `is_revoked=true`, created 3 days ago |
| Recently used | 1 | `last_used_at` = 2 hours ago |

Token values: use realistic UUID-format strings.

Smaller orgs: 2-3 tokens each.

Historical periods: 1-2 expired/revoked tokens each (all 3 historical periods).

---

## Audit Logs

Create a realistic activity timeline. ~60-80 total audit_log rows across all orgs,
heavily weighted toward TEDU-EE (~30 rows).

### Action types to include

| Action | resource_type | Details example |
|---|---|---|
| `period.create` | period | `{"name":"Spring 2026"}` |
| `period.lock` | period | `{"name":"Fall 2025"}` |
| `snapshot.freeze` | period | `{"criteria_count":5,"outcomes_count":11}` |
| `project.create` | project | `{"title":"FPGA-Based..."}` |
| `project.import` | project | `{"count":10,"source":"csv"}` |
| `juror.create` | juror | `{"name":"Prof. Ozgur Ercetin"}` |
| `score.submit` | score_sheet | `{"juror":"Ozgur Ercetin","project":"FPGA 5G"}` |
| `score.update` | score_sheet | `{"juror":"Aylin Yener","project":"Drone SLAM"}` |
| `token.generate` | entry_token | `{"period":"Spring 2026"}` |
| `token.revoke` | entry_token | `{"reason":"expired session"}` |
| `juror.pin_locked` | juror_period_auth | `{"juror":"Kemal Isik","attempts":3}` |
| `juror.edit_enabled` | juror_period_auth | `{"juror":"Sinan Gezici","reason":"Late submission","hours":2}` |
| `application.approve` | org_application | `{"applicant":"...","org":"CMU-CS"}` |
| `application.reject` | org_application | `{"applicant":"...","reason":"incomplete"}` |

### Timestamp distribution

- Historical actions: spread across September-December 2025
- Active period actions: concentrated in March-April 2026
- Recent burst: 5-8 actions in the last 48 hours (scoring activity)

---

## Implementation requirements

1. **Rewrite completely** — replace the full content of `sql/seeds/001_seed.sql`
2. **Idempotent** — use deterministic UUIDs and `ON CONFLICT DO NOTHING`
3. **Deterministic** — fixed timestamps, `SELECT setseed(0.20260402)` at top
4. **Transaction** — wrap in `BEGIN; ... COMMIT;`
5. **Realistic timestamps** — support recent activity and historical comparisons
6. **UI usefulness over purity** — optimize for convincing demo screens
7. **Respect canonical truth** — framework feeds snapshots, scoring uses snapshots,
   analytics derive from scoring
8. **Preserve 001_seed.sql** — do not break existing demo/admin identities
9. **No deprecated structures** — no flat `scores` rows, no `criteria_config` JSONB
10. **Members as JSONB** — `[{"name":"...","order":1},...]`

---

## Anti-patterns to avoid

- Do NOT reintroduce `tenants`, `semesters`, or other legacy naming
- Do NOT store scores in a flat `scores` table
- Do NOT put criteria into `criteria_config` / `outcome_config` JSONB
- Do NOT collapse all orgs into one universal criterion set
- Do NOT make every juror fully submitted
- Do NOT make every project high-scoring
- Do NOT leave `audit_logs` empty
- Do NOT seed only one org or one period
- Do NOT make historical periods empty
- Do NOT create snapshot rows inconsistent with framework rows
- Do NOT invent fields not present in the real migrations
- Do NOT use plain text PINs (use bcrypt hash)

---

## Expected output counts

| Entity | Count |
|---|---|
| organizations | 6 |
| frameworks | 6 |
| framework_outcomes | ~44 (11+7+4+5+4+6) |
| framework_criteria | ~24 (5+5+4+3+3+4) |
| framework_criterion_outcome_maps | ~40 |
| periods | 24 (6 active + 6 hist#1 + 6 hist#2 + 6 hist#3) |
| period_criteria | ~96 (24 criteria x 4 periods) |
| period_outcomes | ~176 (44 outcomes x 4 periods) |
| period_criterion_outcome_maps | ~160 (40 maps x 4 periods) |
| projects | ~55 (active) + ~35 (hist#1) + ~28 (hist#2) + ~20 (hist#3) = ~138 |
| jurors | ~36 (10+7+6+5+4+4) |
| juror_period_auth | ~144 (36 jurors x 4 periods, roughly) |
| entry_tokens | ~50 |
| score_sheets | ~550-650 |
| score_sheet_items | ~2000-2500 |
| audit_logs | ~100-120 |
| org_applications | 6 |
| memberships | ~14 (1 super + 12 org_admin) |

---

## Output expectations

After rewriting, summarize:

- what was changed
- exact counts per table
- demo states represented (completed, partial, locked, blocked, editing)
- how snapshot consistency was enforced
- how scoring patterns create interesting analytics
