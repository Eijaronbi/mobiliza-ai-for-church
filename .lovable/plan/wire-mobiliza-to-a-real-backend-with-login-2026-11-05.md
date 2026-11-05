# Wire Mobiliza to a real backend with login

Goal: real churches can sign up, create their own church space, and use every page with saved data. The demo you built stays available for hackathon judges.

## What users will experience

- **Landing page:** "Try the demo" (no login, current fictional data) and "Sign up / Sign in".
- **Sign-in page (/auth):** email and password, Google, and Sign in with Lovable. Forgot-password and reset-password pages included. Styled to match Mobiliza.
- **First sign-in:** a short "Set up your church" step (church name, country, timezone). The person who creates it becomes that church's admin.
- **Invite team:** admins invite pastors, leaders and workers by email from Settings and pick a role for each.
- **Inside the app:** all pages (members, structure, services, broadcasts, prayer chain, attendance, transport, follow-up, reports, agents, integrations, settings) save to the backend. Each church only ever sees its own data.
- **Top bar:** shows the signed-in person, their church, and a Sign out option. A "Demo" badge shows when in demo mode.

## Roles

Admin (everything, incl. integrations and team), Pastor, Leader (their units), Worker (assigned tasks), Viewer. Stored in a separate secure roles table, checked on the server.

## Phases

1. **Turn on Lovable Cloud** and email + Google + Lovable sign-in.
2. **Database:** create tables from the existing draft schema (churches, memberships, roles, members, units, services, broadcasts, prayer watches and sign-ins, mobilization, attendance, vehicles, pickup points, follow-ups, templates, reports, escalations, activities, agents, executions, integrations, endpoints, logs). Every table locked to the user's church with security rules.
3. **Auth pages and guard:** /auth, /reset-password, church onboarding; signed-in area protected.
4. **Two modes side by side:** /demo keeps today's in-memory demo; /app uses the real backend. Same screens, different data source chosen per session.
5. **Real data layer:** implement the cloud data layer behind the existing repository contract so no screen code changes. Data loads with caching and refreshes after saves.
6. **Actions and events:** every action (broadcast, prayer reminders, register bus, follow-ups) is saved to an event log/outbox on the server, then sent to n8n via configured webhooks. Secrets stay on the server.
7. **Ask AI:** answers use the church's real data through the built-in AI service, with confirm-before-action kept.
8. **Inbound callbacks:** a secured endpoint for n8n/WhatsApp to report delivery status, prayer sign-ins ("I'm praying"), and replies like YES / NEED RIDE.
9. **Verify:** sign up a new test church, add members, create a service, broadcast, run prayer check, confirm another church can't see the data; demo still works signed out.
10. **Update the backend handoff** pack to reflect what is now live vs. still needs external services.

## Still needs you after this

- WhatsApp Business, SMS and phone-call provider accounts (connected in Integrations / n8n).
- Your n8n webhook URLs.
- Google Maps key for live maps on the published site.

## Technical details

- Cloud enable registers bearer middleware in `src/start.ts`; protected routes move under `src/routes/_authenticated/` (managed gate, `ssr:false`). Current `app.*` routes become `_authenticated/app.*`; a `demo` route tree reuses the same page components with a mock data provider via React context instead of the global `appConfig.dataSource` switch.
- Tables: `tenants`, `tenant_members (user_id, tenant_id)`, `user_roles (user_id, tenant_id, role app_role)`, `profiles`; helper SQL functions `is_tenant_member(tenant_id)` and `has_tenant_role(tenant_id, role)` (security definer) used in RLS. Each migration includes GRANTs before RLS. Collections stored in snake_case tables with `tenant_id`; domain mapping in `services/data/cloud`.
- `cloudRepo` implemented with the browser client (RLS as user); privileged sends via `createServerFn` + `requireSupabaseAuth`; outbox table + server transport replaces simulated transport when `transport: "server"`.
- Inbound webhook: `src/routes/api/public/hooks.$source.ts` with HMAC shared-secret verification, then admin client writes.
- AI: `@lovable.dev/ai-gateway` in a server function, grounded on tenant queries.
- Tests: RLS isolation rule, role permission rule, webhook signature rejection.
