/** Owner's Groq, shared server-side with the first N churches. Key never leaves the server. */
export const SHARED_GROQ_CHURCH_LIMIT = 10;
export function isEarlyChurch(tenantId: string, firstIds: string[]): boolean {
  return firstIds.slice(0, SHARED_GROQ_CHURCH_LIMIT).includes(tenantId);
}
export async function sharedGroqFor(tenantId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("tenants").select("id").order("created_at", { ascending: true }).limit(SHARED_GROQ_CHURCH_LIMIT);
  return isEarlyChurch(tenantId, (data ?? []).map((r) => r.id));
}
export async function callSharedGroq(system: string, user: string): Promise<string> {
  const key = process.env["UDC_GROQ_API_KEY"], auth = process.env["LOVABLE_API_KEY"];
  if (!key || !auth) throw new Error("Shared AI not configured");
  const res = await fetch("https://connector-gateway.lovable.dev/udc_groq/openai/v1/chat/completions", {
    method: "POST", signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${auth}`, "X-Connection-Api-Key": key, "content-type": "application/json" },
    body: JSON.stringify({ model: "openai/gpt-oss-20b", messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`Shared AI failed (${res.status})`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return (j.choices?.[0]?.message?.content ?? "").trim();
}
