import { useServerFn } from "@tanstack/react-start";
import { sendChurchEmails } from "@/lib/gmail.functions";
import { useApp } from "@/hooks/use-app";
import { channelLabel } from "@/config/channels";
import { useMemo, useState } from "react";
import { Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAction, useListData } from "@/hooks/use-data";
import { fmtDateTime } from "@/lib/format";
import type { Service } from "@/types";

type Channel = "sms" | "whatsapp" | "email";
interface Contact { name: string; phone: string }
interface WaGroup { name: string; groupId: string }

const phoneRe = /^\+?[1-9]\d{7,14}$/;
const contactSchema = z.object({ name: z.string().trim().min(2).max(80), phone: z.string().trim().regex(phoneRe) });
const groupSchema = z.object({ name: z.string().trim().min(2).max(80), groupId: z.string().trim().min(3).max(120) });

export function defaultBroadcastMessage(s: Service) {
  return `You're invited to ${s.name} on ${fmtDateTime(s.date)} at ${s.location}. Reply YES to confirm or NEED RIDE for transport.`;
}

export function BroadcastDialog({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const members = useListData("members");
  const units = useListData("units");
  const dispatch = useAction();
  const { mode, tenantId } = useApp();
  const sendEmails = useServerFn(sendChurchEmails);
  const [channels, setChannels] = useState<Channel[]>(["sms", "whatsapp"]);
  const [message, setMessage] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [unitIds, setUnitIds] = useState<string[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [waGroups, setWaGroups] = useState<WaGroup[]>([]);
  const [q, setQ] = useState("");
  const [draftC, setDraftC] = useState<Contact>({ name: "", phone: "" });
  const [draftG, setDraftG] = useState<WaGroup>({ name: "", groupId: "" });
  const [sending, setSending] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);

  // reset when a new service opens
  if (service && lastId !== service.id) {
    setLastId(service.id); setMessage(defaultBroadcastMessage(service));
    setMemberIds([]); setUnitIds([]); setContacts([]); setWaGroups([]); setChannels(["sms", "whatsapp"]);
  }

  const groupUnits = units.filter((u) => ["cell", "home_group", "department", "unit", "team", "zone"].includes(u.type));
  const filtered = members.filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()) || m.phone.includes(q)).slice(0, 40);

  const resolved = useMemo(() => {
    const set = new Set(memberIds);
    members.forEach((m) => { if (m.groupIds.some((g) => unitIds.includes(g))) set.add(m.id); });
    const picked = members.filter((m) => set.has(m.id));
    return { consented: picked.filter((m) => m.consent), skipped: picked.filter((m) => !m.consent).length };
  }, [members, memberIds, unitIds]);

  const total = resolved.consented.length + contacts.length;
  const toggle = <T,>(list: T[], v: T, set: (x: T[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const addContact = () => {
    const p = contactSchema.safeParse(draftC);
    if (!p.success) return toast.error("Enter a name and a phone number in international format, e.g. +2348012345678");
    if (contacts.some((c) => c.phone === p.data.phone)) return toast.error("That number is already added");
    setContacts([...contacts, p.data]); setDraftC({ name: "", phone: "" });
  };
  const addGroup = () => {
    const p = groupSchema.safeParse(draftG);
    if (!p.success) return toast.error("Enter the WhatsApp group name and its group ID or invite link");
    setWaGroups([...waGroups, p.data]); setDraftG({ name: "", groupId: "" });
  };

  const send = async () => {
    if (!service) return;
    if (!channels.length) return toast.error("Choose WhatsApp, SMS or Email");
    if (message.trim().length < 5) return toast.error("Write the message to send");
    if (!total && !(channels.includes("whatsapp") && waGroups.length)) return toast.error("Add at least one person, church group or WhatsApp group");
    if (waGroups.length && !channels.includes("whatsapp")) return toast.error("WhatsApp groups need the WhatsApp channel turned on");
    setSending(true);
    const res = await dispatch("broadcastService", {
      broadcast_id: `bc_${Date.now()}`,
      service_id: service.id,
      channels,
      message: message.trim(),
      member_ids: resolved.consented.map((m) => m.id),
      unit_ids: unitIds,
      external_recipients: contacts,
      whatsapp_groups: channels.includes("whatsapp") ? waGroups : [],
      recipient_count: total,
      skipped_no_consent: resolved.skipped,
    });
    if (res && channels.includes("email") && mode === "live") {
      const recipients = resolved.consented.filter((m) => m.email).map((m) => ({ email: m.email, name: m.name })).slice(0, 100);
      if (recipients.length) {
        const r = await sendEmails({ data: { tenantId, subject: service.name, text: message.trim(), recipients } }).catch(() => null);
        if (r?.sent) toast.success(`Emailed ${r.sent} from Gmail${r.failed ? ` · ${r.failed} failed` : ""}`);
        else toast.error(r?.error ?? "Couldn't send the emails.");
      }
    }
    setSending(false);
    if (res) onClose();
  };

  return (
    <Dialog open={!!service} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Broadcast schedule</DialogTitle>
          <DialogDescription>{service ? `${service.name} · ${fmtDateTime(service.date)}` : ""}</DialogDescription>
        </DialogHeader>
        {service && <div className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Send via</legend>
            <div className="flex gap-4">
              {(["whatsapp", "sms", "email"] as Channel[]).map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={channels.includes(c)} onCheckedChange={() => toggle(channels, c, setChannels)} aria-label={channelLabel(c)} />
                  {channelLabel(c)}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1">
            <Label htmlFor="bc-msg">Message</Label>
            <Textarea id="bc-msg" rows={4} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
            <p className="text-xs text-muted-foreground">{message.length}/1000 · SMS over 160 characters is sent as several parts.</p>
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Church groups</h3>
            <div className="flex flex-wrap gap-2">
              {groupUnits.map((u) => (
                <Button key={u.id} type="button" size="sm" variant={unitIds.includes(u.id) ? "default" : "outline"} aria-pressed={unitIds.includes(u.id)} onClick={() => toggle(unitIds, u.id, setUnitIds)}>{u.name}</Button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Individual members</h3>
            <Input aria-label="Search members" placeholder="Search by name or number" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
              {filtered.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={memberIds.includes(m.id)} onCheckedChange={() => toggle(memberIds, m.id, setMemberIds)} aria-label={m.name} />
                  <span className="flex-1">{m.name}</span><span className="text-muted-foreground">{m.phone}</span>
                  {!m.consent && <Badge variant="outline">No consent</Badge>}
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Other people (name and number)</h3>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input aria-label="Contact name" placeholder="Name" value={draftC.name} onChange={(e) => setDraftC({ ...draftC, name: e.target.value })} />
              <Input aria-label="Contact phone" placeholder="+2348012345678" value={draftC.phone} onChange={(e) => setDraftC({ ...draftC, phone: e.target.value })} />
              <Button type="button" variant="outline" onClick={addContact}><Plus className="mr-1 h-4 w-4" />Add</Button>
            </div>
            {contacts.map((c) => (
              <div key={c.phone} className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5 text-sm">
                <span>{c.name} · {c.phone}</span>
                <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${c.name}`} onClick={() => setContacts(contacts.filter((x) => x.phone !== c.phone))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </section>

          {channels.includes("whatsapp") && <section className="space-y-2">
            <h3 className="text-sm font-semibold">WhatsApp groups</h3>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input aria-label="WhatsApp group name" placeholder="Group name" value={draftG.name} onChange={(e) => setDraftG({ ...draftG, name: e.target.value })} />
              <Input aria-label="WhatsApp group ID or invite link" placeholder="Group ID or invite link" value={draftG.groupId} onChange={(e) => setDraftG({ ...draftG, groupId: e.target.value })} />
              <Button type="button" variant="outline" onClick={addGroup}><Plus className="mr-1 h-4 w-4" />Add</Button>
            </div>
            {waGroups.map((g) => (
              <div key={g.groupId} className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5 text-sm">
                <span>{g.name}</span>
                <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${g.name}`} onClick={() => setWaGroups(waGroups.filter((x) => x.groupId !== g.groupId))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </section>}

          <p className="text-sm" aria-live="polite">
            <strong>{total}</strong> people{waGroups.length && channels.includes("whatsapp") ? ` + ${waGroups.length} WhatsApp group${waGroups.length > 1 ? "s" : ""}` : ""}
            {resolved.skipped ? ` · ${resolved.skipped} skipped (no messaging consent)` : ""}
          </p>
        </div>}
        <DialogFooter><Button onClick={send} disabled={sending}><Send className="mr-1 h-4 w-4" />{sending ? "Sending…" : "Send broadcast"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
