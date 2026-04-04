// src/admin/utils/csvParser.js
// ============================================================
// CSV parsing helpers for project and juror bulk import.
// Returns rows shaped for ImportCsvModal / ImportJurorsModal
// plus API-ready fields for handleImportProjects/handleImportJurors.
// ============================================================

import Papa from "papaparse";

function sizeLabel(file) {
  const kb = file.size / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

function normalizeHeader(h) {
  return h.trim().toLowerCase().replace(/[\s#-]+/g, "_");
}

function resolveColumns(headers, colMap) {
  const normalized = headers.map(normalizeHeader);
  const resolved = {};
  for (const [canonical, aliases] of Object.entries(colMap)) {
    const idx = normalized.findIndex((h) => aliases.includes(h));
    resolved[canonical] = idx >= 0 ? headers[idx] : null;
  }
  return resolved;
}

const PROJECT_COL_MAP = {
  group_no: ["group_no", "group_", "group_number", "groupno", "group"],
  title:    ["title", "project_title", "project_name", "name"],
  members:  ["members", "students", "team_members", "team", "student_names"],
};

const JUROR_COL_MAP = {
  juror_name:  ["juror_name", "name", "juror", "full_name", "fullname"],
  affiliation: ["affiliation", "department", "institution", "org", "company"],
  email:       ["email", "e_mail", "email_address"],
};

/**
 * Parse a projects CSV file.
 * @returns {{ rows, stats, warningMessage, file }}
 *   rows: [{ rowNum, groupNo, title, members, status, statusLabel, group_no }]
 *   stats: { valid, duplicate, error, total }
 */
export async function parseProjectsCsv(file) {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete({ data, meta }) {
        const colMap = resolveColumns(meta.fields || [], PROJECT_COL_MAP);
        const rows = [];
        let valid = 0;
        let error = 0;

        data.forEach((raw, i) => {
          const rowNum = i + 2; // +1 for header, +1 for 1-based index
          const groupNoRaw = colMap.group_no ? (raw[colMap.group_no] ?? "").trim() : "";
          const title = colMap.title ? (raw[colMap.title] ?? "").trim() : "";
          const members = colMap.members ? (raw[colMap.members] ?? "").trim() : "";

          const groupNo = groupNoRaw !== "" ? parseInt(groupNoRaw, 10) : NaN;
          const hasGroupNo = !isNaN(groupNo);
          const hasTitle = title.length > 0;

          let status = "ok";
          let statusLabel = "";
          if (!hasGroupNo || !hasTitle) {
            status = "err";
            statusLabel = !hasGroupNo ? "Missing group no" : "Missing title";
            error += 1;
          } else {
            valid += 1;
          }

          rows.push({
            rowNum,
            groupNo: hasGroupNo ? groupNo : (groupNoRaw || "—"),
            title: title || "—",
            members,
            status,
            statusLabel,
            // API-ready fields for handleImportProjects
            group_no: hasGroupNo ? groupNo : null,
          });
        });

        const warnings = [];
        if (!colMap.group_no) warnings.push("No 'group_no' column — expected 'Group No', 'Group #', or 'group_no'.");
        if (!colMap.title) warnings.push("No 'title' column — expected 'Title' or 'Project Title'.");
        if (!colMap.members) warnings.push("No 'members' column — team members will be blank.");

        resolve({
          rows,
          stats: { valid, duplicate: 0, error, total: data.length },
          warningMessage: warnings.length > 0
            ? { title: "Column mapping warnings", desc: warnings.join(" ") }
            : null,
          file: { name: file.name, sizeLabel: sizeLabel(file) },
        });
      },
      error() {
        resolve({
          rows: [],
          stats: { valid: 0, duplicate: 0, error: 0, total: 0 },
          warningMessage: { title: "Parse error", desc: "Could not parse the CSV file." },
          file: { name: file.name, sizeLabel: sizeLabel(file) },
        });
      },
    });
  });
}

/**
 * Parse a jurors CSV file.
 * @returns {{ rows, stats, warningMessage, file }}
 *   rows: [{ rowNum, name, affiliation, status, statusLabel, juror_name, email }]
 *   stats: { valid, duplicate, error, total }
 */
export async function parseJurorsCsv(file) {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete({ data, meta }) {
        const colMap = resolveColumns(meta.fields || [], JUROR_COL_MAP);
        const rows = [];
        let valid = 0;
        let error = 0;

        data.forEach((raw, i) => {
          const rowNum = i + 2;
          const jurorName = colMap.juror_name ? (raw[colMap.juror_name] ?? "").trim() : "";
          const affiliation = colMap.affiliation ? (raw[colMap.affiliation] ?? "").trim() : "";
          const email = colMap.email ? (raw[colMap.email] ?? "").trim() : "";

          let status = "ok";
          let statusLabel = "";
          if (!jurorName) {
            status = "err";
            statusLabel = "Missing name";
            error += 1;
          } else {
            valid += 1;
          }

          rows.push({
            rowNum,
            name: jurorName || "—",
            affiliation,
            status,
            statusLabel,
            // API-ready fields for handleImportJurors → createJuror
            juror_name: jurorName || null,
            email: email || null,
          });
        });

        const warnings = [];
        if (!colMap.juror_name) warnings.push("No name column — expected 'Name', 'Juror Name', or 'juror_name'.");
        if (!colMap.affiliation) warnings.push("No affiliation column found.");

        resolve({
          rows,
          stats: { valid, duplicate: 0, error, total: data.length },
          warningMessage: warnings.length > 0
            ? { title: "Column mapping warnings", desc: warnings.join(" ") }
            : null,
          file: { name: file.name, sizeLabel: sizeLabel(file) },
        });
      },
      error() {
        resolve({
          rows: [],
          stats: { valid: 0, duplicate: 0, error: 0, total: 0 },
          warningMessage: { title: "Parse error", desc: "Could not parse the CSV file." },
          file: { name: file.name, sizeLabel: sizeLabel(file) },
        });
      },
    });
  });
}
