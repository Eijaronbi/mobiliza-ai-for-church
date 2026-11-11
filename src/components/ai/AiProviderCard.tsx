import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/hooks/use-app";
import { AI_PROVIDERS, AI_PROVIDER_IDS, type AiProviderId } from "@/lib/ai-providers";
import { getChurchAi, removeChurchAi, saveChurchAi, testChurchAi } from "@/lib/ai-settings.functions";

type State = Awaited<ReturnType<typeof getChurchAi>>;

/** Lets a church plug in its own AI key (OpenAI, Claude, Gemini, OpenRouter, Groq). Key stays server-side. */
export function AiProviderCard() {
  const { mode, tenantId } = useApp();
  const get = useServerFn(getChurchAi), save = useServerFn(saveChurchAi), remove = useServerFn(removeChurchAi), test = useServerFn(testChurchAi);
  const [st, setSt] = useState<State | null>(null);
  const [provider, setProvider] = useState<AiProviderId>("openai");
  const [model, setModel] = useState(AI_PROVIDERS.openai.defaultModel);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => get({ data: { tenantId } }).then((s) => {
    setSt(s);
    if (s.configured) { setProvider(s.provider as AiProviderId); setModel(s.model); }
  }).catch(() => setSt(null));
  useEffect(() => { if (mode === "live" && tenantId) load(); }, [mode, tenantId]);

  if (mode !== "live") {
    return <Card className="p-5 shadow-card"><h2 className="flex items-center gap-2 font-bold"><KeyRound className="h-4 w-4" />AI provider</h2><p className="mt-1 text-sm text-muted-foreground">Sign in to your church to use your own OpenAI, Claude, Gemini, OpenRouter or Groq key.</p></Card>;
  }
  const canEdit = !!st?.canEdit;
  const run = async (fn: () => Promise<{ ok: boolean; error?: string; reply?: string }>, okMsg: string) => {
    setBusy(true);
    try { const r = await fn(); if (r.ok) { toast.success(r.reply ? `${okMsg}: “${r.reply}”` : okMsg); setKey(""); await load(); } else toast.error(r.error ?? "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <Card className="p-5 shadow-card">
      <h2 className="flex items-center gap-2 font-bold"><KeyRound className="h-4 w-4" />AI provider</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {st?.configured ? `Ask AI uses your church’s ${AI_PROVIDERS[st.provider as AiProviderId]?.label ?? st.provider} connection. Key saved privately.` : "Ask AI uses Mobiliza's built-in AI. Add your own key to use any provider and model."}
      </p>
      {canEdit ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label htmlFor="ai-prov">Provider</Label>
            <Select value={provider} onValueChange={(v) => { setProvider(v as AiProviderId); setModel(AI_PROVIDERS[v as AiProviderId].defaultModel); }}>
              <SelectTrigger id="ai-prov"><SelectValue /></SelectTrigger>
              <SelectContent>{AI_PROVIDER_IDS.map((p) => <SelectItem key={p} value={p}>{AI_PROVIDERS[p].label}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1"><Label htmlFor="ai-model">Model</Label><Input id="ai-model" value={model} onChange={(e) => setModel(e.target.value)} /></div>
          <div className="space-y-1 sm:col-span-2"><Label htmlFor="ai-key">API key {st?.configured && "(leave blank to keep the saved key)"}</Label>
            <Input id="ai-key" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder={AI_PROVIDERS[provider].keyHelp} /></div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button disabled={busy} onClick={() => run(() => save({ data: { tenantId, provider, model, apiKey: key || undefined } }), "AI provider saved")}>Save</Button>
            {st?.configured && <Button variant="outline" disabled={busy} onClick={() => run(() => test({ data: { tenantId } }), "Key works")}>Test key</Button>}
            {st?.configured && <Button variant="ghost" disabled={busy} onClick={() => run(() => remove({ data: { tenantId } }), "Switched back to built-in AI")}>Remove key</Button>}
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">Your key is encrypted and never shown again. Usage is billed by your provider.</p>
        </div>
      ) : <p className="mt-2 text-xs text-muted-foreground">Only church admins and pastors can change this.</p>}
    </Card>
  );
}
