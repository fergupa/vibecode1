import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

import { middleware } from "@/middleware";
import { getToken } from "next-auth/jwt";

const mockedGetToken = vi.mocked(getToken);

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /login when no token on admin route", async () => {
    mockedGetToken.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/admin/dashboard");
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("callbackUrl=");
  });

  it("allows request through when token exists", async () => {
    mockedGetToken.mockResolvedValue({ name: "admin", sub: "1" });

    const req = new NextRequest("http://localhost/admin/dashboard");
    const res = await middleware(req);

    // NextResponse.next() returns a response that passes through
    expect(res.headers.get("location")).toBeNull();
  });
});
