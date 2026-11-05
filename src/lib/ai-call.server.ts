import type { AiProviderId } from "./ai-providers";

const OPENAI_COMPAT: Partial<Record<AiProviderId, string>> = {
  openai: "https://api.openai.com/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  google: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
};

/** Calls a church's own AI provider. Throws with the provider's status on failure. */
export async function callChurchModel(p: { provider: AiProviderId; model: string; apiKey: string; system: string; user: string }): Promise<string> {
  if (p.provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": p.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: p.model, max_tokens: 1024, system: p.system, messages: [{ role: "user", content: p.user }] }),
    });
    if (!res.ok) throw new Error(`Provider answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j = (await res.json()) as { content?: { type: string; text?: string }[] };
    return (j.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n").trim();
  }
  const url = OPENAI_COMPAT[p.provider];
  if (!url) throw new Error("Unsupported provider");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${p.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model: p.model, messages: [{ role: "system", content: p.system }, { role: "user", content: p.user }] }),
  });
  if (!res.ok) throw new Error(`Provider answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return (j.choices?.[0]?.message?.content ?? "").trim();
}
