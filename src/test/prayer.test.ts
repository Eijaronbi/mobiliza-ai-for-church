import { describe, expect, it } from "vitest";
import { buildSlots, defaultPrayerConfig, nextCallChannel, slotStatus } from "@/lib/prayer";

describe("prayer chain", () => {
  it("default 3–6am window gives three one-hour slots", () => {
    expect(buildSlots(defaultPrayerConfig).map((s) => s.label)).toEqual(["03:00–04:00", "04:00–05:00", "05:00–06:00"]);
  });
  it("member not signed in after the grace period is missed", () => {
    expect(slotStatus({ start: "03:00", end: "04:00" }, undefined, "03:11", 10)).toBe("missed");
    expect(slotStatus({ start: "03:00", end: "04:00" }, undefined, "03:05", 10)).toBe("awaiting");
  });
  it("signed-in member is praying during their hour", () => {
    expect(slotStatus({ start: "03:00", end: "04:00" }, "03:02", "03:30", 10)).toBe("praying");
  });
  it("tries phone call first, then WhatsApp call when the first fails", () => {
    expect(nextCallChannel(["voice", "whatsapp_call"], [])).toBe("voice");
    expect(nextCallChannel(["voice", "whatsapp_call"], ["voice"])).toBe("whatsapp_call");
    expect(nextCallChannel(["voice", "whatsapp_call"], ["voice", "whatsapp_call"])).toBeUndefined();
  });
});
