// src/types/admin.d.ts
// Type definitions for admin panel domain shapes.

/** A project record from Supabase. */
export interface ProjectShape {
  id: string;
  group_no: string;
  project_title: string;
  group_students: string;
  semester_id: string;
  created_at: string;
  updated_at: string;
}

/** A semester record from Supabase. */
export interface SemesterShape {
  id: string;
  semester_name: string;
  is_current: boolean;
  is_locked: boolean;
  criteria_template: import("./criteria").CriteriaTemplate | null;
  mudek_template: import("./criteria").MudekOutcome[] | null;
  created_at: string;
  updated_at: string;
}

/** Dashboard statistics computed for analytics. */
export interface DashboardStats {
  [groupNo: string]: {
    [criterionKey: string]: {
      scores: number[];
      avg: number;
      count: number;
    };
  };
}

/** Overview metrics for the admin dashboard. */
export interface OverviewMetrics {
  totalGroups: number;
  totalJurors: number;
  totalSubmissions: number;
  completionRate: number;
  averageTotal: number;
}
