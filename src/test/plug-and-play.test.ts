import { describe, expect, it } from "vitest";
import { buildEvent, redact } from "@/services/events/envelope";
import { actions } from "@/config/action-map";
import { eventSchemas, samplePayload, eventNames } from "@/config/event-catalog";
import { can } from "@/config/roles";
import { dispatchAction } from "@/services/events/dispatcher";
import { buildSeed } from "@/services/data/mock/seed";

describe("event envelope", () => {
  it("has the agreed contract shape", () => {
    const e = buildEvent("attendance.confirmed", "t1", { a: 1 }, { role: "pastor", name: "P" });
    expect(e.source).toBe("mobilizer");
    expect(e.tenant_id).toBe("t1");
    expect(e.event_id.startsWith("evt_")).toBe(true);
  });
  it("redacts secrets before logging", () => {
    expect(redact({ api_key: "abc", nested: { Authorization: "Bearer x", ok: 1 } })).toEqual({ api_key: "••••••", nested: { Authorization: "••••••", ok: 1 } });
  });
  it("every catalogued event's sample payload passes its schema", () => {
    for (const ev of eventNames) expect(eventSchemas[ev].safeParse(samplePayload(ev)).success).toBe(true);
  });
});

describe("action registry", () => {
  it("start mobilization emits mobilization.started and needs confirmation", () => {
    expect(actions.startMobilization.event).toBe("mobilization.started");
    expect(actions.startMobilization.requiresConfirmation).toBe(true);
  });
  it("dispatch rejects invalid payloads", async () => {
    await expect(dispatchAction("startMobilization", "t_grace", { service_id: "" }, { role: "church_admin", name: "A" })).rejects.toThrow();
  });
});

describe("roles", () => {
  it("only super admin manages tenants", () => {
    expect(can("super_admin", "manage_tenants")).toBe(true);
    expect(can("church_admin", "manage_tenants")).toBe(false);
  });
  it("members cannot approve transport", () => {
    expect(can("member", "approve_transport")).toBe(false);
  });
});

describe("demo data honesty", () => {
  it("never marks an integration as connected", () => {
    expect(buildSeed().integrations.some((i) => i.status === "connected")).toBe(false);
  });
});
