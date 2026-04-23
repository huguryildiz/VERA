import { describe, expect, it } from "vitest";
import { qaTest } from "../../../test/qaTest.js";
import {
  AUDIT_PAGE_SIZE,
  CATEGORY_META,
  SEVERITY_META,
  ACTION_LABELS,
  parseSearchDateParts,
  parseAuditDateString,
  getAuditDateRangeError,
  buildAuditParams,
  getInitials,
  getActorInfo,
  formatActionLabel,
  formatActionDetail,
  normalizeTeamMemberNames,
  groupByDay,
  formatSentence,
  formatDiffChips,
  groupBulkEvents,
  formatEventMeta,
  addDaySeparators,
  detectAnomalies,
} from "../auditUtils.js";

describe("auditUtils — constants", () => {
  qaTest("audit.utils.01", () => {
    expect(AUDIT_PAGE_SIZE).toBe(50);
    expect(CATEGORY_META).toHaveProperty("auth");
    expect(CATEGORY_META.auth).toHaveProperty("label", "Auth");
    expect(SEVERITY_META).toHaveProperty("critical");
    expect(SEVERITY_META.critical).toHaveProperty("label", "Critical");
    expect(typeof ACTION_LABELS).toBe("object");
    // Action labels is built from EVENT_META — should have known actions
    expect(ACTION_LABELS["admin.login"]).toBe("Admin login");
    expect(ACTION_LABELS["evaluation.complete"]).toBe("Evaluation completed");
  });
});

describe("auditUtils — parseSearchDateParts", () => {
  qaTest("audit.utils.02", () => {
    // Month-only: "jan 2025"
    const r1 = parseSearchDateParts("jan 2025");
    expect(r1).not.toBeNull();
    expect(r1.month).toBe(1);
    expect(r1.year).toBe(2025);
    expect(r1.day).toBeNull();

    // Day + month + year: "15 mar 2025"
    const r2 = parseSearchDateParts("15 mar 2025");
    expect(r2.day).toBe(15);
    expect(r2.month).toBe(3);
    expect(r2.year).toBe(2025);
  });

  qaTest("audit.utils.03", () => {
    // DD.MM.YYYY format
    const r3 = parseSearchDateParts("15.06.2025");
    expect(r3.day).toBe(15);
    expect(r3.month).toBe(6);
    expect(r3.year).toBe(2025);

    // ISO format: yyyy-mm-dd
    const r4 = parseSearchDateParts("2025-06-15");
    expect(r4.year).toBe(2025);
    expect(r4.month).toBe(6);
    expect(r4.day).toBe(15);

    // Non-date string
    expect(parseSearchDateParts("hello")).toBeNull();
    expect(parseSearchDateParts("")).toBeNull();
  });
});

describe("auditUtils — parseAuditDateString", () => {
  qaTest("audit.utils.04", () => {
    // Valid ISO datetime
    const r1 = parseAuditDateString("2025-06-15T14:30");
    expect(r1).not.toBeNull();
    expect(r1.isDateOnly).toBe(false);
    expect(r1.ms).toBeGreaterThan(0);

    // Valid date-only
    const r2 = parseAuditDateString("2025-06-15");
    expect(r2).not.toBeNull();
    expect(r2.isDateOnly).toBe(true);
    expect(r2.ms).toBeGreaterThan(0);
  });

  qaTest("audit.utils.05", () => {
    // Invalid format
    expect(parseAuditDateString("15/06/2025")).toBeNull();
    expect(parseAuditDateString("")).toBeNull();
    expect(parseAuditDateString(null)).toBeNull();

    // Out-of-range year
    expect(parseAuditDateString("1999-06-15")).toBeNull();
    expect(parseAuditDateString("2105-01-01")).toBeNull();

    // Invalid date parts (Feb 30)
    expect(parseAuditDateString("2025-02-30")).toBeNull();
  });
});

describe("auditUtils — getAuditDateRangeError", () => {
  qaTest("audit.utils.06", () => {
    // No dates — valid
    expect(getAuditDateRangeError({})).toBe("");

    // Valid range
    expect(
      getAuditDateRangeError({ startDate: "2025-01-01", endDate: "2025-12-31" })
    ).toBe("");

    // Invalid format
    const invalidFmt = getAuditDateRangeError({ startDate: "bad-date" });
    expect(invalidFmt).toMatch(/Invalid date format/i);

    // Reversed range
    const reversed = getAuditDateRangeError({
      startDate: "2025-12-31",
      endDate: "2025-01-01",
    });
    expect(reversed).toMatch(/cannot be later/i);
  });
});

describe("auditUtils — buildAuditParams", () => {
  qaTest("audit.utils.07", () => {
    const filters = {
      startDate: "2025-01-01",
      endDate: "2025-06-30",
      actorTypes: ["admin"],
      actions: [],
      categories: [],
      severities: ["high"],
    };
    const params = buildAuditParams(filters, 25, null, "");
    expect(params.startAt).not.toBeNull();
    expect(params.endAt).not.toBeNull();
    expect(params.actorTypes).toEqual(["admin"]);
    expect(params.actions).toBeNull(); // empty array → null
    expect(params.severities).toEqual(["high"]);
    expect(params.limit).toBe(25);
  });

  qaTest("audit.utils.08", () => {
    // Date-only endDate gets extended to end of day
    const filters = { startDate: "", endDate: "2025-06-30" };
    const params = buildAuditParams(filters, 50, null, "");
    // endAt should be a valid ISO string for June 30 23:59:59.999
    expect(params.endAt).toContain("2025-06-30");

    // cursor passed through
    const cursor = { beforeAt: "2025-03-01T00:00:00Z", beforeId: "some-uuid" };
    const p2 = buildAuditParams({}, 10, cursor, "");
    expect(p2.beforeAt).toBe(cursor.beforeAt);
    expect(p2.beforeId).toBe(cursor.beforeId);
  });

  qaTest("audit.utils.09", () => {
    // searchText is a date pattern — populates searchDay/Month/Year
    const params = buildAuditParams({}, 50, null, "15 jan 2025");
    expect(params.searchDay).toBe(15);
    expect(params.searchMonth).toBe(1);
    expect(params.searchYear).toBe(2025);
    expect(params.search).toBe("15 jan 2025");

    // non-date searchText — search populated, day/month/year null
    const p2 = buildAuditParams({}, 50, null, "Alice");
    expect(p2.search).toBe("Alice");
    expect(p2.searchDay).toBeNull();
  });
});

describe("auditUtils — getInitials", () => {
  qaTest("audit.utils.10", () => {
    expect(getInitials("Alice Smith")).toBe("AS");
    expect(getInitials("John")).toBe("J");
    expect(getInitials("")).toBe("?");
    expect(getInitials(null)).toBe("?");
    expect(getInitials("Prof. Dr. Ahmet Kaya")).toBe("PD"); // takes first 2 words
    expect(getInitials("Alice Smith Jones")).toBe("AS"); // capped at 2
  });
});

describe("auditUtils — getActorInfo", () => {
  qaTest("audit.utils.11", () => {
    // actor_type = juror
    const jurorLog = { actor_type: "juror", actor_name: "Dr. Smith" };
    const juror = getActorInfo(jurorLog);
    expect(juror.type).toBe("juror");
    expect(juror.name).toBe("Dr. Smith");
    expect(juror.role).toBe("Juror");
    expect(juror.initials).toBeTruthy();

    // actor_type = system
    const sysLog = { actor_type: "system" };
    const sys = getActorInfo(sysLog);
    expect(sys.type).toBe("system");
    expect(sys.initials).toBeNull();

    // actor_type = admin
    const adminLog = { actor_type: "admin", actor_name: "Jane Admin" };
    const admin = getActorInfo(adminLog);
    expect(admin.type).toBe("admin");
    expect(admin.name).toBe("Jane Admin");
    expect(admin.role).toBe("Organization Admin");
  });

  qaTest("audit.utils.12", () => {
    // Legacy row: user_id present → admin
    const legacyAdmin = {
      user_id: "some-uuid",
      profiles: { display_name: "Bob Admin" },
    };
    const r = getActorInfo(legacyAdmin);
    expect(r.type).toBe("admin");
    expect(r.name).toBe("Bob Admin");

    // Legacy row: juror action with details.actor_name
    const legacyJuror = {
      action: "evaluation.complete",
      details: { actor_name: "Juror Alice" },
    };
    const j = getActorInfo(legacyJuror);
    expect(j.type).toBe("juror");
    expect(j.name).toBe("Juror Alice");

    // No actor info → system
    const noActor = { action: "some.other.action" };
    const s = getActorInfo(noActor);
    expect(s.type).toBe("system");
  });
});

describe("auditUtils — formatActionLabel", () => {
  qaTest("audit.utils.13", () => {
    expect(formatActionLabel("admin.login")).toBe("Admin login");
    expect(formatActionLabel("evaluation.complete")).toBe("Evaluation completed");
    expect(formatActionLabel(null)).toBe("—");
    expect(formatActionLabel("")).toBe("—");

    // Unknown action → fallback
    const fallback = formatActionLabel("projects.insert");
    expect(typeof fallback).toBe("string");
    expect(fallback.length).toBeGreaterThan(0);
  });
});

describe("auditUtils — normalizeTeamMemberNames", () => {
  qaTest("audit.utils.14", () => {
    expect(normalizeTeamMemberNames("Alice, Bob, Charlie")).toBe("Alice; Bob; Charlie");
    expect(normalizeTeamMemberNames("Alice\nBob\nCharlie")).toBe("Alice; Bob; Charlie");
    expect(normalizeTeamMemberNames("Alice/Bob")).toBe("Alice; Bob");
    // Deduplication
    expect(normalizeTeamMemberNames("Alice, Alice, Bob")).toBe("Alice; Bob");
    // Empty
    expect(normalizeTeamMemberNames("")).toBe("");
    expect(normalizeTeamMemberNames(null)).toBe("");
  });
});

describe("auditUtils — groupByDay", () => {
  qaTest("audit.utils.15", () => {
    const logs = [
      { id: "1", created_at: "2025-06-15T14:00:00Z", action: "admin.login" },
      { id: "2", created_at: "2025-06-15T10:00:00Z", action: "admin.logout" },
      { id: "3", created_at: "2025-06-14T09:00:00Z", action: "pin.reset" },
    ];
    const groups = groupByDay(logs);
    expect(groups).toHaveLength(2);
    expect(groups[0].logs).toHaveLength(2);
    expect(groups[1].logs).toHaveLength(1);
    expect(groups[0].key).not.toBe(groups[1].key);
  });
});

describe("auditUtils — formatSentence", () => {
  it("returns verb+resource for known actions", () => {
    const log = { action: "pin.reset", details: { juror_name: "Alice" } };
    const r = formatSentence(log);
    expect(r.verb).toContain("reset");
    expect(r.resource).toBe("Alice");
  });

  it("handles export.* prefix", () => {
    const log = { action: "export.scores", details: { periodName: "Fall 2025" } };
    const r = formatSentence(log);
    expect(r.verb).toContain("export");
    expect(r.resource).toBe("Fall 2025");
  });
});

describe("auditUtils — formatDiffChips", () => {
  qaTest("audit.utils.16", () => {
    // criteria.save with changes object → up to 4 entries
    const criteriaLog = {
      action: "criteria.save",
      details: {
        changes: {
          design:     { from: 25, to: 30 },
          delivery:   { from: 40, to: 35 },
          innovation: { from: 35, to: 35 },
        },
      },
    };
    const chips = formatDiffChips(criteriaLog);
    expect(chips).toHaveLength(3);
    expect(chips[0].key).toBe("design");
    expect(chips[0].from).toBe("25");
    expect(chips[0].to).toBe("30");

    // periods.update with changedFields array
    const periodLog = {
      action: "period.update",
      details: {
        changedFields: ["name", "endDate"],
        oldValues: { name: "Fall 2024", endDate: "2024-12-15" },
        newValues: { name: "Fall 2025", endDate: "2025-01-10" },
      },
    };
    const pChips = formatDiffChips(periodLog);
    expect(pChips).toHaveLength(2);
    expect(pChips[0].key).toBe("name");
    expect(pChips[0].from).toBe("Fall 2024");
    expect(pChips[0].to).toBe("Fall 2025");

    // Trigger-based diff (before/after object)
    const triggerLog = {
      action: "data.update",
      diff: {
        before: { title: "Old Title", updated_at: "2025-01-01" },
        after:  { title: "New Title", updated_at: "2025-06-01" },
      },
    };
    const tChips = formatDiffChips(triggerLog);
    // updated_at is skipped; only "title" changed
    expect(tChips).toHaveLength(1);
    expect(tChips[0].key).toBe("title");
    expect(tChips[0].from).toBe("Old Title");
    expect(tChips[0].to).toBe("New Title");

    // No diffs → empty array
    expect(formatDiffChips({ action: "admin.login", details: {} })).toEqual([]);
  });
});

describe("auditUtils — groupBulkEvents", () => {
  qaTest("audit.utils.17", () => {
    const now = new Date("2025-06-15T12:00:00Z").getTime();

    // Single events (no user_id) → pass through as single
    const singles = [
      { action: "a", resource_type: "project" },
      { action: "b", resource_type: "project" },
    ];
    const r1 = groupBulkEvents(singles);
    expect(r1).toHaveLength(2);
    expect(r1[0].type).toBe("single");

    // Two events from same actor — below BULK_MIN_SIZE (3) → singles
    const pair = [
      { user_id: "u1", resource_type: "project", created_at: new Date(now).toISOString() },
      { user_id: "u1", resource_type: "project", created_at: new Date(now + 60_000).toISOString() },
    ];
    const r2 = groupBulkEvents(pair);
    expect(r2).toHaveLength(2);
    expect(r2.every((e) => e.type === "single")).toBe(true);

    // Three events from same actor within 5 min → bulk
    const burst = [
      { user_id: "u2", resource_type: "score", created_at: new Date(now).toISOString() },
      { user_id: "u2", resource_type: "score", created_at: new Date(now + 60_000).toISOString() },
      { user_id: "u2", resource_type: "score", created_at: new Date(now + 120_000).toISOString() },
    ];
    const r3 = groupBulkEvents(burst);
    expect(r3).toHaveLength(1);
    expect(r3[0].type).toBe("bulk");
    expect(r3[0].count).toBe(3);
    expect(r3[0].logs).toHaveLength(3);
    expect(r3[0].representative).toBe(burst[0]);

    // Same actor but different resource_type → does not collapse
    const mixed = [
      { user_id: "u3", resource_type: "project", created_at: new Date(now).toISOString() },
      { user_id: "u3", resource_type: "juror",   created_at: new Date(now + 30_000).toISOString() },
      { user_id: "u3", resource_type: "project", created_at: new Date(now + 60_000).toISOString() },
    ];
    const r4 = groupBulkEvents(mixed);
    // All three are singles because resource_type breaks the run each time
    expect(r4).toHaveLength(3);
    expect(r4.every((e) => e.type === "single")).toBe(true);

    // Empty input
    expect(groupBulkEvents([])).toEqual([]);
  });
});

describe("auditUtils — formatEventMeta", () => {
  qaTest("audit.utils.18", () => {
    // Bulk group: "action × N · within M min"
    const bulkMeta = formatEventMeta({ action: "score.upsert" }, { bulkCount: 5, bulkSpanMs: 180_000 });
    expect(bulkMeta).toMatch(/score\.upsert × 5/);
    expect(bulkMeta).toMatch(/within 3 min/);

    // Bulk without span
    const bulkNoSpan = formatEventMeta({ action: "score.upsert" }, { bulkCount: 4 });
    expect(bulkNoSpan).toBe("score.upsert × 4");

    // Export event: "action · FORMAT · N rows"
    const exportLog = { action: "export.scores", details: { format: "xlsx", row_count: 120 } };
    const exportMeta = formatEventMeta(exportLog);
    expect(exportMeta).toContain("XLSX");
    expect(exportMeta).toContain("120 rows");

    // IP fallback
    const ipLog = { action: "admin.login", details: { ip: "192.168.1.1" } };
    expect(formatEventMeta(ipLog)).toBe("admin.login · 192.168.1.1");

    // Diff-bearing event → appends first diff chip
    const diffLog = {
      action: "criteria.save",
      details: { changes: { design: { from: 25, to: 30 } } },
    };
    const diffMeta = formatEventMeta(diffLog);
    expect(diffMeta).toContain("criteria.save");
    expect(diffMeta).toContain("25→30");

    // No extras → returns bare action
    const plainLog = { action: "admin.logout", details: {} };
    expect(formatEventMeta(plainLog)).toBe("admin.logout");
  });
});

describe("auditUtils — addDaySeparators", () => {
  qaTest("audit.utils.19", () => {
    // Empty input
    expect(addDaySeparators([], [])).toEqual([]);

    // Two events on the same day → one day separator at the top
    const ts1 = "2025-06-15T10:00:00Z";
    const ts2 = "2025-06-15T14:00:00Z";
    const items = [
      { type: "single", log: { created_at: ts1 } },
      { type: "single", log: { created_at: ts2 } },
    ];
    const allLogs = [{ created_at: ts1 }, { created_at: ts2 }];
    const r1 = addDaySeparators(items, allLogs);
    // Should have: 1 day sentinel + 2 single items = 3
    expect(r1).toHaveLength(3);
    expect(r1[0].type).toBe("day");
    expect(r1[0].count).toBe(2);
    expect(r1[1].type).toBe("single");

    // Two events on different days → two day sentinels
    const ts3 = "2025-06-14T09:00:00Z";
    const items2 = [
      { type: "single", log: { created_at: ts1 } },
      { type: "single", log: { created_at: ts3 } },
    ];
    const allLogs2 = [{ created_at: ts1 }, { created_at: ts3 }];
    const r2 = addDaySeparators(items2, allLogs2);
    // 2 day sentinels + 2 items = 4
    expect(r2).toHaveLength(4);
    expect(r2[0].type).toBe("day");
    expect(r2[2].type).toBe("day");

    // Bulk item: uses representative.created_at for day key
    const bulkItem = {
      type: "bulk",
      count: 3,
      representative: { created_at: ts1 },
      logs: [],
    };
    const r3 = addDaySeparators([bulkItem], [{ created_at: ts1 }]);
    expect(r3).toHaveLength(2);
    expect(r3[0].type).toBe("day");
    expect(r3[1].type).toBe("bulk");
  });
});

describe("auditUtils — detectAnomalies", () => {
  qaTest("audit.utils.20", () => {
    const recent = (action, extra = {}) => ({
      action,
      created_at: new Date(Date.now() - 60_000).toISOString(), // 1 min ago
      ...extra,
    });
    const old = (action) => ({
      action,
      created_at: new Date(Date.now() - 30 * 24 * 3600_000).toISOString(), // 30 days ago
    });

    // No anomalies → null
    expect(detectAnomalies([])).toBeNull();
    expect(detectAnomalies([old("admin.login.failure"), old("admin.login.failure"), old("admin.login.failure")])).toBeNull();

    // Rule 1: ≥3 recent login failures → auth.login_failure.burst
    const failures = [
      recent("admin.login.failure", { ip_address: "10.0.0.1" }),
      recent("admin.login.failure"),
      recent("admin.login.failure"),
    ];
    const r1 = detectAnomalies(failures);
    expect(r1).not.toBeNull();
    expect(r1.key).toBe("auth.login_failure.burst");
    expect(r1.title).toMatch(/Failed login/i);
    expect(r1.details.count).toBe(3);
    expect(r1.details.ip).toBe("10.0.0.1");

    // Rule 2: org suspension in 24h → org.status.suspended
    const suspension = [
      recent("organization.status_changed", {
        details: { newStatus: "suspended", organizationCode: "TEDU" },
      }),
    ];
    const r2 = detectAnomalies(suspension);
    expect(r2.key).toBe("org.status.suspended");
    expect(r2.desc).toContain("TEDU");

    // Rule 6: PIN lockout in 24h (lowest priority but no higher rule triggered)
    const lock = [
      recent("juror.pin_locked", { actor_name: "Juror Bob" }),
    ];
    const r6 = detectAnomalies(lock);
    expect(r6.key).toBe("juror.pin_locked");
    expect(r6.desc).toContain("Juror Bob");

    // Rule 1 takes priority over rule 6 when both present
    const both = [...failures, ...lock];
    const rPriority = detectAnomalies(both);
    expect(rPriority.key).toBe("auth.login_failure.burst");
  });
});
