import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Plus, Users, UserCog, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Section } from "@/components/app/kit";
import { useListData, useRepoMutations } from "@/hooks/use-data";
import { useApp } from "@/hooks/use-app";
import type { OrgUnit, UnitType } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/structure")({
  head: () => ({ meta: [{ title: "Church Structure — Mobilizer" }, { name: "description", content: "Configure branches, departments, cells and leaders." }, { property: "og:title", content: "Church Structure — Mobilizer" }, { property: "og:description", content: "Configure branches, departments, cells and leaders." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: StructurePage,
});

const types: UnitType[] = ["branch", "zone", "department", "unit", "cell", "home_group", "team"];

function StructurePage() {
  const { tenantId } = useApp();
  const units = useListData("units");
  const members = useListData("members");
  const um = useRepoMutations("units");
  const mm = useRepoMutations("members");
  const [sel, setSel] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "cell" as UnitType, parentId: "" });
  const selected = units.find((u) => u.id === sel) ?? units[0];
  const inUnit = members.filter((m) => m.groupIds.includes(selected?.id ?? "") || m.departmentId === selected?.id);

  const Node = ({ u, depth }: { u: OrgUnit; depth: number }) => {
    const kids = units.filter((x) => x.parentId === u.id);
    return (
      <div>
        <button onClick={() => setSel(u.id)} className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted", selected?.id === u.id && "bg-accent text-accent-foreground")} style={{ paddingLeft: 8 + depth * 18 }}>
          {kids.length ? <ChevronRight className="h-3.5 w-3.5 rotate-90" /> : <span className="w-3.5" />}
          <span className="font-medium">{u.name}</span>
          <Badge variant="secondary" className="ml-auto text-[10px] capitalize">{u.type.replace("_", " ")}</Badge>
        </button>
        {kids.map((k) => <Node key={k.id} u={k} depth={depth + 1} />)}
      </div>
    );
  };

  const create = async () => {
    if (form.name.trim().length < 2) return toast.error("Enter a unit name");
    await um.create.mutateAsync({ id: `${tenantId}_u${Date.now()}`, tenantId, name: form.name.trim(), type: form.type, parentId: form.parentId || undefined });
    toast.success(`${form.name} created`); setOpen(false); setForm({ name: "", type: "cell", parentId: "" });
  };

  return (
    <div>
      <PageHeader title="Church Structure" description="Every church is organised differently. Create the units, hierarchy and leadership that match yours." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New unit</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create organisational unit</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Name</Label><Input aria-label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Grace Cell" /></div>
              <div className="space-y-1"><Label>Type</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as UnitType })}><SelectTrigger aria-label="Type"><SelectValue /></SelectTrigger><SelectContent>{types.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Parent</Label><Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v })}><SelectTrigger aria-label="Parent"><SelectValue placeholder="Top level" /></SelectTrigger><SelectContent>{units.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <DialogFooter><Button onClick={create}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      } />
      <div className="grid gap-4 lg:grid-cols-5">
        <Section title="Hierarchy" className="lg:col-span-2">
          <div className="space-y-0.5">{units.filter((u) => !u.parentId).map((u) => <Node key={u.id} u={u} depth={0} />)}</div>
        </Section>
        {selected && (
          <Card className="p-5 shadow-card lg:col-span-3">
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{selected.name}</h2><Badge variant="secondary" className="capitalize">{selected.type.replace("_", " ")}</Badge></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label className="flex items-center gap-1"><UserCog className="h-3.5 w-3.5" />Leader</Label>
                <Select value={selected.leaderId ?? ""} onValueChange={async (v) => { await um.update.mutateAsync({ id: selected.id, patch: { leaderId: v } }); toast.success("Leader assigned"); }}>
                  <SelectTrigger aria-label="Assign unit leader"><SelectValue placeholder="Assign leader" /></SelectTrigger>
                  <SelectContent>{members.slice(0, 80).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />Add member</Label>
                <Select value="" onValueChange={async (v) => { const m = members.find((x) => x.id === v)!; await mm.update.mutateAsync({ id: v, patch: { groupIds: [...new Set([...m.groupIds, selected.id])] } }); toast.success(`${m.name} added to ${selected.name}`); }}>
                  <SelectTrigger aria-label="Add member to unit"><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>{members.filter((m) => !m.groupIds.includes(selected.id)).slice(0, 80).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <h3 className="mb-2 mt-6 text-sm font-semibold">{inUnit.length} members</h3>
            <div className="max-h-[420px] divide-y overflow-auto rounded-lg border">
              {inUnit.map((m) => (
                <div key={m.id} className="flex items-center gap-2 p-2.5 text-sm">
                  <span className="flex-1">{m.name}{m.groupIds.length > 1 && <span className="ml-2 text-xs text-muted-foreground">· {m.groupIds.length} groups</span>}</span>
                  <Select value="" onValueChange={async (v) => { await mm.update.mutateAsync({ id: m.id, patch: { groupIds: m.groupIds.map((g) => (g === selected.id ? v : g)) } }); toast.success(`Moved ${m.name}`); }}>
                    <SelectTrigger aria-label={`Move ${m.name} to group`} className="h-8 w-[130px] text-xs"><ArrowRightLeft className="h-3 w-3" /><SelectValue placeholder="Move to" /></SelectTrigger>
                    <SelectContent>{units.filter((u) => u.id !== selected.id && (u.type === "cell" || u.type === "home_group" || u.type === "team")).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
