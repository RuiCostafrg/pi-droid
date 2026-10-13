import { describe, expect, it, vi } from "vitest";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
vi.mock("../../src/adb/app-fallback.js", () => ({ launchAppWithFallback: vi.fn() }));
import { launchAppWithFallback } from "../../src/adb/app-fallback.js";
import { Device } from "../../src/adb/device.js";
import { registerDeviceTools } from "../../src/tools/device.js";

describe("android_app fallback wiring", () => {
  it("registers fallback fields, passes the active serial, and marks missing apps as errors", async () => {
    const registerTool = vi.fn();
    const connect = vi.spyOn(Device, "connect").mockResolvedValue(new Device("active-phone"));
    try {
      registerDeviceTools({ registerTool } as unknown as ExtensionAPI, {});
      const tool = registerTool.mock.calls.map(([definition]) => definition).find(t => t.name === "android_app");
      expect(tool.parameters.properties).toHaveProperty("fallback_url");
      expect(tool.parameters.properties).toHaveProperty("browser_package");
      vi.mocked(launchAppWithFallback).mockResolvedValueOnce({ launched: "com.android.chrome", fallback: true, requestedPackage: "com.example.app", url: "https://example.com" });
      const success = await tool.execute("id", { action: "launch", package: "com.example.app", fallback_url: "https://example.com", browser_package: "com.android.chrome" });
      expect(launchAppWithFallback).toHaveBeenCalledWith("com.example.app", { serial: "active-phone", fallbackUrl: "https://example.com", browserPackage: "com.android.chrome" });
      expect(JSON.parse(success.content[0].text)).toMatchObject({ fallback: true, launched: "com.android.chrome" });
      expect(success.isError).not.toBe(true);
      vi.mocked(launchAppWithFallback).mockResolvedValueOnce({ launched: null, fallback: false, error: "app_not_installed", package: "com.example.app", suggestion: "Supply a URL" });
      const failure = await tool.execute("id2", { action: "launch", package: "com.example.app" });
      expect(failure.isError).toBe(true);
      expect(JSON.parse(failure.content[0].text).error).toBe("app_not_installed");
    } finally { connect.mockRestore(); }
  });
});
