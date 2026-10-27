import { describe, expect, it } from "vitest";
import { cn, formateDate, parseServerActionResponse } from "@/lib/utils";

describe("cn", () => {
  it("merges conflicting Tailwind classes and keeps the last value", () => {
    expect(cn("px-2 py-1", "px-4", "text-sm")).toBe("py-1 px-4 text-sm");
  });

  it("supports conditional class objects", () => {
    expect(cn("base", { hidden: false, block: true })).toBe("base block");
  });
});

describe("formateDate", () => {
  it("formats an ISO date in long US English form", () => {
    expect(formateDate("2025-01-15T12:00:00")).toBe("January 15, 2025");
  });

  it("produces an invalid date string for invalid input", () => {
    expect(formateDate("not-a-date")).toBe("Invalid Date");
  });
});

describe("parseServerActionResponse", () => {
  it("returns a JSON-safe deep copy", () => {
    const input = {
      _id: "startup-1",
      createdAt: new Date("2025-01-15T00:00:00.000Z"),
      nested: { status: "SUCCESS" },
      skipped: undefined,
    };

    const result = parseServerActionResponse(input);

    expect(result).toEqual({
      _id: "startup-1",
      createdAt: "2025-01-15T00:00:00.000Z",
      nested: { status: "SUCCESS" },
    });
    expect(result).not.toBe(input);
    expect(result.nested).not.toBe(input.nested);
  });
});
