import { describe, expect, it } from "vitest";
import { formSchema } from "@/lib/validation";

const validPitch = {
  title: "Acme AI",
  description: "A startup that helps small teams automate repetitive work.",
  category: "Productivity",
  link: "https://example.com/og.png",
  pitch: "## The problem\n\nSmall teams spend too much time on repetitive work.",
};

describe("formSchema", () => {
  it("accepts a complete pitch with an image from any HTTPS host", async () => {
    await expect(formSchema.parseAsync(validPitch)).resolves.toEqual(
      validPitch
    );
  });

  it("accepts an image from any HTTP host", async () => {
    const result = await formSchema.parseAsync({
      ...validPitch,
      link: "http://images.example.com/og.png",
    });

    expect(result.link).toBe("http://images.example.com/og.png");
  });

  it.each([
    ["FTP", "ftp://example.com/og.png"],
    ["javascript", "javascript:alert(1)"],
    ["data", "data:image/png;base64,abc"],
  ])("rejects %s URLs", async (_name, link) => {
    const result = await formSchema.safeParseAsync({
      ...validPitch,
      link,
    });

    expect(result.success).toBe(false);
  });

  it("rejects image URLs with embedded credentials", async () => {
    const result = await formSchema.safeParseAsync({
      ...validPitch,
      link: "https://user:pass@example.com/og.png",
    });

    expect(result.success).toBe(false);
  });

  it.each([
    ["title", { title: "ab" }],
    ["description", { description: "too short" }],
    ["category", { category: "x" }],
    ["link", { link: "not-a-url" }],
    ["pitch", { pitch: "too short" }],
  ])("rejects an invalid %s", async (field, override) => {
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
