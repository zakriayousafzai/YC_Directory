import { describe, expect, it } from "vitest";
import {
  PAGE_SIZE,
  getPageRange,
  getTotalPages,
  parsePage,
} from "@/lib/pagination";

describe("parsePage", () => {
  it("returns positive integer pages", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage(["4", "5"])).toBe(4);
  });

  it.each([undefined, "", "0", "-1", "abc", "1.5", "Infinity"])(
    "falls back to page 1 for %s",
    (value) => {
      expect(parsePage(value)).toBe(1);
    }
  );
});

describe("getPageRange", () => {
  it("returns zero-based GROQ slice bounds", () => {
    expect(getPageRange(1)).toEqual({ start: 0, end: PAGE_SIZE });
    expect(getPageRange(3)).toEqual({ start: 18, end: 27 });
  });

  it("supports a custom page size", () => {
    expect(getPageRange(2, 5)).toEqual({ start: 5, end: 10 });
  });
});

describe("getTotalPages", () => {
  it("rounds up and never returns less than one page", () => {
    expect(getTotalPages(0)).toBe(1);
    expect(getTotalPages(1)).toBe(1);
    expect(getTotalPages(9)).toBe(1);
    expect(getTotalPages(10)).toBe(2);
    expect(getTotalPages(27)).toBe(3);
  });
});
