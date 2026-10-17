import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

vi.setConfig({ testTimeout: 20000 });
const exec = promisify(execFile);
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "ui-dump-tool-"));
  await writeFile(join(dir, "commands"), "");
  // Only external executables are substituted. Registration, Device, acquisition,
  // parser, cache, OCR fallback and formatting are real production code.
  await writeFile(join(dir, "adb"), `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
if(args[0] === '-s') {
 if(args[1] !== 'fixture-device') process.exit(9);
 args.splice(0,2);
}
const cmd = args.join(' ');
fs.appendFileSync(process.env.TOOL_COMMANDS, cmd+'\\n');
if(args[0] === 'devices') console.log('List of devices attached\\nfixture-device device');
else if(cmd.includes('uiautomator dump')) {
 if(process.env.TOOL_MODE === 'dump-error') process.exit(1);
 if(process.env.TOOL_MODE === 'zero-exit-error') console.log('ERROR: could not get idle state');
 else console.log('UI hierchary dumped to: /sdcard/pi-droid-ui.xml');
} else if(args[0] === 'pull') {
 if(process.env.TOOL_MODE === 'pull-error') process.exit(1);
 if(args[1].endsWith('.xml')) fs.copyFileSync(process.env.TOOL_XML,args[2]);
 else fs.writeFileSync(args[2], 'synthetic image');
} else if(cmd.includes('mCurrentFocus')) console.log('mCurrentFocus=Window{abc u0 com.example.capture/.MainActivity}');
else if(cmd.includes('screencap')) {}
else if(cmd === 'shell wm size') console.log('Physical size: 1080x1920');
else process.exit(8);
`, { mode: 0o700 });
  await writeFile(join(dir, "tesseract"), `#!${process.execPath}
require('node:fs').appendFileSync(process.env.TOOL_COMMANDS,'tesseract\\n');
if(process.argv.includes('--version')) console.log('tesseract synthetic');
else console.log('level\\tpage_num\\tblock_num\\tpar_num\\tline_num\\tword_num\\tleft\\ttop\\twidth\\theight\\tconf\\ttext\\n5\\t1\\t1\\t1\\t1\\t1\\t20\\t40\\t200\\t60\\t95\\tOCR-only-secret');
`, { mode: 0o700 });
});
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

async function run(args: Record<string, unknown> = {}, options: { xml?: string; mode?: string; setup?: string } = {}) {
  const xml = join(dir, "input.xml");
  await writeFile(xml, options.xml ?? await readFile(resolve("tests/fixtures/capture.xml"), "utf8"));
  const probe = join(dir, "probe.mjs");
  await writeFile(probe, `
import { registerDeviceTools } from ${JSON.stringify(resolve("src/tools/device.ts"))};
import { setUiDumpDir, dumpUiTree } from ${JSON.stringify(resolve("src/adb/ui-tree.ts"))};
import { setScreenshotDir } from ${JSON.stringify(resolve("src/adb/screenshot.ts"))};
setUiDumpDir(${JSON.stringify(join(dir, "dumps"))});
setScreenshotDir(${JSON.stringify(join(dir, "screens"))});
const tools = new Map();
registerDeviceTools({registerTool: t => tools.set(t.name, t)}, {serial:'fixture-device'});
const tool = tools.get('android_ui_dump');
${options.setup ?? ""}
let result, rejected = false;
try { result = await tool.execute('probe', ${JSON.stringify(args)}); }
catch { rejected = true; }
console.log(JSON.stringify({result, rejected, fields: Object.keys(tool.parameters.properties)}));
`);
  const { stdout } = await exec(process.execPath, ["--import", "tsx", probe], {
    timeout: 15000, cwd: resolve("."),
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, TOOL_MODE: options.mode ?? "normal",
      TOOL_XML: xml, TOOL_COMMANDS: join(dir, "commands") },
  });
  const result = JSON.parse(stdout);
  return { ...result, text: result.result?.content.filter((c: {type: string}) => c.type === "text").map((c: {text: string}) => c.text).join("\n") ?? "",
    commands: (await readFile(join(dir, "commands"), "utf8")).trim().split("\n").filter(Boolean) as string[] };
}

const minimalXml = '<hierarchy><node text="Native-only" resource-id="fixture:id/label" class="android.widget.TextView" package="com.example.capture" clickable="false" focusable="false" enabled="true" bounds="[20,40][500,100]" /></hierarchy>';

it.each([{}, { all_elements: false }, { all_elements: false, ocr_fallback: true }])("preserves the exact interactive-only summary by default: %j", async args => {
  const result = await run(args);
  expect(result.rejected).toBe(false);
  expect(result.text).toBe('Package: com.example.capture\nElements (1):\n[0] EditText: "almond milk" at (360, 160)');
  expect(result.commands.filter((c: string) => c.includes("uiautomator dump"))).toHaveLength(1);
  expect(result.commands.some((c: string) => c.includes("screencap") || c === "tesseract")).toBe(false);
});

it.each([{}, { ocr_fallback: true }])("preserves screenshot/OCR fallback unless explicitly disabled: %j", async args => {
  const result = await run({ all_elements: true, ...args }, { xml: minimalXml });
  expect(result.rejected).toBe(false);
  expect(result.text).toContain('TextView: "Native-only"');
  expect(result.text).toContain('View: "OCR-only-secret"');
  expect(result.commands.filter((c: string) => c.includes("screencap"))).toHaveLength(1);
  expect(result.commands.filter((c: string) => c === "tesseract")).toHaveLength(2);
});

it("includes disabled and description-only information without presenting it as interactive", async () => {
  const xml = '<hierarchy>' +
    '<node text="Unavailable" resource-id="fixture:id/disabled" class="android.widget.Button" package="com.example.capture" clickable="true" enabled="false" bounds="[10,20][110,80]" />' +
    '<node text="" content-desc="Status description" resource-id="fixture:id/status" class="android.widget.TextView" package="com.example.capture" enabled="true" bounds="[20,100][500,160]" />' +
    '</hierarchy>';
  const result = await run({ all_elements: true, ocr_fallback: false }, { xml });
  expect(result.rejected).toBe(false);
  expect(result.text).toContain('Button: "Unavailable" at (60, 50) [non-interactive]');
  expect(result.text).toContain('TextView: "Status description" at (260, 130) [non-interactive]');
});

it("keeps native-only acquisition independent of the all_elements output option", async () => {
  const result = await run({ ocr_fallback: false }, { xml: minimalXml });
  expect(result.rejected).toBe(false);
  expect(result.text).toBe('Package: com.example.capture\nElements (0):\n');
  expect(result.commands.some((c: string) => c.includes("screencap") || c === "tesseract")).toBe(false);
});

it.each(["dump-error", "zero-exit-error", "pull-error"])("rejects native-only acquisition failure without silent empty success or fallback: %s", async mode => {
  const result = await run({ all_elements: true, ocr_fallback: false }, { mode });
  expect(result.rejected).toBe(true);
  expect(result.text).toBe("");
  expect(result.commands.some((c: string) => c.includes("screencap") || c === "tesseract")).toBe(false);
});

it("does not reuse cached OCR information for a native-only request", async () => {
  const result = await run({ all_elements: true, ocr_fallback: false }, {
    xml: minimalXml,
    setup: `await dumpUiTree({serial:'fixture-device', skipCache:true});
      const {writeFile} = await import('node:fs/promises');
      await writeFile(process.env.TOOL_COMMANDS, '');`,
  });
  expect(result.rejected).toBe(false);
  expect(result.text).toContain('TextView: "Native-only"');
  expect(result.text).not.toContain("OCR-only-secret");
  expect(result.commands.filter((c: string) => c.includes("uiautomator dump"))).toHaveLength(1);
  expect(result.commands.some((c: string) => c.includes("screencap") || c === "tesseract")).toBe(false);
});

it("never captures a screenshot or invokes OCR when fallback is explicitly disabled", async () => {
  const result = await run({ all_elements: true, ocr_fallback: false }, { xml: minimalXml });
  expect(result.fields).toContain("ocr_fallback");
  expect(result.rejected).toBe(false);
  expect(result.text).toContain('TextView: "Native-only"');
  expect(result.text).not.toContain("OCR-only-secret");
  expect(result.commands.some((c: string) => c.includes("screencap") || c === "tesseract")).toBe(false);
});

it("exposes information labels through the registered tool's all_elements option", async () => {
  const result = await run({ all_elements: true });
  expect(result.fields).toContain("all_elements");
  expect(result.rejected).toBe(false);
  expect(result.text).toContain('TextView: "Ready & steady" at (260, 70) [non-interactive]');
  expect(result.text).toContain('EditText: "almond milk" at (360, 160)');
  expect(result.commands.some((c: string) => c.includes("screencap"))).toBe(false);
});
