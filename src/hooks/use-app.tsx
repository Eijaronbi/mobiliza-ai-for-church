import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import type { RoleId, Tenant } from "@/types";
import { tenants as demoTenants } from "@/services/data";
import { setDataMode, prefersDemo, setDemoPreference, type DataMode } from "@/services/data/mode";
import { roles, can as canRole, type Permission } from "@/config/roles";
import { supabase } from "@/integrations/supabase/client";

export interface LiveChurch extends Tenant { role: RoleId }

interface AppCtx {
  mode: DataMode;
  ready: boolean;
  session: Session | null;
  tenants: Tenant[];
  liveChurches: LiveChurch[];
  tenantId: string;
  setTenantId: (id: string) => void;
  role: RoleId;
  setRole: (r: RoleId) => void;
  actor: { role: RoleId; name: string };
  can: (p: Permission) => boolean;
  useDemo: (on: boolean) => void;
  reloadChurches: () => Promise<LiveChurch[]>;
  signOut: () => Promise<void>;
}
const Ctx = createContext<AppCtx | null>(null);

async function fetchChurches(): Promise<LiveChurch[]> {
  await supabase.rpc("accept_invites");
  const { data, error } = await supabase.from("user_roles").select("role, tenants(id, name, city, timezone, pastor)");
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((r) => (r.tenants ? [{ ...(r.tenants as Tenant), role: r.role as RoleId }] : []));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [demo, setDemo] = useState(true);
  const [liveChurches, setLiveChurches] = useState<LiveChurch[]>([]);
  const [demoTenantId, setDemoTenantId] = useState(demoTenants[0].id);
  const [liveTenantId, setLiveTenantId] = useState<string>("");
  const [demoRole, setDemoRole] = useState<RoleId>("church_admin");

  const reloadChurches = useCallback(async () => {
    const list = await fetchChurches();
    setLiveChurches(list);
    setLiveTenantId((cur) => (list.some((c) => c.id === cur) ? cur : list[0]?.id ?? ""));
    return list;
  }, []);

  useEffect(() => {
    let alive = true;
    const apply = async (s: Session | null) => {
      if (!alive) return;
      setSession(s);
      const live = !!s && !prefersDemo();
      if (s) { try { await reloadChurches(); } catch { /* shown on pages */ } } else setLiveChurches([]);
      setDataMode(live ? "live" : "demo");
      setDemo(!live);
      setReady(true);
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void apply(s).then(() => { if (event !== "SIGNED_OUT") qc.invalidateQueries(); });
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [qc, reloadChurches]);

  const mode: DataMode = demo ? "demo" : "live";
  const tenantsList: Tenant[] = mode === "live" ? liveChurches : demoTenants;
  const tenantId = mode === "live" ? liveTenantId : demoTenantId;
  const liveRole = liveChurches.find((c) => c.id === liveTenantId)?.role ?? "member";
  const role = mode === "live" ? liveRole : demoRole;
  const tenant = tenantsList.find((t) => t.id === tenantId);
  const displayName = (session?.user.user_metadata?.full_name as string | undefined) ?? session?.user.email ?? "";
  const actor = { role, name: mode === "live" ? displayName : role === "pastor" ? tenant?.pastor ?? "" : roles[role].label };

  const value = useMemo<AppCtx>(() => ({
    mode, ready, session, tenants: tenantsList, liveChurches, tenantId,
    setTenantId: mode === "live" ? setLiveTenantId : setDemoTenantId,
    role, setRole: (r) => { if (mode === "demo") setDemoRole(r); },
    actor, can: (p) => canRole(role, p),
    useDemo: (on) => { setDemoPreference(on); setDataMode(on || !session ? "demo" : "live"); setDemo(on || !session); qc.clear(); },
    reloadChurches,
    signOut: async () => {
      await qc.cancelQueries(); qc.clear(); setDemoPreference(false);
      await supabase.auth.signOut();
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [mode, ready, session, tenantsList, liveChurches, tenantId, role, actor.name, qc, reloadChurches]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}
const blankTenant: Tenant = { id: "", name: "Your church", city: "", timezone: "Africa/Lagos", pastor: "" };
export const useTenant = (): Tenant => {
  const { tenants, tenantId } = useApp();
  return tenants.find((t) => t.id === tenantId) ?? blankTenant;
};
