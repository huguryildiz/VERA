// src/types/scores.d.ts
// Type definitions for score domain shapes.

/** A score row as returned from the admin scores RPC. */
export interface ScoreRow {
  id: string;
  juror_id: string;
  juror_name: string;
  juror_dept: string;
  group_no: string;
  project_id: string;
  semester_id: string;
  technical: number | null;
  written: number | null;
  oral: number | null;
  teamwork: number | null;
  total: number | null;
  comment: string;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  criteria_scores?: Record<string, number | null>;
}

/** A score snapshot used for deduplication in writeGroup. */
export interface ScoreSnapshot {
  [projectId: string]: {
    scores: Record<string, number | string>;
    comment: string;
  };
}

/** Cell state for score grid display. */
export interface CellState {
  variant: "excellent" | "good" | "developing" | "insufficient" | "empty" | "missing";
  label: string;
}

/** Score filter state for the details view. */
export interface ScoreFilters {
  filterGroupNo: string;
  filterJuror: string;
  filterDept: string;
  filterStatus: string[];
  filterJurorStatus: string[];
  filterProjectTitle: string;
  filterStudents: string;
  filterComment: string;
  updatedFrom: string;
  updatedTo: string;
  completedFrom: string;
  completedTo: string;
  sortKey: string;
  sortDir: "asc" | "desc" | "";
  pageSize: number;
  currentPage: number;
}
