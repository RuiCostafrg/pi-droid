#!/usr/bin/env node
// Actual fresh Pi CLI check; raw event payloads remain private in temporary storage.
import { execFile } from "node:child_process";
import { access, readFile, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { adbShell, getForegroundPackage } from "../src/adb/exec.ts";
if (process.env.PI_DROID_PNG_CHECK !== "1" || !process.env.ANDROID_SERIAL || !process.argv[2]) throw Error("Opt-in required");
try { await access(process.argv[2]); throw Error("Existing report"); }
catch (e) { if (e.code !== "ENOENT") throw e; }
const options = { serial: process.env.ANDROID_SERIAL, exactSerial: true, autoReconnect: false };
const files = ["dist/index.js", "dist/tools/device.js", "dist/adb/exec.js", "dist/adb/screenshot.js", "dist/adb/annotate.js", "dist/adb/capture-timing.js"];
async function hashes() {
  return Object.fromEntries(await Promise.all(files.map(async f => [f, createHash("sha256").update(await readFile(f)).digest("hex")])));
}
const report = { kind: "fresh-pi-cli-loaded-png-check", status: "fail",
  driverHash: createHash("sha256").update(await readFile(new URL(import.meta.url))).digest("hex"),
  session: "fresh nonpersistent Pi JSON CLI; explicit dist/index.js only; MCP disabled",
  buildHashes: await hashes(), tools: [], checks: {},
  limits: ["Tool execute clock, not source spans/model latency; diagnostics default-off.",
    "Parent active session is not reloaded. Raw JSONL stays private in temporary storage. Sequential registered calls; controlled source tests cover concurrent frame ownership."] };
const originalIme = await adbShell("settings get secure default_input_method", options);
try {
  const { stdout, stderr } = await new Promise((resolve, reject) => {
    const child = execFile("pi", ["--mode", "json", "--no-session", "--no-extensions",
    "-e", "./dist/index.js", "--no-mcp", "--no-skills", "--no-context-files", "--tools", "android_screenshot,android_look",
    "--provider", process.env.PI_PROVIDER ?? "openai", "--model", process.env.PI_MODEL ?? "gpt-6.1-sol", "--thinking", "minimal",
    'Call android_screenshot exactly once with include_base64:true, then android_look exactly once with include_image:true and all_elements:true. Do not call any other tools or retry. Do not repeat base64 data in your final response. Verify foreground com.android.settings and exact Termux and OPEN labels in the numbered index. Briefly report pass/fail.'],
    { timeout: 180000, maxBuffer: 8 * 1024 * 1024, env: process.env }, (error, stdout, stderr) => {
      if (error) reject(Object.assign(error, { stdout, stderr })); else resolve({ stdout, stderr });
    });
    child.stdin.end(); // JSON CLI consumes piped stdin before processing its prompt.
  });
  const dir = await mkdtemp(join(tmpdir(), "png-loaded-private-"));
  await writeFile(join(dir, "events.jsonl"), stdout, { mode: 0o600 });
  await writeFile(join(dir, "stderr.txt"), stderr, { mode: 0o600 });
  const events = stdout.split("\n").filter(Boolean).map(line => JSON.parse(line));
  const starts = events.filter(e => e.type === "tool_execution_start");
  const ends = events.filter(e => e.type === "tool_execution_end");
  const end = ends[1];
  const shot = ends[0];
  const shotResult = JSON.parse(shot?.result?.content?.find(c => c.type === 'text')?.text ?? '{}');
  const validPng = data => { const b=Buffer.from(data ?? '', 'base64'); return b.length>=24 && b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && b.readUInt32BE(16)===1080 && b.readUInt32BE(20)===2340; };
  const payload = end?.result?.content?.find(c => c.type === "text")?.text;
  const result = payload ? JSON.parse(payload) : {};
  report.tools = ends.map(e => ({ tool: e.toolName, outcome: e.isError ? "error" : "ok", durationMs: e.durationMs }));
  report.checks = {
    exactlyTwoMatchingCalls: starts.length === 2 && ends.length === 2 && starts.every((s,i)=>s.toolCallId===ends[i].toolCallId) &&
      starts[0].toolName === "android_screenshot" && starts[0].args.include_base64 === true &&
      starts[1].toolName === "android_look" && starts[1].args.include_image === true && starts[1].args.all_elements === true,
    validImages: shot?.isError === false && shotResult.width===1080 && shotResult.height===2340 && validPng(shotResult.base64) && validPng(result.image_base64),
    noToolError: end?.isError === false && !result.error,
    nativeTitleAndOpen: result.foreground === "com.android.settings" && result.elements > 0 &&
      /\[\d+\] \w+: "Termux" → tap\(/.test(result.index) && /\[\d+\] \w+: "OPEN" → tap\(/.test(result.index),
    agentSettledNotAborted: events.some(e => e.type === "agent_settled" && e.aborted === false),
    buildUnchanged: JSON.stringify(report.buildHashes) === JSON.stringify(await hashes()),
  };
  if (Object.values(report.checks).every(v => v === true)) report.status = "pass";
} catch (error) {
  const dir = await mkdtemp(join(tmpdir(), "png-loaded-private-"));
  await writeFile(join(dir, "failure.txt"), JSON.stringify({ message: error.message, code: error.code, killed: error.killed, signal: error.signal, stderr: error.stderr, stdout: error.stdout }), { mode: 0o600 });
  report.failureCheckpoint = error.code ? "cli-process" : "event-validation";
  report.status = "fail";
}
finally {
  report.imeUnchanged = await adbShell("settings get secure default_input_method", options) === originalIme;
  await adbShell("am start -W -n com.termux/.app.TermuxActivity", options);
  report.termuxRestored = await getForegroundPackage(options) === "com.termux";
  if (!report.imeUnchanged || !report.termuxRestored) report.status = "fail";
  await writeFile(process.argv[2], JSON.stringify(report, null, 2), { flag: "wx", mode: 0o600 });
}
console.log(JSON.stringify(report));
process.exitCode = report.status === "pass" ? 0 : 1;
