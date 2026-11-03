import type { EventName, WebhookEndpoint } from "@/types";

/** ActionRegistry: every consequential UI action maps to one event and one workflow slot.
 * The Integration Hub binds a workflow slot to a concrete webhook endpoint — the UI never knows URLs. */
export interface ActionDefinition {
  id: string;
  label: string;
  event: EventName;
  workflow: WebhookEndpoint["workflow"];
  defaultEndpointName: string;
  requiresConfirmation: boolean;
}

export const actions = {
  registerVehicle: { id: "registerVehicle", label: "Bus registration recorded", event: "vehicle.registered", workflow: "transport", defaultEndpointName: "Register bus", requiresConfirmation: false },
  startMobilization: { id: "startMobilization", label: "Start mobilization", event: "mobilization.started", workflow: "mobilization", defaultEndpointName: "Start mobilization", requiresConfirmation: true },
  confirmAttendance: { id: "confirmAttendance", label: "Receive attendance response", event: "attendance.confirmed", workflow: "mobilization", defaultEndpointName: "Receive attendance response", requiresConfirmation: false },
  declineAttendance: { id: "declineAttendance", label: "Record unavailable", event: "attendance.declined", workflow: "mobilization", defaultEndpointName: "Receive attendance response", requiresConfirmation: false },
  requestTransport: { id: "requestTransport", label: "New transport request", event: "transport.requested", workflow: "transport", defaultEndpointName: "New transport request", requiresConfirmation: false },
  approveTransport: { id: "approveTransport", label: "Approve transport assistance", event: "transport.approved", workflow: "transport", defaultEndpointName: "Approve transport assistance", requiresConfirmation: true },
  recordDeparture: { id: "recordDeparture", label: "Record departure", event: "transport.departed", workflow: "transport", defaultEndpointName: "Record departure", requiresConfirmation: false },
  recordArrival: { id: "recordArrival", label: "Record arrival", event: "transport.arrived", workflow: "transport", defaultEndpointName: "Record arrival", requiresConfirmation: false },
  newFirstTimer: { id: "newFirstTimer", label: "New first timer", event: "followup.created", workflow: "followup", defaultEndpointName: "New first timer", requiresConfirmation: false },
  completeFollowUp: { id: "completeFollowUp", label: "Record call outcome", event: "followup.completed", workflow: "followup", defaultEndpointName: "Record call outcome", requiresConfirmation: false },
  submitReport: { id: "submitReport", label: "Receive report submission", event: "report.submitted", workflow: "reporting", defaultEndpointName: "Receive report submission", requiresConfirmation: false },
  reportOverdue: { id: "reportOverdue", label: "Send report reminder", event: "report.overdue", workflow: "reporting", defaultEndpointName: "Send report reminder", requiresConfirmation: false },
  createEscalation: { id: "createEscalation", label: "Create escalation", event: "escalation.created", workflow: "leadership", defaultEndpointName: "Create escalation", requiresConfirmation: false },
  resolveEscalation: { id: "resolveEscalation", label: "Resolve issue", event: "escalation.resolved", workflow: "leadership", defaultEndpointName: "Resolve issue", requiresConfirmation: true },
  broadcastService: { id: "broadcastService", label: "Schedule broadcast sent", event: "service.broadcast", workflow: "mobilization", defaultEndpointName: "Broadcast service schedule", requiresConfirmation: false },
  createMember: { id: "createMember", label: "Member created", event: "member.created", workflow: "general", defaultEndpointName: "Member events", requiresConfirmation: false },
  updateMember: { id: "updateMember", label: "Member updated", event: "member.updated", workflow: "general", defaultEndpointName: "Member events", requiresConfirmation: false },
} as const satisfies Record<string, ActionDefinition>;

export type ActionId = keyof typeof actions;
export const actionList: ActionDefinition[] = Object.values(actions);
