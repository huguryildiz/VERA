// src/shared/api/admin/frameworks.js
// Accreditation frameworks and outcomes management (PostgREST).

import { supabase } from "../core/client";

export async function listFrameworks(organizationId) {
  const { data, error } = await supabase
    .from("frameworks")
    .select("*")
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .order("created_at");
  if (error) throw error;
  return data || [];
}

export async function createFramework(payload) {
  const { data, error } = await supabase
    .from("frameworks")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFramework(id, payload) {
  const { data, error } = await supabase
    .from("frameworks")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFramework(id) {
  const { error } = await supabase.from("frameworks").delete().eq("id", id);
  if (error) throw error;
}

export async function listOutcomes(frameworkId) {
  const { data, error } = await supabase
    .from("framework_outcomes")
    .select("*")
    .eq("framework_id", frameworkId)
    .order("sort_order");
  if (error) throw error;
  return data || [];
}

export async function createOutcome(payload) {
  const { data, error } = await supabase
    .from("framework_outcomes")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOutcome(id, payload) {
  const { data, error } = await supabase
    .from("framework_outcomes")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteOutcome(id) {
  const { error } = await supabase.from("framework_outcomes").delete().eq("id", id);
  if (error) throw error;
}

export async function listFrameworkCriteria(frameworkId) {
  const { data, error } = await supabase
    .from("framework_criteria")
    .select("*")
    .eq("framework_id", frameworkId)
    .order("sort_order");
  if (error) throw error;
  return data || [];
}

export async function listCriterionOutcomeMappings(frameworkId) {
  const { data, error } = await supabase
    .from("framework_criterion_outcome_maps")
    .select("*, outcome:framework_outcomes(*)")
    .eq("framework_id", frameworkId);
  if (error) throw error;
  return data || [];
}

export async function upsertCriterionOutcomeMapping(payload) {
  const { data, error } = await supabase
    .from("framework_criterion_outcome_maps")
    .upsert(payload, { onConflict: "criterion_id,outcome_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCriterionOutcomeMapping(id) {
  const { error } = await supabase.from("framework_criterion_outcome_maps").delete().eq("id", id);
  if (error) throw error;
}
