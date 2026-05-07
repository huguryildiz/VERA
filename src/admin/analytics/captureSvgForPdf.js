// src/admin/analytics/captureSvgForPdf.js
// ============================================================
// Embeds a recharts SVG element directly into a jsPDF document
// as vector graphics via svg2pdf.js. Falls back to raster on failure.
// ============================================================

/**
 * Style properties that must be inlined for svg2pdf.js to render correctly.
 * svg2pdf.js cannot read CSS variables or stylesheet rules — only inline attrs.
 */
const INLINE_PROPS = [
  "fill",
  "stroke",
  "font-family",
  "font-size",
  "font-weight",
  "opacity",
  "stroke-width",
  "stroke-dasharray",
  "stroke-dashoffset",
  "text-anchor",
  "dominant-baseline",
  "visibility",
];

/**
 * Recursively walks original and cloned element trees in parallel,
 * copying computed styles from original to clone as inline attributes.
 *
 * @param {Element} original - The live DOM element (used for getComputedStyle)
 * @param {Element} clone    - The cloned element (receives inline styles)
 */
function inlineStyles(original, clone) {
  if (!(original instanceof Element) || !(clone instanceof Element)) return;

  const computed = getComputedStyle(original);

  for (const prop of INLINE_PROPS) {
    const value = computed.getPropertyValue(prop);
    if (value && value !== "none" && value !== "normal" && value !== "") {
      clone.setAttribute(prop, value);
    }
  }

  // Force font-family to Inter on text elements (matches PDF embedded font)
  const tag = clone.tagName.toLowerCase();
  if (tag === "text" || tag === "tspan") {
    clone.setAttribute("font-family", "Inter");
  }

  // Skip hidden elements entirely
  if (computed.display === "none" || computed.visibility === "hidden") {
    clone.setAttribute("visibility", "hidden");
    return;
  }

  // Recurse into children
  const origChildren = original.children;
  const cloneChildren = clone.children;
  const len = Math.min(origChildren.length, cloneChildren.length);
  for (let i = 0; i < len; i++) {
    inlineStyles(origChildren[i], cloneChildren[i]);
  }
}

/**
 * Embeds a recharts SVG chart into a jsPDF document as vector graphics.
 *
 * @param {string} elementId - DOM ID of the chart container (e.g. "pdf-chart-outcome-by-group")
 * @param {object} doc       - jsPDF document instance
 * @param {number} x         - X position in mm
 * @param {number} y         - Y position in mm
 * @param {number} width     - Target width in mm
 * @param {number} height    - Target height in mm
 * @returns {Promise<boolean>} true if SVG was embedded, false otherwise
 */
export async function captureSvgForPdf(elementId, doc, x, y, width, height) {
  const container = document.getElementById(elementId);
  if (!container) return false;

  const originalSvg = container.querySelector("svg");
  if (!originalSvg) return false;

  // Add pdf-capture-mode for dark-mode CSS resolution
  container.classList.add("pdf-capture-mode");

  try {
    // Deep-clone the SVG to avoid mutating the live DOM
    const clonedSvg = originalSvg.cloneNode(true);

    // Walk original + clone trees in parallel to copy computed styles
    inlineStyles(originalSvg, clonedSvg);

    // Ensure viewBox is set for proper scaling
    if (!clonedSvg.getAttribute("viewBox")) {
      const w = originalSvg.width.baseVal.value || originalSvg.clientWidth;
      const h = originalSvg.height.baseVal.value || originalSvg.clientHeight;
      if (w && h) {
        clonedSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      }
    }

    // Remove width/height attrs so svg2pdf uses our target dimensions
    clonedSvg.removeAttribute("width");
    clonedSvg.removeAttribute("height");

    // Lazy-import svg2pdf.js and embed
    const { svg2pdf } = await import("svg2pdf.js");
    await svg2pdf(clonedSvg, doc, { x, y, width, height });

    return true;
  } finally {
    container.classList.remove("pdf-capture-mode");
  }
}
