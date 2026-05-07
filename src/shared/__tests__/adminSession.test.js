import { describe, expect, vi } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import {
  parseUserAgent,
  maskIpAddress,
  normalizeCountryCode,
  getAuthMethodLabelFromSession,
  getAdminDeviceId,
} from "../lib/adminSession.js";

describe("lib/adminSession", () => {
  qaTest("lib.adminSession.01", () => {
    expect(parseUserAgent("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120 Safari/537.36").browser).toBe("Chrome");
    expect(parseUserAgent("Mozilla/5.0 AppleWebKit/537.36 Chrome/120 Edg/120").browser).toBe("Edge");
    expect(parseUserAgent("Mozilla/5.0 Chrome/120 OPR/100").browser).toBe("Opera");
    expect(parseUserAgent("Mozilla/5.0 Gecko/20100101 Firefox/120").browser).toBe("Firefox");
    expect(parseUserAgent("Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Version/16 Safari/537.36").browser).toBe("Safari");
    expect(parseUserAgent("").browser).toBe("Unknown");
    expect(parseUserAgent(null).browser).toBe("Unknown");
  });

  qaTest("lib.adminSession.02", () => {
    expect(parseUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)").os).toBe("Windows");
    expect(parseUserAgent("Mozilla/5.0 (Linux; Android 13; Pixel 7)").os).toBe("Android");
    expect(parseUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)").os).toBe("iOS");
    expect(parseUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 12_6)").os).toBe("macOS");
    expect(parseUserAgent("Mozilla/5.0 (X11; Linux x86_64)").os).toBe("Linux");
    expect(parseUserAgent("").os).toBe("Unknown");
  });

  qaTest("lib.adminSession.03", () => {
    expect(maskIpAddress("192.168.1.42")).toBe("192.168.1.xxx");
    expect(maskIpAddress("10.0.0.255")).toBe("10.0.0.xxx");
    expect(maskIpAddress("0.0.0.0")).toBe("0.0.0.xxx");
    // IPv6
    expect(maskIpAddress("2001:db8:85a3:0000:0000:8a2e:0370:7334")).toBe("2001:db8:xxxx:xxxx");
    expect(maskIpAddress("fe80::1")).toBe("fe80:1:xxxx:xxxx");
    // Invalid / empty
    expect(maskIpAddress("")).toBe("Unknown");
    expect(maskIpAddress(null)).toBe("Unknown");
    expect(maskIpAddress("not-an-ip")).toBe("Unknown");
    expect(maskIpAddress("256.0.0.1")).toBe("Unknown");
  });

  qaTest("lib.adminSession.04", () => {
    expect(normalizeCountryCode("TR")).toBe("TR");
    expect(normalizeCountryCode("us")).toBe("US");
    expect(normalizeCountryCode("de")).toBe("DE");
    // Invalid
    expect(normalizeCountryCode("")).toBe("Unknown");
    expect(normalizeCountryCode(null)).toBe("Unknown");
    expect(normalizeCountryCode("USA")).toBe("Unknown");
    expect(normalizeCountryCode("1A")).toBe("Unknown");
    expect(normalizeCountryCode("A")).toBe("Unknown");
  });

  qaTest("lib.adminSession.05", () => {
    // Single email provider via `provider`
    expect(
      getAuthMethodLabelFromSession({ user: { app_metadata: { provider: "email" } } }, {})
    ).toBe("Email");

    // Google via providers array
    expect(
      getAuthMethodLabelFromSession({ user: { app_metadata: { providers: ["google"] } } }, {})
    ).toBe("Google");

    // Multiple providers joined
    expect(
      getAuthMethodLabelFromSession(
        { user: { app_metadata: { providers: ["email", "google"] } } }, {}
      )
    ).toBe("Email + Google");

    // Unknown provider capitalized
    expect(
      getAuthMethodLabelFromSession({ user: { app_metadata: { provider: "github" } } }, {})
    ).toBe("GitHub");

    // No provider + user has email → "Email"
    expect(
      getAuthMethodLabelFromSession({ user: { app_metadata: {} } }, { email: "a@b.com" })
    ).toBe("Email");

    // No provider, no email → "Unknown"
    expect(
      getAuthMethodLabelFromSession({ user: { app_metadata: {} } }, {})
    ).toBe("Unknown");

    // Null session → "Unknown"
    expect(getAuthMethodLabelFromSession(null, {})).toBe("Unknown");
  });

  qaTest("lib.adminSession.06", () => {
    const id = getAdminDeviceId();
    expect(typeof id).toBe("string");
    expect(id.startsWith("dev_")).toBe(true);
    // Second call uses in-memory cache — same value
    expect(getAdminDeviceId()).toBe(id);
  });
});
