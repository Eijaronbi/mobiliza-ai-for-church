import { describe, expect, it } from "vitest";
import { LANDING_SLIDE_INTERVAL_MS } from "@/config/landing";

describe("landing slideshow", () => {
  it("changes images every three seconds", () => {
    expect(LANDING_SLIDE_INTERVAL_MS).toBe(3000);
  });
});