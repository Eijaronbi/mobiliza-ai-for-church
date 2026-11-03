import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Pencil, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Empty, SimBadge, StatusBadge } from "@/components/app/kit";
import { useAction, useListData, useRepoMutations } from "@/hooks/use-data";
import { fmtDate, fmtDateTime, initials } from "@/lib/format";
import { MemberForm } from "./app.members.index";

export const Route = createFileRoute("/app/members/$memberId")({
  head: () => ({ meta: [{ title: "Member profile — Mobilizer" }, { name: "description", content: "Member operational history." }] }),
  component: MemberProfile,
});

function MemberProfile() {
  const { memberId } = Route.useParams();
  const members = useListData("members");
  const units = useListData("units");
  const services = useListData("services");
  const mob = useListData("mobilization");
  const transport = useListData("transport");
  const activities = useListData("activities");
  const followups = useListData("followups");
  const { update } = useRepoMutations("members");
  const run = useAction();
  const [open, setOpen] = useState(false);
  const m = members.find((x) => x.id === memberId);
  if (!m) return <Empty text="Member not found in this church." />;
  const u = (id?: string) => units.find((x) => x.id === id);
  const leader = members.find((x) => x.id === m.leaderId);
  const myMob = mob.filter((r) => r.memberId === m.id);
  const myTr = transport.filter((t) => t.memberId === m.id);
  const led = units.filter((x) => x.leaderId === m.id);
  const timeline = [
    ...myMob.map((r) => ({ at: r.updatedAt, text: `Attendance ${r.response.replace("_", " ")} for ${services.find((s) => s.id === r.serviceId)?.name}` })),
    ...myTr.map((t) => ({ at: t.createdAt, text: `Transport request — ${t.status.replace("_", " ")}` })),
    ...activities.filter((a) => a.actor === m.name).map((a) => ({ at: a.at, text: a.text })),
    { at: m.joinedAt, text: "Joined the church" },
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3"><Link to="/app/members"><ArrowLeft className="mr-1 h-4 w-4" />Members</Link></Button>
      <Card className="mb-4 flex flex-col gap-4 p-5 shadow-card sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand font-display text-xl font-bold text-brand-foreground">{initials(m.name)}</div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold">{m.name}</h1><StatusBadge status={m.status} /></div>
          <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground"><span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{m.phone}</span><span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{m.email || "—"}</span><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{m.location}</span></div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="outline"><Pencil className="mr-1 h-4 w-4" />Edit</Button></DialogTrigger>
          <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Edit member</DialogTitle></DialogHeader>
            <MemberForm submitLabel="Save changes" initial={{ ...m, groupId: m.groupIds[0] }} onSubmit={async (v) => {
              await update.mutateAsync({ id: m.id, patch: { ...v, groupIds: v.groupId ? [v.groupId, ...m.groupIds.slice(1)] : m.groupIds } });
              await run("updateMember", { member_id: m.id, fields: Object.keys(v) }); setOpen(false);
            }} />
          </DialogContent>
        </Dialog>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="h-auto flex-wrap justify-start">
          {["overview", "attendance", "communication", "follow-up", "transportation", "leadership", "timeline"].map((t) => <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>)}
        </TabsList>
        <Card className="mt-3 p-5 shadow-card">
          <TabsContent value="overview" className="m-0 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[["Department", u(m.departmentId)?.name], ["Groups", m.groupIds.map((g) => u(g)?.name).join(", ")], ["Assigned leader", leader?.name], ["Contact preference", m.contactPreference], ["Consent", m.consent ? "Given" : "Not given"], ["Member since", fmtDate(m.joinedAt, { month: "short", year: "numeric" })]].map(([l, v]) => (
              <div key={l}><div className="text-xs text-muted-foreground">{l}</div><div className="text-sm font-medium capitalize">{v || "—"}</div></div>
            ))}
          </TabsContent>
          <TabsContent value="attendance" className="m-0 space-y-2">
            {myMob.map((r) => <div key={r.id} className="flex items-center justify-between rounded-lg border p-3 text-sm"><span>{services.find((s) => s.id === r.serviceId)?.name} · {fmtDate(services.find((s) => s.id === r.serviceId)?.date)}</span><span className="flex gap-2"><StatusBadge status={r.response} />{r.attended !== undefined && <StatusBadge status={r.attended ? "completed" : "unavailable"} />}</span></div>)}
          </TabsContent>
          <TabsContent value="communication" className="m-0 space-y-2">
            <SimBadge />
            {myMob.filter((r) => r.contacted).map((r) => <div key={r.id} className="rounded-lg border p-3 text-sm"><div className="font-medium capitalize">{r.channel} · Mobilization Agent</div><div className="text-muted-foreground">Asked about attendance — response: {r.response.replace("_", " ")}. {fmtDateTime(r.updatedAt)}</div></div>)}
          </TabsContent>
          <TabsContent value="follow-up" className="m-0">
            {followups.filter((f) => f.referrer === m.name).length ? followups.filter((f) => f.referrer === m.name).map((f) => <div key={f.id} className="flex justify-between rounded-lg border p-3 text-sm"><span>Referred {f.name}</span><StatusBadge status={f.status} /></div>) : <Empty text="No follow-up records linked to this member." />}
          </TabsContent>
          <TabsContent value="transportation" className="m-0 space-y-2">
            {myTr.length ? myTr.map((t) => <div key={t.id} className="flex justify-between rounded-lg border p-3 text-sm"><span className="capitalize">{t.kind} request · {fmtDate(t.createdAt)}</span><StatusBadge status={t.status} /></div>) : <Empty text="No transport requests." />}
          </TabsContent>
          <TabsContent value="leadership" className="m-0 space-y-2">
            {led.length ? led.map((x) => <div key={x.id} className="flex justify-between rounded-lg border p-3 text-sm"><span>Leads {x.name}</span><span className="text-xs capitalize text-muted-foreground">{x.type.replace("_", " ")}</span></div>) : <Empty text="No leadership assignments." />}
          </TabsContent>
          <TabsContent value="timeline" className="m-0">
            <ol className="relative space-y-4 border-l pl-5">
              {timeline.map((t, i) => <li key={i} className="text-sm"><span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-background bg-brand" /><div>{t.text}</div><div className="text-xs text-muted-foreground">{fmtDateTime(t.at)}</div></li>)}
            </ol>
          </TabsContent>
        </Card>
      </Tabs>
    </div>
  );
}
