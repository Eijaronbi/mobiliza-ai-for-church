# Mobilizer ↔ n8n contracts

## Outgoing (Mobilizer → n8n)
Every UI action resolves through `src/config/action-map.ts` → event → active outgoing endpoints (Integration Hub) → adapter → transport.

```
POST {endpoint.url}
Content-Type: application/json
X-Mobilizer-Event: <event>
X-Mobilizer-Event-Id: <event_id>
X-Mobilizer-Signature: sha256=<hex HMAC-SHA256(secret, rawBody)>
```

Body (envelope):
```json
{ "event": "attendance.confirmed", "event_id": "evt_…", "timestamp": "ISO-8601", "tenant_id": "…",
  "source": "mobilizer", "actor": { "role": "church_admin", "name": "…" },
  "data": { "member_id": "…", "service_id": "…", "attendance_status": "confirmed" } }
```
Expected response: `2xx { "accepted": true, "execution_id": "…" }`. Non-2xx is retried with backoff (1s, 5s, 30s) and logged.

Payload schemas: `src/config/event-catalog.ts` (zod). Payloads carry IDs only — fetch details server-side.

| Action | Event | Default n8n webhook |
|---|---|---|
| Start mobilization | mobilization.started | mobilization/start-mobilization |
| Attendance response | attendance.confirmed / attendance.declined | mobilization/receive-attendance-response |
| New transport request | transport.requested | transport/new-transport-request |
| Register bus | vehicle.registered | transport/register-bus |
| Approve transport | transport.approved | transport/approve-transport-assistance |
| Departure / arrival | transport.departed / transport.arrived | transport/record-departure, record-arrival |
| New first timer | followup.created | followup/new-first-timer |
| Call outcome | followup.completed | followup/record-call-outcome |
| Report submitted / reminder | report.submitted / report.overdue | reporting/… |
| Escalation created / resolved | escalation.created / escalation.resolved | leadership/… |
| Member created / updated | member.created / member.updated | general/member-events |

## Incoming (n8n / Voicebip → Mobilizer)
To implement: `src/routes/api/public/webhooks/n8n.ts` and `…/voicebip.ts`.
1. Read raw body, verify `X-Mobilizer-Signature` / `X-Voicebip-Signature` with timing-safe compare.
2. Validate the envelope and `data` with the same zod schema.
3. Confirm `tenant_id` exists and the endpoint is active for that tenant.
4. Apply the change through the repository layer; write an audit log row.

## Going live
1. Enable Lovable Cloud; implement `src/services/data/cloud/cloud-repository.ts` with `docs/database-schema.sql`.
2. Add secrets named in the Integration Hub (e.g. `N8N_WEBHOOK_SECRET`, `VOICEBIP_API_KEY`).
3. Implement `serverTransport` with a `createServerFn` that resolves `{{secret:NAME}}` / `{{hmac_sha256:NAME}}` placeholders and sends.
4. Set `VITE_DATA_SOURCE=cloud` and `VITE_TRANSPORT=server`.
