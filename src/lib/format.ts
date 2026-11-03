import { appConfig } from "@/config/app.config";

const NOW = new Date(appConfig.demoNow).getTime();
export const demoNow = () => NOW;

export function fmtDate(iso?: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "Africa/Lagos", ...opts });
}
export function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
export function timeAgo(iso: string) {
  const m = Math.round((NOW - new Date(iso).getTime()) / 60000);
  if (m < 0) return `in ${fmtRel(-m)}`;
  return `${fmtRel(m)} ago`;
}
function fmtRel(m: number) {
  if (m < 60) return `${Math.max(m, 1)}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
}
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
export const initials = (n: string) => n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
export const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
