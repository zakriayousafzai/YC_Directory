import { describe, expect, it } from "vitest";
import {
  ALLOWED_IMAGE_HOSTS,
  getSafeImageUrl,
  isAllowedImageHost,
} from "@/lib/image-hosts";

describe("isAllowedImageHost", () => {
  it.each(ALLOWED_IMAGE_HOSTS)("allows https://%s", (host) => {
    expect(isAllowedImageHost(`https://${host}/image.png`)).toBe(true);
  });

  it("is case-insensitive for the hostname", () => {
    expect(
      isAllowedImageHost("https://Images.Unsplash.com/photo-123")
    ).toBe(true);
  });

  it("rejects plain HTTP", () => {
    expect(isAllowedImageHost("http://images.unsplash.com/photo-123")).toBe(
      false
    );
  });

  it("rejects unknown hosts", () => {
    expect(isAllowedImageHost("https://example.com/image.png")).toBe(false);
  });

  it("rejects hosts that only look like allowed hosts", () => {
    expect(
      isAllowedImageHost("https://images.unsplash.com.evil.example/image.png")
    ).toBe(false);
  });

  it("rejects URLs with embedded credentials", () => {
    expect(
      isAllowedImageHost("https://user:pass@images.unsplash.com/photo-123")
    ).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(isAllowedImageHost("not a url")).toBe(false);
  });
});

describe("getSafeImageUrl", () => {
  it("returns allowed image URLs", () => {
    expect(
      getSafeImageUrl("https://images.unsplash.com/photo-123")
    ).toBe("https://images.unsplash.com/photo-123");
  });

  it("returns null for blocked or non-string values", () => {
    expect(getSafeImageUrl("https://example.com/image.png")).toBeNull();
    expect(getSafeImageUrl(undefined)).toBeNull();
    expect(getSafeImageUrl(42)).toBeNull();
  });
});
