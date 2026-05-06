import { describe, expect, beforeEach } from "vitest";
import { qaTest } from "../../../test/qaTest.js";
import {
  setJuryAccess,
  getJuryAccess,
  setJuryAccessGrant,
  getJuryAccessGrant,
  saveJurySession,
  getJurySession,
  clearJurySession,
  setJuryDraftComment,
  getJuryDraftComment,
  clearJuryDraftComment,
} from "../juryStorage.js";

describe("storage/juryStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  qaTest("storage.juryStorage.01", () => {
    setJuryAccess("period-abc");
    expect(sessionStorage.getItem("jury_access_period")).toBe("period-abc");
    expect(localStorage.getItem("jury_access_period")).toBe("period-abc");
  });

  qaTest("storage.juryStorage.02", () => {
    sessionStorage.setItem("jury_access_period", "session-only");
    expect(getJuryAccess()).toBe("session-only");
  });

  qaTest("storage.juryStorage.03", () => {
    setJuryAccessGrant({ period_id: "p1", period_name: "Spring" });
    const grant = getJuryAccessGrant();
    expect(grant).toEqual({ period_id: "p1", period_name: "Spring" });
  });

  qaTest("storage.juryStorage.04", () => {
    setJuryAccessGrant({ period_name: "Missing ID" });
    expect(getJuryAccessGrant()).toBeNull();
  });

  qaTest("storage.juryStorage.05", () => {
    saveJurySession({
      jurorSessionToken: "tok123",
      jurorId: "j1",
      periodId: "p1",
      periodName: "Spring 2025",
      juryName: "Alice",
      affiliation: "TEDU",
      current: 3,
    });
    const session = getJurySession();
    expect(session).not.toBeNull();
    expect(session.jurorSessionToken).toBe("tok123");
    expect(session.jurorId).toBe("j1");
    expect(session.current).toBe(3);
  });

  qaTest("storage.juryStorage.06", () => {
    saveJurySession({ jurorSessionToken: "tok123", jurorId: "j1", periodId: "p1", periodName: "", juryName: "", affiliation: "", current: 0 });
    clearJurySession();
    expect(getJurySession()).toBeNull();
  });

  qaTest("storage.juryStorage.07", () => {
    expect(getJuryDraftComment("proj-1")).toBeNull();
    setJuryDraftComment("proj-1", "in progress note");
    expect(getJuryDraftComment("proj-1")).toBe("in progress note");
    expect(localStorage.getItem("jury.draft_comment_proj-1")).toBe("in progress note");
    setJuryDraftComment("proj-1", "");
    expect(getJuryDraftComment("proj-1")).toBe("");
  });

  qaTest("storage.juryStorage.08", () => {
    setJuryDraftComment("proj-1", "foo");
    // Snapshot persisted "foo" but user kept typing — draft now "foobar".
    setJuryDraftComment("proj-1", "foobar");
    clearJuryDraftComment("proj-1", "foo"); // matches persisted snapshot, not draft
    expect(getJuryDraftComment("proj-1")).toBe("foobar");
    // Once the next persist matches the current draft, clear succeeds.
    clearJuryDraftComment("proj-1", "foobar");
    expect(getJuryDraftComment("proj-1")).toBeNull();
    // Unconditional clear (no expectedText) also drops the draft.
    setJuryDraftComment("proj-2", "anything");
    clearJuryDraftComment("proj-2");
    expect(getJuryDraftComment("proj-2")).toBeNull();
  });

  qaTest("storage.juryStorage.09", () => {
    saveJurySession({ jurorSessionToken: "tok", jurorId: "j", periodId: "p", periodName: "", juryName: "", affiliation: "", current: 0 });
    setJuryDraftComment("proj-1", "draft a");
    setJuryDraftComment("proj-2", "draft b");
    clearJurySession();
    expect(getJuryDraftComment("proj-1")).toBeNull();
    expect(getJuryDraftComment("proj-2")).toBeNull();
  });
});
