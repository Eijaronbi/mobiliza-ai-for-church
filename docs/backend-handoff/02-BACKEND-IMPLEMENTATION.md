# Backend implementation roadmap

## 1. Establish authenticated storage
- Enable Lovable Cloud before writing backend functionality; use its generated clients and types.
- Implement sign in, sign out, invitations, reset-password flow and server-validated sessions. Confirm actual hosted signup/redirect settings; they cannot be inferred from source.
- Replace client-selectable actor/role/tenant authority in src/hooks/use-app.tsx with authenticated memberships. Keep demo role switching out of production.
- Store roles in a separate user_roles table. Validate tenant membership and role on every write, action and tool, not just navigation.
- Define least-privilege role operations using src/config/roles.ts as a product starting point; validate group/leader scope with the owner. Do not treat this prototype as a complete security policy.

## 2. Implement repositories
Complete src/services/data/cloud/cloud-repository.ts for list/get/create/update/remove. Preserve Repository<T> and camelCase DTOs. Map all collections in 03-DATABASE-MAPPING.md. Replace mock tenant export in src/services/data/index.ts. Use generated browser client under RLS for normal operations; authenticated server work uses the authenticated context client.

Tenant IDs on incoming objects are not trusted. Derive actor from verified identity, check membership, prevent tenant changes during updates and verify every referenced ID belongs to the same tenant. Use server-generated identifiers and timestamps; map temporary demo identifiers rather than importing them blindly.

Add loading, empty, read-error, mutation-error and pending states. Current useListData returns [] when data is missing and several pages return null. Never show an unavailable dataset as zero members or a successful save. Settings profile/toggles currently only toast: add durable tenant settings and save/read-back behavior.

## 3. Make writes and events durable
A write followed by browser dispatch can lose an event. Add a transactional outbox so each consequential mutation and its event commit together. Move action authorization and catalog validation server-side; bind tenant and actor from the session. Persist event IDs, action IDs, endpoint IDs and attempt history. Use idempotency keys and a durable job consumer; do not rely on setTimeout or in-memory listeners after the request returns.

Enumerate and reconcile actions not yet registered: CSV import, service/unit edits, report approval, scheduling/driver assignment, financial disbursement, follow-up calls/notes/escalation and settings. Existing action map is a starting contract, not complete coverage. A follow-up escalation currently sends the follow-up ID rather than the newly created escalation ID; fix before integration. Financial-support arrival must not require a fictional vehicle ID. Decide distinct status/event semantics and test them.

## 4. Secure outbound integration delivery
Keep UI → hooks → repositories/actions → dispatcher/adapters → src/services/api/client.ts. Integration Hub currently calls transport/dispatcher directly: move its test/retry/API methods into hooks to enforce the architecture boundary.

Complete src/services/api/transport.ts serverTransport through authenticated createServerFn wrappers in client-safe *.functions.ts modules. Load server-only helpers inside handlers. Browser supplies configuration IDs and validated action data, not arbitrary URLs or credentials. Server fetches allowed tenant-owned endpoints, enforces enabled state, HTTPS and hostname allowlist; reject loopback/private/link-local/metadata destinations and redirects outside allowlist. Resolve allowlisted tenant-specific secret references server-side. Redact credentials and minimize PII in logs.

Sign exact serialized request bytes; use Web Crypto/fetch and cancellation with AbortController. The current timeout Promise.race does not cancel delivery, and dispatcher uses zero automatic retries. Replace with durable retry scheduling and receiver deduplication. Retry ambiguous outcomes only after reconciling receiver state; never replay calls/payment-like actions blindly.

## 5. Build external callbacks and jobs
Use TanStack raw HTTP server routes under src/routes/api/public/ for n8n, provider webhooks and scheduler callbacks. This prefix bypasses site auth: handler verifies signatures/credentials itself before private reads or writes. Validate raw body, event schema, signed timestamp/replay policy, active tenant-specific integration and idempotency; commit change and receipt atomically. See 04-N8N-AND-WEBHOOKS.md.

Internal operations use createServerFn, NOT Supabase Edge Functions. Protected functions use requireSupabaseAuth and bearer functionMiddleware in src/start.ts; preserve its existing request middleware. Protected loaders belong under _authenticated; never call protected loaders from public SSR. A route guard is not endpoint authorization. Use an admin client only for narrow privileged callbacks after verifying caller, loaded dynamically inside handler; never for ordinary reads or to determine user roles.

## 6. AI, tracking and communications
Implement 05-AI-IMPLEMENTATION.md. Replace simulated coordinate conversion and interval movement with real lat/lng/timestamp/accuracy feeds, authorized drivers and tenant-scoped subscriptions. Registering a bus without GPS creates no map marker. Support stop-sharing, denied permissions, stale/offline locations, retention and driver consent. Device geolocation alone is not fleet tracking and browser tracking may stop in background.

## 7. Service broadcasts and Prayer Chain
- Implement 09-BROADCASTS-SMS-WHATSAPP.md and 10-PRAYER-CHAIN.md after identities, consent, outbox and callbacks exist. Prayer Chain currently bypasses repositories for page-local state: add repository DTOs/hooks for settings, assignments, occurrences, sign-ins and call attempts before enabling live mode.
- Persist every watch occurrence with an absolute start/end and church timezone, not just a repeating slot ID. Recheck assignment, sign-in and contact consent when each durable job runs.
- Verify inbound WhatsApp signatures and identify the member from the trusted sender and tenant integration binding. Do not accept browser-generated signed-in events as proof of a received WhatsApp message.
- Start with phone calling, use WhatsApp calling only after a verified failure/no-answer and confirmed capability, and suppress queued attempts immediately on sign-in. Never infer a failed call from a timeout alone.
- Resolve recipients and per-channel consent server-side for both broadcast types. Persist provider delivery outcomes and expose honest pending/unsupported/error states.

## Acceptance gates
For every persisted entity: create, reload, read back, edit, reload, read back; access from another tenant must fail. For every consequential action: authorized success, forbidden role, forged tenant, duplicate request, delivery failure, retry and audit read-back. Verify all provider flows with controlled real accounts in staging before enabling production.
