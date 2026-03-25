// src/shared/api/semesterApi.js
// ============================================================
// Semester listing RPCs (public — no admin password required).
// ============================================================

import { supabase } from "./core/client";
import { withRetry } from "./core/retry";
import { sortSemestersByPosterDateDesc } from "../semesterSort";

export async function listSemesters(signal) {
  return withRetry(async () => {
    const q = supabase.rpc("rpc_list_semesters");
    if (signal) q.abortSignal(signal);
    const { data, error } = await q;
    if (error) throw error;
    return sortSemestersByPosterDateDesc(data || []);
  });
}

export async function getCurrentSemester(signal, semesterId) {
  const params = semesterId ? { p_semester_id: semesterId } : {};
  const q = supabase.rpc("rpc_get_current_semester", params);
  if (signal) q.abortSignal(signal);
  const { data, error } = await q;
  if (error) throw error;
  return data?.[0] || null;
}
