import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/kit";
import { useTenant } from "@/hooks/use-app";
import { useListData } from "@/hooks/use-data";
import { roles, roleIds, type Permission } from "@/config/roles";
import { resetDemo } from "@/services/data";
import { useQueryClient } from "@tanstack/react-query";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Mobilizer" }, { name: "description", content: "Church configuration, permissions and audit logs." }, { property: "og:title", content: "Settings — Mobilizer" }, { property: "og:description", content: "Church configuration, permissions and audit logs." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: SettingsPage,
});

const sections = ["Church profile", "Organizational configuration", "Users and permissions", "Services and schedules", "Mobilization settings", "Transportation settings", "Follow-up settings", "Reporting templates", "AI agent settings", "Integration settings", "Notifications", "Security and audit logs"] as const;
const perms: Permission[] = ["manage_members", "run_mobilization", "approve_transport", "manage_followup", "approve_reports", "manage_escalations", "manage_integrations", "manage_tenants"];

function SettingsPage() {
  const t = useTenant();
  const logs = useListData("logs");
  const qc = useQueryClient();
  const [s, setS] = useState<(typeof sections)[number]>("Church profile");
  const link = (to: "/app/structure" | "/app/services" | "/app/mobilization" | "/app/transport" | "/app/followup" | "/app/reports" | "/app/agents" | "/app/integrations", label: string) => <Button asChild variant="outline"><Link to={to}>{label}</Link></Button>;
  const toggles = (items: string[]) => <div className="space-y-3">{items.map((i, k) => <label key={i} className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm">{i}<Switch defaultChecked={k % 3 !== 2} onCheckedChange={() => toast.success("Preference saved")} /></label>)}</div>;

  return (
    <div>
      <PageHeader title="Settings" description={`Configuration for ${t.name}. Nothing here is hardcoded to one church.`} />
      <div className="grid gap-4 lg:grid-cols-4">
        <nav aria-label="Settings sections" className="h-fit border-r pr-3">{sections.map((x) => <Button key={x} variant="ghost" aria-pressed={s === x} onClick={() => setS(x)} className={cn("h-auto min-h-11 w-full justify-start whitespace-normal px-3 py-2 text-left text-sm", s === x && "bg-accent font-medium text-accent-foreground")}>{x}</Button>)}</nav>
        <Card className="p-5 shadow-card lg:col-span-3">
          <h2 className="mb-4 text-lg font-bold">{s}</h2>
          {s === "Church profile" && <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); toast.success("Church profile saved"); }}>
            <div className="space-y-1"><Label>Church name</Label><Input aria-label="Church name" defaultValue={t.name} required minLength={2} /></div>
            <div className="space-y-1"><Label>City</Label><Input aria-label="City" defaultValue={t.city} required /></div>
            <div className="space-y-1"><Label>Senior pastor</Label><Input aria-label="Senior pastor" defaultValue={t.pastor} /></div>
            <div className="space-y-1"><Label>Time zone</Label><Input aria-label="Time zone" defaultValue={t.timezone} /></div>
            <div className="sm:col-span-2"><Button type="submit">Save</Button></div>
          </form>}
          {s === "Organizational configuration" && link("/app/structure", "Open Church Structure")}
          {s === "Users and permissions" && <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Role</TableHead>{perms.map((p) => <TableHead key={p} className="text-[11px] capitalize">{p.replace(/_/g, " ")}</TableHead>)}</TableRow></TableHeader><TableBody>{roleIds.map((r) => <TableRow key={r}><TableCell className="font-medium">{roles[r].label}</TableCell>{perms.map((p) => <TableCell key={p}>{roles[r].permissions.includes(p) ? "✓" : "—"}</TableCell>)}</TableRow>)}</TableBody></Table></div>}
          {s === "Services and schedules" && link("/app/services", "Open Services & Events")}
          {s === "Mobilization settings" && <div className="space-y-4">{toggles(["Respect contact window", "Retry non-responders automatically", "Ask about transport during confirmation call"])}{link("/app/mobilization", "Edit workflow stages")}</div>}
          {s === "Transportation settings" && <div className="space-y-4">{toggles(["Require leader review before admin approval", "Allow financial transport support", "Share driver location with passengers"])}{link("/app/transport", "Open Transportation")}</div>}
          {s === "Follow-up settings" && <div className="space-y-4">{toggles(["Auto-assign to cell leader by location", "AI first contact within 24 hours", "Escalate sensitive matters to pastor"])}{link("/app/followup", "Open Follow-up")}</div>}
          {s === "Reporting templates" && link("/app/reports", "Manage templates")}
          {s === "AI agent settings" && link("/app/agents", "Configure agents")}
          {s === "Integration settings" && link("/app/integrations", "Open Integration Hub")}
          {s === "Notifications" && toggles(["Email me daily summary", "Notify on urgent escalations", "Notify when reports become overdue", "Weekly leadership digest"])}
          {s === "Security and audit logs" && <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Secrets are stored server-side only and referenced by name. Every outbound event is logged with secrets redacted.</p>
            <div className="max-h-80 divide-y overflow-auto rounded-lg border text-sm">{logs.slice(0, 30).map((l) => <div key={l.id} className="flex justify-between gap-2 p-2.5"><span className="font-mono text-xs">{l.event}</span><span className="text-xs text-muted-foreground">{l.integrationName} · {fmtDateTime(l.at)}</span></div>)}</div>
            <Button variant="outline" onClick={() => { resetDemo(); qc.invalidateQueries(); toast.success("Demo data reset"); }}>Reset demo data</Button>
          </div>}
        </Card>
      </div>
    </div>
  );
}
