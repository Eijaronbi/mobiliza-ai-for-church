# Configuration and owner setup

## Actual existing switches
| Name | Current default / effect | When safe to change |
|---|---|---|
| VITE_DATA_SOURCE | mock; cloud enters rejecting repository stub | All cloud repositories + auth/RLS and read-back tests complete |
| VITE_TRANSPORT | simulated; server enters throwing transport stub | Authenticated server delivery, durable logs/jobs and signature tests complete |
| VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY | Public Maps browser key used by script loader | Valid restricted key, Maps JS API enabled, billing and authorized origins checked |
| VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID | Optional Maps loader channel, not a GPS device identifier | Connector configuration supplied |

Never put private keys in VITE_*: values ship to browser. Public Maps browser keys must be HTTP-referrer/API restricted for authorized preview/production origins. A key's existence does not prove the map loaded or live vehicle tracking.

## Server secret references to provision when implementing
- N8N_WEBHOOK_SECRET: actual signing secret; prefer per-tenant/per-endpoint bindings.
- N8N_API_KEY: optional only if using n8n management APIs; webhook workflow URLs may not need it.
- VOICEBIP_API_KEY: provider credential once real account/API confirmed.
- Provider webhook verification secret: exact name/scheme based on actual provider docs.
- SMS/WhatsApp/email provider credentials and sender verification as chosen by owner.
- LOVABLE_API_KEY: Gateway runtime injection handled by SDK/hosted setup; no browser field/manual SDK apiKey parameter.
Generated Lovable Cloud clients/config supply storage/auth credentials after enablement. Never hardcode privileged keys in project files or the Integration Hub. Hub stores only secret names; production server must allowlist and authorize binding access. Do not support arbitrary secret-name reads.

## Owner checklist
Actual church name/city/pastor/timezone; administrator invitations and verified roles; consented contacts and group mapping; provider account/billing/sender IDs; n8n production URLs and credential bindings; Google Maps key restrictions and real pickup coordinates; driver assignments/consent; privacy, contact and GPS retention policy; custom domain/redirect allowlist; expected pilot cohort and escalation owner.

## Environment rollout
Leave demo switches until staging gates pass. Reject unknown config values (current casts do not validate them). Add fail-closed startup/readiness checks for production; never silently seed/reset demo on live routes. Keep demo separate from live tenants. Secret rotation must support a controlled sender/receiver overlap and expiry without exposing values in logs.
