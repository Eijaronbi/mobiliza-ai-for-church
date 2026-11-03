# Real AI implementation

## Present state
Ask AI in src/routes/app.assistant.tsx is a keyword matcher over fictional data; suggestions and action confirmation work. src/routes/app.agents.tsx is configuration/history only. Follow-up "AI call now" simulates an outcome. No Gateway SDK/model/provider integration exists. Do not enable active agents until live requests, access checks and audit records pass staging.

## Ordered work
1. Enable Lovable Cloud, authenticated repositories and tenant/role enforcement first. Read current AI Gateway/runtime guides when implementing: model availability/defaults can change after this handoff date.
2. Install @lovable.dev/ai-gateway with bun and verify import. Run listModels() and require workspace_models:"included". Select workspace-resolved default for new text calls (currently openai/gpt-6-astra on Responses, subject to actual available policy/catalog). Do not fall back silently to a blocked model.
3. Run bunx ai-gateway generate --model <verified-slug> for every required model; keep src/generated/ai-gateway and import augmentation in src/ai-gateway.types.ts. Read installed function JSDoc and generated request/response/event declarations. Use typed SDK functions; no any/casts to bypass contracts.
4. Put prompts, scoped data reads and SDK calls inside authenticated server execution. SDK owns Gateway auth through injected LOVABLE_API_KEY; do not manually read/pass keys or use raw HTTP provider calls. Client calls an authenticated function through a hook. For streaming HTTP, use a server route returning raw Response and verify bearer session inside handler — /api/public is not protected automatically.
5. Build native typed stream consumption, loading/Stop states, safe errors, partial-output preservation and durable conversation/execution records. A server function returns plain serializable DTOs, not streams/Response. No Vercel UI-message protocol assumptions for native Gateway events.

## Data-grounded answers
Read only caller-authorized records and fields using repositories. Compute counts, service/date filters and report totals deterministically before giving context to the model. Replace fixed demoNow/2026-11-05/Week43/Week44 dates with current tenant timezone/selected service and actual periods. Cite records and time scope; say unavailable when reads fail. Avoid dumping member phone numbers, pastoral notes or GPS into the prompt without a justified scope.

## Tool safety
Implement server allowlisted tools: read_members, read_reports, attendance_summary, transport_summary, create_escalation, update_attendance, assign_driver and registered dispatch actions. Stored agent permissions alone are not authorization: intersect them with authenticated user role, tenant and subject scope at execution time. Reject arbitrary SQL/URLs/secrets/provider calls requested by model output or stored instructions. Treat member notes, documents and tool outputs as untrusted content.

Consequential actions produce a proposed action DTO, preview target/count, and require confirmation as defined in action-map. Confirm server-side against current data; use idempotent action IDs/outbox; cancellation must perform no write. Never mark successful before commit/accepted status. Repeated clicks must not send twice. Agent status/permissions changes require server-authorized administrators.

## Error and budget behavior
Handle structured GatewayError code/httpStatus/outcome/recovery and retain safe request/job IDs in server logs. SDK defaults own bounded safe retries. No automatic inference replay for ambiguous outcome, timeout, network failure, partial stream, provider refusal or credit/policy denial. Preserve input/output, clear loading and request user recovery. Pause scheduled agents on permanent credit/policy errors. Set explicit owner-approved spending/concurrency safeguards; do not invent business limits.

## Voice and messaging
A text assistant does not place calls. Connect the chosen voice/telephony provider with documented request/callback schemas, consent, verified sender identities, contact windows, stop-contact rules and human handoff. For interactive two-way browser voice, follow current live-voice guide; standalone transcription/TTS do not equal a phone integration. WhatsApp messaging and WhatsApp calling are separate capabilities.

## Acceptance
Real authenticated question → scoped records → streamed answer → persistent read-back; cross-tenant/role denial; no-service/read-error safe answer; proposed action → Cancel no dispatch; Confirm exactly one authorized action with audit; malformed tool/prohibited URL rejected; Stop/error/credits preserve input; real provider call with consent, delivered outcome and callback read-back in staging.
