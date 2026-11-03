import { createContext, useContext, useState, type ReactNode } from "react";
import type { RoleId } from "@/types";
import { tenants } from "@/services/data";
import { roles, can as canRole, type Permission } from "@/config/roles";

interface AppCtx {
  tenantId: string;
  setTenantId: (id: string) => void;
  role: RoleId;
  setRole: (r: RoleId) => void;
  actor: { role: RoleId; name: string };
  can: (p: Permission) => boolean;
}
const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantId] = useState(tenants[0].id);
  const [role, setRole] = useState<RoleId>("church_admin");
  const actor = { role, name: role === "pastor" ? tenants.find((t) => t.id === tenantId)!.pastor : roles[role].label };
  return (
    <Ctx.Provider value={{ tenantId, setTenantId, role, setRole, actor, can: (p) => canRole(role, p) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}
export const useTenant = () => tenants.find((t) => t.id === useApp().tenantId)!;
