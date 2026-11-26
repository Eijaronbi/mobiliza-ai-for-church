<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Mobilizer architecture rules
- Bus registration uses the vehicle repository and registered vehicle event; vehicles without location data are excluded from map markers. Why: fleet registration must not fabricate tracking locations.
- Components never contain endpoint URLs or provider calls; they call hooks in `src/hooks/use-data.ts` (repositories + `useAction`). Why: integrations stay swappable by configuration.
- All data access goes through `src/services/data` repositories; mock vs cloud is chosen per session by `services/data/mode.ts` (signed-in church = live, otherwise demo). Cloud stores every collection in `public.records` (tenant_id, collection, id, data jsonb) behind tenant RLS. Why: one set of screens serves the public demo and real churches.
- Church membership and roles live in `user_roles` (per tenant); RLS uses `is_tenant_member`/`has_tenant_role`. Live outbound delivery goes through `deliverWebhook` (allow-listed URLs, catalogue-validated event envelopes only, non-member roles, HMAC signed); spreadsheet exports pass cells through `src/lib/csv-safe.ts`; inbound callbacks use `/api/public/hooks/$source` with the same HMAC. Why: tenant isolation and verified callers.
- Every consequential action is registered in `src/config/action-map.ts` and validated against `src/config/event-catalog.ts` before dispatch. Why: n8n and other receivers get one predictable JSON contract.
- Outbound requests go only through `src/services/api/client.ts` (Transport). Secrets are referenced by name (`secretRef`) and resolved server-side, never stored in the browser. Why: security.
- Seed data must never mark an integration "connected"; only real connections (e.g. Google Maps browser key present) may show connected. Why: honesty in demos.
- tsconfig relaxes noUncheckedIndexedAccess/exactOptionalPropertyTypes/noPropertyAccessFromIndexSignature/noImplicitReturns. Why: prototype velocity; keep `strict` on.
- Contracts and go-live steps live in `docs/n8n-contracts.md` and `docs/database-schema.sql`.

- Content routes own one main landmark; selectable records use native design-system buttons and explicit names for controls. Why: consistent keyboard and assistive-technology access.
- Church emails (prayer points, invites) send through the linked Gmail via `src/lib/gmail.functions.ts`, only for allow-listed churches and non-member roles; demo and other churches stay simulated. Why: the Gmail belongs to the app owner.
- Owner SMS/email fallback (owner church + first 10 churches) uses server-verified tenant/admin authorization and the private Brevo gateway through the transport client, only for broadcasts without a bound workflow. Why: owner credentials cannot serve other churches and workflow SMS must not be duplicated.
- Church AI settings return only provider/model/configured state, never credential fragments or provider error bodies. Why: secret-derived hints and echoed upstream responses can disclose credentials.
- Shared owner Groq for the first 10 churches lives in `src/lib/shared-groq.server.ts`, used by Ask AI after a church's own key and before built-in AI. Why: usage sharing without exposing the key.
