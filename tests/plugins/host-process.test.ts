import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("node:fs/promises", () => ({ readFile: vi.fn(), readlink: vi.fn(), realpath: vi.fn() }));
import { readFile, readlink, realpath } from "node:fs/promises";
import { inspectHostProcess } from "../../src/host/index.js";
const expected = { cwd: "/fixture", executable: "/bin/node", entryPoint: "/fixture/server.js" };
function procStat(ticks = "1234") { return `17 (node (fixture)) S 10 ${Array(17).fill("0").join(" ")} ${ticks} 0`; }
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(readlink).mockImplementation(async p => String(p).endsWith("cwd") ? "/fixture" : "/bin/node");
  // Reproduce the Termux proc realpath quirk. Helper must resolve readlink's target.
  vi.mocked(realpath).mockImplementation(async p => String(p).startsWith("/proc/") ? "/bin/linker64" : String(p));
  vi.mocked(readFile).mockImplementation(async p => String(p).endsWith("cmdline") ? "node\0server.js\0" : procStat());
});
describe("host-local identity", () => {
  it("validates cwd, executable target, entry and start ticks", async () => {
    expect(await inspectHostProcess(17, expected)).toEqual({ pid: 17, parent: 10, startTicks: "1234" });
    expect(realpath).not.toHaveBeenCalledWith("/proc/17/exe");
  });
  it("refuses mismatches and invalid PIDs without leaking raw errors", async () => {
    await expect(inspectHostProcess(17, { ...expected, executable: "/other" })).rejects.toThrow("mutation refused");
    vi.mocked(readFile).mockRejectedValue(new Error("private-secret"));
    await expect(inspectHostProcess(17, expected)).rejects.toThrow("mutation refused");
    await expect(inspectHostProcess(-1, expected)).rejects.toThrow("mutation refused");
  });
  it("refuses PID reuse during observation", async () => {
    vi.mocked(readFile).mockResolvedValueOnce("node\0server.js\0").mockResolvedValueOnce(procStat()).mockResolvedValueOnce(procStat("9999"));
    await expect(inspectHostProcess(17, expected)).rejects.toThrow("mutation refused");
  });
});
