import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, MapPin, Users, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/kit";
import { useListData, useRepoMutations } from "@/hooks/use-data";
import { useApp } from "@/hooks/use-app";
import { fmtDateTime } from "@/lib/format";
import type { Service, ServiceKind } from "@/types";

export const Route = createFileRoute("/app/services")({
  head: () => ({ meta: [{ title: "Services & Events — Mobilizer" }, { name: "description", content: "Schedule services, conferences and outreach." }] }),
  component: ServicesPage,
});

const kinds: ServiceKind[] = ["sunday", "midweek", "prayer", "conference", "special", "outreach"];
const schema = z.object({ name: z.string().trim().min(3).max(100), location: z.string().trim().min(2).max(100), expected: z.number().int().min(1).max(100000), date: z.string().min(10) });

function ServicesPage() {
  const { tenantId } = useApp();
  const services = [...useListData("services")].sort((a, b) => a.date.localeCompare(b.date));
  const workflows = useListData("workflows");
  const members = useListData("members");
  const sm = useRepoMutations("services");
  const [edit, setEdit] = useState<Service | null>(null);
  const local = (iso: string) => new Date(new Date(iso).getTime() + 3600_000).toISOString().slice(0, 16);

  const save = async () => {
    if (!edit) return;
    const p = schema.safeParse(edit);
    if (!p.success) return toast.error("Check the name, location, date and expected attendance");
    if (services.some((s) => s.id === edit.id)) await sm.update.mutateAsync({ id: edit.id, patch: edit }); else await sm.create.mutateAsync(edit);
    toast.success("Service saved"); setEdit(null);
  };
  const blank = (): Service => ({ id: `${tenantId}_svc${Date.now()}`, tenantId, name: "", kind: "special", date: new Date(Date.now() + 7 * 864e5).toISOString(), location: "", expected: 50, leaderIds: [], workflowId: workflows[0]?.id ?? "", contactSchedule: ["-1d 10:00"] });

  return (
    <div>
      <PageHeader title="Services & Events" description="Every service carries its own time, place, leaders, workflow and contact schedule." actions={<Button onClick={() => setEdit(blank())}><Plus className="mr-1 h-4 w-4" />New service</Button>} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {services.map((s) => (
          <Card key={s.id} className="p-5 shadow-card transition-all hover:shadow-elegant">
            <div className="flex items-center gap-2"><Badge variant="secondary" className="capitalize">{s.kind}</Badge>{s.date < "2026-11-05" && <Badge variant="outline">Past</Badge>}</div>
            <div className="mt-2 font-display text-lg font-bold">{s.name}</div>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{fmtDateTime(s.date)}</div>
              <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{s.location}</div>
              <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Expected {s.expected} · Leaders: {s.leaderIds.map((l) => members.find((m) => m.id === l)?.name.split(" ")[0]).join(", ") || "—"}</div>
            </div>
            <div className="mt-3 text-xs">Contact schedule: {s.contactSchedule.join(" · ")}</div>
            <Button size="sm" variant="outline" className="mt-4" onClick={() => setEdit(s)}>Edit</Button>
          </Card>
        ))}
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Service details</DialogTitle></DialogHeader>
          {edit && <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2"><Label>Name</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Type</Label><Select value={edit.kind} onValueChange={(v) => setEdit({ ...edit, kind: v as ServiceKind })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{kinds.map((k) => <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Date & time</Label><Input type="datetime-local" value={local(edit.date)} onChange={(e) => e.target.value && setEdit({ ...edit, date: new Date(e.target.value + "+01:00").toISOString() })} /></div>
            <div className="space-y-1"><Label>Location</Label><Input value={edit.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} /></div>
            <div className="space-y-1"><Label>Expected attendance</Label><Input type="number" value={edit.expected} onChange={(e) => setEdit({ ...edit, expected: Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label>Mobilization workflow</Label><Select value={edit.workflowId} onValueChange={(v) => setEdit({ ...edit, workflowId: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{workflows.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Responsible leader</Label><Select value={edit.leaderIds[0] ?? ""} onValueChange={(v) => setEdit({ ...edit, leaderIds: [v, ...edit.leaderIds.slice(1)] })}><SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger><SelectContent>{members.slice(0, 60).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1 sm:col-span-2"><Label>Contact schedule (comma separated, relative to start)</Label><Input value={edit.contactSchedule.join(", ")} onChange={(e) => setEdit({ ...edit, contactSchedule: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></div>
          </div>}
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
