# 10 — Prayer Chain backend handoff

Updated 4 November 2026. Page: `/app/prayer`; pure rules: `src/lib/prayer.ts`; tests: `src/test/prayer.test.ts`.

## Built versus live
The page keeps configuration, assignments, sign-ins and call attempts in React memory. Refresh discards them. Clicking sign-in emits a simulated event with the selected method; it does not receive a WhatsApp message. Remind emits an event but creates no durable job. Run agent check is manual, using a demo clock. Call outcomes and next-channel attempts are manually selected; exhaustion currently shows a toast, not a leader notification. Prayer point delivery is simulated. No prayer repositories, inbound receivers, scheduler or provider calls exist yet.

## Church rules and prototype defaults
- User requirement: early morning 03:00–06:00, one hour per member; watches 03:00–04:00, 04:00–05:00, 05:00–06:00.
- User requirement: WhatsApp sign-in, visibility of signed-in versus unsigned-in members, phone call first and WhatsApp call if phone calling fails; message says it is time for Prayer Chain.
- User requirement: configurable times, duration and methods for each church; reminders and prayer points/broadcasts via email, SMS and WhatsApp.
- Prototype defaults, to confirm with owner: 10-minute grace, reminders 15 minutes before by WhatsApp and SMS. Pilot timezone: Africa/Lagos (UTC+1); other churches choose their timezone.
- Current script: "Good morning {name}. It's time for prayer chain. Your hour is {slot}. Please sign in and start praying."
- Signed-in/praying means a member declared participation. Slot completion does not prove a full hour of prayer; missed means no recorded sign-in, not proof of inactivity.

## Proposed storage, not a migration
Every table needs tenant scope, same-tenant references, authorization policies, grants and retention rules.
- `prayer_chains`: name, local start/end, slot duration, sign-in method, grace, call order, reminder settings, script, timezone, enabled and configuration version.
- `prayer_slot_assignments`: chain, slot, member, recurrence/weekday and effective dates.
- `prayer_occurrences`: chain, service date, slot key, absolute UTC start/end and configuration version. Repeating `slot_0300` alone is not unique across days.
- `prayer_sign_ins`: occurrence/member, method, received timestamp, source integration/message ID and optional authorized correction actor. Unique occurrence/member plus unique inbound provider receipt.
- `prayer_call_attempts`: occurrence/member, channel, attempt, idempotency key, provider ID, queued/ringing/answered/no_answer/failed/cancelled status and timestamps.
- `prayer_broadcasts` and recipient delivery rows: message, channels, authorized scope, per-channel consent snapshot, provider IDs and outcomes.
- Reuse durable jobs, transactional outbox, webhook receipts and audit tables; avoid duplicate send queues.

## Current event contract (`workflow: "prayer"`)
Exact schemas/samples are in `contracts/event-catalog.ts` and `event-examples.json`.
| Action | Event | Current data fields |
|---|---|---|
| schedulePrayerReminder | prayer.reminder_scheduled | chain_id, slot_id, member_ids, channels, minutes_before |
| recordPrayerSignIn | prayer.signed_in | chain_id, slot_id, member_id, method, signed_in_at |
| recordPrayerMissed | prayer.missed | chain_id, slot_id, member_id, grace_minutes |
| callPrayerMember | prayer.call_attempted | chain_id, slot_id, member_id, channel, attempt, fallback_channels, message |
| sendPrayerPoints | prayer.points_sent | chain_id, channels, message, member_ids, recipient_count, skipped_no_consent |

These events omit occurrence ID, timezone, watch dates/start/end and provider results. Introduce these in versioned contracts before production; add registered configuration/assignment actions and verified call/delivery outcome events. Event names containing scheduled/sent/attempted are demo requests, not evidence of actual scheduling or delivery. Server must derive actor/tenant and validate all referenced records. Never trust client counts, consent filtering or timestamps.

## Ordered implementation and n8n flows
1. **Persistence:** implement typed repository DTOs and hooks; move page-local settings/assignments/status to persisted reads and authorized mutations. Create occurrences from church timezone and versioned configuration, handling midnight and timezone changes explicitly.
2. **WhatsApp sign-in:** proposed `/api/public/whatsapp/webhook` must handle provider verification challenge and validate POST signatures over raw bytes. Bind receiving business identity to tenant, deduplicate message receipt, match trusted sender to an opted-in member and eligible occurrence. Define accepted sign-in phrases and early/late rules with owner. Reject/triage unknown or ambiguous senders/watches; never guess. Atomically insert sign-in + audit/outbox, cancel pending contacts and acknowledge once. Group-originated messages require confirmed provider group webhook support; offer direct-message sign-in if unavailable.
3. **Scheduler:** durable minute-based jobs in church timezone send reminders at start minus configured offset. At start plus grace, recheck assignment, enabled state and sign-in; only then emit missed and enqueue contact. Use occurrence/member/purpose/channel idempotency; restart or duplicate ticks cannot contact twice.
4. **Calling:** place phone call through the chosen verified voice provider; persist its correlation ID. On authenticated no-answer/failure callback, recheck sign-in and enqueue WhatsApp call if supported and permitted. An unknown timeout is not a confirmed failure: reconcile provider state before fallback. Answered stops the fallback chain, but does not itself mark prayer sign-in without an agreed confirmation flow. Stop pending calls on sign-in; handle late callbacks and cancellation races. In-flight calls may not be cancellable: record honestly.
5. **Unavailable/exhausted channels:** do not pretend WhatsApp calling is enabled because messaging works. Confirm number/provider capability and required user permission. If unavailable or exhausted, persist status and notify the authorized leader through registered escalation; no endless retries.
6. **Prayer points:** validate message and resolve selected members/scope server-side. Recheck channel-specific consent, verify senders/templates, create one queued delivery per recipient/channel, batch through provider adapters, and store signed outcomes. Private prayer points stay scoped and follow retention policy.
7. **Live view:** tenant-authorized subscriptions/polling show occurrence assignments, sign-in timestamps and true contact outcomes. Expose stale/offline/loading/error state and distinguish upcoming, awaiting, signed-in and missing sign-in.

## Owner inputs and launch acceptance
Owner confirms recurrence, assignment rules, sign-in phrases and early/late acceptance, prototype grace/reminder defaults, call permission, leader escalation owner and privacy policy. Supply verified WhatsApp business identity/templates, voice/SMS/email senders and n8n endpoints using hosted secret entry only.

- [ ] Create settings/assignments, refresh and read back; a second tenant cannot read or change them.
- [ ] Default three one-hour watches and a customised/midnight-crossing chain produce correct dated occurrences.
- [ ] Real WhatsApp sign-in appears on dashboard; duplicates apply once; unknown/wrong-watch/cross-tenant messages are rejected or triaged.
- [ ] One unsigned-in member gets phone call, then WhatsApp only on verified failure; sign-in suppresses the next call, including callback races.
- [ ] Unavailable WhatsApp calling is explicitly shown and escalated; answered phone call is not falsely marked as sign-in.
- [ ] Real consented email/SMS/WhatsApp reminders and points have provider outcomes; opt-out before job execution prevents sending.
- [ ] Scheduler restart, duplicate tick, disabled chain, midnight and timezone changes do not duplicate contacts.
