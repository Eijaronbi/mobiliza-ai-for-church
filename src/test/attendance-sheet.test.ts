import { describe, expect, it } from "vitest";
import { parseNames, renderReport, type SheetEntry } from "@/lib/attendance";

describe("attendance sheet", () => {
  it("imports pasted names with optional phones and skips duplicates", () => {
    const r = parseNames("Name\n1. Ada Obi, +234 803 555 1000\nTunde Bello\n\nada obi\nGrace\t08035551234");
    expect(r).toEqual([{ name: "Ada Obi", phone: "+234 803 555 1000" }, { name: "Tunde Bello" }, { name: "Grace", phone: "08035551234" }]);
  });
  it("lists present and absent separately in the church's own format", () => {
    const e: SheetEntry[] = [
      { id: "1", name: "Ada", mark: "present" }, { id: "2", name: "Tunde", mark: "absent" }, { id: "3", name: "Grace", mark: "unmarked" },
    ];
    expect(renderReport("{present_count}/{total} here\n{present_list}\nAbsent:\n{absent_list}", { church: "C", title: "T", date: "D" }, e))
      .toBe("1/3 here\n1. Ada\nAbsent:\n1. Tunde");
  });
});
