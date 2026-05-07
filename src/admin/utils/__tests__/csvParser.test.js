import { describe, expect, vi, beforeEach } from "vitest";
import { qaTest } from "../../../test/qaTest.js";

// Hoist mock variable so it's accessible inside vi.mock factory
const { mockPapaParse } = vi.hoisted(() => ({
  mockPapaParse: vi.fn(),
}));

// Mock papaparse — call complete() synchronously with supplied data
vi.mock("papaparse", () => ({
  default: { parse: mockPapaParse },
}));

import { parseProjectsCsv, parseJurorsCsv } from "../csvParser.js";

// Helper: create a minimal File-like object
function fakeFile(name = "test.csv", size = 1024) {
  return { name, size };
}

// Helper: configure Papa mock to call complete with given rows
function mockData(rows) {
  mockPapaParse.mockImplementation((file, opts) => {
    opts.complete({ data: rows });
  });
}

beforeEach(() => vi.clearAllMocks());

describe("csvParser — parseProjectsCsv header detection", () => {
  qaTest("csv.proj.01", async () => {
    // With recognised header row
    mockData([
      ["title", "members"],
      ["Alpha Project", "Alice, Bob"],
      ["Beta Project",  "Charlie"],
    ]);
    const { rows, stats, detectedColumns, warningMessage } = await parseProjectsCsv(fakeFile());

    expect(rows).toHaveLength(2);
    expect(rows[0].title).toBe("Alpha Project");
    expect(rows[0].members).toBe("Alice, Bob");
    expect(rows[1].title).toBe("Beta Project");
    expect(stats.valid).toBe(2);
    expect(stats.error).toBe(0);
    expect(warningMessage).toBeNull();

    // detectedColumns includes title + members as header-sourced
    const titleCol = detectedColumns.find((c) => c.field === "title");
    expect(titleCol.source).toBe("header");
  });
});

describe("csvParser — parseProjectsCsv duplicate detection", () => {
  qaTest("csv.proj.02", async () => {
    // In-file duplicate
    mockData([
      ["Project One", "Alice"],
      ["Project One", "Bob"], // same title — duplicate
      ["Project Two", "Carol"],
    ]);
    const { rows, stats } = await parseProjectsCsv(fakeFile());
    expect(stats.valid).toBe(2);
    expect(stats.duplicate).toBe(1);
    expect(rows[1].status).toBe("skip");
    expect(rows[1].statusLabel).toBe("Duplicate in file");

    // Existing project duplicate
    mockData([
      ["Existing Project", "Alice"],
      ["New Project",      "Bob"],
    ]);
    const existing = [{ title: "Existing Project" }];
    const r2 = await parseProjectsCsv(fakeFile(), existing);
    expect(r2.stats.duplicate).toBe(1);
    expect(r2.rows[0].status).toBe("skip");
    expect(r2.rows[0].statusLabel).toBe("Duplicate");
    expect(r2.rows[1].status).toBe("ok");
  });
});

describe("csvParser — parseProjectsCsv error rows + warningMessage", () => {
  qaTest("csv.proj.03", async () => {
    // Missing title (empty string)
    mockData([
      ["", "Alice"],
      ["Valid Project", "Bob"],
    ]);
    const { rows, stats, warningMessage } = await parseProjectsCsv(fakeFile());
    expect(stats.error).toBe(1);
    expect(rows[0].status).toBe("err");
    expect(rows[0].statusLabel).toBe("Missing title");

    // warningMessage should summarise
    expect(warningMessage).not.toBeNull();
    expect(warningMessage.title).toMatch(/error/i);
    expect(typeof warningMessage.desc).toBe("string");

    // Positional parse (no header) — data only rows
    mockData([
      ["My Project", "Dave"],
    ]);
    const r2 = await parseProjectsCsv(fakeFile());
    expect(r2.stats.valid).toBe(1);
    expect(r2.rows[0].title).toBe("My Project");
  });
});

describe("csvParser — parseJurorsCsv basic parsing", () => {
  qaTest("csv.juror.01", async () => {
    // With header: juror_name, affiliation, email
    mockData([
      ["juror_name", "affiliation", "email"],
      ["Dr. Smith",  "MIT",         "smith@mit.edu"],
      ["Prof. Lee",  "Stanford",    "lee@stanford.edu"],
    ]);
    const { rows, stats, detectedColumns } = await parseJurorsCsv(fakeFile());

    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Dr. Smith");
    expect(rows[0].affiliation).toBe("MIT");
    expect(rows[0].email).toBe("smith@mit.edu");
    expect(rows[0].juror_name).toBe("Dr. Smith");
    expect(stats.valid).toBe(2);
    expect(stats.error).toBe(0);

    const nameCol = detectedColumns.find((c) => c.field === "juror_name");
    expect(nameCol.source).toBe("header");

    // Positional (no header)
    mockData([["Alice Tester", "Harvard", "alice@h.edu"]]);
    const r2 = await parseJurorsCsv(fakeFile());
    expect(r2.rows[0].name).toBe("Alice Tester");
    expect(r2.rows[0].affiliation).toBe("Harvard");
  });
});

describe("csvParser — parseJurorsCsv duplicate + error detection", () => {
  qaTest("csv.juror.02", async () => {
    // No name → error
    mockData([
      ["",        "MIT",      ""],
      ["Dr. Fox",  "Oxford",  "fox@ox.ac.uk"],
    ]);
    const { rows, stats } = await parseJurorsCsv(fakeFile());
    expect(stats.error).toBe(1);
    expect(rows[0].status).toBe("err");
    expect(rows[0].statusLabel).toBe("No name");
    expect(rows[0].juror_name).toBeNull();
    expect(rows[0].email).toBeNull();

    // Existing juror duplicate
    mockData([
      ["Dr. Fox",   "Oxford", "fox@ox.ac.uk"],
      ["New Juror", "MIT",    "new@mit.edu"],
    ]);
    const existing = [{ juror_name: "Dr. Fox" }];
    const r2 = await parseJurorsCsv(fakeFile(), existing);
    expect(r2.stats.duplicate).toBe(1);
    expect(r2.rows[0].status).toBe("skip");
    expect(r2.rows[0].statusLabel).toBe("Duplicate");
    expect(r2.stats.valid).toBe(1);

    // In-file duplicate
    mockData([
      ["Alice Doe", "MIT", "a@mit.edu"],
      ["Alice Doe", "CU",  "a2@cu.edu"],
    ]);
    const r3 = await parseJurorsCsv(fakeFile());
    expect(r3.stats.duplicate).toBe(1);
    expect(r3.rows[1].statusLabel).toBe("Duplicate in file");
  });
});
