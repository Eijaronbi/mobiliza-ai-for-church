import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between animate-rise">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function useCountUp(target: number) {
  const [v, setV] = useState(target);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setV(target);
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => { const p = Math.min((t - t0) / 700, 1); setV(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

const tones = {
  brand: "bg-accent text-accent-foreground",
  info: "bg-info/12 text-info",
  success: "bg-success/12 text-success",
  warning: "bg-warning/18 text-warning-foreground",
  danger: "bg-destructive/12 text-destructive",
} as const;
export type Tone = keyof typeof tones;

export function StatCard({ label, value, icon: Icon, tone = "brand", delta, hint, delay = 0 }: { label: string; value: number; icon: LucideIcon; tone?: Tone; delta?: number; hint?: string; delay?: number }) {
  const v = useCountUp(value);
  return (
    <Card className="group p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tones[tone])}><Icon className="h-4.5 w-4.5" /></span>
        {delta !== undefined && (
          <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", delta >= 0 ? "text-success" : "text-destructive")}>
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{Math.abs(delta)}%
          </span>
        )}
      </div>
      <div className="mt-3 font-display text-2xl font-bold tabular-nums text-foreground">{v.toLocaleString()}</div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </Card>
  );
}

const statusTone: Record<string, Tone> = {
  confirmed: "success", completed: "success", approved: "success", arrived: "success", resolved: "success", delivered: "success", success: "success", connected: "success", active: "success", contacted: "success", submitted: "info",
  pending: "warning", no_response: "warning", requested: "warning", leader_review: "warning", scheduled: "info", assigned: "info", in_progress: "info", departed: "info", en_route: "info", new: "brand", open: "warning", config_required: "warning", pending_backend: "warning", retrying: "warning", simulated: "brand", paused: "warning",
  unavailable: "danger", rejected: "danger", failed: "danger", overdue: "danger", escalated: "danger", error: "danger", urgent: "danger", high: "danger", medium: "warning", low: "info",
  not_connected: "info", disabled: "info", inactive: "info", visitor: "info",
};
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = statusTone[status] ?? "info";
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", tones[tone], className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full bg-current", (status === "en_route" || status === "in_progress") && "animate-pulse")} />
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function SimBadge({ label = "Simulated" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-brand/40 bg-accent/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
      <FlaskConical className="h-3 w-3" /> {label}
    </span>
  );
}

export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("p-5 shadow-card animate-rise", className)}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}

export function Confirm({ trigger, title, description, onConfirm, confirmLabel = "Confirm" }: { trigger: ReactNode; title: string; description: string; onConfirm: () => void; confirmLabel?: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "success" | "warning" }) {
  const bg = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-gradient-brand";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-[width] duration-700", bg)} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}
