import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { hmac } from "@/lib/delivery.functions";

const Body = z.object({
  tenant_id: z.string().uuid(),
  kind: z.string().min(1).max(80),
  payload: z.record(z.unknown()).default({}),
});

/** Inbound callbacks from n8n / WhatsApp / voice providers.
 * Callers send `x-mobiliza-timestamp` (unix seconds, within 5 min) and
 * `x-mobiliza-signature` = hex HMAC-SHA256(MOBILIZA_WEBHOOK_SECRET, `${timestamp}.${body}`).
 * Each signature is accepted once (replays return 409). */
export const Route = createFileRoute("/api/public/hooks/$source")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const secret = process.env["MOBILIZA_WEBHOOK_SECRET"];
        if (!secret) return new Response("Inbound webhooks are not configured", { status: 503 });
        const raw = await request.text();
        if (raw.length > 100_000) return new Response("Too large", { status: 413 });
        const given = request.headers.get("x-mobiliza-signature") ?? "";
        const ts = Number(request.headers.get("x-mobiliza-timestamp") ?? "");
        if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return new Response("Stale or missing timestamp", { status: 401 });
        const expected = await hmac(secret, `${ts}.${raw}`);
        if (!safeEqual(given, expected)) return new Response("Invalid signature", { status: 401 });
        const source = params.source.slice(0, 40).replace(/[^a-z0-9_-]/gi, "");
        let parsed;
        try { parsed = Body.parse(JSON.parse(raw)); } catch { return new Response("Invalid body", { status: 400 }); }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("inbound_events").insert({ tenant_id: parsed.tenant_id, source, kind: parsed.kind, payload: parsed.payload as never, signature: expected });
        if (error?.code === "23505") return new Response("Duplicate delivery", { status: 409 });
        if (error) return new Response("Could not record event", { status: 400 });
        return Response.json({ ok: true });
      },
    },
  },
});

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
