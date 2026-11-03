import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PageHeader, Section, StatCard, StatusBadge } from "@/components/app/kit";
import { useListData, useRepoMutations } from "@/hooks/use-data";
import { fmtDateTime, pct } from "@/lib/format";
import { CheckCircle2, UserCheck, UserX, Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/attendance")({
  head: () => ({ meta: [{ title: "Attendance — Mobilizer" }, { name: "description", content: "Confirmed vs actual attendance and analytics." }, { property: "og:title", content: "Attendance — Mobilizer" }, { property: "og:description", content: "Confirmed vs actual attendance and analytics." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: AttendancePage,
});

const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 } };

function AttendancePage() {
  const services = useListData("services").filter((s) => ["sunday", "midweek"].includes(s.kind)).sort((a, b) => a.date.localeCompare(b.date));
  const all = useListData("mobilization");
  const members = useListData("members");
  const followups = useListData("followups");
  const mm = useRepoMutations("mobilization");
  const [sid, setSid] = useState("");
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState("weekly");
  const svc = services.find((s) => s.id === sid) ?? services.find((s) => all.some((r) => r.serviceId === s.id && r.attended !== undefined)) ?? services[0];
  const rec = all.filter((r) => r.serviceId === svc?.id);
  const confirmed = rec.filter((r) => r.response === "confirmed").length;
  const actual = rec.filter((r) => r.attended).length;
  const absent = rec.filter((r) => r.response === "confirmed" && r.attended === false).length;
  const visitors = followups.filter((f) => f.kind === "first_timer").length;
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? "";

  const weekly = ["Oct 4", "Oct 11", "Oct 18", "Oct 25", "Nov 1"].map((w, k) => ({ label: w, confirmed: Math.round(members.length * (0.6 + k * 0.04)), actual: Math.round(members.length * (0.52 + k * 0.035)) }));
  const monthly = ["Jul", "Aug", "Sep", "Oct"].map((m, k) => ({ label: m, confirmed: Math.round(members.length * 4 * (0.58 + k * 0.03)), actual: Math.round(members.length * 4 * (0.5 + k * 0.03)) }));

  return (
    <div>
      <PageHeader title="Attendance" description="Confirmed attendance is what members told us. Actual attendance is who was marked present." actions={
        <Select value={svc?.id} onValueChange={setSid}><SelectTrigger aria-label="Select attendance service" className="w-[280px]"><SelectValue /></SelectTrigger><SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {fmtDateTime(s.date)}</SelectItem>)}</SelectContent></Select>
      } />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Confirmed" value={confirmed} icon={CheckCircle2} tone="info" />
        <StatCard label="Actually attended" value={actual} icon={UserCheck} tone="success" hint={`${pct(actual, confirmed)}% of confirmed`} />
        <StatCard label="Confirmed but absent" value={absent} icon={UserX} tone="danger" />
        <StatCard label="First-time visitors" value={visitors} icon={Sparkles} tone="brand" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Section title="Mark attendance" className="lg:col-span-2" action={<Input aria-label="Search attendance members" className="h-8 w-40" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />}>
          <div className="max-h-[460px] divide-y overflow-auto">
            {rec.filter((r) => name(r.memberId).toLowerCase().includes(q.toLowerCase())).slice(0, 80).map((r) => (
              <label key={r.id} className="flex cursor-pointer items-center gap-3 py-2 text-sm">
                <Checkbox checked={!!r.attended} onCheckedChange={(v) => mm.update.mutate({ id: r.id, patch: { attended: !!v } })} />
                <span className="flex-1">{name(r.memberId)}</span>
                <StatusBadge status={r.response} />
              </label>
            ))}
          </div>
        </Section>
        <Section title="Attendance analytics" className="lg:col-span-3" action={<div role="group" aria-label="Analytics period" className="flex gap-1"><Button size="sm" variant={period === "weekly" ? "default" : "ghost"} aria-pressed={period === "weekly"} onClick={() => setPeriod("weekly")}>Weekly</Button><Button size="sm" variant={period === "monthly" ? "default" : "ghost"} aria-pressed={period === "monthly"} onClick={() => setPeriod("monthly")}>Monthly</Button></div>}>
          <div className="h-80">
            <ResponsiveContainer>
              <BarChart data={period === "weekly" ? weekly : monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" fontSize={11} stroke="var(--muted-foreground)" /><YAxis fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="confirmed" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="actual" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>
    </div>
  );
}
