# TEDU Capstone Jury Evaluation Portal — QA Workbook Prompt Pack

Below are two ready-to-use prompts plus an example Excel workbook structure tailored to this project.

---

## PROMPT 1 — Generate a Comprehensive QA Test Report Workbook

Create a comprehensive Excel-based QA test report structure for this repository.

Context:
This is the TEDU Capstone Jury Evaluation Portal.
It is a React + Vite frontend with a Supabase backend.
The project already has automated tests, but I want a more comprehensive and professional test reporting format.

Goal:
Design a test result export structure that can be used in Excel.
This should not be a simple pass/fail list.
It should be a structured QA workbook suitable for release checks, smoke tests, regression tracking, and manual validation.

I want the workbook to include multiple sheets.

Required workbook structure:

1. Summary
Include:
- Project name
- Test cycle / date
- Environment
- Build / version
- Tester
- Total tests
- Passed
- Failed
- Blocked
- Pass rate
- Overall result
- General notes

2. Technical Coverage
Include:
- Module / Feature
- Related files or components
- Risk area
- Test type (unit / integration / smoke / manual / regression)
- Automated? (Yes/No)
- Notes

3. Test Cases
This should be the main detailed sheet.

Columns must include:
- Test ID
- Module
- Feature
- Scenario
- Preconditions
- Steps to Execute
- Expected Result
- Actual Result
- Status (Pass / Fail / Blocked / Not Run)
- Severity
- Priority
- Tester Notes

4. Defects / Findings
Include:
- Defect ID
- Related Test ID
- Module
- Description
- Severity
- Reproducible? (Yes/No)
- Current Status
- Owner
- Notes

5. Jury Day Quick Check
A short operational checklist for the day of evaluation.

Include:
- Check ID
- Check Item
- Expected Result
- Actual Result
- Status
- Notes

Tasks:
1. Review the repository and existing tests.
2. Propose a realistic test-reporting workbook structure for this project.
3. Populate it with meaningful example rows based on the actual features of the repository.
4. Make sure it reflects:
   - jury login flow
   - PIN verification and lockout
   - evaluation flow
   - autosave
   - submission
   - admin login
   - overview / rankings / analytics / grid / details
   - settings panels
   - juror PIN reset
   - semester-based actions
   - CSV import
   - security checks
   - accessibility-critical checks
5. Output the result in a format that can be directly converted into an Excel file.

Important:
- Be practical, not generic.
- Use the actual project structure and terminology.
- Make it suitable for both manual QA and release validation.
- Keep it professional and audit-friendly.

If possible, generate the output as:
- Sheet 1: Summary
- Sheet 2: Technical Coverage
- Sheet 3: Test Cases
- Sheet 4: Defects
- Sheet 5: Jury Day Quick Check

---

## PROMPT 2 — Create a Commit/PR-Focused High-Value Test Plan and Populate the Workbook

Write a commit/PR-focused test reporting plan for this repository and align it with an Excel QA workbook.

Context:
This is the TEDU Capstone Jury Evaluation Portal.
It is a React + Vite frontend with a Supabase backend.
The app is an internal academic tool used for jury evaluation of senior design projects.

Important:
Do not generate generic demo content.
Do not invent features that do not exist.
First inspect the current repository structure and existing tests, then add only meaningful test coverage and reporting rows.

Goal:
Strengthen the repository’s test reporting for commit / PR validation and release readiness.

Primary objective:
Create a high-value QA workbook structure that tracks:
1. Rendering smoke tests
2. Critical interaction tests
3. State / utility logic tests
4. Regression tests for known risky areas
5. Manual operational release checks

Focus especially on these areas if they exist in the repo:

Jury flow:
- PinStep
- PinRevealStep
- EvalStep
- EvalHeader
- GroupStatusPanel
- ScoringGrid
- DoneStep

Admin flow:
- AdminPanel
- OverviewTab
- RankingsTab
- ScoreGrid
- ScoreDetails
- SettingsPage
- ManageProjectsPanel
- ManageJurorsPanel
- ManagePermissionsPanel

Shared / infrastructure:
- src/shared/api.js
- routing via URLSearchParams
- matchMedia guards
- ChartDataTable fallback
- lock-state enforcement
- CSV import validation
- PIN reset confirmation message with semester context
- save / retry / error banners
- RPC secret parameter plumbing where testable from frontend

Tasks:
1. Inspect the existing test structure first.
2. Identify missing high-value tests and high-value manual validation rows.
3. Propose workbook rows for both automated and manual checks.
4. Reuse existing test utilities and patterns already present in the repo.
5. Prefer Vitest + React Testing Library terminology if that is what the repo already uses.
6. Mock network / Supabase calls only where necessary.
7. Keep all suggestions deterministic and CI-friendly.
8. Avoid low-value test cases added only to inflate numbers.

What to cover:
- Components render without crashing
- Important empty / loading / error states
- Critical button enable/disable logic
- Confirmation dialogs
- Semester-dependent actions
- URL state sync behavior
- Accessibility-critical attributes where practical
- Known regression-prone logic
- Manual release-day sanity checks

What NOT to do:
- Do not rewrite the app
- Do not add a full E2E framework unless already present
- Do not create fake APIs that don’t match the current code
- Do not add low-value rows just to increase workbook length

Output requirements:
1. First give a short reporting strategy:
   - which files/features should be tracked
   - why they matter
   - which cases should be logged in the workbook

2. Then produce workbook-ready sheet content.

3. After generating the workbook content, provide:
   - list of suggested sheets
   - short summary of what each sheet covers
   - any assumptions or mocks introduced

4. If possible, align the workbook with commit-time confidence and release-time validation.

Success criteria:
- The workbook should improve commit-time confidence
- The workbook should target real project risks
- The workbook should remain lightweight enough for practical team use

If useful, prioritize these concrete regression rows:
- PIN reset confirmation includes semester context
- lock banner appears when semester is locked
- ScoreGrid preserves accessibility roles
- ChartDataTable opens appropriately in reduced-motion mode
- wrong admin password is rejected in UI
- CSV import summary message appears after import
- EvalStep submit button visibility depends on completion state
- last-group Next button is disabled

Work incrementally:
- prioritize the highest-value missing checks
- prefer 10–20 strong rows over 100 weak ones

---

# EXAMPLE EXCEL WORKBOOK STRUCTURE

The following is a filled example that can be copied into Excel sheets.

---

## SHEET 1 — Summary

| Field | Value |
|---|---|
| Project Name | TEDU Capstone Jury Evaluation Portal |
| Test Cycle | Release Validation / Smoke + Regression |
| Date | 2026-03-15 |
| Environment | Local Dev / Preview / Production |
| Build / Version | audit_report-2026-03-15-final baseline |
| Tester | QA / Admin Reviewer |
| Total Tests | 24 |
| Passed | 21 |
| Failed | 1 |
| Blocked | 2 |
| Pass Rate | 87.5% |
| Overall Result | Conditionally Ready |
| General Notes | Critical jury flow healthy. One security/environment verification and one settings-path validation still pending. |

Suggested extra summary metrics:

| Metric | Value |
|---|---|
| Automated Coverage Used | Vitest |
| Manual Coverage Used | Yes |
| Smoke Test Duration Target | < 10 min |
| Commit/PR Gate Scope | Build + unit/integration + selected regression |
| Release-Day Quick Check Available | Yes |

---

## SHEET 2 — Technical Coverage

| Module / Feature | Related Files / Components | Risk Area | Test Type | Automated? | Notes |
|---|---|---|---|---|---|
| Jury Login | `src/jury/PinStep.jsx`, `PinRevealStep.jsx` | Access flow broken, juror blocked | Smoke / Regression | Yes + Manual | PIN success/failure/lockout are high-risk |
| Eval Flow | `src/jury/EvalStep.jsx`, `EvalHeader.jsx`, `ScoringGrid.jsx`, `GroupStatusPanel.jsx` | Data loss, submit logic, lock-state | Integration / Manual | Yes + Manual | Most critical product flow |
| Done Step | `src/jury/DoneStep.jsx` | Completion feedback, session exit | Smoke | Yes | Reduced-motion guard relevant |
| Admin Login | `src/admin/AdminPanel.jsx`, `src/shared/api.js` | Unauthorized access, wrong password UX | Smoke / Security | Partial | UI and RPC both matter |
| Overview | `src/admin/OverviewTab.jsx` | Empty dashboard, stale metrics | Smoke | Yes + Manual | Fast sanity check area |
| Rankings | `src/admin/RankingsTab.jsx` | Export/load breakage | Smoke / Regression | Partial | Export state important |
| Analytics | `src/charts/*`, `AnalyticsTab` | Chart crash, fallback missing | Smoke / A11y | Partial | Reduced-motion and no-data states important |
| Score Grid | `src/admin/ScoreGrid.jsx` | Rendering, sort, ARIA regressions | Regression | Yes + Manual | Accessibility-critical |
| Score Details | `src/admin/ScoreDetails.jsx` | Expansion/filter issues | Smoke / Manual | Partial | Lower risk than jury flow |
| Projects Management | `src/admin/ManageProjectsPanel.jsx` | Bad CSV import, project setup broken | Regression / Manual | Partial | Semester-scoped |
| Jurors Management | `src/admin/ManageJurorsPanel.jsx` | PIN reset wrong context, CRUD issues | Regression / Manual | Partial | Must show semester context |
| Permissions | `src/admin/ManagePermissionsPanel.jsx` | Lock toggle mistakes | Manual / Regression | Partial | Can impact all jurors |
| API Layer | `src/shared/api.js` | RPC mismatch, missing secret param | Regression / Security | Partial | High impact if broken |
| SQL Bootstrap | `sql/000_bootstrap.sql` | Auth/secret checks broken | Security / Manual | No | Usually verified by deploy smoke |
| URL Routing | `AdminPanel`, URLSearchParams handling | Broken deep-link / back-forward | Regression | Yes + Manual | Recently changed behavior |
| matchMedia Guards | `DoneStep`, `RankingsTab`, `JurorActivity`, chart helpers | SSR/test crashes | Regression | Yes | CI stability issue |

---

## SHEET 3 — Test Cases

| Test ID | Module | Feature | Scenario | Preconditions | Steps to Execute | Expected Result | Actual Result | Status | Severity | Priority | Tester Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC-001 | Home | Landing Page | Home renders correctly | App running | Open `/` | Logo/title/buttons visible, no crash | As expected | Pass | High | High | Entry point healthy |
| TC-002 | Jury | PIN Login | Valid PIN login works | Test juror exists | Start Evaluation → enter juror info → enter correct PIN | Eval screen loads | As expected | Pass | Critical | High | Core path |
| TC-003 | Jury | PIN Login | Wrong PIN lockout works | Test juror exists | Enter wrong PIN 3 times | Attempts decrease, then lockout screen | As expected | Pass | Critical | High | Security-sensitive |
| TC-004 | Jury | PIN Reveal | First-time juror gets PIN reveal | New juror or reset PIN | Start flow as first-time user | PIN reveal step shown with copy option | As expected | Pass | High | Medium | Onboarding okay |
| TC-005 | Jury | Eval Form | Score inputs accept valid entries | Logged into eval flow | Enter valid scores for all criteria | Inputs accept values, no validation crash | As expected | Pass | Critical | High | Core scoring works |
| TC-006 | Jury | Autosave | Blur triggers save status | On EvalStep | Edit a score/comment and blur field | Saving → Saved indicator shown | As expected | Pass | Critical | High | Data integrity okay |
| TC-007 | Jury | Group Nav | Last-group Next is disabled | At final group | Navigate to last group | Next button disabled | As expected | Pass | Medium | Medium | Regression check |
| TC-008 | Jury | Submit Logic | Submit only appears when all complete | Multiple groups exist | Leave one group incomplete, then complete all | Submit hidden until all groups complete | As expected | Pass | Critical | High | Important integrity rule |
| TC-009 | Jury | Lock State | Locked semester disables editing | Semester locked in admin | Open existing juror eval page | Lock banner visible, inputs disabled | As expected | Pass | Critical | High | Must hold |
| TC-010 | Jury | Rubric UI | Rubric opens and active range highlights | On EvalStep | Click View Rubric after entering score | Rubric opens, relevant row highlighted | As expected | Pass | Low | Low | Nice functional check |
| TC-011 | Admin | Login | Wrong admin password rejected | Admin page reachable | Enter wrong password | Error shown, no access granted | As expected | Pass | Critical | High | Security gate okay |
| TC-012 | Admin | Overview | Overview metrics load | Valid admin login | Login and land on Overview | Cards and semester selector render | As expected | Pass | High | High | Quick sanity area |
| TC-013 | Admin | URL Routing | Deep link loads correct tab | Admin logged in | Open `?tab=scores&view=analytics` | Analytics opens directly | As expected | Pass | High | Medium | Routing stable |
| TC-014 | Admin | Back/Forward | Browser navigation tracks tab/view | Admin logged in | Move between Overview/Analytics/Grid then use back/forward | Prior view restored logically | As expected | Pass | Medium | Medium | Recently changed behavior |
| TC-015 | Admin | Rankings | Rankings table renders | Data available | Open Scores → Rankings | Table appears with expected columns | As expected | Pass | High | Medium | Core read view |
| TC-016 | Admin | Analytics | No-data / chart fallback safe | Empty or limited data set | Open Analytics | Charts or sensible empty/fallback view appears | As expected | Pass | Medium | Medium | Prevents blank analytics |
| TC-017 | Admin | Analytics A11y | Reduced motion auto-opens table | Browser can emulate reduced motion | Enable reduced motion → open Analytics | Data table section open by default | As expected | Pass | Medium | Low | Accessibility regression |
| TC-018 | Admin | Grid | ARIA roles preserved | Admin logged in | Open Score Grid and inspect cells/headers | Grid/rowheader/header semantics intact | As expected | Pass | Medium | Medium | Important for a11y |
| TC-019 | Settings | Projects CSV | Import summary message appears | Admin in Projects section | Import CSV with duplicates | Summary toast shows added/skipped counts | As expected | Pass | High | Medium | Recent improvement |
| TC-020 | Settings | Juror PIN Reset | Confirmation includes semester context | Admin in Jurors section, semester selected | Trigger PIN reset | Dialog shows juror + semester context | As expected | Pass | High | High | Prevents wrong-semester mistake |
| TC-021 | Settings | PIN Reset Result | Success toast includes semester | PIN reset completed | Confirm reset | Toast includes juror and semester | As expected | Pass | Medium | Medium | Operational clarity |
| TC-022 | Settings | Semester Delete | Destructive warning includes full scope | Semester has data | Trigger delete | Warning mentions jurors, groups, scores | As expected | Pass | Critical | High | High-risk action |
| TC-023 | Security | RPC Secret | Frontend configured with RPC secret | `.env.local` available | Verify runtime config / perform protected action | Protected admin action succeeds with valid config | Pending environment verification | Blocked | Critical | High | Check on target deploy env |
| TC-024 | Security | Secrets Leakage | Sensitive keys absent from returned settings payload | Admin settings load | Inspect settings response | `rpc_secret`, `admin_password_hash`, `pin_secret` absent | One payload path not yet verified | Fail | Critical | High | Needs confirmation in deployed environment |

Suggested Status values:
- Pass
- Fail
- Blocked
- Not Run

Suggested Severity values:
- Critical
- High
- Medium
- Low

Suggested Priority values:
- High
- Medium
- Low

---

## SHEET 4 — Defects / Findings

| Defect ID | Related Test ID | Module | Description | Severity | Reproducible? | Current Status | Owner | Notes |
|---|---|---|---|---|---|---|---|---|
| DEF-001 | TC-024 | Security / Settings Payload | Sensitive settings payload filtering not yet fully verified in deployed environment | Critical | Unknown | Open | Admin / Dev | Verify via Network tab or runtime logging in target env |
| DEF-002 | TC-023 | Security / Env | RPC secret verification depends on correct target environment configuration | High | Yes | Pending Verification | DevOps / Admin | Common rollout risk if local and deployed values differ |
| DEF-003 | TC-014 | Routing | Back/forward behavior should be spot-checked after any AdminPanel navigation refactor | Medium | Yes | Monitor | Frontend | Regression-prone area |
| DEF-004 | TC-019 | Projects Import | CSV import summary formatting should remain stable across both Projects and Jurors panels | Low | Yes | Monitor | Frontend | Good candidate for automated assertion |

---

## SHEET 5 — Jury Day Quick Check

| Check ID | Check Item | Expected Result | Actual Result | Status | Notes |
|---|---|---|---|---|---|
| Q-01 | Home page loads | Landing page visible, buttons available |  | Not Run | Fast first check |
| Q-02 | Start Evaluation opens | Identity/PIN flow accessible |  | Not Run | |
| Q-03 | Test juror PIN works | Eval form loads |  | Not Run | Use dedicated test juror |
| Q-04 | One score can be entered | Input accepted, no error |  | Not Run | |
| Q-05 | Autosave confirms | Saving → Saved visible |  | Not Run | |
| Q-06 | Submit flow completes | Done screen appears |  | Not Run | Use test data if needed |
| Q-07 | Admin login works | Correct password opens panel |  | Not Run | |
| Q-08 | Overview loads | Metrics cards visible |  | Not Run | |
| Q-09 | Rankings loads | Rankings table visible |  | Not Run | |
| Q-10 | Score Grid loads | Matrix view visible |  | Not Run | |
| Q-11 | Selected semester jurors load | Juror list visible for current semester |  | Not Run | |
| Q-12 | PIN reset dialog shows semester | Confirmation includes semester context |  | Not Run | Operational safety check |
| Q-13 | Evaluation lock toggle visible | Permission control accessible |  | Not Run | Optional if used that day |
| Q-14 | RPC secret/config healthy | Protected admin actions succeed |  | Not Run | Deployment sanity check |

---

# OPTIONAL STATUS LEGEND SHEET

If you want one more tab, add:

## SHEET 6 — Status Legend

| Field | Allowed Values |
|---|---|
| Status | Pass / Fail / Blocked / Not Run |
| Severity | Critical / High / Medium / Low |
| Priority | High / Medium / Low |
| Automated? | Yes / No / Partial |
| Reproducible? | Yes / No / Unknown |
| Overall Result | Ready / Conditionally Ready / Not Ready |

---

# OPTIONAL EXCEL FORMATTING RULES

Recommended formatting for the Excel workbook:

1. Summary sheet:
   - Bold header cells
   - Overall Result in colored fill:
     - Green = Ready
     - Yellow = Conditionally Ready
     - Red = Not Ready

2. Test Cases sheet:
   - Conditional formatting on Status:
     - Pass = green
     - Fail = red
     - Blocked = orange
     - Not Run = gray
   - Freeze top row
   - Enable filters on all columns

3. Defects sheet:
   - Severity color coding:
     - Critical = dark red
     - High = red
     - Medium = orange
     - Low = yellow

4. Quick Check sheet:
   - Large row height for easy day-of-use entry
   - Simple yes/no dropdown or status dropdown

---

# OPTIONAL NEXT STEP REQUEST

If file generation is available, create:
- `docs/testing/test_report_template.md`
- `docs/testing/test_report_template.xlsx`

The `.md` file should explain:
- purpose of each sheet
- how to fill Actual Result
- when to use Pass / Fail / Blocked / Not Run
- which sheet is used for commit-time validation vs release-day validation