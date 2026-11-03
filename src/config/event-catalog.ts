import { z } from "zod";
import type { EventName } from "@/types";

/** Event catalogue: one zod schema + sample payload per event.
 * Payloads carry IDs only (minimal PII) — receivers look up details server-side. */
const id = z.string().min(1);

export const eventSchemas = {
  "member.created": z.object({ member_id: id, group_ids: z.array(id) }),
  "member.updated": z.object({ member_id: id, fields: z.array(z.string()) }),
  "mobilization.started": z.object({ service_id: id, workflow_id: id, member_count: z.number() }),
  "attendance.confirmed": z.object({ member_id: id, service_id: id, attendance_status: z.literal("confirmed") }),
  "attendance.declined": z.object({ member_id: id, service_id: id, attendance_status: z.literal("unavailable") }),
  "transport.requested": z.object({ request_id: id, member_id: id, service_id: id, kind: z.enum(["pickup", "financial"]) }),
  "transport.approved": z.object({ request_id: id, approved_by: z.string() }),
  "transport.departed": z.object({ request_id: id, vehicle_id: id }),
  "transport.arrived": z.object({ request_id: id, vehicle_id: id }),
  "followup.created": z.object({ followup_id: id, kind: z.enum(["first_timer", "new_convert"]), consent: z.boolean() }),
  "followup.completed": z.object({ followup_id: id, outcome: z.string() }),
  "report.submitted": z.object({ report_id: id, template_id: id, unit_id: id }),
  "report.overdue": z.object({ report_id: id, unit_id: id, due_at: z.string() }),
  "escalation.created": z.object({ escalation_id: id, category: z.string(), priority: z.string() }),
  "escalation.resolved": z.object({ escalation_id: id, resolved_by: z.string() }),
} satisfies Record<EventName, z.ZodTypeAny>;

export const eventDescriptions: Record<EventName, string> = {
  "member.created": "A new member record was added.",
  "member.updated": "Member details changed.",
  "mobilization.started": "Mobilization began for a service.",
  "attendance.confirmed": "A member confirmed attendance.",
  "attendance.declined": "A member said they are unavailable.",
  "transport.requested": "A member asked for transport or transport support.",
  "transport.approved": "An administrator approved transport support.",
  "transport.departed": "A vehicle left with passengers.",
  "transport.arrived": "A vehicle arrived at church.",
  "followup.created": "A first timer or new convert was recorded.",
  "followup.completed": "A follow-up journey was completed.",
  "report.submitted": "A report was submitted.",
  "report.overdue": "A report passed its deadline.",
  "escalation.created": "An issue was escalated to leadership.",
  "escalation.resolved": "An escalated issue was resolved.",
};

export const eventNames = Object.keys(eventSchemas) as EventName[];

export function samplePayload(event: EventName): Record<string, unknown> {
  const samples: Record<EventName, Record<string, unknown>> = {
    "member.created": { member_id: "member_demo_001", group_ids: ["cell_demo_01"] },
    "member.updated": { member_id: "member_demo_001", fields: ["phone"] },
    "mobilization.started": { service_id: "service_demo_001", workflow_id: "wf_sunday", member_count: 120 },
    "attendance.confirmed": { member_id: "member_demo_001", service_id: "service_demo_001", attendance_status: "confirmed" },
    "attendance.declined": { member_id: "member_demo_002", service_id: "service_demo_001", attendance_status: "unavailable" },
    "transport.requested": { request_id: "tr_demo_001", member_id: "member_demo_001", service_id: "service_demo_001", kind: "pickup" },
    "transport.approved": { request_id: "tr_demo_001", approved_by: "Church Administrator" },
    "transport.departed": { request_id: "tr_demo_001", vehicle_id: "veh_demo_01" },
    "transport.arrived": { request_id: "tr_demo_001", vehicle_id: "veh_demo_01" },
    "followup.created": { followup_id: "fu_demo_001", kind: "first_timer", consent: true },
    "followup.completed": { followup_id: "fu_demo_001", outcome: "joined_cell" },
    "report.submitted": { report_id: "rep_demo_001", template_id: "tpl_cell", unit_id: "cell_demo_01" },
    "report.overdue": { report_id: "rep_demo_002", unit_id: "cell_demo_02", due_at: "2026-11-01T18:00:00Z" },
    "escalation.created": { escalation_id: "esc_demo_001", category: "transport", priority: "high" },
    "escalation.resolved": { escalation_id: "esc_demo_001", resolved_by: "Pastor" },
  };
  return samples[event];
}
