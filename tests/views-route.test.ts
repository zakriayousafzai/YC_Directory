import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, patchMock, commitMock } = vi.hoisted(() => {
  const commit = vi.fn();
  const patch = {
    setIfMissing: vi.fn(),
    inc: vi.fn(),
    commit,
  };

  patch.setIfMissing.mockReturnValue(patch);
  patch.inc.mockReturnValue(patch);

  return {
    fetchMock: vi.fn(),
    patchMock: patch,
    commitMock: commit,
  };
});

vi.mock("@/sanity/lib/client", () => ({
  client: { fetch: fetchMock },
}));

vi.mock("@/sanity/lib/write-client", () => ({
  writeClient: { patch: () => patchMock },
}));

import { POST } from "@/app/api/views/[id]/route";
import { resetRateLimitsForTests } from "@/lib/rate-limit";

const makeRequest = (ip = "203.0.113.10") =>
  new Request("http://localhost/api/views/startup-1", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });

const makeContext = (id = "startup-1") => ({
  params: Promise.resolve({ id }),
});

beforeEach(() => {
  fetchMock.mockReset();
  patchMock.setIfMissing.mockClear();
  patchMock.inc.mockClear();
  commitMock.mockReset();
  resetRateLimitsForTests();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/views/[id]", () => {
  it("increments the view count atomically and returns the new total", async () => {
    fetchMock.mockResolvedValue("startup-1");
    commitMock.mockResolvedValue({ views: 5 });

    const response = await POST(
      makeRequest() as never,
      makeContext() as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ views: 5 });
    expect(patchMock.setIfMissing).toHaveBeenCalledWith({ views: 0 });
    expect(patchMock.inc).toHaveBeenCalledWith({ views: 1 });
    expect(commitMock).toHaveBeenCalledWith({ returnDocuments: true });
  });

  it("returns 404 for an unknown startup", async () => {
    fetchMock.mockResolvedValue(null);

    const response = await POST(
      makeRequest() as never,
      makeContext("missing") as never
    );

    expect(response.status).toBe(404);
    expect(commitMock).not.toHaveBeenCalled();
  });

  it("rejects oversized ids", async () => {
    const response = await POST(
      makeRequest() as never,
      makeContext("x".repeat(201)) as never
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 500 when the write fails", async () => {
    fetchMock.mockResolvedValue("startup-1");
    commitMock.mockRejectedValue(new Error("write failed"));

    const response = await POST(
      makeRequest() as never,
      makeContext() as never
    );

    expect(response.status).toBe(500);
  });

  it("rate limits repeated requests from one IP", async () => {
    fetchMock.mockResolvedValue("startup-1");
    commitMock.mockResolvedValue({ views: 1 });

    for (let attempt = 0; attempt < 60; attempt += 1) {
      const response = await POST(
        makeRequest() as never,
        makeContext() as never
      );

      expect(response.status).toBe(200);
    }

    const blocked = await POST(
      makeRequest() as never,
      makeContext() as never
    );

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
  });
});
