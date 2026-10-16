#!/usr/bin/env node
// Explicit opt-in development CLI. No taps, navigation, IME changes or retries.
import { fork } from "node:child_process";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

const defaults = { rounds: 20, desiredMs: 5000, observationMs: 10000, budgetMs: 120000 };
let interrupted = false;
let killActive;
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
  interrupted = true;
  killActive?.();
});

function validate(input) {
  const c = { ...defaults, ...input };
  if (c.trace !== undefined && typeof c.trace !== "boolean") throw Error("config");
  for (const [key, max] of [["rounds", 100], ["desiredMs", 60000],
    ["observationMs", 60000], ["budgetMs", 600000]]) {
    if (!Number.isInteger(c[key]) || c[key] < 1 || c[key] > max) throw Error("config");
  }
  if (c.desiredMs > c.observationMs || typeof c.foregroundPackage !== "string" ||
      !c.foregroundPackage || !Array.isArray(c.assertions) ||
      c.assertions.length < 1 || c.assertions.length > 100) throw Error("config");
  for (const a of c.assertions) {
    if (!a || typeof a.resourceId !== "string" || !a.resourceId ||
        typeof a.text !== "string" ||
        (a.className !== undefined && typeof a.className !== "string")) throw Error("config");
    if (a.bounds && (!["left", "top", "right", "bottom"].every(
      key => Number.isInteger(a.bounds[key]) && a.bounds[key] >= 0) ||
      a.bounds.left >= a.bounds.right || a.bounds.top >= a.bounds.bottom)) throw Error("config");
  }
  return c;
}

// Defense in depth at the IPC/export boundary: fixed fields, finite timings,
// bounded event count. Never spread a diagnostic payload into the report.
const stages = new Set(["cache_lookup", "device_dump", "xml_transfer", "xml_read",
  "xml_parse", "foreground", "ocr_fallback"]);
const MAX_SPANS = 128;
const failureKinds = new Set(["timeout", "cancelled", "exit", "signal", "spawn", "buffer", "unknown"]);
function safeSpan(span) {
  if (!span || !stages.has(span.stage) || !["ok", "error"].includes(span.outcome) ||
      !Number.isFinite(span.startMs) || span.startMs < 0 ||
      !Number.isFinite(span.durationMs) || span.durationMs < 0) return null;
  return { stage: span.stage, startMs: span.startMs, durationMs: span.durationMs,
    outcome: span.outcome,
    ...(span.outcome === "error" && failureKinds.has(span.failureKind)
      ? { failureKind: span.failureKind } : {}),
    ...(span.stage === "cache_lookup" && typeof span.cacheHit === "boolean"
      ? { cacheHit: span.cacheHit } : {}) };
}

async function capture(config, serial, limitMs) {
  const start = performance.now();
  const directory = await mkdtemp(join(process.env.PI_DROID_CAPTURE_TMPDIR ?? tmpdir(), "pi-droid-capture-"));
  try {
    return await new Promise(resolve => {
      const child = fork(new URL("./capture-worker.mjs", import.meta.url), [], {
        execArgv: ["--import", "tsx"], detached: true,
        stdio: ["ignore", "ignore", "ignore", "ipc"],
      });
      let result;
      let workerCompleted = false;
      const spans = [];
      let spansTruncated = false;
      let expired = false;
      // Kill the entire local worker/ADB process group, not just a Promise.
      killActive = () => {
        try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
      };
      const timer = setTimeout(() => {
        expired = true;
        killActive?.();
      }, Math.max(1, limitMs - (performance.now() - start)));
      child.on("message", message => {
        if (message?.type === "span" && config.trace) {
          const span = safeSpan(message.span);
          if (!span) return;
          if (spans.length < MAX_SPANS) spans.push(span);
          else spansTruncated = true;
        } else if (message?.type === "result") {
          workerCompleted = true;
          result = {
            outcome: ["ok", "incorrect", "error"].includes(message.outcome) ? message.outcome : "error",
            ...(message.outcome === "error" && failureKinds.has(message.failureKind)
              ? { failureKind: message.failureKind } : {}),
            ...(Number.isFinite(message.captureMs) && message.captureMs >= 0
              ? { captureMs: message.captureMs } : {}),
          };
        }
      });
      child.on("error", () => { result = { outcome: "error" }; });
      child.on("close", () => {
        clearTimeout(timer);
        killActive = undefined;
        resolve({ outcome: interrupted ? "cancelled" : expired ? "timeout" : result?.outcome ?? "error",
          ms: performance.now() - start,
          ...(interrupted ? { failureKind: "cancelled" } : expired ? { failureKind: "timeout" } :
            result?.failureKind ? { failureKind: result.failureKind } : {}),
          ...(result?.captureMs !== undefined ? { captureMs: result.captureMs } : {}),
          ...(config.trace ? { spans, spansTruncated,
            traceComplete: workerCompleted && !expired && !interrupted && !spansTruncated } : {}) });
      });
      child.send({ config, directory, serial }, error => {
        if (error) { result = { outcome: "error" }; killActive?.(); }
      });
      if (interrupted) killActive();
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function latency(values) {
  const sorted = values.toSorted((a, b) => a - b);
  const n = sorted.length;
  return {
    minMs: n ? sorted[0] : null,
    medianMs: n ? (sorted[Math.floor((n - 1) / 2)] + sorted[Math.floor(n / 2)]) / 2 : null,
    p95Ms: n ? sorted[Math.ceil(n * .95) - 1] : null,
    maxMs: n ? sorted[n - 1] : null,
    totalMs: sorted.reduce((sum, ms) => sum + ms, 0),
  };
}

function summary(samples) {
  const ok = samples.filter(s => s.outcome === "ok");
  return {
    attempts: samples.length, successes: ok.length, failures: samples.length - ok.length,
    timeouts: samples.filter(s => s.outcome === "timeout").length,
    wallTotalMs: samples.reduce((sum, s) => sum + s.ms, 0),
    failedMs: samples.filter(s => s.outcome !== "ok").reduce((sum, s) => sum + s.ms, 0),
    ...latency(ok.map(s => s.ms)),
    capture: latency(ok.map(s => s.captureMs)),
  };
}

async function main() {
  let config;
  const serial = process.env.ANDROID_SERIAL;
  try {
    if (process.argv.length !== 3 || !serial?.trim() || process.platform === "win32") throw Error("config");
    config = validate(JSON.parse(await readFile(process.argv[2], "utf8")));
  } catch {
    console.log(JSON.stringify({ schemaVersion: 1, status: "invalid_config" }));
    process.exitCode = 2;
    return;
  }
  const start = performance.now();
  const samples = [];
  let budgetExhausted = false;
  for (let round = 1; round <= config.rounds; round++) {
    const remaining = config.budgetMs - (performance.now() - start);
    if (interrupted) break;
    if (remaining <= 0) { budgetExhausted = true; break; }
    const sample = await capture(config, serial, Math.min(config.observationMs, remaining));
    samples.push({ round, ...sample });
    if (performance.now() - start >= config.budgetMs) { budgetExhausted = true; break; }
    // A killed ADB client does not prove device-side UIAutomator has stopped.
    // Do not launch another dump into that uncertain state.
    if (sample.outcome === "timeout" || interrupted) break;
  }
  const stats = summary(samples);
  const passed = !interrupted && !budgetExhausted && samples.length === config.rounds &&
    stats.failures === 0 && samples.every(s => s.captureMs <= config.desiredMs);
  console.log(JSON.stringify({
    schemaVersion: 1, status: passed ? "pass" : "fail",
    requestedRounds: config.rounds, completedRounds: samples.length,
    desiredMs: config.desiredMs, observationMs: config.observationMs,
    budgetMs: config.budgetMs, budgetExhausted, cancelled: interrupted,
    durationMs: performance.now() - start, samples, summary: stats,
    notes: [
      "Fresh source-level dumpUiTree captures; cache reads, OCR and reconnect disabled.",
      "ms includes worker startup and capture; captureMs measures dumpUiTree only.",
      "Hard deadlines kill local worker/ADB subprocesses; device-side UIAutomator may outlive ADB.",
      "Cleanup is best effort outside deadlines. Production remote XML path is unchanged.",
      "Success latency statistics exclude failures; all attempts and failed elapsed time are retained.",
      "Few samples do not establish a population p95. No selectors, content, serials or errors retained.",
    ],
  }));
  process.exitCode = passed ? 0 : 1;
}
try { await main(); } catch {
  console.log(JSON.stringify({ schemaVersion: 1, status: "error" }));
  process.exitCode = 1;
}
