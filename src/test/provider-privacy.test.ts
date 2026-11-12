import { describe, expect, it } from "vitest";
import { canUseOwnerProvider, OWNER_PROVIDER_TENANT_ID } from "@/lib/provider-access";
import { keyHint } from "@/lib/ai-providers";

describe("private owner providers", () => {
  it("allows the owner's church admin", () => expect(canUseOwnerProvider(OWNER_PROVIDER_TENANT_ID, ["church_admin"])).toBe(true));
  it("denies another church even with admin roles", () => expect(canUseOwnerProvider("8c5910b2-afee-4b96-9b38-82eed1ed4cca", ["church_admin", "super_admin"])).toBe(false));
  it("denies the public demo", () => expect(canUseOwnerProvider("demo_church", ["church_admin"])).toBe(false));
  it("denies ordinary members and missing membership", () => {
    expect(canUseOwnerProvider(OWNER_PROVIDER_TENANT_ID, ["member"])).toBe(false);
    expect(canUseOwnerProvider(OWNER_PROVIDER_TENANT_ID, [])).toBe(false);
  });
  it("never exposes credential-derived hints", () => {
    expect(keyHint("fixture-one-credential")).toBe("Key saved");
    expect(keyHint("different-fixture-value")).toBe("Key saved");
  });
});