import { beforeEach, describe, expect, it } from "vitest";
import {
  getClientIp,
  rateLimit,
  resetRateLimitsForTests,
} from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimitsForTests();
});

describe("rateLimit", () => {
  it("allows requests up to the limit and blocks the next one", () => {
    const now = 1_000;

    expect(rateLimit("key", 2, 10_000, now).success).toBe(true);
    expect(rateLimit("key", 2, 10_000, now).success).toBe(true);

    const blocked = rateLimit("key", 2, 10_000, now);

    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetAt).toBe(now + 10_000);
  });

  it("tracks keys independently", () => {
    expect(rateLimit("a", 1, 10_000, 0).success).toBe(true);
    expect(rateLimit("b", 1, 10_000, 0).success).toBe(true);
    expect(rateLimit("a", 1, 10_000, 0).success).toBe(false);
  });

  it("resets the bucket after the window elapses", () => {
    expect(rateLimit("key", 1, 10_000, 0).success).toBe(true);
    expect(rateLimit("key", 1, 10_000, 9_999).success).toBe(false);
    expect(rateLimit("key", 1, 10_000, 10_000).success).toBe(true);
  });

  it("reports the remaining allowance", () => {
    expect(rateLimit("key", 3, 10_000, 0).remaining).toBe(2);
    expect(rateLimit("key", 3, 10_000, 0).remaining).toBe(1);
    expect(rateLimit("key", 3, 10_000, 0).remaining).toBe(0);
  });
});

describe("getClientIp", () => {
  it("prefers the first x-forwarded-for entry", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      "x-real-ip": "10.0.0.2",
    });

    expect(getClientIp(headers)).toBe("203.0.113.10");
  });

  it("falls back to x-real-ip and cf-connecting-ip", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "10.0.0.2" }))).toBe(
      "10.0.0.2"
    );
    expect(getClientIp(new Headers({ "cf-connecting-ip": "10.0.0.3" }))).toBe(
      "10.0.0.3"
    );
  });

  it("returns unknown when no forwarding header exists", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});
