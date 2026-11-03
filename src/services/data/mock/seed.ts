import type {
  Activity, Agent, AgentExecution, CustomApiConfig, DeliveryLog, Escalation, FollowUp, IntegrationConfig,
  Member, MobilizationRecord, MobilizationWorkflow, OrgUnit, PickupPoint, Report, ReportTemplate, Service,
  Tenant, TransportRequest, Vehicle, WebhookEndpoint, AttendanceResponse, TransportStatus, FollowUpStatus,
} from "@/types";
import { appConfig } from "@/config/app.config";
import { actionList } from "@/config/action-map";

/** Fictional demonstration data. No real people. Deterministic so server & browser render identically. */
let s = 42;
const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const NOW = new Date(appConfig.demoNow).getTime();
const ago = (h: number) => new Date(NOW - h * 3600_000).toISOString();
const ahead = (h: number) => new Date(NOW + h * 3600_000).toISOString();

const first = ["Adaeze","Tunde","Chioma","Emeka","Funmi","Ibrahim","Ngozi","Segun","Amaka","Kunle","Bisi","Uche","Yemi","Kemi","Femi","Ifeoma","Dayo","Tobi","Zainab","Obinna","Grace","Daniel","Esther","Samuel","Ruth","David","Mercy","Joseph","Blessing","Peter"];
const last = ["Okafor","Adeyemi","Balogun","Eze","Nwosu","Adebayo","Okonkwo","Bello","Ogunleye","Chukwu","Afolabi","Uzor","Lawal","Obi","Akande","Ibe","Salami","Onyeka","Fashola","Ajayi"];
const areas = ["Ikeja","Yaba","Surulere","Lekki","Ajah","Gbagada","Ikorodu","Maryland","Ogba","Magodo"];

export const tenants: Tenant[] = [
  { id: "t_grace", name: "Grace Harvest Assembly", city: "Lagos", timezone: "Africa/Lagos", pastor: "Pastor Daniel Adeyemi" },
  { id: "t_covenant", name: "New Covenant Chapel", city: "Abuja", timezone: "Africa/Lagos", pastor: "Pastor Esther Bello" },
];

export interface DemoDB {
  tenants: Tenant[]; members: Member[]; units: OrgUnit[]; services: Service[]; workflows: MobilizationWorkflow[];
  mobilization: MobilizationRecord[]; transport: TransportRequest[]; pickupPoints: PickupPoint[]; vehicles: Vehicle[];
  followups: FollowUp[]; templates: ReportTemplate[]; reports: Report[]; escalations: Escalation[]; activities: Activity[];
  agents: Agent[]; executions: AgentExecution[]; integrations: IntegrationConfig[]; endpoints: WebhookEndpoint[];
  customApis: CustomApiConfig[]; logs: DeliveryLog[];
}

function forTenant(t: Tenant, size: number, db: DemoDB) {
  const T = t.id;
  const u = (id: string, name: string, type: OrgUnit["type"], parentId?: string): OrgUnit => ({ id: `${T}_${id}`, tenantId: T, name, type, parentId });
  const units: OrgUnit[] = [
    u("br_main", `${t.city} Main Campus`, "branch"),
    u("zn_n", "North Zone", "zone", `${T}_br_main`),
    u("zn_s", "South Zone", "zone", `${T}_br_main`),
    u("dp_choir", "Choir", "department", `${T}_br_main`),
    u("dp_ushers", "Ushering", "department", `${T}_br_main`),
    u("dp_evang", "Evangelism", "department", `${T}_br_main`),
    u("dp_media", "Media", "department", `${T}_br_main`),
    u("dp_transport", "Transport Team", "team", `${T}_dp_ushers`),
    u("cl_1", "Faith Cell", "cell", `${T}_zn_n`),
    u("cl_2", "Hope Cell", "cell", `${T}_zn_n`),
    u("cl_3", "Love Cell", "cell", `${T}_zn_s`),
    u("cl_4", "Victory Cell", "cell", `${T}_zn_s`),
    u("hg_1", "Lekki Home Group", "home_group", `${T}_zn_s`),
  ];
  const depts = units.filter((x) => x.type === "department");
  const cells = units.filter((x) => x.type === "cell" || x.type === "home_group");

  const members: Member[] = Array.from({ length: size }, (_, i) => {
    const name = `${pick(first)} ${pick(last)}`;
    const dep = pick(depts);
    const cell = pick(cells);
    return {
      id: `${T}_m${String(i + 1).padStart(3, "0")}`, tenantId: T, name,
      phone: `+234 80${Math.floor(rnd() * 10)} 555 ${String(1000 + i).slice(-4)}`,
      email: `${name.toLowerCase().replace(" ", ".")}${i}@example.org`,
      location: pick(areas), status: i < 6 ? "new" : rnd() < 0.08 ? "inactive" : "active",
      departmentId: dep.id, groupIds: rnd() < 0.2 ? [cell.id, `${T}_dp_transport`] : [cell.id],
      contactPreference: pick(["call", "sms", "whatsapp", "email"] as const), consent: rnd() > 0.06,
      joinedAt: ago(24 * (30 + Math.floor(rnd() * 900))),
    };
  });
  // leaders
  units.forEach((x, i) => (x.leaderId = members[i % members.length].id));
  members.forEach((m) => (m.leaderId = units.find((x) => x.id === m.groupIds[0])?.leaderId));

  const workflows: MobilizationWorkflow[] = [{
    id: `${T}_wf_sunday`, tenantId: T, name: "Standard Sunday mobilization", contactWindow: { start: "09:00", end: "19:00" },
    stages: [
      { id: "s1", name: "Initial member contact", offset: "-3d 10:00", channel: "call", enabled: true },
      { id: "s2", name: "Attendance confirmation", offset: "-2d 17:00", channel: "whatsapp", enabled: true },
      { id: "s3", name: "Transportation needs assessment", offset: "-2d 18:00", channel: "call", enabled: true },
      { id: "s4", name: "Follow-up confirmation", offset: "-1d 12:00", channel: "sms", enabled: true },
      { id: "s5", name: "Pickup coordination", offset: "-0d 14:00", channel: "call", enabled: true },
      { id: "s6", name: "Final attendance tracking", offset: "+0h", channel: "call", enabled: true },
    ],
  }];

  const services: Service[] = [
    { id: `${T}_svc_1`, tenantId: T, name: "Sunday Worship Service", kind: "sunday", date: ahead(78), location: "Main Auditorium", expected: Math.round(size * 0.85), leaderIds: [members[0].id, members[1].id], workflowId: workflows[0].id, contactSchedule: ["-3d 10:00", "-1d 17:00"] },
    { id: `${T}_svc_2`, tenantId: T, name: "Midweek Bible Study", kind: "midweek", date: ahead(150), location: "Fellowship Hall", expected: Math.round(size * 0.4), leaderIds: [members[2].id], workflowId: workflows[0].id, contactSchedule: ["-1d 12:00"] },
    { id: `${T}_svc_3`, tenantId: T, name: "Friday Prayer Meeting", kind: "prayer", date: ahead(200), location: "Prayer Room", expected: Math.round(size * 0.3), leaderIds: [members[3].id], workflowId: workflows[0].id, contactSchedule: ["-1d 10:00"] },
    { id: `${T}_svc_4`, tenantId: T, name: "Community Outreach — Yaba", kind: "outreach", date: ahead(250), location: "Yaba Market Square", expected: 40, leaderIds: [members[4].id], workflowId: workflows[0].id, contactSchedule: ["-2d 10:00"] },
    { id: `${T}_svc_5`, tenantId: T, name: "Harvest Conference 2026", kind: "conference", date: ahead(600), location: "Main Auditorium", expected: size * 2, leaderIds: [members[0].id], workflowId: workflows[0].id, contactSchedule: ["-7d 10:00", "-3d 10:00", "-1d 10:00"] },
    { id: `${T}_svc_0`, tenantId: T, name: "Sunday Worship Service", kind: "sunday", date: ago(90), location: "Main Auditorium", expected: Math.round(size * 0.85), leaderIds: [members[0].id], workflowId: workflows[0].id, contactSchedule: ["-3d 10:00"] },
  ];

  const resp: AttendanceResponse[] = ["confirmed", "confirmed", "confirmed", "unavailable", "no_response", "pending"];
  const mobilization: MobilizationRecord[] = [];
  for (const svc of [services[0], services[5]]) {
    const past = svc === services[5];
    members.forEach((m, i) => {
      const r = past ? (rnd() < 0.8 ? "confirmed" : "unavailable") : pick(resp);
      mobilization.push({
        id: `${svc.id}_${m.id}`, tenantId: T, serviceId: svc.id, memberId: m.id,
        contacted: r !== "pending", response: r, transportNeeded: r === "confirmed" && rnd() < 0.14,
        followUpPending: r === "no_response" && rnd() < 0.5, attended: past ? r === "confirmed" && rnd() < 0.9 : undefined,
        channel: m.contactPreference, updatedAt: ago(1 + (i % 40)),
      });
    });
  }

  const pickupPoints: PickupPoint[] = areas.slice(0, 6).map((a, i) => ({ id: `${T}_pp_${i}`, tenantId: T, name: `${a} Bus Stop`, x: 10 + ((i * 37) % 80), y: 15 + ((i * 53) % 70) }));
  const vehicles: Vehicle[] = [
    { id: `${T}_veh_1`, tenantId: T, label: "Church Bus A", plate: "LAG-412-KJ", capacity: 18, driverName: "Bro. Kunle Ajayi", driverPhone: "+234 802 555 0101", position: { x: 30, y: 40 } },
    { id: `${T}_veh_2`, tenantId: T, label: "Church Bus B", plate: "LAG-981-MX", capacity: 14, driverName: "Bro. Femi Salami", driverPhone: "+234 803 555 0102", position: { x: 62, y: 58 } },
    { id: `${T}_veh_3`, tenantId: T, label: "Volunteer Car", plate: "LAG-220-AB", capacity: 4, driverName: "Sis. Ruth Obi", driverPhone: "+234 805 555 0103", position: { x: 75, y: 25 } },
  ];
  const tStatuses: TransportStatus[] = ["requested", "requested", "leader_review", "approved", "scheduled", "departed", "en_route", "arrived", "rejected"];
  const needT = mobilization.filter((r) => r.serviceId === services[0].id && r.transportNeeded);
  const transport: TransportRequest[] = needT.map((r, i) => {
    const st = tStatuses[i % tStatuses.length];
    const order: TransportStatus[] = ["requested", "leader_review", "approved", "scheduled", "departed", "en_route", "arrived"];
    const idx = st === "rejected" ? 1 : order.indexOf(st);
    const history = order.slice(0, idx + 1).map((x, k) => ({ status: x, at: ago(30 - k * 3), by: k < 2 ? "Cell leader" : "Administrator" }));
    if (st === "rejected") history.push({ status: "rejected", at: ago(20), by: "Administrator" });
    return {
      id: `${T}_tr_${i + 1}`, tenantId: T, memberId: r.memberId, serviceId: r.serviceId, kind: i % 4 === 3 ? "financial" : "pickup",
      amount: i % 4 === 3 ? 2000 + (i % 3) * 500 : undefined, pickupPointId: pickupPoints[i % pickupPoints.length].id,
      vehicleId: idx >= 3 && st !== "rejected" ? vehicles[i % vehicles.length].id : undefined, status: st, createdAt: ago(30), history,
    };
  });

  const fStat: FollowUpStatus[] = ["new", "assigned", "scheduled", "contacted", "failed", "escalated", "completed", "new", "scheduled", "contacted"];
  const followups: FollowUp[] = Array.from({ length: Math.round(size / 8) }, (_, i) => {
    const st = fStat[i % fStat.length];
    const name = `${pick(first)} ${pick(last)}`;
    return {
      id: `${T}_fu_${i + 1}`, tenantId: T, name, phone: `+234 81${i % 10} 555 ${String(2000 + i).slice(-4)}`, location: pick(areas),
      encounteredAt: ago(24 * (1 + i)), kind: i % 3 === 0 ? "new_convert" : "first_timer", referrer: members[(i * 7) % members.length].name,
      assignedLeaderId: st === "new" ? undefined : units[8 + (i % 4)].leaderId, consent: i % 9 !== 4, channel: pick(["call", "whatsapp", "sms"] as const),
      status: st, nextContactAt: ["scheduled", "assigned", "failed"].includes(st) ? (i % 2 ? ahead(20 + i) : ago(10 + i)) : undefined,
      notes: st === "escalated" ? "Asked for pastoral counselling about family matter." : "",
      log: st === "new" ? [] : [{ id: `c${i}`, at: ago(20 + i), channel: "call", direction: "outbound", by: "ai_agent", summary: st === "failed" ? "No answer after 3 rings." : "Welcomed, asked about experience, shared cell meeting details.", outcome: st === "failed" ? "no_answer" : st === "escalated" ? "escalated" : "success", simulated: true }],
    };
  });

  const templates: ReportTemplate[] = [
    { id: `${T}_tpl_evang`, tenantId: T, name: "Individual Evangelism Report", type: "individual", deadline: "Sunday 18:00", reminder: "Saturday 17:00", fields: [{ key: "reached", label: "People reached", kind: "number" }, { key: "saved", label: "Received Christ", kind: "number" }, { key: "followups", label: "Follow-up requirements", kind: "number" }, { key: "testimony", label: "Testimonies", kind: "text" }] },
    { id: `${T}_tpl_cell`, tenantId: T, name: "Weekly Cell Report", type: "cell", deadline: "Thursday 21:00", reminder: "Thursday 12:00", fields: [{ key: "attendance", label: "Cell attendance", kind: "number" }, { key: "visits", label: "Visits conducted", kind: "number" }, { key: "saved", label: "Received Christ", kind: "number" }, { key: "notes", label: "Additional notes", kind: "text" }] },
    { id: `${T}_tpl_dept`, tenantId: T, name: "Monthly Department Report", type: "department", deadline: "Last day 18:00", reminder: "-2d 10:00", fields: [{ key: "activities", label: "Activities", kind: "number" }, { key: "volunteers", label: "Active volunteers", kind: "number" }, { key: "notes", label: "Additional notes", kind: "text" }] },
  ];
  const rStat = ["submitted", "approved", "pending", "overdue"] as const;
  const reports: Report[] = [];
  cells.concat(depts).forEach((unit, i) => {
    for (let w = 0; w < 4; w++) {
      const tpl = unit.type === "department" ? templates[2] : templates[1];
      const st = w > 0 ? (rnd() < 0.85 ? "approved" : "submitted") : rStat[i % 4];
      reports.push({
        id: `${T}_rep_${i}_${w}`, tenantId: T, templateId: tpl.id, unitId: unit.id, submittedBy: members[i].name, period: `Week ${44 - w}`,
        status: st, dueAt: ago(24 * 7 * w - (w === 0 ? 24 : 0)),
        values: st === "pending" || st === "overdue" ? {} : { attendance: 8 + Math.floor(rnd() * 12), visits: Math.floor(rnd() * 6), saved: Math.floor(rnd() * 4), reached: 5 + Math.floor(rnd() * 20), activities: 2 + Math.floor(rnd() * 5), volunteers: 6 + Math.floor(rnd() * 10), notes: "Good participation." },
      });
    }
  });

  const escalations: Escalation[] = [
    { id: `${T}_esc_1`, tenantId: T, title: "Elderly member needs pickup from Ikorodu", detail: "No vehicle currently covers Ikorodu route.", category: "transport", priority: "high", ownerName: "Transport Team Lead", status: "open", createdAt: ago(5) },
    { id: `${T}_esc_2`, tenantId: T, title: "Hope Cell has not completed mobilization", detail: "12 members still awaiting contact.", category: "mobilization", priority: "medium", ownerName: units[9].name + " leader", status: "open", createdAt: ago(9) },
    { id: `${T}_esc_3`, tenantId: T, title: "First timer requested pastoral counselling", detail: "Flagged by Follow-up Agent during call.", category: "followup", priority: "urgent", ownerName: t.pastor, status: "in_progress", createdAt: ago(14) },
    { id: `${T}_esc_4`, tenantId: T, title: "Media department report overdue", detail: "Monthly report not submitted.", category: "report", priority: "low", ownerName: "Media HOD", status: "open", createdAt: ago(30) },
    { id: `${T}_esc_5`, tenantId: T, title: "Member reported hospital admission", detail: "Welfare visit requested.", category: "member_issue", priority: "high", ownerName: "Welfare Unit", status: "open", createdAt: ago(3) },
    { id: `${T}_esc_6`, tenantId: T, title: "Bus B breakdown last Sunday", detail: "Resolved with volunteer cars.", category: "transport", priority: "medium", ownerName: "Transport Team Lead", status: "resolved", createdAt: ago(80) },
  ];

  const kinds = [
    ["attendance", "confirmed attendance for Sunday Worship"], ["ai_call", "AI call completed — attendance confirmed"],
    ["transport", "submitted a transport request"], ["followup", "follow-up assigned to cell leader"],
    ["report", "submitted Weekly Cell Report"], ["escalation", "issue escalated to leadership"],
  ];
  const activities: Activity[] = Array.from({ length: 24 }, (_, i) => {
    const [kind, text] = kinds[i % kinds.length];
    return { id: `${T}_act_${i}`, tenantId: T, at: ago(i * 0.7 + 0.1), kind, text, actor: members[(i * 5) % members.length].name };
  });

  const agentDefs: [string, string, string[]][] = [
    ["Mobilization Agent", "Handles attendance confirmation, member communication and mobilization workflows.", ["startMobilization", "confirmAttendance", "declineAttendance"]],
    ["Transportation Agent", "Handles transport requests, pickup coordination and journey updates.", ["requestTransport", "recordDeparture", "recordArrival"]],
    ["Follow-up Agent", "Handles first-timer and new-convert follow-up.", ["newFirstTimer", "completeFollowUp"]],
    ["Reporting Agent", "Collects, extracts, validates and summarizes reports.", ["submitReport", "reportOverdue"]],
    ["Leadership Agent", "Monitors unresolved issues, overdue tasks and accountability.", ["createEscalation", "resolveEscalation"]],
    ["Church Intelligence Agent", "Provides a conversational command interface across the platform.", []],
  ];
  const agents: Agent[] = agentDefs.map(([name, description, wf], i) => ({
    id: `${T}_ag_${i}`, tenantId: T, name, description, status: "simulated", workflows: wf,
    instructions: `You are the ${name} for ${t.name}. Be warm, brief and respectful. Never share member details with anyone outside their leadership line. Escalate anything pastoral or sensitive to a human leader.`,
    tools: ["read_members", "send_message", ...(i < 3 ? ["place_call"] : []), "create_escalation"],
  }));
  const executions: AgentExecution[] = Array.from({ length: 40 }, (_, i) => ({
    id: `${T}_ex_${i}`, tenantId: T, agentId: agents[i % 5].id, at: ago(i * 0.9 + 0.2),
    action: actionList[(i * 3) % actionList.length].label, result: i % 11 === 4 ? "failed" : "success", durationMs: 800 + ((i * 377) % 4200), simulated: true,
  }));

  const ic = (kind: IntegrationConfig["kind"], name: string, description: string, status: IntegrationConfig["status"], baseUrl = "", settings: IntegrationConfig["settings"] = {}): IntegrationConfig => ({
    id: `${T}_int_${kind}`, tenantId: T, kind, name, description, status, enabled: status !== "disabled", baseUrl, auth: { type: "none" }, settings,
  });
  const integrations: IntegrationConfig[] = [
    ic("n8n", "n8n", "Workflow orchestration for mobilization, transport, follow-up, reporting and leadership.", "config_required", "https://your-n8n-instance.example.com", { authHeader: "X-Mobilizer-Signature" }),
    ic("voicebip", "Voicebip", "AI voice calls, transcription, SMS and WhatsApp messaging.", "not_connected", "", { environment: "sandbox", phoneNumber: "", defaultAgent: "Mobilization voice", language: "en-NG", maxCallSeconds: 180, retryAttempts: 2 }),
    ic("database", "Database (Lovable Cloud)", "Production data storage, sign-in and tenant isolation.", "not_connected"),
    ic("whatsapp", "WhatsApp", "Messaging via WhatsApp Business. Calling is a separate capability.", "not_connected"),
    ic("sms", "SMS", "Text message delivery for reminders and confirmations.", "disabled"),
    ic("ai", "AI model providers", "Language models powering agents and the AI Command Centre.", "config_required"),
    ic("maps", "Maps & GPS", "Live maps, routing and driver GPS for transportation.", "not_connected"),
    ic("email", "Email provider", "Transactional email for reports and notifications.", "not_connected"),
    ic("custom", "Custom APIs", "Any REST API configured by your team.", "config_required"),
  ];
  integrations[0].auth = { type: "hmac", secretRef: "N8N_WEBHOOK_SECRET", headerName: "X-Mobilizer-Signature" };
  integrations[1].auth = { type: "bearer", secretRef: "VOICEBIP_API_KEY" };

  const ep = (workflow: WebhookEndpoint["workflow"], name: string, description: string, events: WebhookEndpoint["events"], i: number): WebhookEndpoint => ({
    id: `${T}_ep_${i}`, tenantId: T, integrationId: integrations[0].id, workflow, name, description,
    url: `https://your-n8n-instance.example.com/webhook/${workflow}/${name.toLowerCase().replace(/[^a-z]+/g, "-")}`,
    method: "POST", auth: { type: "hmac", secretRef: "N8N_WEBHOOK_SECRET", headerName: "X-Mobilizer-Signature" }, headers: { "Content-Type": "application/json" },
    payloadTemplate: "{{event_envelope}}", active: i % 7 !== 6, direction: "outgoing", events,
  });
  const epDefs: [WebhookEndpoint["workflow"], string, string, WebhookEndpoint["events"]][] = [
    ["mobilization", "Start mobilization", "Kick off contact sequence for a service.", ["mobilization.started"]],
    ["mobilization", "Contact member", "Ask n8n to contact one member.", []],
    ["mobilization", "Receive attendance response", "Attendance confirmations and declines.", ["attendance.confirmed", "attendance.declined"]],
    ["mobilization", "Schedule reminder", "Queue a reminder for non-responders.", []],
    ["mobilization", "Escalate transport request", "Hand off transport needs found during calls.", []],
    ["transport", "New transport request", "Notify the responsible leader.", ["transport.requested"]],
    ["transport", "Approve transport assistance", "Administrator decision.", ["transport.approved"]],
    ["transport", "Assign driver", "Driver assignment.", []],
    ["transport", "Update pickup status", "Pickup status changes.", []],
    ["transport", "Record departure", "Vehicle departed.", ["transport.departed"]],
    ["transport", "Record arrival", "Vehicle arrived.", ["transport.arrived"]],
    ["followup", "New first timer", "Start follow-up journey.", ["followup.created"]],
    ["followup", "Schedule follow-up", "Plan next contact.", []],
    ["followup", "Initiate call", "Ask voice agent to call.", []],
    ["followup", "Record call outcome", "Outcome processing.", ["followup.completed"]],
    ["followup", "Escalate request", "Hand complex matters to a human.", []],
    ["reporting", "Send report reminder", "Remind report owners.", ["report.overdue"]],
    ["reporting", "Receive report submission", "Process submitted reports.", ["report.submitted"]],
    ["reporting", "Process report", "Extract and validate.", []],
    ["reporting", "Generate weekly summary", "Weekly roll-up.", []],
    ["leadership", "Create escalation", "New escalated issue.", ["escalation.created"]],
    ["leadership", "Assign leader", "Assign an owner.", []],
    ["leadership", "Resolve issue", "Issue resolved.", ["escalation.resolved"]],
    ["leadership", "Notify pastor", "Pastoral notification.", []],
    ["general", "Member events", "Member created and updated.", ["member.created", "member.updated"]],
  ];
  const endpoints = epDefs.map((d, i) => ep(d[0], d[1], d[2], d[3], i));
  endpoints.push(
    { id: `${T}_ep_in_n8n`, tenantId: T, integrationId: integrations[0].id, workflow: "general", name: "n8n callbacks (incoming)", description: "n8n posts workflow results back to Mobilizer.", url: "/api/public/webhooks/n8n", method: "POST", auth: { type: "hmac", secretRef: "N8N_WEBHOOK_SECRET", headerName: "X-Mobilizer-Signature" }, headers: {}, payloadTemplate: "", active: false, direction: "incoming", events: ["attendance.confirmed", "attendance.declined", "followup.completed"] },
    { id: `${T}_ep_in_vb`, tenantId: T, integrationId: integrations[1].id, workflow: "general", name: "Voicebip callbacks (incoming)", description: "Call outcomes and transcripts.", url: "/api/public/webhooks/voicebip", method: "POST", auth: { type: "hmac", secretRef: "VOICEBIP_WEBHOOK_SECRET", headerName: "X-Voicebip-Signature" }, headers: {}, payloadTemplate: "", active: false, direction: "incoming", events: ["attendance.confirmed", "followup.completed"] },
  );

  const customApis: CustomApiConfig[] = [{
    id: `${T}_api_1`, tenantId: T, name: "Church giving platform (example)", baseUrl: "https://api.example-giving.com", path: "/v1/members/{member_id}/summary",
    method: "GET", auth: { type: "api_key", secretRef: "GIVING_API_KEY", headerName: "X-API-Key" }, headers: { Accept: "application/json" }, body: "",
    responseMapping: { total: "data.total_giving", last: "data.last_gift_at" }, timeoutMs: 8000, enabled: false,
  }];

  const logs: DeliveryLog[] = Array.from({ length: 18 }, (_, i) => {
    const e = endpoints[(i * 5) % 24];
    return {
      id: `${T}_log_${i}`, tenantId: T, at: ago(i * 1.3 + 0.2), integrationId: integrations[0].id, integrationName: "n8n",
      event: e.events[0] ?? "mobilization.started", endpoint: e.url, method: "POST",
      requestStatus: i % 6 === 2 ? "failed" : "pending_backend", responseStatus: i % 6 === 2 ? 0 : undefined,
      durationMs: 120 + ((i * 97) % 900), error: i % 6 === 2 ? "Simulated: endpoint unreachable (no backend connected)" : undefined,
      retries: i % 6 === 2 ? 2 : 0, payload: JSON.stringify({ event: e.events[0], tenant_id: T, data: "…" }), simulated: true,
    };
  });

  Object.assign(db, {
    members: db.members.concat(members), units: db.units.concat(units), services: db.services.concat(services),
    workflows: db.workflows.concat(workflows), mobilization: db.mobilization.concat(mobilization), transport: db.transport.concat(transport),
    pickupPoints: db.pickupPoints.concat(pickupPoints), vehicles: db.vehicles.concat(vehicles), followups: db.followups.concat(followups),
    templates: db.templates.concat(templates), reports: db.reports.concat(reports), escalations: db.escalations.concat(escalations),
    activities: db.activities.concat(activities), agents: db.agents.concat(agents), executions: db.executions.concat(executions),
    integrations: db.integrations.concat(integrations), endpoints: db.endpoints.concat(endpoints), customApis: db.customApis.concat(customApis),
    logs: db.logs.concat(logs),
  });
}

export function buildSeed(): DemoDB {
  s = 42;
  const db: DemoDB = { tenants, members: [], units: [], services: [], workflows: [], mobilization: [], transport: [], pickupPoints: [], vehicles: [], followups: [], templates: [], reports: [], escalations: [], activities: [], agents: [], executions: [], integrations: [], endpoints: [], customApis: [], logs: [] };
  forTenant(tenants[0], 120, db);
  forTenant(tenants[1], 48, db);
  return db;
}
