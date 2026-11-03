# Mobilizer — Build Roadmap (Plug-and-Play Prototype)

Goal: a full interactive prototype for all 20 parts of the brief. It runs on demo data today. Later it can connect to Lovable Cloud (the database), n8n, Voicebip and custom APIs by changing settings and swapping one adapter, with no UI rewrite.

## Guiding principle

```text
UI (routes/components)
   -> hooks (TanStack Query)
      -> repositories (data access interface)  -> MockRepo today | CloudRepo later
      -> eventBus.emit(event)                   -> dispatcher
            -> ActionRegistry (action -> workflow binding)
                  -> adapters: n8n | voicebip | custom | webhook
                        -> transport: SimulatedTransport today | ServerFnTransport later
```

Components never see URLs, keys or providers. They call hooks and emit typed events. Everything else is decided by configuration.

## Phase 0 — Foundations
- Design tokens in styles.css: midnight navy, white, neutral grey, violet/indigo accent, refined blue, plus success (green), warning (amber), danger (red) and chart tokens, in both light and dark mode. Fonts: Plus Jakarta Sans for headings, Inter for body, loaded with a link tag in __root.
- Motion: CSS and tw-animate only (no heavy animation library). Includes count-up metrics, skeletons, card entrance effects and status pulses. All of it respects prefers-reduced-motion.
- App shell: collapsible shadcn sidebar with 13 sections. Top bar has global search (cmdk), quick actions, notifications, help, profile, tenant selector and demo role switcher. On mobile: a drawer plus a bottom nav for 5 key sections.
- Sonner toaster. Every simulated action shows a toast with a "Simulated" badge.

## Phase 1 — Core layers (the plug-and-play spine)
Built before any feature pages.

```text
src/
  types/            domain.ts, events.ts, integrations.ts, agents.ts, api.ts
  config/           integrations.config.ts, action-map.ts, event-catalog.ts, roles.ts, nav.ts
  services/
    api/            client.ts (single request fn, retries, timeout, error shape)
                    transport.ts (Transport interface; Simulated + ServerFn impl stub)
    data/           repository.ts (generic Repo<T> interface)
                    mock/ (seed data + in-memory repos, tenant-scoped)
                    cloud/ (empty CloudRepo stubs with same signatures, TODOs)
                    index.ts (getRepos(): picks mock or cloud from config flag)
    events/         envelope.ts (buildEvent), bus.ts, dispatcher.ts, delivery-log.ts
    integrations/
      registry.ts   (adapter registry keyed by integration id)
      n8n/          adapter.ts, workflows.ts (default webhook slots)
      voicebip/     adapter.ts, event-mapping.ts
      custom/       adapter.ts (base URL + path + auth + response mapping)
      webhooks/     outgoing.ts, incoming.contract.ts (signature + zod schema spec)
  modules/<feature>/  components, hooks, logic per feature
  hooks/            useTenant, useRole, usePermission, useDemoMode
  routes/           thin TanStack route files that render module components
```

Key contracts:
- **Event envelope**: `{ event, event_id, timestamp, tenant_id, source:"mobilizer", actor, data }`. Payloads are typed per event, use minimal PII (IDs, not phone numbers), and are validated with zod.
- **Event catalogue**: all 15 events from the brief (member.created ... escalation.resolved), each with a zod schema and a sample payload.
- **ActionRegistry**: maps a UI action to an event and its bound workflow. Examples: `startMobilization -> mobilization.started -> n8n:mobilization.start`, plus transport, followup, report and escalation. Bindings are editable in the Integration Hub.
- **IntegrationConfig**: `{ id, kind, status, baseUrl, auth:{type, secretRef}, headers, endpoints[], enabled, lastSuccessAt }`. Secrets are only ever a `secretRef` name, never a value. The UI shows a masked placeholder.
- **WebhookEndpoint**: name, description, url, method (default POST), authType, headers, payloadTemplate, active, direction (in/out).
- **DeliveryLog**: integration, event, endpoint, timestamp, request/response status, duration, error, retry count. Secrets are redacted.
- **Transport**: `send(request) -> Response`. SimulatedTransport returns realistic fake latency and outcomes and writes logs. ServerFnTransport (stub) will call a createServerFn that holds the real secrets.
- Status values: not_connected, config_required, connected, error, disabled. Seed data never marks anything "connected".

## Phase 2 — Demo data and tenancy
- 2 fictional churches (tenants). The pilot church has about 120 members, branches, departments, cells and zones, 6 services, transport requests, drivers and vehicles, first timers, reports, escalations, agent runs and integration logs. Records cross-reference each other consistently.
- Roles: Super Admin, Church Admin, Pastor, Department Leader, Cell Leader, Member. A permission matrix in config/roles.ts drives nav visibility and action buttons.
- A global "Demo mode" banner and a "Simulated" chip on simulated data such as GPS and AI calls.

## Phase 3 — Public landing (/)
- Hero carousel with 5 slides (the brief's copy), Ken Burns effect, arrows and dots, autoplay, lazy loading. Photos are generated church imagery: worship, fellowship, prayer, outreach, volunteers.
- Short sections: what it does, the agents, integrations, and a CTA "Enter demo", which leads to role select and then /app.

## Phase 4 — Feature modules (routes under /app)
Each module gets list, detail, create/edit forms (zod plus react-hook-form), filters, and emits events.
1. **Command Centre**: compact photo welcome banner, 8 metric cards, next-service panel with mobilization progress, Attention Required queue, activity feed, 4 recharts charts.
2. **Members**: directory with search and filters, CSV import/export (papaparse), profile with 7 tabs.
3. **Church Structure**: dynamic unit types and a tree/org-chart view. Assign leaders and members, support multiple memberships, move between groups.
4. **Mobilization**: configurable stage pipeline (6 stages), contact windows, funnel stats, control buttons that trigger ActionRegistry.
5. **Attendance**: confirmed vs actual, manual marking, history, absences, weekly/monthly analytics.
6. **Transportation**: 8-step request workflow, approval, map-style SVG board labelled as demo GPS, pickup/vehicle/driver cards, passenger lists, journey timeline, depart/arrive controls. A MapProvider interface is ready for a real maps service.
7. **First Timers & Follow-up**: capture form with consent, 9-step workflow, status buckets, communication history, escalate to a human.
8. **Evangelism & Reports**: template builder (configurable fields), deadlines, reminders, review/approve, overdue tracking, aggregates.
9. **AI Agents**: 6 agents, each with instructions, workflow bindings, tool permissions, webhook/API config and execution history.
10. **Leadership & Escalations**: escalation board, assign, resolve, accountability view.
11. **Services & Events**: CRUD with configurable times, location, leaders, workflow and contact schedule.
12. **Integration Hub**: see Phase 5.
13. **Settings**: 12 sections from the brief, including the audit log view.
- **AI Command Centre**: chat panel available everywhere (and as a page). A rule-based intent matcher answers from demo data. Responses are typed as info, recommendation or action-requiring-confirmation. Confirmed actions go through ActionRegistry. An `AgentRuntime` interface lets an AI Gateway runtime replace it later.

## Phase 5 — Integration Hub
- Dashboard with 9 cards (n8n, Voicebip, Cloud database, WhatsApp, SMS, AI providers, Maps/GPS, Email, Custom APIs). Each shows status, last success, and Configure / Test / Logs buttons.
- n8n page: instance URL, auth type, API key reference, connection test, and default webhook. Webhook slots are grouped by the 5 workflows (mobilization, transport, follow-up, reporting, leadership), each with full endpoint fields and a Test button.
- Webhook manager: incoming and outgoing endpoints, event catalogue browser with sample JSON, event inspector, retry failed, enable/disable.
- Voicebip page: environment, number, voice agent, call/SMS/WhatsApp settings (with a note that WhatsApp calling is a separate feature), languages, callback URL, event-mapping table.
- Custom API builder: base URL, path, method, auth (bearer, API key, basic, custom headers), body, response mapping, timeout, test runner.
- Central logs: filters by integration, event and status; secrets redacted.
- A "Pending backend" badge on real execution, wording that never claims a live connection, and a Developer tab with copyable event contracts and the action-to-workflow map (the n8n hand-off doc).

## Phase 6 — Backend-ready seams (built, not wired)
- `services/data/cloud/*` stubs plus a `docs/supabase-schema.sql` draft: tenants, tenant-scoped tables, user_roles table, RLS notes.
- `docs/n8n-contracts.md`: every event, its payload, its expected response, and signature header `X-Mobilizer-Signature` (HMAC-SHA256).
- Server route skeletons documented (not active): `/api/public/webhooks/n8n` and `/api/public/webhooks/voicebip` (verify signature, validate with zod, check tenant), plus an outgoing dispatcher server function with retry/backoff.
- A single switch to go live: `DATA_SOURCE=mock|cloud` and `TRANSPORT=simulated|server`.

## Phase 7 — QA
- Check every nav link and button, every form's validation, mobile layouts at 390px, and reduced-motion behaviour.
- Unit tests: event envelope builder, ActionRegistry resolution, role permissions, redaction of secrets in logs.
- Per-route head() metadata. Update AGENTS.md with the architecture rules.

## Technical notes
- Stack: TanStack Start file routes. The brief's `pages/` folder maps to `routes/` (thin) plus `modules/` (logic). Layout route `/app` renders the shell and an Outlet.
- Libraries: shadcn/ui, recharts, cmdk, react-hook-form, zod, papaparse, embla-carousel.
- State: TanStack Query over repositories. Mock repos persist demo edits in memory/sessionStorage (never secrets).
- Lovable Cloud, n8n and Voicebip are not connected in this build, as the brief requests.

## Build order for the agent
Phase 0, then 1, then 2 (spine and data first), then 3, then the Phase 4 modules in order 1-13, then 5, 6 and 7. Track progress in roadmap.md.
