# Prayer Chain — backend handoff

Page: `/app/prayer`. Rules: `src/lib/prayer.ts` (tested in `src/test/prayer.test.ts`). Today the page keeps its state in memory and dispatches simulated events.

## Default (configurable per church)
- Window 03:00–06:00, one-hour watches, sign-in via WhatsApp.
- Grace period 10 min after a watch starts; then the agent calls: phone call first, WhatsApp call if no answer. If every channel fails, escalate to the member's leader.
- Call script: "It's time for prayer chain. Your hour is {slot}."
- Reminders N minutes before each watch by WhatsApp/SMS/email. Prayer points broadcast by email/SMS/WhatsApp (consent required).

## Tables (to add)
- `prayer_chains` (id, tenant_id, name, start_time, end_time, slot_minutes, sign_in_method, grace_minutes, call_order text[], reminder_minutes_before, reminder_channels text[], call_message, timezone)
- `prayer_slot_assignments` (chain_id, slot_start, member_id, weekday nullable)
- `prayer_sign_ins` (chain_id, slot_start, member_id, date, method, signed_in_at, source_message_id unique)
- `prayer_call_attempts` (chain_id, member_id, date, slot_start, channel, attempt, provider_call_id, result: ringing|answered|no_answer|failed, created_at)
- `prayer_broadcasts` (chain_id, channels, message, recipient_count, skipped_no_consent)

## Events (`workflow: "prayer"`)
`prayer.reminder_scheduled`, `prayer.signed_in`, `prayer.missed`, `prayer.call_attempted`, `prayer.points_sent` — schemas in `contracts/event-catalog.ts` / `src/config/event-catalog.ts`.

## n8n / server flows
1. **WhatsApp sign-in**: inbound WhatsApp webhook (`/api/public/whatsapp/webhook`) → match sender phone to member → if inside their watch (or up to grace before), insert `prayer_sign_ins` and emit `prayer.signed_in`. Reply "Thank you, you're signed in. God bless your hour."
2. **Scheduler** (cron every minute during the window): reminders at start − N; at start + grace, for each assigned member without a sign-in emit `prayer.missed` and start calling.
3. **Calling**: Voicebip (or Twilio Voice) for `voice`; WhatsApp Business calling for `whatsapp_call` (Meta's Calling API must be enabled on the number — confirm before go-live). On no-answer/failed callback, try next channel in `call_order`; record each attempt. Stop as soon as the member signs in.
4. **Dashboard**: leaders see live who is praying vs not signed in (read sign-ins + call attempts for today).

## Go-live checklist
- [ ] Tables + RLS per tenant
- [ ] WhatsApp inbound receiver deployed and selected as this project's destination
- [ ] Voice provider connected; WhatsApp calling confirmed for the number
- [ ] Scheduler running in the church timezone (Lagos UTC+1 for the pilot)
- [ ] Test: one member signs in on WhatsApp, one doesn't → second receives phone call, then WhatsApp call
