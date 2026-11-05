import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ tenantId: z.string().uuid(), question: z.string().trim().min(1).max(1000) });

/** Answers a free-form question grounded in the signed-in user's church records (RLS applies). */
export const askMobiliza = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    const { data: church } = await context.supabase.from("tenants").select("name, city, pastor").eq("id", data.tenantId).maybeSingle();
    if (!church) return { text: "", error: "You don't have access to this church." };
    const { data: rows } = await context.supabase.from("records").select("collection, data")
      .eq("tenant_id", data.tenantId).in("collection", ["members", "services", "followups", "transport", "reports", "escalations", "units", "mobilization"])
      .order("updated_at", { ascending: false }).limit(400);
    const grouped: Record<string, unknown[]> = {};
    for (const r of rows ?? []) (grouped[r.collection] ??= []).push(r.data);
    const counts = Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, v.length]));
    const sample = JSON.stringify(Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, v.slice(0, 40)]))).slice(0, 60000);
    const system = `You are the Church Intelligence Agent for ${church.name}${church.city ? ` in ${church.city}` : ""}. Answer only from the church data provided. If the data doesn't contain the answer, say so plainly and suggest which Mobiliza page to update. Never invent people, numbers or contact details. Never claim you sent messages or calls. Keep answers short, use bullet points for lists.`;
    const user = `Record counts: ${JSON.stringify(counts)}\nChurch data (JSON, possibly truncated): ${sample}\n\nQuestion: ${data.question}`;
    const { loadChurchModel } = await import("./ai-church.server");
    const own = await loadChurchModel(data.tenantId).catch(() => null);
    if (own) {
      try {
        const { callChurchModel } = await import("./ai-call.server");
        const text = await callChurchModel({ ...own, system, user });
        return { text: text || "I couldn't produce an answer.", error: null as string | null };
      } catch (e) {
        console.error("church AI provider failed", (e as Error).message);
        return { text: "", error: "Your church's AI provider rejected the request. Check the key in AI Agents → AI provider." };
      }
    }
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: `You are the Church Intelligence Agent for ${church.name}${church.city ? ` in ${church.city}` : ""}. Answer only from the church data provided. If the data doesn't contain the answer, say so plainly and suggest which Mobiliza page to update. Never invent people, numbers or contact details. Never claim you sent messages or calls. Keep answers short, use bullet points for lists.`,
        input: `Record counts: ${JSON.stringify(counts)}\nChurch data (JSON, possibly truncated): ${sample}\n\nQuestion: ${data.question}`,
      });
      const text = extractText(res);
      return { text: text || "I couldn't produce an answer.", error: null as string | null };
    } catch (e) {
      if (e instanceof GatewayError) {
        console.error("askMobiliza", e.code, e.ids);
        return { text: "", error: e.code === "payment_required" ? "AI credits have run out for this workspace." : "The AI assistant is unavailable right now. Please try again shortly." };
      }
      throw e;
    }
  });

function extractText(res: unknown): string {
  const r = res as { output_text?: string; output?: { type?: string; content?: { type?: string; text?: string }[] }[] };
  if (typeof r.output_text === "string") return r.output_text;
  return (r.output ?? []).flatMap((o) => o.content ?? []).filter((c) => c.type === "output_text").map((c) => c.text ?? "").join("\n").trim();
}
