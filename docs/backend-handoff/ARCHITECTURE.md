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
- All data access goes through `src/services/data` repositories; mock vs cloud is chosen in `src/config/app.config.ts`. Why: demo data can be replaced by Lovable Cloud without UI changes.
- Every consequential action is registered in `src/config/action-map.ts` and validated against `src/config/event-catalog.ts` before dispatch. Why: n8n and other receivers get one predictable JSON contract.
- Outbound requests go only through `src/services/api/client.ts` (Transport). Secrets are referenced by name (`secretRef`) and resolved server-side, never stored in the browser. Why: security.
- Seed data must never mark an integration "connected"; only real connections (e.g. Google Maps browser key present) may show connected. Why: honesty in demos.
- tsconfig relaxes noUncheckedIndexedAccess/exactOptionalPropertyTypes/noPropertyAccessFromIndexSignature/noImplicitReturns. Why: prototype velocity; keep `strict` on.
- Contracts and go-live steps live in `docs/n8n-contracts.md` and `docs/database-schema.sql`.

- Content routes own one main landmark; selectable records use native design-system buttons and explicit names for controls. Why: consistent keyboard and assistive-technology access.
