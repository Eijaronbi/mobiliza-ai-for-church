/** Browser-safe catalogue of AI providers a church can bring its own key for. */
export type AiProviderId = "openai" | "anthropic" | "google" | "openrouter" | "groq";

export const AI_PROVIDERS: Record<AiProviderId, { label: string; defaultModel: string; keyHelp: string }> = {
  openai: { label: "OpenAI (ChatGPT)", defaultModel: "gpt-4o-mini", keyHelp: "platform.openai.com → API keys" },
  anthropic: { label: "Anthropic (Claude)", defaultModel: "claude-3-5-haiku-latest", keyHelp: "console.anthropic.com → API keys" },
  google: { label: "Google (Gemini)", defaultModel: "gemini-2.0-flash", keyHelp: "aistudio.google.com → Get API key" },
  openrouter: { label: "OpenRouter (any model)", defaultModel: "openai/gpt-4o-mini", keyHelp: "openrouter.ai → Keys" },
  groq: { label: "Groq", defaultModel: "llama-3.3-70b-versatile", keyHelp: "console.groq.com → API keys" },
};

export const AI_PROVIDER_IDS = Object.keys(AI_PROVIDERS) as AiProviderId[];

/** Roles allowed to change the church's AI provider. */
export const AI_ADMIN_ROLES = ["church_admin", "super_admin", "pastor"];

export function keyHint(key: string): string {
  const k = key.trim();
  return k.length <= 8 ? "••••" : `${k.slice(0, 3)}…${k.slice(-4)}`;
}
