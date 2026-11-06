# Update — 6 November 2026

## 1. Churches bring their own AI key (done)
- AI Agents page → **AI provider** card. Church admin or pastor picks OpenAI, Anthropic (Claude), Google Gemini, OpenRouter or Groq, pastes a key and picks a model.
- Stored in `public.tenant_ai_settings` (migration `0004_tenant_ai_settings.sql`). The key is encrypted server-side (`src/lib/ai-key-crypto.server.ts`) and never returned to the browser; only a masked hint is shown.
- Ask AI (`src/lib/ai.functions.ts`) uses the church key when present (`src/lib/ai-call.server.ts`), otherwise the built-in Lovable AI model. Provider list: `src/lib/ai-providers.ts`.
- Self-hosted: keep an encryption secret on the server, decrypt only inside the request that calls the provider.

## 2. Report approval locked in the database (done)
Migration `0005_lock_reports_and_inbound_replay.sql` adds trigger `guard_report_records` on `public.records` for `collection = 'reports'`:
- Only `church_admin`, `pastor` or `super_admin` may set `status = 'approved'`.
- Once a report is `submitted` or `approved`, only those roles may change it.
- Leaders can still create and edit their own drafts and submit them.
Self-hosted: enforce the same rule in the API before writing a report.

## 3. Incoming webhook replay protection (done) — n8n senders must update
`POST /api/public/hooks/:source` now requires:
```
x-mobiliza-timestamp: <unix seconds, within 5 minutes of now>
x-mobiliza-signature: hex HMAC-SHA256(MOBILIZA_WEBHOOK_SECRET, "<timestamp>.<raw body>")
```
Each signature is stored in `inbound_events.signature` (unique), so a resent message returns **409 Duplicate delivery**. Other responses: 200 ok, 400 bad body, 401 stale timestamp or bad signature, 413 too large, 503 secret not set.

n8n Code node example:
```js
const crypto = require('crypto');
const ts = Math.floor(Date.now() / 1000);
const body = JSON.stringify({ tenant_id: $json.tenant_id, kind: 'prayer.signed_in', payload: $json.payload });
const sig = crypto.createHmac('sha256', $env.MOBILIZA_WEBHOOK_SECRET).update(`${ts}.${body}`).digest('hex');
return [{ json: { body, ts, sig } }];
```
Send `body` as the raw request body with both headers.

## 4. Email
- Saints Community (Kuje Cell) sends invites, prayer points and email broadcasts through the project's linked Gmail (`src/lib/gmail.functions.ts`). The linked mailbox must be the one the owner wants; check it in Connectors.
- Other churches: email stays simulated. Per-church sending needs a sender domain the owner controls (Cloud email domain) or each church's own SMTP/Gmail OAuth app — this requires credentials Mobiliza does not have.

## 5. Still open
| Item | Blocker |
|---|---|
| Outside AI assistants (MCP with church sign-in) | Not built yet; needs OAuth sign-in + MCP tools scoped by `user_roles` |
| Per-church email | Owner email domain |
| WhatsApp / SMS / phone & WhatsApp calls | Provider accounts connected in n8n |
| Processing `inbound_events` into records (prayer sign-ins, replies) | Provider payload formats |
| Live bus GPS | Driver device feed |
