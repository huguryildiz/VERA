// src/shared/ui/FilterButton.jsx
import { Filter } from "lucide-react";
import "./FilterButton.css";

export function FilterButton({ activeCount = 0, isOpen = false, onClick, className = "", testId }) {
  const classes = `btn btn-outline btn-sm${isOpen ? " active" : ""}${className ? ` ${className}` : ""}`;
  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      data-testid={testId}
    >
      <Filter size={14} style={{ verticalAlign: "-1px" }} />
      {" "}Filter
      {activeCount > 0 && (
        <span className="filter-badge">{activeCount}</span>
      )}
    </button>
  );
}
