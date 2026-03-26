// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock server-only to avoid "server-only" import error in test environment
vi.mock("server-only", () => ({}));

// Mock next/headers cookies
const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => mockCookieStore),
}));

import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";
import { NextRequest } from "next/server";

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("sets an httpOnly cookie with a signed JWT", async () => {
    await createSession("user-123", "test@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();

    const [name, token, options] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe("auth-token");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // valid JWT structure
    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe("/");
    expect(options.sameSite).toBe("lax");
  });

  test("sets cookie expiry approximately 7 days in the future", async () => {
    const before = Date.now();
    await createSession("user-123", "test@example.com");
    const after = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const expires: Date = options.expires;

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  test("embeds userId and email in the JWT payload", async () => {
    await createSession("user-abc", "hello@example.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    // Decode payload (middle segment) without verifying signature
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString()
    );

    expect(payload.userId).toBe("user-abc");
    expect(payload.email).toBe("hello@example.com");
  });

  test("issues a new token on each call (tokens differ)", async () => {
    await createSession("u1", "a@example.com");
    await createSession("u2", "b@example.com");

    const token1 = mockCookieStore.set.mock.calls[0][1];
    const token2 = mockCookieStore.set.mock.calls[1][1];
    expect(token1).not.toBe(token2);
  });
});

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns null for a tampered / invalid token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "invalid.jwt.token" });
    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns session payload for a valid token created by createSession", async () => {
    // First create a session to get a real token
    await createSession("user-xyz", "valid@example.com");
    const [, token] = mockCookieStore.set.mock.calls[0];

    vi.clearAllMocks();
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-xyz");
    expect(session?.email).toBe("valid@example.com");
  });
});

describe("deleteSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("deletes the auth-token cookie", async () => {
    await deleteSession();
    expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns null when request has no auth-token cookie", async () => {
    const request = new NextRequest("http://localhost/api/test");
    const session = await verifySession(request);
    expect(session).toBeNull();
  });

  test("returns null for an invalid token in the request", async () => {
    const request = new NextRequest("http://localhost/api/test", {
      headers: { cookie: "auth-token=bad.token.here" },
    });
    const session = await verifySession(request);
    expect(session).toBeNull();
  });

  test("returns session payload for a valid token in the request", async () => {
    // Create a real token via createSession
    await createSession("req-user", "req@example.com");
    const [, token] = mockCookieStore.set.mock.calls[0];

    const request = new NextRequest("http://localhost/api/test", {
      headers: { cookie: `auth-token=${token}` },
    });

    const session = await verifySession(request);
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("req-user");
    expect(session?.email).toBe("req@example.com");
  });
});
