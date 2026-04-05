# Export UI Alignment Design

**Date:** 2026-04-05
**Status:** Approved

## Problem

Exports across admin pages do not consistently reflect what is shown in the UI:

- **RankingsPage:** exports all ranked rows (`rankedRows`) even when filters are active; the table shows `filteredRows`
- **ProjectsPage:** export headers (`"Project"`, `"Title"`, `"Updated"`, `"Advisor"`) differ from table headers (`"#"`, `"Project Title"`, `"Last Updated"`); `Advisor` column is not shown in the table
- **JurorsPage:** export headers (`"Affiliation"`, `"Completed"`, `"Total Projects"`) differ from table headers (`"Projects Evaluated"`, `"Last Active"`); `Affiliation` is not shown in the table; `Last Active` is missing from export

## Goal

Export output must match what is visible in the UI:

1. **Same data:** if filters are active, only export the visible (filtered) rows
2. **Same columns:** export column names must exactly match table column headers
3. **No extra columns:** columns not shown in the table are not included in the export

## Scope

| Page | Data fix | Column fix |
|---|---|---|
| RankingsPage | ✅ `filteredRows` instead of `rankedRows` | — headers already correct |
| ProjectsPage | — already `filteredList` | ✅ align headers, remove `Advisor` |
| JurorsPage | — already `filteredList` | ✅ align headers, remove `Affiliation` |
| ReviewsPage | — ✅ already correct | — ✅ already correct |
| HeatmapPage | — ✅ already correct | — ✅ already correct |

## Pattern: COLUMNS constant

For pages with column name mismatches (ProjectsPage, JurorsPage), introduce a `COLUMNS` array at the top of the file. Both `<thead>` and the export handler read from this single source.

```js
const COLUMNS = [
  { key: "group_no", label: "#",            width: 40  },
  { key: "title",    label: "Project Title", width: null },
  { key: "members",  label: "Team Members",  width: null },
  { key: "updated",  label: "Last Updated",  width: 130 },
];

// thead
<tr>{COLUMNS.map(c => <th key={c.key} style={c.width ? { width: c.width } : {}}>{c.label}</th>)}</tr>

// export
const header = COLUMNS.map(c => c.label);
const rows = filteredList.map(p => COLUMNS.map(c => getCell(p, c.key)));
const colWidths = COLUMNS.map(c => c.width ?? 24);
```

The `width` field serves both `<th>` styling and `colWidths` in `downloadTable` — eliminating a third duplication point.

This is the same principle already used by ReviewsPage via `scoreCols`.

RankingsPage is excluded from this pattern because its columns are dynamic (derived from `criteriaConfig`) and already correct — only the data source needs fixing.

## Per-page specification

### RankingsPage

- `handleExport`: change `rankedRows` → `filteredRows`
- `generateFile` (SendReportModal prop): change `rankedRows` → `filteredRows`
- No column changes needed

### ProjectsPage

`COLUMNS`:

| key | label | width |
|---|---|---|
| `group_no` | `#` | 40 |
| `title` | `Project Title` | — |
| `members` | `Team Members` | — |
| `updated_at` | `Last Updated` | 130 |

`getCell` maps `updated_at` → `formatUpdated(p.updated_at)`.

Removed: `Advisor` column from export.

### JurorsPage

`COLUMNS`:

| key | label | width |
|---|---|---|
| `name` | `Juror Name` | 28 |
| `progress` | `Projects Evaluated` | 20 |
| `status` | `Status` | 14 |
| `lastActive` | `Last Active` | 18 |

`getCell` maps:
- `name` → `j.juryName || j.juror_name || ""`
- `progress` → `"${j.overviewScoredProjects ?? 0} / ${j.overviewTotalProjects ?? 0}"` (same format as table cell)
- `status` → `j.overviewStatus || ""`
- `lastActive` → `formatFull(j.lastSeenAt || j.last_activity_at || j.finalSubmittedAt || j.final_submitted_at)` (full datetime for export, `formatRelative` stays in the table)

Removed: `Affiliation` column from export.

## Edge cases

- **`Projects Evaluated` with no assignments:** renders as `"0 / 0"` — consistent with table display
- **RankingsPage with no active filters:** `filteredRows === rankedRows`, behaviour unchanged
- **`Last Active` null/undefined:** `formatFull` returns `""` when falsy — same guard as `formatRelative`

## Testing

- `src/admin/__tests__/export.test.js`: add test for RankingsPage exporting `filteredRows` when a filter is active
- Column header alignment verified by asserting the first row of generated export data matches `COLUMNS.map(c => c.label)`
- No new unit tests for `COLUMNS` constants themselves — integration-level coverage is sufficient
