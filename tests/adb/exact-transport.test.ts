import { it, expect, vi } from "vitest";
vi.mock("node:child_process", () => ({ execFile: vi.fn() }));
vi.mock("../../src/adb/reconnect.js", () => ({ resolveSerial: vi.fn(() => "remembered-endpoint"), reconnect: vi.fn() }));
import { execFile } from "node:child_process";
import { adb } from "../../src/adb/exec.js";
import { resolveSerial, reconnect } from "../../src/adb/reconnect.js";
it("exact transport bypasses cached retargeting AND retry after missing transport", async () => {
  vi.mocked(execFile).mockImplementation((...args: any[]) => {
    args.at(-1)(Object.assign(new Error("missing"), { stderr: "error: device offline", code: 1 }));
    return {} as any;
  });
  await expect(adb(["shell", "dumpsys power"], { serial: "192.0.2.1:12345", exactSerial: true })).rejects.toThrow();
  expect(execFile).toHaveBeenCalledWith("adb", ["-s", "192.0.2.1:12345", "shell", "dumpsys power"], expect.any(Object), expect.any(Function));
  expect(resolveSerial).not.toHaveBeenCalled(); expect(reconnect).not.toHaveBeenCalled();
  expect(execFile).toHaveBeenCalledTimes(1);
  await expect(adb(["shell", "dumpsys power"], { exactSerial: true })).rejects.toThrow("explicit serial");
});
