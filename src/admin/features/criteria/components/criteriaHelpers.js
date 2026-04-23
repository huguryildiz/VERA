export function rubricBandClass(label) {
  const l = String(label || "").toLowerCase();
  if (l.includes("excel") || l.includes("outstanding")) return "crt-band-excellent";
  if (l.includes("good") || l.includes("profic")) return "crt-band-good";
  if (l.includes("fair") || l.includes("satisf") || l.includes("average") || l.includes("develop")) return "crt-band-fair";
  return "crt-band-poor";
}

export function bandRangeText(band) {
  if (band.min != null && band.max != null) return `${band.min}–${band.max}`;
  if (band.min != null) return `${band.min}+`;
  if (band.max != null) return `≤${band.max}`;
  return "";
}
