# Database mapping and migration requirements

The included database-schema.DRAFT.sql is the existing incomplete draft, NOT a deployable migration. UUID database IDs conflict with demo IDs such as t_grace_m001. Choose UUID generation for live records and a deliberate import mapping; preserve opaque string DTO IDs in UI.

| Collection in services/data/index.ts | Proposed table(s) | Required mapping/gaps |
|---|---|---|
| tenants (currently separate mock export) | tenants | Add pastor; authenticated memberships/profile reads |
| members | members + member_groups | camelCase departmentId/groupIds/leaderId/contactPreference/joinedAt; consent provenance |
| units | org_units | parent hierarchy and leader; same-tenant FKs, cycle prevention |
| services | services + service_leaders | date ↔ starts_at; leaders, workflow and contactSchedule |
| workflows | mobilization_workflows | Missing draft table; stages JSON with validated schema, contactWindow |
| mobilization | mobilization_records | response/attended/channel/updatedAt; one member/service row |
| transport | transport_requests + transport_history | status transitions, amount, pickupPointId, vehicleId; optional pickup for financial support |
| pickupPoints | pickup_points | Missing; real lat/lng required, not demo x/y |
| vehicles | vehicles + driver_assignments + vehicle_positions | Missing fleet table; plate uniqueness per tenant, positive capacity; no fabricated GPS |
| followups | followups + communications | Draft lacks location, referrer, encounteredAt, channel and DTO log projection |
| templates | report_templates | Missing; validate fields, deadline and reminder |
| reports | reports | Add period, submittedBy/actor identity, values schema and approvals |
| escalations | escalations | owner identity, resolution record; same-tenant subject refs |
| activities | audit_activities | Missing; server append-only, actor identity |
| agents | agents + agent_tools | Missing; instruction/status/tool/workflow assignments |
| executions | agent_executions | Missing; change simulated:true type to boolean for live records; request/tool IDs, outcome/usage |
| integrations | integrations | enabled/name/description/lastSuccessAt; auth DTO ↔ auth_type/secret_ref |
| endpoints | webhook_endpoints | description/payloadTemplate/auth DTO; allowed events/tenant ownership |
| customApis | custom_api_configs | Missing; validated response mapping, timeout, enabled, allowed destination |
| logs | delivery_logs + delivery_attempts | camelCase requestStatus/etc; append-only, redacted payload, true simulated flag |

Additional live-only tables: user_roles, tenant_settings, consent_records, event_outbox, webhook_receipts, integration_secret_bindings (names only), assistant_threads/messages, durable_jobs, file metadata if uploads are needed.

## Requirements for each migration
- CREATE TABLE public.<table>, immediately GRANT only permitted authenticated operations and service_role privileges, ENABLE ROW LEVEL SECURITY, then CREATE POLICY in the same migration. No anonymous access to private church records.
- Roles are separate from profile; ordinary users can read their authorized membership but cannot assign themselves roles. Server-authorized role management only. Non-recursive role helper with fixed search_path and restricted inputs/permissions.
- Explicit read/write policies for each role and leadership/member scope. USING for reads/deletes and WITH CHECK for inserts/updates; prevent tenant_id changes. RLS is enforced alongside grants.
- Foreign keys/unique constraints must include tenant boundaries (e.g. tenant_id,id composite identity), not just independent UUIDs. Index tenant_id and common filters: service/member, status, due_at, position recorded_at, event_id.
- Checks/enums for valid status, positive capacity, monetary amounts, lat/lng ranges and transitions. Normalize plate for per-tenant uniqueness. Use decimal/numeric for currency and record approval/disbursement audit.
- Atomic update + outbox + audit; dedup uniqueness per tenant/integration/event_id; position retention and latest-position lookup; report values against template version.
- Versioned migrations with forward/rollback instructions and staging verification. Do not seed private real contacts or connected integration statuses. Demo staging seeds, if desired, must use literal INSERTs in migrations, never page-load seeding.
- Export, deletion, retention and consent provenance before live personal/location data.

## Tests
Two tenant fixtures: all read/write verbs, joins, callbacks, report aggregates, AI tools and GPS subscriptions reject cross-tenant references. Test each allowed role and forbidden action, unique plates, duplicate attendance, hierarchy cycle, invalid coordinates and forged ownership. Verify normal reads do not use privileged service clients.
