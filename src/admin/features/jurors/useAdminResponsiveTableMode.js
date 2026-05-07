import { useEffect, useState } from "react";

export const ADMIN_PHONE_PORTRAIT_MAX_WIDTH = 768;
export const ADMIN_LANDSCAPE_TABLE_MIN_WIDTH = 560;
export const ADMIN_LANDSCAPE_COMPACT_MAX_WIDTH = 900;

function getViewportSize() {
  if (typeof window === "undefined") {
    return { width: 1280, height: 800 };
  }

  const width = Math.round(window.visualViewport?.width ?? window.innerWidth ?? 0);
  const height = Math.round(window.visualViewport?.height ?? window.innerHeight ?? 0);

  return {
    width: Math.max(0, width),
    height: Math.max(0, height),
  };
}

export function getAdminResponsiveTableMode() {
  const { width, height } = getViewportSize();
  const isLandscape = width > height;
  const orientation = isLandscape ? "landscape" : "portrait";

  const isPhonePortrait = !isLandscape && width <= ADMIN_PHONE_PORTRAIT_MAX_WIDTH;
  const hasLandscapeUsableWidth = isLandscape && width >= ADMIN_LANDSCAPE_TABLE_MIN_WIDTH;
  const isLandscapeMobileOrTabletUp = !isPhonePortrait;
  const isLandscapeCompact = isLandscape && width <= ADMIN_LANDSCAPE_COMPACT_MAX_WIDTH;

  return {
    viewportWidth: width,
    viewportHeight: height,
    orientation,
    isLandscape,
    isPortrait: !isLandscape,
    isPhonePortrait,
    hasLandscapeUsableWidth,
    isLandscapeMobileOrTabletUp,
    isLandscapeCompact,
    shouldUseCardLayout: isPhonePortrait,
    shouldUseTableLayout: !isPhonePortrait,
  };
}

export function useAdminResponsiveTableMode() {
  const [mode, setMode] = useState(() => getAdminResponsiveTableMode());

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const update = () => {
      setMode(getAdminResponsiveTableMode());
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  return mode;
}
