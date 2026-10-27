import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  handlers: {
    GET: getMock,
    POST: postMock,
  },
}));

import { GET, POST } from "@/app/api/auth/[...nextauth]/route";
import { resetRateLimitsForTests } from "@/lib/rate-limit";

const makeRequest = (ip = "203.0.113.10") =>
  new Request("http://localhost/api/auth/session", {
    headers: { "x-forwarded-for": ip },
  }) as never;

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  getMock.mockResolvedValue(new Response("ok"));
  postMock.mockResolvedValue(new Response("ok"));
  resetRateLimitsForTests();
});

describe("Auth.js route handlers", () => {
  it("delegates allowed GET requests to Auth.js", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it("delegates allowed POST requests to Auth.js", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(postMock).toHaveBeenCalledTimes(1);
  });

  it("rate limits repeated auth requests from one IP", async () => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const response = await GET(makeRequest());

      expect(response.status).toBe(200);
    }

    const blocked = await GET(makeRequest());

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    expect(getMock).toHaveBeenCalledTimes(60);
  });

  it("shares the auth bucket between GET and POST", async () => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await GET(makeRequest());
    }

    const blocked = await POST(makeRequest());

    expect(blocked.status).toBe(429);
    expect(postMock).not.toHaveBeenCalled();
  });
});
