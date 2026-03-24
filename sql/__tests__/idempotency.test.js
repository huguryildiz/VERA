import { describe, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { qaTest } from "../../src/test/qaTest.js";

const SQL = readFileSync(
  resolve(__dirname, "../000_bootstrap.sql"),
  "utf-8"
);

/**
 * Returns an array of { lineNumber, text } for every line that matches `regex`.
 * `regex` must have the `g` flag.
 */
function findViolations(sql, regex) {
  const lines = sql.split("\n");
  const violations = [];
  lines.forEach((line, idx) => {
    if (regex.test(line)) {
      violations.push({ lineNumber: idx + 1, text: line.trim() });
    }
    // reset lastIndex for stateful global regexes
    regex.lastIndex = 0;
  });
  return violations;
}

describe("SQL bootstrap idempotency", () => {
  qaTest("phaseA.sql.01", () => {
    // 1. All CREATE TABLE statements must use IF NOT EXISTS
    const bareCreateTable = /CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/gi;
    const tableViolations = findViolations(SQL, bareCreateTable);
    expect(
      tableViolations,
      `Found CREATE TABLE without IF NOT EXISTS:\n${tableViolations
        .map((v) => `  L${v.lineNumber}: ${v.text}`)
        .join("\n")}`
    ).toHaveLength(0);

    // 2. All function definitions must use CREATE OR REPLACE FUNCTION
    // Match "CREATE FUNCTION" that is NOT preceded by "OR REPLACE "
    const bareCreateFunction = /CREATE\s+FUNCTION\s+/gi;
    const functionViolations = findViolations(SQL, bareCreateFunction);
    expect(
      functionViolations,
      `Found CREATE FUNCTION without OR REPLACE:\n${functionViolations
        .map((v) => `  L${v.lineNumber}: ${v.text}`)
        .join("\n")}`
    ).toHaveLength(0);

    // 3. All DROP statements must use IF EXISTS
    const bareDropStatement =
      /DROP\s+(TABLE|FUNCTION|TRIGGER|INDEX|POLICY|VIEW|SCHEMA|EXTENSION)\s+(?!IF\s+EXISTS)/gi;
    const dropViolations = findViolations(SQL, bareDropStatement);
    expect(
      dropViolations,
      `Found DROP statement without IF EXISTS:\n${dropViolations
        .map((v) => `  L${v.lineNumber}: ${v.text}`)
        .join("\n")}`
    ).toHaveLength(0);

    // 4. No bare CREATE EXTENSION without IF NOT EXISTS
    const bareCreateExtension = /CREATE\s+EXTENSION\s+(?!IF\s+NOT\s+EXISTS)/gi;
    const extensionViolations = findViolations(SQL, bareCreateExtension);
    expect(
      extensionViolations,
      `Found CREATE EXTENSION without IF NOT EXISTS:\n${extensionViolations
        .map((v) => `  L${v.lineNumber}: ${v.text}`)
        .join("\n")}`
    ).toHaveLength(0);
  });
});
