import { expect, it } from "vitest";
import { mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// Public report boundary: the real CLI receives adversarial worker IPC.
// No ADB commands or private capture internals are mocked.
it("allowlists failure metadata and bounds malformed/overflowing worker IPC", async () => {
  const dir = await mkdtemp(join(tmpdir(), "capture-ipc-"));
  try {
    await copyFile(resolve("scripts/capture-benchmark.mjs"), join(dir, "capture-benchmark.mjs"));
    await writeFile(join(dir, "capture-worker.mjs"), `
process.once("message", () => {
  const span = { stage: "device_dump", startMs: 0, durationMs: 1, outcome: "error", failureKind: "timeout" };
  process.send({ type: "span", span: { ...span, command: "PRIVATE_COMMAND", serial: "PRIVATE_SERIAL" } });
  process.send({ type: "span", span: { ...span, failureKind: "PRIVATE_ERROR" } });
  process.send({ type: "span", span: { ...span, durationMs: -1 } });
  process.send({ type: "span", span: { ...span, stage: "PRIVATE_STAGE" } });
  process.send({ type: "span", span: { ...span, outcome: "ok", failureKind: "cancelled" } });
  for (let i = 0; i < 130; i++) process.send({ type: "span", span });
  process.send({ type: "result", outcome: "error", failureKind: "cancelled", captureMs: 1,
    message: "PRIVATE_ERROR" }, () => process.disconnect());
});
`);
    const config = join(dir, "config.json");
    await writeFile(config, JSON.stringify({ foregroundPackage: "fictional.package",
      assertions: [{ resourceId: "fictional:id/field", text: "PRIVATE_EXPECTATION" }],
      rounds: 1, trace: true, observationMs: 10000 }));
    let stdout = "";
    try {
      await promisify(execFile)(process.execPath, [join(dir, "capture-benchmark.mjs"), config], {
        cwd: resolve("."), timeout: 15000,
        env: { ...process.env, ANDROID_SERIAL: "PRIVATE_SERIAL" },
      });
      throw Error("Expected CLI error exit");
    } catch (error) { stdout = (error as { stdout: string }).stdout; }
    const report = JSON.parse(stdout);
    const sample = report.samples[0];
    expect(sample.failureKind).toBe("cancelled");
    expect(sample.spans).toHaveLength(128);
    expect(sample.spans[0].failureKind).toBe("timeout");
    expect(sample.spans[1]).not.toHaveProperty("failureKind");
    expect(sample.spans[2].outcome).toBe("ok");
    expect(sample.spans[2]).not.toHaveProperty("failureKind");
    expect(sample.spansTruncated).toBe(true);
    expect(sample.traceComplete).toBe(false);
    expect(stdout).not.toContain("PRIVATE_");
    expect(stdout).not.toContain("fictional.package");
  } finally { await rm(dir, { recursive: true, force: true }); }
}, 20000);
