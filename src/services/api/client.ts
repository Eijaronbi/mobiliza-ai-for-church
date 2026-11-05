import { appConfig } from "@/config/app.config";
import type { ApiRequest, ApiResponse } from "@/types";
import { serverTransport, simulatedTransport, type Transport } from "./transport";
import { getDataMode } from "@/services/data/mode";

/** The ONE place outbound integration requests go through. Handles timeout + retries. */
/** Signed-in churches deliver for real through the server; the demo stays simulated. */
export const getTransport = (): Transport => (appConfig.transport === "server" || getDataMode() === "live" ? serverTransport : simulatedTransport);

export async function apiRequest(req: ApiRequest, opts: { retries?: number } = {}): Promise<ApiResponse & { attempts: number }> {
  const retries = opts.retries ?? 0;
  let last: ApiResponse = { ok: false, status: 0, durationMs: 0, simulated: getTransport().name === "simulated", error: "Not sent" };
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      last = await withTimeout(getTransport().send(req), req.timeoutMs ?? 10000);
      if (last.ok) return { ...last, attempts: attempt + 1 };
    } catch (e) {
      last = { ok: false, status: 0, durationMs: 0, simulated: getTransport().name === "simulated", error: (e as Error).message };
    }
  }
  return { ...last, attempts: retries + 1 };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`Timed out after ${ms}ms`)), ms))]);
}
