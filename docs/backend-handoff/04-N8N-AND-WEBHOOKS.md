# n8n and webhook implementation contract

## Current code, not assumptions
src/config/action-map.ts registers 17 actions; event-catalog.ts validates 17 event payloads (incl. service.broadcast — see 09-BROADCASTS-SMS-WHATSAPP.md). Current eventEnvelope source is "mobilizer". Both files are included under contracts/. Keep this identifier stable despite display branding.
Dispatcher uses retries:0. Tests, logs and deliveries are simulated. No inbound n8n/Voicebip routes exist; no importable n8n workflow JSON is delivered. The prior contract's backoff sequence is an intended design, not current behavior.

## Outbound wire format
POST to a stored, tenant-authorized HTTPS endpoint. Serialize once and sign those exact UTF-8 bytes with HMAC-SHA256. Headers: Content-Type: application/json; X-Mobilizer-Event; X-Mobilizer-Event-Id; X-Mobilizer-Signature: sha256=<hex>. Envelope: event, event_id, timestamp, tenant_id, source:"mobilizer", actor:{role,name}, data. Derive actor/tenant from server authorization; role/name are display metadata, not credentials. See event-examples.json for every concrete payload.

n8n should acknowledge 2xx {"accepted":true,"execution_id":"<actual execution ID>"} only after durable acceptance; this is not completed work. Save execution correlation, deduplicate tenant/integration/event_id, then update final status via signed callback. Do not regenerate event_id on retry. Persist outbox/attempts. Implement capped durable backoff after explicit rejection or known-safe retry (suggested 1s/5s/30s only after receiver idempotency is proven); honor Retry-After. Unknown outcomes require execution-state inspection.

## Incoming handler sequence
Proposed routes /api/public/webhooks/n8n and /api/public/webhooks/voicebip do not exist yet.
1. Enforce POST, JSON and body size bound; obtain integration binding from a server-known endpoint identifier.
2. Read raw bytes; verify authentic signature before JSON parsing/mutation. Use the actual provider-documented signing scheme for Voicebip — the draft header name is NOT proof of a provider contract.
3. Validate envelope and event data; signed timestamp within defined replay window; tenant and integration must match binding and be enabled. Reject unknown events, IDs and cross-tenant references.
4. Atomically store a unique receipt and apply an allowed state transition with audit. Duplicate receipts return success without applying or contacting twice.
5. Return safe 400/401/403/409/413/429 errors as appropriate; avoid private details. Use privileged writes only after verified external authentication, never trusting actor.role.

## Workflow recipes for implementer
| Workflow slot | Trigger → operations → callback |
|---|---|
| General/member events | member.created/updated → fetch authorized record → sync consented data → acknowledge/log |
| Mobilization | mobilization.started → fetch service/workflow/eligible members → schedule relative contact window in tenant timezone → consent/channel gates → contact → attendance callback |
| Attendance responses | confirmed/declined → idempotently update one member/service record → optional transport request with explicit member choice |
| Bus registration | vehicle.registered → fetch bus → validate driver assignment → fleet onboarding; do not assign fictitious GPS |
| Transport | requested → leader review/admin approval → assign capacity-safe vehicle → departure/arrival callbacks; separate financial support workflow |
| Follow-up | followup.created → consent gate → assign leader/location → schedule contact → record outcome → sensitive issue human escalation |
| Reports | submitted/overdue → validate template/version and deadline → review/remind → department/cell roll-up |
| Leadership | escalation.created/resolved → notify authorized owner → track acknowledgement → resolution audit |

For each workflow store exact production webhook URL, allowed events, auth binding and test execution. Do not put provider credentials in incoming envelope or response. n8n reads/writes private records only through narrow signed server endpoints, not a browser role claim or universal service key.

## Contract gaps to close before enabling
Calls/transcripts/message delivery, GPS positions, workflow jobs and report approval need explicit versioned schemas/actions. Existing followup.completed represents a follow-up outcome and does not fully define a voice-provider callback. Use a provider adapter to translate verified callbacks to domain events. Add a contract version through a coordinated sender/receiver change; never silently break the 16 existing shapes.
