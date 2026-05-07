import { Filter, XCircle } from "lucide-react";
import CustomSelect from "@/shared/ui/CustomSelect";

export default function JurorsFilterPanel({
  affiliations,
  statusFilter,
  affilFilter,
  progressFilter,
  onStatusChange,
  onAffilChange,
  onProgressChange,
  onClearAll,
  onClose,
}) {
  return (
    <div className="filter-panel show">
      <div className="filter-panel-header">
        <div>
          <h4>
            <Filter size={14} style={{ display: "inline", marginRight: "4px", opacity: 0.5, verticalAlign: "-1px" }} />
            Filter Jurors
          </h4>
          <div className="filter-panel-sub">Narrow jurors by status, affiliation, and scoring progress.</div>
        </div>
        <button className="filter-panel-close" onClick={onClose}>&#215;</button>
      </div>
      <div className="filter-row">
        <div className="filter-group">
          <label>Status</label>
          <CustomSelect
            compact
            value={statusFilter}
            onChange={onStatusChange}
            options={[
              { value: "all", label: "All statuses" },
              { value: "completed", label: "Completed" },
              { value: "in_progress", label: "In Progress" },
              { value: "not_started", label: "Not Started" },
              { value: "editing", label: "Editing" },
              { value: "ready_to_submit", label: "Ready to Submit" },
            ]}
            ariaLabel="Status"
          />
        </div>
        <div className="filter-group">
          <label>Affiliation</label>
          <CustomSelect
            compact
            value={affilFilter}
            onChange={onAffilChange}
            options={[
              { value: "all", label: "All affiliations" },
              ...affiliations.map((a) => ({ value: a, label: a })),
            ]}
            ariaLabel="Affiliation"
          />
        </div>
        <div className="filter-group">
          <label>Scoring Progress</label>
          <CustomSelect
            compact
            value={progressFilter}
            onChange={onProgressChange}
            options={[
              { value: "all",          label: "All progress" },
              { value: "not_started",  label: "Not started (0%)" },
              { value: "partial_low",  label: "Partial (< 50%)" },
              { value: "partial_high", label: "Partial (≥ 50%)" },
              { value: "complete",     label: "Complete (100%)" },
            ]}
            ariaLabel="Scoring Progress"
          />
        </div>
        <button className="btn btn-outline btn-sm filter-clear-btn" onClick={onClearAll}>
          <XCircle size={12} strokeWidth={2} style={{ opacity: 0.5, verticalAlign: "-1px" }} />
          {" "}Clear all
        </button>
      </div>
    </div>
  );
}
