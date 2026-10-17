// Opt-in registered-tool comparison. Run with node --import tsx from repo root.
// The before/after argument chooses the tool, NOT a source checkout.
import { mkdtemp, mkdir, readFile, writeFile, open, rm, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { registerDeviceTools } from '../src/tools/device.ts';
import { setUiDumpDir } from '../src/adb/ui-tree.ts';
import { setScreenshotDir } from '../src/adb/screenshot.ts';
import { invalidateCache } from '../src/adb/cache.ts';

const [mode, output] = process.argv.slice(2);
if (process.env.PI_DROID_TEXT_E2E !== '1' || !['before', 'after'].includes(mode) || !output)
  throw Error('Require PI_DROID_TEXT_E2E=1, before|after, and NEW report path');
const realAdb = execFileSync('which', ['adb'], { encoding: 'utf8' }).trim();
const connected = execFileSync(realAdb, ['devices'], { encoding: 'utf8' }).trim().split('\n').slice(1)
  .map(line => line.trim().split(/\s+/)).filter(parts => parts[1] === 'device');
if (connected.length !== 1) throw Error('Require exactly one freshly authorized device');
const serial = connected[0][0]; // Ephemeral only. Never exported.
const shell = command => execFileSync(realAdb, ['-s', serial, 'shell', command], { encoding: 'utf8', timeout: 15000 }).trim();
const foreground = () => shell('dumpsys window | grep mCurrentFocus');
if (!foreground().includes('com.termux/')) throw Error('Return to Termux before running');
if (!shell('dumpsys power').includes('mWakefulness=Awake')) throw Error('Screen must be awake');
const originalIme = shell('settings get secure default_input_method');
if (!/^[\w.$/]+$/.test(originalIme)) throw Error('Unexpected original IME');
const jsonHandle = await open(resolve(output), 'wx');
let mdHandle;
try { mdHandle = await open(resolve(output).replace(/\.json$/, '') + '.md', 'wx'); }
catch (error) { await jsonHandle.close(); throw error; }
const dir = await mkdtemp(join(tmpdir(), 'pi-droid-text-e2e-'));
const originalPath = process.env.PATH;
const hash = value => createHash('sha256').update(value).digest('hex');
async function sources(path = 'src') {
  const result = {};
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = `${path}/${entry.name}`;
    if (entry.isDirectory()) Object.assign(result, await sources(child));
    else if (child.endsWith('.ts')) result[child] = hash(await readFile(child));
  }
  return result;
}
const report = {
  version: 1, mode, fixture: 'settings-termux-app-info', rounds: 6,
  startedAt: new Date().toISOString(), driverHash: hash(await readFile(new URL(import.meta.url))),
  sources: await sources(), status: 'fail', samples: [], cleanup: {},
};
try {
  // Observe ONLY fixed operation categories at the external process seam. Never
  // log command text, serial, paths, stdout, stderr or page content.
  await mkdir(join(dir, 'bin'));
  const countsPath = join(dir, 'counts');
  await writeFile(countsPath, '');
  await writeFile(join(dir, 'bin', 'adb'), `#!${process.execPath}
const fs = require('node:fs');
const {spawnSync} = require('node:child_process');
const args = process.argv.slice(2);
const rest = args[0] === '-s' ? args.slice(2) : args;
const cmd = rest.join(' ');
let kind = cmd.includes('uiautomator dump') ? 'hierarchy' : cmd.includes('screencap') ? 'screenshot' :
  rest[0] === 'pull' ? (rest[1].endsWith('.xml') ? 'xmlPull' : 'imagePull') :
  cmd.includes('mCurrentFocus') ? 'foreground' : cmd === 'shell wm size' ? 'dimensions' :
  rest[0] === 'devices' ? 'discovery' : 'forbidden';
fs.appendFileSync(${JSON.stringify(countsPath)}, kind+'\\n');
if(kind === 'forbidden') process.exit(8);
const r = spawnSync(${JSON.stringify(realAdb)}, args, {stdio:'inherit',timeout:15000});
process.exit(r.status ?? 1);
`, { mode: 0o700 });
  process.env.PATH = `${join(dir, 'bin')}:${originalPath}`;
  setUiDumpDir(join(dir, 'xml'));
  setScreenshotDir(join(dir, 'screens'));
  const tools = new Map();
  registerDeviceTools({ registerTool: tool => tools.set(tool.name, tool) }, { serial });
  const invoke = async (name, args) => {
    const result = await tools.get(name).execute('text-fixture', args);
    if (result.isError) throw Error('Tool returned an error');
    return result.content.filter(item => item.type === 'text').map(item => item.text).join('\n');
  };
  shell('am start -a android.settings.APPLICATION_DETAILS_SETTINGS -d package:com.termux');
  await new Promise(resolve => setTimeout(resolve, 1000));
  if (!foreground().includes('com.android.settings/')) throw Error('Wrong fixture foreground');
  // Same untimed warmup initializes Device.connect for BOTH modes. Also records
  // the old dump's inability to expose the information label before edits.
  invalidateCache();
  const initial = await invoke('android_ui_dump', {});
  report.defaultDump = { titleVisible: initial.includes('"Termux"'), openVisible: initial.includes('"OPEN"') };
  const selected = mode === 'before' ? 'android_look' : 'android_ui_dump';
  const args = mode === 'before' ? { all_elements: true, include_image: false } : { all_elements: true, ocr_fallback: false };
  report.tool = selected;
  report.args = args;
  report.schemaFields = Object.keys(tools.get('android_ui_dump').parameters.properties).sort();
  const startRun = performance.now();
  for (let round = 1; round <= report.rounds; round++) {
    if (performance.now() - startRun > 120000) throw Error('Run budget exhausted');
    invalidateCache(); // Identical explicit fresh observation on BOTH paths.
    await writeFile(countsPath, '');
    const start = performance.now();
    const raw = await invoke(selected, args);
    const elapsedMs = performance.now() - start;
    const text = mode === 'before' ? JSON.parse(raw).index : raw;
    const checks = {
      foreground: text.includes('com.android.settings'),
      title: text.split('\n').some(line => line.includes('TextView: "Termux"')),
      open: text.split('\n').some(line => line.includes('Button: "OPEN"')),
    };
    const counts = {};
    for (const name of (await readFile(countsPath, 'utf8')).trim().split('\n').filter(Boolean)) counts[name] = (counts[name] ?? 0) + 1;
    const expectedScreenshot = mode === 'before' ? 1 : 0;
    const ok = Object.values(checks).every(Boolean) && counts.hierarchy === 1 && counts.xmlPull === 1 &&
      counts.foreground === 1 && (counts.screenshot ?? 0) === expectedScreenshot &&
      (counts.imagePull ?? 0) === expectedScreenshot && !counts.forbidden;
    report.samples.push({ round, elapsedMs, checks, counts, ok });
    if (!ok) throw Error('Information/operation check failed');
  }
  report.measuredRunMs = performance.now() - startRun;
  report.status = 'pass';
} catch {
  report.status = 'fail'; // Never export raw device errors or returned text.
} finally {
  process.env.PATH = originalPath;
  try {
    if (shell('settings get secure default_input_method') !== originalIme) shell(`ime set ${originalIme}`);
    report.cleanup.imeRestored = shell('settings get secure default_input_method') === originalIme;
  } catch { report.cleanup.imeRestored = false; }
  try {
    shell('am start -n com.termux/.app.TermuxActivity');
    await new Promise(resolve => setTimeout(resolve, 500));
    report.cleanup.termuxRestored = foreground().includes('com.termux/');
  } catch { report.cleanup.termuxRestored = false; }
  await rm(dir, { recursive: true, force: true });
  if (!Object.values(report.cleanup).every(Boolean)) report.status = 'fail';
  if (report.samples.length) {
    const sorted = report.samples.map(s => s.elapsedMs).sort((a,b) => a-b);
    report.summary = { medianMs: (sorted[Math.floor((sorted.length-1)/2)] + sorted[Math.floor(sorted.length/2)]) / 2,
      maxMs: sorted.at(-1), correct: report.samples.filter(s => s.ok).length };
  }
  await jsonHandle.writeFile(JSON.stringify(report, null, 2) + '\n');
  await jsonHandle.close();
  await mdHandle.writeFile(`# Registered text-observation ${mode} baseline\n\n` +
    `Status: **${report.status}**. Correct: ${report.summary?.correct ?? 0}/${report.rounds}.\n` +
    `Driver SHA-256: \`${report.driverHash}\`.\n\n` +
    `Tool: \`${report.tool}\`; arguments: \`${JSON.stringify(report.args)}\`.\n` +
    `Median: ${report.summary?.medianMs?.toFixed(2) ?? 'n/a'}ms; max: ${report.summary?.maxMs?.toFixed(2) ?? 'n/a'}ms.\n\n` +
    `Default dump exposes title: ${report.defaultDump?.titleVisible}; OPEN: ${report.defaultDump?.openVisible}.\n` +
    `IME restored: ${report.cleanup.imeRestored}; Termux restored: ${report.cleanup.termuxRestored}.\n\n` +
    `Same read-only Settings → Termux app-info fixture; exact title, OPEN control and foreground checks. ` +
    `Six fresh observations; cache invalidated before each, no TTL changes. ` +
    `Counts come from a category-only external ADB wrapper; raw text/errors/endpoints are not retained. ` +
    `Timing includes wrapper overhead and tool execution, excludes imports, warmup, setup and cleanup. ` +
    `This is source-registered tool execution, NOT active-session reload or LLM latency. ` +
    `120s budget checked between rounds, 15s wrapper/ADB command bounds; not a hard whole-run watchdog. ` +
    `Finally handles caught failures, not host crashes/SIGKILL. No field writes, installs, permissions, purchases or draft changes.\n`);
  await mdHandle.close();
}
console.log(JSON.stringify({ status: report.status, summary: report.summary, cleanup: report.cleanup }));
if (report.status !== 'pass') process.exitCode = 1;
