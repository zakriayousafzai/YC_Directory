import { afterEach, describe, expect, it, vi } from "vitest";
import { formSchema } from "@/lib/validation";

const validPitch = {
  title: "Acme AI",
  description: "A startup that helps small teams automate repetitive work.",
  category: "Productivity",
  link: "https://example.com/og.png",
  pitch: "## The problem\n\nSmall teams spend too much time on repetitive work.",
};

const imageResponse = (contentType: string | null) =>
  new Response(null, {
    status: 200,
    headers: contentType ? { "content-type": contentType } : undefined,
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
    expect(fetchMock).toHaveBeenCalledWith(validPitch.link, { method: "HEAD" });
  });

  it.each([
    ["title", { title: "ab" }],
    ["description", { description: "too short" }],
    ["category", { category: "ab" }],
    ["link", { link: "not-a-url" }],
    ["pitch", { pitch: "too short" }],
  ])("rejects an invalid %s", async (field, override) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse("image/png")));

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

  it("rejects a URL that does not return an image", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse("text/html")));

    const result = await formSchema.safeParseAsync(validPitch);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["link"]);
    }
  });

  it("rejects a missing content-type header", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse(null)));

    const result = await formSchema.safeParseAsync(validPitch);

    expect(result.success).toBe(false);
  });

  it("rejects an image URL that cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await formSchema.safeParseAsync(validPitch);

    expect(result.success).toBe(false);
  });
});
