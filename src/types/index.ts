// Central TypeScript contracts for Mobilizer.
// UI, data access, events and integrations all speak these types.

export type ID = string;
export type ISODate = string;

// ---------- Tenancy & roles ----------
export type RoleId =
  | "super_admin"
  | "church_admin"
  | "pastor"
  | "department_leader"
  | "cell_leader"
  | "member";

export interface Tenant {
  id: ID;
  name: string;
  city: string;
  timezone: string;
  pastor: string;
}

// ---------- Domain ----------
export type MembershipStatus = "active" | "new" | "inactive" | "visitor";
export type ContactChannel = "call" | "sms" | "whatsapp" | "email";

export interface Member {
  id: ID;
  tenantId: ID;
  name: string;
  phone: string;
  email: string;
  location: string;
  status: MembershipStatus;
  departmentId?: ID;
  groupIds: ID[];
  leaderId?: ID;
  contactPreference: ContactChannel;
  consent: boolean;
  joinedAt: ISODate;
}

export type UnitType = "branch" | "department" | "unit" | "cell" | "home_group" | "zone" | "team";
export interface OrgUnit {
  id: ID;
  tenantId: ID;
  name: string;
  type: UnitType;
  parentId?: ID;
  leaderId?: ID;
}

export type ServiceKind = "sunday" | "midweek" | "prayer" | "conference" | "special" | "outreach";
export interface Service {
  id: ID;
  tenantId: ID;
  name: string;
  kind: ServiceKind;
  date: ISODate; // start datetime
  location: string;
  expected: number;
  leaderIds: ID[];
  workflowId: ID;
  contactSchedule: string[]; // e.g. ["-3d 10:00", "-1d 17:00"]
}

export type AttendanceResponse = "confirmed" | "unavailable" | "no_response" | "pending";
export interface MobilizationRecord {
  id: ID;
  tenantId: ID;
  serviceId: ID;
  memberId: ID;
  contacted: boolean;
  response: AttendanceResponse;
  transportNeeded: boolean;
  followUpPending: boolean;
  attended?: boolean;
  channel?: ContactChannel;
  updatedAt: ISODate;
}

export interface WorkflowStage {
  id: ID;
  name: string;
  offset: string; // relative to service time
  channel: ContactChannel;
  enabled: boolean;
}
export interface MobilizationWorkflow {
  id: ID;
  tenantId: ID;
  name: string;
  stages: WorkflowStage[];
  contactWindow: { start: string; end: string };
}

export type TransportStatus =
  | "requested"
  | "leader_review"
  | "approved"
  | "rejected"
  | "scheduled"
  | "departed"
  | "en_route"
  | "arrived";
export interface TransportRequest {
  id: ID;
  tenantId: ID;
  memberId: ID;
  serviceId: ID;
  kind: "pickup" | "financial";
  amount?: number;
  pickupPointId: ID;
  vehicleId?: ID;
  status: TransportStatus;
  createdAt: ISODate;
  history: { status: TransportStatus; at: ISODate; by: string }[];
}
export interface PickupPoint { id: ID; tenantId: ID; name: string; x: number; y: number }
export interface Vehicle { id: ID; tenantId: ID; label: string; plate: string; capacity: number; driverName: string; driverPhone: string; position: { x: number; y: number } }

export type FollowUpStatus = "new" | "assigned" | "scheduled" | "contacted" | "failed" | "escalated" | "completed";
export interface FollowUp {
  id: ID;
  tenantId: ID;
  name: string;
  phone: string;
  location: string;
  encounteredAt: ISODate;
  kind: "first_timer" | "new_convert";
  referrer: string;
  assignedLeaderId?: ID;
  consent: boolean;
  channel: ContactChannel;
  status: FollowUpStatus;
  nextContactAt?: ISODate;
  notes: string;
  log: CommunicationRecord[];
}

export interface CommunicationRecord {
  id: ID;
  at: ISODate;
  channel: ContactChannel;
  direction: "outbound" | "inbound";
  by: "ai_agent" | "human";
  summary: string;
  outcome: "success" | "no_answer" | "failed" | "escalated";
  simulated: boolean;
}

export type ReportType = "individual" | "cell" | "department" | "outreach" | "weekly" | "monthly";
export interface ReportTemplate { id: ID; tenantId: ID; name: string; type: ReportType; fields: { key: string; label: string; kind: "number" | "text" }[]; deadline: string; reminder: string }
export type ReportStatus = "pending" | "submitted" | "approved" | "overdue";
export interface Report {
  id: ID;
  tenantId: ID;
  templateId: ID;
  unitId: ID;
  submittedBy: string;
  period: string;
  status: ReportStatus;
  dueAt: ISODate;
  values: Record<string, number | string>;
}

export type Priority = "low" | "medium" | "high" | "urgent";
export type EscalationStatus = "open" | "in_progress" | "resolved";
export interface Escalation {
  id: ID;
  tenantId: ID;
  title: string;
  detail: string;
  category: "transport" | "mobilization" | "followup" | "report" | "member_issue";
  priority: Priority;
  ownerName: string;
  status: EscalationStatus;
  createdAt: ISODate;
}

export interface Activity { id: ID; tenantId: ID; at: ISODate; kind: string; text: string; actor: string }

// ---------- Agents ----------
export type AgentStatus = "active" | "paused" | "simulated";
export interface Agent {
  id: ID;
  tenantId: ID;
  name: string;
  description: string;
  status: AgentStatus;
  instructions: string;
  workflows: ID[]; // action ids
  tools: string[];
  webhookEndpointId?: ID;
  apiIntegrationId?: ID;
}
export interface AgentExecution {
  id: ID;
  tenantId: ID;
  agentId: ID;
  at: ISODate;
  action: string;
  result: "success" | "failed" | "pending";
  durationMs: number;
  simulated: true;
}

// ---------- Integrations ----------
export type IntegrationKind =
  | "n8n" | "voicebip" | "database" | "whatsapp" | "sms" | "ai" | "maps" | "email" | "custom";
export type IntegrationStatus = "not_connected" | "config_required" | "connected" | "error" | "disabled";
export type AuthType = "none" | "bearer" | "api_key" | "basic" | "custom_header" | "hmac";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Secrets are NEVER stored here — only the name of a server-side secret. */
export interface AuthConfig { type: AuthType; secretRef?: string; headerName?: string }

export interface WebhookEndpoint {
  id: ID;
  tenantId: ID;
  integrationId: ID;
  workflow: "mobilization" | "transport" | "followup" | "reporting" | "leadership" | "general";
  name: string;
  description: string;
  url: string;
  method: HttpMethod;
  auth: AuthConfig;
  headers: Record<string, string>;
  payloadTemplate: string;
  active: boolean;
  direction: "outgoing" | "incoming";
  events: EventName[];
}

export interface IntegrationConfig {
  id: ID;
  tenantId: ID;
  kind: IntegrationKind;
  name: string;
  description: string;
  status: IntegrationStatus;
  enabled: boolean;
  baseUrl: string;
  auth: AuthConfig;
  settings: Record<string, string | number | boolean>;
  lastSuccessAt?: ISODate;
}

export interface CustomApiConfig {
  id: ID;
  tenantId: ID;
  name: string;
  baseUrl: string;
  path: string;
  method: HttpMethod;
  auth: AuthConfig;
  headers: Record<string, string>;
  body: string;
  responseMapping: Record<string, string>;
  timeoutMs: number;
  enabled: boolean;
}

// ---------- Events ----------
export type EventName =
  | "member.created" | "member.updated"
  | "mobilization.started"
  | "attendance.confirmed" | "attendance.declined"
  | "transport.requested" | "transport.approved" | "transport.departed" | "transport.arrived"
  | "followup.created" | "followup.completed"
  | "report.submitted" | "report.overdue"
  | "escalation.created" | "escalation.resolved";

export interface EventEnvelope<T = Record<string, unknown>> {
  event: EventName;
  event_id: string;
  timestamp: ISODate;
  tenant_id: ID;
  source: "mobilizer";
  actor: { role: RoleId; name: string };
  data: T;
}

// ---------- API / transport ----------
export interface ApiRequest {
  integrationId: ID;
  endpointId?: ID;
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}
export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  durationMs: number;
  data?: T;
  error?: string;
  simulated: boolean;
}

export type DeliveryStatus = "delivered" | "failed" | "pending_backend" | "retrying";
export interface DeliveryLog {
  id: ID;
  tenantId: ID;
  at: ISODate;
  integrationId: ID;
  integrationName: string;
  event: EventName | "connection.test";
  endpoint: string;
  method: HttpMethod;
  requestStatus: DeliveryStatus;
  responseStatus?: number;
  durationMs: number;
  error?: string;
  retries: number;
  payload: string; // redacted JSON
  simulated: boolean;
}

export interface WorkflowExecution {
  id: ID;
  actionId: ID;
  event: EventName;
  endpointId?: ID;
  status: DeliveryStatus;
  at: ISODate;
}
