import { describe, vi, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { qaTest } from "@/test/qaTest";

import { useAdminNav, getPageLabel } from "../useAdminNav";

function makeWrapper(path) {
  return ({ children }) =>
    React.createElement(MemoryRouter, { initialEntries: [path] }, children);
}

describe("useAdminNav", () => {
  qaTest("admin.shared.adminNav.01", () => {
    const { result: r1 } = renderHook(() => useAdminNav(), {
      wrapper: makeWrapper("/admin/rankings"),
    });
    expect(r1.current.currentPage).toBe("rankings");

    const { result: r2 } = renderHook(() => useAdminNav(), {
      wrapper: makeWrapper("/demo/admin/heatmap"),
    });
    expect(r2.current.currentPage).toBe("heatmap");

    const { result: r3 } = renderHook(() => useAdminNav(), {
      wrapper: makeWrapper("/admin"),
    });
    expect(r3.current.currentPage).toBe("overview");
  });

  qaTest("admin.shared.adminNav.02", () => {
    const { result: rdemo } = renderHook(() => useAdminNav(), {
      wrapper: makeWrapper("/demo/admin/overview"),
    });
    expect(rdemo.current.basePath).toBe("/demo/admin");
    expect(rdemo.current.isDemo).toBe(true);

    const { result: rprod } = renderHook(() => useAdminNav(), {
      wrapper: makeWrapper("/admin/overview"),
    });
    expect(rprod.current.basePath).toBe("/admin");
    expect(rprod.current.isDemo).toBe(false);
  });

  qaTest("admin.shared.adminNav.03", () => {
    const { result } = renderHook(() => useAdminNav(), {
      wrapper: makeWrapper("/admin/overview"),
    });
    expect(typeof result.current.navigateTo).toBe("function");
    // navigateTo is callable without throwing on a non-dirty page
    expect(() => result.current.navigateTo("projects")).not.toThrow();
  });

  qaTest("admin.shared.adminNav.04", () => {
    expect(getPageLabel("/admin/audit-log")).toBe("Audit Log");
    expect(getPageLabel("/admin/settings")).toBe("Settings");
    expect(getPageLabel("/admin/unknown-page")).toBe("Overview");
    expect(getPageLabel("/demo/admin/jurors")).toBe("Jurors");
  });
});
