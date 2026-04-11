// src/admin/__tests__/useBackups.test.js
import { describe, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { qaTest } from "../../test/qaTest.js";

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockDelete = vi.fn();
const mockSignedUrl = vi.fn();
const mockRecordDownload = vi.fn();

vi.mock("../../shared/lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../shared/api", () => ({
  listBackups: (...a) => mockList(...a),
  createBackup: (...a) => mockCreate(...a),
  deleteBackup: (...a) => mockDelete(...a),
  getBackupSignedUrl: (...a) => mockSignedUrl(...a),
  recordBackupDownload: (...a) => mockRecordDownload(...a),
}));

import { useBackups } from "../hooks/useBackups.js";

const SAMPLE = [
  { id: "b1", origin: "manual", size_bytes: 4200, created_at: "2026-04-11T14:02:00Z", storage_path: "org-1/b1.json" },
  { id: "b2", origin: "auto", size_bytes: 4000, created_at: "2026-04-08T03:00:00Z", storage_path: "org-1/b2.json" },
];

describe("useBackups", () => {
  beforeEach(() => {
    mockList.mockReset();
    mockCreate.mockReset();
    mockDelete.mockReset();
    mockSignedUrl.mockReset();
    mockRecordDownload.mockReset();
  });

  qaTest("backups.hook.load.01", async () => {
    mockList.mockResolvedValueOnce(SAMPLE);
    const { result } = renderHook(() => useBackups("org-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.backups).toEqual(SAMPLE);
    expect(mockList).toHaveBeenCalledWith("org-1");
  });

  qaTest("backups.hook.create.01", async () => {
    mockList.mockResolvedValueOnce([]);
    mockCreate.mockResolvedValueOnce({ id: "b3", path: "org-1/b3.json" });
    mockList.mockResolvedValueOnce([{ id: "b3" }]);

    const { result } = renderHook(() => useBackups("org-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create();
    });

    expect(mockCreate).toHaveBeenCalledWith("org-1");
    await waitFor(() => expect(result.current.backups).toEqual([{ id: "b3" }]));
  });
});
