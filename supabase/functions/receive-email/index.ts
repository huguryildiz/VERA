// supabase/functions/receive-email/index.ts
// ============================================================
// Resend inbound email webhook receiver.
// Resend POSTs parsed email payloads here when an email arrives
// at any @vera-eval.app address.
//
// Actions:
//   1. Stores email in `received_emails` table (DB inspection)
//   2. Forwards to FORWARD_TO address via Resend send API
//
// Auth: verify_jwt=false — Resend doesn't send Supabase JWTs.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FORWARD_TO = "huguryildiz@gmail.com";
const FORWARD_FROM = "demo-admin@vera-eval.app";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Resend inbound payload shape:
  // { type: "email.received", created_at: string, data: { from, to, subject, text, html, ... } }
  const data = (payload.data ?? payload) as Record<string, unknown>;

  const from_address = typeof data.from === "string" ? data.from : null;
  const to_raw = data.to;
  const to_address = Array.isArray(to_raw)
    ? (to_raw as string[]).join(", ")
    : typeof to_raw === "string"
    ? to_raw
    : null;
  const subject = typeof data.subject === "string" ? data.subject : null;
  const text_body = typeof data.text === "string" ? data.text : null;
  const html_body = typeof data.html === "string" ? data.html : null;

  // 1. Store in DB
  const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { error } = await service.from("received_emails").insert({
    from_address,
    to_address,
    subject,
    text_body,
    html_body,
    raw_payload: payload,
  });

  if (error) {
    console.error("receive-email: DB insert failed:", error.message);
  }

  // 2. Forward to Gmail via Resend
  if (RESEND_API_KEY) {
    try {
      const fwdSubject = `Fwd: ${subject ?? "(no subject)"} [from: ${from_address ?? "?"}]`;
      const fwdText = [
        `---------- Forwarded message ----------`,
        `From: ${from_address ?? "?"}`,
        `To: ${to_address ?? "?"}`,
        `Subject: ${subject ?? "(no subject)"}`,
        ``,
        text_body ?? "(no plain text body)",
      ].join("\n");

      const fwdHtml = html_body
        ? `<p style="color:#888;font-size:12px">
            ---- Forwarded from: <b>${from_address ?? "?"}</b> → <b>${to_address ?? "?"}</b> ----
           </p>${html_body}`
        : undefined;

      const body: Record<string, unknown> = {
        from: FORWARD_FROM,
        to: [FORWARD_TO],
        subject: fwdSubject,
        text: fwdText,
      };
      if (fwdHtml) body.html = fwdHtml;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        console.warn("receive-email: forward failed:", err);
      } else {
        console.log(`receive-email: forwarded to ${FORWARD_TO}`);
      }
    } catch (e) {
      console.warn("receive-email: forward error:", (e as Error).message);
    }
  }

  console.log(`receive-email: stored from=${from_address} subject=${subject}`);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
