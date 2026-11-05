import { deliverWebhook } from "@/lib/delivery.functions";
import type { ApiRequest, ApiResponse } from "@/types";

/** Transport = how a request actually leaves Mobilizer.
 * Simulated: no network; returns a realistic, clearly-flagged fake result.
 * Server: will call a server function that injects secrets and performs the HTTP call. */
export interface Transport {
  name: "simulated" | "server";
  send(req: ApiRequest): Promise<ApiResponse>;
}

export const simulatedTransport: Transport = {
  name: "simulated",
  async send(req) {
    const durationMs = 150 + Math.round(Math.random() * 500);
    await new Promise((r) => setTimeout(r, Math.min(durationMs, 600)));
    const placeholder = !req.url || /example\.com|your-/.test(req.url);
    if (placeholder) {
      return { ok: false, status: 0, durationMs, simulated: true, error: "Endpoint still uses a placeholder URL. Real delivery is pending backend connection." };
    }
    return { ok: true, status: 202, durationMs, simulated: true, data: { accepted: true, note: "Simulated — no request was sent." } };
  },
};

export const serverTransport: Transport = {
  name: "server",
  async send(req) {
    const body = req.body as { tenant_id?: string } | undefined;
    const tenantId = body?.tenant_id ?? "";
    const method = req.method === "PUT" || req.method === "PATCH" ? req.method : "POST";
    return deliverWebhook({ data: { tenantId, url: req.url, method, body: req.body as never } }) as Promise<ApiResponse>;
  },
};
