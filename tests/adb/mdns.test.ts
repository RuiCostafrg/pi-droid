import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../../src/adb/exec.js", () => ({ adb: vi.fn() }));
vi.mock("multicast-dns", () => ({ default: vi.fn() }));
import multicastDns from "multicast-dns";
import { adb } from "../../src/adb/exec.js";
import { discoverWirelessEndpoints } from "../../src/adb/mdns.js";
const service = "_adb-tls-connect._tcp.local";
let browser: EventEmitter & { query: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  browser = Object.assign(new EventEmitter(), { query: vi.fn(), destroy: vi.fn() });
  vi.mocked(multicastDns).mockReturnValue(browser as any);
  vi.mocked(adb).mockRejectedValue(new Error("unsupported mDNS"));
});
afterEach(() => vi.useRealTimers());
describe("secure mDNS discovery", () => {
  it("uses ADB discovery and ignores legacy and pairing services", async () => {
    vi.mocked(adb).mockResolvedValue("phone _adb-tls-connect._tcp 192.0.2.1:37431\nphone _adb-tls-pairing._tcp 192.0.2.1:40000\nphone _adb._tcp 192.0.2.1:5555");
    expect(await discoverWirelessEndpoints()).toEqual([{ host: "192.0.2.1", port: 37431 }]);
    expect(multicastDns).not.toHaveBeenCalled();
  });
  it("falls back, resolves split records, deduplicates, and cleans up", async () => {
    const pending = discoverWirelessEndpoints(100);
    await vi.advanceTimersByTimeAsync(0);
    browser.emit("response", { answers: [{ type: "A", name: "PHONE.local.", data: "192.0.2.1", ttl: 120 }] });
    browser.emit("response", { answers: [{ type: "PTR", name: service, data: `phone.${service}`, ttl: 120 }], additionals: [
      { type: "SRV", name: `phone.${service}`, data: { target: "phone.local", port: 37431 }, ttl: 120 },
      { type: "SRV", name: `pair._adb-tls-pairing._tcp.local`, data: { target: "phone.local", port: 40000 }, ttl: 120 },
    ] });
    await vi.advanceTimersByTimeAsync(100);
    expect(await pending).toEqual([{ host: "192.0.2.1", port: 37431 }]);
    expect(browser.destroy).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("also falls back when ADB returns an empty list", async () => {
    vi.mocked(adb).mockResolvedValue("List of discovered mdns services");
    const pending = discoverWirelessEndpoints(100);
    await vi.advanceTimersByTimeAsync(100);
    expect(await pending).toEqual([]);
    expect(browser.destroy).toHaveBeenCalledOnce();
  });
  it("rejects socket errors and releases its timers", async () => {
    const pending = discoverWirelessEndpoints(100);
    const assertion = expect(pending).rejects.toThrow("socket denied");
    await vi.advanceTimersByTimeAsync(0);
    browser.emit("error", new Error("socket denied"));
    await assertion;
    expect(browser.destroy).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
