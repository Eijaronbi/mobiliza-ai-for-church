import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, BellRing, Check } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Section, StatCard, StatusBadge } from "@/components/app/kit";
import { useAction, useListData, useRepoMutations } from "@/hooks/use-data";
import { useApp } from "@/hooks/use-app";
import { fmtDate } from "@/lib/format";
import type { Report, ReportTemplate, ReportType } from "@/types";
import { FileCheck2, FileClock, FileWarning, Heart } from "lucide-react";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Evangelism & Reports — Mobilizer" }, { name: "description", content: "Configurable reporting templates, deadlines and analytics." }, { property: "og:title", content: "Evangelism & Reports — Mobilizer" }, { property: "og:description", content: "Configurable reporting templates, deadlines and analytics." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ReportsPage,
});
const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 } };

function ReportsPage() {
  const { tenantId, can } = useApp();
  const reports = useListData("reports");
  const templates = useListData("templates");
  const units = useListData("units");
  const rm = useRepoMutations("reports");
  const tm = useRepoMutations("templates");
  const run = useAction();
  const [submit, setSubmit] = useState<Report | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [tpl, setTpl] = useState<ReportTemplate | null>(null);
  const uname = (id: string) => units.find((u) => u.id === id)?.name ?? "";
  const tname = (id: string) => templates.find((t) => t.id === id)?.name ?? "";
  const latest = reports.filter((r) => r.period === "Week 44");
  const totals = reports.reduce((a, r) => ({ saved: a.saved + Number(r.values.saved ?? 0), reached: a.reached + Number(r.values.reached ?? 0) }), { saved: 0, reached: 0 });
  const byUnit = units.filter((u) => u.type === "cell" || u.type === "department").map((u) => ({ name: u.name.replace(" Cell", ""), approved: reports.filter((r) => r.unitId === u.id && (r.status === "approved" || r.status === "submitted")).length }));

  const doSubmit = async () => {
    if (!submit) return;
    const t = templates.find((x) => x.id === submit.templateId)!;
    const missing = t.fields.filter((f) => f.kind === "number" && (vals[f.key] === undefined || vals[f.key] === "" || isNaN(Number(vals[f.key]))));
    if (missing.length) return toast.error(`Fill in: ${missing.map((m) => m.label).join(", ")}`);
    await rm.update.mutateAsync({ id: submit.id, patch: { status: "submitted", values: Object.fromEntries(t.fields.map((f) => [f.key, f.kind === "number" ? Number(vals[f.key]) : (vals[f.key] ?? "").slice(0, 500)])) } });
    await run("submitReport", { report_id: submit.id, template_id: submit.templateId, unit_id: submit.unitId });
    setSubmit(null); setVals({});
  };

  return (
    <div>
      <PageHeader title="Evangelism & Reports" description="Templates, deadlines, reminders, review and roll-ups for every cell and department." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Submitted this week" value={latest.filter((r) => r.status === "submitted" || r.status === "approved").length} icon={FileCheck2} tone="success" />
        <StatCard label="Pending" value={reports.filter((r) => r.status === "pending").length} icon={FileClock} tone="warning" />
        <StatCard label="Overdue" value={reports.filter((r) => r.status === "overdue").length} icon={FileWarning} tone="danger" />
        <StatCard label="Received Christ (4 wks)" value={totals.saved} icon={Heart} tone="brand" hint={`${totals.reached} people reached`} />
      </div>
      <Tabs defaultValue="queue" className="mt-4">
        <TabsList><TabsTrigger value="queue">Submissions</TabsTrigger><TabsTrigger value="templates">Templates</TabsTrigger><TabsTrigger value="analytics">Analytics</TabsTrigger></TabsList>
        <TabsContent value="queue">
          <Card className="overflow-x-auto p-2 shadow-card">
            <Table>
              <TableHeader><TableRow><TableHead>Unit</TableHead><TableHead className="hidden md:table-cell">Template</TableHead><TableHead>Period</TableHead><TableHead className="hidden sm:table-cell">Due</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {[...reports].sort((a, b) => b.period.localeCompare(a.period)).slice(0, 40).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{uname(r.unitId)}</TableCell>
                    <TableCell className="hidden md:table-cell">{tname(r.templateId)}</TableCell>
                    <TableCell>{r.period}</TableCell>
                    <TableCell className="hidden sm:table-cell">{fmtDate(r.dueAt)}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right">
                      {(r.status === "pending" || r.status === "overdue") && <div className="flex justify-end gap-1">
                        <Button aria-label={`Send reminder for ${uname(r.unitId)}`} size="sm" variant="ghost" onClick={() => run("reportOverdue", { report_id: r.id, unit_id: r.unitId, due_at: r.dueAt })}><BellRing className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => { setSubmit(r); setVals({}); }}>Submit</Button>
                      </div>}
                      {r.status === "submitted" && can("approve_reports") && <Button size="sm" variant="outline" onClick={async () => { await rm.update.mutateAsync({ id: r.id, patch: { status: "approved" } }); toast.success("Report approved"); }}><Check className="mr-1 h-3.5 w-3.5" />Approve</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="templates" className="grid gap-3 md:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="p-5 shadow-card">
              <div className="font-semibold">{t.name}</div><div className="text-xs capitalize text-muted-foreground">{t.type} · due {t.deadline} · reminder {t.reminder}</div>
              <ul className="mt-3 space-y-1 text-sm">{t.fields.map((f) => <li key={f.key} className="flex justify-between"><span>{f.label}</span><span className="text-xs text-muted-foreground">{f.kind}</span></li>)}</ul>
              <Button size="sm" variant="outline" className="mt-4" onClick={() => setTpl(t)}>Edit template</Button>
            </Card>
          ))}
          <Button variant="outline" className="h-auto w-full whitespace-normal block text-left flex items-center justify-center border-dashed p-5"><Button variant="ghost" onClick={() => setTpl({ id: `${tenantId}_tpl${Date.now()}`, tenantId, name: "New template", type: "outreach", deadline: "Sunday 18:00", reminder: "Saturday 17:00", fields: [{ key: "reached", label: "People reached", kind: "number" }] })}><Plus className="mr-1 h-4 w-4" />New template</Button></Button>
        </TabsContent>
        <TabsContent value="analytics">
          <Section title="Department & cell performance (reports submitted, 4 weeks)">
            <div className="h-72"><ResponsiveContainer><BarChart data={byUnit}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" fontSize={11} stroke="var(--muted-foreground)" /><YAxis fontSize={11} allowDecimals={false} stroke="var(--muted-foreground)" /><Tooltip {...tip} /><Bar dataKey="approved" fill="var(--chart-1)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
          </Section>
        </TabsContent>
      </Tabs>

      <Dialog open={!!submit} onOpenChange={(o) => !o && setSubmit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{submit && `${tname(submit.templateId)} — ${uname(submit.unitId)}`}</DialogTitle></DialogHeader>
          <div className="space-y-3">{submit && templates.find((t) => t.id === submit.templateId)?.fields.map((f) => <div key={f.key} className="space-y-1"><Label>{f.label}</Label><Input aria-label={f.label} type={f.kind === "number" ? "number" : "text"} min={0} value={vals[f.key] ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} /></div>)}</div>
          <DialogFooter><Button onClick={doSubmit}>Submit report</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!tpl} onOpenChange={(o) => !o && setTpl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Report template</DialogTitle></DialogHeader>
          {tpl && <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label>Name</Label><Input aria-label="Name" value={tpl.name} onChange={(e) => setTpl({ ...tpl, name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Type</Label><Select value={tpl.type} onValueChange={(v) => setTpl({ ...tpl, type: v as ReportType })}><SelectTrigger aria-label="Type"><SelectValue /></SelectTrigger><SelectContent>{["individual", "cell", "department", "outreach", "weekly", "monthly"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Deadline</Label><Input aria-label="Deadline" value={tpl.deadline} onChange={(e) => setTpl({ ...tpl, deadline: e.target.value })} /></div>
              <div className="space-y-1"><Label>Automatic reminder</Label><Input aria-label="Automatic reminder" value={tpl.reminder} onChange={(e) => setTpl({ ...tpl, reminder: e.target.value })} /></div>
            </div>
            <Label>Fields</Label>
            {tpl.fields.map((f, i) => <div key={i} className="flex gap-2"><Input aria-label="Fields" value={f.label} onChange={(e) => setTpl({ ...tpl, fields: tpl.fields.map((x, k) => (k === i ? { ...x, label: e.target.value, key: x.key || e.target.value.toLowerCase().replace(/\W+/g, "_") } : x)) })} /><Select value={f.kind} onValueChange={(v) => setTpl({ ...tpl, fields: tpl.fields.map((x, k) => (k === i ? { ...x, kind: v as "number" | "text" } : x)) })}><SelectTrigger aria-label={`Field ${i + 1} type`} className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="number">Number</SelectItem><SelectItem value="text">Text</SelectItem></SelectContent></Select><Button aria-label={`Remove field ${i + 1}`} size="icon" variant="ghost" onClick={() => setTpl({ ...tpl, fields: tpl.fields.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /></Button></div>)}
            <Button size="sm" variant="outline" onClick={() => setTpl({ ...tpl, fields: [...tpl.fields, { key: `field_${tpl.fields.length + 1}`, label: "New field", kind: "number" }] })}><Plus className="mr-1 h-4 w-4" />Add field</Button>
          </div>}
          <DialogFooter><Button onClick={async () => { if (!tpl) return; const exists = templates.some((t) => t.id === tpl.id); if (exists) await tm.update.mutateAsync({ id: tpl.id, patch: tpl }); else await tm.create.mutateAsync(tpl); toast.success("Template saved"); setTpl(null); }}>Save template</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
