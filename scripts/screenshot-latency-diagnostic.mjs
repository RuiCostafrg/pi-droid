#!/usr/bin/env node
// Diagnostic only. No production changes, historical-driver rewrites, or persistent helpers.
import { access, mkdtemp, readFile, writeFile, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { spawn } from 'node:child_process';
import { takeScreenshot, screenshotBase64, setScreenshotDir } from '../src/adb/screenshot.ts';
import { captureTiming } from '../src/adb/capture-timing.ts';
import { adbShell, getForegroundPackage } from '../src/adb/exec.ts';
import { dumpUiTree } from '../src/adb/ui-tree.ts';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const kinds = new Set(['timeout', 'cancelled', 'exit', 'signal', 'spawn', 'buffer', 'unknown']);
const failure = e => kinds.has(e?.failureKind) ? e.failureKind : 'unknown';
export function pngMetadata(bytes) {
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ||
      bytes.toString('ascii', 12, 16) !== 'IHDR') throw Error('Invalid PNG');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (!width || !height) throw Error('Invalid PNG dimensions');
  return { bytes: bytes.length, width, height };
}

// One clock per invocation. Each adb_attempt is attributed at emission to its
// active public stage, or honestly marked unscoped (currently remote cleanup).
export function diagnosticClock(sample, limit = 128) {
  let scope = 'unscoped';
  const timing = captureTiming(span => {
    if (sample.spans.length < limit) sample.spans.push({ ...span, scope });
    else sample.spansTruncated = true;
  });
  return {
    sync: (stage, fn) => timing.sync(stage, fn),
    async: async (stage, fn) => {
      if (stage === 'adb_attempt') return timing.async(stage, fn);
      const previous = scope;
      scope = stage;
      try { return await timing.async(stage, fn); } finally { scope = previous; }
    },
  };
}

export async function measurePublic(api, mode, round, options, expected) {
  const sample = { kind: 'public', api, mode, round, outcome: 'error', spans: [],
    spansTruncated: false, traceComplete: false };
  let path;
  const start = performance.now();
  try {
    const traced = { ...options, captureClock: diagnosticClock(sample) };
    let data;
    if (api === 'saved') {
      const result = await takeScreenshot({ ...traced, includeBase64: true });
      path = result.path;
      data = Buffer.from(result.base64, 'base64');
      sample.publicMs = performance.now() - start; // excludes validation / harness cleanup
      const saved = await readFile(path);
      sample.fileMatchesBase64 = saved.equals(data);
      if (!sample.fileMatchesBase64) throw Error('Saved image mismatch');
      sample.returnedDimensionsMatch = result.width === expected.width && result.height === expected.height;
      if (!sample.returnedDimensionsMatch) throw Error('Returned dimensions mismatch');
    } else {
      data = Buffer.from(await screenshotBase64(traced), 'base64');
      sample.publicMs = performance.now() - start;
    }
    Object.assign(sample, pngMetadata(data));
    if (sample.width !== expected.width || sample.height !== expected.height) throw Error('Fixture dimensions changed');
    sample.outcome = 'ok';
    sample.traceComplete = !sample.spansTruncated;
  } catch (e) {
    sample.failureKind = failure(e);
    sample.publicMs ??= performance.now() - start;
  } finally {
    if (path) await unlink(path).catch(() => {}); // production retains it; harness owns disposal
    sample.totalMs = performance.now() - start;
  }
  return sample;
}

// Independent direct-process probe, NOT a replacement production transport.
// All times are host observations; first output is not device capture completion.
export async function processProbe(args, serial, timeout = 15000) {
  const start = performance.now();
  const record = { outcome: 'error', stdoutBytes: 0, stderrBytes: 0 };
  await new Promise(resolve => {
    let deadline = false;
    const child = spawn('adb', ['-s', serial, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => { deadline = true; child.kill('SIGKILL'); }, timeout);
    child.on('spawn', () => { record.spawnMs = performance.now() - start; });
    child.stdout.on('data', chunk => {
      record.firstStdoutMs ??= performance.now() - start;
      record.stdoutBytes += chunk.length;
    });
    child.stderr.on('data', chunk => { record.stderrBytes += chunk.length; });
    child.on('error', () => { record.failureKind = 'spawn'; });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      record.closeMs = performance.now() - start;
      if (!deadline && code === 0 && !record.failureKind) record.outcome = 'ok';
      else record.failureKind ??= deadline ? 'timeout' : signal ? 'signal' : 'exit';
      resolve();
    });
  });
  return record;
}

// Reversed blocks counterbalance order without claiming statistical randomization.
export function ordered(items, round) { return round % 2 ? [...items] : [...items].reverse(); }

async function manifest() {
  const files = ['src/adb/screenshot.ts', 'src/adb/exec.ts', 'src/adb/capture-timing.ts',
    'scripts/screenshot-latency-diagnostic.mjs'];
  return Object.fromEntries(await Promise.all(files.map(async p => [p, sha(await readFile(new URL('../' + p, import.meta.url)))])));
}

export async function run(output, serial, rounds = 8) {
  if (!serial || !output || !Number.isInteger(rounds) || rounds < 2 || rounds > 20) throw Error('Explicit transport/output and 2–20 rounds required');
  try { await access(output); throw Error('Existing output'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const report = { kind: 'screenshot-latency-diagnostic-v1', status: 'fail', rounds,
    sourceBefore: await manifest(), samples: [], probes: [], cleanup: [],
    limits: ['Diagnostic only, not full-workflow acceptance or a speedup claim.',
      'Independent per-call clocks; nested spans/medians are not additive wall time.',
      'Host spawn/first-output/close times do not measure device CPU or isolate network latency.',
      'Unscoped adb_attempt is recorded without inventing a production cleanup stage.',
      'Public calls always trace: diagnostics overhead not isolated. Direct probes use a separate transport implementation.',
      'Reversed round order reduces ordering bias, not thermal/network confounding or population-tail evidence.',
      'PNG signature/IHDR/dimensions and byte equality checked, not full PNG decoding or concurrent frame identity.',
      'No images, commands, paths, raw errors, IME identities or device identifiers exported.'] };
  // Reserve before any phone interaction; never overwrite a prior attempt.
  await writeFile(output, JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
  const options = { serial, exactSerial: true, autoReconnect: false, timeout: 15000 };
  let originalIme, local;
  try {
    originalIme = await adbShell('settings get secure default_input_method', options);
    if (await getForegroundPackage(options) !== 'com.termux') throw Error('Start in Termux');
    local = await mkdtemp(join(tmpdir(), 'screenshot-diagnosis-'));
    setScreenshotDir(local);
    await adbShell('am start -W -a android.settings.APPLICATION_DETAILS_SETTINGS -d package:com.termux', options);
    const tree = await dumpUiTree({ ...options, skipCache: true, ocrFallback: false, throwOnError: true });
    if (tree.foregroundPackage !== 'com.android.settings' || !['Termux', 'OPEN'].every(t => tree.elements.some(e => e.text === t))) throw Error('Fixture mismatch');
    const size = await adbShell('wm size', options);
    const match = size.match(/(?:Override size:\s*)?(\d+)x(\d+)/);
    if (!match) throw Error('Missing dimensions');
    const expected = { width: Number(match[1]), height: Number(match[2]) };
    report.fixture = { nativeLabelsMatch: true, ...expected };
    // Retain cold first samples rather than silently discarding warm-up.
    for (let round = 1; round <= rounds; round++) {
      for (const api of ordered(['saved', 'base64'], round)) {
        report.samples.push(await measurePublic(api, 'sequential', round, options, expected));
      }
      const pair = await Promise.all(ordered(['saved', 'base64'], round).map(api => measurePublic(api, 'concurrent', round, options, expected)));
      report.samples.push(...pair);
      // One variable at a time within the device-file capture probes. Every path
      // retains full UUID ownership. No historical fixed shared filename is used.
      for (const variant of ordered(['noop', 'sdcard-long', 'sdcard-short', 'localtmp-long'], round)) {
        const root = variant === 'localtmp-long' ? '/data/local/tmp' : '/sdcard';
        const name = `${variant === 'sdcard-short' ? '' : 'pi-droid-screen-'}${randomUUID()}.png`;
        const remote = `${root}/${name}`;
        const probe = { variant, round };
        report.probes.push(probe);
        try {
          probe.capture = await processProbe(['shell', variant === 'noop' ? 'true' : `screencap -p ${remote}`], serial);
          if (variant !== 'noop' && probe.capture.outcome === 'ok') {
            // Stream to host memory only for numeric validation; never return image content.
            const file = join(local, randomUUID() + '.png');
            try {
              probe.transfer = await processProbe(['pull', remote, file], serial);
              if (probe.transfer.outcome === 'ok') {
                Object.assign(probe, pngMetadata(await readFile(file)));
                probe.dimensionsMatch = probe.width === expected.width && probe.height === expected.height;
              }
            } finally { await unlink(file).catch(() => {}); }
          }
        } finally {
          if (variant !== 'noop') probe.cleanup = await processProbe(['shell', `rm -f ${remote}`], serial);
        }
      }
      // Retain progress after each completed block, including failed samples.
      await writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
    }
    report.status = report.samples.every(s => s.outcome === 'ok' && s.traceComplete) &&
      report.probes.every(p => p.capture?.outcome === 'ok' && (p.variant === 'noop' ||
        (p.transfer?.outcome === 'ok' && p.cleanup?.outcome === 'ok' && p.dimensionsMatch))) ? 'pass' : 'fail';
  } catch (e) { report.failureKind = failure(e); }
  finally {
    // No input method changes are needed here. Restore even on unexpected change.
    try {
      if (originalIme) {
        if (await adbShell('settings get secure default_input_method', options) !== originalIme) {
          await adbShell(`ime set ${originalIme}`, options);
          report.imeRestoreRequired = true;
        }
        report.imeRestored = await adbShell('settings get secure default_input_method', options) === originalIme;
      }
      await adbShell('am start -W -n com.termux/.app.TermuxActivity', options);
      report.termuxRestored = await getForegroundPackage(options) === 'com.termux';
    } catch (e) { report.cleanup.push({ phase: 'device_restore', failureKind: failure(e) }); }
    if (local) await rm(local, { recursive: true, force: true }).catch(() => { report.cleanup.push({ phase: 'local_remove', failureKind: 'unknown' }); });
    report.sourceAfter = await manifest();
    report.sourceUnchanged = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
    if (!report.imeRestored || !report.termuxRestored || !report.sourceUnchanged || report.cleanup.length) report.status = 'fail';
    // This invocation exclusively reserved its new output before touching the phone.
    await writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.PI_DROID_SCREENSHOT_DIAG !== '1') throw Error('Explicit diagnostic opt-in required');
  const report = await run(process.argv[2], process.env.ANDROID_SERIAL, Number(process.env.PI_DROID_DIAG_ROUNDS ?? 8));
  console.log(JSON.stringify({ status: report.status, samples: report.samples.length, probes: report.probes.length,
    imeRestored: report.imeRestored, termuxRestored: report.termuxRestored, sourceUnchanged: report.sourceUnchanged }));
  process.exitCode = report.status === 'pass' ? 0 : 1;
}
