# Email Notifications

VERA sends transactional emails through [Resend](https://resend.com) via Supabase Edge Functions.
All functions live under `supabase/functions/` and are deployed to both **vera-prod** and **vera-demo**.

---

## Environment Variables

Set these in the Supabase dashboard under **Settings → Edge Functions → Secrets** for each project.

| Variable | Required | Description |
|---|---|---|
| `RESEND_API_KEY` | Yes | Resend API key — emails will not send without this |
| `NOTIFICATION_FROM` | No | Sender address. Default: `VERA <noreply@vera-eval.app>` |
| `NOTIFICATION_LOGO_URL` | No | Logo image URL embedded in emails. Falls back to `https://vera-eval.app/vera_logo_dark.png` |
| `NOTIFICATION_APP_URL` | No | Portal URL used for CTA links (e.g. `https://vera-eval.app`) |
| `SUPABASE_URL` | Auto | Injected by Supabase runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto | Injected by Supabase runtime |

---

## Logo

The logo is served from `public/vera_logo_dark.png` at `https://vera-eval.app/vera_logo_dark.png`.
This path is stable (no Vite content hash) because it lives in `public/`, not `src/assets/`.

All functions check `NOTIFICATION_LOGO_URL` first; if empty, the hardcoded public URL is used as fallback.

---

## Email Functions

### 1. `notify-application`

Handles all admin application lifecycle events in one function.

| Event | Trigger | Recipients |
|---|---|---|
| `application_submitted` | New tenant admin applies | Org admins (TO) + super admins (CC, if `ccOnTenantApplication` policy is on) |
| `application_approved` | Super admin approves application | Applicant (TO) + super admins (CC, if policy on) |
| `application_rejected` | Super admin rejects application | Applicant (TO) + super admins (CC, if policy on) |

**Org name resolution:** All three event types resolve the organization name directly from the DB
using `tenant_id`. `tenant_name` in the payload is only a fallback for cases where `tenant_id`
is absent. This means approved/rejected emails always show the correct org name even when
`tenant_name` is passed as an empty string.

**Payload:**

```json
{
  "type": "application_submitted | application_approved | application_rejected",
  "application_id": "uuid",
  "recipient_email": "applicant@email.com",
  "tenant_id": "uuid",
  "applicant_name": "Dr. Elif Yıldız",
  "applicant_email": "elif@tedu.edu.tr",
  "tenant_name": "TED University"
}
```

---

### 2. `invite-org-admin`

Invites a new user to join an organization as an admin. Sends a Supabase native invite
email with an accept link. If the user already has a VERA account, adds them directly
without sending an email.

**Payload:**

```json
{
  "organizationId": "uuid",
  "email": "newadmin@tedu.edu.tr",
  "displayName": "Dr. Mehmet Yılmaz"
}
```

---

### 3. `password-reset-email`

Generates a Supabase password recovery link via the admin API and sends a branded
reset email. Called from the admin's "Forgot Password" flow.

**Payload:**

```json
{
  "email": "admin@tedu.edu.tr"
}
```

---

### 4. `password-changed-notify`

Notifies a user that their password was successfully changed.

**Payload:**

```json
{
  "recipientEmail": "admin@tedu.edu.tr",
  "displayName": "Dr. Mehmet Yılmaz"
}
```

---

### 5. `send-juror-pin-email`

Sends a juror their newly generated or reset PIN. Optionally includes a QR code
and "Join Evaluation" button if an entry token URL is provided.

**Payload:**

```json
{
  "recipientEmail": "juror@tedu.edu.tr",
  "jurorName": "Dr. Ayşe Kaya",
  "pin": "4821",
  "jurorAffiliation": "Electrical Engineering",
  "organizationName": "TED University",
  "periodName": "EE 492 — Spring 2026",
  "tokenUrl": "https://vera-eval.app?eval=TOKEN"
}
```

---

### 6. `send-entry-token-email`

Sends an evaluation access link (QR token URL) to a recipient. Includes a scannable
QR code and a direct "Join Evaluation" button. Called from the admin Entry Control page.

**Payload:**

```json
{
  "recipientEmail": "juror@tedu.edu.tr",
  "tokenUrl": "https://vera-eval.app?eval=TOKEN",
  "expiresIn": "2h 30m left",
  "periodName": "EE 492 — Spring 2026",
  "organizationName": "TED University"
}
```

---

### 7. `request-pin-reset`

Sent to the organization's admins when a juror is locked out after too many failed
PIN attempts. Super admins are CC'd when the `ccOnPinReset` security policy is on (default: true).

**Payload:**

```json
{
  "periodId": "uuid",
  "jurorName": "Dr. Ayşe Kaya",
  "affiliation": "Electrical Engineering",
  "message": "I forgot my PIN — please reset it."
}
```

---

### 8. `request-score-edit`

Sent to the organization's admins when a juror who has already submitted their scores
requests the ability to edit them. Validates the juror's session token before sending.

**Payload:**

```json
{
  "periodId": "uuid",
  "jurorName": "Dr. Ayşe Kaya",
  "affiliation": "Electrical Engineering",
  "sessionToken": "..."
}
```

---

### 9. `send-export-report`

Sends an evaluation report file (XLSX, CSV, or PDF) as an email attachment to one or
more recipients. Called from the admin Send Report dialog.

**Payload:**

```json
{
  "recipients": ["dean@tedu.edu.tr"],
  "fileName": "VERA_Rankings_TEDU_Spring-2026.xlsx",
  "fileBase64": "...",
  "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "reportTitle": "Score Rankings",
  "periodName": "Spring 2026",
  "organization": "TED University",
  "department": "Electrical & Electronics Eng.",
  "message": "Please review before Monday's meeting.",
  "senderName": "Dr. Mehmet Yılmaz",
  "ccSenderEmail": "mehmet@tedu.edu.tr"
}
```

---

### 10. `notify-maintenance`

Sends a scheduled maintenance notice to all org admin users. Called by the super admin
from the Maintenance Mode panel.

**Payload:**

```json
{
  "startTime": "April 5, 2026 at 02:00 AM PDT",
  "endTime": "April 5, 2026 at 04:00 AM PDT",
  "message": "Scheduled database maintenance. Platform temporarily unavailable."
}
```

---

## Security Policy CC Flags

Several functions respect CC flags stored in the `security_policy` table.
These are checked via the shared helper `supabase/functions/_shared/super-admin-cc.ts`.

| Policy Flag | Default | Affects |
|---|---|---|
| `ccOnPinReset` | `true` | `request-pin-reset` |
| `ccOnScoreEdit` | `false` | `request-score-edit` |
| `ccOnTenantApplication` | `true` | `notify-application` |

---

## Email Preview

All email templates can be previewed locally by opening:

```text
supabase/functions/_preview/email-preview.html
```

This is a standalone HTML file with tab-based navigation — no server required.
Open it directly in a browser.

| Tab | Function |
|---|---|
| Password Reset | `password-reset-email` |
| Password Changed | `password-changed-notify` |
| Application Approved | `notify-application` |
| Application Rejected | `notify-application` |
| Application Submitted | `notify-application` |
| Juror PIN | `send-juror-pin-email` |
| Entry Token | `send-entry-token-email` |
| Export Report | `send-export-report` |
| Maintenance Notice | `notify-maintenance` |
| PIN Reset Request | `request-pin-reset` |
| Score Edit Request | `request-score-edit` |
| Org Admin Invite | `invite-org-admin` |

---

## Shared Helpers

**`supabase/functions/_shared/super-admin-cc.ts`**

Provides two helpers used by functions that need to CC super admins:

- `getSuperAdminEmails(client)` — returns all super admin email addresses
- `shouldCcOn(client, flag)` — reads a boolean flag from the `security_policy` table

When deploying functions that use these helpers via the Supabase MCP tool, the cross-directory
import `../_shared/super-admin-cc.ts` cannot be resolved by the bundler. In that case, inline
the helper functions directly into `index.ts` for deployment. The source file remains canonical
at `supabase/functions/_shared/super-admin-cc.ts`; `notify-application` currently ships with
the helpers inlined.

---

## Deployment

Both **vera-prod** (`etxgvkvxvbyserhrugjw`) and **vera-demo** (`kmprsxrofnemmsryjhfj`)
must be kept in sync. All 10 functions have `verify_jwt: false` — they use custom
auth (session token validation, service role key) or are called only from trusted
admin surfaces.
