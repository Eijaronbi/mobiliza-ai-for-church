import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AI_ADMIN_ROLES, AI_PROVIDER_IDS, keyHint } from "./ai-providers";

const Tenant = z.object({ tenantId: z.string().uuid() });
const Save = Tenant.extend({
  provider: z.enum(AI_PROVIDER_IDS as [string, ...string[]]),
  model: z.string().trim().min(1).max(120),
  apiKey: z.string().trim().min(10).max(400).optional(),
});

type Ctx = { supabase: any; userId: string };
async function isMember(ctx: Ctx, tenantId: string) {
  const { data } = await ctx.supabase.from("user_roles").select("role").eq("tenant_id", tenantId).eq("user_id", ctx.userId);
  return (data ?? []) as { role: string }[];
}

/** Returns provider, model and a masked hint — never the key itself. */
export const getChurchAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Tenant.parse(d))
  .handler(async ({ data, context }) => {
    const roles = await isMember(context, data.tenantId);
    if (!roles.length) return { configured: false as const, canEdit: false };
    const canEdit = roles.some((r) => AI_ADMIN_ROLES.includes(r.role));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("tenant_ai_settings").select("provider, model, key_hint, updated_at").eq("tenant_id", data.tenantId).maybeSingle();
    return row ? { configured: true as const, canEdit, provider: row.provider, model: row.model, hint: row.key_hint, updatedAt: row.updated_at } : { configured: false as const, canEdit };
  });

export const saveChurchAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Save.parse(d))
  .handler(async ({ data, context }) => {
    const roles = await isMember(context, data.tenantId);
    if (!roles.some((r) => AI_ADMIN_ROLES.includes(r.role))) return { ok: false, error: "Only church admins and pastors can change the AI provider." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!data.apiKey) {
      const { data: existing } = await supabaseAdmin.from("tenant_ai_settings").select("tenant_id").eq("tenant_id", data.tenantId).maybeSingle();
      if (!existing) return { ok: false, error: "Paste an API key." };
      const { error } = await supabaseAdmin.from("tenant_ai_settings").update({ provider: data.provider, model: data.model, updated_by: context.userId, updated_at: new Date().toISOString() }).eq("tenant_id", data.tenantId);
      return error ? { ok: false, error: "Couldn't save." } : { ok: true };
    }
    const { encryptSecret } = await import("./ai-key-crypto.server");
    const { error } = await supabaseAdmin.from("tenant_ai_settings").upsert({
      tenant_id: data.tenantId, provider: data.provider, model: data.model,
      api_key_ciphertext: await encryptSecret(data.apiKey), key_hint: keyHint(data.apiKey),
      updated_by: context.userId, updated_at: new Date().toISOString(),
    });
    return error ? { ok: false, error: "Couldn't save." } : { ok: true };
  });

export const removeChurchAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Tenant.parse(d))
  .handler(async ({ data, context }) => {
    const roles = await isMember(context, data.tenantId);
    if (!roles.some((r) => AI_ADMIN_ROLES.includes(r.role))) return { ok: false, error: "Only church admins and pastors can change the AI provider." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("tenant_ai_settings").delete().eq("tenant_id", data.tenantId);
    return { ok: true };
  });

/** Sends a tiny prompt with the saved key so admins know it works. */
export const testChurchAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Tenant.parse(d))
  .handler(async ({ data, context }) => {
    const roles = await isMember(context, data.tenantId);
    if (!roles.some((r) => AI_ADMIN_ROLES.includes(r.role))) return { ok: false, error: "Not allowed." };
    const { loadChurchModel } = await import("./ai-church.server");
    const m = await loadChurchModel(data.tenantId);
    if (!m) return { ok: false, error: "No key saved." };
    try {
      const { callChurchModel } = await import("./ai-call.server");
      const t = await callChurchModel({ ...m, system: "Reply with one word.", user: "Say OK." });
      return { ok: true, reply: t.slice(0, 40) };
    } catch (e) { return { ok: false, error: (e as Error).message }; }
  });
