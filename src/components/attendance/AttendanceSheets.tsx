import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ClipboardCopy, Plus, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Section } from "@/components/app/kit";
import { useListData, useRepoMutations } from "@/hooks/use-data";
import { useApp, useTenant } from "@/hooks/use-app";
import { DEFAULT_FORMAT, countMarks, parseNames, renderReport, whatsappShareUrl, type Mark, type SheetEntry } from "@/lib/attendance";
import type { AttendanceSheet } from "@/types";

const uid = () => Math.random().toString(36).slice(2, 10);

async function copy(text: string, what: string) {
  try { await navigator.clipboard.writeText(text); toast.success(`${what} copied`); }
  catch { toast.error("Couldn't copy. Select the text in the preview and copy it manually."); }
}

/** Import names, mark present/absent, and share the list in the church's own format. */
export function AttendanceSheets() {
  const { tenantId } = useApp();
  const tenant = useTenant();
  const sheets = useListData("attendanceSheets").slice().sort((a, b) => b.date.localeCompare(a.date));
  const members = useListData("members");
  const mm = useRepoMutations("attendanceSheets");
  const [openNew, setOpenNew] = useState(false);
  const [selId, setSelId] = useState("");
  const [q, setQ] = useState("");
  const sheet = sheets.find((s) => s.id === selId) ?? sheets[0];

  const save = (patch: Partial<AttendanceSheet>) => sheet && mm.update.mutate({ id: sheet.id, patch: { ...patch, updatedAt: new Date().toISOString() } });
  const setMark = (id: string, mark: Mark) => sheet && save({ entries: sheet.entries.map((e) => (e.id === id ? { ...e, mark } : e)) });

  const c = sheet ? countMarks(sheet.entries as SheetEntry[]) : null;
  const ctx = sheet ? { church: tenant.name, title: sheet.title, date: new Date(sheet.date).toDateString() } : null;
  const report = sheet && ctx ? renderReport(sheet.format, ctx, sheet.entries as SheetEntry[]) : "";
  const shown = useMemo(() => (sheet?.entries ?? []).filter((e) => e.name.toLowerCase().includes(q.toLowerCase())), [sheet, q]);

  return (
    <Section title="Attendance list (import & mark)" action={<Button size="sm" onClick={() => setOpenNew(true)}><Plus className="mr-1 h-4 w-4" />New list</Button>}>
      {!sheet ? (
        <p className="py-6 text-sm text-muted-foreground">No lists yet. Click “New list” and paste names (one per line) or load your members.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <select aria-label="Choose attendance list" className="h-9 rounded-md border bg-background px-2 text-sm" value={sheet.id} onChange={(e) => setSelId(e.target.value)}>
                {sheets.map((s) => <option key={s.id} value={s.id}>{s.title} · {new Date(s.date).toLocaleDateString()}</option>)}
              </select>
              <Input aria-label="Search names" className="h-9 w-40" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
              <span className="text-sm text-muted-foreground">{c!.present.length} present · {c!.absent.length} absent · {c!.unmarked} not marked</span>
            </div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => save({ entries: sheet.entries.map((e) => (e.mark === "unmarked" ? { ...e, mark: "absent" } : e)) })}>Mark the rest absent</Button>
              <Button size="sm" variant="ghost" onClick={() => save({ entries: sheet.entries.map((e) => ({ ...e, mark: "unmarked" })) })}>Clear marks</Button>
              <Button size="sm" variant="ghost" aria-label="Delete this list" onClick={() => { if (confirm("Delete this list?")) mm.remove.mutate(sheet.id); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <ul className="max-h-[440px] divide-y overflow-auto rounded-md border">
              {shown.map((e) => (
                <li key={e.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="flex-1">{e.name}{e.phone && <span className="ml-2 text-xs text-muted-foreground">{e.phone}</span>}</span>
                  <Button size="sm" variant={e.mark === "present" ? "default" : "outline"} aria-pressed={e.mark === "present"} aria-label={`Mark ${e.name} present`} onClick={() => setMark(e.id, e.mark === "present" ? "unmarked" : "present")}><Check className="h-4 w-4" />Present</Button>
                  <Button size="sm" variant={e.mark === "absent" ? "destructive" : "outline"} aria-pressed={e.mark === "absent"} aria-label={`Mark ${e.name} absent`} onClick={() => setMark(e.id, e.mark === "absent" ? "unmarked" : "absent")}><X className="h-4 w-4" />Absent</Button>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3 lg:col-span-2">
            <div>
              <Label htmlFor="att-format">Your church's format</Label>
              <Textarea id="att-format" rows={7} className="mt-1 font-mono text-xs" defaultValue={sheet.format} key={sheet.id} onBlur={(e) => e.target.value !== sheet.format && save({ format: e.target.value })} />
              <p className="mt-1 text-xs text-muted-foreground">Placeholders: {"{church} {title} {date} {total} {present_count} {absent_count} {unmarked_count} {present_list} {absent_list}"}</p>
            </div>
            <div>
              <Label>Preview</Label>
              <pre className="mt-1 max-h-56 overflow-auto whitespace-pre-wrap rounded-md border bg-muted p-3 text-xs">{report}</pre>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => copy(report, "Report")}><ClipboardCopy className="mr-1 h-4 w-4" />Copy report</Button>
              <Button size="sm" variant="outline" onClick={() => copy(c!.present.map((e) => e.name).join("\n"), "Present names")}>Copy present names</Button>
              <Button size="sm" variant="outline" onClick={() => copy(c!.absent.map((e) => e.name).join("\n"), "Absent names")}>Copy absent names</Button>
              <Button size="sm" variant="outline" asChild><a href={whatsappShareUrl(report)} target="_blank" rel="noreferrer"><Send className="mr-1 h-4 w-4" />Send to WhatsApp</a></Button>
            </div>
          </div>
        </div>
      )}
      <NewSheetDialog open={openNew} onOpenChange={setOpenNew} memberNames={members.map((m) => ({ name: m.name, phone: m.phone }))}
        onCreate={(title, date, list) => {
          const id = `${tenantId}_att_${uid()}`;
          mm.create.mutate({ id, tenantId, title, date, format: sheets[0]?.format ?? DEFAULT_FORMAT, updatedAt: new Date().toISOString(),
            entries: list.map((p) => ({ ...p, id: uid(), mark: "unmarked" as const })) } as AttendanceSheet, { onSuccess: () => setSelId(id) });
          setOpenNew(false);
        }} />
    </Section>
  );
}

function NewSheetDialog({ open, onOpenChange, memberNames, onCreate }: {
  open: boolean; onOpenChange: (o: boolean) => void; memberNames: { name: string; phone: string }[];
  onCreate: (title: string, date: string, list: { name: string; phone?: string }[]) => void;
}) {
  const [title, setTitle] = useState("Sunday Service");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [text, setText] = useState("");
  const parsed = parseNames(text);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>New attendance list</DialogTitle><DialogDescription>Paste names from WhatsApp, Excel or Google Sheets — one person per line. A phone number after a comma is kept.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="ns-title">Title</Label><Input id="ns-title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><Label htmlFor="ns-date">Date</Label><Input id="ns-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
          <div>
            <div className="flex items-center justify-between"><Label htmlFor="ns-names">Names</Label>
              <Button type="button" size="sm" variant="link" onClick={() => setText(memberNames.map((m) => `${m.name}, ${m.phone}`).join("\n"))}>Load all members ({memberNames.length})</Button></div>
            <Textarea id="ns-names" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Ada Obi, +234 803 555 1000\nTunde Bello\nGrace Eze"} />
            <p className="mt-1 text-xs text-muted-foreground">{parsed.length} people found</p>
          </div>
        </div>
        <DialogFooter><Button disabled={!title.trim() || !parsed.length} onClick={() => { onCreate(title.trim(), new Date(date).toISOString(), parsed); setText(""); }}>Create list</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
