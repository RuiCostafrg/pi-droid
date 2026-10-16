import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { mkdtemp, writeFile, readFile, chmod, rm, access, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

vi.setConfig({ testTimeout: 20000 });

const exec = promisify(execFile);
let dir: string;
const config = {
  foregroundPackage: "com.example.capture",
  assertions: [
    { resourceId: "com.example.capture:id/status", text: "Ready & steady",
      bounds: { left: 20, top: 40, right: 500, bottom: 100 } },
    { resourceId: "com.example.capture:id/query", text: "almond milk",
      className: "android.widget.EditText" },
  ],
  rounds: 2, desiredMs: 5000, observationMs: 10000, budgetMs: 120000,
};

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "capture-test-"));
  // An executable fake at the OS boundary. The production ADB wrapper,
  // filesystem transfer/read, parser, foreground lookup and cache all run.
  await writeFile(join(dir, "adb"), `#!${process.execPath}
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] !== "-s" || args[1] !== "synthetic-device") process.exit(9);
args.splice(0, 2);
const command = args.join(" ");
if (command.includes("screencap") || command.includes("input ") || command.includes("am broadcast")) {
  fs.writeFileSync(process.env.CAPTURE_FORBIDDEN, "attempted");
  process.exit(8);
}
if (args[0] === "pull") {
  if (process.env.CAPTURE_MODE === "pull-error") {
    process.stderr.write("PRIVATE_TRANSPORT_ERROR synthetic-device almond milk");
    process.exit(1);
  }
  fs.copyFileSync(process.env.CAPTURE_XML, args[2]);
} else if (command.includes("uiautomator dump")) {
  if (process.env.CAPTURE_MODE === "slow-dump")
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150);
  if (process.env.CAPTURE_MODE === "zero-exit-error") {
    process.stdout.write("ERROR: could not get idle state");
    process.exit(0);
  }
  if (process.env.CAPTURE_MODE === "hang") {
    fs.writeFileSync(process.env.CAPTURE_STARTED, "started");
    require("node:child_process").spawn(process.execPath, ["-e",
      'setTimeout(() => require("node:fs").writeFileSync(process.env.CAPTURE_ORPHAN, "orphan"), 3500)'],
      { stdio: "ignore" });
    setInterval(() => {}, 1000);
  }
  process.stdout.write("UI hierchary dumped to: /sdcard/pi-droid-ui.xml");
} else if (command.includes("mCurrentFocus")) {
  if (process.env.CAPTURE_MODE === "hang-foreground") {
    fs.writeFileSync(process.env.CAPTURE_STARTED, "started");
    setInterval(() => {}, 1000);
  }
  process.stdout.write("mCurrentFocus=Window{abc u0 com.example.capture/.MainActivity}");
} else process.exit(7);
`);
  await chmod(join(dir, "adb"), 0o700);
});
afterEach(async () => {
  try {
    expect((await readdir(dir)).filter(name => name.startsWith("pi-droid-capture-"))).toEqual([]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

async function run(overrides = {}, extraEnv = {}) {
  const path = join(dir, "config.json");
  await writeFile(path, JSON.stringify({ ...config, ...overrides }));
  try {
    const { stdout } = await exec(process.execPath,
      ["scripts/capture-benchmark.mjs", path], {
        cwd: resolve("."), timeout: 20000,
        env: { ...process.env, PI_DROID_CAPTURE_TMPDIR: dir, PATH: `${dir}:${process.env.PATH}`,
          ANDROID_SERIAL: "synthetic-device",
          CAPTURE_XML: resolve("tests/fixtures/capture.xml"),
          CAPTURE_FORBIDDEN: join(dir, "forbidden"),
          CAPTURE_STARTED: join(dir, "started"),
          CAPTURE_ORPHAN: join(dir, "orphan"), ...extraEnv },
      });
    return { code: 0, report: JSON.parse(stdout) };
  } catch (error) {
    const e = error as { code: number; stdout: string };
    return { code: e.code, report: JSON.parse(e.stdout || "{}") };
  }
}

it("captures known field values, bounds and non-interactive text through real dumpUiTree", async () => {
  const { code, report } = await run();
  expect(code).toBe(0);
  expect(report.status).toBe("pass");
  expect(report.samples).toHaveLength(2);
  expect(report.samples.map((s: { outcome: string }) => s.outcome)).toEqual(["ok", "ok"]);
  expect(report.samples[0]).not.toHaveProperty("spans");
  expect(report.summary.attempts).toBe(2);
  expect(report.summary.failures).toBe(0);
  expect(report.summary.capture.maxMs).toBeGreaterThan(0);
  expect(report.summary.maxMs).toBeGreaterThan(report.summary.capture.maxMs);
});

it("exports opt-in content-free capture-stage timings through the real capture path", async () => {
  const { code, report } = await run({ rounds: 1, trace: true });
  expect(code).toBe(0);
  const spans = report.samples[0].spans;
  expect(report.samples[0].traceComplete).toBe(true);
  expect(report.samples[0].spansTruncated).toBe(false);
  expect(spans.map((s: { stage: string }) => s.stage)).toEqual([
    "device_dump", "xml_transfer", "xml_read", "xml_parse", "foreground",
  ]);
  for (const span of spans) {
    expect(Object.keys(span).sort()).toEqual(["durationMs", "outcome", "stage", "startMs"]);
    expect(span.outcome).toBe("ok");
    expect(span.startMs).toBeGreaterThanOrEqual(0);
    expect(span.durationMs).toBeGreaterThanOrEqual(0);
    expect(span.startMs + span.durationMs).toBeLessThanOrEqual(report.samples[0].captureMs);
  }
  for (const secret of ["almond milk", "synthetic-device", "com.example.capture", "/sdcard/", dir])
    expect(JSON.stringify(report)).not.toContain(secret);
});

it("attributes a controlled device-dump delay to the dump stage", async () => {
  const { code, report } = await run({ rounds: 1, trace: true }, { CAPTURE_MODE: "slow-dump" });
  expect(code).toBe(0);
  expect(report.samples[0].spans.find((s: { stage: string }) => s.stage === "device_dump").durationMs)
    .toBeGreaterThanOrEqual(150);
});

it.each([
  ["zero-exit-error", "device_dump"], ["pull-error", "xml_transfer"],
])("retains failed stage timing without serializing raw errors: %s", async (mode, failedStage) => {
  const { code, report } = await run({ rounds: 1, trace: true }, { CAPTURE_MODE: mode });
  expect(code).toBe(1);
  expect(report.samples[0].outcome).toBe("incorrect");
  const failed = report.samples[0].spans.filter((s: { outcome: string }) => s.outcome === "error");
  expect(failed).toHaveLength(1);
  expect(failed[0].stage).toBe(failedStage);
  expect(failed[0].failureKind).toBe(mode === "pull-error" ? "exit" : "unknown");
  expect(failed[0].durationMs).toBeGreaterThan(0);
  expect(report.samples[0].spans.at(-1).stage).toBe("foreground");
  for (const secret of ["PRIVATE_TRANSPORT_ERROR", "synthetic-device", "almond milk", "/sdcard/"])
    expect(JSON.stringify(report)).not.toContain(secret);
});

it("reports cache misses/hits and ignores throwing diagnostic consumers", async () => {
  const probe = join(dir, "probe.mjs");
  await writeFile(probe, `
    import { dumpUiTree, setUiDumpDir } from ${JSON.stringify(resolve("src/adb/ui-tree.ts"))};
    import { invalidateCache } from ${JSON.stringify(resolve("src/adb/cache.ts"))};
    setUiDumpDir(${JSON.stringify(join(dir, "dumps"))});
    invalidateCache();
    const spans = [];
    const options = {
      serial: "synthetic-device", autoReconnect: false, ocrFallback: false,
      requireDumpSuccess: true,
      onCaptureSpan: span => { spans.push(span); throw Error("PRIVATE_SINK_ERROR"); },
    };
    const first = await dumpUiTree(options);
    const second = await dumpUiTree(options);
    console.log(JSON.stringify({ same: first === second, source: first.source, spans }));
  `);
  const { stdout } = await exec(process.execPath, ["--import", "tsx", probe], {
    timeout: 10000,
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`,
      CAPTURE_XML: resolve("tests/fixtures/capture.xml") },
  });
  const report = JSON.parse(stdout);
  expect(report.same).toBe(true);
  expect(report.source).toBe("uiautomator");
  expect(report.spans.filter((s: { stage: string }) => s.stage === "cache_lookup")
    .map((s: { cacheHit: boolean }) => s.cacheHit)).toEqual([false, true]);
  expect(report.spans.filter((s: { stage: string }) => s.stage === "device_dump")).toHaveLength(1);
  expect(stdout).not.toContain("PRIVATE_SINK_ERROR");
});

it("fails a wrong field value without retaining selectors or page content", async () => {
  const { code, report } = await run({ assertions: [
    { resourceId: "com.example.capture:id/query", text: "WRONG_PRIVATE_EXPECTATION" },
  ] });
  expect(code).toBe(1);
  expect(report.status).toBe("fail");
  expect(report.samples.map((s: { outcome: string }) => s.outcome)).toEqual(["incorrect", "incorrect"]);
  expect(report.summary.failedMs).toBeGreaterThan(0);
  const json = JSON.stringify(report);
  for (const privateValue of ["WRONG_PRIVATE_EXPECTATION", "almond milk", "synthetic-device", "com.example.capture"])
    expect(json).not.toContain(privateValue);
});

it("rejects an empty hierarchy without attempting screenshot/OCR fallback", async () => {
  const xml = join(dir, "empty.xml");
  await writeFile(xml, '<?xml version="1.0"?><hierarchy/>');
  const { code, report } = await run({ rounds: 1 }, { CAPTURE_XML: xml });
  expect(code).toBe(1);
  expect(report.samples[0].outcome).toBe("incorrect");
  await expect(access(join(dir, "forbidden"))).rejects.toThrow();
});

it("kills hung capture subprocesses and stops instead of starting overlapping remote dumps", async () => {
  const { code, report } = await run({ rounds: 2, desiredMs: 1000, observationMs: 3000 },
    { CAPTURE_MODE: "hang" });
  expect(code).toBe(1);
  expect(report.completedRounds).toBe(1);
  expect(report.samples[0].outcome).toBe("timeout");
  expect(report.summary.timeouts).toBe(1);
  expect(report.samples[0].failureKind).toBe("timeout");
  expect(report.summary.medianMs).toBeNull();
  await expect(access(join(dir, "started"))).resolves.toBeUndefined();
  await new Promise(resolve => setTimeout(resolve, 2000));
  await expect(access(join(dir, "orphan"))).rejects.toThrow();
});

it("preserves completed stage spans when a later stage exceeds the hard deadline", async () => {
  const { code, report } = await run({ rounds: 2, trace: true, observationMs: 5000 },
    { CAPTURE_MODE: "hang-foreground" });
  expect(code).toBe(1);
  expect(report.completedRounds).toBe(1);
  expect(report.samples[0].outcome).toBe("timeout");
  expect(report.samples[0].spans.map((s: { stage: string }) => s.stage)).toEqual([
    "device_dump", "xml_transfer", "xml_read", "xml_parse",
  ]);
  expect(report.samples[0].spans.every((s: { outcome: string }) => s.outcome === "ok")).toBe(true);
  expect(report.samples[0]).not.toHaveProperty("captureMs");
  expect(report.samples[0].traceComplete).toBe(false);
  expect(report.samples[0].spansTruncated).toBe(false);
  for (const secret of ["almond milk", "synthetic-device", "com.example.capture", dir])
    expect(JSON.stringify(report)).not.toContain(secret);
});

it("does not accept a stale XML pull after a zero-exit UIAutomator error", async () => {
  const { code, report } = await run({ rounds: 1 }, { CAPTURE_MODE: "zero-exit-error" });
  expect(code).toBe(1);
  expect(report.samples[0].outcome).toBe("incorrect");
  await expect(access(join(dir, "forbidden"))).rejects.toThrow();
});

it("bounds the whole run even when the observation deadline is longer", async () => {
  const { code, report } = await run({ budgetMs: 100, rounds: 20 });
  expect(code).toBe(1);
  expect(report.budgetExhausted).toBe(true);
  expect(report.samples).toHaveLength(1);
  expect(report.samples[0].outcome).toBe("timeout");
  expect(report.durationMs).toBeLessThan(2000);
});

it("fails the desired latency target even if field correctness passes", async () => {
  const { code, report } = await run({ rounds: 1, desiredMs: 1 });
  expect(code).toBe(1);
  expect(report.samples[0].outcome).toBe("ok");
  expect(report.samples[0].captureMs).toBeGreaterThan(1);
});

it.each([
  { assertions: [{ resourceId: "com.example.capture:id/query", text: "almond milk",
      bounds: { left: 1, top: 2, right: 3, bottom: 4 } }] },
  { foregroundPackage: "wrong.package" },
])("rejects wrong bounds or foreground", async overrides => {
  const { code, report } = await run({ rounds: 1, ...overrides });
  expect(code).toBe(1);
  expect(report.samples[0].outcome).toBe("incorrect");
});

it.each([
  ["Mandel &#129371;", "Mandel 🥛"],
  ["Mandel &#x1F95B;", "Mandel 🥛"],
  ["literal &amp;#129371; &amp;lt;", "literal &#129371; &lt;"],
  ["invalid &#0; &#xD800; &#1114112;", "invalid &#0; &#xD800; &#1114112;"],
])("decodes XML character references exactly once through the real capture path: %s", async (encoded, expected) => {
  const xml = join(dir, "encoded.xml");
  const fixture = await readFile(resolve("tests/fixtures/capture.xml"), "utf8");
  await writeFile(xml, fixture.replace('text="almond milk"', `text="${encoded}"`));
  const { code, report } = await run({ rounds: 1, assertions: [
    { resourceId: "com.example.capture:id/query", text: expected },
  ] }, { CAPTURE_XML: xml });
  expect(code).toBe(0);
  expect(report.samples[0].outcome).toBe("ok");
});

it("rejects invalid configuration before touching ADB", async () => {
  const { code, report } = await run({ rounds: 0 });
  expect(code).toBe(2);
  expect(report.status).toBe("invalid_config");
});

it.each(["hang", "hang-foreground"])("preserves partial trace and cleans up on interruption: %s", async mode => {
  const path = join(dir, "config.json");
  await writeFile(path, JSON.stringify({ ...config, rounds: 20, trace: true, observationMs: 15000 }));
  const child = spawn(process.execPath, ["scripts/capture-benchmark.mjs", path], {
    env: { ...process.env, PI_DROID_CAPTURE_TMPDIR: dir, PATH: `${dir}:${process.env.PATH}`,
      ANDROID_SERIAL: "synthetic-device", CAPTURE_MODE: mode,
      CAPTURE_XML: resolve("tests/fixtures/capture.xml"),
      CAPTURE_STARTED: join(dir, "started"), CAPTURE_ORPHAN: join(dir, "orphan") },
    stdio: ["ignore", "pipe", "ignore"],
  });
  let stdout = "";
  child.stdout.on("data", data => { stdout += data; });
  const closed = new Promise(resolve => child.on("close", resolve));
  try {
    let started = false;
    for (let i = 0; i < 100; i++) {
      try { await access(join(dir, "started")); started = true; break; } catch { /* poll */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    expect(started).toBe(true);
    child.kill("SIGTERM");
    await closed;
    const report = JSON.parse(stdout || "{}");
    expect(report.samples?.[0]?.outcome).toBe("cancelled");
    expect(report.samples[0].failureKind).toBe("cancelled");
    expect(report.completedRounds).toBe(1);
    expect(report.samples[0].traceComplete).toBe(false);
    expect(report.samples[0].spans.map((s: { stage: string }) => s.stage)).toEqual(
      mode === "hang" ? [] : ["device_dump", "xml_transfer", "xml_read", "xml_parse"]);
    await new Promise(resolve => setTimeout(resolve, 3700));
    await expect(access(join(dir, "orphan"))).rejects.toThrow();
  } finally {
    // Even a failed assertion must let the CLI kill its detached worker group.
    child.kill("SIGTERM");
    await closed;
  }
});
