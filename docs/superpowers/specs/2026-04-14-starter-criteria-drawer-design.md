# Starter Criteria Drawer — Design Spec

**Date:** 2026-04-14
**Status:** Approved

## Goal

Add a "Load template" trigger to the Criteria page card header chip row. Clicking it opens a drawer with three sections — Active Criteria summary, Copy from Existing Period, and Starter Templates — letting the user quickly populate a blank period with either a cloned set from another period or a built-in 4-criterion template. The drawer mirrors the structure of `FrameworkPickerDrawer.jsx` used on the Outcomes page.

---

## Trigger Button

A small `LayoutTemplate` icon button is added to `crt-chips-row` in `CriteriaPage.jsx`, positioned between the period badge and the Add Criterion button:

```
[ 4 criteria ] [ 100 pts · balanced ] [ Spring 2026 ] [ ☰ ] [ + Add Criterion ]
```

The button uses a new CSS class `.crt-template-btn` — a neutral chip-style icon-only button that is always visible when a period is selected and disabled when `isLocked`.

---

## Drawer Structure

File: `src/admin/drawers/StarterCriteriaDrawer.jsx`

### Props

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Drawer visibility |
| `onClose` | `() => void` | Close callback |
| `draftCriteria` | `array` | Current in-memory criteria (used to detect overwrite risk) |
| `otherPeriods` | `array` | Other periods `{ id, name, criteria_count }` for the period selector |
| `isLocked` | `boolean` | Disables both action buttons when true |
| `onApplyTemplate` | `(criteria: array) => void` | Called with the full 4-criterion array when Use Template is clicked |
| `onCopyFromPeriod` | `(periodId: string) => void` | Called with the selected period ID when Copy & Use is clicked |

### Drawer icon

`LayoutTemplate` from lucide-react, size 17, drawn via the Drawer's `icon` prop pattern:

```jsx
icon={(stroke) => <LayoutTemplate size={17} stroke={stroke} strokeWidth={2} />}
```

---

## Section 1 — Active Criteria

Always shown at the top. Renders the current `draftCriteria` state as informational chips (not interactive):

- Count chip: `X criteria` (neutral)
- Weight chip: `100 pts · balanced` (success) or `X / 100 pts` (warning)
- If `draftCriteria.length === 0`: show a muted "No criteria defined for this period" line

This section is read-only — no buttons.

---

## Section 2 — Copy from Existing Period

Lets the user clone criteria from another period of the same organisation.

- A `CustomSelect` listing `otherPeriods` as `{ value: id, label: name }` options. Placeholder: `"Select a period…"`.
- A "Copy & Use" button — enabled only when a period is selected and `!isLocked`.
- Clicking "Copy & Use" calls `onCopyFromPeriod(selectedPeriodId)` and closes the drawer. The actual API call (`listPeriodCriteria` + `getActiveCriteria` + `updateDraft`) stays in `CriteriaPage.handleClone` unchanged.
- If `otherPeriods.length === 0`: section is shown but `CustomSelect` is disabled with placeholder `"No other periods available"` and the Copy & Use button is disabled.
- If `draftCriteria.length > 0`: a `<FbAlert variant="warning">` appears above the Copy & Use button: `"This will replace your current criteria."`.

---

## Section 3 — Starter Templates

A single template card labeled **"Standard Evaluation"** with subtitle `"4 criteria · 100 pts total"`. Clicking "Use Template" calls `onApplyTemplate(STARTER_CRITERIA)` and closes the drawer.

- If `draftCriteria.length > 0`: same `<FbAlert variant="warning">` warning as Section 2.
- Button is disabled when `isLocked`.

The template is a module-level constant `STARTER_CRITERIA` defined at the top of `StarterCriteriaDrawer.jsx`. No MÜDEK or framework names appear anywhere in the UI — neither in labels, descriptions, nor tooltips.

---

## Hardcoded `STARTER_CRITERIA` Data

The array contains 4 objects in the stored criterion shape (matching what `updateDraft` and `savePeriodCriteria` expect). Keys are stable slugs so cloning logic can append a suffix.

```js
const STARTER_CRITERIA = [
  {
    key:        "written-communication",
    label:      "Written Communication",
    shortLabel: "Written Comm",
    color:      "#3b82f6",   // CRITERION_COLORS[0] — blue
    max:        30,
    blurb: "Evaluates how effectively the team communicates their project in written and visual form — including layout, information hierarchy, figure quality, and clarity of technical content for a mixed audience.",
    outcomes:   [],
    rubric: [
      { level: "Excellent",    min: "27", max: "30", description: "Poster layout is intuitive with clear information flow. Visuals are fully labelled and high quality. Technical content is presented in a way accessible to both technical and non-technical readers." },
      { level: "Good",         min: "21", max: "26", description: "Layout is mostly logical. Visuals are readable with minor gaps. Technical content is largely clear with small areas for improvement." },
      { level: "Developing",   min: "13", max: "20", description: "Occasional gaps in information flow. Some visuals are missing labels or captions. Technical content is only partially communicated." },
      { level: "Insufficient", min: "0",  max: "12", description: "Confusing layout. Low-quality or unlabelled visuals. Technical content is unclear or missing." },
    ],
  },
  {
    key:        "oral-communication",
    label:      "Oral Communication",
    shortLabel: "Oral Comm",
    color:      "#8b5cf6",   // CRITERION_COLORS[1] — violet
    max:        30,
    blurb: "Evaluates the team's ability to present their work verbally and respond to questions from jurors with varying technical backgrounds. Audience adaptation — adjusting depth and vocabulary based on who is asking — is a key factor.",
    outcomes:   [],
    rubric: [
      { level: "Excellent",    min: "27", max: "30", description: "Presentation is consciously adapted for both technical and non-technical jury members. Q&A responses are accurate, clear, and audience-appropriate." },
      { level: "Good",         min: "21", max: "26", description: "Presentation is mostly clear and well-paced. Most questions answered correctly. Audience adaptation is generally evident." },
      { level: "Developing",   min: "13", max: "20", description: "Understandable but inconsistent. Limited audience adaptation. Time management or Q&A depth needs improvement." },
      { level: "Insufficient", min: "0",  max: "12", description: "Unclear or disorganised presentation. Most questions answered incorrectly or not at all." },
    ],
  },
  {
    key:        "technical-content",
    label:      "Technical Content",
    shortLabel: "Technical",
    color:      "#f59e0b",   // CRITERION_COLORS[2] — amber
    max:        30,
    blurb: "Evaluates the depth, correctness, and originality of the engineering work itself — independent of how well it is communicated. Assesses whether the team has applied appropriate knowledge, justified design decisions, and demonstrated real technical mastery.",
    outcomes:   [],
    rubric: [
      { level: "Excellent",    min: "27", max: "30", description: "Problem is clearly defined with strong motivation. Design decisions are well-justified with engineering depth. Originality and mastery of relevant tools or methods are evident." },
      { level: "Good",         min: "21", max: "26", description: "Design is mostly clear and technically justified. Engineering decisions are largely supported." },
      { level: "Developing",   min: "13", max: "20", description: "Problem is stated but motivation or technical justification is insufficient." },
      { level: "Insufficient", min: "0",  max: "12", description: "Vague problem definition and unjustified decisions. Superficial technical content." },
    ],
  },
  {
    key:        "teamwork",
    label:      "Teamwork",
    shortLabel: "Teamwork",
    color:      "#22c55e",   // CRITERION_COLORS[3] — green
    max:        10,
    blurb: "Evaluates visible evidence of equal and effective team participation during the evaluation session, as well as the group's professional and ethical conduct in interacting with jurors.",
    outcomes:   [],
    rubric: [
      { level: "Excellent",    min: "9", max: "10", description: "All members participate actively and equally. Professional and ethical conduct observed throughout." },
      { level: "Good",         min: "7", max: "8",  description: "Most members contribute. Minor knowledge gaps. Professionalism mostly observed." },
      { level: "Developing",   min: "4", max: "6",  description: "Uneven participation. Some members are passive or unprepared." },
      { level: "Insufficient", min: "0", max: "3",  description: "Very low participation or dominated by one person. Lack of professionalism observed." },
    ],
  },
];
```

---

## CSS — New Classes

All new styles go in `src/styles/pages/criteria.css`. No shared files touched.

### Trigger button

```css
.crt-template-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-1);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  flex-shrink: 0;
}

.crt-template-btn:hover {
  background: var(--surface-2);
  border-color: var(--accent);
  color: var(--accent);
}

.crt-template-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
```

### Drawer body sections

```css
/* ── Starter Criteria Drawer ─────────────────────────────── */

.scd-section {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.scd-section:last-child {
  border-bottom: none;
}

.scd-section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 14px;
}

.scd-chips-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.scd-empty-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.scd-template-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface-1);
}

.scd-template-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.scd-template-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.scd-template-meta {
  font-size: 11px;
  color: var(--text-secondary);
}

.scd-action-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.scd-use-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid rgba(59, 130, 246, 0.3);
  background: rgba(59, 130, 246, 0.06);
  color: var(--accent);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  align-self: flex-start;
}

.scd-use-btn:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.5);
}

.scd-use-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

---

## JSX Changes in `CriteriaPage.jsx`

### New imports

```js
import { LayoutTemplate } from "lucide-react";
import StarterCriteriaDrawer from "@/admin/drawers/StarterCriteriaDrawer";
```

### New state

```js
const [starterDrawerOpen, setStarterDrawerOpen] = useState(false);
```

### Trigger button (inside `crt-chips-row`, after period badge, before crt-add-btn)

```jsx
<button
  className="crt-template-btn"
  onClick={() => setStarterDrawerOpen(true)}
  disabled={isLocked}
>
  <LayoutTemplate size={13} strokeWidth={1.9} />
</button>
```

### Drawer instance (inside the `periods.viewPeriodId` block, after the table card)

```jsx
<StarterCriteriaDrawer
  open={starterDrawerOpen}
  onClose={() => setStarterDrawerOpen(false)}
  draftCriteria={draftCriteria}
  otherPeriods={otherPeriods}
  isLocked={isLocked}
  onApplyTemplate={(criteria) => {
    periods.updateDraft(criteria);
    setStarterDrawerOpen(false);
  }}
  onCopyFromPeriod={(periodId) => {
    setStarterDrawerOpen(false);
    handleClone(periodId);
  }}
/>
```

---

## What Is Not Changing

- `handleClone` logic and all clone state variables in `CriteriaPage.jsx` — reused as-is
- The empty state card and its inline clone picker — kept exactly as-is (the drawer is an additional entry point, not a replacement)
- `EditSingleCriterionDrawer`, `WeightBudgetBar`, `SaveBar` — untouched
- API layer, DB schema, migrations — no changes
- `useManagePeriods` hook — `updateDraft` is called from the page, not from the drawer

---

## File Map

| File | Change |
|------|--------|
| `src/admin/drawers/StarterCriteriaDrawer.jsx` | **Create new** — drawer component with 3 sections + STARTER_CRITERIA constant |
| `src/admin/pages/CriteriaPage.jsx` | **Modify** — add `LayoutTemplate` import, `StarterCriteriaDrawer` import, `starterDrawerOpen` state, trigger button in chip row, drawer instance |
| `src/styles/pages/criteria.css` | **Modify** — add `.crt-template-btn` and `scd-*` drawer section classes |

---

## Scope

No API changes. No DB migrations. No shared file changes. All new state is local to `CriteriaPage.jsx`. The drawer is self-contained — it receives all data it needs via props and communicates back via two simple callbacks.
