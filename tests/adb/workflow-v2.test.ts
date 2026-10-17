import { afterEach, beforeEach, expect, it } from "vitest";
import { mkdtemp, writeFile, readFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "workflow-v2-"));
  await writeFile(join(dir, "state.json"), JSON.stringify({ dumps: 0, commands: [] }));
  await writeFile(join(dir, "adb"), `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
if(args[0] !== '-s' || args[1] !== 'fixture-device') process.exit(9);
args.splice(0,2);
const cmd=args.join(' ');
const state=JSON.parse(fs.readFileSync(process.env.WORKFLOW_STATE,'utf8'));
state.commands.push(cmd);
if(cmd.includes('uiautomator dump')) state.dumps++;
fs.writeFileSync(process.env.WORKFLOW_STATE,JSON.stringify(state));
if(cmd.includes('uiautomator dump')) console.log('UI hierchary dumped to: /sdcard/pi-droid-ui.xml');
else if(args[0]==='pull') fs.copyFileSync(process.env.WORKFLOW_XML,args[2]);
else if(cmd.includes('mCurrentFocus')) {
 if(process.env.WORKFLOW_SLOW_GUARD === '1' && state.commands.filter(c=>c.includes('mCurrentFocus')).length > 1)
   Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,700);
 console.log('mCurrentFocus=Window{abc u0 com.example.capture/.MainActivity}');
}
else if(cmd==='shell input tap 360 160') console.log('');
else process.exit(8);
`);
  await chmod(join(dir, "adb"), 0o700);
});
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });
// Functional transport tests allow the documented 1s window for cold Node fake
// executables under parallel host load. Live v2 keeps the production 500ms default.
async function select(selector = "elements.filter(e => e.text === 'almond milk')", adapter = "workflow-field-action.mjs", options: { selectionMs?: number } = { selectionMs: 1000 }, slowGuard = false) {
  const probe = join(dir, "probe.mjs");
  // Import the actual workflow consumer, then exercise real source and external ADB.
  await writeFile(probe, `
import {selectWorkflowField} from ${JSON.stringify(resolve("scripts", adapter))};
import {setUiDumpDir} from ${JSON.stringify(resolve("src/adb/ui-tree.ts"))};
setUiDumpDir(${JSON.stringify(dir)});
let accepted=false, failure;
try {await selectWorkflowField(elements => ${selector}, {serial:'fixture-device', expectedPackage:'com.example.capture', ...${JSON.stringify(options)}}); accepted=true;} catch(error) {failure=error.message;}
console.log(JSON.stringify({accepted,failure}));
`);
  const { stdout } = await exec(process.execPath, ["--import", "tsx", probe], {
    cwd: resolve("."), timeout: 10000,
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`,
      WORKFLOW_STATE: join(dir, "state.json"), WORKFLOW_XML: resolve("tests/fixtures/capture.xml"),
      WORKFLOW_SLOW_GUARD: slowGuard ? '1' : '0' },
  });
  return { ...JSON.parse(stdout), ...JSON.parse(await readFile(join(dir, "state.json"), "utf8")) };
}
it("the production-default window rejects a slow final foreground guard before tapping", async () => {
  const result = await select(undefined, undefined, {}, true);
  expect(result.accepted).toBe(false);
  expect(result.failure).toContain('expired');
  expect(result.commands.filter((c: string) => c.includes('input tap'))).toEqual([]);
});

it("the preserved old adapter remains executable and uses two fresh captures", async () => {
  const result = await select(undefined, 'workflow-field-action-before.mjs');
  expect(result.accepted).toBe(true);
  expect(result.dumps).toBe(2);
  expect(result.commands.filter((c: string) => c.includes('input tap'))).toEqual(['shell input tap 360 160']);
});

it.each(['[]', 'elements'])("the migrated consumer rejects invalid selection %s before tapping", async selector => {
  const result = await select(selector);
  expect(result.accepted).toBe(false);
  expect(result.commands.filter((c: string) => c.includes('input tap'))).toEqual([]);
});

it("the versioned consumer selects and taps from one fresh capture, not two", async () => {
  const result = await select();
  expect(result.accepted, result.failure).toBe(true);
  expect(result.dumps).toBe(1);
  expect(result.commands.filter((c: string) => c.includes('input tap'))).toEqual(['shell input tap 360 160']);
});
