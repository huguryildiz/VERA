import { describe, expect } from "vitest";
import { qaTest } from "../../../test/qaTest.js";

import { vi } from "vitest";
vi.mock("@/shared/ui/Icons", () => ({
  CheckCircle2Icon: "CheckCircle2Icon",
  CheckIcon: "CheckIcon",
  SendIcon: "SendIcon",
  Clock3Icon: "Clock3Icon",
  CircleIcon: "CircleIcon",
  CircleDotDashedIcon: "CircleDotDashedIcon",
  PencilIcon: "PencilIcon",
}));

import { AUDIT_TABLE_COLUMNS } from "../auditColumns.js";

describe("auditColumns — AUDIT_TABLE_COLUMNS", () => {
  qaTest("audit.cols.01", () => {
    // ── Structure ──────────────────────────────────────────────
    expect(AUDIT_TABLE_COLUMNS).toHaveLength(5);

    const keys = AUDIT_TABLE_COLUMNS.map((c) => c.key);
    expect(keys).toEqual(["ts", "type", "actor", "action", "severity"]);

    const labels = AUDIT_TABLE_COLUMNS.map((c) => c.label);
    expect(labels).toEqual(["Timestamp", "Type", "Actor", "Action", "Severity"]);

    const sortKeys = AUDIT_TABLE_COLUMNS.map((c) => c.sortKey);
    expect(sortKeys).toEqual(["created_at", "resource_type", "actor", "action", "severity"]);

    AUDIT_TABLE_COLUMNS.forEach((col) => {
      expect(typeof col.getValue).toBe("function");
    });

    // ── ts column ──────────────────────────────────────────────
    const tsCol = AUDIT_TABLE_COLUMNS.find((c) => c.key === "ts");
    expect(tsCol.style.width).toBe(170);
    const tsResult = tsCol.getValue({ created_at: "2025-06-01T12:00:00Z" });
    expect(typeof tsResult).toBe("string");
    expect(tsResult.length).toBeGreaterThan(0);

    // ── type column — chip label mapping ──────────────────────
    const typeCol = AUDIT_TABLE_COLUMNS.find((c) => c.key === "type");
    expect(typeCol.style.width).toBe(95);
    expect(typeCol.getValue({ resource_type: "score_sheets" })).toBe("Evaluation");
    expect(typeCol.getValue({ resource_type: "jurors" })).toBe("Juror");
    expect(typeCol.getValue({ resource_type: "periods" })).toBe("Period");
    expect(typeCol.getValue({ resource_type: "entry_tokens" })).toBe("QR Access");
    expect(typeCol.getValue({ resource_type: "frameworks" })).toBe("Framework");
    // Unknown type → raw string passthrough
    expect(typeCol.getValue({ resource_type: "some_unknown_table" })).toBe("some_unknown_table");
    // Undefined type → '—' fallback
    expect(typeCol.getValue({ resource_type: undefined })).toBe("—");

    // ── actor column ───────────────────────────────────────────
    const actorCol = AUDIT_TABLE_COLUMNS.find((c) => c.key === "actor");
    expect(actorCol.style.width).toBe(200);
    const actorResult = actorCol.getValue({
      actor_name: "Alice Smith",
      actor_type: "admin",
      actor_email: "alice@example.com",
    });
    expect(typeof actorResult).toBe("string");

    // ── action column ──────────────────────────────────────────
    const actionCol = AUDIT_TABLE_COLUMNS.find((c) => c.key === "action");
    expect(actionCol.style).toBeUndefined();
    // No action property → formatSentence returns null → '—' fallback
    expect(actionCol.getValue({})).toBe("—");
    // Any action → always returns a non-empty string (either sentence or raw action)
    const anyResult = actionCol.getValue({ action: "totally.unknown.action.xyz" });
    expect(typeof anyResult).toBe("string");
    expect(anyResult.length).toBeGreaterThan(0);
    // Known action → formatSentence gives a verb (non-empty string)
    const knownResult = actionCol.getValue({ action: "admin.login", actor_name: "Alice" });
    expect(typeof knownResult).toBe("string");
    expect(knownResult.length).toBeGreaterThan(0);

    // ── severity column ────────────────────────────────────────
    const sevCol = AUDIT_TABLE_COLUMNS.find((c) => c.key === "severity");
    expect(sevCol.style.width).toBe(90);
    // Undefined severity → '—' fallback
    expect(sevCol.getValue({ severity: undefined })).toBe("—");
    expect(sevCol.getValue({})).toBe("—");
    // Known severity → returns its label string
    const infoLabel = sevCol.getValue({ severity: "info" });
    expect(typeof infoLabel).toBe("string");
    expect(infoLabel.length).toBeGreaterThan(0);
    expect(infoLabel).not.toBe("—");
  });
});
