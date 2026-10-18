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
  dir = await mkdtemp(join(tmpdir(), "image-boundary-"));
  await writeFile(join(dir, "adb"), `#!${process.execPath}
const fs = require("node:fs");
const args = process.argv.slice(2);
args.splice(0, 2);
const cmd = args.join(" ");
const mode = process.env.IMAGE_MODE;
if ((mode === "capture-error" && cmd.includes("screencap")) ||
    (mode === "transfer-error" && args[0] === "pull") ||
    (mode === "dimensions-error" && cmd.includes("wm size"))) {
  process.stderr.write("PRIVATE_ERROR"); process.exit(7);
}
if (args[0] === "pull") { if (mode !== "read-error") fs.writeFileSync(args[2], args[1].endsWith(".xml") ? "<hierarchy/>" : "PRIVATE_PNG"); }
else if (cmd.includes("uiautomator")) console.log("dumped");
else if (cmd.includes("mCurrentFocus")) console.log("mCurrentFocus=Window{x u0 com.example/.Main}");
else if (cmd === "shell wm size") console.log("Physical size: 1080x2340");
else if (!cmd.includes("screencap")) process.exit(8);
`);
  await chmod(join(dir, "adb"), 0o700);
  await writeFile(join(dir, "tesseract"), `#!${process.execPath}
const mode = process.env.IMAGE_MODE;
if ((mode === "availability-error" && process.argv[2] === "--version") ||
    (mode === "engine-error" && process.argv[2] !== "--version")) {
  process.stderr.write("PRIVATE_OCR_ERROR"); process.exit(7);
}
if (mode === "engine-timeout" && process.argv[2] !== "--version") setInterval(() => {}, 1000);
else if (process.argv[2] === "--version") console.log("version");
else console.log("level\\tpage_num\\tblock_num\\tpar_num\\tline_num\\tword_num\\tleft\\ttop\\twidth\\theight\\tconf\\ttext\\n5\\t1\\t1\\t1\\t1\\t1\\t100\\t200\\t120\\t30\\t95\\tPRIVATE_WORD");
`);
  await chmod(join(dir, "tesseract"), 0o700);
});
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

async function probe(mode = "screenshot") {
  const path = join(dir, "probe.mjs");
  await writeFile(path, `
import { takeScreenshot, screenshotBase64, setScreenshotDir } from ${JSON.stringify(resolve("src/adb/screenshot.ts"))};
import { runOcrOnCurrentScreen, runOcrOnImage } from ${JSON.stringify(resolve("src/adb/ocr.ts"))};
import { dumpUiTree, setUiDumpDir } from ${JSON.stringify(resolve("src/adb/ui-tree.ts"))};
setUiDumpDir(${JSON.stringify(join(dir, "xml"))});
setScreenshotDir(${JSON.stringify(join(dir, "images"))});
const spans = [];
const mode = process.env.IMAGE_MODE;
const options = { serial: "PRIVATE_SERIAL", exactSerial: true, autoReconnect: false, timeout: mode === "engine-timeout" ? 300 : 3000,
  includeBase64: true, onCaptureSpan: mode.endsWith("disabled") ? undefined : span => {
    spans.push(span); if (mode.includes("throwing")) throw Error("PRIVATE_SINK");
  } };
let result, failure;
try {
  if (mode === "fallback") {
    const tree = await dumpUiTree({ ...options, skipCache: true });
    result = { valid: tree.source === "ocr" && tree.elements.length === 1 };
  } else if (["availability-error", "engine-error", "engine-timeout", "cached-available", "image-only", "disabled"].includes(mode)) {
    if (mode === "cached-available") await runOcrOnImage("PRIVATE_PATH", options);
    const ocr = await runOcrOnImage("PRIVATE_PATH", options);
    result = { valid: ocr.elements.length === 1 };
  } else if (["ocr", "ocr-throwing"].includes(mode)) {
    const ocr = await runOcrOnCurrentScreen(options);
    result = { valid: ocr.elements.length === 1 && ocr.elements[0].text === "PRIVATE_WORD" };
  } else if (process.env.IMAGE_MODE === "base64") {
    result = { valid: await screenshotBase64(options) === Buffer.from("PRIVATE_PNG").toString("base64") };
  } else {
    const image = await takeScreenshot(options);
    result = { width: image.width, height: image.height, valid: image.base64 === Buffer.from("PRIVATE_PNG").toString("base64") };
  }
} catch (error) {
  failure = { failureKind: error.failureKind };
  if (mode === "availability-error") {
    try { await runOcrOnImage("PRIVATE_PATH", options); } catch {}
  }
}
console.log(JSON.stringify({ ...result, failure, spans }));
`);
  const { stdout } = await exec(process.execPath, ["--import", "tsx", path], {
    timeout: 10000, env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, IMAGE_MODE: mode },
  });
  return JSON.parse(stdout);
}

it("returns unchanged image data and nests command attempts in screenshot stages on one clock", async () => {
  const result = await probe();
  expect(result).toMatchObject({ width: 1080, height: 2340, valid: true });
  expect(result.spans.map((s: { stage: string }) => s.stage)).toEqual([
    "adb_attempt", "screenshot_capture", "adb_attempt", "screenshot_transfer",
    "adb_attempt", "screenshot_dimensions", "screenshot_read",
  ]);
  for (const index of [0, 2, 4]) {
    const inner = result.spans[index];
    const outer = result.spans[index + 1];
    expect(inner.startMs).toBeGreaterThanOrEqual(outer.startMs);
    expect(inner.startMs + inner.durationMs).toBeLessThanOrEqual(outer.startMs + outer.durationMs);
  }
  expect(JSON.stringify(result)).not.toContain("PRIVATE_");
});

it.each([
  ["capture-error", "screenshot_capture", "exit"],
  ["transfer-error", "screenshot_transfer", "exit"],
  ["dimensions-error", "screenshot_dimensions", "exit"],
  ["read-error", "screenshot_read", "unknown"],
])("retains completed and failed stages, not unstarted work: %s", async (mode, stage, kind) => {
  const result = await probe(mode);
  expect(result.failure).toBeDefined();
  expect(result.spans.at(-1)).toMatchObject({ stage, outcome: "error", failureKind: kind });
  expect(result.spans.filter((s: { outcome: string }) => s.outcome === "error")).toHaveLength(kind === "exit" ? 2 : 1);
  expect(JSON.stringify(result)).not.toContain("PRIVATE_");
});

it.each(["disabled", "screenshot-disabled", "throwing", "ocr-throwing", "base64"])("preserves results and diagnostic safety: %s", async mode => {
  const result = await probe(mode);
  expect(result.valid).toBe(true);
  expect(result.failure).toBeUndefined();
  if (mode.endsWith("disabled")) expect(result.spans).toEqual([]);
  if (mode === "base64") expect(result.spans.map((s: { stage: string }) => s.stage)).toEqual([
    "adb_attempt", "screenshot_capture", "adb_attempt", "screenshot_transfer", "screenshot_read",
  ]);
  expect(JSON.stringify(result)).not.toContain("PRIVATE_");
});

it.each(["availability-error", "engine-error", "engine-timeout"])("reports OCR subprocess failures as unknown without inventing ADB provenance: %s", async mode => {
  const result = await probe(mode);
  expect(result.failure).toBeDefined();
  const stages = mode === "availability-error" ? ["ocr_availability", "ocr_availability"] : ["ocr_availability", "ocr_engine"];
  expect(result.spans.map((s: { stage: string }) => s.stage)).toEqual(stages);
  expect(result.spans.at(-1)).toMatchObject({ outcome: "error", failureKind: "unknown" });
  expect(JSON.stringify(result)).not.toContain("PRIVATE_");
});

it("traces image-only OCR and cached availability without screenshot work", async () => {
  const result = await probe("cached-available");
  expect(result.valid).toBe(true);
  expect(result.spans.map((s: { stage: string }) => s.stage)).toEqual([
    "ocr_availability", "ocr_engine", "ocr_parse", "ocr_availability", "ocr_engine", "ocr_parse",
  ]);
});

it("shares the parent native-fallback clock with screenshot and OCR internals", async () => {
  const result = await probe("fallback");
  expect(result.valid).toBe(true);
  const parent = result.spans.at(-1);
  expect(parent).toMatchObject({ stage: "ocr_fallback", outcome: "ok" });
  for (const span of result.spans.filter((s: { stage: string }) => /^(screenshot_|ocr_)/.test(s.stage))) {
    expect(span.startMs).toBeGreaterThanOrEqual(parent.startMs);
    expect(span.startMs + span.durationMs).toBeLessThanOrEqual(parent.startMs + parent.durationMs);
  }
  expect(JSON.stringify(result)).not.toContain("PRIVATE_");
});

it("shares the screenshot clock with OCR availability, engine and parse stages", async () => {
  const result = await probe("ocr");
  expect(result.valid).toBe(true);
  expect(result.spans.map((s: { stage: string }) => s.stage)).toEqual([
    "adb_attempt", "screenshot_capture", "adb_attempt", "screenshot_transfer",
    "adb_attempt", "screenshot_dimensions", "screenshot_read",
    "ocr_availability", "ocr_engine", "ocr_parse",
  ]);
  for (const span of result.spans.slice(7))
    expect(span.startMs).toBeGreaterThanOrEqual(result.spans[6].startMs + result.spans[6].durationMs);
  expect(JSON.stringify(result)).not.toContain("PRIVATE_");
});
