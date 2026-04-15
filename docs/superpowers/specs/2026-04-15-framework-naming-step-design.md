# Framework Naming Step — Design Spec

**Date:** 2026-04-15
**File:** `docs/superpowers/specs/2026-04-15-framework-naming-step-design.md`

---

## Problem

When a user selects "Clone from a previous period" or "Use a default template" in the framework empty-state picker on `OutcomesPage`, the clone executes immediately with a hard-coded name (the source framework's name). There is no opportunity to name the framework before it is created, and no duplicate-name validation.

## Goal

Insert a naming step between source selection and clone execution. The step replaces the picker list content inline (Approach B), pre-fills the suggested name, validates for duplicates in real time, and only executes the clone on explicit confirmation.

---

## State Machine

Three UI states governed by two pieces of state: `showFwPicker` (boolean) and `namingStep` (object or null).

| `showFwPicker` | `namingStep` | Visible UI |
|---|---|---|
| `false` | — | Empty state card ("No framework assigned…") |
| `true` | `null` | Picker list (clone from period / use template) |
| `true` | `{ source, data, suggestedName }` | Naming form (replaces picker list) |

`namingStep` shape:

```js
{
  source: "period" | "template",  // which path was taken
  data: periodObj | templateObj,  // the selected source object
  suggestedName: string           // pre-fill value
}
```

---

## Naming Step UI

Rendered inside the existing `vera-es-clone-list vera-es-clone-list--fw` container, replacing the list content entirely.

```
┌─────────────────────────────────────────────┐
│  ← Back          Name this framework        │
├─────────────────────────────────────────────│
│  Cloning from Spring 2026 · MÜDEK-Spring    │  ← context line
│                                             │
│  [ MÜDEK-Spring 2026                    ]   │  ← input, pre-filled
│  ⚠ "MÜDEK-Spring 2026" already exists.     │  ← error (conditional)
│                                             │
│              [Cancel]   [Create →]          │
└─────────────────────────────────────────────┘
```

### Elements

- **Back link** (`← Back`): `setNamingStep(null)` — returns to picker list. Uses a small `ChevronLeft` Lucide icon.
- **Context line**: small muted text. For period: `"Cloning from {period.name} · {fwName}"`. For template: `"Based on {template.name} template"`.
- **Name input**: standard `<input type="text">` with `error` class when duplicate. Auto-focused on mount (`useEffect` + `inputRef.current.focus()`).
- **Error message**: `<p className="crt-field-error"><AlertCircle size={12} strokeWidth={2} /> "{value}" adında bir framework zaten mevcut.</p>` — shown only when duplicate detected.
- **Cancel button**: ghost style, calls `setShowFwPicker(false); setNamingStep(null)`.
- **Create button**: primary style, `disabled` when `nameValue.trim() === ""` or duplicate exists or `cloningFw`. Shows spinner via `AsyncButtonContent` when `cloningFw`.

---

## Duplicate Validation

Check performed on every `onChange` of the name input.

```js
const isDuplicate = frameworks
  .filter(f => f.organization_id === organizationId)  // org-owned only, exclude platform templates
  .some(f => f.name.trim().toLowerCase() === nameValue.trim().toLowerCase());
```

`frameworks` prop is already available in the component — no additional fetch needed.

---

## Handler Changes

### `handleCloneFromPeriod(period)` → `handleCloneFromPeriod(period, customName)`

```js
const fwName = customName ?? frameworks.find(f => f.id === period.framework_id)?.name ?? "Custom Framework";
const newFw = await cloneFramework(period.framework_id, fwName, organizationId);
```

### `handleCloneTemplate(template)` → `handleCloneTemplate(template, customName)`

```js
const newFw = await cloneFramework(template.id, customName ?? template.name, organizationId);
```

Both handlers remain `async`, update `cloningFw`, and clear `namingStep` + `showFwPicker` on success/failure (same as today).

### New `handleNamingConfirm()`

Called by the Create button. Reads `namingStep` and routes to the correct handler:

```js
const handleNamingConfirm = () => {
  if (namingStep.source === "period") {
    handleCloneFromPeriod(namingStep.data, nameValue.trim());
  } else {
    handleCloneTemplate(namingStep.data, nameValue.trim());
  }
};
```

### Picker button `onClick` changes

Instead of calling the handler directly, they now open the naming step:

```js
// Clone button
onClick={() => setNamingStep({
  source: "period",
  data: p,
  suggestedName: frameworks.find(f => f.id === p.framework_id)?.name ?? "Custom Framework"
})}

// Use button
onClick={() => setNamingStep({
  source: "template",
  data: fw,
  suggestedName: fw.name
})}
```

---

## Local State Additions

```js
const [namingStep, setNamingStep] = useState(null);
const [nameValue, setNameValue] = useState("");
const namingInputRef = useRef(null);
```

When `namingStep` changes to non-null, sync `nameValue` with `namingStep.suggestedName` via `useEffect`:

```js
useEffect(() => {
  if (namingStep) {
    setNameValue(namingStep.suggestedName);
    // auto-focus handled in the same effect after render
  }
}, [namingStep]);
```

---

## CSS

New rules added to `src/styles/pages/setup-wizard.css` (existing file, already imported):

- `.vera-es-naming-header` — flex row, back link + title
- `.vera-es-naming-back` — small muted clickable, flex + gap for icon
- `.vera-es-naming-context` — small muted context line, margin-bottom
- `.vera-es-naming-actions` — flex row, justify-end, gap, margin-top

No new CSS files. No per-component overrides of global tokens (`--field-error-ring`, `--danger`).

---

## Files Changed

| File | Change |
|---|---|
| `src/admin/pages/OutcomesPage.jsx` | Add `namingStep`, `nameValue`, `namingInputRef` state; add `handleNamingConfirm`; update picker `onClick`s; add naming step JSX block; update `handleCloneFromPeriod` + `handleCloneTemplate` signatures |
| `src/styles/pages/setup-wizard.css` | Add naming step layout rules |

No migration. No API changes. No new files.

---

## Out of Scope

- "Start from scratch" path (blank framework) — does not go through this naming step; it already creates with a fixed name "Custom Framework" which can be renamed inline afterward.
- Renaming after creation — already handled by the existing inline rename UI.
- CriteriaPage — does not have this empty-state picker, so no changes needed there.
