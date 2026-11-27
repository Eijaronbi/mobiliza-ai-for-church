# Nov 27 update — shared providers, demo fixes, Wapzen check

## Shared owner providers (first 10 churches)
- The owner's Groq AI, Brevo SMS and email sending now serve the owner's church **and the first 10 churches by sign-up date** (`tenants.created_at`).
- Rule: `canUseOwnerProvider(tenantId, roles, isEarlyChurch)` in `src/lib/provider-access.ts`; early status from `sharedGroqFor()` in `src/lib/shared-groq.server.ts`. Only church_admin / pastor / super_admin roles may send.
- Credentials never leave the server; churches see no keys. Demo and church #11+ never use owner providers. A church's own saved provider always wins.
- Cost: all usage from those churches bills the owner's Groq and Brevo accounts.
- Tests: `src/test/provider-privacy.test.ts`.

## Demo fixes
- Dashboard "Review" on a transport request opens Transportation → Requests with that member's request highlighted (`/app/transport?tab=requests&request=<id>`). Mobilization and top-bar "Review transport" open the Requests tab.
- Verified: all 15 demo pages load, 9 dashboard Review buttons land correctly, request → leader review → approved works, no page errors.

## Wapzen.io for agent WhatsApp calls
- Wapzen offers AI voice agents on WhatsApp via QR-linked numbers; outbound calls are placed from its dashboard or campaigns.
- **No public developer API was found** (no docs/API pages; /docs and /api return 404). Its agents can call *your* APIs as "API tools", but there is no documented HTTP endpoint for Mobiliza/n8n to trigger a call.
- Wapzen is unofficial (not Meta), calls WhatsApp only (no normal phone numbers) — keep Voicebip for normal calls.
- Until Wapzen publishes an API: (1) ask Wapzen support for an outbound-call/campaign API + webhook; (2) workaround: n8n adds missed prayer-chain members to a Wapzen campaign manually/export. If an API appears, wire it in n8n's `prayer.call_requested` branch exactly like Voicebip.
