// src/admin/criteria/MudekPillSelector.jsx

import { useState } from "react";
import Tooltip from "../../shared/Tooltip";
import { RUBRIC_EDITOR_TEXT } from "../../config";
import { getCriterionTintStyle } from "./criteriaFormHelpers";

function getMudekTooltipContent(code, outcome) {
  const descEn = String(outcome?.desc_en ?? "").trim();
  const descTr = String(outcome?.desc_tr ?? "").trim();
  return (
      <span className="criteria-tooltip-content">
      <span className="criteria-tooltip-line criteria-tooltip-line--title">{code}</span>
      {descEn && (
        <span className="criteria-tooltip-line criteria-tooltip-line--desc">
          🇬🇧 {descEn}
        </span>
      )}
      {descTr && (
        <span className="criteria-tooltip-line criteria-tooltip-line--desc">
          🇹🇷 {descTr}
        </span>
      )}
    </span>
  );
}

function getMudekTooltipLabel(code, outcome) {
  const descEn = String(outcome?.desc_en ?? "").trim();
  const descTr = String(outcome?.desc_tr ?? "").trim();
  const parts = [code];
  if (descEn) parts.push(`🇬🇧 ${descEn}`);
  if (descTr) parts.push(`🇹🇷 ${descTr}`);
  return parts.join(" — ");
}

export { getMudekTooltipContent, getMudekTooltipLabel };

export default function MudekPillSelector({ selected, mudekTemplate, onChange, disabled, criterionColor, open = false }) {
  const [query, setQuery] = useState("");
  const options = (mudekTemplate || []);
  const outcomeByCode = new Map(options.map((o) => [o.code, o]));
  const color = criterionColor || "#94A3B8";

  // Render-time sanitization: only show chips that still exist
  const validSelected = selected.filter((code) => outcomeByCode.has(code));

  if (options.length === 0) {
    return (
      <span className="criteria-mudek-empty">
        No MÜDEK Outcomes defined yet.
      </span>
    );
  }

  const filtered = query.trim()
    ? options.filter((o) =>
        o.code.includes(query.trim()) ||
        (o.desc_en || "").toLowerCase().includes(query.trim().toLowerCase())
      )
    : options;

  const toggle = (code) => {
    if (disabled) return;
    const next = selected.includes(code)
      ? selected.filter((c) => c !== code)
      : [...selected, code];
    onChange(next);
  };

  return (
    <div className="criteria-mudek-selector">
      <div className="manage-hint manage-hint-inline">Select the MÜDEK outcomes mapped to this criterion.</div>
      <div className="criteria-mudek-pills">
        {validSelected.length === 0 && (
          <span className="criteria-mudek-none">
            {selected.length > 0 ? "No valid mapping" : "None selected"}
          </span>
        )}
        {validSelected.map((code) => (
          <Tooltip
            key={code}
            text={getMudekTooltipContent(code, outcomeByCode.get(code))}
          >
            <span
              className="criteria-mudek-pill"
              style={getCriterionTintStyle(color)}
              tabIndex={0}
              aria-label={getMudekTooltipLabel(code, outcomeByCode.get(code))}
            >
              <span
                className="criteria-mudek-pill-label criteria-pill-typography"
              >
                {code}
              </span>
              {!disabled && (
                <Tooltip text={`Remove MÜDEK ${code}`}>
                  <button
                    type="button"
                    className="criteria-mudek-pill-remove"
                    onClick={() => toggle(code)}
                    aria-label={`Remove MÜDEK ${code}`}
                  >
                    ✕
                  </button>
                </Tooltip>
              )}
            </span>
          </Tooltip>
        ))}
      </div>

      {open && !disabled && (
        <div className="criteria-mudek-panel">
          <input
            className="manage-input criteria-mudek-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={RUBRIC_EDITOR_TEXT.mudekFilterPlaceholder}
            aria-label="Filter MÜDEK Outcomes"
          />
          <div className="criteria-mudek-chips">
            {filtered.map((o) => {
              const checked = selected.includes(o.code);
              return (
                <button
                  key={o.id}
                  type="button"
                  className={`criteria-mudek-chip${checked ? " selected" : ""}`}
                  style={checked ? getCriterionTintStyle(color, "33") : {}}
                  onClick={() => toggle(o.code)}
                  title={o.desc_en || o.code}
                >
                  {o.code}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
