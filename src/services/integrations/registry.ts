import type { ApiRequest, EventEnvelope, IntegrationConfig, IntegrationKind, WebhookEndpoint, CustomApiConfig } from "@/types";

/** An adapter turns a Mobilizer event + endpoint config into a concrete ApiRequest.
 * Secrets are referenced by name only; the server transport resolves them. */
export interface IntegrationAdapter {
  kind: IntegrationKind;
  buildRequest(ep: WebhookEndpoint, envelope: EventEnvelope, integration?: IntegrationConfig): ApiRequest;
  testRequest(integration: IntegrationConfig): ApiRequest;
}

function authHeaders(auth: WebhookEndpoint["auth"]): Record<string, string> {
  if (!auth.secretRef) return {};
  switch (auth.type) {
    case "bearer": return { Authorization: `Bearer {{secret:${auth.secretRef}}}` };
    case "api_key": return { [auth.headerName || "X-API-Key"]: `{{secret:${auth.secretRef}}}` };
    case "basic": return { Authorization: `Basic {{secret:${auth.secretRef}}}` };
    case "hmac": return { [auth.headerName || "X-Mobilizer-Signature"]: `{{hmac_sha256:${auth.secretRef}}}` };
    case "custom_header": return { [auth.headerName || "X-Custom"]: `{{secret:${auth.secretRef}}}` };
    default: return {};
  }
}

const webhookAdapter = (kind: IntegrationKind): IntegrationAdapter => ({
  kind,
  buildRequest: (ep, envelope) => ({
    integrationId: ep.integrationId, endpointId: ep.id, url: ep.url, method: ep.method,
    headers: { ...ep.headers, ...authHeaders(ep.auth), "X-Mobilizer-Event": envelope.event, "X-Mobilizer-Event-Id": envelope.event_id },
    body: envelope,
  }),
  testRequest: (i) => ({ integrationId: i.id, url: i.baseUrl, method: "GET", headers: authHeaders(i.auth), timeoutMs: 5000 }),
});

export const adapters: Record<IntegrationKind, IntegrationAdapter> = {
  n8n: webhookAdapter("n8n"),
  voicebip: {
    ...webhookAdapter("voicebip"),
    testRequest: (i) => ({ integrationId: i.id, url: i.baseUrl ? `${i.baseUrl}/v1/account` : "", method: "GET", headers: authHeaders(i.auth) }),
  },
  custom: webhookAdapter("custom"),
  database: webhookAdapter("database"),
  whatsapp: webhookAdapter("whatsapp"),
  sms: webhookAdapter("sms"),
  ai: webhookAdapter("ai"),
  maps: webhookAdapter("maps"),
  email: webhookAdapter("email"),
};

export function buildCustomApiRequest(c: CustomApiConfig, vars: Record<string, string> = {}): ApiRequest {
  const path = c.path.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
  return {
    integrationId: c.id, url: `${c.baseUrl.replace(/\/$/, "")}${path}`, method: c.method,
    headers: { ...c.headers, ...authHeaders(c.auth) }, body: c.body ? safeJson(c.body) : undefined, timeoutMs: c.timeoutMs,
  };
}
const safeJson = (s: string) => { try { return JSON.parse(s); } catch { return s; } };

/** Apply a response mapping like { total: "data.total_giving" }. */
export function mapResponse(data: unknown, mapping: Record<string, string>) {
  return Object.fromEntries(Object.entries(mapping).map(([k, path]) => [k, path.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown> | undefined)?.[p], data)]));
}
