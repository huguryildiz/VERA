import { useRef, useState, useEffect } from "react";
import { useTheme } from "@/shared/theme/ThemeProvider";

import tapDark from "@/assets/landing/showcase/jury-evaluate-mobile-dark.png";
import tapLight from "@/assets/landing/showcase/jury-evaluate-mobile-light.png";
import auditDark from "@/assets/landing/showcase/auditlog-dark.png";
import auditLight from "@/assets/landing/showcase/auditlog-light.png";
import rankDark from "@/assets/landing/showcase/rankings-dark.png";
import rankLight from "@/assets/landing/showcase/rankings-light.png";
import attainDark from "@/assets/landing/showcase/analytics-dark.png";
import attainLight from "@/assets/landing/showcase/analytics-light.png";
import reportDark from "@/assets/landing/showcase/overview-dark.png";
import reportLight from "@/assets/landing/showcase/overview-light.png";

const STATIONS = [
  {
    n: "01",
    stage: "Tap",
    label: "A juror taps",
    em: "“8”",
    caption: "Score input \xb7 on the phone",
    img: { dark: tapDark, light: tapLight },
    variant: "phone",
    alt: "Jury scoring screen — mobile portrait capture",
  },
  {
    n: "02",
    stage: "Persist",
    label: "Saved &",
    em: "chained",
    caption: "audit log \xb7 upsert \xb7 < 80 ms",
    img: { dark: auditDark, light: auditLight },
    alt: "Audit log entry capture",
  },
  {
    n: "03",
    stage: "Rank",
    label: "Rankings",
    em: "recompute",
    caption: "live \xb7 per project \xb7 per period",
    img: { dark: rankDark, light: rankLight },
    alt: "Live rankings page capture",
  },
  {
    n: "04",
    stage: "Attain",
    label: "Outcomes",
    em: "recalculate",
    caption: "criterion → outcome map \xb7 weighted",
    img: { dark: attainDark, light: attainLight },
    alt: "Outcome attainment chart capture",
  },
  {
    n: "05",
    stage: "Report",
    label: "Report",
    em: "ready",
    caption: "audit-chained \xb7 export-ready",
    img: { dark: reportDark, light: reportLight },
    alt: "Admin overview / export-ready capture",
  },
];

const N = STATIONS.length;

export default function FiveSteps() {
  const { theme } = useTheme();
  const sectionRef = useRef(null);
  const pathFillRef = useRef(null);
  const rafRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [frameText, setFrameText] = useState("01 / 05");
  const [stageName, setStageName] = useState(STATIONS[0].stage);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    function update() {
      const rect = section.getBoundingClientRect();
      const scrollable = section.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const scrolled = Math.max(0, Math.min(scrollable, -rect.top));
      const progress = scrolled / scrollable;

      const eff = Math.max(0, Math.min(1, (progress - 0.05) / 0.85));
      const idx = Math.min(N - 1, Math.floor(eff * N));

      setActiveIdx(idx);
      setFrameText(String(idx + 1).padStart(2, "0") + " / 0" + N);
      setStageName(STATIONS[idx].stage);

      const stageWidth = 100 / (N - 1);
      const pct = Math.min(100, idx * stageWidth + (eff * N - idx) * stageWidth);
      if (pathFillRef.current) pathFillRef.current.style.width = pct + "%";
    }

    function onScroll() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <section className="ed-five" id="five-steps" ref={sectionRef}>
      <div className="ed-five-sticky">
        <div className="ed-five-head">
          <span className="num">02</span>
          <h2>
            Five steps. <em>Five seconds</em>
          </h2>
          <div className="progress-meta">
            Frame &middot; <b>{frameText}</b>
            <br />
            <b>{stageName}</b>
          </div>
        </div>

        <div className="ed-five-stage-wrap">
          <div className="ed-five-path">
            <div className="ed-five-path-line" />
            <div className="ed-five-path-fill" ref={pathFillRef} />
          </div>

          <ol className="ed-five-stage">
            {STATIONS.map((s, i) => (
              <li key={s.n} className={`ed-five-station${i <= activeIdx ? " active" : ""}`}>
                <div className="stamp">
                  <span className="step-n">{s.n}</span>
                  <span>{s.stage}</span>
                </div>
                <div className={`shot${s.variant === "phone" ? " shot--phone" : ""}`}>
                  <span className="corner-tl" />
                  <span className="corner-tr" />
                  <span className="corner-bl" />
                  <span className="corner-br" />
                  <div className="shot-inner">
                    <img
                      src={theme === "dark" ? s.img.dark : s.img.light}
                      alt={s.alt}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>
                <div className="label">
                  {s.label} <em className="editorial-italic">{s.em}</em>
                </div>
                <div className="caption">{s.caption}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
