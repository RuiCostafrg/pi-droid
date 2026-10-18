import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdtemp, writeFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// Public annotatedScreenshot + real external subprocess seam; no collaborator mocks.
vi.setConfig({ testTimeout: 15000 });
const exec = promisify(execFile);
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "annotation-boundary-"));
  await writeFile(join(dir, "adb"), `#!${process.execPath}
const fs = require("node:fs");
const args = process.argv.slice(4);
const cmd = args.join(" ");
const mode = process.env.ANN_MODE;
async function main() {
  if (cmd.includes("screencap")) {
    await new Promise(r => setTimeout(r, ["foreground-error", "screenshot-timeout"].includes(mode) ? 600 : 150));
    if (mode === "screenshot-error") { process.stderr.write("PRIVATE_ERROR"); process.exit(7); }
  } else if (cmd.includes("uiautomator")) {
    await new Promise(r => setTimeout(r, mode === "screenshot-timeout" ? 50 : 350));
    if (mode === "fallback") process.exit(7);
    console.log("dumped");
  } else if (args[0] === "pull") {
    const xml = '<hierarchy><node text="PRIVATE_BUTTON" class="android.widget.Button" resource-id="PRIVATE_ID" package="com.private" clickable="true" enabled="true" bounds="[10,20][110,60]"/><node text="PRIVATE_LABEL" class="android.widget.TextView" enabled="true" bounds="[0,0][20,20]"/></hierarchy>';
    fs.writeFileSync(args[2], args[1].endsWith(".xml") ? xml : "PRIVATE_PNG");
  } else if (cmd.includes("mCurrentFocus")) {
    if (mode === "foreground-error") process.exit(7);
    console.log("mCurrentFocus=Window{x u0 com.private/.Main}");
  } else if (cmd === "shell wm size") console.log("Physical size: 1080x2340");
  else process.exit(8);
}
main();
`);
  await chmod(join(dir, "adb"), 0o700);
  await writeFile(join(dir, "tesseract"), `#!${process.execPath}
if (process.argv[2] === "--version") console.log("version");
else console.log("level\\tpage_num\\tblock_num\\tpar_num\\tline_num\\tword_num\\tleft\\ttop\\twidth\\theight\\tconf\\ttext\\n5\\t1\\t1\\t1\\t1\\t1\\t10\\t20\\t100\\t40\\t95\\tPRIVATE_OCR");
`);
  await chmod(join(dir, "tesseract"), 0o700);
});
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

async function probe(mode = "success") {
  const path = join(dir, "probe.mjs");
  await writeFile(path, `
import { annotatedScreenshot } from ${JSON.stringify(resolve("src/adb/annotate.ts"))};
import { setScreenshotDir } from ${JSON.stringify(resolve("src/adb/screenshot.ts"))};
import { setUiDumpDir } from ${JSON.stringify(resolve("src/adb/ui-tree.ts"))};
import { captureTiming } from ${JSON.stringify(resolve("src/adb/capture-timing.ts"))};
setUiDumpDir(${JSON.stringify(join(dir, "xml"))});
setScreenshotDir(${JSON.stringify(join(dir, "images"))});
const mode = process.env.ANN_MODE;
const spans = [];
const sink = s => { spans.push(s); if (mode === "throwing") throw Error("PRIVATE_SINK"); };
const options = { serial: "PRIVATE_SERIAL", exactSerial: true, autoReconnect: false, timeout: mode === "screenshot-timeout" ? 300 : 3000,
  includeBase64: mode !== "no-base64", allElements: mode === "all", onCaptureSpan: mode === "disabled" ? undefined : sink };
if (mode === "context") {
  options.captureClock = captureTiming(sink);
  await options.captureClock.async("foreground", () => new Promise(r => setTimeout(r, 80)));
  options.onCaptureSpan = () => { throw Error("must not replace explicit clock"); };
}
Object.freeze(options);
let valid = false, failure;
try {
  const result = await annotatedScreenshot(options);
  const expectedCount = mode === "all" ? 2 : 1;
  valid = result.count === expectedCount && result.foregroundPackage === "com.private" &&
    result.elements[0].label === 0 && result.elements[0].center.x === 60 &&
    result.textIndex.includes('[0] Button: "PRIVATE_BUTTON" → tap(60, 40)') &&
    (mode === "no-base64" ? result.screenshotBase64 === undefined : result.screenshotBase64 === Buffer.from("PRIVATE_PNG").toString("base64"));
  if (mode === "fallback") valid = result.count === 1 && result.elements[0].displayText === "PRIVATE_OCR";
  if (mode === "cached") {
    const second = await annotatedScreenshot(options);
    valid = valid && second.count === 1;
  }
} catch (e) { failure = e.failureKind ?? "unknown"; }
const atReturn = spans.length;
// Existing Promise.all rejects before the sibling finishes. Do not invent cancellation.
if (failure) await new Promise(r => setTimeout(r, 1300));
console.log(JSON.stringify({ valid, failure, spans, atReturn }));
`);
  const { stdout } = await exec(process.execPath, ["--import", "tsx", path], {
    timeout: 10000, env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, ANN_MODE: mode },
  });
  return JSON.parse(stdout);
}

it("returns correct annotations with overlapping sibling spans and descendants on one clock", async () => {
  const result = await probe();
  expect(result.valid).toBe(true);
  const shot = result.spans.find((s: { stage: string }) => s.stage === "annotation_screenshot");
  const tree = result.spans.find((s: { stage: string }) => s.stage === "annotation_ui_dump");
  expect(shot).toMatchObject({ outcome: "ok" });
  expect(tree).toMatchObject({ outcome: "ok" });
  expect(Math.max(shot.startMs, tree.startMs)).toBeLessThan(Math.min(shot.startMs + shot.durationMs, tree.startMs + tree.durationMs));
  for (const span of result.spans.filter((s: { stage: string }) => /^(screenshot_|device_dump|xml_|foreground|cache_lookup)/.test(s.stage))) {
    const parent = span.stage.startsWith("screenshot_") ? shot : tree;
    expect(span.startMs).toBeGreaterThanOrEqual(parent.startMs);
    expect(span.startMs + span.durationMs).toBeLessThanOrEqual(parent.startMs + parent.durationMs);
  }
  expect(result.spans.slice(-2).map((s: { stage: string }) => s.stage)).toEqual(["annotation_map", "annotation_text_index"]);
  expect(result.spans.at(-2).startMs).toBeGreaterThanOrEqual(Math.max(shot.startMs + shot.durationMs, tree.startMs + tree.durationMs));
  expect(JSON.stringify(result)).not.toContain("PRIVATE_");
});

it("preserves explicit ADB timeout provenance on the failed screenshot sibling", async () => {
  const result = await probe("screenshot-timeout");
  expect(result.failure).toBe("timeout");
  expect(result.spans.find((s: { stage: string }) => s.stage === "annotation_screenshot")).toMatchObject({ outcome: "error", failureKind: "timeout" });
  expect(result.spans.find((s: { stage: string }) => s.stage === "annotation_ui_dump")).toMatchObject({ outcome: "ok" });
  expect(result.spans.some((s: { stage: string }) => s.stage === "annotation_map")).toBe(false);
  expect(JSON.stringify(result)).not.toContain("PRIVATE_");
});

it.each(["all", "no-base64", "disabled", "throwing", "context", "cached", "fallback"])(
  "preserves results, policies and diagnostic safety: %s", async mode => {
    const result = await probe(mode);
    expect(result.valid).toBe(true);
    expect(result.failure).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("PRIVATE_");
    if (mode === "disabled") expect(result.spans).toEqual([]);
    if (mode === "no-base64") expect(result.spans.some((s: { stage: string }) => s.stage === "screenshot_read")).toBe(false);
    if (mode === "context") {
      const anchor = result.spans[0];
      expect(anchor.stage).toBe("foreground");
      for (const span of result.spans.slice(1)) expect(span.startMs).toBeGreaterThanOrEqual(anchor.startMs + anchor.durationMs);
    }
    if (mode === "cached") {
      expect(result.spans.filter((s: { stage: string }) => s.stage === "device_dump")).toHaveLength(1);
      expect(result.spans.filter((s: { stage: string }) => s.stage === "annotation_ui_dump")).toHaveLength(2);
      expect(result.spans.filter((s: { cacheHit?: boolean }) => s.cacheHit === true)).toHaveLength(1);
    }
    if (mode === "fallback") {
      expect(result.spans.find((s: { stage: string }) => s.stage === "device_dump")).toMatchObject({ outcome: "error", failureKind: "exit" });
      const parent = result.spans.find((s: { stage: string }) => s.stage === "annotation_ui_dump");
      expect(parent.outcome).toBe("ok"); // native failure swallowed by existing fallback
      for (const span of result.spans.filter((s: { stage: string }) => s.stage.startsWith("ocr_"))) {
        expect(span.startMs).toBeGreaterThanOrEqual(parent.startMs);
        expect(span.startMs + span.durationMs).toBeLessThanOrEqual(parent.startMs + parent.durationMs);
      }
    }
  },
);

it.each([
  ["screenshot-error", "annotation_screenshot", "annotation_ui_dump"],
  ["foreground-error", "annotation_ui_dump", "annotation_screenshot"],
])("retains failures and late sibling spans without cancelling or inventing mapping: %s", async (mode, failed, sibling) => {
  const result = await probe(mode);
  expect(result.failure).toBe("exit");
  expect(result.spans.find((s: { stage: string }) => s.stage === failed)).toMatchObject({ outcome: "error", failureKind: "exit" });
  expect(result.spans.slice(result.atReturn).find((s: { stage: string }) => s.stage === sibling)).toMatchObject({ outcome: "ok" });
  expect(result.spans.some((s: { stage: string }) => ["annotation_map", "annotation_text_index"].includes(s.stage))).toBe(false);
  expect(JSON.stringify(result)).not.toContain("PRIVATE_");
});
