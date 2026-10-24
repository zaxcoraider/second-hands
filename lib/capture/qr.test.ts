import { describe, expect, it } from "vitest";
import { sessionCodeFrom } from "@/lib/capture/qr";

describe("sessionCodeFrom", () => {
  it("reads the code from the bench QR URL", () => {
    expect(sessionCodeFrom("https://second-hands-seven.vercel.app/cam/ab3k9mxz")).toBe("ab3k9mxz");
    expect(sessionCodeFrom("https://192.168.0.100:3000/cam/QRJBMYY3")).toBe("qrjbmyy3");
  });
  it("accepts a typed code with spaces", () => {
    expect(sessionCodeFrom("ABCD 2345")).toBe("abcd2345");
  });
  it("rejects other QR codes", () => {
    expect(sessionCodeFrom("https://example.com/menu")).toBeNull();
    expect(sessionCodeFrom("WIFI:S:home;T:WPA;P:secret;;")).toBeNull();
    expect(sessionCodeFrom("ab")).toBeNull();
  });
});
