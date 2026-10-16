#!/usr/bin/env node
// Narrow opt-in regression. Reuses ONLY the explicitly named existing test draft.
import { writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { adbShell, getForegroundPackage } from "../src/adb/exec.ts";
import { typeText, tap, keyEvent } from "../src/adb/input.ts";
import { dumpUiTree } from "../src/adb/ui-tree.ts";
import { launchApp } from "../src/adb/app.ts";
if (process.env.PI_DROID_INPUT_E2E !== "1" || !process.env.ANDROID_SERIAL || !process.argv[2]) {
  console.error("PI_DROID_INPUT_E2E=1 ANDROID_SERIAL=current node --import tsx scripts/input-replacement-e2e.mjs new-report.json");
  process.exit(2);
}
const fixtureTitle = "E2E Lower v1 source-after5";
const options = { serial: process.env.ANDROID_SERIAL, exactSerial: true, autoReconnect: false, timeout: 15000 };
const report = { kind: "input-replacement-e2e", schemaVersion: 1, startedAt: new Date().toISOString(),
  sourceHash: createHash("sha256").update(await readFile(new URL("../src/adb/input.ts", import.meta.url))).digest("hex"),
  status: "fail", samples: [], cleanup: {} };
const start = performance.now();
let originalIme;
let fixtureVerified = false;
const settle = () => new Promise(resolve => setTimeout(resolve, 500));
async function field() {
  const tree = await dumpUiTree({ ...options, skipCache: true, ocrFallback: false, requireDumpSuccess: true });
  if (tree.foregroundPackage !== "app.forge.gym") throw Error("foreground");
  const fields = tree.elements.filter(e => e.className.endsWith("EditText") && e.center.x === 540 && e.center.y > 100 && e.center.y < 800);
  if (fields.length !== 1) throw Error("field");
  return fields[0];
}
async function focus() {
  const target = await field();
  await tap(target.center.x, target.center.y, options);
  await settle();
}
try {
  originalIme = await adbShell("settings get secure default_input_method", options);
  if (!/^[A-Za-z0-9_.]+\/[A-Za-z0-9_.]+$/.test(originalIme)) throw Error("ime");
  await launchApp("app.forge.gym", options);
  if ((await field()).text !== fixtureTitle) throw Error("fixture");
  fixtureVerified = true;
  await adbShell("ime set com.android.adbkeyboard/.AdbIME", options);
  for (const [name, initial, replacement] of [
    ["title_prefix", "Lower session", "E2E replacement"],
    ["numeric_shorten", "12345", "8"],
    ["unicode", "Alte Übung", "Mandel 🥛"],
    ["empty", "erase me", ""],
  ]) {
    await focus();
    // Seed only: explicit known-good operation, never used by replacement under test.
    await adbShell("am broadcast -a ADB_CLEAR_TEXT", options);
    await typeText(initial, options);
    await settle();
    if ((await field()).text !== initial) throw Error("seed");
    const begin = performance.now();
    await typeText(replacement, { ...options, clear: true });
    const inputMs = performance.now() - begin;
    await settle();
    const actual = (await field()).text;
    report.samples.push({ name, inputMs, exactReadback: actual === replacement,
      expectedLength: replacement.length, actualLength: actual.length });
    await keyEvent("KEYCODE_BACK", options);
    await settle();
  }
  report.status = report.samples.every(sample => sample.exactReadback) ? "pass" : "fail";
} catch {
  report.status = "fail";
} finally {
  if (fixtureVerified) {
    try {
      await focus();
      await adbShell("am broadcast -a ADB_CLEAR_TEXT", options);
      await typeText(fixtureTitle, options);
      await settle();
      report.cleanup.fixtureTitleRestored = (await field()).text === fixtureTitle;
      await keyEvent("KEYCODE_BACK", options);
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
  if (!report.cleanup.fixtureTitleRestored || !report.cleanup.originalImeRestored || !report.cleanup.termuxRestored)
    report.status = "fail";
  report.durationMs = performance.now() - start;
  await writeFile(process.argv[2], JSON.stringify(report, null, 2), { flag: "wx", mode: 0o600 });
}
console.log(JSON.stringify(report));
process.exitCode = report.status === "pass" ? 0 : 1;
