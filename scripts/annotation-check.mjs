#!/usr/bin/env node
// Read-only source fixture; freeze this driver across the annotation pair.
import { access, readFile, writeFile, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { annotatedScreenshot } from "../src/adb/annotate.ts";
import { dumpUiTree } from "../src/adb/ui-tree.ts";
import { adbShell, getForegroundPackage } from "../src/adb/exec.ts";
if (process.env.PI_DROID_ANNOTATION_CHECK !== "1" || !process.env.ANDROID_SERIAL || !process.argv[2])
  throw Error("Explicit opt-in, current transport and new report required");
try { await access(process.argv[2]); throw Error("Existing report"); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const options = { serial: process.env.ANDROID_SERIAL, exactSerial: true, autoReconnect: false, timeout: 15000 };
const report = { schemaVersion: 1, kind: "annotation-fixture", status: "fail", samples: [],
  driverHash: createHash("sha256").update(await readFile(new URL(import.meta.url))).digest("hex") };
const hash = createHash("sha256");
for (const name of ["annotate", "screenshot", "ui-tree", "ocr", "cache", "exec", "capture-timing"])
  hash.update(name).update(await readFile(new URL(`../src/adb/${name}.ts`, import.meta.url)));
report.sourceHash = hash.digest("hex");
const originalIme = await adbShell("settings get secure default_input_method", options);
try {
  const tree = await dumpUiTree({ ...options, skipCache: true, ocrFallback: false, throwOnError: true });
  if (tree.foregroundPackage !== "com.android.settings" || !tree.elements.some(e => e.text === "Termux") ||
      !tree.elements.some(e => e.text === "OPEN")) throw Error("fixture");
  for (let round = 1; round <= 3; round++) {
    for (const allElements of [false, true]) {
      const sample = { round, allElements, includeBase64: allElements, outcome: "error",
        spans: [], spansTruncated: false, traceComplete: false };
      report.samples.push(sample);
      const start = performance.now();
      try {
        const result = await annotatedScreenshot({ ...options, skipCache: true,
          includeBase64: allElements, allElements, onCaptureSpan: span => {
            if (sample.spans.length < 128) sample.spans.push(span); else sample.spansTruncated = true;
          } });
        try {
          if (result.foregroundPackage !== "com.android.settings" || result.count !== result.elements.length ||
              !result.elements.some(e => e.displayText === "OPEN") ||
              (allElements && !result.elements.some(e => e.displayText === "Termux")) ||
              !result.textIndex.startsWith("Screen: com.android.settings\n") ||
              !result.elements.every((e, i) => e.label === i && result.textIndex.includes(
                `[${i}] ${e.type}: \"${e.displayText}\" → tap(${e.center.x}, ${e.center.y})`)) ||
              (allElements ? Buffer.from(result.screenshotBase64 ?? "", "base64").subarray(1, 4).toString() !== "PNG" :
                result.screenshotBase64 !== undefined)) throw Error("result");
          sample.count = result.count;
          sample.outcome = "ok";
        } finally { await unlink(result.screenshotPath).catch(() => {}); }
      } finally {
        sample.ms = performance.now() - start;
        sample.traceComplete = !sample.spansTruncated; // completed synchronous sink, NOT IPC/tool completeness
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
console.log(JSON.stringify({ status: report.status, samples: report.samples.map(({ spans, ...s }) => ({ ...s, spanCount: spans.length })) }));
process.exitCode = report.status === "pass" ? 0 : 1;
