// src/shared/CollapsibleEditorItem.jsx
// ============================================================
// Shared collapsible shell for dense admin editor rows/cards.
// Keeps the toggle separate from any drag or delete actions.
// ============================================================

import { useId } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "./Icons";

export default function CollapsibleEditorItem({
  open,
  onToggle,
  summaryLabel,
  summary,
  children,
  className = "",
  toolbar = null,
  toolbarClassName = "",
  summaryClassName = "",
  bodyClassName = "",
}) {
  const bodyId = useId();

  return (
    <div className={["collapsible-editor", open ? "is-open" : "is-collapsed", className].filter(Boolean).join(" ")}>
      {toolbar && (
        <div className={["collapsible-editor__toolbar", toolbarClassName].filter(Boolean).join(" ")}>
          {toolbar}
        </div>
      )}
      <button
        type="button"
        className={["collapsible-editor__trigger", summaryClassName].filter(Boolean).join(" ")}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={bodyId}
        aria-label={summaryLabel}
      >
        <div className="collapsible-editor__trigger-inner">
          {summary}
        </div>
        <span className="flex-shrink-0" aria-hidden="true">
          {open ? (
            <ChevronUpIcon className="collapsible-editor__chevron" />
          ) : (
            <ChevronDownIcon className="collapsible-editor__chevron" />
          )}
        </span>
      </button>
      {open && (
        <div
          id={bodyId}
          className={["collapsible-editor__body", bodyClassName].filter(Boolean).join(" ")}
        >
          {children}
        </div>
      )}
    </div>
  );
}
