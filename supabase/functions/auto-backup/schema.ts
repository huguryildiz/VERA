// Wire-shape schemas for auto-backup.
//
// Architecture spec § 3.5: every Edge Function owns a co-located schema.ts
// that is the single source of truth for its request and response shapes.
//
// Note: This is a cron+manual function authenticated by either:
//   - X-Cron-Secret header matching AUTO_BACKUP_SECRET env (cron path)
//   - super_admin JWT in Authorization: Bearer <jwt> (manual path)
// No request body validation.

import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

// ── Response shape ────────────────────────────────────────────────────────
//
// 200 — { ok: true, backed_up: [{orgId, orgName, path, sizeBytes}], errors?: [...], message?: string }
// 200 — { ok: false, backed_up: [...], errors: [{orgId, orgName, message}] }
// 401 — { error: string }                           (missing bearer token)
// 403 — { error: string }                           (not super_admin or service role)
// 500 — { error: string }                           (unhandled exception)

export const BackupItemSchema = z.object({
  orgId: z.string(),
  orgName: z.string(),
  path: z.string(),
  sizeBytes: z.number(),
});

export const BackupErrorSchema = z.object({
  orgId: z.string(),
  orgName: z.string(),
  message: z.string(),
});

export const SuccessResponseSchema = z.object({
  ok: z.boolean(),
  backed_up: z.array(BackupItemSchema),
  errors: z.array(BackupErrorSchema).optional(),
  message: z.string().optional(),
});

export const ValidationErrorResponseSchema = z.object({
  error: z.string(),
});

export const InternalErrorResponseSchema = z.object({
  error: z.string(),
});

export type BackupItem = z.infer<typeof BackupItemSchema>;
export type BackupError = z.infer<typeof BackupErrorSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type ValidationErrorResponse = z.infer<typeof ValidationErrorResponseSchema>;
export type InternalErrorResponse = z.infer<typeof InternalErrorResponseSchema>;
