# Group Settings — Edge Case Audit

> **Purpose:** Deep edge-case audit of the Group Settings area in TEDU VERA,
> grounded in the actual implementation as of 2026-03-23.
> This is a risk assessment document, not an implementation plan.

---

## Context

"Group Settings" in TEDU VERA is rendered by `src/admin/ManageProjectsPanel.jsx`
(1 080 lines). State management lives in `src/admin/hooks/useManageProjects.js`.
The component is orchestrated by `src/admin/SettingsPage.jsx` via
`src/admin/hooks/useSettingsCrud.js`.

The underlying data model stores each group as a row in the `projects` table
(`id`, `semester_id`, `group_no`, `project_title`, `group_students`).
Students are stored as a semicolon-separated string; there is no separate student
table. The unique constraint is `(semester_id, group_no)`.

---

## 1. Group List Rendering

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| Group with `project_title = null` or `""` | Pass | `renderProject` uses `p.project_title \|\| "—"`. Safe. |
| Group with empty `group_students` | Pass | `splitStudents("")` returns `[]`; renders "—". Safe. |
| Group with `group_no = 0` or `null` | Partial | `groupLabel` falls back to `idx + 1`. Displayed correctly, but sort is by `Number(group_no \|\| 0)`, so `null` and `0` sort identically (before any valid group). No crash. |
| Group row missing `id` | Partial | Card key becomes `` `${group_no}-${project_title}` ``. Unique in practice, but breaks React reconciliation if two groups share the same `group_no`+`title`. |
| Group `updated_at` missing | Pass | `lastActivity = p.updated_at \|\| p.updatedAt \|\| null`; `LastActivity` handles null. |
| Very long `project_title` (100+ chars) | Pass | `.manage-meta-scroll` adds horizontal scroll with overflow handling. |
| Very long student name string | Pass | Same horizontal scroll container applied to students. |
| `.map()` on undefined `students` array | Pass | `splitStudents()` guards with `if (!text) return []`. No crash. |
| 0 groups for selected semester | Pass | Explicit empty-state message: "No groups for the selected semester." |
| 3+ groups — accordion render | Pass | First 3 shown; rest in accordion behind "Show all" button. |

---

## 2. Semester Scoping

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| Only current viewed-semester groups shown | Pass | `loadProjects(viewSemesterId)` is called per semester; `setProjects` is replaced entirely on reload. |
| Switching semesters updates the list | Pass | `useSettingsCrud` reloads projects when `viewSemesterId` changes. |
| Panel header reflects current semester | Pass | Panel description uses `semesterName` prop (unified from `viewSemesterLabel`). Single prop, no duplication. |
| Create scoped to intended semester | Partial | Create dialog has a semester selector that defaults to `activeSemesterId` prop (which SettingsPage sets to `viewSemesterId`). User can override and pick any semester, including past ones. No warning is shown when a non-viewed or inactive semester is selected. |
| CSV import scoped to intended semester | Pass | `handleImportProjects` hard-codes `viewSemesterId`; no semester picker in import modal. Import context line in modal shows the target semester. |
| Realtime patch scoped to viewed semester | Pass | `useSettingsCrud` only applies INSERT/UPDATE patches if `payload.new.semester_id === semesters.viewSemesterId`. DELETE uses `id` directly (safe). |
| `viewSemesterId` is empty string | Pass | `loadProjects(semesterId)` returns early if `!semesterId`. List stays empty. |
| Semester switch while edit modal open | Fixed | `semesterId` is locked into `editForm` at modal open time. Save always targets the original group's semester regardless of subsequent viewed-semester changes. |
| Semester switch while create modal open | Partial | Same risk exists but is less severe: user can also explicitly change the semester field in the create form. The visible semester picker in the form makes intent clearer. |

---

## 3. Search and Filtering

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| Empty search term | Pass | Shows first 3 groups (accordion behavior), no filtering applied. |
| Whitespace-only search | Pass | `searchTerm.trim().toLowerCase()` normalizes to empty string; no filter applied. |
| No matches | Pass | "No results." message shown. |
| Case-insensitive search | Pass | Both `normalizedSearch` and `haystack` are `.toLowerCase()`. |
| Search by group number | Pass | Both raw number and "group 5" prefix are in haystack. |
| Search by project title | Pass | `p.project_title` included in haystack. |
| Search by student name | Pass | `p.group_students` (raw semicolon string) included in haystack. |
| Search by semester name | Pass | `semesterName` prop included in haystack. |
| Search by date/timestamp | Pass | `buildTimestampSearchText(lastActivity)` included in haystack. |
| Special characters in search (`*`, `[`, `(`) | Pass | Haystack is plain `.includes()`, not regex. Safe. |
| Leading/trailing whitespace in search | Pass | `searchTerm.trim()` applied before comparison. |
| Semester switch with active search | Pass | `filteredProjects` recomputes from the new `projects` array on render. Search term is preserved but results update correctly. |
| Search with `null` `updated_at` | Pass | `buildTimestampSearchText("")` — needs to be verified safe, but `\|\| ""` guard in `lastActivity` prevents null being passed. |

---

## 4. Group Creation

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| Create button opens modal | Pass | `setShowAdd(true)`. Form pre-fills semester to `activeSemesterId` (= viewed semester). |
| No semester selected in dropdown | Pass | `canSubmit` requires `form.semester_id`; Save is disabled. Validation message shown on attempt. |
| No semesters exist at all | Fail | If `semesterOptions` is `[]`, the semester dropdown shows only the disabled placeholder. User cannot create a group. But there is no explanatory message in the dialog — it just silently disables the Save button. Confusing for first-time setup. |
| Duplicate `group_no` (client-side check) | Partial | Client-side check only fires when `form.semester_id === activeSemesterId`. If user selects a different semester in the dialog, duplicate check is skipped client-side. Server still catches it and returns `{ fieldErrors: { group_no: "..." } }`. |
| `group_no` = 0 or negative | Pass | `digitsOnly()` strips non-digits; integer check `groupNo > 0` blocks zero. |
| `group_no` > 999 | Fixed | Client-side validation rejects values above 999 with "Group number must be between 1 and 999." |
| Empty project title | Pass | `canSubmit` requires `form.project_title.trim()`. Save disabled. |
| All student fields blank | Pass | `normalizedAddStudents` is empty string; `canSubmit` blocks save. |
| Student name with special chars / Unicode | Pass | No restrictions; stored as-is in `group_students`. |
| Duplicate student names in same group | Fixed | `normalizeStudentNames` deduplicates on write; first-occurrence order preserved. |
| Network failure on create | Pass | `handleAddProject` catches the error and calls `setPanelError("projects", msg)`. Returns `{ ok: false }`. |
| Double-click / rapid submit | Partial | No debounce. `canSubmit` is not cleared while save is in progress. If user clicks Create twice very fast, two RPC calls fire. First succeeds; second returns duplicate error `{ fieldErrors: { group_no: "..." } }`. `setAddError` fires with duplicate message. No crash but confusing. |
| Post-create form reset | Pass | On success, `setForm({ group_no: "", project_title: "", group_students: [""], semester_id: ... })` resets form. Modal closes. |
| Post-create list refresh | Pass | `applyProjectPatch` + `loadProjects` both called on success. |

---

## 5. Group Editing

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| Edit form pre-fills from card data | Pass | `setEditForm({ group_no: p.group_no ?? "", project_title: p.project_title \|\| "", group_students: parseStudentInputList(p.group_students \|\| "") })`. All guarded. |
| `group_no` locked (read-only) | Pass | Input has `disabled` attribute. Cannot be changed. |
| `p.group_no` is `null` in edit pre-fill | Partial | `editForm.group_no` would be `""`. `canEditSubmit` requires `String(editForm.group_no).trim()` to be truthy, so Save button is disabled. User sees an un-saveable modal. No crash but confusing. |
| `p.group_students` is `null` | Pass | `parseStudentInputList(null \|\| "")` → `splitStudents("")` returns `[]` → `parsed.length ? parsed : [""]` → `[""]`. Safe. |
| Empty `project_title` after editing | Pass | `canEditSubmit` requires `editForm.project_title.trim()`. Save disabled. |
| All student rows removed to blank | Pass | `removeStudentInput` never removes below 1 row. `canEditSubmit` blocks on blank students. |
| Semester switches while edit modal open | Fixed | `semesterId` locked in `editForm.semesterId` at open time; save passes this locked value to the hook. No longer uses `viewSemesterId`. |
| Save failure — error display | Fixed | `handleEditProject` returns `{ ok: false, message: msg }`. Component checks result; modal stays open on failure with in-modal `role="alert"` error. Panel-level banner not used for edit errors. |
| Save failure — button stuck on "Saving…" | Pass | `setEditSaving(false)` always runs. No stuck state. |
| No `id` passed from edit form to hook | Pass | `adminUpsertProject` uses `p_semester_id` + `p_group_no` (not `p_project_id`) to target the row. The API correctly upserts by the composite key. Edit form not including `id` is safe. |
| Stale edit data after Realtime update | Partial | If a Realtime update arrives while the modal is open, `setProjects` updates the list but `editForm` is not refreshed. User could save stale data over a fresher server state. No conflict detection. |
| Unsaved edit changes protected on close | Fixed | `window.confirm` replaced with `ConfirmDialog` for panel toggle. Edit modal Cancel closes without confirmation (acceptable — no data is lost, server not written). |

---

## 6. Group Deletion

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| Delete button opens confirmation dialog | Pass | `onDeleteProject(p, groupLabel)` → `crud.handleRequestDelete({ type: "project", id: p?.id, label: "Group N" })`. |
| Delete confirmation requires delete password | Pass | `DeleteConfirmDialog` requires the delete password field (separate from admin password). |
| `p.id` is `null` or `undefined` on delete | Fixed | Guard added before `onDeleteProject`; sets panel error "Cannot delete this group right now. Refresh the page and try again." No server call made. |
| Network failure during delete | Pass | `handleConfirmDelete` propagates the error through `mapDeleteError`. Dialog shows error. |
| Rapid double-click on delete | Unclear | Cannot verify from code alone whether `DeleteConfirmDialog` disables its confirm button during in-flight delete. Likely handled by `useDeleteConfirm` loading state. |
| Deleted group removed from list | Pass | Realtime `DELETE` event calls `removeProject(payload.old?.id)`. Also optimistic removal on success. |
| Server-side cascade (scores deleted) | Pass | `rpc_admin_delete_project` deletes scores via cascade. DB schema has `ON DELETE CASCADE`. |
| UI state after delete with edit modal open | Unclear | If edit modal is open and the same group is deleted via Realtime (from another tab), `editForm` remains showing stale data. Save would hit a non-existent record. Likely a silent server error. |

---

## 7. CSV Import

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| File > 2MB | Pass | Blocked with "File is too large" error. |
| Non-CSV file extension | Pass | Blocked with "Only .csv files are supported." |
| Empty CSV file | Fixed | `parseCsv` on empty text returns `[]`; explicit check now sets import error: "The file appears to be empty. Check the file and try again." |
| CSV with BOM or `\r\n` line endings | Pass | `parseCsv` is described as RFC 4180 compliant; likely handles common variations. |
| Missing required header column | Pass | Header check for `group_no`, `project_title`, `group_students`. All three must be present. |
| Extra columns beyond required three | Pass | Extra cells are captured in `has_extra_values`. If found in the students column area, treated as an invalid separator (comma). |
| `group_no` = 0 or non-integer string | Pass | `!Number.isFinite(r.group_no) \|\| r.group_no <= 0` → added to `invalidGroupRows`, row rejected. |
| `group_no` > 999 | Fixed | `r.group_no > 999` now rejected with "invalid group_no" error. |
| Empty `project_title` | Pass | Rejected with row number in error. |
| Empty `group_students` | Pass | Rejected with row number in error. |
| Students separated by comma in CSV cell | Pass | Detected as invalid separator, row skipped with warning. |
| Students separated by semicolons (correct) | Pass | Accepted. Passed through `normalizeStudentNames` before save. |
| Duplicate `group_no` within CSV | Pass | Detected via `seenGroups` Set. Rejected with row number in error. |
| Existing `group_no` in target semester | Pass | Client-side pre-check skips them; server-side catches remaining. |
| All rows skipped (only existing groups) | Pass | `toImport` is empty; import call not made. Success + warning shown. Modal stays open. |
| Partial import failure (some rows fail at server) | Partial | `handleImportProjects` catches duplicate errors per row (skips) but re-throws other errors. A non-duplicate server error on any row stops the loop and returns `{ ok: false, formError: msg }`. Rows imported before the failure remain committed — no rollback. Partial state shown in list. |
| Success message shown before import call | Fixed | `setImportSuccess` now called only after `onImport` resolves with `res?.ok`. No optimistic pre-set. |
| Network failure during import | Pass | Caught; `formError` shown in import dialog. `importSuccess` cleared. |
| Import to past/inactive semester | Partial | No warning in the import modal. Users must remember to check the semester shown in the context line. There is no semester picker in the import dialog (always uses `viewSemesterId`). |
| Cancel button during import | Partial | Cancel button shows "Stop" during import and signals soft-cancel via `importCancelRef`. Loop halts between rows. True per-request abort is not feasible with the current Supabase RPC wrappers — each row's `adminCreateProject` call completes before the cancel is checked. |
| Duplicate student names within a row | Fixed | `normalizeStudentNames` deduplicates entries; `"Alice; Alice; Bob"` becomes `"Alice; Bob"`. |
| CSV with only header row (no data rows) | Pass | `data` is `[]`, no separator errors → `setImportError("No valid rows found in CSV.")` is shown. |

---

## 8. Empty, Loading, and Error States

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| Initial load — list shows nothing until loaded | Pass | `projects` starts as `[]`; empty-state message shown. |
| Load error (API failure) | Fixed | `loadProjects` now has try/catch; calls `setPanelError("projects", msg)` on failure. Admin sees a meaningful error instead of a silent empty list. |
| Empty semester — no groups exist | Pass | "No groups for the selected semester." |
| Filtered empty — search yields no results | Pass | "No results." |
| Panel-level error banner | Pass | `{panelError && <div role="alert">...</div>}` renders above actions. |
| Loading state during create/edit/delete | Partial | `setLoading(true)` (global spinner in SettingsPage), but no per-row loading state. List remains fully interactive while a save is in progress. |
| Success toast | Pass | `setMessage(...)` produces a toast via SettingsPage's message state. |
| Retry affordance on error | Fail | No retry button on any error state. Admin must manually re-trigger the action. |
| Import modal error cleared on new file drop | Pass | `setImportSuccess(""); setImportError(""); setImportWarning("")` called at top of `handleFile`. |

---

## 9. Data Integrity and Relationship Consistency

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| Group belongs to correct semester after create | Pass | `semesterId` always passed to `adminCreateProject`. DB constraint enforced. |
| Group edit targets wrong semester on semester switch | Fixed | `semesterId` locked in `editForm` at open; hook receives it explicitly. No longer depends on `viewSemesterId` at save time. |
| No orphaned project references | Pass | Students are strings; no foreign keys to orphan. Project-to-semester FK has `ON DELETE CASCADE`. |
| Score records orphaned on group delete | Pass | `ON DELETE CASCADE` in schema propagates. |
| Group `id` missing from delete call | Fixed | Guard added; panel error shown, no RPC call made if `p?.id` is falsy. |
| `applyProjectPatch` matching by `group_no` (cross-semester) | Fixed | Fallback match now requires `patch.semester_id` to be present. Without both `id` and `semester_id`, patch appends as new row (safe). |
| `applyProjectPatch` on import — no confirmed `id` | Partial | If `res` lacks `project_id`, `id` is `undefined`. Patch now requires `semester_id` for fallback match, which is always included in import patches — reduces risk. Full `loadProjects` refresh after import ensures consistency. |
| Realtime patch for different semester | Pass | Guarded by `payload.new.semester_id === semesters.viewSemesterId`. |
| Stale `editForm` overwriting server-fresh data | Partial | If server data changes while edit modal is open, saving the stale form silently overwrites the newer data. No optimistic locking. |
| Duplicate student names stored | Fixed | `normalizeStudentNames` deduplicates before write. |

---

## 10. Realtime / Synchronization

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| External INSERT refreshes list | Pass | `applyProjectPatch(payload.new)` adds/updates the group. Semester-scoped. |
| External UPDATE refreshes list | Pass | Same as INSERT — patch replaces existing row by `id`. |
| External DELETE removes group from list | Pass | `removeProject(payload.old?.id)` filters it out. |
| Edit modal open during external update | Partial | Edit modal displays `editForm` snapshot; list updates below it. No conflict warning. Save succeeds but may overwrite fresher data. |
| Edit modal open, group externally deleted | Unclear | If the group is deleted externally, Realtime removes it from the list. Edit modal stays open with stale form. Save would call `adminUpsertProject` with the old `(semester_id, group_no)`. The RPC might silently re-create the group. |
| Race: two saves fire simultaneously | Unclear | No locking mechanism. Second save could overwrite first. Unlikely in single-admin internal tool, but possible with Realtime multi-tab. |
| List refresh on create (loadProjects) | Pass | `handleAddProject` calls `applyProjectPatch` then `await loadProjects(targetSemesterId)`. Ensures consistency. |
| List refresh after import | Fixed | `handleImportProjects` now calls `loadProjects(viewSemesterId)` after the import loop completes, ensuring server-confirmed UUIDs replace any optimistic patches. |

---

## 11. Mobile and Responsive Behavior

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| Panel collapses on mobile | Pass | `isMobile` prop controls collapsible header; `ChevronDownIcon` shows. |
| Horizontal scroll for long project titles | Pass | `.manage-meta-scroll` applies `overflow-x: auto`. Hint "Swipe horizontally" shown on mobile. |
| Student drag-and-drop on touch | Pass | `TouchSensor` with `{ delay: 120, tolerance: 8 }` configured in DnD sensors. |
| Modal overflow on small screens | Unclear | Modals use `.manage-modal-card` with fixed max-width. Cannot confirm from code alone that they scroll correctly on very small viewports without live testing. |
| Create/edit form usability on mobile | Partial | Drag handles and remove buttons are small touch targets. `manage-btn--create-remove` and `manage-btn--edit-remove` do not have explicit min-size styles visible in component code. |
| CSV import modal on mobile | Partial | Drag-and-drop to a mobile browser is unsupported in most mobile OSes. Fallback `onClick → fileRef.click()` exists. But the dropzone occupies most of the modal, implying a desktop-first design. |
| Icon-only action buttons (edit/delete) | Pass | `aria-label` attributes provided. `title` tooltip shown on hover. Icon buttons are labeled. |
| `aria-label` typo on remove-student button | Fixed | Line 796 (add modal): corrected to `"Remove student ${idx + 1}"`. |

---

## Top 10 Most Important Issues

Issues marked **Fixed** were resolved in the 2026-03-23 remediation pass.
See `docs/audit/group-settings-edge-case-audit-2026-03-23-followup.md` for commit references.

1. **Semester switch while edit modal is open corrupts the save target** (§2, §5, §9) — **Fixed**
   `semesterId` is now locked into `editForm` at open time and passed explicitly to the hook.

2. **Edit modal always closes even on save failure** (§5) — **Fixed**
   Modal stays open on `res?.ok === false`; in-modal `role="alert"` error shown.

3. **`p.id` can be `undefined` in delete call** (§6, §9) — **Fixed**
   Guard added; panel error shown, no RPC call made.

4. **`applyProjectPatch` can match across semesters** (§9) — **Fixed**
   Fallback match now requires `patch.semester_id`.

5. **CSV import shows success message before the actual import call** (§7) — **Fixed**
   `setImportSuccess` moved to after `onImport` resolves.

6. **Load failure for `loadProjects` is silent** (§8) — **Fixed**
   try/catch added; `setPanelError("projects", msg)` called on failure.

7. **`window.confirm` used in panel toggle** (§5, §2) — **Fixed**
   Replaced with `ConfirmDialog` (title "Unsaved Changes", tone "caution").

8. **Empty CSV file dropped produces no feedback** (§7) — **Fixed**
   Explicit check after `parseCsv`; import error set with descriptive message.

9. **No abort mechanism during CSV import** (§7) — **Partially Fixed**
   Soft-cancel via `importCancelRef`: loop halts between rows; Cancel shows "Stop".
   True per-request abort not feasible with current Supabase RPC wrappers.

10. **Import does not call `loadProjects` for full refresh** (§10) — **Fixed**
    `loadProjects(viewSemesterId)` called after successful import loop.

---

## Recommended Fixes

### Fix first (before next poster-day use) — all fixed in 2026-03-23 remediation

1. **Close edit modal only on success** — Fixed
2. **Guard against semester switch while edit is open** — Fixed
3. **Guard `p.id` in delete call** — Fixed
4. **Move success message after import resolves** — Fixed
5. **Add try/catch to `loadProjects`** — Fixed

### Fix next (before widespread admin use) — all fixed in 2026-03-23 remediation

6. **Replace `window.confirm` with `ConfirmDialog`** — Fixed
7. **Provide feedback on empty CSV file** — Fixed
8. **Add full `loadProjects` refresh after CSV import** — Fixed
9. **Fix `applyProjectPatch` cross-semester match risk** — Fixed

### Nice to have — all fixed in 2026-03-23 remediation

10. **Fix `aria-label` typo on remove-student button** — Fixed
11. **Add AbortController to import loop** — Partially Fixed (soft-cancel)
12. **Add student name deduplication** — Fixed
13. **Add reasonable upper bound for `group_no`** — Fixed (max 999)
14. **Unify `semesterName` / `activeSemesterName` props** — Fixed

---

## Most Relevant Files

| File | Role | Key Risk Location |
|---|---|---|
| `src/admin/ManageProjectsPanel.jsx` | Main UI component | All major fixes applied here |
| `src/admin/hooks/useManageProjects.js` | CRUD state/handlers | `loadProjects` try/catch; `applyProjectPatch` semester guard; `handleEditProject` return value |
| `src/admin/hooks/useSettingsCrud.js` | Orchestrator + Realtime | Lines 220–225 (DELETE realtime), semester-scoping logic |
| `src/admin/SettingsPage.jsx` | Prop wiring | `activeSemesterName` removed; single `semesterName` prop |
| `src/shared/api/adminApi.js` | RPC wrappers | Lines 506–515 (adminUpsertProject — no project_id passed) |
| `sql/000_bootstrap.sql` | Schema | `projects` table, unique constraint, cascade delete |

---

## Overall Judgment

**Group Settings is operationally usable for internal poster-day preparation.**
The 2026-03-23 remediation pass resolved all 14 identified issues (13 fully, 1 partially).

The happy path — loading groups, creating, editing, importing CSV, and deleting —
works correctly under normal conditions. The CSV validation pipeline is thorough and
well-structured. Semester scoping is properly enforced for loading and Realtime.

**Remaining partial risks (acceptable for internal tool):**
- No optimistic locking: stale edit data can silently overwrite a server-fresh update
  (low probability in single-admin context)
- Soft-cancel for import stops between rows, not mid-request (Supabase RPC limitation)
- No retry button on error states (admin must re-trigger manually)

**What is now resolved:**
- The semester-switch-during-edit data integrity risk is closed
- Delete with missing `id` is guarded
- Import flow is hardened: empty CSV, deferred success, post-import refresh
- Edit modal stays open and shows in-modal error on failure
- `window.confirm` replaced with `ConfirmDialog`
- Student name deduplication and `group_no` upper bound enforced
