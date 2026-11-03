# Go-live checklist — not completed

## Gate A: identities and persistence
- [ ] Lovable Cloud enabled; versioned migrations applied in staging with grants/RLS on every table.
- [ ] Actual hosted signup, invitations, redirects and password reset settings read/verified.
- [ ] Real users sign in/out; server role/tenant checks cannot be overridden by client switches.
- [ ] Each collection writes, survives refresh and reads back; two-tenant isolation passes all verbs.
- [ ] Profile/preferences persist; empty/loading/error states implemented; demo reset disabled in live mode.
- [ ] Real-time/current date logic and aggregates replace synthetic trends/fixed demo periods.

## Gate B: orchestration
- [ ] Transactional outbox and durable jobs; authorized dispatcher and complete action catalogue.
- [ ] HTTPS destination allowlist, SSRF/redirect protection, tenant-bound secret resolution and redacted logs.
- [ ] Signatures verified by receiver against actual raw bytes; incoming callbacks reject invalid/replayed/oversized/cross-tenant requests.
- [ ] Duplicate deliveries/actions create one side effect; retries preserve ID; unknown outcomes reconciled.
- [ ] All n8n workflows activated in staging; real execution IDs and callback outcomes read back.
- [ ] Financial support and passenger capacity rules agreed and enforced, not fictional arrival/vehicle shortcuts.

## Gate C: AI, communications and maps
- [ ] Current workspace model/SDK declarations verified; authenticated stream/tool flow, cancellation and Gateway errors tested.
- [ ] AI permissions, confirmation and audit verified with real data; agent credit/policy failures pause work.
- [ ] Consented test contacts receive actual call/SMS/WhatsApp/email with verified sender and callback outcome.
- [ ] Sensitive topics go to authorized humans; opt-out/contact windows and retention enforced.
- [ ] Google Maps renders on authorized deployed origin with no key/billing errors.
- [ ] Real authorized driver GPS moves on a second device; stop/denied/offline/stale cases work; unlocated buses remain marker-free.

## Gate D: public launch and operations
- [ ] Owner supplies correct profile/content, domain, privacy/terms/contact policies; no fictional members/phone numbers presented as real.
- [ ] Security scan, dependency checks, accessibility/manual keyboard and mobile zoom/screen-reader checks pass.
- [ ] Backup/restore tested; audit log retention, request limits, usage alerts and named incident owner established.
- [ ] Production readiness probe verifies storage, queue, provider config and signed webhook round trip without leaking secrets.
- [ ] Publish only after owner authorization, then rerun authenticated end-to-end and Maps/provider tests on production origin.
- [ ] Pilot with owner-approved consented cohort before full automation. Observe failures and queue depth, delivery outcome, AI spend and stale GPS.

## Rollback
Pause all scheduled agents/workflows and contact sends first; disable delivery/affected integrations; preserve outbox/audits and reconcile in-flight provider executions before any replay. Restore previous application version and tested database backup/migration strategy. Do not switch a production system silently to mock data or resetDemo. Communicate pending/unknown outcomes honestly and re-enable only after staging and production smoke checks.

## Definition of live
A verified user can perform an authorized write, reload and read it back; another tenant cannot see it; a real external action executes once and its signed outcome appears in UI; AI answers actual scoped records; driver tracking reads from authorized persisted GPS. Until then this is a demo, even if published.
