import { describe, expect, it } from "vitest";
import { eventSchemas } from "@/config/event-catalog";
import { actions } from "@/config/action-map";

const base = { broadcast_id: "b", service_id: "s", channels: ["sms"], message: "Hello all", member_ids: [], unit_ids: [], external_recipients: [], whatsapp_groups: [], recipient_count: 0, skipped_no_consent: 0 };
describe("service broadcast", () => {
  it("maps to service.broadcast", () => expect(actions.broadcastService.event).toBe("service.broadcast"));
  it("requires at least one channel", () => expect(eventSchemas["service.broadcast"].safeParse({ ...base, channels: [] }).success).toBe(false));
  it("rejects malformed phone numbers", () => expect(eventSchemas["service.broadcast"].safeParse({ ...base, external_recipients: [{ name: "A", phone: "abc" }] }).success).toBe(false));
});
