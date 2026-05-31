// src/admin/utils/criterionAbbr.js
// ============================================================
// Canonical criterion-label abbreviation helper.
// Shared by the Reviews table headers, Reviews mobile pills,
// and the Audit log score-submission chips so all three render
// the same short code for a given criterion.
//
// "Technical Content"     → "TC"
// "Written Communication" → "WC"
// "Oral Communication"    → "OC"
// "Teamwork"              → "T"
//
// Rule: uppercase initials of the first two letter-leading words.
// Tokens not starting with a letter (e.g. "(30)", trailing max) are
// dropped, so callers may pass either the raw label or a decorated
// "Label (30)" column label.
// ============================================================

export function abbrCriterionLabel(label) {
  return (label || "")
    .split(/\s+/)
    .filter((w) => /^[a-zA-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}
