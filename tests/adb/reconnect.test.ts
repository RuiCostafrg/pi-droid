import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaptureSpan } from "../../src/adb/capture-timing.js";

const mocks = vi.hoisted(() => ({ exec: vi.fn(), connect: vi.fn() }));
vi.mock("node:child_process", () => ({ execFile: mocks.exec }));
vi.mock("../../src/adb/wifi.js", () => ({ autoConnect: mocks.connect }));

function respond(...responses: Array<string | Error>) {
  mocks.exec.mockImplementation((_cmd, _args, _opts, cb) => {
    const response = responses.shift() ?? "ok";
    if (response instanceof Error) cb(response);
    else cb(null, { stdout: response, stderr: "" });
    return {};
  });
}
function fail(stderr: string) {
  return Object.assign(new Error("failed"), { stderr, code: 1 });
}
beforeEach(() => {
  vi.resetModules();
  mocks.exec.mockReset();
  mocks.connect.mockReset().mockResolvedValue("192.168.1.42:42000");
});

describe("automatic secure reconnect", () => {
  it("recovers initial Device.connect when the device list is empty", async () => {
    respond("List of devices attached\n");
    const { Device } = await import("../../src/adb/device.js");
    expect((await Device.connect()).serial).toBe("192.168.1.42:42000");
    expect(mocks.connect).toHaveBeenCalledTimes(1);
  });

  it("recovers initial Device.connect with a changed port", async () => {
    respond("List of devices attached\n192.168.1.42:40000 offline");
    const { Device } = await import("../../src/adb/device.js");
    expect((await Device.connect("192.168.1.42:40000")).serial).toBe("192.168.1.42:42000");
    expect(mocks.connect.mock.calls[0][0].host).toBe("192.168.1.42");
  });

  it.each([
    "List of devices attached\nUSB123 unauthorized",
    "List of devices attached\nUSB123 device\nUSB456 device",
  ])("does not guess or bypass unauthorized devices: %s", async devices => {
    respond(devices);
    const { Device } = await import("../../src/adb/device.js");
    await expect(Device.connect()).rejects.toThrow();
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("discovers and retries once when no device is available", async () => {
    respond(fail("error: no devices/emulators found"), "recovered");
    const { adb } = await import("../../src/adb/exec.js");
    expect(await adb(["shell", "wm size"])).toBe("recovered");
    expect(mocks.connect).toHaveBeenCalledWith({ host: undefined, timeout: 5000, autoReconnect: false,
      captureClock: { sync: expect.any(Function), async: expect.any(Function) } });
    expect(mocks.exec.mock.calls[1][1]).toEqual(["-s", "192.168.1.42:42000", "shell", "wm size"]);
  });

  it("filters by host and remembers the new port for stale callers", async () => {
    respond(fail("adb: device '192.168.1.42:40000' not found"), "recovered", "next");
    const { adb } = await import("../../src/adb/exec.js");
    const options = { serial: "192.168.1.42:40000" };
    await adb(["shell", "true"], options);
    await adb(["shell", "true"], options);
    expect(mocks.connect.mock.calls[0][0].host).toBe("192.168.1.42");
    expect(mocks.exec.mock.calls[2][1][1]).toBe("192.168.1.42:42000");
    expect(options.serial).toBe("192.168.1.42:40000");
  });

  it("stops after one retry", async () => {
    respond(fail("error: device offline"), fail("error: device offline"));
    const { adb } = await import("../../src/adb/exec.js");
    await expect(adb(["shell", "true"])).rejects.toThrow("ADB command failed");
    expect(mocks.connect).toHaveBeenCalledTimes(1);
    expect(mocks.exec).toHaveBeenCalledTimes(2);
  });

  it.each(["error: closed", "error: device unauthorized", "permission denied", "command timed out", "error: more than one device/emulator"])("does not replay ambiguous/unsafe failure: %s", async stderr => {
    respond(fail(stderr));
    const { adb } = await import("../../src/adb/exec.js");
    await expect(adb(["shell", "input tap 10 10"])).rejects.toThrow();
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it.each([
    { serial: "USB123" },
    { autoReconnect: false },
  ])("respects explicit USB targeting and opt-out: %j", async options => {
    respond(fail("error: device offline"));
    const { adb } = await import("../../src/adb/exec.js");
    await expect(adb(["shell", "true"], options)).rejects.toThrow();
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("does not reconnect management commands", async () => {
    respond(fail("error: device offline"));
    const { adb } = await import("../../src/adb/exec.js");
    await expect(adb(["disconnect"])).rejects.toThrow();
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("reports discovery failure without retrying the action", async () => {
    respond(fail("error: no devices/emulators found"));
    mocks.connect.mockRejectedValue(new Error("Multiple Wireless debugging endpoints found"));
    const { adb } = await import("../../src/adb/exec.js");
    await expect(adb(["shell", "true"])).rejects.toThrow("secure reconnect failed: Multiple");
    expect(mocks.exec).toHaveBeenCalledTimes(1);
  });

  it("times failed attempt, shared recovery wait and retry on one clock without private fields", async () => {
    respond(fail("error: device offline"), "recovered");
    mocks.connect.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
      return "192.168.1.42:42000";
    });
    const { adb } = await import("../../src/adb/exec.js");
    const spans: CaptureSpan[] = [];
    expect(await adb(["shell", "PRIVATE_COMMAND"], { onCaptureSpan: span => {
      spans.push(span); throw Error("PRIVATE_SINK");
    } })).toBe("recovered");
    expect(spans.map(s => [s.stage, s.outcome, s.failureKind])).toEqual([
      ["adb_attempt", "error", "exit"], ["reconnect", "ok", undefined], ["adb_attempt", "ok", undefined],
    ]);
    expect(spans[1].durationMs).toBeGreaterThanOrEqual(75);
    expect(spans[2].startMs).toBeGreaterThanOrEqual(spans[1].startMs + spans[1].durationMs);
    expect(JSON.stringify(spans)).not.toMatch(/PRIVATE|192\.168|shell/);
  });

  it("retains a failed recovery span but preserves the original command error", async () => {
    respond(fail("error: device offline"));
    mocks.connect.mockRejectedValue(new Error("PRIVATE_DISCOVERY"));
    const { adb } = await import("../../src/adb/exec.js");
    const spans: CaptureSpan[] = [];
    await expect(adb(["shell", "true"], { onCaptureSpan: span => spans.push(span) }))
      .rejects.toMatchObject({ failureKind: "exit" });
    expect(spans.map(s => [s.stage, s.outcome, s.failureKind])).toEqual([
      ["adb_attempt", "error", "exit"], ["reconnect", "error", "unknown"],
    ]);
    expect(JSON.stringify(spans)).not.toContain("PRIVATE");
  });

  it("shares recovery between concurrent commands", async () => {
    respond(fail("error: device offline"), fail("error: device offline"), "one", "two");
    let release!: (serial: string) => void;
    mocks.connect.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const { adb } = await import("../../src/adb/exec.js");
    const traces: CaptureSpan[][] = [[], []];
    const results = Promise.all(traces.map(spans => adb(["shell", "true"], {
      onCaptureSpan: span => spans.push(span),
    })));
    await vi.waitFor(() => expect(mocks.connect).toHaveBeenCalledTimes(1));
    release("192.168.1.42:42000");
    expect(await results).toEqual(["one", "two"]);
    for (const spans of traces) {
      expect(spans.map(s => s.stage)).toEqual(["adb_attempt", "reconnect", "adb_attempt"]);
      expect(spans[2].startMs).toBeGreaterThanOrEqual(spans[1].startMs + spans[1].durationMs);
    }
    expect(mocks.connect).toHaveBeenCalledTimes(1);
  });
});
