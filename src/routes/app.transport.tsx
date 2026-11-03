import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bus, Car, MapPin, Phone, Wallet, CheckCircle2, Clock, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Confirm, PageHeader, Section, StatCard, StatusBadge } from "@/components/app/kit";
import { TransportMap } from "@/components/transport/TransportMap";
import { BusRegistration } from "@/components/transport/BusRegistration";
import { stepToward, type MapPoint } from "@/components/transport/geo";
import { useAction, useListData, useRepoMutations } from "@/hooks/use-data";
import { useApp } from "@/hooks/use-app";
import { fmtDateTime, naira } from "@/lib/format";
import type { TransportRequest, TransportStatus } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/transport")({
  head: () => ({ meta: [{ title: "Transportation — Mobilizer" }, { name: "description", content: "Register buses, manage drivers and transport requests, and track journeys." }, { property: "og:title", content: "Transportation — Mobilizer" }, { property: "og:description", content: "Bus registration, drivers, pickup requests and journey tracking." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: TransportPage,
});

const flow: TransportStatus[] = ["requested", "leader_review", "approved", "scheduled", "departed", "en_route", "arrived"];
const stepLabels: Record<TransportStatus, string> = { requested: "Member requested", leader_review: "Leader reviewing", approved: "Admin approved", rejected: "Rejected", scheduled: "Pickup arranged", departed: "Departed", en_route: "En route", arrived: "Arrived" };

function TransportPage() {
  const { actor, can } = useApp();
  const requests = useListData("transport");
  const members = useListData("members");
  const points = useListData("pickupPoints");
  const vehicles = useListData("vehicles");
  const tm = useRepoMutations("transport");
  const run = useAction();
  const [sel, setSel] = useState<string | undefined>();
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const [filter, setFilter] = useState("open");
  const [tab, setTab] = useState("live");

  useEffect(() => { setPos(Object.fromEntries(vehicles.map((v) => [v.id, v.position]))); }, [vehicles]);
  const movingIds = useMemo(() => new Set(requests.filter((r) => r.status === "departed" || r.status === "en_route").map((r) => r.vehicleId)), [requests]);

  useEffect(() => {
    const t = setInterval(() => setPos((p) => {
      const n = { ...p };
      movingIds.forEach((id) => { if (id && n[id]) { const s = stepToward(n[id], undefined, 1.2); n[id] = { x: s.x, y: s.y }; } });
      return n;
    }), 1500);
    return () => clearInterval(t);
  }, [movingIds]);

  const mapPoints: MapPoint[] = useMemo(() => [
    ...points.map((p) => ({ id: p.id, kind: "pickup" as const, label: p.name, x: p.x, y: p.y })),
    ...vehicles.filter((v) => !v.locationPending).map((v) => ({ id: v.id, kind: "vehicle" as const, label: v.label, ...(pos[v.id] ?? v.position), moving: movingIds.has(v.id) })),
  ], [points, vehicles, pos, movingIds]);

  const name = (id: string) => members.find((m) => m.id === id)?.name ?? "";
  const advance = async (r: TransportRequest, to: TransportStatus, vehicleId?: string) => {
    await tm.update.mutateAsync({ id: r.id, patch: { status: to, vehicleId: vehicleId ?? r.vehicleId, history: [...r.history, { status: to, at: new Date().toISOString(), by: actor.name }] } });
    const v = vehicleId ?? r.vehicleId ?? "";
    if (to === "approved") await run("approveTransport", { request_id: r.id, approved_by: actor.name });
    else if (to === "departed") await run("recordDeparture", { request_id: r.id, vehicle_id: v });
    else if (to === "arrived") await run("recordArrival", { request_id: r.id, vehicle_id: v });
  };
  const onSelect = useCallback((id: string) => setSel(id), []);

  const rows = requests.filter((r) => filter === "all" || (filter === "open" ? !["arrived", "rejected"].includes(r.status) : r.status === filter));

  return (
    <div>
      <PageHeader title="Transportation" description="From request to arrival: approvals, pickups, drivers and live journey tracking." actions={<BusRegistration onRegistered={() => setTab("fleet")} />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open requests" value={requests.filter((r) => ["requested", "leader_review"].includes(r.status)).length} icon={Clock} tone="warning" />
        <StatCard label="Approved & scheduled" value={requests.filter((r) => ["approved", "scheduled"].includes(r.status)).length} icon={CheckCircle2} tone="info" />
        <StatCard label="On the road" value={requests.filter((r) => ["departed", "en_route"].includes(r.status)).length} icon={Navigation} tone="brand" />
        <StatCard label="Financial support" value={requests.filter((r) => r.kind === "financial").reduce((a, r) => a + (r.amount ?? 0), 0)} icon={Wallet} tone="success" hint="Naira requested" />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList><TabsTrigger value="live">Live map</TabsTrigger><TabsTrigger value="requests">Requests</TabsTrigger><TabsTrigger value="fleet">Drivers & vehicles</TabsTrigger></TabsList>

        <TabsContent value="live" className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2"><TransportMap points={mapPoints} selectedId={sel} onSelect={onSelect} /></div>
          <div className="space-y-3">
            {vehicles.map((v) => {
              const pax = requests.filter((r) => r.vehicleId === v.id && r.status !== "rejected");
              const moving = movingIds.has(v.id);
              return (
                <Card key={v.id} onClick={() => setSel(v.id)} className={cn("cursor-pointer p-4 shadow-card transition-all hover:shadow-elegant", sel === v.id && "ring-2 ring-ring")}>
                  <div className="flex flex-wrap items-center gap-2">{v.capacity > 6 ? <Bus className="h-4 w-4 text-brand" /> : <Car className="h-4 w-4 text-brand" />}<span className="min-w-0 break-words font-semibold">{v.label}</span><span className="ml-auto"><StatusBadge status={moving ? "en_route" : pax.length ? "scheduled" : "registered"} /></span></div>
                  {v.locationPending && <p className="mt-2 text-xs text-muted-foreground">Location not available</p>}
                  <div className="mt-1 text-xs text-muted-foreground">{v.plate} · {v.driverName} · <Phone className="inline h-3 w-3" /> {v.driverPhone}</div>
                  <div className="mt-2 text-xs"><span className="font-medium">{pax.length}/{v.capacity} passengers</span> {pax.slice(0, 3).map((p) => name(p.memberId).split(" ")[0]).join(", ")}{pax.length > 3 && "…"}</div>
                </Card>
              );
            })}
            <Section title="Pickup points">
              <div className="space-y-1.5">{points.map((p) => <button key={p.id} onClick={() => setSel(p.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"><MapPin className="h-3.5 w-3.5 text-warning" />{p.name}<span className="ml-auto text-xs text-muted-foreground">{requests.filter((r) => r.pickupPointId === p.id).length}</span></button>)}</div>
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <div className="mb-3 flex justify-end">
            <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent>{[["open", "Open"], ["all", "All"], ...flow.map((f) => [f, stepLabels[f]]), ["rejected", "Rejected"]].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((r) => {
              const idx = flow.indexOf(r.status);
              return (
                <Card key={r.id} className="p-4 shadow-card animate-rise">
                  <div className="flex items-start justify-between gap-2">
                    <div><div className="font-semibold">{name(r.memberId)}</div><div className="text-xs text-muted-foreground">{r.kind === "financial" ? `Financial support · ${naira(r.amount ?? 0)}` : `Pickup · ${points.find((p) => p.id === r.pickupPointId)?.name}`}</div></div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="mt-3 flex gap-1">{flow.map((f, i) => <span key={f} className={cn("h-1.5 flex-1 rounded-full", i <= idx ? "bg-gradient-brand" : "bg-muted", r.status === "rejected" && "bg-destructive/40")} />)}</div>
                  <ol className="mt-3 space-y-1 text-xs text-muted-foreground">{r.history.slice(-3).map((h, i) => <li key={i}>{stepLabels[h.status]} · {h.by} · {fmtDateTime(h.at)}</li>)}</ol>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.status === "requested" && <Button size="sm" variant="outline" onClick={() => advance(r, "leader_review")}>Send to leader review</Button>}
                    {r.status === "leader_review" && can("approve_transport") && <>
                      <Confirm title="Approve transport support?" description={`Approve ${r.kind === "financial" ? naira(r.amount ?? 0) + " support" : "a pickup"} for ${name(r.memberId)}.`} onConfirm={() => advance(r, "approved")} trigger={<Button size="sm">Approve</Button>} />
                      <Button size="sm" variant="ghost" onClick={() => advance(r, "rejected")}>Reject</Button>
                    </>}
                    {r.status === "approved" && r.kind === "pickup" && (
                      <Select onValueChange={(v) => advance(r, "scheduled", v)}><SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Assign vehicle" /></SelectTrigger><SelectContent>{vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}</SelectContent></Select>
                    )}
                    {r.status === "approved" && r.kind === "financial" && <Button size="sm" variant="outline" onClick={() => advance(r, "arrived")}>Mark support disbursed & arrived</Button>}
                    {r.status === "scheduled" && <Button size="sm" onClick={() => advance(r, "departed")}>Confirm departure</Button>}
                    {r.status === "departed" && <Button size="sm" variant="outline" onClick={() => advance(r, "en_route")}>Journey update: en route</Button>}
                    {r.status === "en_route" && <Button size="sm" onClick={() => advance(r, "arrived")}>Confirm arrival</Button>}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="fleet" className="grid gap-3 md:grid-cols-3">
          {vehicles.map((v) => (
            <Card key={v.id} className="p-5 shadow-card">
              <div className="flex items-center gap-2 break-words font-semibold"><Bus className="h-4 w-4 shrink-0 text-brand" />{v.label}</div>
              <dl className="mt-3 space-y-1 text-sm [&>div]:gap-3 [&_dd]:min-w-0 [&_dd]:break-words [&_dd]:text-right">
                <div className="flex justify-between"><dt className="text-muted-foreground">Plate</dt><dd>{v.plate}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Capacity</dt><dd>{v.capacity}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Driver</dt><dd>{v.driverName}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Phone</dt><dd>{v.driverPhone}</dd></div>
              </dl>
              {v.locationPending && <p className="mt-3 text-xs text-muted-foreground">Location not available</p>}
              <h4 className="mt-4 text-xs font-semibold uppercase text-muted-foreground">Passengers</h4>
              <ul className="mt-1 space-y-1 text-sm">{requests.filter((r) => r.vehicleId === v.id).map((r) => <li key={r.id} className="flex justify-between">{name(r.memberId)}<StatusBadge status={r.status} /></li>)}</ul>
              {!requests.some((r) => r.vehicleId === v.id) && <p className="mt-1 text-sm text-muted-foreground">No passengers assigned</p>}
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
