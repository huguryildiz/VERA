import { Filter, XCircle } from "lucide-react";
import CustomSelect from "@/shared/ui/CustomSelect";

export default function CriteriaFilterPanel({
  mappingFilter,
  rubricFilter,
  onMappingChange,
  onRubricChange,
  onClose,
  onClearAll,
}) {
  return (
    <div className="filter-panel show">
      <div className="filter-panel-header">
        <div>
          <h4>
            <Filter size={14} style={{ display: "inline", marginRight: 4, opacity: 0.5, verticalAlign: "-1px" }} />
            Filter Criteria
          </h4>
          <div className="filter-panel-sub">Narrow criteria by outcome mapping and rubric state.</div>
        </div>
        <button className="filter-panel-close" aria-label="Close filter panel" onClick={onClose}>&#215;</button>
      </div>
      <div className="filter-row">
        <div className="filter-group">
          <label>Mapping</label>
          <CustomSelect
            compact
            value={mappingFilter}
            onChange={onMappingChange}
            options={[
              { value: "all", label: "All mappings" },
              { value: "mapped", label: "Mapped to outcomes" },
              { value: "unmapped", label: "Unmapped" },
            ]}
            ariaLabel="Mapping"
          />
        </div>
        <div className="filter-group">
          <label>Rubric</label>
          <CustomSelect
            compact
            value={rubricFilter}
            onChange={onRubricChange}
            options={[
              { value: "all", label: "All rubrics" },
              { value: "defined", label: "Rubric defined" },
              { value: "none", label: "No rubric" },
            ]}
            ariaLabel="Rubric"
          />
        </div>
        <button
          className="btn btn-outline btn-sm filter-clear-btn"
          onClick={onClearAll}
        >
          <XCircle size={12} strokeWidth={2} style={{ opacity: 0.5, verticalAlign: "-1px" }} />
          {" "}Clear all
        </button>
      </div>
    </div>
  );
}
