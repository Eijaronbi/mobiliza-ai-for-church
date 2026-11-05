import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Play, Send, BellRing, Bus, FileDown, Phone, MessageCircle, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Confirm, PageHeader, ProgressBar, Section, SimBadge, StatCard, StatusBadge } from "@/components/app/kit";
import { useAction, useListData, useRepoMutations } from "@/hooks/use-data";
import { fmtDateTime, pct } from "@/lib/format";
import { CheckCircle2, XCircle, Clock, Users, HeartHandshake } from "lucide-react";
import type { AttendanceResponse } from "@/types";

export const Route = createFileRoute("/app/mobilization")({
  head: () => ({ meta: [{ title: "Mobilization — Mobilizer" }, { name: "description", content: "Configurable mobilization workflows for every service." }, { property: "og:title", content: "Mobilization — Mobilizer" }, { property: "og:description", content: "Configurable mobilization workflows for every service." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: MobilizationPage,
});

const chIcon = { call: Phone, whatsapp: MessageCircle, sms: MessageSquare, email: Mail };

function MobilizationPage() {
  const services = useListData("services");
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = services.filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const [sid, setSid] = useState<string>("");
  const svc = upcoming.find((s) => s.id === sid) ?? upcoming[0];
  const mob = useListData("mobilization").filter((r) => r.serviceId === svc?.id);
  const members = useListData("members");
  const workflows = useListData("workflows");
  const wf = workflows.find((w) => w.id === svc?.workflowId);
  const mm = useRepoMutations("mobilization");
  const wm = useRepoMutations("workflows");
  const run = useAction();
  const [filter, setFilter] = useState<AttendanceResponse | "all" | "transport">("all");

  const n = {
    contacted: mob.filter((r) => r.contacted).length, confirmed: mob.filter((r) => r.response === "confirmed").length,
    unavailable: mob.filter((r) => r.response === "unavailable").length, none: mob.filter((r) => r.response === "no_response" || r.response === "pending").length,
    transport: mob.filter((r) => r.transportNeeded).length, follow: mob.filter((r) => r.followUpPending).length,
  };
  const rows = mob.filter((r) => filter === "all" || (filter === "transport" ? r.transportNeeded : r.response === filter)).slice(0, 40);
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  const setResp = async (id: string, memberId: string, response: AttendanceResponse) => {
    await mm.update.mutateAsync({ id, patch: { response, contacted: true } });
    await run(response === "confirmed" ? "confirmAttendance" : "declineAttendance", { member_id: memberId, service_id: svc!.id, attendance_status: response === "confirmed" ? "confirmed" : "unavailable" });
  };
  const contactPending = async () => {
    const pend = mob.filter((r) => !r.contacted);
    for (const r of pend) await mm.update.mutateAsync({ id: r.id, patch: { contacted: true, response: "no_response" } });
    toast.success(`Simulated contact sent to ${pend.length} pending members`);
  };

  if (!svc) return (
    <div>
      <PageHeader title="Mobilization" description="Contact members, confirm attendance, identify needs and coordinate pickups." />
      <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">No upcoming services yet. Add one in Services &amp; Events, then come back to mobilize members for it.</p>
    </div>
  );
  return (
    <div>
      <PageHeader title="Mobilization" description="Contact members, confirm attendance, identify needs and coordinate pickups." actions={<>
        <Select value={svc.id} onValueChange={setSid}><SelectTrigger aria-label="Select mobilization service" className="w-[260px]"><SelectValue /></SelectTrigger><SelectContent>{upcoming.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {fmtDateTime(s.date)}</SelectItem>)}</SelectContent></Select>
        <Confirm title="Start mobilization?" description={`This sends the mobilization.started event for ${svc.name} to the bound n8n workflow (simulated) and begins contacting ${mob.length} members.`} onConfirm={() => run("startMobilization", { service_id: svc.id, workflow_id: svc.workflowId, member_count: mob.length })}
          trigger={<Button className="bg-gradient-brand text-brand-foreground"><Play className="mr-1 h-4 w-4" />Start mobilization</Button>} />
      </>} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Contacted" value={n.contacted} icon={Users} />
        <StatCard label="Confirmed" value={n.confirmed} icon={CheckCircle2} tone="success" />
        <StatCard label="Unavailable" value={n.unavailable} icon={XCircle} tone="danger" />
        <StatCard label="No response" value={n.none} icon={Clock} tone="warning" />
        <StatCard label="Transport required" value={n.transport} icon={Bus} tone="info" />
        <StatCard label="Follow-up pending" value={n.follow} icon={HeartHandshake} tone="brand" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="Controls" action={<SimBadge />}>
          <div className="mb-3 text-xs font-medium">Progress · {pct(n.contacted, mob.length)}% contacted</div>
          <ProgressBar value={pct(n.contacted, mob.length)} />
          <div className="mt-4 grid gap-2">
            <Button variant="outline" onClick={contactPending}><Send className="mr-2 h-4 w-4" />Contact pending members</Button>
            <Button variant="outline" onClick={() => toast.success(`Reminders queued for ${n.none} non-responders`, { description: "Simulated" })}><BellRing className="mr-2 h-4 w-4" />Send reminders</Button>
            <Button variant="outline" asChild><Link to="/app/transport"><Bus className="mr-2 h-4 w-4" />Review transport requests</Link></Button>
            <Button variant="outline" onClick={() => {
              const csv = ["member,response,transport", ...mob.map((r) => `${name(r.memberId)},${r.response},${r.transportNeeded}`)].join("\n");
              const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv])); a.download = "mobilization-report.csv"; a.click();
            }}><FileDown className="mr-2 h-4 w-4" />Generate report</Button>
          </div>
        </Section>

        <Section title={`Workflow · ${wf?.name ?? ""}`} className="lg:col-span-2">
          {wf && (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                Contact window
                <Input aria-label="Contact window start" className="h-8 w-24" type="time" value={wf.contactWindow.start} onChange={(e) => wm.update.mutate({ id: wf.id, patch: { contactWindow: { ...wf.contactWindow, start: e.target.value } } })} />
                to
                <Input aria-label="Contact window end" className="h-8 w-24" type="time" value={wf.contactWindow.end} onChange={(e) => wm.update.mutate({ id: wf.id, patch: { contactWindow: { ...wf.contactWindow, end: e.target.value } } })} />
              </div>
              <ol className="space-y-2">
                {wf.stages.map((st, i) => {
                  const Icon = chIcon[st.channel];
                  const upd = (p: Partial<typeof st>) => wm.update.mutate({ id: wf.id, patch: { stages: wf.stages.map((x) => (x.id === st.id ? { ...x, ...p } : x)) } });
                  return (
                    <li key={st.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{i + 1}</span>
                      <span className="min-w-[180px] flex-1 text-sm font-medium">{st.name}</span>
                      <Input className="h-8 w-28 text-xs" value={st.offset} onChange={(e) => upd({ offset: e.target.value })} aria-label="Timing" />
                      <Select value={st.channel} onValueChange={(v) => upd({ channel: v as typeof st.channel })}>
                        <SelectTrigger aria-label={`Channel for ${st.name}`} className="h-8 w-[120px] text-xs"><Icon className="h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.keys(chIcon).map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                      </Select>
                      <Switch checked={st.enabled} onCheckedChange={(v) => upd({ enabled: v })} aria-label="Enabled" />
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </Section>
      </div>

      <Section title="Member responses" className="mt-4" action={
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}><SelectTrigger aria-label="Filter member responses" className="h-8 w-40"><SelectValue /></SelectTrigger><SelectContent>{[["all", "All"], ["confirmed", "Confirmed"], ["unavailable", "Unavailable"], ["no_response", "No response"], ["pending", "Not contacted"], ["transport", "Needs transport"]].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
      }>
        <div className="divide-y">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
              <span className="min-w-[160px] flex-1 font-medium">{name(r.memberId)}</span>
              {r.transportNeeded && <StatusBadge status="requested" className="hidden sm:inline-flex" />}
              <StatusBadge status={r.response} />
              <Button size="sm" variant="ghost" onClick={() => setResp(r.id, r.memberId, "confirmed")}>Confirm</Button>
              <Button size="sm" variant="ghost" onClick={() => setResp(r.id, r.memberId, "unavailable")}>Unavailable</Button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
