# Criteria Drawer Refactor — Design Spec

Date: 2026-04-08

## Goal

Replace the inline `<Drawer>` block in `CriteriaPage.jsx` with the already-prepared
`EditCriteriaDrawer` component, and restructure the drawer to match the prototype:
`fs-drawer-header` → `fs-drawer-body` (scrollable) → `fs-drawer-footer` (sticky, outside body).

## Current State

- `CriteriaPage.jsx` lines 349–389: inline unnamed `<Drawer>` + `<CriteriaManager>` block.
  `EditCriteriaDrawer` is completely unused from this page.
- `CriteriaManager.jsx`: renders its own `criteria-manager-footer` div inside the body
  using a sticky/negative-margin hack (`position:sticky; bottom:0; margin:16px -28px -28px`).
- `EditCriteriaDrawer.jsx`: wraps `CriteriaManager` in `fs-drawer-header` + `fs-drawer-body`
  only — no `fs-drawer-footer`.

## Target State (prototype-exact)

```
.fs-drawer#drawer-edit-criteria
  .fs-drawer-header     ← sparkle icon + "Evaluation Criteria" + period tag + close ×
  .fs-drawer-body       ← weight summary + criteria list (scrollable)
  .fs-drawer-footer     ← "✓ N criteria · X pts"  [Cancel]  [Save Criteria]
```

## Changes

### 1. `CriteriaManager.jsx`

- Remove the `<div className="criteria-manager-footer">` block entirely (Cancel, Save, meta).
- Add `onSaveState` optional callback prop.
- Fire `onSaveState({ saving, canSave, handleSave, saveBlockReasons, totalOk, activeRowsCount, totalMax })`
  via a `useEffect` whenever any of those values change.
- `onClose` prop is retained — passed down from EditCriteriaDrawer for Cancel.

### 2. `EditCriteriaDrawer.jsx`

- Add local state: `const [saveState, setSaveState] = useState({ saving: false, canSave: false, handleSave: null, saveBlockReasons: [], totalOk: false, activeRowsCount: 0, totalMax: 0 })`.
- Pass `onSaveState={setSaveState}` and `onClose={onClose}` to `<CriteriaManager>`.
- After `fs-drawer-body`, add `fs-drawer-footer`:
  ```jsx
  <div className="fs-drawer-footer">
    <div className="crt-footer-meta">
      {saveState.totalOk && <svg ...checkmark... />}
      <span className="crt-footer-count">{saveState.activeRowsCount}</span> criteria ·{" "}
      <span className="crt-footer-count">{saveState.totalMax}</span> pts
    </div>
    <button className="crt-cancel-btn" onClick={onClose} disabled={saveState.saving}>Cancel</button>
    <button
      className="crt-save-btn"
      onClick={() => saveState.handleSave?.()}
      disabled={!saveState.canSave || disabled}
    >
      <AsyncButtonContent loading={saveState.saving} loadingText="Saving…">Save Criteria</AsyncButtonContent>
    </button>
  </div>
  ```
- Also render save-block errors (AlertCard) here if `saveState.saveBlockReasons.length > 0`.

### 3. `CriteriaPage.jsx`

- Remove `import CriteriaManager from "../criteria/CriteriaManager"`.
- Remove `import Drawer from "@/shared/ui/Drawer"` (if no longer used elsewhere in the file).
- Remove the inline drawer block (lines 349–389).
- Add `import EditCriteriaDrawer from "../drawers/EditCriteriaDrawer"`.
- Render:
  ```jsx
  <EditCriteriaDrawer
    open={editorOpen}
    onClose={closeEditor}
    period={{ id: periods.viewPeriodId, name: periods.viewPeriodLabel }}
    template={criteriaConfig}
    outcomeConfig={periods.outcomeConfig || []}
    onSave={handleSave}
    onDirtyChange={onDirtyChange}
    disabled={loadingCount > 0}
    isLocked={isLocked}
  />
  ```

### 4. `criteria.css`

- Remove `.criteria-manager-footer` rule (the sticky-hack block at line 723).

## Backward Compatibility

- `CriteriaManager` public prop interface (`template`, `outcomeConfig`, `onSave`, `disabled`,
  `isLocked`, `onClose`, `onDirtyChange`, `saveDisabled`) is unchanged.
- Tests in `CriteriaManager.test.jsx` and `CriteriaManagerClamping.test.jsx` continue to pass
  because they do not test the footer (the footer is no longer rendered when `onSaveState` is
  not provided — tests never provided it).
- The `onSaveState` callback is optional; no call-site outside `EditCriteriaDrawer` needs it.

## Out of Scope

- `CriterionEditor` internals (Label/Short/Weight fields, Outcome Mapping, Rubric Bands).
- Any other drawer or modal.
- CSS changes beyond removing `.criteria-manager-footer`.
