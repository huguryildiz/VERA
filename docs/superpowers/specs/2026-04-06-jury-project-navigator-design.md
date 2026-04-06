# Jury Project Navigator — Design Spec

## Problem

During the jury scoring flow, evaluators have no way to see per-project completion
status at a glance. With 20+ projects in a typical session, the current `1/10`
pagination counter and prev/next arrows provide no information about which projects
are scored, partially scored, or untouched. Jurors must navigate one-by-one to check.

## Solution

Two complementary components replace the current navigation UI:

1. **Segmented Progress Bar** — always-visible bar replacing the existing progress
   bar, where each segment represents one project color-coded by status
2. **Select Group Drawer** — bottom sheet triggered by tapping the project card,
   listing all projects with detailed status and direct-jump navigation

## Reference Mockup

Interactive prototype: `docs/concepts/jury-project-navigator.html`

## Component Details

### Segmented Progress Bar

Replaces the existing `dj-fh-progress` bar (solid gradient fill + percentage).

**Visual spec:**

- Container: `display: flex; gap: 2px` — same position as current progress bar
- Each segment: `flex: 1; height: 5px; border-radius: 3px`
- Active project segment: `height: 7px; margin-top: -1px; background: #3b82f6;
  box-shadow: 0 0 8px rgba(59,130,246,0.3)`
- Status colors: scored `#22c55e`, partial `#f59e0b`, empty `rgba(148,163,184,0.12)`
- Hover: `transform: scaleY(1.4)` — visual feedback, segments are clickable
- Click: navigates to that project (calls `handleNavigate`)

**Legend row** below the bar:

- Three items: `{count} scored` / `{count} partial` / `{count} empty`
- Font: 8px, uppercase, 700 weight, color matches status
- Each item has a 6px colored square dot

**Status derivation** (per project):

- **scored**: all criteria for the project have non-null values
  (`isAllFilled(scores, pid, effectiveCriteria)`)
- **partial**: at least one criterion filled, but not all
  (`filledCount > 0 && !isAllFilled`)
- **empty**: no criteria filled (`filledCount === 0`)

### Group Bar Changes

The current group bar has prev/next arrow buttons and a `projIdx/total` counter.

**Changes:**

- Remove `<ChevronLeft>` and `<ChevronRight>` nav buttons
- Remove `dj-group-bar-nav` wrapper
- Add right-aligned section: counter `9/20` + `<ChevronDown>` icon
- Student names row uses full card width (no longer constrained by nav buttons)
- Entire group bar is tappable (already has `cursor: pointer`) — opens the drawer
- The `onClick` on group-bar-info opens the drawer instead of doing nothing

### Select Group Drawer

Bottom sheet overlay triggered by tapping the group bar.

**Structure:**

```text
┌──────────────────────────────────────┐
│            ── handle ──              │
│  Select Group                    ✕   │
│──────────────────────────────────────│
│  ● 8 scored   ● 1 partial   ● 11 empty │
│──────────────────────────────────────│
│  P1  Wearable EMG Gesture...  ✓ 4/4 │
│      AÇ Ali · SÖ Selin · MD Mert    │
│  P2  Autonomous Greenhouse... ✓ 4/4 │
│      HY Hande · OA Onur · CA Ceren  │
│ >P9  Hyperspectral Imaging... ⚠ 2/4 │ ← active, highlighted
│      YD Yağmur · BK Barış · SÇ Seda │
│  P10 Wireless Power Trans...  0/4   │
│      MB Murat · ZA Zehra · CÖ Caner │
│  ...                                 │
└──────────────────────────────────────┘
```

**Drawer elements:**

- **Overlay**: fixed inset, `background: rgba(0,0,0,0.55)`, `backdrop-filter: blur(4px)`,
  click-to-close
- **Sheet**: `max-height: 80vh`, rounded top corners, slide-up animation
- **Handle**: 36px pill, centered, visual affordance for swipe-to-close (future)
- **Header**: "Select Group" title + close button (X)
- **Summary bar**: three status counts with colored dots (same as segmented bar legend)
- **Scrollable list**: all projects, active item auto-scrolled into view

**List item layout:**

- **P-badge**: `P1`, `P2`, etc. — monospace, `color: var(--accent)` / `#3b82f6`,
  11px, 600 weight (matches `project-no-badge` from reviews table)
- **Info column**: project title (11px, 600, ellipsis) + member avatars row
- **Member chips**: 16px avatar circle (colored, initials) + 9px name
- **Status badge**: right-aligned pill
  - scored: green bg, `✓ 4/4`
  - partial: amber bg, `⚠ 2/4`
  - empty: gray bg, `0/4`
- **Active item**: `background: rgba(59,130,246,0.08)`, `border-left: 3px solid #3b82f6`

**Behavior:**

- Tapping a list item calls `handleNavigate(index)` then closes the drawer
- Active item is scrolled into view on open (`scrollIntoView({ block: 'center' })`)
- Close on: overlay click, close button, `Escape` key
- Drawer does NOT interfere with autosave — `handleNavigate` already flushes
  pending scores before switching

## Files to Modify

| File | Change |
|---|---|
| `src/jury/steps/EvalStep.jsx` | Remove prev/next nav, add chevron-down, add SegmentedBar + ProjectDrawer |
| `src/styles/jury.css` | Add `.dj-seg-*` and `.dj-drawer-*` styles, remove `.dj-fh-progress` usage |
| `src/jury/utils/scoreState.js` | Add `getProjectStatus(scores, pid, criteria)` helper returning `'scored'\|'partial'\|'empty'` |

## Files NOT Changed

- `useJuryState.js` and sub-hooks — no state model changes needed; all data
  (`scores`, `projects`, `effectiveCriteria`, `handleNavigate`) already exposed
- `StepperBar.jsx` — unaffected, stepper is independent
- Database / RPCs — no schema changes

## Data Flow

```text
scores[pid][cid] ──→ getProjectStatus(scores, pid, criteria)
                       │
                       ├──→ SegmentedBar (color per segment)
                       └──→ ProjectDrawer (status badge per item)

handleNavigate(idx) ──→ writeGroup(currentPid) ──→ setCurrent(idx)
                         (existing autosave)       (existing workflow)
```

## Edge Cases

| Scenario | Behavior |
|---|---|
| 0 projects loaded | Segmented bar hidden, drawer shows empty state |
| 1 project | Single segment fills full width, drawer has 1 item |
| All scored | All segments green, legend shows `N scored / 0 partial / 0 empty` |
| All empty (fresh start) | All segments gray, active segment blue |
| Score changes on current project | Segment color updates reactively via `scores` state |
| Drawer open + background autosave | No conflict — drawer is read-only view of state |

## Light Mode Support

All new classes need `body:not(.dark-mode)` overrides following existing patterns:

- Segmented bar: scored stays green, partial stays amber, empty uses `rgba(0,0,0,0.06)`
- Drawer: uses same glass card pattern as existing overlays
- P-badge: uses `var(--accent)` which resolves correctly in both themes
- Status badges: same color tokens, adjusted opacity for light backgrounds

## Accessibility

- Drawer close on `Escape` key
- Segments have `title` attribute with project name for tooltip
- Drawer items are keyboard-focusable (future enhancement)
- Status text is screen-reader friendly (`✓ 4/4 scored` not just color)
