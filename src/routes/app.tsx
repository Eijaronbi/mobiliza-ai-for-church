import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Megaphone, Bus, HeartHandshake, Sparkles } from "lucide-react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { Topbar } from "@/components/app/Topbar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "Mobilizer — Church Operations" }, { name: "robots", content: "noindex" }] }),
  component: AppLayout,
});

const bottom = [
  { to: "/app", label: "Home", icon: LayoutDashboard },
  { to: "/app/mobilization", label: "Mobilize", icon: Megaphone },
  { to: "/app/transport", label: "Transport", icon: Bus },
  { to: "/app/followup", label: "Follow-up", icon: HeartHandshake },
  { to: "/app/assistant", label: "Ask AI", icon: Sparkles },
] as const;

function AppLayout() {
  const { pathname } = useLocation();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <Topbar />
        <main key={pathname} className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-24 pt-6 md:px-6 md:pb-10">
          <Outlet />
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 backdrop-blur md:hidden">
          {bottom.map((b) => {
            const active = b.to === "/app" ? pathname === "/app" || pathname === "/app/" : pathname.startsWith(b.to);
            return (
              <Link key={b.to} to={b.to} className={cn("flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium", active ? "text-brand" : "text-muted-foreground")}>
                <b.icon className="h-5 w-5" />{b.label}
              </Link>
            );
          })}
        </nav>
      </SidebarInset>
    </SidebarProvider>
  );
}
