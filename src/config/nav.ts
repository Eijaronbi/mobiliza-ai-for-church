import {
  LayoutDashboard, Users, Network, Megaphone, CalendarCheck, Bus, HeartHandshake,
  FileBarChart, Bot, ShieldAlert, CalendarDays, Plug, Settings, Sparkles, HandHeart,
} from "lucide-react";
import type { Permission } from "./roles";

export const nav = [
  { to: "/app", label: "Command Centre", icon: LayoutDashboard, perm: "view_dashboard" },
  { to: "/app/members", label: "Members", icon: Users, perm: "manage_members" },
  { to: "/app/structure", label: "Church Structure", icon: Network, perm: "manage_structure" },
  { to: "/app/mobilization", label: "Mobilization", icon: Megaphone, perm: "run_mobilization" },
  { to: "/app/attendance", label: "Attendance", icon: CalendarCheck, perm: "manage_attendance" },
  { to: "/app/transport", label: "Transportation", icon: Bus, perm: "manage_transport" },
  { to: "/app/followup", label: "First Timers & Follow-up", icon: HeartHandshake, perm: "manage_followup" },
  { to: "/app/reports", label: "Evangelism & Reports", icon: FileBarChart, perm: "manage_reports" },
  { to: "/app/agents", label: "AI Agents", icon: Bot, perm: "manage_agents" },
  { to: "/app/assistant", label: "AI Command Centre", icon: Sparkles, perm: "view_dashboard" },
  { to: "/app/leadership", label: "Leadership & Escalations", icon: ShieldAlert, perm: "manage_escalations" },
  { to: "/app/services", label: "Services & Events", icon: CalendarDays, perm: "manage_services" },
  { to: "/app/prayer", label: "Prayer Chain", icon: HandHeart, perm: "manage_services" },
  { to: "/app/integrations", label: "Integration Hub", icon: Plug, perm: "manage_integrations" },
  { to: "/app/settings", label: "Settings", icon: Settings, perm: "manage_settings" },
] as const satisfies readonly { to: string; label: string; icon: unknown; perm: Permission }[];

export type NavPath = (typeof nav)[number]["to"];
