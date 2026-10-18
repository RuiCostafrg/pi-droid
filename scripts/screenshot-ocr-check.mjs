#!/usr/bin/env node
// Opt-in read-only fixture check. Frozen across its paired measurements.
import { access, readFile, writeFile, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { takeScreenshot, screenshotBase64 } from "../src/adb/screenshot.ts";
import { runOcrOnCurrentScreen } from "../src/adb/ocr.ts";
import { dumpUiTree } from "../src/adb/ui-tree.ts";
import { adbShell, getForegroundPackage } from "../src/adb/exec.ts";
if (process.env.PI_DROID_SCREEN_OCR_CHECK !== "1" || !process.env.ANDROID_SERIAL || !process.argv[2])
  throw Error("Explicit opt-in, current transport and new report required");
try { await access(process.argv[2]); throw Error("Existing report"); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const options = { serial: process.env.ANDROID_SERIAL, exactSerial: true, autoReconnect: false, timeout: 15000 };
const samples = [];
const report = { schemaVersion: 1, kind: "screenshot-ocr-fixture", status: "fail", samples,
  driverHash: createHash("sha256").update(await readFile(new URL(import.meta.url))).digest("hex") };
const hash = createHash("sha256");
for (const name of ["screenshot", "ocr", "exec", "capture-timing"])
  hash.update(name).update(await readFile(new URL(`../src/adb/${name}.ts`, import.meta.url)));
report.sourceHash = hash.digest("hex");
const originalIme = await adbShell("settings get secure default_input_method", options);
try {
  const tree = await dumpUiTree({ ...options, skipCache: true, ocrFallback: false, throwOnError: true });
  if (tree.foregroundPackage !== "com.android.settings" || !tree.elements.some(e => e.text === "Termux") ||
      !tree.elements.some(e => e.text === "OPEN")) throw Error("fixture");
  for (let round = 1; round <= 3; round++) {
    for (const api of ["screenshot", "base64", "ocr"]) {
      const spans = [];
      const start = performance.now();
      const sample = { round, api, outcome: "error", spans, spansTruncated: false, traceComplete: false };
      samples.push(sample);
      try {
        const traced = { ...options, onCaptureSpan: span => {
          if (spans.length < 128) spans.push(span); else sample.spansTruncated = true;
        } };
        if (api === "screenshot") {
          const result = await takeScreenshot({ ...traced, includeBase64: true });
          try {
            if (result.width !== 1080 || result.height !== 2340 ||
                Buffer.from(result.base64, "base64").subarray(1, 4).toString() !== "PNG") throw Error("image");
          } finally { await unlink(result.path).catch(() => {}); }
        } else if (api === "base64") {
          const data = await screenshotBase64(traced);
          if (Buffer.from(data, "base64").subarray(1, 4).toString() !== "PNG") throw Error("image");
        } else {
          const result = await runOcrOnCurrentScreen(traced);
          try { if (!result.elements.some(e => e.text === "Termux")) throw Error("ocr"); }
          finally { await unlink(result.screenshotPath).catch(() => {}); }
        }
        sample.outcome = "ok";
      } finally {
        sample.ms = performance.now() - start;
        sample.traceComplete = !sample.spansTruncated; // synchronous completed sink; not IPC
      }
    }
  }
  report.status = "pass";
} catch { report.status = "fail"; }
finally {
  report.imeUnchanged = await adbShell("settings get secure default_input_method", options) === originalIme;
  await adbShell("am start -W -n com.termux/.app.TermuxActivity", options);
  report.termuxRestored = await getForegroundPackage(options) === "com.termux";
  if (!report.imeUnchanged || !report.termuxRestored) report.status = "fail";
  await writeFile(process.argv[2], JSON.stringify(report, null, 2), { flag: "wx", mode: 0o600 });
}
console.log(JSON.stringify({ status: report.status, samples: samples.map(({ spans, ...sample }) => ({ ...sample, spanCount: spans.length })) }));
process.exitCode = report.status === "pass" ? 0 : 1;
