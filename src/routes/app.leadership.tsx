import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Confirm, PageHeader, Section, StatusBadge } from "@/components/app/kit";
import { useAction, useListData, useRepoMutations } from "@/hooks/use-data";
import { useApp } from "@/hooks/use-app";
import { timeAgo, pct } from "@/lib/format";
import type { Escalation, EscalationStatus, Priority } from "@/types";

export const Route = createFileRoute("/app/leadership")({
  head: () => ({ meta: [{ title: "Leadership & Escalations — Mobilizer" }, { name: "description", content: "Escalations and leadership accountability." }] }),
  component: LeadershipPage,
});

const cols: { id: EscalationStatus; label: string }[] = [{ id: "open", label: "Open" }, { id: "in_progress", label: "In progress" }, { id: "resolved", label: "Resolved" }];

function LeadershipPage() {
  const { tenantId, actor } = useApp();
  const list = useListData("escalations");
  const units = useListData("units");
  const members = useListData("members");
  const reports = useListData("reports");
  const mob = useListData("mobilization");
  const em = useRepoMutations("escalations");
  const run = useAction();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", detail: "", category: "member_issue" as Escalation["category"], priority: "medium" as Priority, ownerName: "" });

  const create = async () => {
    if (f.title.trim().length < 4) return toast.error("Give the issue a clear title");
    const e: Escalation = { id: `${tenantId}_esc${Date.now()}`, tenantId, ...f, title: f.title.trim().slice(0, 140), detail: f.detail.slice(0, 1000), ownerName: f.ownerName || "Unassigned", status: "open", createdAt: new Date().toISOString() };
    await em.create.mutateAsync(e);
    await run("createEscalation", { escalation_id: e.id, category: e.category, priority: e.priority });
    setOpen(false); setF({ ...f, title: "", detail: "" });
  };
  const move = async (e: Escalation, status: EscalationStatus) => {
    await em.update.mutateAsync({ id: e.id, patch: { status } });
    if (status === "resolved") await run("resolveEscalation", { escalation_id: e.id, resolved_by: actor.name });
  };

  const cells = units.filter((u) => u.type === "cell" || u.type === "home_group").map((u) => {
    const ms = members.filter((m) => m.groupIds.includes(u.id)).map((m) => m.id);
    const rs = mob.filter((r) => ms.includes(r.memberId) && r.serviceId.endsWith("svc_1"));
    return { unit: u, leader: members.find((m) => m.id === u.leaderId)?.name, mob: pct(rs.filter((r) => r.contacted).length, rs.length), overdue: reports.filter((r) => r.unitId === u.id && (r.status === "overdue" || r.status === "pending")).length };
  });

  return (
    <div>
      <PageHeader title="Leadership & Escalations" description="Issues reach the right leader and stay visible until they're resolved." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Escalate issue</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create escalation</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
              <div className="space-y-1"><Label>Details</Label><Textarea value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Category</Label><Select value={f.category} onValueChange={(v) => setF({ ...f, category: v as Escalation["category"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["transport", "mobilization", "followup", "report", "member_issue"].map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label>Priority</Label><Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v as Priority })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["low", "medium", "high", "urgent"].map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="space-y-1"><Label>Assign to</Label><Input value={f.ownerName} onChange={(e) => setF({ ...f, ownerName: e.target.value })} placeholder="Leader or team" /></div>
            </div>
            <DialogFooter><Button onClick={create}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      } />
      <div className="grid gap-4 lg:grid-cols-3">
        {cols.map((c) => (
          <div key={c.id} className="rounded-xl bg-muted/50 p-3">
            <div className="mb-3 flex items-center justify-between px-1 text-sm font-semibold">{c.label}<span className="text-xs text-muted-foreground">{list.filter((e) => e.status === c.id).length}</span></div>
            <div className="space-y-2">
              {list.filter((e) => e.status === c.id).map((e) => (
                <Card key={e.id} className="p-3 shadow-card animate-rise">
                  <div className="flex items-start gap-2"><StatusBadge status={e.priority} /><span className="ml-auto text-[11px] text-muted-foreground">{timeAgo(e.createdAt)}</span></div>
                  <div className="mt-2 text-sm font-medium">{e.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{e.detail}</div>
                  <div className="mt-2 text-xs"><span className="text-muted-foreground">Owner:</span> {e.ownerName}</div>
                  <div className="mt-3 flex gap-1.5">
                    {e.status === "open" && <Button size="sm" variant="outline" onClick={() => move(e, "in_progress")}>Start</Button>}
                    {e.status !== "resolved" && <Confirm title="Resolve this issue?" description={e.title} onConfirm={() => move(e, "resolved")} trigger={<Button size="sm">Resolve</Button>} />}
                    {e.status === "resolved" && <Button size="sm" variant="ghost" onClick={() => move(e, "open")}>Reopen</Button>}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Section title="Leader accountability" className="mt-4">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {cells.map((c) => (
            <div key={c.unit.id} className="rounded-lg border p-3 text-sm">
              <div className="font-medium">{c.unit.name}</div><div className="text-xs text-muted-foreground">{c.leader}</div>
              <div className="mt-2 flex justify-between text-xs"><span>Mobilization {c.mob}%</span><span className={c.overdue ? "text-destructive" : "text-success"}>{c.overdue ? `${c.overdue} reports outstanding` : "Reports up to date"}</span></div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
