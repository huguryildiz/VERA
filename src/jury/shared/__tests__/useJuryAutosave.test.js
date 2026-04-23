import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { qaTest } from "@/test/qaTest";

const { mockUpsertScore, mockGetActiveCriteria } = vi.hoisted(() => ({
  mockUpsertScore: vi.fn(),
  mockGetActiveCriteria: vi.fn(),
}));

vi.mock("@/shared/criteriaHelpers", () => ({
  getActiveCriteria: mockGetActiveCriteria,
}));

vi.mock("@/shared/api", () => ({
  upsertScore: mockUpsertScore,
}));

import { useJuryAutosave } from "../useJuryAutosave";

const CRITERIA = [{ key: "technical", max: 25 }];

function makeRefs({ scores = {}, comments = {}, state = {} } = {}) {
  return {
    stateRef: {
      current: {
        jurorId: "j1",
        jurorSessionToken: "tok-1",
        periodId: "p1",
        criteriaConfig: [],
        current: 0,
        projects: [{ project_id: "proj-1" }],
        ...state,
      },
    },
    pendingScoresRef: { current: { "proj-1": { technical: 20 }, ...scores } },
    pendingCommentsRef: { current: { "proj-1": "nice", ...comments } },
  };
}

function renderAutosave(refs, overrides = {}) {
  const setGroupSynced = vi.fn();
  const setEditLockActive = vi.fn();
  return renderHook(() =>
    useJuryAutosave({
      stateRef: refs.stateRef,
      pendingScoresRef: refs.pendingScoresRef,
      pendingCommentsRef: refs.pendingCommentsRef,
      editLockActive: false,
      setGroupSynced,
      setEditLockActive,
      step: "eval",
      ...overrides,
    })
  );
}

describe("useJuryAutosave", () => {
  beforeEach(() => {
    mockGetActiveCriteria.mockReturnValue(CRITERIA);
    mockUpsertScore.mockReset();
  });

  qaTest("jury.autosave.01", async () => {
    mockUpsertScore.mockResolvedValue({});
    const refs = makeRefs();
    const { result } = renderAutosave(refs);

    // First write populates lastWrittenRef
    await act(async () => { await result.current.writeGroup("proj-1"); });
    expect(mockUpsertScore).toHaveBeenCalledTimes(1);

    // Second write with same data — dedup skip
    await act(async () => { await result.current.writeGroup("proj-1"); });
    expect(mockUpsertScore).toHaveBeenCalledTimes(1);
  });

  qaTest("jury.autosave.02", async () => {
    mockUpsertScore.mockResolvedValue({});
    const refs = makeRefs();
    const { result } = renderAutosave(refs);

    let ok;
    await act(async () => { ok = await result.current.writeGroup("proj-1"); });
    expect(ok).toBe(true);
    expect(mockUpsertScore).toHaveBeenCalledTimes(1);
  });

  qaTest("jury.autosave.03", async () => {
    const err = { message: "period_locked" };
    mockUpsertScore.mockRejectedValue(err);
    const refs = makeRefs();
    const setEditLockActive = vi.fn();
    const { result } = renderAutosave(refs, { setEditLockActive });

    await act(async () => { await result.current.writeGroup("proj-1"); });
    expect(setEditLockActive).toHaveBeenCalledWith(true);
  });

  qaTest("jury.autosave.04", async () => {
    const err = { code: "P0401", message: "juror_session_expired" };
    mockUpsertScore.mockRejectedValue(err);
    const refs = makeRefs();
    const setEditLockActive = vi.fn();
    const { result } = renderAutosave(refs, { setEditLockActive });

    await act(async () => { await result.current.writeGroup("proj-1"); });
    expect(result.current.sessionExpired).toBe(true);
    expect(setEditLockActive).toHaveBeenCalledWith(true);
  });
});
