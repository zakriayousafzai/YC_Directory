import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { clientFetchMock, createMock } = vi.hoisted(() => ({
  clientFetchMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("@/sanity/lib/client", () => ({
  client: {
    withConfig: () => ({ fetch: clientFetchMock }),
  },
}));
vi.mock("@/sanity/lib/write-client", () => ({
  writeClient: { create: createMock },
}));
vi.mock("@/lib/queries", () => ({
  AUTHOR_BY_GITHUB_ID_QUERY: "*[_type == 'author']",
}));

import { authCallbacks } from "@/lib/auth-callbacks";

type SignInInput = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  profile?: Record<string, unknown>;
};

type JwtInput = {
  token: Record<string, unknown>;
  account?: Record<string, unknown> | null;
  profile?: Record<string, unknown> | null;
};

type SessionInput = {
  session: { id?: string };
  token: Record<string, unknown>;
};

const signIn = (params: SignInInput) =>
  authCallbacks.signIn(
    params as unknown as Parameters<typeof authCallbacks.signIn>[0]
  );

const jwt = (params: JwtInput) =>
  authCallbacks.jwt(
    params as unknown as Parameters<typeof authCallbacks.jwt>[0]
  );

const session = (params: SessionInput) =>
  authCallbacks.session(
    params as unknown as Parameters<typeof authCallbacks.session>[0]
  );

beforeEach(() => {
  clientFetchMock.mockReset();
  createMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Auth.js callbacks", () => {
  it("creates a Sanity author on first GitHub sign-in", async () => {
    clientFetchMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ _id: "author-1" });

    const result = await signIn({
      user: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        image: "https://avatars.githubusercontent.com/u/1",
      },
      profile: {
        id: 12345,
        login: "ada",
        bio: "Mathematician",
      },
    });

    expect(result).toBe(true);
    expect(createMock).toHaveBeenCalledWith({
      _type: "author",
      id: 12345,
      name: "Ada Lovelace",
      username: "ada",
      email: "ada@example.com",
      image: "https://avatars.githubusercontent.com/u/1",
      bio: "Mathematician",
    });
  });

  it("does not create a duplicate author for returning users", async () => {
    clientFetchMock.mockResolvedValue({ _id: "author-1" });

    const result = await signIn({
      user: { name: "Ada", email: null, image: null },
      profile: { id: 12345, login: "ada" },
    });

    expect(result).toBe(true);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects sign-in when the GitHub profile has no id", async () => {
    const result = await signIn({
      user: { name: "Ada" },
      profile: {},
    });

    expect(result).toBe(false);
    expect(clientFetchMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("stores the Sanity author id on the JWT and session", async () => {
    clientFetchMock.mockResolvedValue({ _id: "author-1" });

    const token = await jwt({
      token: { sub: "12345" },
      account: { provider: "github" },
      profile: { id: 12345 },
    });

    expect(token.id).toBe("author-1");

    const currentSession = await session({
      session: {},
      token,
    });

    expect(currentSession.id).toBe("author-1");
  });

  it("leaves the token unchanged for non-sign-in callbacks", async () => {
    const token = await jwt({
      token: { sub: "12345", id: "author-1" },
    });

    expect(token).toEqual({ sub: "12345", id: "author-1" });
    expect(clientFetchMock).not.toHaveBeenCalled();
  });
});
