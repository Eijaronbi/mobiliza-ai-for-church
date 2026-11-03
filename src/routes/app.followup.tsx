import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, PhoneCall, AlertTriangle, CheckCircle2, CalendarClock, Inbox, PhoneOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, SimBadge, StatCard, StatusBadge } from "@/components/app/kit";
import { useAction, useListData, useRepoMutations } from "@/hooks/use-data";
import { useApp } from "@/hooks/use-app";
import { fmtDate, fmtDateTime, demoNow } from "@/lib/format";
import type { FollowUp, FollowUpStatus } from "@/types";

export const Route = createFileRoute("/app/followup")({
  head: () => ({ meta: [{ title: "First Timers & Follow-up — Mobilizer" }, { name: "description", content: "Follow-up journeys for first timers and new converts." }, { property: "og:title", content: "First Timers & Follow-up — Mobilizer" }, { property: "og:description", content: "Follow-up journeys for first timers and new converts." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: FollowUpPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  phone: z.string().trim().regex(/^\+?[0-9 ]{7,18}$/, "Enter a valid phone number"),
  location: z.string().trim().min(2, "Enter a location").max(60),
  kind: z.enum(["first_timer", "new_convert"]),
  referrer: z.string().trim().max(80),
  channel: z.enum(["call", "sms", "whatsapp", "email"]),
  consent: z.boolean(),
});
type V = z.infer<typeof schema>;
const steps = ["Recorded", "Leader assigned", "Contact scheduled", "AI contact", "Outcome recorded", "Escalated if needed", "Next follow-up", "Monitored"];
const stepIdx: Record<FollowUpStatus, number> = { new: 0, assigned: 1, scheduled: 2, failed: 3, contacted: 4, escalated: 5, completed: 7 };

function FollowUpPage() {
  const { tenantId } = useApp();
  const list = useListData("followups");
  const members = useListData("members");
  const units = useListData("units");
  const fm = useRepoMutations("followups");
  const em = useRepoMutations("escalations");
  const run = useAction();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<FollowUp | null>(null);
  const [bucket, setBucket] = useState<string>("all");
  const leaders = units.filter((u) => u.leaderId).map((u) => ({ id: u.leaderId!, label: `${members.find((m) => m.id === u.leaderId)?.name} (${u.name})` }));
  const f = useForm<V>({ resolver: zodResolver(schema), defaultValues: { name: "", phone: "", location: "", kind: "first_timer", referrer: "", channel: "whatsapp", consent: true } });
  const overdue = (x: FollowUp) => !!x.nextContactAt && new Date(x.nextContactAt).getTime() < demoNow() && !["completed", "contacted"].includes(x.status);

  const buckets: Record<string, (x: FollowUp) => boolean> = {
    all: () => true, new: (x) => x.status === "new", pending: (x) => ["assigned", "scheduled"].includes(x.status), success: (x) => x.status === "contacted",
    failed: (x) => x.status === "failed", overdue, completed: (x) => x.status === "completed", escalated: (x) => x.status === "escalated",
  };
  const save = async (v: V) => {
    const item: FollowUp = { id: `${tenantId}_fu${Date.now()}`, tenantId, ...v, encounteredAt: new Date().toISOString(), status: "new", notes: "", log: [] };
    await fm.create.mutateAsync(item);
    await run("newFirstTimer", { followup_id: item.id, kind: v.kind, consent: v.consent });
    f.reset(); setOpen(false);
  };
  const patch = async (x: FollowUp, p: Partial<FollowUp>) => { const n = await fm.update.mutateAsync({ id: x.id, patch: p }); setSel(n); return n; };
  const simulateCall = async (x: FollowUp) => {
    const ok = x.consent && Math.random() > 0.25;
    await patch(x, { status: ok ? "contacted" : "failed", log: [{ id: `c${Date.now()}`, at: new Date().toISOString(), channel: x.channel, direction: "outbound", by: "ai_agent", summary: ok ? "Follow-up Agent welcomed them, answered questions about cell meetings and confirmed interest in the Sunday service." : x.consent ? "No answer. Retry scheduled." : "Not contacted — no consent on record.", outcome: ok ? "success" : "no_answer", simulated: true }, ...x.log] });
  };

  return (
    <div>
      <PageHeader title="First Timers & Follow-up" description="Every new person gets a leader, a conversation and a next step." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Record person</Button></DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Record first timer or new convert</DialogTitle></DialogHeader>
            <form onSubmit={f.handleSubmit(save)} className="grid gap-3 sm:grid-cols-2">
              {(["name", "phone", "location", "referrer"] as const).map((k) => <div key={k} className="space-y-1"><Label>{{ name: "Full name", phone: "Phone", location: "Location", referrer: "Evangelist / referring member" }[k]}</Label><Input aria-label={{ name: "Full name", phone: "Phone", location: "Location", referrer: "Evangelist / referring member" }[k]} {...f.register(k)} />{f.formState.errors[k] && <p className="text-xs text-destructive">{f.formState.errors[k]?.message}</p>}</div>)}
              <div className="space-y-1"><Label>Type</Label><Select value={f.watch("kind")} onValueChange={(v) => f.setValue("kind", v as V["kind"])}><SelectTrigger aria-label="Type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="first_timer">First timer</SelectItem><SelectItem value="new_convert">New convert</SelectItem></SelectContent></Select></div>
              <div className="space-y-1"><Label>Preferred channel</Label><Select value={f.watch("channel")} onValueChange={(v) => f.setValue("channel", v as V["channel"])}><SelectTrigger aria-label="Preferred channel"><SelectValue /></SelectTrigger><SelectContent>{["call", "whatsapp", "sms", "email"].map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent></Select></div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><Switch checked={f.watch("consent")} onCheckedChange={(v) => f.setValue("consent", v)} />They agreed to be contacted</label>
              <DialogFooter className="sm:col-span-2"><Button type="submit">Save & start follow-up</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      } />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="New records" value={list.filter(buckets.new).length} icon={Inbox} />
        <StatCard label="Pending calls" value={list.filter(buckets.pending).length} icon={CalendarClock} tone="info" />
        <StatCard label="Successful contacts" value={list.filter(buckets.success).length} icon={PhoneCall} tone="success" />
        <StatCard label="Failed attempts" value={list.filter(buckets.failed).length} icon={PhoneOff} tone="danger" />
        <StatCard label="Overdue" value={list.filter(overdue).length} icon={Clock} tone="warning" />
        <StatCard label="Completed" value={list.filter(buckets.completed).length} icon={CheckCircle2} tone="success" />
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {Object.keys(buckets).map((b) => <Button key={b} size="sm" variant={bucket === b ? "default" : "outline"} onClick={() => setBucket(b)} className="capitalize">{b}</Button>)}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.filter(buckets[bucket]).map((x) => (
          <Button variant="outline" key={x.id} onClick={() => setSel(x)} className="h-auto w-full whitespace-normal block text-left cursor-pointer p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant">
            <div className="flex items-start justify-between"><div><div className="font-semibold">{x.name}</div><div className="text-xs text-muted-foreground">{x.kind === "new_convert" ? "New convert" : "First timer"} · {fmtDate(x.encounteredAt)} · via {x.referrer}</div></div><StatusBadge status={overdue(x) ? "overdue" : x.status} /></div>
            <div className="mt-3 text-xs text-muted-foreground">Leader: {members.find((m) => m.id === x.assignedLeaderId)?.name ?? "Unassigned"}{x.nextContactAt && ` · next ${fmtDateTime(x.nextContactAt)}`}</div>
          </Button>
        ))}
      </div>

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {sel && (
            <>
              <SheetHeader><SheetTitle>{sel.name}</SheetTitle></SheetHeader>
              <div className="mt-2 text-sm text-muted-foreground">{sel.phone} · {sel.location} · consent {sel.consent ? "given" : "not given"}</div>
              <ol className="mt-5 space-y-2">
                {steps.map((s, i) => <li key={s} className="flex items-center gap-2 text-sm"><span className={i <= stepIdx[sel.status] ? "flex h-5 w-5 items-center justify-center rounded-full bg-gradient-brand text-[10px] text-brand-foreground" : "flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px]"}>{i + 1}</span>{s}</li>)}
              </ol>
              <div className="mt-5 grid gap-3">
                <div className="space-y-1"><Label>Assign follow-up leader</Label><Select value={sel.assignedLeaderId ?? ""} onValueChange={(v) => patch(sel, { assignedLeaderId: v, status: sel.status === "new" ? "assigned" : sel.status })}><SelectTrigger aria-label="Assign follow-up leader"><SelectValue placeholder="Choose leader" /></SelectTrigger><SelectContent>{leaders.map((l) => <SelectItem key={l.id + l.label} value={l.id}>{l.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label>Schedule contact</Label><Input aria-label="Schedule contact" type="datetime-local" onChange={(e) => e.target.value && patch(sel, { nextContactAt: new Date(e.target.value).toISOString(), status: "scheduled" })} /></div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => simulateCall(sel)}><PhoneCall className="mr-1 h-4 w-4" />AI call now</Button>
                  <Button variant="outline" onClick={async () => { await patch(sel, { status: "escalated" }); await em.create.mutateAsync({ id: `${tenantId}_esc${Date.now()}`, tenantId, title: `Follow-up needs a human: ${sel.name}`, detail: sel.notes || "Escalated from follow-up.", category: "followup", priority: "high", ownerName: "Pastoral team", status: "open", createdAt: new Date().toISOString() }); await run("createEscalation", { escalation_id: sel.id, category: "followup", priority: "high" }); }}><AlertTriangle className="mr-1 h-4 w-4" />Escalate to human</Button>
                  <Button variant="outline" onClick={async () => { await patch(sel, { status: "completed" }); await run("completeFollowUp", { followup_id: sel.id, outcome: "completed" }); }}><CheckCircle2 className="mr-1 h-4 w-4" />Complete</Button>
                </div>
                <div className="space-y-1"><Label>Needs, questions & notes</Label><Textarea aria-label="Needs, questions & notes" defaultValue={sel.notes} onBlur={(e) => patch(sel, { notes: e.target.value.slice(0, 1000) })} /></div>
              </div>
              <h2 className="mb-2 mt-6 flex items-center gap-2 text-sm font-semibold">Communication history <SimBadge /></h2>
              <div className="space-y-2">{sel.log.length ? sel.log.map((c) => <div key={c.id} className="rounded-lg border p-3 text-sm"><div className="flex justify-between text-xs text-muted-foreground"><span className="capitalize">{c.channel} · {c.by === "ai_agent" ? "Follow-up Agent" : "Leader"}</span>{fmtDateTime(c.at)}</div><div className="mt-1">{c.summary}</div><StatusBadge status={c.outcome === "success" ? "success" : c.outcome === "escalated" ? "escalated" : "failed"} className="mt-2" /></div>) : <p className="text-sm text-muted-foreground">No contact yet.</p>}</div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
