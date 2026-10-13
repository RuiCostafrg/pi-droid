import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../../src/adb/exec.js", () => ({ adbShell: vi.fn() }));
vi.mock("../../src/adb/app.js", () => ({ launchApp: vi.fn() }));
import { adbShell } from "../../src/adb/exec.js";
import { launchApp } from "../../src/adb/app.js";
import { launchAppWithFallback } from "../../src/adb/app-fallback.js";
const shell = vi.mocked(adbShell);
const launch = vi.mocked(launchApp);
beforeEach(() => { vi.resetAllMocks(); });
describe("checked app launch", () => {
  it("launches an installed app without opening its fallback", async () => {
    shell.mockResolvedValue("package:com.example.app\n");
    expect(await launchAppWithFallback("com.example.app", { serial: "phone", fallbackUrl: "https://example.com" })).toEqual({ launched: "com.example.app", fallback: false });
    expect(launch).toHaveBeenCalledWith("com.example.app", { serial: "phone" });
    expect(shell).toHaveBeenCalledTimes(1);
  });
  it("reports a missing app without side effects or partial-match confusion", async () => {
    shell.mockResolvedValue("package:com.example.app.extra\n");
    expect(await launchAppWithFallback("com.example.app")).toMatchObject({ launched: null, error: "app_not_installed" });
    expect(launch).not.toHaveBeenCalled();
    expect(shell).toHaveBeenCalledTimes(1);
  });
  it("opens the explicit website in an installed browser with quoted URL and serial", async () => {
    shell.mockResolvedValueOnce("").mockResolvedValueOnce("package:com.android.chrome\n")
      .mockResolvedValueOnce("Status: ok\nActivity: com.android.chrome/.Main\n");
    const url = "https://example.com/?q=grips&name=it's";
    expect(await launchAppWithFallback("com.example.app", { fallbackUrl: url, browserPackage: "com.android.chrome", serial: "phone" })).toEqual({ launched: "com.android.chrome", fallback: true, requestedPackage: "com.example.app", url });
    expect(shell).toHaveBeenLastCalledWith("am start -W -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d 'https://example.com/?q=grips&name=it'\\''s' -p com.android.chrome", { serial: "phone" });
    expect(launch).not.toHaveBeenCalled();
  });
  it("uses Android's default handler when no browser is specified", async () => {
    shell.mockResolvedValueOnce("").mockResolvedValueOnce("Status: ok\nActivity: org.mozilla.firefox/.Main\n");
    expect(await launchAppWithFallback("com.example.app", { fallbackUrl: "https://example.com" })).toMatchObject({ launched: "org.mozilla.firefox", fallback: true });
    expect(shell.mock.calls[1][0]).not.toContain(" -p ");
  });
  it("does not mask connection failures as missing apps", async () => {
    shell.mockRejectedValue(new Error("device offline"));
    await expect(launchAppWithFallback("com.example.app", { fallbackUrl: "https://example.com" })).rejects.toThrow("device offline");
    expect(shell).toHaveBeenCalledTimes(1);
  });
  it("does not use fallback after a launch error for an installed app", async () => {
    shell.mockResolvedValue("package:com.example.app");
    launch.mockRejectedValue(new Error("launch failed"));
    await expect(launchAppWithFallback("com.example.app", { fallbackUrl: "https://example.com" })).rejects.toThrow("launch failed");
    expect(shell).toHaveBeenCalledTimes(1);
  });
  it("rejects failed package queries", async () => {
    shell.mockResolvedValue("Error: permission denied");
    await expect(launchAppWithFallback("com.example.app")).rejects.toThrow("Could not check");
  });
  it("reports a missing fallback browser without opening anything", async () => {
    shell.mockResolvedValue("");
    await expect(launchAppWithFallback("com.example.app", { fallbackUrl: "https://example.com", browserPackage: "com.android.chrome" })).rejects.toThrow("browser com.android.chrome is not installed");
    expect(shell).toHaveBeenCalledTimes(2);
  });
  it.each(["Error: unable to resolve Intent", "Status: timeout", "Status: ok\nActivity: android/.ResolverActivity", "Status: ok"]) ("does not claim success for %s", async output => {
    shell.mockResolvedValueOnce("").mockResolvedValueOnce(output);
    await expect(launchAppWithFallback("com.example.app", { fallbackUrl: "https://example.com" })).rejects.toThrow();
  });
  it.each(["javascript:alert(1)", "file:///sdcard/test", "intent://test", "not a URL", "https://user:pass@example.com", "https://example.com/\n"]) ("rejects unsafe fallback %s before executing commands", async fallbackUrl => {
    await expect(launchAppWithFallback("com.example.app", { fallbackUrl })).rejects.toThrow();
    expect(shell).not.toHaveBeenCalled();
  });
  it("rejects package injection", async () => {
    await expect(launchAppWithFallback("com.example.app; reboot")).rejects.toThrow("Invalid Android package");
    await expect(launchAppWithFallback("com.example.app", { browserPackage: "chrome;reboot", fallbackUrl: "https://example.com" })).rejects.toThrow("Invalid Android package");
    expect(shell).not.toHaveBeenCalled();
  });
  it("requires a URL with a browser", async () => {
    await expect(launchAppWithFallback("com.example.app", { browserPackage: "com.android.chrome" })).rejects.toThrow("requires fallbackUrl");
  });
});
