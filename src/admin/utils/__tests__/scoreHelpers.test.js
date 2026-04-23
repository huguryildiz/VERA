import { describe, expect, vi } from "vitest";
import { qaTest } from "../../../test/qaTest.js";

// Mock lucide icon imports inside scoreHelpers
vi.mock("@/shared/ui/Icons", () => ({
  CheckCircle2Icon: "CheckCircle2Icon",
  CheckIcon: "CheckIcon",
  SendIcon: "SendIcon",
  Clock3Icon: "Clock3Icon",
  CircleIcon: "CircleIcon",
  CircleDotDashedIcon: "CircleDotDashedIcon",
  PencilIcon: "PencilIcon",
}));

import {
  getCellState,
  getPartialTotal,
  getJurorWorkflowState,
  getProjectHighlight,
  computeOverviewMetrics,
  scoreBgColor,
  scoreCellStyle,
  jurorStatusMeta,
} from "../scoreHelpers.js";

const CRITERIA = [
  { id: "design", max: 30 },
  { id: "delivery", max: 40 },
  { id: "innovation", max: 30 },
];

describe("scoreHelpers — getCellState", () => {
  qaTest("score.helper.01", () => {
    expect(getCellState(null, CRITERIA)).toBe("empty");
    expect(getCellState(undefined, CRITERIA)).toBe("empty");

    // No criteria fields filled → empty
    expect(getCellState({ total: null }, CRITERIA)).toBe("empty");

    // All criteria filled → scored
    expect(getCellState({ design: 25, delivery: 30, innovation: 20 }, CRITERIA)).toBe("scored");

    // Partial
    expect(getCellState({ design: 25, delivery: null, innovation: null }, CRITERIA)).toBe("partial");
    expect(getCellState({ design: 25, delivery: 30, innovation: null }, CRITERIA)).toBe("partial");

    // Empty criteria list → any entry is "empty"
    expect(getCellState({ design: 25 }, [])).toBe("empty");
  });
});

describe("scoreHelpers — getPartialTotal", () => {
  qaTest("score.helper.02", () => {
    expect(getPartialTotal(null, CRITERIA)).toBe(0);
    expect(getPartialTotal(undefined, CRITERIA)).toBe(0);

    // Only numeric criteria fields summed
    const entry = { design: 20, delivery: 30, innovation: null };
    expect(getPartialTotal(entry, CRITERIA)).toBe(50);

    // All filled
    const full = { design: 25, delivery: 35, innovation: 28 };
    expect(getPartialTotal(full, CRITERIA)).toBe(88);

    // Non-numeric value ignored
    const mixed = { design: "bad", delivery: 10, innovation: 5 };
    expect(getPartialTotal(mixed, CRITERIA)).toBe(15);
  });
});

describe("scoreHelpers — getJurorWorkflowState", () => {
  qaTest("score.helper.03", () => {
    const groups = [{ id: "g1" }, { id: "g2" }];

    // editing takes priority
    const editingJuror = { key: "j1", editEnabled: true };
    const finalMap = new Map();
    expect(getJurorWorkflowState(editingJuror, groups, {}, finalMap)).toBe("editing");

    // completed: finalSubmittedAt + not editing
    const completedJuror = { key: "j2", editEnabled: false };
    const finalMapWithJ2 = new Map([["j2", true]]);
    expect(getJurorWorkflowState(completedJuror, groups, {}, finalMapWithJ2)).toBe("completed");

    // ready_to_submit: all groups scored
    const juror = { key: "j3", editEnabled: false };
    const lookup = {
      j3: {
        g1: { design: 25, delivery: 30, innovation: 20 },
        g2: { design: 20, delivery: 35, innovation: 18 },
      },
    };
    expect(getJurorWorkflowState(juror, groups, lookup, new Map(), CRITERIA)).toBe("ready_to_submit");

    // in_progress: some scored, not all
    const partialLookup = {
      j3: {
        g1: { design: 25, delivery: 30, innovation: 20 },
        g2: {},
      },
    };
    expect(getJurorWorkflowState(juror, groups, partialLookup, new Map(), CRITERIA)).toBe("in_progress");

    // not_started: no scores
    expect(getJurorWorkflowState(juror, groups, {}, new Map(), CRITERIA)).toBe("not_started");
  });
});

describe("scoreHelpers — getProjectHighlight", () => {
  qaTest("score.helper.04", () => {
    const criteriaConfig = [
      { id: "design",    max: 30, shortLabel: "Design" },
      { id: "delivery",  max: 40, shortLabel: "Delivery" },
      { id: "innovation",max: 30, shortLabel: "Innovation" },
    ];

    // null / no avg → null
    expect(getProjectHighlight(null, criteriaConfig)).toBeNull();
    expect(getProjectHighlight({ avg: null }, criteriaConfig)).toBeNull();
    expect(getProjectHighlight({ avg: { design: 28 } }, [])).toBeNull();

    // Rule 1: totalAvg ≥ 85
    const outstanding = { avg: { design: 28, delivery: 36, innovation: 27 }, totalAvg: 87 };
    expect(getProjectHighlight(outstanding, criteriaConfig)).toBe("Outstanding overall performance");

    // Rule 2: all within 10 pct range (no totalAvg ≥ 85)
    // design: 15/30=50%, delivery: 22/40=55%, innovation: 16/30=53.3% → range < 10
    const consistent = { avg: { design: 15, delivery: 22, innovation: 16 }, totalAvg: 50 };
    expect(getProjectHighlight(consistent, criteriaConfig)).toBe("Consistent across all criteria");

    // Rule 3: top criterion >15 pct-pt above next
    // design: 28/30=93.3%, delivery: 10/40=25%, innovation: 10/30=33.3% → gap 60pp
    const highDesign = { avg: { design: 28, delivery: 10, innovation: 10 }, totalAvg: 48 };
    expect(getProjectHighlight(highDesign, criteriaConfig)).toBe("High Design");

    // Rule 4: top two both >80%
    // design: 25/30=83%, delivery: 35/40=87.5%, innovation: 10/30=33% → range > 10, gap top2 < 15
    const strong = { avg: { design: 25, delivery: 35, innovation: 10 }, totalAvg: 70 };
    const h4 = getProjectHighlight(strong, criteriaConfig);
    expect(h4).toMatch(/Strong/);

    // Rule 5: fallback — top criterion <15pp above next, neither >80%
    // design: 20/30=66.7%, delivery: 22/40=55%, innovation: 18/30=60%
    // range=11.7% (>10 → not consistent); gap 66.7-60=6.7% (<15 → not high)
    // top two: 66.7% and 60% (neither >80% → not strong)
    const fallback = { avg: { design: 20, delivery: 22, innovation: 18 }, totalAvg: 60 };
    const h5 = getProjectHighlight(fallback, criteriaConfig);
    expect(h5).toMatch(/Strongest in/);
  });
});

describe("scoreHelpers — computeOverviewMetrics", () => {
  qaTest("score.helper.05", () => {
    const jurors = [
      { jurorId: "j1", key: "j1", editEnabled: false, finalSubmittedAt: "2025-06-01T00:00:00Z", finalSubmitted: true },
      { jurorId: "j2", key: "j2", editEnabled: true,  finalSubmittedAt: null },
      { jurorId: "j3", key: "j3", editEnabled: false, finalSubmittedAt: null }, // in_progress — partial score
      { jurorId: "j4", key: "j4", editEnabled: false, finalSubmittedAt: null }, // not_started — no scores
    ];
    const scores = [
      { jurorId: "j1", key: "j1", projectId: "p1", design: 25, delivery: 30, innovation: 20, total: 75 },
      { jurorId: "j1", key: "j1", projectId: "p2", design: 20, delivery: 35, innovation: 25, total: 80 },
      { jurorId: "j3", key: "j3", projectId: "p1", design: 15, delivery: null, innovation: null, total: null },
    ];

    const metrics = computeOverviewMetrics(scores, jurors, 2, CRITERIA);

    expect(metrics.totalJurors).toBe(4);
    expect(metrics.completedJurors).toBe(1);  // j1 finalized + not editing
    expect(metrics.editingJurors).toBe(1);    // j2
    expect(metrics.notStartedJurors).toBe(1); // j4 — no scores at all
    expect(metrics.totalEvaluations).toBe(8); // 4 jurors × 2 projects
    expect(typeof metrics.scoredEvaluations).toBe("number");
    expect(typeof metrics.partialEvaluations).toBe("number");

    // Empty input
    const empty = computeOverviewMetrics(null, null, 0);
    expect(empty.totalJurors).toBe(0);
    expect(empty.completedJurors).toBe(0);
  });
});

describe("scoreHelpers — scoreBgColor / scoreCellStyle", () => {
  qaTest("score.helper.06", () => {
    // No score → null
    expect(scoreBgColor(null, 100)).toBeNull();
    expect(scoreCellStyle(null, 100)).toBeNull();
    expect(scoreBgColor(50, 0)).toBeNull(); // max=0

    // Valid score → returns rgba string
    const bg = scoreBgColor(80, 100);
    expect(typeof bg).toBe("string");
    expect(bg).toMatch(/rgba\(/);

    const style = scoreCellStyle(80, 100);
    expect(style).not.toBeNull();
    expect(typeof style.background).toBe("string");
    expect(typeof style.boxShadow).toBe("string");
    expect(typeof style.color).toBe("string");

    // Different levels produce different backgrounds
    const bgLow  = scoreBgColor(5, 100);
    const bgHigh = scoreBgColor(95, 100);
    expect(bgLow).not.toBe(bgHigh);
  });
});

