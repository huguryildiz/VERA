// Deterministic avatar gradient + initials helper for member chip avatars.
// Used by Projects mobile card (src/admin/pages/ProjectsPage.jsx) and
// extractable for other surfaces later.

const PALETTE = [
  "linear-gradient(135deg,#3b82f6,#2563eb)", // blue
  "linear-gradient(135deg,#8b5cf6,#7c3aed)", // purple
  "linear-gradient(135deg,#10b981,#059669)", // green
  "linear-gradient(135deg,#f59e0b,#d97706)", // amber
  "linear-gradient(135deg,#ec4899,#db2777)", // pink
];

export function avatarGradient(name) {
  const key = String(name ?? "");
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

const TITLE_PREFIXES = /^(dr|prof|doç|doc|yrd|arş|ars|öğr|ogr|gör|gor|uzm|ing|mr|mrs|ms|miss)\.?$/i;

export function initials(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  const nameParts = parts.filter((p) => !TITLE_PREFIXES.test(p));
  const effective = nameParts.length ? nameParts : parts;
  if (!effective.length) return "?";
  const up = (s) => s.toLocaleUpperCase("tr-TR");
  if (effective.length === 1) return up(effective[0].slice(0, 2));
  return up(effective[0][0] + effective[effective.length - 1][0]);
}
