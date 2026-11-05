# Mobiliza backend and go-live handoff

> **Update:** login and live storage are now wired. Read `11-LIVE-BACKEND.md` first.

Handoff refreshed: 4 November 2026. Earlier browser/accessibility audit: 3 November 2026. Product currently displays the name Mobilizer.

## Status — read before enabling anything
The website is a working **demo prototype**, not a live church system. Ask AI's navigation crash has been repaired and its demo conversation verified. The earlier audit covered 16 distinct content views; Prayer Chain is an additional page, bringing the inventory to 17. Data resets on page refresh; AI replies are rule-based; outbound delivery is simulated. Lovable Cloud is not connected. Signing in, tenant isolation, real messaging/calls, provider AI and live fleet GPS have NOT been verified.

This package is an implementation roadmap plus the current source contracts. It is not a runnable backend, an importable n8n workflow set, or a completed production SQL migration. Do not run the SQL draft against production or simply flip the configuration switches.

## Reading order
1. 01-PAGE-INVENTORY.md — what exists and what each page needs.
2. 02-BACKEND-IMPLEMENTATION.md — ordered engineering tasks and acceptance gates.
3. 03-DATABASE-MAPPING.md — all repository collections, missing tables and security requirements.
4. 04-N8N-AND-WEBHOOKS.md — outbound/inbound contract and workflow recipes.
5. 05-AI-IMPLEMENTATION.md — real AI, tool permissions, streaming and failure handling.
6. 06-CONFIGURATION-AND-SECRETS.md — actual config names and owner inputs.
7. 07-GO-LIVE-CHECKLIST.md — staging tests, rollout and rollback.
8. 08-ACCESSIBILITY-AND-QA.md — findings, repairs and limitations.
9. 09-BROADCASTS-SMS-WHATSAPP.md — schedules sent to members, contacts and groups.
10. 10-PRAYER-CHAIN.md — watches, WhatsApp sign-in, reminders, prayer points and call fallback.
11. contracts/ — current source snapshots; event-examples.json contains catalogue-validated samples.

## What the owner must supply
Actual church profile, verified users/role assignments, consented member import, n8n instance and workflow URLs, provider accounts and approved phone/sender identities, Google Maps authorized domains and billing, real pickup coordinates and driver identities, privacy/retention policies, production domain and service operating rules. Use hosted secret entry; never paste credentials into source, docs or browser fields.

## First deployment milestone
Enable Lovable Cloud, implement authenticated persistence for members/services/vehicles, and demonstrate a create → reload → read-back flow with two test tenants. Then implement signed orchestration; then AI; then pilot live communications and tracking. Publishing a demo does not complete these gates.

## Update — schedule broadcasts
Services & Events now has a **Broadcast** button on every service (and on the "Service saved" toast for new ones). It sends the schedule by SMS and/or WhatsApp to church groups, picked members, typed-in name+number contacts and WhatsApp groups. Delivery is simulated until wired — read `09-BROADCASTS-SMS-WHATSAPP.md`.

## Update — Prayer Chain
Prayer Chain adds configurable watches (default 03:00–06:00, one hour each), sign-in tracking, reminders, prayer points and phone → WhatsApp call fallback. Its settings, assignments and sign-ins are currently page-local demo state, not repository-backed records. Real inbound WhatsApp sign-in, scheduled jobs, calling and email/SMS/WhatsApp delivery remain to implement. A sign-in is a member declaration, not proof that they prayed for the full hour. WhatsApp calling and group capabilities must be verified separately; no provider connection is established by this handoff.
