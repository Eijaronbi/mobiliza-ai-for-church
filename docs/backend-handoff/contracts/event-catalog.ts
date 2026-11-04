import { z } from "zod";
import type { EventName } from "@/types";

/** Event catalogue: one zod schema + sample payload per event.
 * Payloads carry IDs only (minimal PII) — receivers look up details server-side. */
const id = z.string().min(1);

export const eventSchemas = {
  "vehicle.registered": z.object({ vehicle_id: id }),
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
  "service.broadcast": z.object({
    broadcast_id: id, service_id: id,
    channels: z.array(z.enum(["sms", "whatsapp"])).min(1),
    message: z.string().min(5).max(1000),
    member_ids: z.array(id), unit_ids: z.array(id),
    external_recipients: z.array(z.object({ name: z.string().min(1), phone: z.string().regex(/^\+?[1-9]\d{7,14}$/) })),
    whatsapp_groups: z.array(z.object({ name: z.string().min(1), groupId: id })),
    recipient_count: z.number().int().min(0), skipped_no_consent: z.number().int().min(0),
  }),
  "prayer.reminder_scheduled": z.object({ chain_id: id, slot_id: id, member_ids: z.array(id), channels: z.array(z.enum(["email", "sms", "whatsapp"])).min(1), minutes_before: z.number().int().min(0) }),
  "prayer.signed_in": z.object({ chain_id: id, slot_id: id, member_id: id, method: z.enum(["whatsapp", "app", "sms", "phone"]), signed_in_at: z.string() }),
  "prayer.missed": z.object({ chain_id: id, slot_id: id, member_id: id, grace_minutes: z.number().int().min(0) }),
  "prayer.call_attempted": z.object({ chain_id: id, slot_id: id, member_id: id, channel: z.enum(["voice", "whatsapp_call"]), attempt: z.number().int().min(1), fallback_channels: z.array(z.enum(["voice", "whatsapp_call"])), message: z.string().min(5) }),
  "prayer.points_sent": z.object({ chain_id: id, channels: z.array(z.enum(["email", "sms", "whatsapp"])).min(1), message: z.string().min(5).max(2000), member_ids: z.array(id), recipient_count: z.number().int().min(0), skipped_no_consent: z.number().int().min(0) }),
} satisfies Record<EventName, z.ZodTypeAny>;

export const eventDescriptions: Record<EventName, string> = {
  "vehicle.registered": "A bus was registered in the transport fleet.",
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
  "service.broadcast": "A service schedule was broadcast by SMS and/or WhatsApp to people and groups.",
  "prayer.reminder_scheduled": "Prayer chain reminders were scheduled for a slot.",
  "prayer.signed_in": "A member signed in for their prayer chain hour (e.g. via WhatsApp).",
  "prayer.missed": "A member did not sign in before the grace period ended.",
  "prayer.call_attempted": "The agent called a member to say it's time for prayer chain; on failure, the next call channel is tried.",
  "prayer.points_sent": "Prayer points or a prayer broadcast were sent by email, SMS and/or WhatsApp.",
};

export const eventNames = Object.keys(eventSchemas) as EventName[];

export function samplePayload(event: EventName): Record<string, unknown> {
  const samples: Record<EventName, Record<string, unknown>> = {
    "vehicle.registered": { vehicle_id: "veh_demo_01" },
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
    "service.broadcast": { broadcast_id: "bc_demo_001", service_id: "service_demo_001", channels: ["sms", "whatsapp"], message: "You're invited to Sunday Service at 9:00 AM.", member_ids: ["member_demo_001"], unit_ids: ["cell_demo_01"], external_recipients: [{ name: "Guest Speaker", phone: "+2348000000000" }], whatsapp_groups: [{ name: "Youth Fellowship", groupId: "wa_group_demo_01" }], recipient_count: 2, skipped_no_consent: 0 },
    "prayer.reminder_scheduled": { chain_id: "chain_demo_01", slot_id: "slot_0300", member_ids: ["member_demo_001"], channels: ["whatsapp", "sms"], minutes_before: 15 },
    "prayer.signed_in": { chain_id: "chain_demo_01", slot_id: "slot_0300", member_id: "member_demo_001", method: "whatsapp", signed_in_at: "2026-11-05T03:02:00+01:00" },
    "prayer.missed": { chain_id: "chain_demo_01", slot_id: "slot_0400", member_id: "member_demo_002", grace_minutes: 10 },
    "prayer.call_attempted": { chain_id: "chain_demo_01", slot_id: "slot_0400", member_id: "member_demo_002", channel: "voice", attempt: 1, fallback_channels: ["whatsapp_call"], message: "It's time for prayer chain. Your hour is 04:00–05:00." },
    "prayer.points_sent": { chain_id: "chain_demo_01", channels: ["whatsapp", "email"], message: "Prayer points: 1. Revival in our city 2. Our families", member_ids: ["member_demo_001"], recipient_count: 1, skipped_no_consent: 0 },
  };
  return samples[event];
}
