import type { RoleId } from "@/types";

export type Permission =
  | "view_dashboard" | "manage_members" | "manage_structure" | "run_mobilization"
  | "manage_attendance" | "manage_transport" | "approve_transport" | "manage_followup"
  | "manage_reports" | "approve_reports" | "manage_agents" | "manage_escalations"
  | "manage_services" | "manage_integrations" | "manage_settings" | "manage_tenants"
  | "submit_requests";

export const roles: Record<RoleId, { label: string; description: string; permissions: Permission[] }> = {
  super_admin: { label: "Platform Super Admin", description: "Manages the Mobilizer platform and church tenants.", permissions: ["view_dashboard","manage_members","manage_structure","run_mobilization","manage_attendance","manage_transport","approve_transport","manage_followup","manage_reports","approve_reports","manage_agents","manage_escalations","manage_services","manage_integrations","manage_settings","manage_tenants","submit_requests"] },
  church_admin: { label: "Church Administrator", description: "Manages one church's operations and configuration.", permissions: ["view_dashboard","manage_members","manage_structure","run_mobilization","manage_attendance","manage_transport","approve_transport","manage_followup","manage_reports","approve_reports","manage_agents","manage_escalations","manage_services","manage_integrations","manage_settings","submit_requests"] },
  pastor: { label: "Pastor", description: "Leadership oversight, reporting and escalations.", permissions: ["view_dashboard","manage_escalations","approve_reports","approve_transport","manage_reports","run_mobilization","manage_followup"] },
  department_leader: { label: "Department Leader", description: "Manages assigned departments.", permissions: ["view_dashboard","manage_attendance","manage_reports","manage_followup","manage_transport","run_mobilization"] },
  cell_leader: { label: "Cell Leader", description: "Manages assigned cell members and follow-ups.", permissions: ["view_dashboard","manage_followup","manage_reports","manage_attendance","manage_transport"] },
  member: { label: "Member", description: "Personal information, responses and requests.", permissions: ["submit_requests","view_dashboard"] },
};

export const roleIds = Object.keys(roles) as RoleId[];
export function can(role: RoleId, p: Permission) {
  return roles[role].permissions.includes(p);
}
