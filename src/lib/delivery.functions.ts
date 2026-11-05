import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { eventSchemas } from "@/config/event-catalog";

const Input = z.object({
  tenantId: z.string().uuid(),
  url: z.string().url().max(2000),
  method: z.enum(["POST", "PUT", "PATCH"]),
  body: z.object({
    event: z.string(), event_id: z.string().max(100), timestamp: z.string().max(40), tenant_id: z.string().uuid(),
    source: z.literal("mobilizer"), actor: z.object({ role: z.string().max(40), name: z.string().max(200) }),
    data: z.record(z.string(), z.unknown()),
  }).strict(),
});

/** Sends an event to a webhook the church saved in its Integration Hub.
 * Only URLs stored in that church's endpoints/integrations are allowed; the body is HMAC-signed server-side. */
export const deliverWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const started = Date.now();
    const deny = (error: string) => ({ ok: false, status: 0, durationMs: 0, simulated: false, error });
    // Only registered events, with valid payloads, for the caller's own church, by non-read-only roles.
    if (data.body.tenant_id !== data.tenantId) return deny("Event church does not match.");
    const schema = (eventSchemas as Record<string, { safeParse: (v: unknown) => { success: boolean } }>)[data.body.event];
    if (!schema || !schema.safeParse(data.body.data).success) return deny("Unknown event or invalid event data.");
    const { data: roleRows } = await context.supabase.from("user_roles").select("role").eq("tenant_id", data.tenantId).eq("user_id", context.userId);
    if (!roleRows?.length || roleRows.every((r) => r.role === "member")) return deny("Your role can't send to integrations.");
    const { data: rows, error } = await context.supabase.from("records").select("collection, data")
      .eq("tenant_id", data.tenantId).in("collection", ["endpoints", "integrations", "customApis"]);
    if (error) return { ok: false, status: 0, durationMs: 0, simulated: false, error: "Not allowed" };
    const allowed = (rows ?? []).some((r) => {
      const d = r.data as { url?: string; baseUrl?: string };
      return d.url === data.url || (!!d.baseUrl && data.url.startsWith(d.baseUrl));
    });
    if (!allowed) return { ok: false, status: 0, durationMs: 0, simulated: false, error: "This URL isn't saved in your Integration Hub." };
    if (/example\.com|your-/.test(data.url)) return { ok: false, status: 0, durationMs: 0, simulated: false, error: "Endpoint still uses a placeholder URL." };

    const body = JSON.stringify(data.body);
    const headers: Record<string, string> = { "content-type": "application/json", "x-mobiliza-tenant": data.tenantId };
    const secret = process.env["MOBILIZA_WEBHOOK_SECRET"];
    if (secret) headers["x-mobiliza-signature"] = await hmac(secret, body);
    try {
      const res = await fetch(data.url, { method: data.method, headers, body, signal: AbortSignal.timeout(10000) });
      return { ok: res.ok, status: res.status, durationMs: Date.now() - started, simulated: false, error: res.ok ? undefined : `Receiver answered ${res.status}` };
    } catch (e) {
      return { ok: false, status: 0, durationMs: Date.now() - started, simulated: false, error: (e as Error).name === "TimeoutError" ? "Timed out" : "Could not reach the receiver" };
    }
  });

export async function hmac(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
