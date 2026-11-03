# Mobiliza backend and go-live handoff

Audit date: 3 November 2026. Product currently displays the name Mobilizer.

## Status — read before enabling anything
The website is a working **demo prototype**, not a live church system. Ask AI's navigation crash has been repaired and its demo conversation verified. All 16 distinct content views load. Data resets on page refresh; AI replies are rule-based; outbound delivery is simulated. Lovable Cloud is not connected. Signing in, tenant isolation, real messaging/calls, provider AI and live fleet GPS have NOT been verified.

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
9. contracts/ — unchanged domain types, event schemas, action map, repository and config contracts.

## What the owner must supply
Actual church profile, verified users/role assignments, consented member import, n8n instance and workflow URLs, provider accounts and approved phone/sender identities, Google Maps authorized domains and billing, real pickup coordinates and driver identities, privacy/retention policies, production domain and service operating rules. Use hosted secret entry; never paste credentials into source, docs or browser fields.

## First deployment milestone
Enable Lovable Cloud, implement authenticated persistence for members/services/vehicles, and demonstrate a create → reload → read-back flow with two test tenants. Then implement signed orchestration; then AI; then pilot live communications and tracking. Publishing a demo does not complete these gates.

## Update — schedule broadcasts
Services & Events now has a **Broadcast** button on every service (and on the "Service saved" toast for new ones). It sends the schedule by SMS and/or WhatsApp to church groups, picked members, typed-in name+number contacts and WhatsApp groups. Delivery is simulated until wired — read `09-BROADCASTS-SMS-WHATSAPP.md`.
