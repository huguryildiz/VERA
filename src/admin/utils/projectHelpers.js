// src/admin/projects/projectHelpers.js

export function splitStudents(text) {
  if (!text) return [];
  return String(text)
    .replace(/\r\n?/g, "\n")
    .replace(/\n+/g, ";")
    .replace(/[,/|&]+/g, ";")
    .replace(/\s+-\s+/g, ";")
    .replace(/;+/g, ";")
    .split(";")
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

export function normalizeStudents(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => splitStudents(entry))
      .join("; ");
  }
  return splitStudents(value).join("; ");
}

export function parseStudentInputList(value) {
  const parsed = Array.isArray(value)
    ? value.flatMap((entry) => splitStudents(entry))
    : splitStudents(value);
  return parsed.length ? parsed : [""];
}

export function getInvalidStudentSeparators(text) {
  const matches = String(text || "").match(/(?:\.{2,}|\s+\.\s+|[,#&|/+*=:!?@$%^~`<>()[\]{}\\\n\r])/g) || [];
  const normalized = matches
    .map((token) => {
      if (/\.{2,}/.test(token)) return "..";
      if (/\s+\.\s+/.test(token)) return ".";
      if (/[\n\r]/.test(token)) return "newline";
      return token.trim();
    })
    .filter(Boolean);
  return [...new Set(normalized)];
}

export function buildCsvSeparatorReason(tokens) {
  if (!tokens.length) return "invalid separator";
  const quoted = tokens.map((t) => `"${t}"`).join(", ");
  return `invalid separator${tokens.length > 1 ? "s" : ""} ${quoted}`;
}

export function digitsOnly(value) {
  return String(value ?? "").replace(/\D+/g, "");
}
