import { JURORS, PROJECTS, PERIODS } from "./showcaseData";

const STATUS_MAP = {
  done: { label: "Done", cls: "success" },
  editing: { label: "Editing", cls: "purple" },
  inprogress: { label: "In Progress", cls: "warn" },
};

export default function SlideManagement() {
  return (
    <div className="ps-window">
      <div className="ps-toolbar">
        <div className="ps-toolbar-dots"><span /><span /><span /></div>
        <span className="ps-toolbar-label">management</span>
      </div>
      <div className="ps-body">
        <div className="ps-mgmt-grid">
          {/* Jurors */}
          <div className="ps-mgmt-section">
            <div className="ps-mgmt-title">Jurors</div>
            {JURORS.map((j) => {
              const st = STATUS_MAP[j.status] || STATUS_MAP.inprogress;
              return (
                <div key={j.initials} className="ps-juror-row">
                  <div className="ps-juror-avatar" style={{ background: `linear-gradient(135deg, ${j.color}, ${j.color}cc)` }}>{j.initials}</div>
                  <div className="ps-juror-info">
                    <div className="ps-juror-name">{j.name}</div>
                    <div className="ps-juror-dept">{j.affiliation}</div>
                  </div>
                  <span className={`ps-badge ${st.cls}`}>{st.label}</span>
                </div>
              );
            })}
          </div>

          {/* Projects + Periods */}
          <div className="ps-mgmt-right">
            <div className="ps-mgmt-section">
              <div className="ps-mgmt-title">Projects</div>
              {PROJECTS.slice(0, 3).map((p) => (
                <div key={p.code} className="ps-project-row">
                  <span className="ps-project-code">{p.code}</span>
                  <span className="ps-project-title">{p.title}</span>
                  <span className="ps-project-team">{p.team} members</span>
                </div>
              ))}
            </div>
            <div className="ps-mgmt-section">
              <div className="ps-mgmt-title">Periods</div>
              {PERIODS.map((p) => (
                <div key={p.name} className="ps-period-badge">
                  <span className="ps-period-name">{p.name}</span>
                  <span className={`ps-badge ${p.status === "active" ? "success" : "neutral"}`}>
                    {p.status === "active" ? "Active" : "Locked"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
