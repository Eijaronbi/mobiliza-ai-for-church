# Moving Mobiliza to your own repo + hosting

## 1. Code
- Push this folder to your GitHub repo (e.g. Eijaronbi/mobiliza): `git init && git add . && git commit -m "Import Mobiliza" && git remote add origin <url> && git push -u origin main`.
- Install: `bun install` (or npm). Run: `bun run dev`.

## 2. Database + logins (self-hosted Supabase recommended)
1. Create a Supabase project (supabase.com or self-hosted Docker).
2. Apply migrations in order from `drizzle/migrations/0000…0006` (SQL editor or `psql -f`).
3. Import your data export (Lovable: More → Database → Manage → Settings → Export data).
4. Users: passwords do not transfer; users reset passwords on first sign-in.
5. Enable Email auth and Google OAuth in your Supabase dashboard; set redirect URL to your domain.

## 3. Environment variables
Browser: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, optional Maps key.
Server: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_KEY_ENCRYPTION_SECRET` (new random 32+ chars — re-enter church AI keys after moving), `GROQ_API_KEY` (default AI), webhook HMAC secret, Yournotify/Brevo keys.

## 4. Replace Lovable-only pieces
| File | Lovable piece | Replace with |
|---|---|---|
| `vite.config.ts`, `package.json` | `@lovable.dev/vite-tanstack-config` | Standard TanStack Start Vite config (`@tanstack/react-start/plugin/vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `vite-tsconfig-paths`) |
| `src/lib/ai.functions.ts`, `src/generated/ai-gateway/*` | `@lovable.dev/ai-gateway` | Direct Groq call: POST `https://api.groq.com/openai/v1/chat/completions` with `Authorization: Bearer $GROQ_API_KEY` (code in `src/lib/ai-call.server.ts` already does this for church keys) |
| `src/integrations/lovable/index.ts`, `src/routes/auth.tsx` | `@lovable.dev/cloud-auth-js` (Lovable/Google sign-in) | `supabase.auth.signInWithOAuth({ provider: "google" })` |
| SMS/Gmail server functions | Connector gateway | Call Yournotify/Brevo APIs directly with your own keys |

## 5. Hosting
Cloudflare Workers/Pages, Vercel or Netlify (TanStack Start adapters). Point `mobiliza.daylybread.xyz` at the new host and remove the old A record.

## 6. Check
Sign up, create a church, add a member, mark attendance, ask AI, send a test SMS.
