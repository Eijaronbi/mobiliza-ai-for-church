import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { Send, Sparkles, Info, Lightbulb, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader, SimBadge } from "@/components/app/kit";
import { useAction, useListData } from "@/hooks/use-data";
import type { ActionId } from "@/config/action-map";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/assistant")({
  head: () => ({ meta: [{ title: "AI Command Centre — Mobilizer" }, { name: "description", content: "Ask questions and run operations in plain language." }] }),
  component: Assistant,
});

type Kind = "info" | "recommendation" | "action";
interface Msg { role: "user" | "ai"; text: string; kind?: Kind; action?: { id: ActionId; data: Record<string, unknown>; label: string }; done?: boolean }
const suggestions = ["How many members have confirmed?", "Who needs transportation?", "Which cell leaders have outstanding responsibilities?", "Show first timers awaiting follow-up", "Which reports are overdue?", "Generate the weekly evangelism summary", "Show unresolved member issues", "Start the mobilization workflow"];

/** AgentRuntime contract: today a rule-based matcher over demo data; later an AI Gateway call with tool use. */
function Assistant() {
  const mob = useListData("mobilization");
  const services = useListData("services");
  const members = useListData("members");
  const transport = useListData("transport");
  const units = useListData("units");
  const reports = useListData("reports");
  const followups = useListData("followups");
  const escalations = useListData("escalations");
  const run = useAction();
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "ai", kind: "info", text: "Hello. I'm the Church Intelligence Agent. Ask me about attendance, transport, follow-ups, reports or issues — or ask me to start a workflow. (Simulated responses from demo data.)" }]);
  const [q, setQ] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  const next = [...services].filter((s) => s.date > "2026-11-05").sort((a, b) => a.date.localeCompare(b.date))[0];
  const nm = mob.filter((r) => r.serviceId === next?.id);
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  const uname = (id: string) => units.find((u) => u.id === id)?.name ?? id;

  function answer(text: string): Msg {
    const t = text.toLowerCase();
    if (t.includes("start") && t.includes("mobili")) return { role: "ai", kind: "action", text: `This will start mobilization for ${next?.name} and contact ${nm.length} members through the bound n8n workflow. Please confirm.`, action: { id: "startMobilization", label: "Start mobilization", data: { service_id: next!.id, workflow_id: next!.workflowId, member_count: nm.length } } };
    if (t.includes("confirm")) { const c = nm.filter((r) => r.response === "confirmed").length; return { role: "ai", kind: "info", text: `${c} of ${nm.length} members (${Math.round((c / nm.length) * 100)}%) have confirmed for ${next?.name}. ${nm.filter((r) => r.response === "no_response" || r.response === "pending").length} have not responded yet.` }; }
    if (t.includes("transport")) { const open = transport.filter((r) => !["arrived", "rejected"].includes(r.status)); return { role: "ai", kind: "info", text: `${open.length} members need transport:\n` + open.slice(0, 8).map((r) => `• ${name(r.memberId)} — ${r.status.replace("_", " ")}`).join("\n") }; }
    if (t.includes("cell leader") || t.includes("outstanding")) { const o = reports.filter((r) => r.status === "overdue" || r.status === "pending"); return { role: "ai", kind: "recommendation", text: `${o.length} units have outstanding reports:\n` + o.slice(0, 8).map((r) => `• ${uname(r.unitId)} (${r.submittedBy}) — ${r.status}`).join("\n") + "\n\nRecommendation: send a reminder from Evangelism & Reports." }; }
    if (t.includes("first timer") || t.includes("follow")) { const w = followups.filter((f) => ["new", "assigned", "scheduled", "failed"].includes(f.status)); return { role: "ai", kind: "info", text: `${w.length} people are awaiting follow-up:\n` + w.slice(0, 8).map((f) => `• ${f.name} — ${f.status}`).join("\n") }; }
    if (t.includes("overdue")) { const o = reports.filter((r) => r.status === "overdue"); return { role: "ai", kind: "info", text: o.length ? `Overdue reports:\n` + o.map((r) => `• ${uname(r.unitId)} — ${r.period}`).join("\n") : "No reports are overdue." }; }
    if (t.includes("summary") || t.includes("evangelism")) { const wk = reports.filter((r) => r.period === "Week 43"); const s = wk.reduce((a, r) => a + Number(r.values.saved ?? 0), 0); const v = wk.reduce((a, r) => a + Number(r.values.visits ?? 0), 0); return { role: "ai", kind: "recommendation", text: `Weekly evangelism summary (Week 43):\n• ${wk.length} reports received\n• ${s} people received Christ\n• ${v} visits conducted\n• ${followups.filter((f) => f.kind === "new_convert").length} new converts in follow-up\n\nRecommendation: assign the ${followups.filter((f) => f.status === "new").length} unassigned records to cell leaders.` }; }
    if (t.includes("issue") || t.includes("unresolved") || t.includes("escalat")) { const o = escalations.filter((e) => e.status !== "resolved"); return { role: "ai", kind: "info", text: `${o.length} unresolved issues:\n` + o.map((e) => `• [${e.priority}] ${e.title} — ${e.ownerName}`).join("\n") }; }
    return { role: "ai", kind: "info", text: "I can answer questions about confirmations, transport, follow-ups, reports, issues and summaries, or start the mobilization workflow. Try one of the suggestions." };
  }
  const ask = (text: string) => { if (!text.trim()) return; setMsgs((m) => [...m, { role: "user", text }, answer(text)]); setQ(""); };
  const icon = { info: Info, recommendation: Lightbulb, action: ShieldCheck };

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <PageHeader title="AI Command Centre" description="Ask questions or give instructions in plain language." actions={<SimBadge label="Simulated responses" />} />
      <Card className="flex min-h-0 flex-1 flex-col shadow-card">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {msgs.map((m, i) => {
            const I = m.kind ? icon[m.kind] : Sparkles;
            return (
              <div key={i} className={cn("flex", m.role === "user" && "justify-end")}>
                <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm animate-rise", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  {m.role === "ai" && m.kind && <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-accent-foreground"><I className="h-3 w-3" />{m.kind === "action" ? "Action requiring confirmation" : m.kind}</div>}
                  <div className="whitespace-pre-line">{m.text}</div>
                  {m.action && !m.done && <div className="mt-3 flex gap-2"><Button size="sm" onClick={async () => { await run(m.action!.id, m.action!.data); setMsgs((all) => all.map((x, k) => (k === i ? { ...x, done: true } : x)).concat({ role: "ai", kind: "info", text: "Done. Mobilization started (simulated) — track progress on the Mobilization page." })); }}>Confirm: {m.action.label}</Button><Button size="sm" variant="ghost" onClick={() => setMsgs((all) => all.map((x, k) => (k === i ? { ...x, done: true } : x)).concat({ role: "ai", text: "Cancelled. Nothing was sent." }))}>Cancel</Button></div>}
                </div>
              </div>
            );
          })}
          <div ref={end} />
        </div>
        <div className="border-t p-3">
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">{suggestions.map((s) => <button key={s} onClick={() => ask(s)} className="shrink-0 rounded-full border bg-card px-3 py-1 text-xs hover:bg-muted">{s}</button>)}</div>
          <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex gap-2"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask anything about your church operations…" maxLength={500} /><Button type="submit" size="icon" aria-label="Send"><Send className="h-4 w-4" /></Button></form>
        </div>
      </Card>
    </div>
  );
}
