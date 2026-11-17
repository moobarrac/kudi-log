import { describe, expect, it } from "vitest";
import { firstName, friendlyAuthError, safeNext } from "@/lib/auth";
import { greeting } from "@/lib/dates";

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/today")).toBe("/today");
    expect(safeNext("/insights?week=1")).toBe("/insights?week=1");
  });
  it("rejects anything that could leave the site", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "", null, undefined]) {
      expect(safeNext(bad)).toBe("/today");
    }
  });
});

describe("firstName", () => {
  it("prefers the Google name", () => {
    expect(firstName({ email: "x@y.com", user_metadata: { full_name: "Ada Obi" } })).toBe("Ada");
    expect(firstName({ user_metadata: { name: "Tunde" } })).toBe("Tunde");
  });
  it("falls back to the email", () => {
    expect(firstName({ email: "chioma.eze@gmail.com" })).toBe("Chioma");
    expect(firstName({ email: "wale_99@yahoo.com" })).toBe("Wale");
  });
  it("returns null when there's nothing usable", () => {
    expect(firstName({ email: "x1@y.com" })).toBeNull();
    expect(firstName(null)).toBeNull();
  });
});

describe("friendlyAuthError", () => {
  it("explains rate limits kindly", () => {
    expect(friendlyAuthError({ status: 429, message: "x" })).toMatch(/Too many emails/);
    expect(friendlyAuthError({ code: "over_email_send_rate_limit" })).toMatch(/Too many emails/);
  });
  it("explains expired codes", () => {
    expect(friendlyAuthError({ code: "otp_expired" })).toMatch(/expired/);
  });
});

describe("greeting (Lagos time)", () => {
  it("uses the Lagos hour, not UTC", () => {
    // 11:30 UTC = 12:30 Lagos
    expect(greeting(new Date("2026-11-16T11:30:00Z"))).toBe("Good afternoon");
    // 16:30 UTC = 17:30 Lagos
    expect(greeting(new Date("2026-11-16T16:30:00Z"))).toBe("Good evening");
    expect(greeting(new Date("2026-11-16T06:00:00Z"))).toBe("Good morning");
  });
});
