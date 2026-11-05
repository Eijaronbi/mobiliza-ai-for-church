/** Pure helpers for imported attendance sheets: parse names, count, and render a church's own report format. */
export type Mark = "present" | "absent" | "unmarked";
export interface SheetEntry { id: string; name: string; phone?: string; mark: Mark }

export const DEFAULT_FORMAT = `*{church} — {title}*
{date}

✅ Present ({present_count}/{total}):
{present_list}

❌ Absent ({absent_count}):
{absent_list}`;

/** One person per line. Accepts "Name", "Name, phone", "Name - phone", "1. Name" or tab-separated spreadsheet rows. Removes duplicates by name. */
export function parseNames(text: string): Omit<SheetEntry, "id" | "mark">[] {
  const seen = new Set<string>();
  const out: Omit<SheetEntry, "id" | "mark">[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s*(\d+[.)]|[-*•])\s*/, "").trim();
    if (!line) continue;
    const parts = line.split(/\t|,|\s+-\s+|\s+–\s+/).map((p) => p.trim()).filter(Boolean);
    const phoneIdx = parts.findIndex((p) => /^\+?[\d\s()-]{7,}$/.test(p));
    const phone = phoneIdx >= 0 ? parts[phoneIdx] : undefined;
    const name = parts.filter((_, i) => i !== phoneIdx).join(" ").replace(/\s+/g, " ");
    if (!name || /^name$/i.test(name)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(phone ? { name, phone } : { name });
  }
  return out;
}

export function countMarks(entries: SheetEntry[]) {
  const present = entries.filter((e) => e.mark === "present");
  const absent = entries.filter((e) => e.mark === "absent");
  return { present, absent, unmarked: entries.length - present.length - absent.length, total: entries.length };
}

const list = (xs: SheetEntry[]) => (xs.length ? xs.map((e, i) => `${i + 1}. ${e.name}`).join("\n") : "—");

/** Fills placeholders: {church} {title} {date} {total} {present_count} {absent_count} {unmarked_count} {present_list} {absent_list}. */
export function renderReport(format: string, ctx: { church: string; title: string; date: string }, entries: SheetEntry[]) {
  const c = countMarks(entries);
  const vals: Record<string, string> = {
    church: ctx.church, title: ctx.title, date: ctx.date, total: String(c.total),
    present_count: String(c.present.length), absent_count: String(c.absent.length), unmarked_count: String(c.unmarked),
    present_list: list(c.present), absent_list: list(c.absent),
  };
  return (format || DEFAULT_FORMAT).replace(/\{(\w+)\}/g, (m, k: string) => vals[k] ?? m);
}

export const whatsappShareUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
