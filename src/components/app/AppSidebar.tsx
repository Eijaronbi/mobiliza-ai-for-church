import { Link, useLocation } from "@tanstack/react-router";
import { Church } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { nav } from "@/config/nav";
import { useApp } from "@/hooks/use-app";

export function AppSidebar() {
  const { can, mode } = useApp();
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-2 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-brand text-brand-foreground shadow-elegant"><Church className="h-4 w-4" /></span>
          <span className="font-display text-base font-bold text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden">Mobilizer</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.filter((n) => can(n.perm)).map((n) => {
                const active = n.to === "/app" ? pathname === "/app" || pathname === "/app/" : pathname.startsWith(n.to);
                return (
                  <SidebarMenuItem key={n.to}>
                    <SidebarMenuButton asChild isActive={active} tooltip={n.label}>
                      <Link to={n.to} onClick={() => setOpenMobile(false)}>
                        <n.icon />
                        <span>{n.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="rounded-lg bg-sidebar-accent p-3 text-xs text-sidebar-foreground group-data-[collapsible=icon]:hidden">
          <div className="font-semibold text-sidebar-accent-foreground">{mode === "live" ? "Live church" : "Demo mode"}</div>
          {mode === "live" ? "Changes are saved to your church. Messages go out only through connected services." : "Data and AI actions are simulated. No external services are called."}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
