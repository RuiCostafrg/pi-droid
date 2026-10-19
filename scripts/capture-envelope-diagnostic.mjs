#!/usr/bin/env node
// Diagnostic only: production source and historical measured runners stay untouched.
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdtemp, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { adbShell, getForegroundPackage } from '../src/adb/exec.ts';
import { dumpUiTree } from '../src/adb/ui-tree.ts';
import { pngMetadata, ordered } from './screenshot-latency-diagnostic.mjs';

export const manifestFiles = ['src/adb/exec.ts', 'src/adb/capture-timing.ts', 'src/adb/ui-tree.ts',
  'src/adb/cache.ts', 'src/adb/input.ts', 'src/adb/read-select-tap.ts', 'src/adb/app.ts',
  'src/adb/ocr.ts', 'src/adb/screenshot.ts', 'src/adb/annotate.ts',
  'scripts/capture-envelope-diagnostic.mjs', 'scripts/screenshot-latency-diagnostic.mjs',
  'scripts/audit-capture-envelope.mjs', 'scripts/compare-workflow-capture-envelope-v1.mjs'];
export async function manifest() {
  return Object.fromEntries(await Promise.all(manifestFiles.map(async f =>
    [f, createHash('sha256').update(await readFile(new URL('../' + f, import.meta.url))).digest('hex')])));
}

// Absolute uptime is used transiently to compute a difference; never exported.
// Integer ticks avoid false floating-point precision. /proc/uptime is a coarse
// elapsed-time source, not CPU usage or a calibrated capture-only timer.
export function parseMarkers(text) {
  const m = /^PDC1 B (\d{1,12})\.(\d{1,6})\r?\nPDC1 E (\d{1,12})\.(\d{1,6}) (\d{1,3})\r?\n$/.exec(text);
  if (!m || m[2].length !== m[4].length) throw Error('protocol');
  const scale = 10n ** BigInt(m[2].length);
  const begin = BigInt(m[1]) * scale + BigInt(m[2]);
  const end = BigInt(m[3]) * scale + BigInt(m[4]);
  const commandExit = Number(m[5]);
  if (end < begin || commandExit > 255) throw Error('protocol');
  const deviceMs = Number(end - begin) * 1000 / Number(scale);
  if (!Number.isFinite(deviceMs) || deviceMs > 120000) throw Error('protocol');
  return { deviceMs, clockQuantumMs: 1000 / Number(scale), commandExit };
}

// Only internal fixed commands and UUID-owned paths reach this wrapper.
// The bracket includes begin printf and final uptime read overhead. Final printf
// is outside the device interval. Transfer/deletion are NEVER fused with capture.
function bracket(command) {
  return `read b unused < /proc/uptime || exit 91; printf 'PDC1 B %s\\n' "$b"; ${command}; rc=$?; read e unused < /proc/uptime || exit 92; printf 'PDC1 E %s %s\\n' "$e" "$rc"; exit "$rc"`;
}

export async function runProcess(args, serial, { markers = false, timeout = 15000, signal } = {}) {
  if (!serial || !Number.isFinite(timeout) || timeout <= 0) throw Error('options');
  const start = performance.now();
  const record = { outcome: 'error', stdoutBytes: 0, stderrBytes: 0 };
  if (signal?.aborted) return { ...record, closeMs: 0, failureKind: 'cancelled' };
  let captured = '', pending = '', lineCount = 0;
  await new Promise(resolve => {
    const child = spawn('adb', ['-s', serial, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    const stop = kind => { record.failureKind ??= kind; child.kill('SIGKILL'); };
    const cancel = () => stop('cancelled');
    const timer = setTimeout(() => stop('timeout'), timeout);
    signal?.addEventListener('abort', cancel, { once: true });
    // Close an abort race between the initial check and listener installation.
    if (signal?.aborted) cancel();
    child.on('spawn', () => { record.spawnMs = performance.now() - start; });
    child.stdout.on('data', chunk => {
      record.firstStdoutMs ??= performance.now() - start;
      record.stdoutBytes += chunk.length;
      if (!markers) return;
      if (record.stdoutBytes > 1024) { stop('buffer'); return; }
      const text = chunk.toString('latin1');
      captured += text;
      pending += text;
      for (let pos; (pos = pending.indexOf('\n')) >= 0;) {
        const line = pending.slice(0, pos).replace(/\r$/, '');
        pending = pending.slice(pos + 1);
        lineCount++;
        if (lineCount === 1 && /^PDC1 B \d+\.\d+$/.test(line)) record.beginReceivedMs = performance.now() - start;
        if (lineCount === 2 && /^PDC1 E \d+\.\d+ \d+$/.test(line)) record.endReceivedMs = performance.now() - start;
      }
    });
    child.stderr.on('data', chunk => { record.stderrBytes += chunk.length; });
    child.on('error', () => { record.failureKind ??= 'spawn'; });
    child.on('close', (code, childSignal) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      record.closeMs = performance.now() - start;
      if (markers) {
        try { Object.assign(record, parseMarkers(captured)); record.markerStatus = 'valid'; }
        catch { record.markerStatus = captured ? 'invalid' : 'missing'; }
      }
      if (!record.failureKind && (childSignal || code !== 0)) record.failureKind = childSignal ? 'signal' : 'exit';
      if (!record.failureKind && markers && (record.markerStatus !== 'valid' || record.commandExit !== 0)) record.failureKind = 'protocol';
      if (!record.failureKind) record.outcome = 'ok';
      resolve();
    });
  });
  return record;
}

export async function measureProbe(variant, round, config, checkpoint) {
  if (!['plain', 'bracketed', 'control'].includes(variant)) throw Error('variant');
  const { serial, local, width, height, timeout = 15000, signal } = config;
  const remote = `/sdcard/pi-droid-screen-${randomUUID()}.png`;
  const path = join(local, randomUUID() + '.png');
  const sample = { variant, round, outcome: 'error', traceComplete: false };
  const start = performance.now();
  const save = async () => { sample.totalMs = performance.now() - start; await checkpoint(sample); };
  try {
    sample.activePhase = 'capture';
    await save();
    sample.capture = await runProcess(['shell', variant === 'plain' ? `screencap -p ${remote}` :
      bracket(variant === 'control' ? 'true' : `screencap -p ${remote}`)], serial, { markers: variant !== 'plain', timeout, signal });
    await save();
    if (sample.capture.outcome === 'ok' && variant !== 'control') {
      sample.activePhase = 'transfer';
      await save();
      sample.transfer = await runProcess(['pull', remote, path], serial, { timeout, signal });
      await save();
      if (sample.transfer.outcome === 'ok') {
        sample.activePhase = 'validation';
        await save();
        const begin = performance.now();
        try {
          Object.assign(sample, pngMetadata(await readFile(path)));
          sample.dimensionsMatch = sample.width === width && sample.height === height;
          if (!sample.dimensionsMatch) sample.validationFailure = true;
        } catch { sample.validationFailure = true; }
        sample.validationMs = performance.now() - begin;
        await save();
      }
    }
  } finally {
    // Independent best-effort owned cleanup even after interruption; do not pass
    // the cancelled measurement signal to safety cleanup. No reconnect/retry.
    sample.activePhase = 'cleanup';
    // A report-write failure must not prevent owned-file cleanup.
    let progressError;
    try { await save(); } catch (e) { progressError = e; }
    if (variant !== 'control') sample.cleanup = await runProcess(['shell', `rm -f ${remote}`], serial, { timeout });
    try { await unlink(path); sample.localRemoved = true; }
    catch (e) { if (e.code === 'ENOENT') sample.localRemoved = true; else sample.localRemoved = false; }
    const ok = sample.capture?.outcome === 'ok' && sample.localRemoved && (variant === 'control' ||
      (sample.transfer?.outcome === 'ok' && sample.cleanup?.outcome === 'ok' && sample.dimensionsMatch && !sample.validationFailure));
    sample.outcome = ok ? 'ok' : 'error';
    sample.traceComplete = !!ok;
    sample.activePhase = 'settled';
    await save();
    if (progressError) throw progressError;
  }
  return sample;
}

export const diagnosticLimits = ['Diagnostic only; no production optimization or fusion.',
      'Host and device elapsed clocks are separate; marker arrival is not device execution time.',
      'Device bracket includes printf/read/scheduling/capture/encoding/write overhead; no CPU/thermal/storage/network cause inferred.',
      'Clock quantum is representation precision, not independently calibrated accuracy; control is reported, not subtracted.',
      'PNG signature/IHDR/dimensions only; not full decoding or frame-identity proof.',
      'Alternating reversed order is counterbalancing, not randomization or population/tail evidence.',
      'No absolute uptime, raw output/errors/commands, paths, images or device identifiers exported.',
      'Host timeout/cancellation kills local ADB child only; device-side termination is not established.',
      'Progress is saved after each phase; an abruptly killed active phase may remain incomplete.'];

export async function run(output, serial, rounds = 8) {
  if (!output || !serial || !Number.isInteger(rounds) || rounds < 2 || rounds > 20) throw Error('options');
  const report = { kind: 'capture-envelope-diagnostic-v1', status: 'fail', rounds,
    sourceBefore: await manifest(), samples: [], limits: diagnosticLimits };
  // Reserve exclusively BEFORE any phone call. Existing evidence is never rewritten.
  await writeFile(output, JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
  const save = () => writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
  const ac = new AbortController();
  const interrupt = () => { report.interrupted = true; ac.abort(); };
  process.on('SIGTERM', interrupt); process.on('SIGINT', interrupt);
  const budget = setTimeout(() => { report.budgetExhausted = true; ac.abort(); }, 120000);
  const options = { serial, exactSerial: true, autoReconnect: false, timeout: 15000 };
  let local, originalIme;
  try {
    originalIme = await adbShell('settings get secure default_input_method', options);
    if (!/^[A-Za-z0-9_.]+\/[A-Za-z0-9_.]+$/.test(originalIme) || await getForegroundPackage(options) !== 'com.termux') throw Error('readiness');
    local = await mkdtemp(join(tmpdir(), 'capture-envelope-'));
    await adbShell('am start -W -a android.settings.APPLICATION_DETAILS_SETTINGS -d package:com.termux', options);
    const tree = await dumpUiTree({ ...options, skipCache: true, ocrFallback: false, throwOnError: true });
    if (tree.foregroundPackage !== 'com.android.settings' || !['Termux', 'OPEN'].every(t => tree.elements.some(e => e.text === t))) throw Error('fixture');
    const match = /(?:Override size:\s*)?(\d+)x(\d+)/.exec(await adbShell('wm size', options));
    if (!match) throw Error('fixture');
    report.fixture = { nativeLabelsMatch: true, width: Number(match[1]), height: Number(match[2]) };
    report.capability = await runProcess(['shell', bracket('sleep 0.05')], serial, { markers: true, signal: ac.signal });
    report.clockSupported = report.capability.outcome === 'ok' && report.capability.deviceMs > 0 && report.capability.clockQuantumMs <= 10;
    await save();
    if (!report.clockSupported) throw Error('capability');
    for (let round = 1; round <= rounds; round++) {
      for (const variant of ordered(['plain', 'bracketed', 'control'], round)) {
        if (ac.signal.aborted) throw Error('interrupted');
        let entry;
        await measureProbe(variant, round, { serial, local, ...report.fixture, signal: ac.signal }, async sample => {
          if (!entry) { entry = sample; report.samples.push(entry); }
          await save();
        });
        if (['capture', 'transfer', 'cleanup'].some(k => report.samples.at(-1)[k]?.failureKind === 'timeout')) throw Error('deadline');
      }
    }
    if (report.samples.length === rounds * 3 && report.samples.every(s => s.outcome === 'ok' && s.traceComplete)) report.status = 'pass';
  } catch (e) {
    report.failureCheckpoint = ['readiness', 'fixture', 'capability', 'interrupted', 'deadline'].includes(e.message) ? e.message : 'execution';
  } finally {
    clearTimeout(budget);
    try {
      if (originalIme && /^[A-Za-z0-9_.]+\/[A-Za-z0-9_.]+$/.test(originalIme)) {
        if (await adbShell('settings get secure default_input_method', options) !== originalIme) {
          await adbShell(`ime set ${originalIme}`, options); report.imeRestoreRequired = true;
        }
        report.imeRestored = await adbShell('settings get secure default_input_method', options) === originalIme;
      }
      await adbShell('am start -W -n com.termux/.app.TermuxActivity', options);
      report.termuxRestored = await getForegroundPackage(options) === 'com.termux';
    } catch { report.deviceRestoreFailed = true; }
    try { if (local) await rm(local, { recursive: true, force: true }); report.localRemoved = true; }
    catch { report.localRemoved = false; }
    report.sourceAfter = await manifest();
    report.sourceUnchanged = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
    if (!report.imeRestored || !report.termuxRestored || !report.localRemoved || !report.sourceUnchanged || ac.signal.aborted) report.status = 'fail';
    await save();
    process.off('SIGTERM', interrupt); process.off('SIGINT', interrupt);
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.PI_DROID_CAPTURE_ENVELOPE !== '1') throw Error('Explicit opt-in required');
  const r = await run(process.argv[2], process.env.ANDROID_SERIAL, Number(process.env.PI_DROID_DIAG_ROUNDS ?? 8));
  console.log(JSON.stringify({ status: r.status, samples: r.samples.length, clockSupported: r.clockSupported,
    imeRestored: r.imeRestored, termuxRestored: r.termuxRestored, sourceUnchanged: r.sourceUnchanged }));
  process.exitCode = r.status === 'pass' ? 0 : 1;
}
