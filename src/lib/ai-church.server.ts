import type { AiProviderId } from "./ai-providers";

/** Loads and decrypts a church's own AI key. Call only after verifying membership. */
export async function loadChurchModel(tenantId: string): Promise<{ provider: AiProviderId; model: string; apiKey: string } | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("tenant_ai_settings").select("provider, model, api_key_ciphertext").eq("tenant_id", tenantId).maybeSingle();
  if (!data) return null;
  const { decryptSecret } = await import("./ai-key-crypto.server");
  return { provider: data.provider as AiProviderId, model: data.model, apiKey: await decryptSecret(data.api_key_ciphertext) };
}
