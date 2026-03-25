// src/admin/components/details/ScoreDetailsHeader.jsx
// ============================================================
// Presentational component: section header with export button.
// Extracted from ScoreDetails.jsx.
// ============================================================

import { DownloadIcon } from "../../../shared/Icons";

export default function ScoreDetailsHeader({
  filteredCount,
  onExport,
}) {
  return (
    <div className="admin-section-header">
      <div className="section-label">Details</div>
      <div className="admin-section-actions">
        <button
          className="xlsx-export-btn"
          onClick={onExport}
        >
          <DownloadIcon />
          <span className="export-label">Export XLSX ({filteredCount} rows)</span>
        </button>
      </div>
    </div>
  );
}
