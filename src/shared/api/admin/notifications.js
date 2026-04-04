// src/shared/api/admin/notifications.js
// Wrappers for transactional email Edge Functions (Resend via Supabase).

import { supabase } from "../core/client";

/**
 * Sends the evaluation access link (QR token URL) to a recipient.
 * @param {object} params
 * @param {string} params.recipientEmail
 * @param {string} params.tokenUrl
 * @param {string} [params.expiresIn]  e.g. "2h 30m left"
 * @param {string} [params.periodName]
 * @returns {Promise<{ ok: boolean, sent: boolean, error?: string }>}
 */
export async function sendEntryTokenEmail({ recipientEmail, tokenUrl, expiresIn, periodName }) {
  const { data, error } = await supabase.functions.invoke("send-entry-token-email", {
    body: { recipientEmail, tokenUrl, expiresIn, periodName },
  });
  if (error) throw error;
  return data;
}

/**
 * Sends a juror's new PIN (and optionally the evaluation entry URL) to a recipient.
 * @param {object} params
 * @param {string} params.recipientEmail
 * @param {string} params.jurorName
 * @param {string} params.pin
 * @param {string} [params.jurorAffiliation]
 * @param {string} [params.tokenUrl]
 * @param {string} [params.periodName]
 * @returns {Promise<{ ok: boolean, sent: boolean, error?: string }>}
 */
export async function sendJurorPinEmail({ recipientEmail, jurorName, pin, jurorAffiliation, tokenUrl, periodName }) {
  const { data, error } = await supabase.functions.invoke("send-juror-pin-email", {
    body: { recipientEmail, jurorName, pin, jurorAffiliation, tokenUrl, periodName },
  });
  if (error) throw error;
  return data;
}
