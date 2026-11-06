# 11 — Live backend (now wired)

Mobiliza now runs on Lovable Cloud for signed-in churches. The demo stays open without login.

## How modes work
- **Demo:** visitors who are not signed in (or who pick "Explore the demo church") see the two fictional churches. Nothing is saved; all sends are simulated.
- **Live:** a signed-in user sees only churches they belong to. Every page reads and writes the database. Actions are sent for real to webhooks saved in the Integration Hub.

## Sign-in
- `/auth`: email + password, Google, Sign in with Lovable. Email confirmation is ON.
- `/reset-password`: set a new password from the reset email.
- `/onboarding`: first sign-in with no church → create one. Creator becomes **Church admin**.
- Settings → Users and permissions → **Invite by email** (admin/pastor). The invitee joins automatically on first sign-in with that email. No email is sent yet — share the sign-up link yourself.

## Database (public schema)
| Table | Purpose |
|---|---|
| `tenants` | Churches |
| `profiles` | Display name and email, created on sign-up |
| `user_roles` | Membership + role per church (`church_admin`, `pastor`, `department_leader`, `cell_leader`, `member`, `super_admin`) |
| `tenant_invites` | Pending email invites |
| `records` | Every app record, keyed `(tenant_id, collection, id)` with `data jsonb` — members, units, services, broadcasts, prayer data, transport, vehicles, follow-ups, reports, agents, integrations, endpoints, delivery logs… |
| `inbound_events` | Callbacks received from n8n / WhatsApp / voice |

Security rules: users read/write only their churches' rows; `member` role is read-only; deletes need admin/pastor. Functions: `create_church`, `accept_invites`, `is_tenant_member`, `has_tenant_role`.

`records` keeps the UI's repository contract unchanged. When a collection needs reporting/joins at scale, promote it to its own typed table (see `03-DATABASE-MAPPING.md`) and change only `src/services/data/cloud`.

## Outbound (to n8n)
Live actions go through the server function `deliverWebhook`:
- Only URLs saved in that church's endpoints/integrations are allowed.
- Body = the event envelope (see `event-examples.json`).
- Headers: `content-type: application/json`, `x-mobiliza-tenant`, `x-mobiliza-signature` = hex HMAC-SHA256 of the raw body with `MOBILIZA_WEBHOOK_SECRET`.
- Result is written to the delivery log (Integration Hub → Logs).

## Inbound (from n8n)
`POST /api/public/hooks/{source}` (e.g. `whatsapp`, `voicebip`, `n8n`)
```json
{ "tenant_id": "<church uuid>", "kind": "prayer.signed_in", "payload": { "member_phone": "+234…", "watch": "03:00" } }
```
Sign `<timestamp>.<body>` and send `x-mobiliza-timestamp` (see 13-NOV-6-UPDATE.md). Responses: 200 ok, 409 duplicate, 401 bad signature or stale timestamp, 400 bad body, 503 secret not set. Suggested kinds: `delivery.status`, `prayer.signed_in`, `broadcast.reply`, `mobilization.reply`, `call.result`.
Next step: a small processor that turns `inbound_events` into record updates (e.g. mark a prayer watch signed in).

## AI
Ask AI answers built-in questions from data instantly; anything else in live mode goes to the Lovable AI service, grounded only on that church's records. It never sends messages by itself — actions still need confirmation.

## Still needed to be fully live
- `MOBILIZA_WEBHOOK_SECRET` set in Cloud secrets and the same value in n8n.
- WhatsApp Business / SMS / calling provider accounts behind n8n.
- Processor for `inbound_events`; invite emails; Google Maps key on the published domain.

## Attendance lists (new)
Collection `attendanceSheets` in `records`: `{ title, date, serviceId?, format, entries:[{id,name,phone?,mark:"present"|"absent"|"unmarked"}] }`. Names are pasted/imported, marked present/absent, and the report is rendered from the church's own format template (`src/lib/attendance.ts`). Copy and "Send to WhatsApp" (wa.me share link) happen in the browser; no server send. Absent names can feed follow-up later.
