/** Prefixes a quote so spreadsheet apps never run a cell as a formula (=, +, -, @, tab, CR). */
export const safeCell = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};
/** Quote a value for a hand-built CSV row. */
export const csvField = (v: unknown) => `"${safeCell(v).replace(/"/g, '""')}"`;
