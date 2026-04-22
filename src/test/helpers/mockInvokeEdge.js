import { vi } from "vitest";

/**
 * Mock for src/shared/api/core/invokeEdgeFunction.js
 *
 * Usage:
 *   vi.mock("@/shared/api/core/invokeEdgeFunction", () => ({
 *     invokeEdgeFunction: mockInvokeEdge({ result: { ... } }),
 *   }));
 */
export function mockInvokeEdge({ result = {}, error = null } = {}) {
  if (error) {
    return vi.fn().mockRejectedValue(error);
  }
  return vi.fn().mockResolvedValue(result);
}
