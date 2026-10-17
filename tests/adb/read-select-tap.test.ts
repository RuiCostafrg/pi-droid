import { afterEach, beforeEach, expect, it } from "vitest";
import { mkdtemp, writeFile, readFile, chmod, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "read-select-tap-"));
  await writeFile(join(dir, "adb"), `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
if(args[0] !== '-s' || args[1] !== 'fixture-device') process.exit(9);
args.splice(0,2);
const s = JSON.parse(fs.readFileSync(process.env.SELECT_STATE, 'utf8'));
const cmd = args.join(' ');
s.commands.push(cmd);
if(cmd.includes('uiautomator dump')) s.dumps++;
if(cmd.includes('mCurrentFocus')) s.foregrounds++;
fs.writeFileSync(process.env.SELECT_STATE, JSON.stringify(s));
if(cmd.includes('uiautomator dump')) {
 if(s.mode === 'hang-dump') Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
 if(s.mode === 'dump-error') { console.log('ERROR: idle state'); process.exit(0); }
 console.log('UI hierchary dumped to: /sdcard/pi-droid-ui.xml');
} else if(args[0] === 'pull') {
 let xml = fs.readFileSync(process.env.SELECT_XML, 'utf8');
 if(s.mode === 'moved' && s.dumps > 1) xml = xml.replace('[20,120][700,200]', '[400,300][800,500]');
 if(s.mode === 'bad-bounds') xml = xml.replace('[20,120][700,200]', '[0,0][0,0]');
 if(s.mode === 'disabled') xml = xml.replace('content-desc="Search fixture" clickable="true" focusable="true" enabled="true"', 'content-desc="Search fixture" clickable="true" focusable="true" enabled="false"');
 if(s.mode === 'wrong-target-package') xml = xml.replace('class="android.widget.EditText" package="com.example.capture"', 'class="android.widget.EditText" package="com.other.app"');
 fs.writeFileSync(args[2], xml);
} else if(cmd.includes('mCurrentFocus')) {
 const pkg = s.mode === 'changed-foreground' && s.foregrounds > 1 ? 'com.other.app' : 'com.example.capture';
 console.log('mCurrentFocus=Window{abc u0 '+pkg+'/.MainActivity}');
} else if(cmd.startsWith('shell input tap ')) {
 if(s.mode === 'tap-fail') { console.error('adb: device offline'); process.exit(1); }
 console.log('');
}
else process.exit(8);
`);
  await chmod(join(dir, "adb"), 0o700);
});
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });
async function run(selection = "elements.filter(e => e.className.endsWith('EditText'))", options = {}, mode = "normal", setup = "") {
  const state = join(dir, "state.json");
  await writeFile(state, JSON.stringify({ commands: [], dumps: 0, foregrounds: 0, mode }));
  const probe = join(dir, "probe.mjs");
  await writeFile(probe, `
import * as api from ${JSON.stringify(resolve("src/adb/index.ts"))};
api.setUiDumpDir(${JSON.stringify(dir)});
const controller = new AbortController();
const options = {serial:'fixture-device', expectedPackage:'com.example.capture', signal:controller.signal,
 ...${JSON.stringify(options)}};
${setup}
let accepted = false, selectedText, selectionCalls = 0;
try {
 const result = await api.readSelectTap(elements => { selectionCalls++; return (${selection}); }, options);
 accepted = true; selectedText = result.text;
} catch {}
console.log(JSON.stringify({accepted, selectedText, selectionCalls}));
`);
  const { stdout } = await exec(process.execPath, ["--import", "tsx", probe], {
    cwd: resolve("."), timeout: 15000,
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, SELECT_STATE: state,
      SELECT_XML: resolve("tests/fixtures/capture.xml") },
  });
  return { ...JSON.parse(await readFile(state, "utf8")), ...JSON.parse(stdout) };
}
it.each([
  ["missing", "[]"],
  ["ambiguous", "elements"],
  ["forged", "elements.filter(e => e.text === 'almond milk').map(e => ({...e}))"],
  ["non-actionable", "elements.filter(e => e.text === 'Ready & steady')"],
  ["async", "Promise.resolve(elements.filter(e => e.text === 'almond milk'))"],
  ["async rejection", "Promise.reject(Error('unsupported async selector'))"],
  ["throws", "(() => { throw Error('selection failed'); })()"],
  ["cancelled during selection", "(() => { controller.abort(); return elements.filter(e => e.text === 'almond milk'); })()"],
  ["intervening input invalidation", "(() => { api.invalidateCache(); return elements.filter(e => e.text === 'almond milk'); })()"],
])("rejects %s selection before dispatching a tap", async (_name, selector) => {
  const result = await run(selector);
  expect(result.accepted).toBe(false);
  expect(result.commands.filter((c: string) => c.includes('input tap'))).toEqual([]);
});

it.each(['dump-error', 'changed-foreground', 'disabled', 'bad-bounds', 'wrong-target-package'])("fails closed for %s", async mode => {
  const result = await run(undefined, {}, mode);
  expect(result.accepted).toBe(false);
  expect(result.commands.filter((c: string) => c.includes('input tap'))).toEqual([]);
  if(mode === 'dump-error') expect(result.foregrounds).toBe(0);
});

it.each([{serial:''}, {expectedPackage:''}, {selectionMs:0}, {selectionMs:1001}, {operationTimeoutMs:0}, {operationTimeoutMs:30001}])("rejects invalid configuration before ADB: %j", async options => {
  const result = await run(undefined, options);
  expect(result.accepted).toBe(false);
  expect(result.commands).toEqual([]);
});

it("does not start capture or invoke selection when already cancelled", async () => {
  const result = await run(undefined, {}, 'normal', 'controller.abort();');
  expect(result.accepted).toBe(false);
  expect(result.selectionCalls).toBe(0);
  expect(result.commands).toEqual([]);
});

it("cancels an active capture without selection, foreground follow-up or tap", async () => {
  const setup = `const {readFileSync} = await import('node:fs');
    const watcher = setInterval(() => {
      if(JSON.parse(readFileSync(process.env.SELECT_STATE, 'utf8')).dumps > 0) {
        clearInterval(watcher); controller.abort();
      }
    }, 10); watcher.unref();`;
  const result = await run(undefined, {}, 'hang-dump', setup);
  expect(result.accepted).toBe(false);
  expect(result.selectionCalls).toBe(0);
  expect(result.foregrounds).toBe(0);
  expect(result.commands).toHaveLength(1);
});

it("does not replay a failed tap even when the caller enables reconnect", async () => {
  const result = await run(undefined, {autoReconnect:true, exactSerial:false}, 'tap-fail');
  expect(result.accepted).toBe(false);
  expect(result.commands.filter((c: string) => c.includes('input tap'))).toHaveLength(1);
});

it("bounds acquisition with the operation deadline", async () => {
  const result = await run(undefined, {operationTimeoutMs:1});
  expect(result.accepted).toBe(false);
  expect(result.selectionCalls).toBe(0);
  expect(result.commands.filter((c: string) => c.includes('input tap'))).toEqual([]);
});

it("ignores a cached layout and selects the moved target from a new capture", async () => {
  const result = await run(undefined, {}, 'moved', "await api.dumpUiTree({serial:'fixture-device', exactSerial:true, autoReconnect:false, skipCache:true, ocrFallback:false});");
  expect(result.accepted).toBe(true);
  expect(result.dumps).toBe(2); // Seed + exactly one new capture for this operation.
  expect(result.commands.filter((c: string) => c.includes('input tap'))).toEqual(['shell input tap 600 400']);
});

it("does not accept an element retained from an older capture", async () => {
  const result = await run('previous.elements.filter(e => e.text === "almond milk")', {}, 'moved', "const previous = await api.dumpUiTree({serial:'fixture-device', exactSerial:true, autoReconnect:false, skipCache:true, ocrFallback:false});");
  expect(result.accepted).toBe(false);
  expect(result.commands.filter((c: string) => c.includes('input tap'))).toEqual([]);
});

it("is independent of cache TTL for its scoped revision guard", async () => {
  const result = await run(undefined, {}, 'normal', 'api.setCacheTtl(0);');
  expect(result.accepted).toBe(true);
});

it("rejects a synchronous selector that exceeds the selection window", async () => {
  const result = await run("(() => { const end = performance.now() + 30; while(performance.now() < end) {} return elements.filter(e => e.text === 'almond milk'); })()", { selectionMs: 10 });
  expect(result.accepted).toBe(false);
  expect(result.commands.filter((c: string) => c.includes('input tap'))).toEqual([]);
});

it("rejects mutation of captured coordinates before any tap", async () => {
  const result = await run("(() => { const e = elements.find(e => e.text === 'almond milk'); e.center.x = 999; return [e]; })()");
  expect(result.accepted).toBe(false);
  expect(result.commands.filter((c: string) => c.includes('input tap'))).toEqual([]);
});

it("selects using captured information and taps the unique control from one fresh hierarchy", async () => {
  const result = await run("elements.some(e => e.text === 'Ready & steady') ? elements.filter(e => e.text === 'almond milk') : []");
  expect(result.accepted).toBe(true);
  expect(result.selectedText).toBe("almond milk");
  expect(result.dumps).toBe(1);
  expect(result.commands.filter((c: string) => c.includes("input tap"))).toEqual(["shell input tap 360 160"]);
});
