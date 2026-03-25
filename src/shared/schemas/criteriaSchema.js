// src/shared/schemas/criteriaSchema.js
// Zod schema for criteria template validation at the API save boundary.
// Used by useCriteriaForm save handler to validate before sending to Supabase.

import { z } from "zod";

export const rubricBandSchema = z.object({
  level: z.string().min(1),
  min: z.union([z.number(), z.string()]),
  max: z.union([z.number(), z.string()]),
  desc: z.string(),
  range: z.string().optional(),
});

export const criterionTemplateSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  shortLabel: z.string().min(1),
  color: z.string(),
  max: z.number().int().min(1).max(100),
  blurb: z.string().min(1),
  mudek: z.array(z.string()),
  mudek_outcomes: z.array(z.string()).optional(),
  rubric: z.array(rubricBandSchema),
});

export const criteriaTemplateSchema = z
  .array(criterionTemplateSchema)
  .min(1, "At least one criterion required")
  .refine(
    (criteria) => criteria.reduce((sum, c) => sum + c.max, 0) === 100,
    { message: "Criteria max scores must total 100" }
  );
