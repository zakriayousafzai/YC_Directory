import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, createMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/sanity/lib/write-client", () => ({
  writeClient: { create: createMock },
}));

import { createPitch } from "@/lib/action";

const makeForm = () => {
  const form = new FormData();
  form.set("title", "Acme AI!");
  form.set("description", "A startup that automates repetitive team work.");
  form.set("category", "Productivity");
  form.set("link", "https://example.com/og.png");
  return form;
};

const pitch = "## The problem\n\nSmall teams waste time on repetitive work.";

beforeEach(() => {
  authMock.mockReset();
  createMock.mockReset();
});

describe("createPitch", () => {
  it("rejects unauthenticated callers before writing", async () => {
    authMock.mockResolvedValue(null);

    const result = await createPitch({}, makeForm(), pitch);

    expect(result).toEqual({ error: "Not signed it", status: "ERROR" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("writes a slugged startup for the signed-in author", async () => {
    authMock.mockResolvedValue({ id: "author-1" });
    createMock.mockResolvedValue({ _id: "startup-1" });

    const result = await createPitch({}, makeForm(), pitch);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      _type: "startup",
      title: "Acme AI!",
      description: "A startup that automates repetitive team work.",
      category: "Productivity",
      image: "https://example.com/og.png",
      slug: { _type: "acme-ai", current: "acme-ai" },
      author: { _type: "reference", _ref: "author-1" },
      pitch,
    });
    expect(result).toMatchObject({ status: "SUCCESS", error: "" });
  });
});
