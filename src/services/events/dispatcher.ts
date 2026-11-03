import { actions, type ActionId } from "@/config/action-map";
import { eventSchemas } from "@/config/event-catalog";
import { apiRequest } from "@/services/api/client";
import { adapters } from "@/services/integrations/registry";
import { repos } from "@/services/data";
import type { DeliveryLog, EventEnvelope, IntegrationConfig, RoleId } from "@/types";
import { buildEvent, redact } from "./envelope";

type Listener = (e: EventEnvelope) => void;
const listeners = new Set<Listener>();
export const eventBus = {
  on(fn: Listener) { listeners.add(fn); return () => listeners.delete(fn); },
  emit(e: EventEnvelope) { listeners.forEach((l) => l(e)); },
};

export interface DispatchResult { envelope: EventEnvelope; deliveries: DeliveryLog[] }

/** Trigger a Mobilizer action: validate → build envelope → find bound endpoints → send via adapter → log. */
export async function dispatchAction(
  actionId: ActionId, tenantId: string, data: Record<string, unknown>, actor: { role: RoleId; name: string },
): Promise<DispatchResult> {
  const action = actions[actionId];
  const parsed = eventSchemas[action.event].safeParse(data);
  if (!parsed.success) throw new Error(`Invalid payload for ${action.event}: ${parsed.error.issues[0]?.message}`);
  const envelope = buildEvent(action.event, tenantId, parsed.data as Record<string, unknown>, actor);
  eventBus.emit(envelope);

  const [endpoints, integrations] = await Promise.all([repos.endpoints.list(tenantId), repos.integrations.list(tenantId)]);
  const targets = endpoints.filter((e) => e.direction === "outgoing" && e.active && e.events.includes(action.event));
  const deliveries: DeliveryLog[] = [];
  for (const ep of targets) {
    const integration = integrations.find((i) => i.id === ep.integrationId);
    const adapter = adapters[integration?.kind ?? "custom"];
    const disabled = integration && (!integration.enabled || integration.status === "disabled");
    const res = disabled ? null : await apiRequest(adapter.buildRequest(ep, envelope, integration), { retries: 0 });
    const log: DeliveryLog = {
      id: `log_${envelope.event_id}_${ep.id}`, tenantId, at: new Date().toISOString(), integrationId: ep.integrationId,
      integrationName: integration?.name ?? "Custom", event: action.event, endpoint: ep.url, method: ep.method,
      requestStatus: disabled ? "failed" : res!.ok ? "delivered" : "pending_backend", responseStatus: res?.status,
      durationMs: res?.durationMs ?? 0, error: disabled ? "Integration disabled" : res?.error, retries: 0,
      payload: JSON.stringify(redact(envelope)), simulated: true,
    };
    await repos.logs.create(log);
    deliveries.push(log);
  }
  return { envelope, deliveries };
}

export async function testIntegration(integration: IntegrationConfig): Promise<DeliveryLog> {
  const res = await apiRequest(adapters[integration.kind].testRequest(integration));
  const log: DeliveryLog = {
    id: `log_test_${Date.now()}`, tenantId: integration.tenantId, at: new Date().toISOString(), integrationId: integration.id,
    integrationName: integration.name, event: "connection.test", endpoint: integration.baseUrl || "(not set)", method: "GET",
    requestStatus: res.ok ? "delivered" : "failed", responseStatus: res.status, durationMs: res.durationMs, error: res.error,
    retries: 0, payload: "{}", simulated: true,
  };
  await repos.logs.create(log);
  return log;
}

export async function retryDelivery(log: DeliveryLog): Promise<DeliveryLog> {
  const res = await apiRequest({ integrationId: log.integrationId, url: log.endpoint, method: log.method, headers: {}, body: JSON.parse(log.payload) });
  return repos.logs.update(log.id, { retries: log.retries + 1, requestStatus: res.ok ? "delivered" : "pending_backend", error: res.error, at: new Date().toISOString() });
}
