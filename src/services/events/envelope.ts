import type { EventEnvelope, EventName, RoleId } from "@/types";

let counter = 0;
export function buildEvent<T extends Record<string, unknown>>(
  event: EventName, tenantId: string, data: T, actor: { role: RoleId; name: string },
): EventEnvelope<T> {
  counter += 1;
  return {
    event,
    event_id: `evt_${Date.now().toString(36)}_${counter}`,
    timestamp: new Date().toISOString(),
    tenant_id: tenantId,
    source: "mobilizer",
    actor,
    data,
  };
}

const SECRET_KEYS = /(secret|token|password|api[_-]?key|authorization|signature)/i;
/** Remove anything that looks like a credential before logging or displaying. */
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SECRET_KEYS.test(k) ? "••••••" : redact(v)]));
  }
  return value;
}
