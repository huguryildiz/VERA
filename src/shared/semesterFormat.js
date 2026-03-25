// src/shared/semesterFormat.js
// ============================================================
// Semester display-name helpers (pure functions).
// ============================================================

/**
 * @deprecated Semester names are now stored clean (no code prefix).
 * Kept as a no-op safety net during the transition period.
 *
 * Strips the tenant code prefix from a semester display name.
 * E.g. "boun-cs Spring 2026" with slug "boun-cs" → "Spring 2026"
 * Returns the semester_name unchanged if slug doesn't match or would leave empty.
 *
 * @param {string} name  Raw semester_name from DB.
 * @param {string} [slug] Tenant code to strip.
 * @returns {string}
 */
export function stripSlugPrefix(name, slug) {
  if (!name) return name || "";
  if (!slug) return name;
  if (name.startsWith(slug)) {
    const rest = name.slice(slug.length).replace(/^\s+/, "");
    return rest || name;
  }
  return name;
}
