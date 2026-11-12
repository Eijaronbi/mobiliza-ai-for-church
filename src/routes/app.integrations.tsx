import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Workflow, Phone, Database, MessageCircle, MessageSquare, Bot, MapPin, Mail, Code2, Settings2, PlugZap, ScrollText, RotateCw, Copy, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Section, SimBadge, StatusBadge } from "@/components/app/kit";
import { useListData, useRepoMutations } from "@/hooks/use-data";
import { useApp } from "@/hooks/use-app";
import { testIntegration, retryDelivery } from "@/services/events/dispatcher";
import { apiRequest } from "@/services/api/client";
import { buildCustomApiRequest } from "@/services/integrations/registry";
import { buildEvent } from "@/services/events/envelope";
import { eventNames, eventDescriptions, samplePayload } from "@/config/event-catalog";
import { actionList } from "@/config/action-map";
import { fmtDateTime } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthType, CustomApiConfig, EventName, HttpMethod, IntegrationConfig, IntegrationKind, WebhookEndpoint } from "@/types";

export const Route = createFileRoute("/app/integrations")({
  head: () => ({ meta: [{ title: "Integration Hub — Mobilizer" }, { name: "description", content: "Connect n8n, Voicebip, maps, messaging and custom APIs by configuration." }, { property: "og:title", content: "Integration Hub — Mobilizer" }, { property: "og:description", content: "Connect n8n, Voicebip, maps, messaging and custom APIs by configuration." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: IntegrationHub,
});

const icons: Record<IntegrationKind, typeof Workflow> = { n8n: Workflow, voicebip: Phone, database: Database, whatsapp: MessageCircle, sms: MessageSquare, ai: Bot, maps: MapPin, email: Mail, custom: Code2 };
const authTypes: AuthType[] = ["none", "bearer", "api_key", "basic", "custom_header", "hmac"];
const methods: HttpMethod[] = ["POST", "GET", "PUT", "PATCH", "DELETE"];
const mapsConnected = !!import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"];
const statusOf = (i: IntegrationConfig) => (i.kind === "maps" && mapsConnected ? "connected" : i.status);

function SecretRef({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label>Secret reference</Label>
      <Input aria-label="Secret reference" value={value ?? ""} onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))} placeholder="e.g. N8N_WEBHOOK_SECRET" className="font-mono text-xs" />
      <p className="text-[11px] text-muted-foreground">Only the name is stored here. The real value lives in server-side secrets — never in the browser.</p>
    </div>
  );
}

function IntegrationHub() {
  const { tenantId } = useApp();
  const qc = useQueryClient();
  const integrations = useListData("integrations");
  const endpoints = useListData("endpoints");
  const logs = useListData("logs");
  const apis = useListData("customApis");
  const im = useRepoMutations("integrations");
  const epm = useRepoMutations("endpoints");
  const apm = useRepoMutations("customApis");
  const [tab, setTab] = useState("overview");
  const [cfg, setCfg] = useState<IntegrationConfig | null>(null);
  const [ep, setEp] = useState<WebhookEndpoint | null>(null);
  const [api, setApi] = useState<CustomApiConfig | null>(null);
  const [logFilter, setLogFilter] = useState({ integration: "all", status: "all", event: "all" });
  const [apiResult, setApiResult] = useState<string>("");
  const n8n = integrations.find((i) => i.kind === "n8n");
  const vb = integrations.find((i) => i.kind === "voicebip");

  const test = async (i: IntegrationConfig) => {
    const log = await testIntegration(i);
    qc.invalidateQueries({ queryKey: ["logs"] });
    if (log.requestStatus === "delivered") toast.success(`${i.name}: test passed (simulated)`);
    else toast.warning(`${i.name}: not reachable`, { description: log.error });
  };
  const testEp = async (e: WebhookEndpoint) => {
    const env = buildEvent(e.events[0] ?? "mobilization.started", tenantId, samplePayload(e.events[0] ?? "mobilization.started"), { role: "church_admin", name: "Test" });
    const r = await apiRequest({ integrationId: e.integrationId, url: e.url, method: e.method, headers: e.headers, body: env });
    r.ok ? toast.success(`Test event accepted (simulated)`) : toast.warning("Test not delivered", { description: r.error });
  };
  const saveEp = async () => {
    if (!ep) return;
    if (!ep.name.trim() || !/^(https:\/\/|\/api\/)/.test(ep.url)) return toast.error("Endpoint needs a name and an https:// URL");
    if (endpoints.some((x) => x.id === ep.id)) await epm.update.mutateAsync({ id: ep.id, patch: ep }); else await epm.create.mutateAsync(ep);
    toast.success("Endpoint saved"); setEp(null);
  };

  const filtered = logs.filter((l) => (logFilter.integration === "all" || l.integrationName === logFilter.integration) && (logFilter.status === "all" || l.requestStatus === logFilter.status) && (logFilter.event === "all" || l.event === logFilter.event)).sort((a, b) => b.at.localeCompare(a.at));
  const workflows: WebhookEndpoint["workflow"][] = ["mobilization", "transport", "followup", "reporting", "leadership", "prayer", "general"];

  return (
    <div>
      <PageHeader title="Integration Hub" description="Connect services by configuration. Mobilizer never hardcodes endpoints — every action routes through the event contracts below." actions={<SimBadge label="Execution pending backend" />} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap justify-start">
          {[["overview", "Overview"], ["n8n", "n8n"], ["webhooks", "Webhooks"], ["voicebip", "Voicebip"], ["custom", "Custom APIs"], ["logs", "Logs"], ["developer", "Developer"]].map(([v, l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="overview" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map((i) => {
            const I = icons[i.kind];
            return (
              <Card key={i.id} className="flex flex-col p-5 shadow-card transition-all hover:shadow-elegant animate-rise">
                <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground"><I className="h-5 w-5" /></span><div className="flex-1"><div className="font-semibold">{i.name}</div><StatusBadge status={statusOf(i)} className="mt-1" /></div></div>
                <p className="mt-3 flex-1 text-sm text-muted-foreground">{i.kind === "maps" && mapsConnected ? "Google Maps is connected and powers the live transport map. Vehicle GPS feeds are simulated until drivers share location." : i.description}</p>
                <div className="mt-2 text-[11px] text-muted-foreground">Last successful communication: {i.lastSuccessAt ? fmtDateTime(i.lastSuccessAt) : "never"}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => (i.kind === "n8n" || i.kind === "voicebip" || i.kind === "custom" ? setTab(i.kind) : setCfg(i))}><Settings2 className="mr-1 h-3.5 w-3.5" />Configure</Button>
                  <Button size="sm" variant="outline" onClick={() => test(i)}><PlugZap className="mr-1 h-3.5 w-3.5" />Test</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setLogFilter({ ...logFilter, integration: i.name }); setTab("logs"); }}><ScrollText className="mr-1 h-3.5 w-3.5" />Logs</Button>
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="n8n" className="space-y-4">
          {n8n && <Section title="n8n connection" action={<StatusBadge status={n8n.status} />}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1"><Label>Instance URL</Label><Input aria-label="Instance URL" value={n8n.baseUrl} onChange={(e) => im.update.mutate({ id: n8n.id, patch: { baseUrl: e.target.value } })} /></div>
              <div className="space-y-1"><Label>Authentication</Label><Select value={n8n.auth.type} onValueChange={(v) => im.update.mutate({ id: n8n.id, patch: { auth: { ...n8n.auth, type: v as AuthType } } })}><SelectTrigger aria-label="Authentication"><SelectValue /></SelectTrigger><SelectContent>{authTypes.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
              <SecretRef value={n8n.auth.secretRef} onChange={(v) => im.update.mutate({ id: n8n.id, patch: { auth: { ...n8n.auth, secretRef: v } } })} />
              <div className="space-y-1"><Label>Optional n8n API key reference</Label><Input aria-label="Optional n8n API key reference" className="font-mono text-xs" value={String(n8n.settings.apiKeyRef ?? "")} placeholder="N8N_API_KEY" onChange={(e) => im.update.mutate({ id: n8n.id, patch: { settings: { ...n8n.settings, apiKeyRef: e.target.value.toUpperCase() } } })} /></div>
            </div>
            <Button className="mt-4" onClick={() => test(n8n)}><PlugZap className="mr-1 h-4 w-4" />Test connection</Button>
          </Section>}
          {workflows.map((w) => (
            <Section key={w} title={`${w[0].toUpperCase() + w.slice(1)} workflow`} action={<Button size="sm" variant="ghost" onClick={() => setEp({ id: `${tenantId}_ep${Date.now()}`, tenantId, integrationId: n8n!.id, workflow: w, name: "", description: "", url: `${n8n?.baseUrl}/webhook/`, method: "POST", auth: { type: "hmac", secretRef: "N8N_WEBHOOK_SECRET", headerName: "X-Mobilizer-Signature" }, headers: { "Content-Type": "application/json" }, payloadTemplate: "{{event_envelope}}", active: true, direction: "outgoing", events: [] })}><Plus className="mr-1 h-3.5 w-3.5" />Add</Button>}>
              <div className="divide-y">
                {endpoints.filter((e) => e.workflow === w && e.direction === "outgoing").map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                    <Badge variant="secondary" className="font-mono text-[10px]">{e.method}</Badge>
                    <div className="min-w-[200px] flex-1"><div className="font-medium">{e.name}</div><div className="truncate font-mono text-[11px] text-muted-foreground">{e.url}</div></div>
                    {e.events.map((ev) => <Badge key={ev} variant="outline" className="font-mono text-[10px]">{ev}</Badge>)}
                    <Switch aria-label={`Enable ${e.name}`} checked={e.active} onCheckedChange={(v) => epm.update.mutate({ id: e.id, patch: { active: v } })}  />
                    <Button size="sm" variant="ghost" onClick={() => testEp(e)}>Test</Button>
                    <Button size="sm" variant="outline" onClick={() => setEp(e)}>Edit</Button>
                  </div>
                ))}
              </div>
            </Section>
          ))}
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Section title="Incoming webhook endpoints" action={<Badge variant="outline">Pending backend</Badge>}>
            <p className="mb-3 text-sm text-muted-foreground">External systems post results here. Each request must carry an HMAC-SHA256 signature of the raw body; payloads are validated against the event catalogue and checked for tenant.</p>
            {endpoints.filter((e) => e.direction === "incoming").map((e) => <div key={e.id} className="flex flex-wrap items-center gap-2 border-t py-2.5 text-sm"><span className="flex-1 font-medium">{e.name}</span><code className="text-xs">{e.method} {e.url}</code><span className="font-mono text-[11px] text-muted-foreground">{e.auth.headerName}</span><Switch aria-label={`Enable ${e.name}`} checked={e.active} onCheckedChange={(v) => epm.update.mutate({ id: e.id, patch: { active: v } })} /></div>)}
          </Section>
          <Section title="Outgoing destinations">
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Events</TableHead><TableHead>Auth</TableHead><TableHead>Active</TableHead><TableHead /></TableRow></TableHeader><TableBody>
              {endpoints.filter((e) => e.direction === "outgoing" && e.events.length).map((e) => <TableRow key={e.id}><TableCell className="font-medium">{e.name}</TableCell><TableCell className="font-mono text-[11px]">{e.events.join(", ")}</TableCell><TableCell className="text-xs">{e.auth.type}</TableCell><TableCell><Switch aria-label={`Enable ${e.name}`} checked={e.active} onCheckedChange={(v) => epm.update.mutate({ id: e.id, patch: { active: v } })} /></TableCell><TableCell><Button size="sm" variant="ghost" onClick={() => setEp(e)}>Edit</Button></TableCell></TableRow>)}
            </TableBody></Table></div>
          </Section>
          <Section title="Event catalogue">
            <div className="grid gap-2 md:grid-cols-2">{eventNames.map((ev) => <details key={ev} className="rounded-lg border p-3 text-sm"><summary className="cursor-pointer"><code className="font-semibold">{ev}</code> <span className="text-muted-foreground">— {eventDescriptions[ev]}</span></summary><pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-[11px]">{JSON.stringify(samplePayload(ev), null, 2)}</pre></details>)}</div>
          </Section>
        </TabsContent>

        <TabsContent value="voicebip">
          {vb && <Section title="Voicebip configuration" action={<StatusBadge status={vb.status} />}>
            <div className="grid gap-3 md:grid-cols-2">
              <SecretRef value={vb.auth.secretRef} onChange={(v) => im.update.mutate({ id: vb.id, patch: { auth: { ...vb.auth, secretRef: v } } })} />
              <div className="space-y-1"><Label>API base URL</Label><Input aria-label="API base URL" value={vb.baseUrl} placeholder="https://api.voicebip.example" onChange={(e) => im.update.mutate({ id: vb.id, patch: { baseUrl: e.target.value } })} /></div>
              {([["environment", "API environment"], ["phoneNumber", "Phone number"], ["defaultAgent", "Default voice agent"], ["language", "Language preference"], ["maxCallSeconds", "Max call length (s)"], ["retryAttempts", "Retry attempts"], ["smsSender", "SMS sender ID"], ["whatsappNumber", "WhatsApp messaging number"]] as const).map(([k, l]) => (
                <div key={k} className="space-y-1"><Label>{l}</Label><Input aria-label={l} value={String(vb.settings[k] ?? "")} onChange={(e) => im.update.mutate({ id: vb.id, patch: { settings: { ...vb.settings, [k]: e.target.value } } })} /></div>
              ))}
              <div className="space-y-1 md:col-span-2"><Label>Callback URL (give this to Voicebip)</Label><Input aria-label="Callback URL (give this to Voicebip)" readOnly value="https://<your-domain>/api/public/webhooks/voicebip" className="font-mono text-xs" /></div>
            </div>
            <p className="mt-3 rounded-lg bg-warning/15 p-3 text-xs text-warning-foreground">WhatsApp messaging and WhatsApp calling are separate capabilities. Enabling messaging does not enable calls.</p>
            <h3 className="mb-2 mt-5 text-sm font-semibold">Event mapping</h3>
            <Table><TableHeader><TableRow><TableHead>Voicebip event</TableHead><TableHead>Mobilizer event</TableHead><TableHead>Use case</TableHead></TableRow></TableHeader><TableBody>
              {[["call.completed (intent=confirm)", "attendance.confirmed", "Attendance confirmation"], ["call.completed (intent=decline)", "attendance.declined", "Attendance confirmation"], ["call.completed (followup)", "followup.completed", "Follow-up calls"], ["call.transcript.ready", "—", "Transcription stored on communication record"], ["call.escalation_requested", "escalation.created", "Human hand-off"], ["sms.delivered / whatsapp.delivered", "—", "Delivery status"]].map((r) => <TableRow key={r[0]}>{r.map((c, k) => <TableCell key={k} className={k < 2 ? "font-mono text-xs" : "text-sm"}>{c}</TableCell>)}</TableRow>)}
            </TableBody></Table>
            <Button className="mt-4" onClick={() => test(vb)}><PlugZap className="mr-1 h-4 w-4" />Test connection</Button>
          </Section>}
        </TabsContent>

        <TabsContent value="custom" className="space-y-3">
          <div className="flex justify-end"><Button onClick={() => setApi({ id: `${tenantId}_api${Date.now()}`, tenantId, name: "", baseUrl: "https://", path: "/", method: "GET", auth: { type: "bearer" }, headers: {}, body: "", responseMapping: {}, timeoutMs: 8000, enabled: false })}><Plus className="mr-1 h-4 w-4" />New API</Button></div>
          {apis.map((a) => <Button variant="outline" key={a.id} className="h-auto w-full whitespace-normal block text-left flex flex-wrap items-center gap-3 p-4 shadow-card"><Code2 className="h-auto w-full whitespace-normal block text-left h-5 w-5 text-brand" /><div className="h-auto w-full whitespace-normal block text-left flex-1"><div className="h-auto w-full whitespace-normal block text-left font-semibold">{a.name}</div><code className="h-auto w-full whitespace-normal block text-left text-xs text-muted-foreground">{a.method} {a.baseUrl}{a.path}</code></div><StatusBadge status={a.enabled ? "active" : "disabled"} /><Button size="sm" variant="outline" onClick={() => { setApi(a); setApiResult(""); }}>Configure & test</Button></Button>)}
        </TabsContent>

        <TabsContent value="logs">
          <Card className="p-4 shadow-card">
            <div className="mb-3 flex flex-wrap gap-2">
              <Select value={logFilter.integration} onValueChange={(v) => setLogFilter({ ...logFilter, integration: v })}><SelectTrigger aria-label="Filter log integration" className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All integrations</SelectItem>{[...new Set(logs.map((l) => l.integrationName))].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select>
              <Select value={logFilter.event} onValueChange={(v) => setLogFilter({ ...logFilter, event: v })}><SelectTrigger aria-label="Filter log event" className="w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All events</SelectItem>{[...eventNames, "connection.test"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select>
              <Select value={logFilter.status} onValueChange={(v) => setLogFilter({ ...logFilter, status: v })}><SelectTrigger aria-label="Filter log status" className="w-44"><SelectValue /></SelectTrigger><SelectContent>{["all", "delivered", "pending_backend", "failed", "retrying"].map((n) => <SelectItem key={n} value={n}>{n === "all" ? "All statuses" : n.replace("_", " ")}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Integration</TableHead><TableHead>Event</TableHead><TableHead className="hidden lg:table-cell">Endpoint</TableHead><TableHead>Status</TableHead><TableHead>Resp.</TableHead><TableHead>ms</TableHead><TableHead>Retries</TableHead><TableHead /></TableRow></TableHeader><TableBody>
              {filtered.slice(0, 60).map((l) => <TableRow key={l.id}><TableCell className="whitespace-nowrap text-xs">{fmtDateTime(l.at)}</TableCell><TableCell className="text-xs">{l.integrationName}</TableCell><TableCell className="font-mono text-[11px]">{l.event}</TableCell><TableCell className="hidden max-w-[220px] truncate font-mono text-[11px] lg:table-cell">{l.endpoint}</TableCell><TableCell><StatusBadge status={l.requestStatus} /></TableCell><TableCell className="text-xs">{l.responseStatus ?? "—"}</TableCell><TableCell className="text-xs">{l.durationMs}</TableCell><TableCell className="text-xs">{l.retries}</TableCell><TableCell>{l.requestStatus !== "delivered" && l.event !== "connection.test" && <Button size="icon" variant="ghost" aria-label="Retry" onClick={async () => { await retryDelivery(l); qc.invalidateQueries({ queryKey: ["logs"] }); toast("Retry attempted (simulated)"); }}><RotateCw className="h-3.5 w-3.5" /></Button>}</TableCell></TableRow>)}
            </TableBody></Table></div>
            {filtered.some((l) => l.error) && <p className="mt-2 text-xs text-muted-foreground">Latest error: {filtered.find((l) => l.error)?.error}</p>}
          </Card>
        </TabsContent>

        <TabsContent value="developer" className="space-y-4">
          <Section title="Action → event → workflow map">
            <Table><TableHeader><TableRow><TableHead>Mobilizer action</TableHead><TableHead>Event</TableHead><TableHead>Bound endpoint</TableHead><TableHead>Confirm?</TableHead></TableRow></TableHeader><TableBody>
              {actionList.map((a) => { const b = endpoints.filter((e) => e.events.includes(a.event) && e.direction === "outgoing"); return <TableRow key={a.id}><TableCell className="font-medium">{a.label}</TableCell><TableCell className="font-mono text-xs">{a.event}</TableCell><TableCell className="text-xs">{b.map((x) => x.name).join(", ") || "—"}</TableCell><TableCell className="text-xs">{a.requiresConfirmation ? "Yes" : "No"}</TableCell></TableRow>; })}
            </TableBody></Table>
          </Section>
          <Section title="Event envelope contract" action={<Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(JSON.stringify(buildEvent("attendance.confirmed", "demo_church", samplePayload("attendance.confirmed"), { role: "church_admin", name: "Church Administrator" }), null, 2)); toast.success("Copied"); }}><Copy className="mr-1 h-3.5 w-3.5" />Copy</Button>}>
            <pre className="overflow-x-auto rounded-lg bg-primary p-4 text-xs text-primary-foreground">{`POST {endpoint.url}
Content-Type: application/json
X-Mobilizer-Event: attendance.confirmed
X-Mobilizer-Event-Id: evt_…
X-Mobilizer-Signature: sha256=HMAC(secret, rawBody)

{
  "event": "attendance.confirmed",
  "event_id": "evt_demo_001",
  "timestamp": "ISO-8601",
  "tenant_id": "demo_church",
  "source": "mobilizer",
  "actor": { "role": "church_admin", "name": "…" },
  "data": { "member_id": "member_demo_001", "service_id": "service_demo_001", "attendance_status": "confirmed" }
}

Expected n8n response: 2xx with { "accepted": true, "execution_id": "…" }`}</pre>
          </Section>
        </TabsContent>
      </Tabs>

      <Dialog open={!!cfg} onOpenChange={(o) => !o && setCfg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Configure {cfg?.name}</DialogTitle></DialogHeader>
          {cfg && <div className="space-y-3">
            {cfg.kind === "maps" && mapsConnected && <p className="rounded-lg bg-success/12 p-3 text-sm text-success">Google Maps is connected through Lovable. Nothing else is needed for map display.</p>}
            {cfg.kind === "database" && <p className="rounded-lg bg-muted p-3 text-sm">Switch the data source from demo to Lovable Cloud once the database is enabled. The app's screens don't change.</p>}
            <div className="space-y-1"><Label>Base URL</Label><Input aria-label="Base URL" value={cfg.baseUrl} onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })} /></div>
            <div className="space-y-1"><Label>Authentication</Label><Select value={cfg.auth.type} onValueChange={(v) => setCfg({ ...cfg, auth: { ...cfg.auth, type: v as AuthType } })}><SelectTrigger aria-label="Authentication"><SelectValue /></SelectTrigger><SelectContent>{authTypes.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
            <SecretRef value={cfg.auth.secretRef} onChange={(v) => setCfg({ ...cfg, auth: { ...cfg.auth, secretRef: v } })} />
            {cfg.kind === "sms" && <div className="space-y-1"><Label htmlFor="sms-sender">Approved SMS Sender ID</Label><Input id="sms-sender" value={String(cfg.settings.smsSender ?? "")} maxLength={40} onChange={(e) => setCfg({ ...cfg, settings: { ...cfg.settings, smsSender: e.target.value } })} /></div>}
            <label className="flex items-center gap-2 text-sm"><Switch checked={cfg.enabled} onCheckedChange={(v) => setCfg({ ...cfg, enabled: v, status: v ? (cfg.status === "disabled" ? "config_required" : cfg.status) : "disabled" })} />Enabled</label>
          </div>}
          <DialogFooter><Button onClick={async () => { if (!cfg) return; await im.update.mutateAsync({ id: cfg.id, patch: { ...cfg, status: cfg.enabled && cfg.baseUrl && cfg.auth.secretRef && cfg.status === "not_connected" ? "config_required" : cfg.status } }); toast.success("Configuration saved"); setCfg(null); }}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!ep} onOpenChange={(o) => !o && setEp(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader><DialogTitle>Webhook endpoint</DialogTitle></DialogHeader>
          {ep && <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label>Name</Label><Input aria-label="Name" value={ep.name} onChange={(e) => setEp({ ...ep, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Method</Label><Select value={ep.method} onValueChange={(v) => setEp({ ...ep, method: v as HttpMethod })}><SelectTrigger aria-label="Method"><SelectValue /></SelectTrigger><SelectContent>{methods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1 sm:col-span-2"><Label>Description</Label><Input aria-label="Description" value={ep.description} onChange={(e) => setEp({ ...ep, description: e.target.value })} /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Endpoint URL</Label><Input aria-label="Endpoint URL" className="font-mono text-xs" value={ep.url} onChange={(e) => setEp({ ...ep, url: e.target.value.trim() })} /></div>
            <div className="space-y-1"><Label>Auth type</Label><Select value={ep.auth.type} onValueChange={(v) => setEp({ ...ep, auth: { ...ep.auth, type: v as AuthType } })}><SelectTrigger aria-label="Auth type"><SelectValue /></SelectTrigger><SelectContent>{authTypes.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
            <SecretRef value={ep.auth.secretRef} onChange={(v) => setEp({ ...ep, auth: { ...ep.auth, secretRef: v } })} />
            <div className="space-y-1 sm:col-span-2"><Label>Headers (JSON)</Label><Textarea aria-label="Headers (JSON)" className="font-mono text-xs" defaultValue={JSON.stringify(ep.headers, null, 2)} onBlur={(e) => { try { setEp({ ...ep, headers: JSON.parse(e.target.value) }); } catch { toast.error("Headers must be valid JSON"); } }} /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Payload template</Label><Textarea aria-label="Payload template" className="font-mono text-xs" value={ep.payloadTemplate} onChange={(e) => setEp({ ...ep, payloadTemplate: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Events</Label><div className="mt-2 grid grid-cols-2 gap-1">{eventNames.map((ev) => <label key={ev} className="flex items-center gap-1.5 font-mono text-[11px]"><input type="checkbox" checked={ep.events.includes(ev)} onChange={(e) => setEp({ ...ep, events: e.target.checked ? [...ep.events, ev] : ep.events.filter((x) => x !== ev) as EventName[] })} />{ev}</label>)}</div></div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={ep.active} onCheckedChange={(v) => setEp({ ...ep, active: v })} />Active</label>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => ep && testEp(ep)}>Test</Button><Button onClick={saveEp}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!api} onOpenChange={(o) => !o && setApi(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader><DialogTitle>Custom API connector</DialogTitle></DialogHeader>
          {api && <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2"><Label>Integration name</Label><Input aria-label="Integration name" value={api.name} onChange={(e) => setApi({ ...api, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Base URL</Label><Input aria-label="Base URL" className="font-mono text-xs" value={api.baseUrl} onChange={(e) => setApi({ ...api, baseUrl: e.target.value })} /></div>
            <div className="space-y-1"><Label>Endpoint path</Label><Input aria-label="Endpoint path" className="font-mono text-xs" value={api.path} onChange={(e) => setApi({ ...api, path: e.target.value })} /></div>
            <div className="space-y-1"><Label>Method</Label><Select value={api.method} onValueChange={(v) => setApi({ ...api, method: v as HttpMethod })}><SelectTrigger aria-label="Method"><SelectValue /></SelectTrigger><SelectContent>{methods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Timeout (ms)</Label><Input aria-label="Timeout (ms)" type="number" value={api.timeoutMs} onChange={(e) => setApi({ ...api, timeoutMs: Math.max(500, Math.min(60000, Number(e.target.value))) })} /></div>
            <div className="space-y-1"><Label>Authentication</Label><Select value={api.auth.type} onValueChange={(v) => setApi({ ...api, auth: { ...api.auth, type: v as AuthType } })}><SelectTrigger aria-label="Authentication"><SelectValue /></SelectTrigger><SelectContent>{authTypes.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
            <SecretRef value={api.auth.secretRef} onChange={(v) => setApi({ ...api, auth: { ...api.auth, secretRef: v } })} />
            <div className="space-y-1 sm:col-span-2"><Label>Headers (JSON)</Label><Textarea aria-label="Headers (JSON)" className="font-mono text-xs" defaultValue={JSON.stringify(api.headers)} onBlur={(e) => { try { setApi({ ...api, headers: JSON.parse(e.target.value || "{}") }); } catch { toast.error("Headers must be valid JSON"); } }} /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Request body</Label><Textarea aria-label="Request body" className="font-mono text-xs" value={api.body} onChange={(e) => setApi({ ...api, body: e.target.value })} /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Response mapping (JSON: field → path)</Label><Textarea aria-label="Response mapping (JSON: field → path)" className="font-mono text-xs" defaultValue={JSON.stringify(api.responseMapping)} onBlur={(e) => { try { setApi({ ...api, responseMapping: JSON.parse(e.target.value || "{}") }); } catch { toast.error("Mapping must be valid JSON"); } }} /></div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={api.enabled} onCheckedChange={(v) => setApi({ ...api, enabled: v })} />Enabled</label>
            {apiResult && <pre className="overflow-x-auto rounded bg-muted p-2 text-[11px] sm:col-span-2">{apiResult}</pre>}
          </div>}
          <DialogFooter>
            <Button variant="outline" onClick={async () => { if (!api) return; const req = buildCustomApiRequest(api, { member_id: "member_demo_001" }); const r = await apiRequest(req); setApiResult(JSON.stringify({ request: { method: req.method, url: req.url, headers: Object.keys(req.headers) }, response: r }, null, 2)); }}>Test configuration</Button>
            <Button onClick={async () => { if (!api) return; if (!api.name.trim() || !api.baseUrl.startsWith("https://")) return toast.error("Name and an https:// base URL are required"); if (apis.some((x) => x.id === api.id)) await apm.update.mutateAsync({ id: api.id, patch: api }); else await apm.create.mutateAsync(api); toast.success("API saved"); setApi(null); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
