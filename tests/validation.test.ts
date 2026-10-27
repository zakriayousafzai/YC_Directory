import { afterEach, describe, expect, it, vi } from "vitest";
import { formSchema } from "@/lib/validation";

const validPitch = {
  title: "Acme AI",
  description: "A startup that helps small teams automate repetitive work.",
  category: "Productivity",
  link: "https://images.unsplash.com/photo-123",
  pitch: "## The problem\n\nSmall teams spend too much time on repetitive work.",
};

const imageResponse = (
  contentType: string | null,
  contentLength?: string
) =>
  new Response(null, {
    status: 200,
    headers: {
      ...(contentType ? { "content-type": contentType } : {}),
      ...(contentLength ? { "content-length": contentLength } : {}),
    },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("formSchema", () => {
  it("accepts a complete pitch and checks the image with a HEAD request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(imageResponse("image/png"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await formSchema.parseAsync(validPitch);

    expect(result).toEqual(validPitch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      validPitch.link,
      expect.objectContaining({
        method: "HEAD",
        redirect: "follow",
      })
    );
  });

  it("rejects image hosts that are not on the allowlist without fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await formSchema.safeParseAsync({
      ...validPitch,
      link: "https://example.com/og.png",
    });

    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();

    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: "Use an image from a supported host.",
          }),
        ])
      );
    }
  });

  it("rejects non-image responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(imageResponse("text/html"))
    );

    const result = await formSchema.safeParseAsync(validPitch);

    expect(result.success).toBe(false);
  });

  it("rejects SVG responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(imageResponse("image/svg+xml"))
    );

    const result = await formSchema.safeParseAsync(validPitch);

    expect(result.success).toBe(false);
  });

  it("rejects images larger than 5 MB", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          imageResponse("image/png", String(6 * 1024 * 1024))
        )
    );

    const result = await formSchema.safeParseAsync(validPitch);

    expect(result.success).toBe(false);
  });

  it("rejects responses without a content type", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse(null)));

    const result = await formSchema.safeParseAsync(validPitch);

    expect(result.success).toBe(false);
  });

  it("rejects network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );

    const result = await formSchema.safeParseAsync(validPitch);

    expect(result.success).toBe(false);
  });

  it.each([
    ["title", { title: "ab" }],
    ["description", { description: "too short" }],
    ["category", { category: "x" }],
    ["link", { link: "not-a-url" }],
    ["pitch", { pitch: "too short" }],
  ])("rejects an invalid %s", async (field, override) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(imageResponse("image/png"))
    );

    const result = await formSchema.safeParseAsync({
      ...validPitch,
      ...override,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(
        true
      );
    }
  });
});
