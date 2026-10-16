/** Host-local helpers. These never inspect the selected ADB device. */
import { readFile, readlink, realpath } from "node:fs/promises";
import { resolve } from "node:path";

export interface HostProcessIdentity { pid: number; parent: number; startTicks: string }

/** Read-only Linux/Termux capability check; missing procfs or unknown owners refuse. */
export async function inspectHostProcess(
  pid: number,
  expected: { cwd: string; executable: string; entryPoint: string },
): Promise<HostProcessIdentity> {
  try {
    if (!Number.isSafeInteger(pid) || pid < 1) throw new Error();
    const proc = `/proc/${pid}`;
    // Resolve the readlink TARGET: realpath(/proc/PID/exe) can yield linker64 on Termux.
    const [cwd, executable, command, before] = await Promise.all([
      readlink(`${proc}/cwd`).then(p => realpath(p)),
      readlink(`${proc}/exe`).then(p => realpath(p)),
      readFile(`${proc}/cmdline`, "utf8"), readFile(`${proc}/stat`, "utf8"),
    ]);
    const args = command.split("\0").filter(Boolean);
    if (cwd !== await realpath(expected.cwd) || executable !== await realpath(expected.executable) ||
        resolve(cwd, args.at(-1) ?? "") !== resolve(expected.entryPoint)) throw new Error();
    const after = await readFile(`${proc}/stat`, "utf8");
    const fields = (s: string) => s.slice(s.lastIndexOf(") ") + 2).trim().split(/\s+/);
    const a = fields(before), b = fields(after);
    if (!/^\d+$/.test(a[19]) || a[19] !== b[19] || a[1] !== b[1]) throw new Error();
    return { pid, parent: Number(b[1]), startTicks: b[19] };
  } catch {
    // Never leak cmdline, filesystem paths or OS errors into diagnostics.
    throw new Error("Host process identity unavailable or mismatched; mutation refused.");
  }
}
