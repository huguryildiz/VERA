import { describe, vi, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { qaTest } from "@/test/qaTest";

import { useGlobalTableSort } from "../useGlobalTableSort";

function buildTable(rows, disableSort = false) {
  const container = document.createElement("div");
  container.className = "admin-content";

  const table = document.createElement("table");
  if (disableSort) table.setAttribute("data-disable-global-sort", "true");

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Name", "Score"].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    const icon = document.createElement("span");
    icon.className = "sort-icon sort-icon-inactive";
    icon.textContent = "▲";
    th.appendChild(icon);
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");
  rows.forEach(([name, score]) => {
    const tr = document.createElement("tr");
    [name, score].forEach((val) => {
      const td = document.createElement("td");
      td.textContent = val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  container.appendChild(table);
  document.body.appendChild(container);

  return { container, table, thead, tbody };
}

function cleanup(container) {
  document.body.removeChild(container);
}

describe("useGlobalTableSort", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  qaTest("admin.shared.tableSort.01", () => {
    const { container, thead, tbody } = buildTable([
      ["Charlie", "70"],
      ["Alice", "90"],
      ["Bob", "80"],
    ]);

    renderHook(() => useGlobalTableSort(".admin-content"));

    const th0 = thead.querySelectorAll("th")[0];
    th0.click();

    const rows = Array.from(tbody.querySelectorAll("tr"));
    const firstCell = rows[0].children[0].textContent;
    const lastCell = rows[rows.length - 1].children[0].textContent;

    expect(firstCell <= lastCell).toBe(true);
    expect(th0.getAttribute("aria-sort")).toBe("ascending");
    expect(th0.classList.contains("sorted")).toBe(true);

    cleanup(container);
  });

  qaTest("admin.shared.tableSort.02", () => {
    const { container, thead, tbody } = buildTable([
      ["Charlie", "70"],
      ["Alice", "90"],
      ["Bob", "80"],
    ]);

    renderHook(() => useGlobalTableSort(".admin-content"));

    const th0 = thead.querySelectorAll("th")[0];
    th0.click(); // asc
    th0.click(); // desc

    expect(th0.getAttribute("aria-sort")).toBe("descending");
    const rows = Array.from(tbody.querySelectorAll("tr"));
    expect(rows[0].children[0].textContent >= rows[rows.length - 1].children[0].textContent).toBe(true);

    th0.click(); // restore
    expect(th0.getAttribute("aria-sort")).toBe("none");
    expect(th0.classList.contains("sorted")).toBe(false);

    cleanup(container);
  });

  qaTest("admin.shared.tableSort.03", () => {
    const { container, thead } = buildTable([
      ["100", ""],
      ["", "x"],
      ["20", "y"],
    ]);

    renderHook(() => useGlobalTableSort(".admin-content"));

    const th0 = thead.querySelectorAll("th")[0];
    th0.click();

    // After sort, empty cells should be at the end
    const tbody = container.querySelector("tbody");
    const rows = Array.from(tbody.querySelectorAll("tr"));
    const lastRowFirstCell = rows[rows.length - 1].children[0].textContent;
    expect(lastRowFirstCell).toBe("");

    cleanup(container);
  });

  qaTest("admin.shared.tableSort.04", () => {
    const { container, thead } = buildTable([["A", "B"]], true);

    renderHook(() => useGlobalTableSort(".admin-content"));

    const th0 = thead.querySelectorAll("th")[0];
    expect(th0.classList.contains("sortable")).toBe(false);

    cleanup(container);
  });
});
