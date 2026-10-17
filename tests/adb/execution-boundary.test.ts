import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdtemp, writeFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

vi.setConfig({ testTimeout: 15000 });
const exec = promisify(execFile);
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "execution-test-"));
  await writeFile(join(dir, "adb"), `#!${process.execPath}
const command = process.argv.join(" ");
if (command.includes("mCurrentFocus")) { console.log("mCurrentFocus=Window{x u0 com.example/.Main}"); }
else if (process.env.EXEC_MODE === "disabled") { console.log("ok"); }
else if (process.env.EXEC_MODE === "exit") { process.stderr.write("PRIVATE_ERROR"); process.exit(7); }
else if (process.env.EXEC_MODE === "signal") { process.kill(process.pid, "SIGTERM"); }
else if (process.env.EXEC_MODE === "buffer") { process.stdout.write("x".repeat(100000)); }
else { setInterval(() => {}, 1000); }
`);
  await chmod(join(dir, "adb"), 0o700);
});
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

async function probe(mode: string) {
  const script = join(dir, "probe.mjs");
  await writeFile(script, `
import { adb } from ${JSON.stringify(resolve("src/adb/exec.ts"))};
import { dumpUiTree, setUiDumpDir } from ${JSON.stringify(resolve("src/adb/ui-tree.ts"))};
setUiDumpDir(${JSON.stringify(join(dir, "xml"))});
const mode = process.env.EXEC_MODE;
const controller = new AbortController();
if (mode === "pre-cancel") controller.abort();
let timer;
// Schedule cancellation after the operation begins, without duration-based classification.
if (mode === "cancel" || mode === "capture-cancel") timer = setTimeout(() => controller.abort(), 300);
const spans = [];
const options = { serial: "PRIVATE_SERIAL", exactSerial: true, autoReconnect: false,
  timeout: mode === "timeout" ? 300 : 3000, signal: controller.signal,
  maxBuffer: mode === "buffer" ? 100 : undefined,
  onCaptureSpan: mode === "disabled" ? undefined : span => { spans.push(span); if (mode === "exit") throw Error("PRIVATE_SINK"); } };
let failure;
try {
  if (mode === "capture" || mode === "capture-cancel") {
    await dumpUiTree({ ...options, timeout: 2000, skipCache: true, ocrFallback: false,
      onCaptureSpan: span => spans.push(span) });
  } else {
    await adb(["shell", "PRIVATE_COMMAND"], options);
  }
} catch (error) {
  failure = { name: error.name, failureKind: error.failureKind, exitCode: error.exitCode };
} finally { clearTimeout(timer); }
console.log(JSON.stringify({ failure, spans }));
`);
  if (mode === "spawn") await rm(join(dir, "adb"));
  const { stdout } = await exec(process.execPath, ["--import", "tsx", script], {
    timeout: 10000,
    env: { ...process.env, PATH: mode === "spawn" ? dir : `${dir}:${process.env.PATH}`, EXEC_MODE: mode },
  });
  return JSON.parse(stdout);
}

it("preserves explicit command timeout metadata at the real process boundary", async () => {
  const result = await probe("timeout");
  expect(result.failure).toMatchObject({ name: "AdbError", failureKind: "timeout", exitCode: null });
  expect(result.spans).toMatchObject([{ stage: "adb_attempt", outcome: "error", failureKind: "timeout" }]);
});

it.each(["cancel", "pre-cancel"])("preserves explicit cancellation: %s", async mode => {
  const result = await probe(mode);
  expect(result.failure).toMatchObject({ name: "AdbError", failureKind: "cancelled", exitCode: null });
  expect(result.spans).toMatchObject([{ stage: "adb_attempt", outcome: "error", failureKind: "cancelled" }]);
});

it.each([["exit", "exit", 7], ["signal", "signal", null], ["buffer", "buffer", null], ["spawn", "spawn", null]])(
  "does not mislabel other execution failures as timeout: %s", async (mode, failureKind, exitCode) => {
    const result = await probe(mode as string);
    expect(result.failure).toMatchObject({ failureKind, exitCode });
    expect(result.spans).toMatchObject([{ stage: "adb_attempt", outcome: "error", failureKind }]);
    expect(Object.keys(result.spans[0]).sort()).toEqual(["durationMs", "failureKind", "outcome", "stage", "startMs"]);
    expect(JSON.stringify(result)).not.toContain("PRIVATE_");
  },
);

it("does not emit command diagnostics without opt-in", async () => {
  expect((await probe("disabled")).spans).toEqual([]);
});

it("preserves cancellation through capture wrappers without leaking raw errors", async () => {
  const result = await probe("capture-cancel");
  expect(result.failure.failureKind).toBe("cancelled");
  expect(result.spans).toMatchObject([
    { stage: "adb_attempt", outcome: "error", failureKind: "cancelled" },
    { stage: "device_dump", outcome: "error", failureKind: "cancelled" },
    { stage: "adb_attempt", outcome: "error", failureKind: "cancelled" },
    { stage: "foreground", outcome: "error", failureKind: "cancelled" },
  ]);
  expect(JSON.stringify(result)).not.toContain("PRIVATE_");
});

it("retains swallowed capture failures as content-free span metadata without changing fallback", async () => {
  const result = await probe("capture");
  expect(result.failure).toBeUndefined();
  expect(result.spans).toMatchObject([
    { stage: "adb_attempt", outcome: "error", failureKind: "timeout" },
    { stage: "device_dump", outcome: "error", failureKind: "timeout" },
    { stage: "adb_attempt", outcome: "ok" },
    { stage: "foreground", outcome: "ok" },
  ]);
  for (const secret of ["PRIVATE_ERROR", "PRIVATE_SERIAL", "PRIVATE_COMMAND", dir])
    expect(JSON.stringify(result)).not.toContain(secret);
});
