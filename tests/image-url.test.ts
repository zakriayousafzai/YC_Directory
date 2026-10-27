import { describe, expect, it } from "vitest";
import { getSafeImageUrl, isSafeImageUrl } from "@/lib/image-url";

describe("isSafeImageUrl", () => {
  it("allows any HTTPS host", () => {
    expect(isSafeImageUrl("https://example.com/image.png")).toBe(true);
    expect(isSafeImageUrl("https://images.unsplash.com/photo-123")).toBe(true);
  });

  it("allows any HTTP host", () => {
    expect(isSafeImageUrl("http://example.com/image.png")).toBe(true);
  });

  it("rejects non-HTTP protocols", () => {
    expect(isSafeImageUrl("ftp://example.com/image.png")).toBe(false);
    expect(isSafeImageUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeImageUrl("data:image/png;base64,abc")).toBe(false);
  });

  it("rejects URLs with embedded credentials", () => {
    expect(
      isSafeImageUrl("https://user:pass@example.com/image.png")
    ).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(isSafeImageUrl("not a url")).toBe(false);
  });
});

describe("getSafeImageUrl", () => {
  it("returns any valid image URL", () => {
    expect(getSafeImageUrl("https://example.com/image.png")).toBe(
      "https://example.com/image.png"
    );
    expect(getSafeImageUrl("http://cdn.example.org/photo.jpg")).toBe(
      "http://cdn.example.org/photo.jpg"
    );
  });

  it("returns null for unsafe or non-string values", () => {
    expect(getSafeImageUrl("javascript:alert(1)")).toBeNull();
    expect(getSafeImageUrl(undefined)).toBeNull();
    expect(getSafeImageUrl(42)).toBeNull();
  });
});
