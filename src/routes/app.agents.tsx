import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, SimBadge, StatusBadge } from "@/components/app/kit";
import { useListData, useRepoMutations } from "@/hooks/use-data";
import { actionList } from "@/config/action-map";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/agents")({
  head: () => ({ meta: [{ title: "AI Agents — Mobilizer" }, { name: "description", content: "Specialised AI agents, permissions and execution history." }] }),
  component: AgentsPage,
});

const allTools = ["read_members", "send_message", "place_call", "create_escalation", "update_attendance", "assign_driver", "read_reports", "summarize"];

function AgentsPage() {
  const agents = useListData("agents");
  const execs = useListData("executions");
  const endpoints = useListData("endpoints");
  const apis = useListData("customApis");
  const am = useRepoMutations("agents");
  const [sid, setSid] = useState<string>("");
  const a = agents.find((x) => x.id === sid) ?? agents[0];
  const [instr, setInstr] = useState<Record<string, string>>({});
  if (!a) return null;
  const myEx = execs.filter((e) => e.agentId === a.id);
  const upd = (patch: Partial<typeof a>) => am.update.mutate({ id: a.id, patch });

  return (
    <div>
      <PageHeader title="AI Agents" description="Six specialised agents, each with clear duties, tools and boundaries. Agents are simulated in this demo — no real AI calls are made." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          {agents.map((x) => (
            <Card key={x.id} onClick={() => setSid(x.id)} className={cn("cursor-pointer p-4 shadow-card transition-all hover:shadow-elegant", x.id === a.id && "ring-2 ring-ring")}>
              <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Bot className="h-4 w-4" /></span><span className="font-semibold">{x.name}</span><span className="ml-auto"><StatusBadge status={x.status} /></span></div>
              <p className="mt-2 text-xs text-muted-foreground">{x.description}</p>
            </Card>
          ))}
        </div>
        <Card className="p-5 shadow-card lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{a.name}</h2><SimBadge /></div>
          <Tabs defaultValue="config" className="mt-4">
            <TabsList><TabsTrigger value="config">Configuration</TabsTrigger><TabsTrigger value="history">Execution history</TabsTrigger></TabsList>
            <TabsContent value="config" className="space-y-4">
              <div className="space-y-1"><Label>Instructions</Label><Textarea rows={5} value={instr[a.id] ?? a.instructions} onChange={(e) => setInstr({ ...instr, [a.id]: e.target.value })} />
                <Button size="sm" className="mt-2" onClick={() => { upd({ instructions: (instr[a.id] ?? a.instructions).slice(0, 4000) }); toast.success("Instructions saved"); }}><Save className="mr-1 h-3.5 w-3.5" />Save</Button></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Status</Label><Select value={a.status} onValueChange={(v) => upd({ status: v as typeof a.status })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="simulated">Simulated</SelectItem><SelectItem value="paused">Paused</SelectItem><SelectItem value="active" disabled>Active (needs AI provider)</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Webhook endpoint</Label><Select value={a.webhookEndpointId ?? ""} onValueChange={(v) => upd({ webhookEndpointId: v })}><SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger><SelectContent>{endpoints.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>API integration</Label><Select value={a.apiIntegrationId ?? ""} onValueChange={(v) => upd({ apiIntegrationId: v })}><SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger><SelectContent>{apis.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div><Label>Workflow assignments</Label><div className="mt-2 grid gap-1.5 sm:grid-cols-2">{actionList.map((ac) => <label key={ac.id} className="flex items-center gap-2 text-sm"><Checkbox checked={a.workflows.includes(ac.id)} onCheckedChange={(v) => upd({ workflows: v ? [...a.workflows, ac.id] : a.workflows.filter((w) => w !== ac.id) })} />{ac.label}</label>)}</div></div>
              <div><Label>Tool permissions</Label><div className="mt-2 grid gap-1.5 sm:grid-cols-2">{allTools.map((t) => <label key={t} className="flex items-center gap-2 font-mono text-xs"><Checkbox checked={a.tools.includes(t)} onCheckedChange={(v) => upd({ tools: v ? [...a.tools, t] : a.tools.filter((x) => x !== t) })} />{t}</label>)}</div></div>
            </TabsContent>
            <TabsContent value="history">
              <div className="divide-y">{myEx.map((e) => <div key={e.id} className="flex items-center gap-3 py-2.5 text-sm"><StatusBadge status={e.result} /><span className="flex-1">{e.action}</span><span className="text-xs text-muted-foreground">{(e.durationMs / 1000).toFixed(1)}s · {timeAgo(e.at)}</span></div>)}</div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
