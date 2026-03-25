// src/admin/components/details/scoreDetailsFilterConfigs.jsx
// ============================================================
// Filter-config factory functions extracted from scoreDetailsColumns.
// Each factory returns a popover config object consumed by
// ScoreDetailsFilters.
// ============================================================

import { joinClass } from "./ScoreDetailsTable";
import {
  DATE_MIN_DATETIME,
  DATE_MAX_DATETIME,
  SCORE_FILTER_MIN,
  toFiniteNumber,
} from "../../hooks/useScoreDetailsFilters";

// ── Text filter ──────────────────────────────────────────────

export function makeTextFilter(
  title, value, setValue, placeholder, isActive,
  { useSheetFilters, closePopover, SearchIcon, FilterPanelActions }
) {
  return {
    title,
    className: "col-filter-popover col-filter-popover-portal",
    contentKey: value,
    sheetFooter: useSheetFilters ? (
      <FilterPanelActions
        onClear={() => setValue("")}
        onApply={closePopover}
        clearDisabled={!value}
      />
    ) : null,
    content: (
      <>
        <div className="col-filter-search-wrap">
          <span className="col-filter-search-icon" aria-hidden="true"><SearchIcon /></span>
          <input
            autoFocus={!useSheetFilters}
            placeholder={placeholder}
            aria-label={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={joinClass("col-filter-search-input", isActive && "filter-input-active")}
          />
        </div>
        {!useSheetFilters && value && (
          <button className="col-filter-clear" onClick={() => { setValue(""); closePopover(); }}>
            Clear
          </button>
        )}
      </>
    ),
  };
}

// ── Number range filter ──────────────────────────────────────

export function makeNumberRangeFilter(
  title, key, isActive,
  { scoreFilters, scoreMaxByKey, scoreFilterMax, updateScoreFilter, setScoreFilters, useSheetFilters, closePopover, FilterPanelActions }
) {
  const current = scoreFilters[key] || { min: "", max: "" };
  const minValue = current.min ?? "";
  const maxValue = current.max ?? "";
  const minNum = toFiniteNumber(minValue);
  const maxNum = toFiniteNumber(maxValue);
  const hasError = minNum !== null && maxNum !== null && minNum > maxNum;
  const hasValue = !!(minValue || maxValue);
  const maxAllowed = Number.isFinite(scoreMaxByKey[key]) ? scoreMaxByKey[key] : scoreFilterMax;
  const clearRange = () => {
    setScoreFilters((prev) => ({ ...prev, [key]: { min: "", max: "" } }));
  };

  return {
    title,
    className: "col-filter-popover col-filter-popover-portal col-filter-popover-number",
    contentKey: `${minValue}|${maxValue}`,
    sheetFooter: useSheetFilters ? (
      <FilterPanelActions
        onClear={clearRange}
        onApply={closePopover}
        clearDisabled={!hasValue}
        applyDisabled={hasError}
      />
    ) : null,
    content: (
      <>
        <div className="range-field">
          <label>Min</label>
          <input
            autoFocus={!useSheetFilters}
            type="number"
            inputMode="decimal"
            min={SCORE_FILTER_MIN}
            max={maxAllowed}
            value={minValue}
            onChange={(e) => updateScoreFilter(key, "min", e.target.value)}
            className={isActive ? "filter-input-active" : ""}
          />
        </div>
        <div className="range-field">
          <label>Max</label>
          <input
            type="number"
            inputMode="decimal"
            min={SCORE_FILTER_MIN}
            max={maxAllowed}
            value={maxValue}
            onChange={(e) => updateScoreFilter(key, "max", e.target.value)}
            className={isActive ? "filter-input-active" : ""}
          />
        </div>
        {hasError && (
          <div className="range-error">Min must be ≤ Max.</div>
        )}
        {!useSheetFilters && hasValue && (
          <button
            type="button"
            className="col-filter-clear"
            onClick={clearRange}
          >
            Clear
          </button>
        )}
      </>
    ),
  };
}

// ── Select filter ────────────────────────────────────────────

export function makeSelectFilter(
  title, value, setValue, options, allLabel, isActive,
  { useSheetFilters, closePopover, FilterPanelActions }
) {
  return {
    title,
    className: "col-filter-popover col-filter-popover-portal",
    contentKey: value,
    sheetFooter: useSheetFilters ? (
      <FilterPanelActions
        onClear={() => setValue("")}
        onApply={closePopover}
        clearDisabled={!value}
      />
    ) : null,
    content: (
      <>
        <select
          autoFocus={!useSheetFilters}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (!useSheetFilters) closePopover();
          }}
          aria-label={allLabel}
          className={isActive ? "filter-input-active" : ""}
        >
          <option value="">{allLabel}</option>
          {options.map((label) => (
            <option key={label} value={label}>{label}</option>
          ))}
        </select>
        {!useSheetFilters && value && (
          <button className="col-filter-clear" onClick={() => { setValue(""); closePopover(); }}>
            Clear
          </button>
        )}
      </>
    ),
  };
}

// ── Multi-select filter ──────────────────────────────────────

export function makeMultiFilter(
  title, options, selected, setSelected, allLabel, allMode = "empty",
  searchable = false, searchQuery = "", setSearchQuery = () => {},
  { useSheetFilters, closePopover, toggleMulti, SearchIcon, FilterPanelActions }
) {
  const optionValues = options.map((o) => (typeof o === "string" ? o : o.value));
  const isAll = allMode === "all" ? selected == null : (Array.isArray(selected) && selected.length === 0);
  const hasSelection = allMode === "all"
    ? selected !== null
    : (Array.isArray(selected) && selected.length > 0);
  const clearSelection = () => setSelected(allMode === "all" ? null : []);
  const toggleOption = (val) => {
    if (isAll && allMode === "all") {
      setSelected(optionValues.filter((v) => v !== val));
      return;
    }
    if (!Array.isArray(selected) || selected.length === 0) {
      setSelected([val]);
      return;
    }
    toggleMulti(val, selected, setSelected, optionValues);
  };
  const filteredOptions = searchable && searchQuery.trim()
    ? options.filter((o) => {
        const lbl = typeof o === "string" ? o : o.label;
        return lbl.toLowerCase().includes(searchQuery.trim().toLowerCase());
      })
    : options;

  const searchNode = searchable ? (
    <div className="col-filter-search-wrap multi-filter-search-wrap">
      <span className="col-filter-search-icon" aria-hidden="true"><SearchIcon /></span>
      <input
        autoFocus={!useSheetFilters}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={`Search ${allLabel.replace(/^All\s+/i, "").toLowerCase()}`}
        className="multi-filter-search col-filter-search-input"
        aria-label={`Search ${allLabel}`}
      />
    </div>
  ) : null;

  const optionsNode = (
    <>
      <label className="status-option">
        <input
          type="checkbox"
          checked={isAll}
          onChange={() => {
            if (allMode === "all") {
              setSelected(isAll ? [] : null);
            } else {
              setSelected([]);
            }
          }}
        />
        <span>{allLabel}</span>
      </label>
      {filteredOptions.map((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        const lbl = typeof opt === "string" ? opt : opt.label;
        return (
          <label key={val} className="status-option">
            <input
              type="checkbox"
              checked={isAll || (Array.isArray(selected) && selected.includes(val))}
              onChange={() => toggleOption(val)}
            />
            <span>{lbl}</span>
          </label>
        );
      })}
      {searchable && searchQuery.trim() && filteredOptions.length === 0 && (
        <div className="multi-filter-empty">No results</div>
      )}
    </>
  );

  return {
    title,
    className: "col-filter-popover col-filter-popover-portal col-filter-popover-multi",
    contentKey: Array.isArray(selected) ? selected.join("|") : "ALL",
    sheetBodyClassName: useSheetFilters
      ? `filter-sheet-body--multi-options ${searchable ? "is-searchable" : "is-plain"}`
      : "",
    sheetSearch: useSheetFilters ? searchNode : null,
    sheetFooter: useSheetFilters ? (
      <FilterPanelActions
        onClear={clearSelection}
        onApply={closePopover}
        clearDisabled={!hasSelection}
      />
    ) : null,
    content: (
      useSheetFilters ? (
        <div className="filter-sheet-multi-options-content">
          {optionsNode}
        </div>
      ) : (
        <>
          {searchNode}
          {optionsNode}
          {hasSelection && (
            <button className="col-filter-clear" onClick={() => { clearSelection(); closePopover(); }}>
              Clear
            </button>
          )}
        </>
      )
    ),
  };
}

// ── Date-range filter ────────────────────────────────────────

export function makeDateRangeFilter(
  col, filter,
  { useSheetFilters, closePopover, FilterPanelActions }
) {
  const from = filter.value?.from ?? "";
  const to = filter.value?.to ?? "";
  const parsedFrom = filter.parsedFrom;
  const parsedTo = filter.parsedTo;
  const parsedFromMs = parsedFrom ? parsedFrom.ms : null;
  const parsedToMs = parsedTo ? parsedTo.ms : null;
  const isInvalidRange = parsedFromMs !== null && parsedToMs !== null && parsedFromMs > parsedToMs;
  const isDateFilterActive = filter.isActive;
  const dateError = filter.error;
  const setDateError = filter.setError || (() => {});
  const setFrom = filter.setFrom || (() => {});
  const setTo = filter.setTo || (() => {});
  const validateDate = () => {
    if (to && !from) return "The 'From' date is required.";
    if ((from && parsedFromMs === null) || (to && parsedToMs === null)) return "Invalid date format.";
    if (isInvalidRange) return "The 'From' date cannot be later than the 'To' date.";
    return null;
  };
  const handleDateBlur = () => {
    setDateError(validateDate());
  };
  const handleApply = () => {
    const nextError = validateDate();
    setDateError(nextError);
    if (!nextError) closePopover();
  };
  const hasDateValue = !!(from || to);
  return {
    title: col.label,
    className: "col-filter-popover col-filter-popover-portal col-filter-popover-timestamp",
    contentKey: `${from}|${to}`,
    sheetFooter: useSheetFilters ? (
      <FilterPanelActions
        onClear={() => { setFrom(""); setTo(""); setDateError(null); }}
        onApply={handleApply}
        clearDisabled={!hasDateValue}
        applyDisabled={!!validateDate()}
      />
    ) : null,
    content: (
      <>
        <div className="timestamp-shortcuts" style={{ display: "flex", gap: 4, marginBottom: 6 }}>
          {[
            {
              label: "This Week",
              onClick: () => {
                const today = new Date();
                const day = today.getDay();
                const diffToMon = (day === 0 ? -6 : 1 - day);
                const mon = new Date(today);
                mon.setDate(today.getDate() + diffToMon);
                const sun = new Date(mon);
                sun.setDate(mon.getDate() + 6);
                const pad = (n) => String(n).padStart(2, "0");
                const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                setFrom(fmt(mon));
                setTo(fmt(sun));
                setDateError(null);
                closePopover();
              },
            },
            {
              label: "This Month",
              onClick: () => {
                const today = new Date();
                const pad = (n) => String(n).padStart(2, "0");
                const y = today.getFullYear();
                const m = today.getMonth() + 1;
                const lastDay = new Date(y, m, 0).getDate();
                setFrom(`${y}-${pad(m)}-01`);
                setTo(`${y}-${pad(m)}-${pad(lastDay)}`);
                setDateError(null);
                closePopover();
              },
            },
            {
              label: "All Time",
              onClick: () => { setFrom(""); setTo(""); setDateError(null); closePopover(); },
            },
          ].map(({ label, onClick }) => (
            <button
              key={label}
              type="button"
              className="col-filter-clear"
              style={{ fontSize: 11, padding: "2px 6px" }}
              onClick={onClick}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="timestamp-field">
          <label>From</label>
          <input
            autoFocus={!useSheetFilters}
            type="datetime-local"
            step="60"
            placeholder="YYYY-MM-DDThh:mm"
            value={from}
            min={DATE_MIN_DATETIME}
            max={DATE_MAX_DATETIME}
            onChange={(e) => setFrom(e.target.value)}
            onBlur={handleDateBlur}
            className={`timestamp-date-input ${dateError ? "is-invalid " : ""}${isDateFilterActive ? "filter-input-active" : ""}`}
            aria-invalid={!!dateError}
          />
        </div>
        <div className="timestamp-field">
          <label>To</label>
          <input
            type="datetime-local"
            step="60"
            placeholder="YYYY-MM-DDThh:mm"
            value={to}
            min={DATE_MIN_DATETIME}
            max={DATE_MAX_DATETIME}
            onChange={(e) => setTo(e.target.value)}
            onBlur={handleDateBlur}
            className={`timestamp-date-input ${dateError ? "is-invalid " : ""}${isDateFilterActive ? "filter-input-active" : ""}`}
            aria-invalid={!!dateError}
          />
        </div>
        {dateError && (
          <div className="timestamp-error" role="alert">{dateError}</div>
        )}
        {!useSheetFilters && hasDateValue && (
          <button className="col-filter-clear" onClick={() => { setFrom(""); setTo(""); setDateError(null); }}>
            Clear
          </button>
        )}
      </>
    ),
  };
}

// ── Popover config dispatcher ────────────────────────────────

export function buildPopoverConfig(activeFilterCol, columnsById, ctx) {
  if (!activeFilterCol) return null;
  const col = columnsById.get(activeFilterCol);
  const filter = col?.filter;
  if (!filter) return null;

  if (filter.type === "select") {
    return makeSelectFilter(col.label, filter.value, filter.setValue, filter.options, filter.allLabel, filter.isActive, ctx);
  }
  if (filter.type === "multi") {
    return makeMultiFilter(
      col.label,
      filter.options, filter.value, filter.setValue,
      filter.allLabel, filter.allMode,
      filter.searchable ?? false,
      ctx.multiSearchQuery, ctx.setMultiSearchQuery,
      ctx,
    );
  }
  if (filter.type === "text") {
    return makeTextFilter(col.label, filter.value, filter.setValue, filter.placeholder, filter.isActive, ctx);
  }
  if (filter.type === "numberRange") {
    return makeNumberRangeFilter(col.label, filter.filterKey, filter.isActive, ctx);
  }
  if (filter.type === "dateRange") {
    return makeDateRangeFilter(col, filter, ctx);
  }

  return null;
}
