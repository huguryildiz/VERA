// src/admin/projects/ProjectImport.jsx

import { useRef, useState } from "react";
import { ChevronDownIcon, FileUpIcon, CloudUploadIcon } from "../../shared/Icons";
import { parseCsv } from "../utils";
import { getInvalidStudentSeparators, buildCsvSeparatorReason } from "./projectHelpers";

const MAX_CSV_BYTES = 2 * 1024 * 1024; // 2MB

export default function ProjectImport({
  show,
  onClose,
  onImport,
  semesterName,
  projects,
}) {
  const fileRef = useRef(null);
  const importCancelRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importSuccess, setImportSuccess] = useState("");
  const [importError, setImportError] = useState("");
  const [importWarning, setImportWarning] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  if (!show) return null;

  const handleFile = async (file) => {
    if (!file) return;
    setImportSuccess("");
    setImportError("");
    setImportWarning("");
    if (file.size > MAX_CSV_BYTES) {
      setImportError("File is too large. Maximum allowed size is 2MB.");
      return;
    }
    const fileName = String(file.name || "").toLowerCase();
    if (!fileName.endsWith(".csv")) {
      setImportError("Only .csv files are supported.");
      return;
    }
    const text = await file.text();
    const rows = parseCsv(text);
    if (!rows.length) {
      setImportError("The file appears to be empty. Check the file and try again.");
      return;
    }
    const header = rows[0].map((h) => h.toLowerCase());
    const idxGroup = header.indexOf("group_no");
    const idxTitle = header.indexOf("project_title");
    const idxStudents = header.indexOf("group_students");
    if (idxGroup < 0 || idxTitle < 0 || idxStudents < 0) {
      setImportError("Header row is required and must include: group_no, project_title, group_students.");
      return;
    }
    const invalidGroupRows = [];
    const invalidTitleRows = [];
    const invalidStudentsRows = [];
    const invalidStudentSeparatorSkips = [];
    const duplicateGroupRows = [];
    const seenGroups = new Set();
    const data = rows.slice(1).map((r) => {
      const studentsRaw = idxStudents >= 0 ? r[idxStudents] : "";
      const studentsText = String(studentsRaw || "").trim();
      const groupNo = Number(r[idxGroup] || 0);
      const title = String(r[idxTitle] || "").trim();
      const hasExtraValues = r.slice(idxStudents + 1).some((cell) => String(cell || "").trim() !== "");
      return {
        group_no: groupNo,
        project_title: title,
        group_students: studentsText,
        has_extra_values: hasExtraValues,
      };
    }).filter((r, idx) => {
      const rowNo = idx + 2; // include header row
      let isValid = true;
      if (!Number.isFinite(r.group_no) || r.group_no <= 0 || r.group_no > 999) {
        invalidGroupRows.push(rowNo);
        isValid = false;
      }
      if (!r.project_title) {
        invalidTitleRows.push(rowNo);
        isValid = false;
      }
      if (!r.group_students) {
        invalidStudentsRows.push(rowNo);
        isValid = false;
      }
      const invalidSeparators = getInvalidStudentSeparators(r.group_students);
      if (r.group_students.includes(",") || r.has_extra_values) {
        invalidSeparators.push(",");
      }
      const uniqueInvalidSeparators = [...new Set(invalidSeparators)];
      if (uniqueInvalidSeparators.length > 0) {
        invalidStudentSeparatorSkips.push({
          rowNo,
          groupNo: Number.isFinite(r.group_no) && r.group_no > 0 ? r.group_no : null,
          separators: uniqueInvalidSeparators,
        });
        isValid = false;
      }
      if (isValid && seenGroups.has(r.group_no)) {
        duplicateGroupRows.push(rowNo);
        isValid = false;
      }
      if (isValid && Number.isFinite(r.group_no) && r.group_no > 0) {
        seenGroups.add(r.group_no);
      }
      return isValid;
    });
    if (
      invalidGroupRows.length ||
      invalidTitleRows.length ||
      invalidStudentsRows.length ||
      duplicateGroupRows.length
    ) {
      const parts = [];
      if (invalidGroupRows.length) {
        parts.push(`Invalid group_no at rows: ${invalidGroupRows.slice(0, 6).join(", ")}.`);
      }
      if (invalidTitleRows.length) {
        parts.push(`Missing project_title at rows: ${invalidTitleRows.slice(0, 6).join(", ")}.`);
      }
      if (invalidStudentsRows.length) {
        parts.push(`Missing group_students at rows: ${invalidStudentsRows.slice(0, 6).join(", ")}.`);
      }
      if (duplicateGroupRows.length) {
        parts.push(`Duplicate group_no at rows: ${duplicateGroupRows.slice(0, 6).join(", ")}.`);
      }
      setImportError(parts.join(" "));
      return;
    }
    if (!data.length) {
      if (invalidStudentSeparatorSkips.length) {
        const details = invalidStudentSeparatorSkips
          .slice(0, 6)
          .map((item) => {
            const target = item.groupNo ? `group_no ${item.groupNo}` : `row ${item.rowNo}`;
            return `${target} (${buildCsvSeparatorReason(item.separators)})`;
          })
          .join("; ");
        const extraCount = Math.max(0, invalidStudentSeparatorSkips.length - 6);
        const extraText = extraCount > 0 ? ` +${extraCount} more` : "";
        setImportWarning(`• Skipped rows with invalid student separators: ${details}${extraText}.`);
        return;
      }
      setImportError("No valid rows found in CSV.");
      return;
    }
    const existingGroupNos = new Set(
      (projects || [])
        .map((p) => Number(p.group_no))
        .filter((n) => Number.isFinite(n) && n > 0)
    );
    const skippedExisting = data.filter((r) => existingGroupNos.has(r.group_no));
    const toImport = data.filter((r) => !existingGroupNos.has(r.group_no));
    const successMsg = toImport.length > 0
      ? `• Import complete: ${toImport.length} added, ${skippedExisting.length} skipped.`
      : "";

    const warningParts = [];
    if (skippedExisting.length) {
      warningParts.push(`• Skipped existing group_no: ${Array.from(new Set(skippedExisting.map((r) => r.group_no))).join(", ")}.`);
    }
    if (invalidStudentSeparatorSkips.length) {
      const details = invalidStudentSeparatorSkips
        .slice(0, 6)
        .map((item) => {
          const target = item.groupNo ? `group_no ${item.groupNo}` : `row ${item.rowNo}`;
          return `${target} (${buildCsvSeparatorReason(item.separators)})`;
        })
        .join("; ");
      const extraCount = Math.max(0, invalidStudentSeparatorSkips.length - 6);
      const extraText = extraCount > 0 ? ` +${extraCount} more` : "";
      warningParts.push(`• Skipped rows with invalid student separators: ${details}${extraText}.`);
    }
    const localWarning = warningParts.join("\n");
    setImportWarning(localWarning);

    if (!toImport.length) {
      return;
    }

    setIsImporting(true);
    importCancelRef.current = false;
    let res;
    try {
      res = await onImport(toImport, { cancelRef: importCancelRef });
    } finally {
      setIsImporting(false);
    }
    if (res?.cancelled) {
      setImportError("Import stopped. Rows processed before stopping were saved.");
      return;
    }
    if (res?.formError) {
      setImportError(res.formError);
      return;
    }
    if (res?.ok === false) {
      return;
    }
    // Success: show message only after import resolves
    setImportSuccess(successMsg);
    const serverSkipped = Number(res?.skipped || 0);
    if (serverSkipped > 0) {
      const extra = `• Skipped ${serverSkipped} existing groups during import.`;
      setImportWarning(localWarning ? `${localWarning}\n${extra}` : extra);
    }
    if (!skippedExisting.length && !invalidStudentSeparatorSkips.length && serverSkipped === 0) onClose();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    await handleFile(file);
    e.target.value = "";
  };

  return (
    <div className="manage-modal">
      <div className="manage-modal-card manage-modal-card--import-csv">
        <div className="edit-dialog__header">
          <span className="edit-dialog__icon" aria-hidden="true">
            <FileUpIcon />
          </span>
          <div className="edit-dialog__title">Import CSV</div>
        </div>
        <div className="manage-import-context-line">
          Groups will be added to{" "}
          <span className="manage-semester-emphasis-blink">{semesterName || "selected"}</span>{" "}
          semester.
        </div>
        <div className="manage-modal-body">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="manage-input"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <div
            className={`manage-dropzone${isDragging ? " is-dragging" : ""}${importError ? " is-error" : ""}`}
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              handleFile(file);
            }}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileRef.current?.click();
              }
            }}
          >
            <div className="manage-dropzone-icon" aria-hidden="true"><CloudUploadIcon /></div>
            <div className="manage-dropzone-title">Drag & Drop your CSV here</div>
            <button className="manage-btn manage-btn--import-select" type="button">
              Select CSV File
            </button>
            <div className="manage-dropzone-sub">Only .csv files supported</div>
            <div className="manage-dropzone-sub manage-dropzone-sub--muted">Max file size: 2MB</div>
          </div>
          {importError && (
            <div className="manage-import-feedback manage-import-feedback--error" role="alert">
              {importError}
            </div>
          )}
          {importSuccess && !importError && (
            <div className="manage-import-feedback manage-import-feedback--success" role="status">
              {importSuccess}
            </div>
          )}
          {importWarning && !importError && (
            <div className="manage-import-feedback manage-import-feedback--warn" role="status">
              {importWarning}
            </div>
          )}
          <details className="manage-collapsible">
            <summary className="manage-collapsible-summary">
              <span>CSV example</span>
              <ChevronDownIcon className="manage-collapsible-chevron" aria-hidden="true" />
            </summary>
            <div className="manage-collapsible-content">
              <div className="manage-code">group_no,project_title,group_students</div>
              <div className="manage-code">1,Autonomous Drone Navigation,Ali Yilmaz</div>
              <div className="manage-code">2,Power Quality Monitoring,Elif Kaya; Mert Arslan</div>
              <div className="manage-code">3,Embedded Vision for Robots,Zeynep Acar; Kerem Sahin; Ayse Demir</div>
            </div>
          </details>
          <details className="manage-collapsible">
            <summary className="manage-collapsible-summary">
              <span>Rules</span>
              <ChevronDownIcon className="manage-collapsible-chevron" aria-hidden="true" />
            </summary>
            <div className="manage-collapsible-content">
              <ul className="manage-hint-list manage-rules-list">
                <li>Header row is required with exact field names: <span className="manage-code-inline">group_no</span>, <span className="manage-code-inline">project_title</span>, <span className="manage-code-inline">group_students</span>.</li>
                <li><span className="manage-code-inline">group_no</span> must be a positive number and unique in the CSV.</li>
                <li><span className="manage-code-inline">project_title</span> and <span className="manage-code-inline">group_students</span> cannot be empty.</li>
                <li>One row must represent one group. Separate students with <span className="manage-code-inline">;</span> in <span className="manage-code-inline">group_students</span>.</li>
                <li>Existing <span className="manage-code-inline">group_no</span> values are skipped during import.</li>
              </ul>
            </div>
          </details>
        </div>
        <div className="manage-modal-actions">
          <button
            className="manage-btn manage-btn--import-cancel"
            type="button"
            onClick={() => {
              if (isImporting) {
                // Soft-cancel: stops loop between rows.
                // Note: true request abort is not feasible with the current Supabase RPC wrappers.
                importCancelRef.current = true;
              } else {
                onClose();
              }
            }}
          >
            {isImporting ? "Stop" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
