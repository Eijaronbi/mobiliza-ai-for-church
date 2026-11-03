# 09 — Service schedule broadcasts (SMS + WhatsApp)

## What the UI does today
Services & Events → **Broadcast** opens a dialog (`src/components/services/BroadcastDialog.tsx`):
- Channels: SMS, WhatsApp, or both.
- Message (max 1000 chars, prefilled with name/date/location).
- Recipients: church groups (org units → their members), individual members (search), ad-hoc contacts (name + E.164 phone), WhatsApp groups (name + group ID/invite).
- Members without messaging consent are excluded automatically and counted as `skipped_no_consent`.
- Dispatches action `broadcastService` → event `service.broadcast` → workflow slot `mobilization`, endpoint name "Broadcast service schedule". Delivery is **simulated** until an endpoint is bound.

## Event contract (`service.broadcast`)
```json
{
  "broadcast_id": "bc_...", "service_id": "...",
  "channels": ["sms","whatsapp"],
  "message": "You're invited to ...",
  "member_ids": ["..."], "unit_ids": ["..."],
  "external_recipients": [{"name":"Guest","phone":"+2348000000000"}],
  "whatsapp_groups": [{"name":"Youth Fellowship","groupId":"..."}],
  "recipient_count": 2, "skipped_no_consent": 0
}
```
`member_ids` is already expanded from `unit_ids` and consent-filtered. Receivers look up member phones server-side (IDs only in payload). External contacts carry phone numbers because they are not members — treat them as PII.

## Backend tasks
1. **Tables** (add to schema): `broadcasts` (id, tenant_id, service_id, channels, message, created_by, created_at, status) and `broadcast_recipients` (broadcast_id, member_id NULL, name, phone, channel, whatsapp_group_id NULL, provider_message_id, status `queued|accepted|sent|delivered|read|failed`, error, status_at). RLS by tenant; only admins/leaders insert.
2. **Server function** `sendBroadcast` (replace simulated dispatch): validate with the zod schema, persist broadcast + one recipient row per person×channel, then fan out in batches. Never send from the browser.
3. **SMS**: Twilio connector (or n8n → provider). POST `/Messages.json` form-encoded. Enable Twilio **SMS Pumping Protection** and **Geo Permissions** (Nigeria only, etc.). Store returned `sid`.
4. **WhatsApp to people**: WhatsApp connector, `POST /messages`. Outside the 24-hour window a **Meta-approved template** is required (e.g. `service_invite` with `{{1}}` name, `{{2}}` date, `{{3}}` location) — free-text broadcasts only reach people who messaged in the last 24h. Create the template early; approval can take up to 48h. Save `messages[0].id`.
5. **WhatsApp groups**: Meta's Cloud API group messaging is limited/eligibility-gated and not part of the current Lovable WhatsApp connector contract. Options: (a) verify Groups API eligibility for the number and add a group adapter in n8n, (b) use a provider that supports groups, or (c) post to the group manually / via the business app. Until confirmed, mark group rows `failed: unsupported` rather than pretending delivery.
6. **Status callbacks**: WhatsApp → `POST /api/public/whatsapp/webhook` with signed verification + `whatsapp_webhook_events` inbox (see 04); Twilio → status callback route verifying the Twilio signature. Update recipient rows; never downgrade delivered/read to sent.
7. **Replies**: inbound "YES" / "NEED RIDE" should map to `attendance.confirmed` / `transport.requested` for that `service_id`.
8. **UI wiring**: add a broadcast history list per service reading `broadcasts` + per-status counts.

## Owner must supply
- Twilio account + sender number (or alphanumeric sender ID registered for Nigeria).
- WhatsApp Business number connected, approved `service_invite` template.
- Decision on WhatsApp group delivery route (task 5).

## Go-live gate
- [ ] Send to 1 member + 1 external contact on both channels; both rows reach `delivered`.
- [ ] Non-consented member never receives a message.
- [ ] Group delivery path confirmed or explicitly reported as unsupported.
