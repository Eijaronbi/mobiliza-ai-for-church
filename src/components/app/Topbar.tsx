import { useEffect, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { Bell, HelpCircle, Plus, Search, Building2, UserCircle2 } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useApp } from "@/hooks/use-app";
import { useListData } from "@/hooks/use-data";
import { tenants } from "@/services/data";
import { roles, roleIds } from "@/config/roles";
import { nav } from "@/config/nav";
import { timeAgo } from "@/lib/format";
import type { RoleId } from "@/types";

export function Topbar() {
  const { tenantId, setTenantId, role, setRole, actor } = useApp();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const members = useListData("members");
  const escalations = useListData("escalations").filter((e) => e.status !== "resolved").slice(0, 5);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen((o) => !o); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur md:px-5">
      <SidebarTrigger />
      <button onClick={() => setOpen(true)} className="flex h-9 flex-1 items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground transition-colors hover:bg-muted md:max-w-sm">
        <Search className="h-4 w-4" /><span className="truncate">Search members, pages…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 text-[10px] md:inline">⌘K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-1">
        <Select value={tenantId} onValueChange={setTenantId}>
          <SelectTrigger className="hidden h-9 w-[200px] lg:flex"><Building2 className="h-4 w-4 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent>{tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Quick actions"><Plus className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigate({ to: "/app/members" })}>Add member</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/app/followup" })}>Record first timer</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/app/mobilization" })}>Start mobilization</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/app/transport" })}>Review transport</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/app/assistant" })}>Ask AI Command Centre</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="Notifications" className="relative"><Bell className="h-4 w-4" />{escalations.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />}</Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b px-4 py-3 text-sm font-semibold">Needs attention</div>
            {escalations.map((e) => (
              <Link key={e.id} to="/app/leadership" className="block border-b px-4 py-3 text-sm last:border-0 hover:bg-muted">
                <div className="font-medium">{e.title}</div><div className="text-xs text-muted-foreground">{timeAgo(e.createdAt)} · {e.ownerName}</div>
              </Link>
            ))}
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild><Button size="icon" variant="ghost" aria-label="Help"><HelpCircle className="h-4 w-4" /></Button></PopoverTrigger>
          <PopoverContent align="end" className="w-72 text-sm">
            <div className="font-semibold">Help & support</div>
            <p className="mt-1 text-muted-foreground">Switch roles from your profile to preview each experience. Integrations are configured in the Integration Hub.</p>
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2"><UserCircle2 className="h-5 w-5" /><span className="hidden max-w-[140px] truncate text-xs md:inline">{actor.name}</span></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Preview as role (demo)</DropdownMenuLabel>
            {roleIds.map((r) => (
              <DropdownMenuItem key={r} onClick={() => { setRole(r as RoleId); navigate({ to: "/app" }); }} className={r === role ? "bg-accent" : ""}>
                <div><div className="text-sm font-medium">{roles[r].label}</div><div className="text-[11px] text-muted-foreground">{roles[r].description}</div></div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <div className="p-2 lg:hidden">
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search members or jump to a page…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Pages">
            {nav.map((n) => <CommandItem key={n.to} onSelect={() => { setOpen(false); navigate({ to: n.to }); }}><n.icon className="mr-2 h-4 w-4" />{n.label}</CommandItem>)}
          </CommandGroup>
          <CommandGroup heading="Members">
            {members.slice(0, 60).map((m) => <CommandItem key={m.id} value={`${m.name} ${m.phone}`} onSelect={() => { setOpen(false); navigate({ to: "/app/members/$memberId", params: { memberId: m.id } }); }}>{m.name}<span className="ml-auto text-xs text-muted-foreground">{m.location}</span></CommandItem>)}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
