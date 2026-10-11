import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../../src/adb/exec.js", () => ({ adb: vi.fn(), adbShell: vi.fn(), listDevices: vi.fn() }));
vi.mock("../../src/adb/mdns.js", () => ({ discoverWirelessEndpoints: vi.fn() }));
import { adb, listDevices } from "../../src/adb/exec.js";
import { discoverWirelessEndpoints } from "../../src/adb/mdns.js";
import { autoConnect } from "../../src/adb/wifi.js";
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(discoverWirelessEndpoints).mockResolvedValue([{ host: "192.0.2.1", port: 37431 }]);
  vi.mocked(adb).mockResolvedValue("connected to 192.0.2.1:37431");
  vi.mocked(listDevices).mockResolvedValue([{ serial: "192.0.2.1:37431", state: "device", transport: "wifi" }]);
});
describe("secure auto reconnect", () => {
  it("connects to the discovered port without enabling tcpip", async () => {
    expect(await autoConnect()).toBe("192.0.2.1:37431");
    expect(adb).toHaveBeenCalledOnce();
    expect(adb).toHaveBeenCalledWith(["connect", "192.0.2.1:37431"], expect.any(Object));
  });
  it("uses an old serial's IP but discovers its new port", async () => {
    expect(await autoConnect({ serial: "192.0.2.1:40000" })).toBe("192.0.2.1:37431");
  });
  it("refuses ambiguous devices before connecting", async () => {
    vi.mocked(discoverWirelessEndpoints).mockResolvedValue([{ host: "192.0.2.1", port: 37431 }, { host: "192.0.2.2", port: 40000 }]);
    await expect(autoConnect()).rejects.toThrow("Multiple");
    expect(adb).not.toHaveBeenCalled();
    expect(await autoConnect({ host: "192.0.2.1" })).toBe("192.0.2.1:37431");
  });
  it("reports missing services without using legacy mode", async () => {
    vi.mocked(discoverWirelessEndpoints).mockResolvedValue([]);
    await expect(autoConnect()).rejects.toThrow("No secure");
    expect(adb).not.toHaveBeenCalled();
  });
  it("reports failed connections", async () => {
    vi.mocked(adb).mockResolvedValue("failed to connect");
    await expect(autoConnect()).rejects.toThrow("WiFi connect failed");
  });
  it("rejects offline or unauthorized transports", async () => {
    vi.mocked(listDevices).mockResolvedValue([]);
    await expect(autoConnect()).rejects.toThrow("not authorized or is offline");
  });
});
