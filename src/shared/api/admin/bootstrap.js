import { supabase } from "../core/client";

export async function getAdminBootstrap({ preferredOrganizationId = null, defaultPeriodId = null } = {}) {
  const { data, error } = await supabase.rpc("rpc_admin_bootstrap", {
    p_preferred_organization_id: preferredOrganizationId,
    p_default_period_id: defaultPeriodId,
  });
  if (error) throw error;
  return data;
}
