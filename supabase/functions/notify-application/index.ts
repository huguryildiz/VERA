// supabase/functions/notify-application/index.ts
// ============================================================
// Phase C: Email notification Edge Function for admin
// application workflow events.
//
// Called by pg_net from approval/rejection/submission RPCs.
//
// Email provider: Resend (via RESEND_API_KEY env var).
// Falls back to logging-only if RESEND_API_KEY is not set.
//
// Failure handling:
// - Application state is already committed before this is called
// - Failures are logged but never affect the workflow
// ============================================================

interface NotificationPayload {
  type: "application_submitted" | "application_approved" | "application_rejected";
  application_id: string;
  recipient_email: string;
  tenant_id: string;
  applicant_name?: string;
  tenant_name?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sendViaResend(
  apiKey: string,
  to: string,
  subject: string,
  body: string,
  from: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text: body,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${err}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();

    if (!payload.type || !payload.application_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, application_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build email content
    let subject = "";
    let body = "";
    let to = payload.recipient_email || "";
    const tenantLabel = payload.tenant_name || "the requested department";

    switch (payload.type) {
      case "application_submitted":
        subject = `New admin application: ${payload.applicant_name || "Unknown"} → ${tenantLabel}`;
        body = [
          `${payload.applicant_name || "A user"} (${payload.recipient_email}) has applied for admin access to ${tenantLabel}.`,
          "",
          "Please review the application in the VERA admin panel.",
        ].join("\n");
        break;

      case "application_approved":
        subject = "Your VERA admin application has been approved";
        body = [
          `Your application for admin access to ${tenantLabel} has been approved.`,
          "",
          "You can now log in to the VERA admin panel with your registered email and password.",
        ].join("\n");
        break;

      case "application_rejected":
        subject = "VERA admin application update";
        body = [
          `Your application for admin access to ${tenantLabel} was not approved at this time.`,
          "",
          "Please contact the department administrator for more information.",
        ].join("\n");
        break;
    }

    // Try to send via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromAddr = Deno.env.get("NOTIFICATION_FROM") || "VERA <noreply@vera.dev>";
    let sent = false;
    let sendError = "";

    if (resendKey && to) {
      const result = await sendViaResend(resendKey, to, subject, body, fromAddr);
      sent = result.ok;
      sendError = result.error || "";
    } else {
      sendError = !resendKey
        ? "RESEND_API_KEY not configured"
        : "No recipient email";
    }

    // Log result
    const logEntry = {
      type: payload.type,
      application_id: payload.application_id,
      to,
      subject,
      sent,
      error: sendError || undefined,
    };

    console.log("Notification result:", JSON.stringify(logEntry));

    return new Response(
      JSON.stringify({ ok: true, sent, error: sendError || undefined }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Notification error:", (e as Error).message);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
