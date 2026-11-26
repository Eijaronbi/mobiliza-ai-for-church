import { describe, it, expect } from "vitest";
import { isEarlyChurch } from "@/lib/shared-groq.server";
const ids = Array.from({ length: 12 }, (_, i) => `t${i + 1}`);
describe("shared Groq", () => {
  it("10th church gets it", () => expect(isEarlyChurch("t10", ids)).toBe(true));
  it("11th church does not", () => expect(isEarlyChurch("t11", ids)).toBe(false));
});
