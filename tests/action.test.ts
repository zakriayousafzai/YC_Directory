import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, createMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/sanity/lib/write-client", () => ({
  writeClient: { create: createMock },
}));

import { createPitch } from "@/lib/action";
import { resetRateLimitsForTests } from "@/lib/rate-limit";

const makeForm = (overrides: Record<string, string> = {}) => {
  const values = {
    title: "Acme AI!",
    description: "A startup that automates repetitive team work.",
    category: "Productivity",
    link: "https://images.unsplash.com/photo-123",
    pitch: "## The problem\n\nSmall teams waste time on repetitive work.",
    ...overrides,
  };

  const form = new FormData();

  for (const [key, value] of Object.entries(values)) {
    form.set(key, value);
  }

  return form;
};

beforeEach(() => {
  authMock.mockReset();
  createMock.mockReset();
  resetRateLimitsForTests();

  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: { "content-type": "image/png" },
      })
    )
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createPitch", () => {
  it("rejects unauthenticated callers before writing", async () => {
    authMock.mockResolvedValue(null);

    const result = await createPitch(
      { error: "", status: "INITIAL" },
      makeForm()
    );

    expect(result).toEqual({
      error: "Please sign in to submit a startup.",
      status: "ERROR",
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates a startup with validated fields and returns its id", async () => {
    authMock.mockResolvedValue({ id: "author-1" });
    createMock.mockResolvedValue({ _id: "startup-1" });

    const result = await createPitch(
      { error: "", status: "INITIAL" },
      makeForm()
    );

    expect(result).toEqual({
      _id: "startup-1",
      error: "",
      status: "SUCCESS",
    });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        _type: "startup",
        title: "Acme AI!",
        image: "https://images.unsplash.com/photo-123",
        slug: { _type: "slug", current: "acme-ai" },
        author: { _type: "reference", _ref: "author-1" },
        views: 0,
      })
    );
  });

  it("returns field errors when validation fails", async () => {
    authMock.mockResolvedValue({ id: "author-1" });

    const result = await createPitch(
      { error: "", status: "INITIAL" },
      makeForm({ title: "ab" })
    );

    expect(result.status).toBe("ERROR");
    expect(result.fieldErrors?.title).toBeDefined();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects titles that produce an empty slug", async () => {
    authMock.mockResolvedValue({ id: "author-1" });

    const result = await createPitch(
      { error: "", status: "INITIAL" },
      makeForm({ title: "!!!" })
    );

    expect(result).toEqual({
      error: "The title must contain letters or numbers.",
      status: "ERROR",
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rate limits repeated submissions", async () => {
    authMock.mockResolvedValue({ id: "author-1" });
    createMock.mockResolvedValue({ _id: "startup-1" });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await createPitch(
        { error: "", status: "INITIAL" },
        makeForm()
      );

      expect(result.status).toBe("SUCCESS");
    }

    const blocked = await createPitch(
      { error: "", status: "INITIAL" },
      makeForm()
    );

    expect(blocked).toEqual({
      error: "Too many submissions. Please try again later.",
      status: "ERROR",
    });
    expect(createMock).toHaveBeenCalledTimes(5);
  });

  it("returns a generic error and logs when the Sanity write fails", async () => {
    authMock.mockResolvedValue({ id: "author-1" });
    createMock.mockRejectedValue(new Error("sanity down"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const result = await createPitch(
      { error: "", status: "INITIAL" },
      makeForm()
    );

    expect(result).toEqual({
      error: "Could not create your startup. Please try again.",
      status: "ERROR",
    });
    expect(consoleError).toHaveBeenCalled();
  });
});
