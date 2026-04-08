// src/shared/hooks/useShakeOnError.js
// Attaches a shake animation to a button ref whenever an error transitions
// from falsy → truthy (e.g. saveError becomes a non-empty string).
//
// Usage:
//   const saveBtnRef = useShakeOnError(saveError);
//   <button ref={saveBtnRef} ...>Save</button>

import { useRef, useEffect } from "react";

export default function useShakeOnError(errorCondition) {
  const btnRef = useRef(null);
  const prevRef = useRef(false);

  useEffect(() => {
    const hasError = Boolean(errorCondition);
    if (hasError && !prevRef.current && btnRef.current) {
      btnRef.current.classList.remove("vera-btn-shake");
      // Force reflow so re-triggering restarts the animation
      void btnRef.current.offsetWidth;
      btnRef.current.classList.add("vera-btn-shake");
    }
    prevRef.current = hasError;
  }, [errorCondition]);

  return btnRef;
}
