import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, CheckCircle2, Clock, Bus, HeartHandshake, AlertTriangle, FileWarning, Bot, Megaphone } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { PageHeader, Section, StatCard, StatusBadge, ProgressBar, SimBadge } from "@/components/app/kit";
import { useListData } from "@/hooks/use-data";
import { useApp, useTenant } from "@/hooks/use-app";
import { fmtDateTime, pct, timeAgo, fmtDate } from "@/lib/format";
import banner from "@/assets/hero-worship.jpg";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Command Centre — Mobilizer" }, { name: "description", content: "Live operational overview of your church." }, { property: "og:title", content: "Command Centre — Mobilizer" }, { property: "og:description", content: "Live operational overview of your church." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: CommandCentre,
});

const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 } };

function CommandCentre() {
  const tenant = useTenant();
  const { actor } = useApp();
  const members = useListData("members");
  const services = useListData("services");
  const mob = useListData("mobilization");
  const transport = useListData("transport");
  const followups = useListData("followups");
  const reports = useListData("reports");
  const escalations = useListData("escalations");
  const activities = useListData("activities");
  const executions = useListData("executions");
  const units = useListData("units");

  const next = [...services].filter((s) => s.date > "2026-11-05").sort((a, b) => a.date.localeCompare(b.date))[0];
  const nm = mob.filter((r) => r.serviceId === next?.id);
  const c = {
    contacted: nm.filter((r) => r.contacted).length, confirmed: nm.filter((r) => r.response === "confirmed").length,
    unavailable: nm.filter((r) => r.response === "unavailable").length, awaiting: nm.filter((r) => r.response === "no_response" || r.response === "pending").length,
    transport: transport.filter((t) => t.serviceId === next?.id).length, followups: nm.filter((r) => r.followUpPending).length,
  };
  const fuAwait = followups.filter((f) => ["new", "assigned", "scheduled", "failed"].includes(f.status)).length;
  const openIssues = escalations.filter((e) => e.status !== "resolved");
  const overdue = reports.filter((r) => r.status === "overdue");

  const attention = [
    ...transport.filter((t) => t.status === "requested" || t.status === "leader_review").slice(0, 2).map((t) => ({ id: t.id, title: `${members.find((m) => m.id === t.memberId)?.name} requested ${t.kind === "financial" ? "transport support" : "a pickup"}`, priority: "high", owner: "Transport Team Lead", at: t.createdAt, status: t.status, to: "/app/transport" as const })),
    ...followups.filter((f) => f.status === "new").slice(0, 2).map((f) => ({ id: f.id, title: `First timer ${f.name} awaiting initial contact`, priority: "medium", owner: "Follow-up team", at: f.encounteredAt, status: "pending", to: "/app/followup" as const })),
    ...overdue.slice(0, 2).map((r) => ({ id: r.id, title: `${units.find((u) => u.id === r.unitId)?.name} report overdue`, priority: "low", owner: r.submittedBy, at: r.dueAt, status: "overdue", to: "/app/reports" as const })),
    ...openIssues.slice(0, 3).map((e) => ({ id: e.id, title: e.title, priority: e.priority, owner: e.ownerName, at: e.createdAt, status: e.status, to: "/app/leadership" as const })),
  ];

  const trend = ["Oct 4", "Oct 11", "Oct 18", "Oct 25", "Nov 1"].map((w, k) => ({ week: w, confirmed: Math.round(members.length * (0.62 + k * 0.035)), actual: Math.round(members.length * (0.55 + k * 0.03)) }));
  const deptPerf = units.filter((u) => u.type === "department").map((d) => {
    const ms = members.filter((m) => m.departmentId === d.id).map((m) => m.id);
    const rs = nm.filter((r) => ms.includes(r.memberId));
    return { name: d.name, rate: pct(rs.filter((r) => r.contacted).length, rs.length) };
  });
  const cellRep = [{ name: "Submitted", value: reports.filter((r) => r.status === "submitted" || r.status === "approved").length }, { name: "Pending", value: reports.filter((r) => r.status === "pending").length }, { name: "Overdue", value: overdue.length }];
  const fuRate = pct(followups.filter((f) => f.status === "completed" || f.status === "contacted").length, followups.length);

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl shadow-card animate-rise">
        <img src={banner} alt="" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-banner" />
        <div className="relative flex flex-col gap-4 p-6 text-hero-foreground md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-hero-foreground/70">{tenant.name}</div>
            <h1 className="mt-1 text-2xl font-bold">Good afternoon, {actor.name}</h1>
            <p className="mt-1 text-sm text-hero-foreground/80">{openIssues.length} items need attention · {c.awaiting} members yet to respond for {next?.name}.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild className="bg-gradient-brand text-brand-foreground"><Link to="/app/mobilization"><Megaphone className="mr-1 h-4 w-4" />Mobilization</Link></Button>
            <Button asChild variant="secondary"><Link to="/app/assistant">Ask AI</Link></Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total members" value={members.length} icon={Users} delta={4} />
        <StatCard label="Attendance confirmations" value={c.confirmed} icon={CheckCircle2} tone="success" delta={6} delay={40} />
        <StatCard label="Yet to respond" value={c.awaiting} icon={Clock} tone="warning" delay={80} />
        <StatCard label="Transport requests" value={c.transport} icon={Bus} tone="info" delay={120} />
        <StatCard label="First timers awaiting follow-up" value={fuAwait} icon={HeartHandshake} tone="brand" delay={160} />
        <StatCard label="Unresolved issues" value={openIssues.length} icon={AlertTriangle} tone="danger" delay={200} />
        <StatCard label="Reports overdue" value={overdue.length} icon={FileWarning} tone="danger" delta={-12} delay={240} />
        <StatCard label="Active AI operations" value={executions.filter((e) => e.at > "2026-11-05T00").length} icon={Bot} tone="brand" hint="Simulated agents" delay={280} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="Upcoming service" className="lg:col-span-1" action={<StatusBadge status="scheduled" />}>
          {next && (
            <>
              <div className="font-display text-lg font-bold">{next.name}</div>
              <div className="text-sm text-muted-foreground">{fmtDateTime(next.date)} · {next.location}</div>
              <div className="mt-4 flex items-center justify-between text-xs font-medium"><span>Mobilization progress</span><span>{pct(c.contacted, nm.length)}%</span></div>
              <div className="mt-1.5"><ProgressBar value={pct(c.contacted, nm.length)} /></div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {[["Contacted", c.contacted], ["Confirmed", c.confirmed], ["Unavailable", c.unavailable], ["Awaiting", c.awaiting], ["Transport", c.transport], ["Follow-ups", c.followups]].map(([l, v]) => (
                  <div key={l as string} className="rounded-lg bg-muted/60 p-2.5"><dt className="text-[11px] text-muted-foreground">{l}</dt><dd className="font-display text-lg font-bold tabular-nums">{v}</dd></div>
                ))}
              </dl>
            </>
          )}
        </Section>

        <Section title="Attention required" className="lg:col-span-2" action={<Button asChild size="sm" variant="ghost"><Link to="/app/leadership">View all</Link></Button>}>
          <div className="divide-y">
            {attention.map((a) => (
              <div key={a.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                <StatusBadge status={a.priority} className="w-fit" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.owner} · {fmtDate(a.at)}</div>
                </div>
                <StatusBadge status={a.status} className="w-fit" />
                <Button asChild size="sm" variant="outline"><Link to={a.to}>Review</Link></Button>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="Attendance trend" className="lg:col-span-2">
          <div className="h-60">
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" fontSize={11} stroke="var(--muted-foreground)" /><YAxis fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip {...tip} />
                <Area dataKey="confirmed" stroke="var(--chart-1)" fill="url(#g1)" strokeWidth={2} />
                <Area dataKey="actual" stroke="var(--chart-3)" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="Recent activity" action={<SimBadge />}>
          <ul className="space-y-3">
            {activities.slice(0, 7).map((a) => (
              <li key={a.id} className="flex gap-3 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" /><div><span className="font-medium">{a.actor}</span> <span className="text-muted-foreground">{a.text}</span><div className="text-[11px] text-muted-foreground">{timeAgo(a.at)}</div></div></li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="Department mobilization" className="lg:col-span-1">
          <div className="h-52"><ResponsiveContainer><BarChart data={deptPerf} layout="vertical"><XAxis type="number" domain={[0, 100]} hide /><YAxis type="category" dataKey="name" width={80} fontSize={11} stroke="var(--muted-foreground)" /><Tooltip {...tip} /><Bar dataKey="rate" fill="var(--chart-2)" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div>
        </Section>
        <Section title="Cell reporting completion">
          <div className="h-40" aria-hidden="true" inert><ResponsiveContainer><PieChart accessibilityLayer={false}><Pie data={cellRep} dataKey="value" innerRadius={40} outerRadius={60} paddingAngle={3} isAnimationActive={false}>{["var(--chart-3)", "var(--chart-4)", "var(--chart-5)"].map((f) => <Cell key={f} fill={f} />)}</Pie><Tooltip {...tip} /></PieChart></ResponsiveContainer></div>
          <dl className="flex flex-wrap justify-center gap-3 text-xs">{cellRep.map((item) => <div key={item.name}><dt className="text-muted-foreground">{item.name}</dt><dd className="font-semibold">{item.value}</dd></div>)}</dl>
        </Section>
        <Section title="Follow-up completion rate">
          <div className="flex h-52 flex-col items-center justify-center">
            <div className="font-display text-5xl font-extrabold text-brand">{fuRate}%</div>
            <div className="mt-2 text-sm text-muted-foreground">of first timers reached</div>
            <div className="mt-4 w-full"><ProgressBar value={fuRate} tone="success" /></div>
          </div>
        </Section>
      </div>
    </div>
  );
}
