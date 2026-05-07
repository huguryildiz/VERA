import { Filter, XCircle } from "lucide-react";
import CustomSelect from "@/shared/ui/CustomSelect";

export default function ProjectsFilterPanel({ filters, setFilters, filterActiveCount, distinctAdvisors, onClose }) {
  return (
    <div className="filter-panel show">
      <div className="filter-panel-header">
        <div>
          <h4>
            <Filter size={14} style={{ verticalAlign: "-1px", marginRight: "4px", opacity: 0.5, display: "inline" }} />
            Filter Projects
          </h4>
          <div className="filter-panel-sub">Narrow projects by evaluation coverage, advisor, score band, or team size.</div>
        </div>
        <button className="filter-panel-close" onClick={onClose}>&#215;</button>
      </div>
      <div className="filter-row">
        <div className="filter-group">
          <label>Evaluation Status</label>
          <div className="filter-toggle-group">
            {[["all", "All"], ["evaluated", "Evaluated"], ["not_evaluated", "Not Evaluated"]].map(([val, lbl]) => (
              <button
                key={val}
                className={`filter-toggle-btn${filters.evalStatus === val ? " filter-toggle-btn--active" : ""}`}
                onClick={() => setFilters((f) => ({ ...f, evalStatus: val }))}
              >{lbl}</button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <label>Advisor</label>
          <CustomSelect
            compact
            value={filters.advisor}
            onChange={(val) => setFilters((f) => ({ ...f, advisor: val }))}
            options={[{ value: "", label: "All Advisors" }, ...distinctAdvisors.map((a) => ({ value: a, label: a }))]}
            placeholder="All Advisors"
            ariaLabel="Advisor"
          />
        </div>
        <div className="filter-group">
          <label>Score Band</label>
          <div className="filter-toggle-group">
            {[["all", "All"], ["high", "High ≥85%"], ["mid", "Mid 70–84%"], ["low", "Low <70%"]].map(([val, lbl]) => (
              <button
                key={val}
                className={`filter-toggle-btn${filters.scoreBand === val ? " filter-toggle-btn--active" : ""}`}
                onClick={() => setFilters((f) => ({ ...f, scoreBand: val }))}
              >{lbl}</button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <label>Team Size</label>
          <div className="filter-toggle-group">
            {[["all", "All"], ["small", "1–2"], ["mid", "3–4"], ["large", "5+"]].map(([val, lbl]) => (
              <button
                key={val}
                className={`filter-toggle-btn${filters.teamSize === val ? " filter-toggle-btn--active" : ""}`}
                onClick={() => setFilters((f) => ({ ...f, teamSize: val }))}
              >{lbl}</button>
            ))}
          </div>
        </div>
        {filterActiveCount > 0 && (
          <button
            className="btn btn-outline btn-sm filter-clear-btn"
            onClick={() => setFilters({ evalStatus: "all", advisor: "", scoreBand: "all", teamSize: "all" })}
          >
            <XCircle size={12} strokeWidth={2} style={{ opacity: 0.5, verticalAlign: "-1px" }} />
            {" "}Clear all
          </button>
        )}
      </div>
    </div>
  );
}
