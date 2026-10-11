import { beforeEach, describe, expect, it, vi } from "vitest";

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
    expect(mocks.connect).toHaveBeenCalledWith({ host: undefined, timeout: 5000, autoReconnect: false });
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

  it("shares recovery between concurrent commands", async () => {
    respond(fail("error: device offline"), fail("error: device offline"), "one", "two");
    let release!: (serial: string) => void;
    mocks.connect.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const { adb } = await import("../../src/adb/exec.js");
    const results = Promise.all([adb(["shell", "true"]), adb(["shell", "true"])]);
    await vi.waitFor(() => expect(mocks.connect).toHaveBeenCalledTimes(1));
    release("192.168.1.42:42000");
    expect(await results).toEqual(["one", "two"]);
  });
});
