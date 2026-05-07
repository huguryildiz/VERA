// src/shared/ui/PremiumTooltip.jsx
// Global premium glass tooltip — mirrors the Consensus badge hover style.
// Usage: <PremiumTooltip text="..."><YourElement /></PremiumTooltip>

import "./PremiumTooltip.css";
import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";

export default function PremiumTooltip({ children, text, position = "top" }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: -9999, left: -9999 });
  const [side, setSide] = useState(position);
  const triggerRef = useRef(null);
  const tipRef = useRef(null);

  useLayoutEffect(() => {
    if (!visible || !triggerRef.current || !tipRef.current) return;

    const place = () => {
      const tr = triggerRef.current?.getBoundingClientRect();
      const tp = tipRef.current?.getBoundingClientRect();
      if (!tr || !tp) return;

      const gap = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let s = position;
      if (s === "top" && tr.top - tp.height - gap < 0) s = "bottom";
      else if (s === "bottom" && tr.bottom + tp.height + gap > vh) s = "top";
      setSide(s);

      let top = s === "top"
        ? tr.top - tp.height - gap
        : tr.bottom + gap;

      top = Math.max(gap, Math.min(top, vh - tp.height - gap));

      let left = tr.left + tr.width / 2 - tp.width / 2;
      if (left < gap) left = gap;
      else if (left + tp.width + gap > vw) left = vw - tp.width - gap;

      setCoords({ top, left });
    };

    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [visible, position]);

  // Close on outside touch or scroll when visible via touch
  useEffect(() => {
    if (!visible) return;
    const close = () => setVisible(false);
    const handleOutsideTouch = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        tipRef.current && !tipRef.current.contains(e.target)
      ) {
        close();
      }
    };
    document.addEventListener("touchstart", handleOutsideTouch, { passive: true });
    window.addEventListener("scroll", close, { passive: true, capture: true });
    return () => {
      document.removeEventListener("touchstart", handleOutsideTouch);
      window.removeEventListener("scroll", close, true);
    };
  }, [visible]);

  if (!text) return children;

  const handleTouchEnd = (e) => {
    e.preventDefault();
    setVisible((v) => !v);
  };

  return (
    <>
      <span
        ref={triggerRef}
        className="premium-tooltip-wrap"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </span>
      {visible && createPortal(
        <span
          ref={tipRef}
          role="tooltip"
          className={`premium-tooltip-box tip-${side}${visible ? " is-visible" : ""}`}
          style={{ top: coords.top, left: coords.left }}
        >
          {text}
        </span>,
        document.body
      )}
    </>
  );
}
