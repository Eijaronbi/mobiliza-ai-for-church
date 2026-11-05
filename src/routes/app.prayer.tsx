import { useApp } from "@/hooks/use-app";
import { useServerFn } from "@tanstack/react-start";
import { sendChurchEmails } from "@/lib/gmail.functions";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bell, CheckCircle2, Phone, PhoneOff, Send, Bot, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/app/kit";
import { useAction, useListData } from "@/hooks/use-data";
import { useApp } from "@/hooks/use-app";
import {
  buildSlots, defaultPrayerConfig, nextCallChannel, renderCallMessage, slotStatus,
  type PrayerCallChannel, type PrayerChainConfig, type PrayerMessageChannel, type PrayerStatus,
} from "@/lib/prayer";

export const Route = createFileRoute("/app/prayer")({
  head: () => ({ meta: [
    { title: "Prayer Chain — Mobilizer" },
    { name: "description", content: "Run your church prayer chain: slots, sign-ins, reminders, prayer points and call follow-up." },
    { property: "og:title", content: "Prayer Chain — Mobilizer" },
    { property: "og:description", content: "Track who signed in to pray, remind and call those who haven't." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PrayerPage,
});

const statusStyle: Record<PrayerStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  upcoming: { label: "Upcoming", variant: "outline" },
  awaiting: { label: "Waiting to sign in", variant: "secondary" },
  praying: { label: "Signed in · praying", variant: "default" },
  completed: { label: "Completed hour", variant: "default" },
  missed: { label: "Not signed in", variant: "destructive" },
};
const callLabel: Record<PrayerCallChannel, string> = { voice: "Phone call", whatsapp_call: "WhatsApp call" };
const methodLabel = { whatsapp: "WhatsApp", app: "Mobilizer app", sms: "SMS", phone: "Phone call" } as const;
const chainId = "chain_early_morning";

interface CallLog { key: string; channel: PrayerCallChannel; result: "ringing" | "no_answer" | "answered"; at: string }

function PrayerPage() {
  const { tenantId } = useApp();
  const members = useListData("members");
  const run = useAction();
  const [cfg, setCfg] = useState<PrayerChainConfig>(defaultPrayerConfig);
  const slots = useMemo(() => buildSlots(cfg), [cfg.start, cfg.end, cfg.slotMinutes]);
  const [assign, setAssign] = useState<Record<string, string[]>>({});
  const [signIns, setSignIns] = useState<Record<string, string>>({});
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [now, setNow] = useState("04:15");
  const [pick, setPick] = useState<Record<string, string>>({});

  // Demo default roster: spread the first members across slots until the user changes it.
  const roster = (slotId: string, i: number) => assign[slotId] ?? members.slice(i * 3, i * 3 + 3).map((m) => m.id);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  const key = (s: string, m: string) => `${s}:${m}`;

  const signIn = (slotId: string, memberId: string) => {
    setSignIns((p) => ({ ...p, [key(slotId, memberId)]: now }));
    run("recordPrayerSignIn", { chain_id: chainId, slot_id: slotId, member_id: memberId, method: cfg.signInMethod, signed_in_at: now });
  };

  const call = (slotId: string, slotLabel: string, memberId: string) => {
    const k = key(slotId, memberId);
    const failed = calls.filter((c) => c.key === k && c.result === "no_answer").map((c) => c.channel);
    const ch = nextCallChannel(cfg.callOrder, failed);
    if (!ch) return toast.error(`All call channels tried for ${nameOf(memberId)}. Escalate to their leader.`);
    setCalls((p) => [...p, { key: k, channel: ch, result: "ringing", at: now }]);
    run("callPrayerMember", {
      chain_id: chainId, slot_id: slotId, member_id: memberId, channel: ch, attempt: failed.length + 1,
      fallback_channels: cfg.callOrder.filter((c) => c !== ch && !failed.includes(c)),
      message: renderCallMessage(cfg.callMessage, nameOf(memberId).split(" ")[0], slotLabel),
    }, true);
    toast.success(`${callLabel[ch]} to ${nameOf(memberId)}`, { description: "Simulated · the agent says it's time for prayer chain." });
  };
  const markCall = (k: string, result: "no_answer" | "answered") =>
    setCalls((p) => { const i = p.map((c) => c.key).lastIndexOf(k); return p.map((c, j) => (j === i ? { ...c, result } : c)); });

  const agentCheck = async () => {
    let n = 0;
    for (const [i, s] of slots.entries()) for (const m of roster(s.id, i)) {
      const k = key(s.id, m);
      if (slotStatus(s, signIns[k], now, cfg.graceMinutes) === "missed" && !calls.some((c) => c.key === k)) {
        await run("recordPrayerMissed", { chain_id: chainId, slot_id: s.id, member_id: m, grace_minutes: cfg.graceMinutes }, true);
        call(s.id, s.label, m); n++;
      }
    }
    if (!n) toast.info("Everyone due is signed in or already being called.");
  };

  const allIds = slots.flatMap((s, i) => roster(s.id, i));
  const counts = slots.map((s, i) => roster(s.id, i).reduce((a, m) => { const st = slotStatus(s, signIns[key(s.id, m)], now, cfg.graceMinutes); a[st] = (a[st] ?? 0) + 1; return a; }, {} as Partial<Record<PrayerStatus, number>>));
  const praying = counts.reduce((a, c) => a + (c.praying ?? 0) + (c.completed ?? 0), 0);
  const missed = counts.reduce((a, c) => a + (c.missed ?? 0), 0);

  return (
    <div>
      <PageHeader title="Prayer Chain" description={`${cfg.name} · ${cfg.start}–${cfg.end} · ${cfg.slotMinutes}-minute watches · sign in via ${methodLabel[cfg.signInMethod]}`}
        actions={<Button onClick={agentCheck}><Bot className="mr-1 h-4 w-4" />Run agent check</Button>} />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Card className="p-4 shadow-card"><div className="text-xs text-muted-foreground">On the roster</div><div className="font-display text-2xl font-bold">{allIds.length}</div></Card>
        <Card className="p-4 shadow-card"><div className="text-xs text-muted-foreground">Signed in / prayed</div><div className="font-display text-2xl font-bold">{praying}</div></Card>
        <Card className="p-4 shadow-card"><div className="text-xs text-muted-foreground">Not signed in</div><div className="font-display text-2xl font-bold text-destructive">{missed}</div></Card>
        <Card className="p-4 shadow-card"><Label htmlFor="pc-now" className="text-xs text-muted-foreground">Demo clock</Label><Input id="pc-now" type="time" value={now} onChange={(e) => setNow(e.target.value)} className="mt-1" /></Card>
      </div>

      <Tabs defaultValue="watch">
        <TabsList className="flex-wrap">
          <TabsTrigger value="watch">Live watch</TabsTrigger>
          <TabsTrigger value="points">Prayer points & reminders</TabsTrigger>
          <TabsTrigger value="setup">Customise chain</TabsTrigger>
        </TabsList>

        <TabsContent value="watch" className="space-y-3">
          {!slots.length && <Card className="p-5 text-sm text-muted-foreground">No slots. Check the start, end and slot length in Customise chain.</Card>}
          {slots.map((s, i) => {
            const ids = roster(s.id, i);
            return (
              <Card key={s.id} className="p-5 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-bold">{s.label}</h2>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => run("schedulePrayerReminder", { chain_id: chainId, slot_id: s.id, member_ids: ids, channels: cfg.reminderChannels, minutes_before: cfg.reminderMinutesBefore })} aria-label={`Schedule reminders for ${s.label}`}><Bell className="mr-1 h-4 w-4" />Remind</Button>
                  </div>
                </div>
                <ul className="mt-3 divide-y">
                  {ids.map((m) => {
                    const k = key(s.id, m);
                    const st = slotStatus(s, signIns[k], now, cfg.graceMinutes);
                    const mine = calls.filter((c) => c.key === k);
                    const last = mine[mine.length - 1];
                    return (
                      <li key={m} className="flex flex-wrap items-center gap-2 py-2.5">
                        <span className="min-w-40 font-medium">{nameOf(m)}</span>
                        <Badge variant={statusStyle[st].variant}>{statusStyle[st].label}{signIns[k] ? ` · ${signIns[k]}` : ""}</Badge>
                        {last && <span className="text-xs text-muted-foreground">{callLabel[last.channel]}: {last.result === "ringing" ? "calling…" : last.result === "answered" ? "answered" : "no answer"}</span>}
                        <div className="ml-auto flex flex-wrap gap-1.5">
                          {!signIns[k] && <Button size="sm" variant="outline" onClick={() => signIn(s.id, m)} aria-label={`Record sign-in for ${nameOf(m)}`}><CheckCircle2 className="mr-1 h-4 w-4" />Signed in</Button>}
                          {!signIns[k] && last?.result !== "ringing" && <Button size="sm" onClick={() => call(s.id, s.label, m)} aria-label={`Call ${nameOf(m)}`}><Phone className="mr-1 h-4 w-4" />{last ? "Try next channel" : "Call"}</Button>}
                          {last?.result === "ringing" && <>
                            <Button size="sm" variant="outline" onClick={() => markCall(k, "answered")} aria-label={`Mark call answered for ${nameOf(m)}`}>Answered</Button>
                            <Button size="sm" variant="outline" onClick={() => markCall(k, "no_answer")} aria-label={`Mark no answer for ${nameOf(m)}`}><PhoneOff className="mr-1 h-4 w-4" />No answer</Button>
                          </>}
                          <Button size="icon" variant="ghost" onClick={() => setAssign((p) => ({ ...p, [s.id]: ids.filter((x) => x !== m) }))} aria-label={`Remove ${nameOf(m)} from ${s.label}`}><X className="h-4 w-4" /></Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-3 flex gap-2">
                  <Select value={pick[s.id] ?? ""} onValueChange={(v) => setPick((p) => ({ ...p, [s.id]: v }))}>
                    <SelectTrigger className="max-w-xs" aria-label={`Choose a member for ${s.label}`}><SelectValue placeholder="Add a member to this hour" /></SelectTrigger>
                    <SelectContent>{members.filter((m) => !ids.includes(m.id)).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="outline" disabled={!pick[s.id]} onClick={() => { setAssign((p) => ({ ...p, [s.id]: [...ids, pick[s.id]] })); setPick((p) => ({ ...p, [s.id]: "" })); }}><UserPlus className="mr-1 h-4 w-4" />Add</Button>
                </div>
              </Card>
            );
          })}
          <p className="text-xs text-muted-foreground">Demo: sign-ins and calls are simulated. Once WhatsApp and calling are connected, sign-in messages mark members automatically and the agent calls whoever hasn't signed in after {cfg.graceMinutes} minutes — {cfg.callOrder.map((c) => callLabel[c]).join(", then ")}.</p>
        </TabsContent>

        <TabsContent value="points"><PrayerPoints members={members} rosterIds={allIds} cfg={cfg} setCfg={setCfg} /></TabsContent>
        <TabsContent value="setup"><Setup cfg={cfg} setCfg={setCfg} tenantId={tenantId} /></TabsContent>
      </Tabs>
    </div>
  );
}

const msgChannels: { id: PrayerMessageChannel; label: string }[] = [{ id: "whatsapp", label: "WhatsApp" }, { id: "sms", label: "SMS" }, { id: "email", label: "Email" }];

function ChannelPicks({ value, onChange, prefix }: { value: PrayerMessageChannel[]; onChange: (v: PrayerMessageChannel[]) => void; prefix: string }) {
  return (
    <div className="flex flex-wrap gap-4">
      {msgChannels.map((c) => (
        <label key={c.id} className="flex items-center gap-2 text-sm">
          <Checkbox id={`${prefix}-${c.id}`} checked={value.includes(c.id)} onCheckedChange={(v) => onChange(v ? [...value, c.id] : value.filter((x) => x !== c.id))} />{c.label}
        </label>
      ))}
    </div>
  );
}

function PrayerPoints({ members, rosterIds, cfg, setCfg }: { members: { id: string; consent: boolean; email?: string; name?: string }[]; rosterIds: string[]; cfg: PrayerChainConfig; setCfg: (c: PrayerChainConfig) => void }) {
  const run = useAction();
  const { mode, tenantId } = useApp();
  const sendEmails = useServerFn(sendChurchEmails);
  const [channels, setChannels] = useState<PrayerMessageChannel[]>(["whatsapp"]);
  const [audience, setAudience] = useState<"roster" | "all">("roster");
  const [text, setText] = useState("Prayer points for this morning:\n1. Revival in our church and city\n2. Our families and children\n3. Upcoming services and the sick");
  const send = () => {
    const ids = audience === "all" ? members.map((m) => m.id) : rosterIds;
    const ok = ids.filter((i) => members.find((m) => m.id === i)?.consent);
    if (!channels.length || text.trim().length < 5) return toast.error("Choose a channel and write the prayer points.");
    run("sendPrayerPoints", { chain_id: chainId, channels, message: text.trim(), member_ids: ok, recipient_count: ok.length, skipped_no_consent: ids.length - ok.length });
    if (channels.includes("email") && mode === "live") {
      const recipients = ok.map((i) => members.find((m) => m.id === i)).filter((m) => m?.email).map((m) => ({ email: m!.email!, name: m!.name })).slice(0, 100);
      if (!recipients.length) return toast.error("None of these members has an email address.");
      sendEmails({ data: { tenantId, subject: "Prayer points", text: text.trim(), recipients } })
        .then((r) => (r.error && !r.sent ? toast.error(r.error) : toast.success(`Emailed ${r.sent} member${r.sent === 1 ? "" : "s"} from Gmail${r.failed ? ` · ${r.failed} failed` : ""}`)))
        .catch(() => toast.error("Couldn't send the emails."));
    }
  };
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card className="space-y-3 p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">Send prayer points / prayer broadcast</h2>
        <div><Label htmlFor="pp-text">Message</Label><Textarea id="pp-text" rows={6} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} /></div>
        <ChannelPicks prefix="pp" value={channels} onChange={setChannels} />
        <div><Label>Send to</Label>
          <Select value={audience} onValueChange={(v) => setAudience(v as "roster" | "all")}><SelectTrigger aria-label="Audience"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="roster">Prayer chain members</SelectItem><SelectItem value="all">All church members</SelectItem></SelectContent></Select></div>
        <Button onClick={send}><Send className="mr-1 h-4 w-4" />Send</Button>
        <p className="text-xs text-muted-foreground">Members without messaging consent are skipped.</p>
      </Card>
      <Card className="space-y-3 p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">Reminders</h2>
        <div><Label htmlFor="pp-before">Remind members this many minutes before their hour</Label><Input id="pp-before" type="number" min={0} max={240} value={cfg.reminderMinutesBefore} onChange={(e) => setCfg({ ...cfg, reminderMinutesBefore: Number(e.target.value) })} /></div>
        <ChannelPicks prefix="rm" value={cfg.reminderChannels} onChange={(v) => setCfg({ ...cfg, reminderChannels: v })} />
        <p className="text-xs text-muted-foreground">Use "Remind" on each hour in Live watch to schedule them.</p>
      </Card>
    </div>
  );
}

function Setup({ cfg, setCfg }: { cfg: PrayerChainConfig; setCfg: (c: PrayerChainConfig) => void; tenantId: string }) {
  const set = <K extends keyof PrayerChainConfig>(k: K, v: PrayerChainConfig[K]) => setCfg({ ...cfg, [k]: v });
  return (
    <Card className="grid gap-4 p-5 shadow-card sm:grid-cols-2">
      <div className="sm:col-span-2"><Label htmlFor="pc-name">Chain name</Label><Input id="pc-name" value={cfg.name} onChange={(e) => set("name", e.target.value)} /></div>
      <div><Label htmlFor="pc-start">Starts</Label><Input id="pc-start" type="time" value={cfg.start} onChange={(e) => set("start", e.target.value)} /></div>
      <div><Label htmlFor="pc-end">Ends</Label><Input id="pc-end" type="time" value={cfg.end} onChange={(e) => set("end", e.target.value)} /></div>
      <div><Label htmlFor="pc-slot">Minutes each person prays</Label><Input id="pc-slot" type="number" min={15} max={240} step={15} value={cfg.slotMinutes} onChange={(e) => set("slotMinutes", Number(e.target.value))} /></div>
      <div><Label>How members sign in</Label>
        <Select value={cfg.signInMethod} onValueChange={(v) => set("signInMethod", v as PrayerChainConfig["signInMethod"])}><SelectTrigger aria-label="Sign-in method"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(methodLabel).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
      <div><Label htmlFor="pc-grace">Minutes to wait before calling</Label><Input id="pc-grace" type="number" min={0} max={60} value={cfg.graceMinutes} onChange={(e) => set("graceMinutes", Number(e.target.value))} /></div>
      <div><Label>Call order when someone hasn't signed in</Label>
        <Select value={cfg.callOrder.join(",")} onValueChange={(v) => set("callOrder", v.split(",") as PrayerCallChannel[])}><SelectTrigger aria-label="Call order"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="voice,whatsapp_call">Phone call, then WhatsApp call</SelectItem><SelectItem value="whatsapp_call,voice">WhatsApp call, then phone call</SelectItem><SelectItem value="voice">Phone call only</SelectItem><SelectItem value="whatsapp_call">WhatsApp call only</SelectItem></SelectContent></Select></div>
      <div className="sm:col-span-2"><Label htmlFor="pc-msg">What the agent says on the call</Label><Textarea id="pc-msg" rows={3} value={cfg.callMessage} onChange={(e) => set("callMessage", e.target.value)} /><p className="mt-1 text-xs text-muted-foreground">{"{name}"} and {"{slot}"} are filled in automatically.</p></div>
      <div className="sm:col-span-2"><Button variant="outline" onClick={() => { setCfg(defaultPrayerConfig); toast.success("Reset to 3–6am, one hour each"); }}>Reset to default</Button></div>
    </Card>
  );
}
