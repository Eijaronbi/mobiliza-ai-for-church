import { CONTACT_CHANNELS } from "@/config/channels";
import { safeCell } from "@/lib/csv-safe";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Plus, Upload, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatusBadge } from "@/components/app/kit";
import { useAction, useListData, useRepoMutations } from "@/hooks/use-data";
import { useApp } from "@/hooks/use-app";
import type { Member } from "@/types";

export const Route = createFileRoute("/app/members/")({
  head: () => ({ meta: [{ title: "Members — Mobilizer" }, { name: "description", content: "Member directory and management." }, { property: "og:title", content: "Members — Mobilizer" }, { property: "og:description", content: "Member directory and management." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: MembersPage,
});

export const memberSchema = z.object({
  name: z.string().trim().min(2, "Enter a full name").max(80),
  phone: z.string().trim().regex(/^\+?[0-9 ]{7,18}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")),
  location: z.string().trim().min(2, "Enter a location").max(60),
  status: z.enum(["active", "new", "inactive", "visitor"]),
  departmentId: z.string().optional(),
  groupId: z.string().optional(),
  contactPreference: z.enum(["call", "whatsapp_call", "sms", "whatsapp", "email"]),
  consent: z.boolean(),
});
type FormV = z.infer<typeof memberSchema>;

export function MemberForm({ initial, onSubmit, submitLabel }: { initial?: Partial<FormV>; onSubmit: (v: FormV) => void; submitLabel: string }) {
  const units = useListData("units");
  const f = useForm<FormV>({ resolver: zodResolver(memberSchema), defaultValues: { name: "", phone: "", email: "", location: "", status: "new", contactPreference: "whatsapp", consent: true, ...initial } });
  const err = f.formState.errors;
  const sel = (name: "status" | "departmentId" | "groupId" | "contactPreference", opts: [string, string][]) => (
    <Select value={f.watch(name) ?? ""} onValueChange={(v) => f.setValue(name, v as never)}>
      <SelectTrigger aria-label={{ status: "Membership status", departmentId: "Department", groupId: "Cell or group", contactPreference: "Contact preference" }[name]}><SelectValue placeholder="Select" /></SelectTrigger>
      <SelectContent>{opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
    </Select>
  );
  return (
    <form onSubmit={f.handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-2">
      {(["name", "phone", "email", "location"] as const).map((k) => (
        <div key={k} className="space-y-1"><Label className="capitalize">{k === "name" ? "Full name" : k}</Label><Input aria-label={k === "name" ? "Full name" : k} {...f.register(k)} />{err[k] && <p className="text-xs text-destructive">{err[k]?.message}</p>}</div>
      ))}
      <div className="space-y-1"><Label>Membership status</Label>{sel("status", [["active", "Active"], ["new", "New"], ["inactive", "Inactive"], ["visitor", "Visitor"]])}</div>
      <div className="space-y-1"><Label>Contact preference</Label>{sel("contactPreference", CONTACT_CHANNELS.map((c) => [c.id, c.label] as [string, string]))}</div>
      <div className="space-y-1"><Label>Department</Label>{sel("departmentId", units.filter((u) => u.type === "department").map((u) => [u.id, u.name]))}</div>
      <div className="space-y-1"><Label>Cell / group</Label>{sel("groupId", units.filter((u) => u.type === "cell" || u.type === "home_group").map((u) => [u.id, u.name]))}</div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><Switch checked={f.watch("consent")} onCheckedChange={(v) => f.setValue("consent", v)} />Member consents to be contacted</label>
      <DialogFooter className="sm:col-span-2"><Button type="submit">{submitLabel}</Button></DialogFooter>
    </form>
  );
}

function MembersPage() {
  const { tenantId } = useApp();
  const members = useListData("members");
  const units = useListData("units");
  const { create } = useRepoMutations("members");
  const run = useAction();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [dept, setDept] = useState("all");
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const unitName = (id?: string) => units.find((u) => u.id === id)?.name ?? "—";

  const rows = useMemo(() => members.filter((m) =>
    (status === "all" || m.status === status) && (dept === "all" || m.departmentId === dept) &&
    (!q || `${m.name} ${m.phone} ${m.location}`.toLowerCase().includes(q.toLowerCase()))), [members, q, status, dept]);

  const add = async (v: FormV) => {
    const m: Member = { id: `${tenantId}_m${Date.now()}`, tenantId, name: v.name, phone: v.phone, email: v.email, location: v.location, status: v.status, departmentId: v.departmentId, groupIds: v.groupId ? [v.groupId] : [], contactPreference: v.contactPreference, consent: v.consent, joinedAt: new Date().toISOString(), leaderId: units.find((u) => u.id === v.groupId)?.leaderId };
    await create.mutateAsync(m);
    await run("createMember", { member_id: m.id, group_ids: m.groupIds });
    setOpen(false);
  };

  const exportCsv = () => {
    const csv = Papa.unparse(rows.map((m) => ({ name: safeCell(m.name), phone: safeCell(m.phone), email: safeCell(m.email), location: safeCell(m.location), status: m.status, department: safeCell(unitName(m.departmentId)), group: safeCell(unitName(m.groupIds[0])), contact_preference: m.contactPreference, consent: m.consent })));
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "members.csv"; a.click();
  };
  const importCsv = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: async (res) => {
        let ok = 0, bad = 0;
        for (const r of res.data) {
          const p = memberSchema.safeParse({ name: r.name, phone: r.phone, email: r.email ?? "", location: r.location ?? "Unknown", status: "new", contactPreference: (r.contact_preference as FormV["contactPreference"]) || "whatsapp", consent: r.consent !== "false" });
          if (!p.success) { bad++; continue; }
          await create.mutateAsync({ id: `${tenantId}_m${Date.now()}_${ok}`, tenantId, ...p.data, departmentId: undefined, groupIds: [], joinedAt: new Date().toISOString() });
          ok++;
        }
        toast.success(`Imported ${ok} members`, { description: bad ? `${bad} rows skipped (invalid name or phone).` : undefined });
      },
    });
  };

  return (
    <div>
      <PageHeader title="Members" description={`${members.length} people in the directory.`} actions={<>
        <input ref={fileRef} type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
        <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-1 h-4 w-4" />Import CSV</Button>
        <Button variant="outline" onClick={exportCsv}><Download className="mr-1 h-4 w-4" />Export</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Add member</Button></DialogTrigger>
          <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Add member</DialogTitle></DialogHeader><MemberForm onSubmit={add} submitLabel="Add member" /></DialogContent>
        </Dialog>
      </>} />
      <Card className="p-4 shadow-card">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search members" className="pl-9" placeholder="Search name, phone, location" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Select value={status} onValueChange={setStatus}><SelectTrigger aria-label="Filter member status" className="sm:w-40"><SelectValue /></SelectTrigger><SelectContent>{["all", "active", "new", "inactive", "visitor"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s === "all" ? "All statuses" : s}</SelectItem>)}</SelectContent></Select>
          <Select value={dept} onValueChange={setDept}><SelectTrigger aria-label="Filter department" className="sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All departments</SelectItem>{units.filter((u) => u.type === "department").map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="hidden md:table-cell">Phone</TableHead><TableHead className="hidden lg:table-cell">Location</TableHead><TableHead className="hidden md:table-cell">Department</TableHead><TableHead className="hidden lg:table-cell">Cell</TableHead><TableHead>Status</TableHead><TableHead className="hidden sm:table-cell">Consent</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.slice(0, 100).map((m) => (
                <TableRow key={m.id} className="cursor-pointer">
                  <TableCell><Link to="/app/members/$memberId" params={{ memberId: m.id }} className="font-medium hover:text-brand">{m.name}</Link><div className="text-xs text-muted-foreground md:hidden">{m.phone}</div></TableCell>
                  <TableCell className="hidden md:table-cell">{m.phone}</TableCell>
                  <TableCell className="hidden lg:table-cell">{m.location}</TableCell>
                  <TableCell className="hidden md:table-cell">{unitName(m.departmentId)}</TableCell>
                  <TableCell className="hidden lg:table-cell">{unitName(m.groupIds[0])}</TableCell>
                  <TableCell><StatusBadge status={m.status} /></TableCell>
                  <TableCell className="hidden sm:table-cell">{m.consent ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {rows.length > 100 && <p className="mt-3 text-xs text-muted-foreground">Showing 100 of {rows.length}. Refine your search to see more.</p>}
      </Card>
    </div>
  );
}
