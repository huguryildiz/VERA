# Global Score Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a single global `/100` score display pattern — accent-blue monospace numerator + dim small denominator — and apply it in Heatmap, Jurors, Projects, and the Overview KPI.

**Architecture:** Two global CSS classes in `src/styles/table-system.css` (`vera-score-num` already exists, new `vera-score-denom`). Call sites wrap the value in two sibling spans; no new React component. The one-off `kpi-value-denom` in `cards.css` is deleted and its call site migrated.

**Tech Stack:** Plain CSS + JSX. No new tests — purely visual refactor; existing unit tests assert on values, not span structure.

---

## File Structure

**Modify:**

- `src/styles/table-system.css` — add `.vera-score-denom` next to existing `.vera-score-num` (around line 314).
- `src/styles/components/cards.css:140` — delete `.kpi-value-denom`.
- `src/admin/features/overview/OverviewPage.jsx:367` — `kpi-value-denom` → `vera-score-denom`.
- `src/admin/features/jurors/components/JurorsTable.jsx:128` — replace `avg-score-value` span with two-span pattern.
- `src/admin/features/projects/components/ProjectsTable.jsx:251` — keep `vera-score-num`, append `vera-score-denom` span.
- `src/admin/features/heatmap/HeatmapPage.jsx:487, 507, 520` — replace each `avg-score-value` span with two-span pattern.

---

### Task 1: Add the global CSS classes

**Files:**

- Modify: `src/styles/table-system.css:308-315`

- [ ] **Step 1: Add `.vera-score-denom` after `.vera-score-num`**

Edit `src/styles/table-system.css`. Find:

```css
/* ── Numeric score value (avg, max, etc.) ── */
.vera-score-num {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
}
```

Append directly after the closing brace:

```css
/* ── Score denominator — "/100" — paired with .vera-score-num ── */
.vera-score-denom {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.78em;
  font-weight: 400;
  color: var(--text-tertiary);
  letter-spacing: 0;
  margin-left: 1px;
}
```

- [ ] **Step 2: Verify the CSS parses**

Run: `npm run build`
Expected: build completes without CSS warnings.

---

### Task 2: Migrate Overview KPI denominator

**Files:**

- Modify: `src/admin/features/overview/OverviewPage.jsx:367`
- Modify: `src/styles/components/cards.css:140`

- [ ] **Step 1: Switch KPI call site to new class**

Edit `src/admin/features/overview/OverviewPage.jsx` line 367. Change:

```jsx
{kpi.avg ?? "—"}<span className="kpi-value-denom">/100</span>
```

to:

```jsx
{kpi.avg ?? "—"}<span className="vera-score-denom">/100</span>
```

- [ ] **Step 2: Delete the obsolete `.kpi-value-denom` rule**

Edit `src/styles/components/cards.css` line 140. Delete the entire line:

```css
.kpi-value-denom{font-family:var(--mono);font-size:0.55em;font-weight:400;color:var(--text-tertiary);letter-spacing:0}
```

- [ ] **Step 3: Verify no other references remain**

Run: `grep -rn "kpi-value-denom" src/`
Expected: no matches.

- [ ] **Step 4: Visual check — Overview KPI**

Run `npm run dev`, open `/admin/overview` in the browser, confirm the "Average Score" KPI card renders `<big>/100</big>` with the `/100` small and dim — consistent with the new table pattern. Check light and dark mode.

---

### Task 3: Migrate JurorsTable

**Files:**

- Modify: `src/admin/features/jurors/components/JurorsTable.jsx:127-128`

- [ ] **Step 1: Replace the avg-score-value span**

Edit `src/admin/features/jurors/components/JurorsTable.jsx` around line 125-130. Current block (read the file first to confirm exact surrounding code):

```jsx
<td className="col-avg text-center avg-score-cell">
  ...
  <span className="avg-score-value">{jurorAvgMap.get(String(jid))}</span>
```

Change the span line to:

```jsx
<span className="vera-score-num">{jurorAvgMap.get(String(jid))}</span>
<span className="vera-score-denom">/100</span>
```

Keep the surrounding `<td>` with `avg-score-cell` and any conditional empty-state fallback (`—`) unchanged — do not append `/100` to the em-dash.

- [ ] **Step 2: Visual check — Jurors table**

Open `/admin/jurors`, verify the Avg column shows `77.8 /100` with accent mono numerator + dim small `/100`. Confirm empty-state rows still render `—` without `/100`.

---

### Task 4: Migrate ProjectsTable

**Files:**

- Modify: `src/admin/features/projects/components/ProjectsTable.jsx:250-252`

- [ ] **Step 1: Append the denom span**

Edit `src/admin/features/projects/components/ProjectsTable.jsx` around line 251. Current:

```jsx
<span className="avg-score-value vera-score-num">{projectAvgMap.get(project.id)}</span>
```

Change to:

```jsx
<span className="vera-score-num">{projectAvgMap.get(project.id)}</span>
<span className="vera-score-denom">/100</span>
```

Rationale: `avg-score-value` on the span was redundant with `vera-score-num` and has no remaining CSS hook here. The cell-level `avg-score-cell` on the parent `<td>` (for color gradient) stays.

- [ ] **Step 2: Visual check — Projects table**

Open `/admin/projects`, verify the Avg Score column renders `90.9 /100` styled correctly. Confirm empty-state `—` rows unchanged.

---

### Task 5: Migrate HeatmapPage

**Files:**

- Modify: `src/admin/features/heatmap/HeatmapPage.jsx:487, 507, 520`

- [ ] **Step 1: Replace all three avg-score-value spans**

Edit `src/admin/features/heatmap/HeatmapPage.jsx`. At each of lines 487, 507, 520:

Current pattern:

```jsx
<span className="avg-score-value">{someAvg.toFixed(1)}</span>
```

Change each to:

```jsx
<span className="vera-score-num">{someAvg.toFixed(1)}</span>
<span className="vera-score-denom">/100</span>
```

Keep `avg-score-cell` on the parent `<td>`, `aria-label`s, and surrounding conditional logic unchanged.

- [ ] **Step 2: Visual check — Heatmap matrix**

Open `/admin/heatmap`, verify:
- Per-juror row average (rightmost cell per juror row) — styled.
- Per-project column average (bottom footer row) — styled.
- Overall grand average cell (bottom-right corner) — styled.

Check light + dark mode. Confirm the partial-flag badge (`m-flag`) still sits correctly next to the number.

---

### Task 6: Cleanup verification

**Files:**

- None (verification only)

- [ ] **Step 1: Audit for stale classes**

Run: `grep -rn "avg-score-value" src/admin/features/heatmap src/admin/features/jurors src/admin/features/projects`
Expected: no matches in the three migrated pages.

Run: `grep -rn "kpi-value-denom" src/`
Expected: no matches.

- [ ] **Step 2: Run unit tests**

Run: `npm test -- --run`
Expected: all existing tests pass. No test changes expected — tests assert on numeric values, not span structure.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: clean build, no warnings about missing CSS classes.

- [ ] **Step 4: Cross-mode visual sweep**

With `npm run dev` running, sweep Overview → Jurors → Projects → Heatmap in both light and dark mode. Confirm the score treatment is consistent across all four surfaces.

---

## Self-Review Notes

- **Spec coverage:** All five spec call-site changes (CSS add, CSS delete, Overview, Jurors, Projects, Heatmap) are covered by tasks 1–5. Task 6 is the final audit.
- **Rankings:** Intentionally out of scope per spec — can adopt `vera-score-denom` later without this plan.
- **No new tests:** This is a pure visual refactor. Unit tests would assert against implementation details (span structure); visual verification in Task 6 Step 4 is the correct gate.
- **Commits:** Hold all changes for one commit at the end, pending user's explicit request (per project git rules — never auto-commit).
