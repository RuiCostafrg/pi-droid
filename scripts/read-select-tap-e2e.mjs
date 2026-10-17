#!/usr/bin/env node
// Opt-in, fixed TEST draft only. Freeze this driver before the old-path baseline.
import { readFile, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { adbShell, getForegroundPackage } from "../src/adb/exec.ts";
import { dumpUiTree } from "../src/adb/ui-tree.ts";
import { tap, typeText, keyEvent } from "../src/adb/input.ts";
import { launchApp } from "../src/adb/app.ts";

const [mode, output] = process.argv.slice(2);
if (process.env.PI_DROID_SELECT_TAP_E2E !== "1" || !process.env.ANDROID_SERIAL ||
    !["before", "after"].includes(mode) || !output) {
  console.error("PI_DROID_SELECT_TAP_E2E=1 ANDROID_SERIAL=current node --import tsx scripts/read-select-tap-e2e.mjs before|after NEW-report.json");
  process.exit(2);
}
try { await access(output); throw Error("Refusing existing output"); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const hash = data => createHash("sha256").update(data).digest("hex");
const sources = {};
for (const path of ["src/adb/automation.ts", "src/adb/ui-tree.ts", "src/adb/input.ts", "src/adb/read-select-tap.ts"]) {
  try { sources[path] = hash(await readFile(new URL(`../${path}`, import.meta.url))); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const bounded = mode === "after" ? (await import("../src/adb/read-select-tap.ts")).readSelectTap : undefined;
const options = { serial: process.env.ANDROID_SERIAL, exactSerial: true, autoReconnect: false, timeout: 10000 };
const pkg = "app.forge.gym";
const fixtureTitle = "E2E Lower v1 source-after5";
const select = elements => elements.filter(e => e.className.endsWith("EditText") &&
  e.center.x === 540 && e.center.y > 100 && e.center.y < 800 && e.text === fixtureTitle);
const report = { schemaVersion: 1, kind: "read-select-tap-e2e", mode,
  startedAt: new Date().toISOString(), harnessHash: hash(await readFile(new URL(import.meta.url))),
  sources, status: "fail", samples: [], cleanup: {} };
const begin = performance.now();
let originalIme;
let fixtureVerified = false;
const settle = () => new Promise(resolve => setTimeout(resolve, 500));
async function tree() {
  const result = await dumpUiTree({ ...options, skipCache: true, ocrFallback: false, requireDumpSuccess: true });
  if (result.foregroundPackage !== pkg) throw Error("fixture foreground");
  return result;
}
function titleField(tree) {
  const matches = tree.elements.filter(e => e.className.endsWith("EditText") && e.center.x === 540 && e.center.y > 100 && e.center.y < 800);
  if (matches.length !== 1) throw Error("ambiguous fixture");
  return matches[0];
}
try {
  originalIme = await adbShell("settings get secure default_input_method", options);
  if (!/^[A-Za-z0-9_.]+\/[A-Za-z0-9_.]+$/.test(originalIme)) throw Error("ime");
  await launchApp(pkg, options);
  await new Promise(resolve => setTimeout(resolve, 3000));
  if (titleField(await tree()).text !== fixtureTitle) throw Error("wrong test draft");
  fixtureVerified = true;
  await adbShell("ime set com.android.adbkeyboard/.AdbIME", options);
  for (let round = 0; round < 4; round++) {
    if (titleField(await tree()).text !== fixtureTitle) throw Error("unrestored fixture");
    const spans = [];
    const onCaptureSpan = span => spans.push(span);
    const start = performance.now();
    let elapsedMs;
    let correct = false;
    try {
      if (bounded) {
        await bounded(select, { ...options, expectedPackage: pkg, onCaptureSpan });
      } else {
        // Existing inspect-then-click pattern: choose from one fresh tree, then
        // re-observe and verify the chosen control immediately before tapping.
        const first = await dumpUiTree({ ...options, skipCache: true, ocrFallback: false,
          requireDumpSuccess: true, onCaptureSpan });
        const candidates = select(first.elements);
        if (first.foregroundPackage !== pkg || candidates.length !== 1) throw Error("selection");
        const chosen = candidates[0];
        const second = await dumpUiTree({ ...options, skipCache: true, ocrFallback: false,
          requireDumpSuccess: true, onCaptureSpan });
        const verified = select(second.elements);
        if (second.foregroundPackage !== pkg || verified.length !== 1 ||
            verified[0].center.x !== chosen.center.x || verified[0].center.y !== chosen.center.y)
          throw Error("moved control");
        await tap(verified[0].center.x, verified[0].center.y, options);
      }
      elapsedMs = performance.now() - start;
      await settle();
      const probe = `E2E bounded selection ${round + 1}`;
      await typeText(probe, { ...options, clear: true });
      await settle();
      correct = titleField(await tree()).text === probe;
      if (!correct) throw Error("readback");
      // Restore outside the measured operation; focus is still the title field.
      await typeText(fixtureTitle, { ...options, clear: true });
      await keyEvent("KEYCODE_BACK", options);
      await settle();
      if (titleField(await tree()).text !== fixtureTitle) throw Error("restore");
    } finally {
      report.samples.push({ round: round + 1, operationMs: elapsedMs ?? performance.now() - start,
        exactReadback: correct, hierarchyAttempts: spans.filter(s => s.stage === "device_dump").length,
        captureFailures: spans.filter(s => s.outcome === "error").length });
    }
  }
  report.status = "pass";
} catch {
  report.status = "fail";
} finally {
  if (fixtureVerified) {
    try {
      const field = titleField(await tree());
      if (field.text !== fixtureTitle) {
        await tap(field.center.x, field.center.y, options);
        await typeText(fixtureTitle, { ...options, clear: true });
        await keyEvent("KEYCODE_BACK", options);
      }
      report.cleanup.fixtureTitleRestored = titleField(await tree()).text === fixtureTitle;
    } catch { report.cleanup.fixtureTitleRestored = false; }
  }
  if (originalIme && /^[A-Za-z0-9_.]+\/[A-Za-z0-9_.]+$/.test(originalIme)) {
    try {
      await adbShell(`ime set ${originalIme}`, options);
      report.cleanup.originalImeRestored = await adbShell("settings get secure default_input_method", options) === originalIme;
    } catch { report.cleanup.originalImeRestored = false; }
  }
  try {
    await launchApp("com.termux", options);
    report.cleanup.termuxRestored = await getForegroundPackage(options) === "com.termux";
  } catch { report.cleanup.termuxRestored = false; }
  if (!report.cleanup.fixtureTitleRestored || !report.cleanup.originalImeRestored || !report.cleanup.termuxRestored) report.status = "fail";
  report.durationMs = performance.now() - begin;
  await writeFile(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
}
console.log(JSON.stringify(report));
process.exitCode = report.status === "pass" ? 0 : 1;
