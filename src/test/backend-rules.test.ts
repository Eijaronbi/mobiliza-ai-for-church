import { describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => ({ middleware: () => ({ inputValidator: () => ({ handler: () => vi.fn() }) }) }) }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { hmac } from "@/lib/delivery.functions";
import { starterRecords } from "@/lib/starter";

describe("backend rules", () => {
  it("signs webhook bodies with HMAC-SHA256 so a wrong secret never matches", async () => {
    const body = JSON.stringify({ tenant_id: "x", kind: "prayer.signed_in" });
    const good = await hmac("secret-a", body);
    expect(good).toMatch(/^[0-9a-f]{64}$/);
    expect(await hmac("secret-a", body)).toBe(good);
    expect(await hmac("secret-b", body)).not.toBe(good);
  });

  it("new churches start with configuration only — no members and no connected integrations", () => {
    const rows = starterRecords();
    expect(rows.some((r) => r.collection === ("members" as string))).toBe(false);
    expect(rows.filter((r) => r.collection === "integrations").every((r) => (r.data as { status?: string }).status !== "connected")).toBe(true);
  });
});

import { safeCell, csvField } from "@/lib/csv-safe";
describe("spreadsheet export safety", () => {
  it("neutralises formula-looking cells", () => {
    expect(safeCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(safeCell("+234 803")).toBe("'+234 803");
    expect(safeCell("Ada Obi")).toBe("Ada Obi");
    expect(csvField('@x,"y"')).toBe('"\'@x,""y"""');
  });
});
