# 12 — Running Mobiliza on your own backend (without Lovable Cloud)

Everything below matches what works today. The app talks to its backend in only four places, so swapping is contained.

| Seam | File | What it needs |
|---|---|---|
| Auth + data client | `src/integrations/supabase/client.ts`, `src/services/data/cloud/cloud-repository.ts`, `src/hooks/use-app.tsx` | Postgres with Supabase-compatible auth + REST, **or** your own API |
| Outbound webhooks | `src/lib/delivery.functions.ts` (`deliverWebhook`) | `MOBILIZA_WEBHOOK_SECRET` |
| Inbound callbacks | `src/routes/api/public/hooks/$source.ts` | same secret, service-role DB access |
| AI assistant | `src/lib/ai.functions.ts` | an LLM key (or keep `LOVABLE_API_KEY`) |

## Option A — Your own Supabase (fastest, zero code change)
1. Create a project at supabase.com (or self-host with `supabase/docker`).
2. In its SQL editor run, in order: `drizzle/migrations/0000_migration.sql`, `0001_migration.sql`, `0002_migration.sql`. This creates `tenants, profiles, user_roles, tenant_invites, records, inbound_events`, the RLS policies and functions `create_church`, `accept_invites`, `is_tenant_member`, `has_tenant_role`, and the sign-up profile trigger.
3. Auth → Providers: enable Email (confirmation on) and Google. Set Site URL + redirect URLs to your domain (`/`, `/reset-password`).
4. Set env vars on your host:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<anon/publishable key>
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_PUBLISHABLE_KEY=<anon key>
   SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server only
   MOBILIZA_WEBHOOK_SECRET=<long random string>    # shared with n8n
   LOVABLE_API_KEY=<optional, for AI>              # or swap provider, see below
   ```
5. Google sign-in: replace `lovable.auth.signInWithOAuth("google", …)` in `src/routes/auth.tsx` with `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })`, and remove the "Sign in with Lovable" button.
6. Deploy: `bun install && bun run build`. The output is a Cloudflare Worker (`wrangler deploy`); Node hosts work with the TanStack Start node preset.

## Option B — Your own API (Node/Laravel/Django/etc.) + Postgres
Keep the UI; replace only the data layer.
1. **Schema:** reuse the SQL in the migrations (drop the `auth.users` references and RLS if your API enforces access itself). Minimum tables: `tenants`, `users`, `user_roles(user_id, tenant_id, role)`, `records(tenant_id, collection, id, data jsonb, created_at, updated_at)`, `inbound_events`.
2. **Endpoints your API must expose** (all require a bearer token and must check the caller belongs to `tenantId`):
   ```
   POST /auth/signup | /auth/login | /auth/logout | /auth/reset
   GET  /me/churches                         -> [{id,name,city,timezone,pastor,role}]
   POST /churches                            -> create + make caller church_admin + insert starter records
   GET  /t/:tenantId/:collection             -> list data[]
   GET  /t/:tenantId/:collection/:id
   POST /t/:tenantId/:collection             -> create (role != member)
   PATCH /t/:tenantId/:collection/:id        -> shallow-merge data (role != member)
   DELETE /t/:tenantId/:collection/:id       -> church_admin | pastor | super_admin
   POST /t/:tenantId/invites                 -> {email, role}
   POST /t/:tenantId/deliver                 -> server-side webhook send (rules below)
   POST /hooks/:source                       -> inbound, HMAC verified
   ```
   Collections: `members, units, services, workflows, mobilization, transport, pickupPoints, vehicles, followups, templates, reports, escalations, activities, agents, executions, integrations, endpoints, customApis, logs, attendanceSheets` (shapes in `src/types/index.ts`).
3. **Frontend changes:** rewrite `cloud-repository.ts` to `fetch` these endpoints (same `list/get/create/update/remove` signature), and in `use-app.tsx` replace `supabase.auth.*` / `fetchChurches` with your auth calls. No page or component changes are needed.
4. **Webhook rules to keep:** only send to URLs saved in that church's endpoints/integrations; header `x-mobiliza-signature` = hex HMAC-SHA256(raw body, `MOBILIZA_WEBHOOK_SECRET`); log each attempt to `logs`. Inbound: reject when signature mismatches; store the event before processing.

## AI without Lovable
`src/lib/ai.functions.ts` builds a church summary then calls the model. Replace the gateway call with any chat-completions API (OpenAI, Anthropic, Gemini) using a server-only key. Keep the tenant check before building context.

## Messaging (SMS / WhatsApp / calls)
Unchanged: n8n receives signed events (`04-N8N-AND-WEBHOOKS.md`) and talks to Termii/Twilio/WhatsApp Cloud API/Voicebip with its own credentials. Callbacks come back to `/hooks/:source`.

## Check before go-live
- Two test churches cannot see each other's records.
- A `member` cannot create/edit; only admin/pastor can delete.
- A webhook with a wrong signature returns 401.
- Password reset email lands on `/reset-password`.
