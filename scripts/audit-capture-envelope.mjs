#!/usr/bin/env node
// Offline only. Strict success audit; failed/partial originals remain evidence.
import assert from 'node:assert/strict';
import { readFile, writeFile, access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { manifest, diagnosticLimits } from './capture-envelope-diagnostic.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const finite = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
function keys(value, allowed) {
  assert(value && typeof value === 'object' && !Array.isArray(value));
  assert(Object.keys(value).every(k => allowed.includes(k)), 'Unrecognized exported field');
}
export function stats(values) {
  assert(values.length && values.every(finite));
  const v = [...values].sort((a, b) => a - b), n = v.length;
  return { n, medianMs: n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2,
    minMs: v[0], maxMs: v[n - 1] };
}
function processRecord(r, markers) {
  keys(r, ['outcome', 'stdoutBytes', 'stderrBytes', 'spawnMs', 'firstStdoutMs', 'beginReceivedMs', 'endReceivedMs', 'closeMs',
    'deviceMs', 'clockQuantumMs', 'commandExit', 'markerStatus', 'failureKind']);
  assert(r.outcome === 'ok' && !('failureKind' in r));
  assert([r.spawnMs, r.closeMs, r.stdoutBytes, r.stderrBytes].every(finite));
  assert(Number.isInteger(r.stdoutBytes) && Number.isInteger(r.stderrBytes) && r.spawnMs <= r.closeMs);
  if (r.stdoutBytes) assert(finite(r.firstStdoutMs) && r.firstStdoutMs >= r.spawnMs && r.firstStdoutMs <= r.closeMs);
  else assert(r.firstStdoutMs === undefined);
  if (markers) {
    assert(r.markerStatus === 'valid' && r.commandExit === 0 && r.stdoutBytes > 0 && r.stdoutBytes <= 1024);
    assert([r.beginReceivedMs, r.endReceivedMs, r.deviceMs, r.clockQuantumMs].every(finite));
    assert(r.beginReceivedMs >= r.firstStdoutMs && r.endReceivedMs >= r.beginReceivedMs && r.closeMs >= r.endReceivedMs);
    assert([10, 1, 0.1, 0.01, 0.001].includes(r.clockQuantumMs) && r.deviceMs <= 120000);
    assert(Math.abs(r.deviceMs / r.clockQuantumMs - Math.round(r.deviceMs / r.clockQuantumMs)) < 1e-6);
  } else {
    for (const k of ['beginReceivedMs', 'endReceivedMs', 'deviceMs', 'clockQuantumMs', 'commandExit', 'markerStatus']) assert(!(k in r));
  }
}
export async function audit(r) {
  keys(r, ['kind', 'status', 'rounds', 'sourceBefore', 'sourceAfter', 'samples', 'limits', 'fixture', 'capability',
    'clockSupported', 'imeRestored', 'termuxRestored', 'localRemoved', 'sourceUnchanged', 'imeRestoreRequired']);
  assert(r.kind === 'capture-envelope-diagnostic-v1' && r.status === 'pass');
  assert(Number.isInteger(r.rounds) && r.rounds >= 2 && r.rounds <= 20 && r.samples.length === r.rounds * 3);
  assert(same(r.limits, diagnosticLimits));
  const expected = await manifest();
  assert(same(r.sourceBefore, expected) && same(r.sourceAfter, expected) && r.sourceUnchanged === true, 'Source provenance');
  for (const k of ['clockSupported', 'imeRestored', 'termuxRestored', 'localRemoved']) assert(r[k] === true);
  if ('imeRestoreRequired' in r) assert(r.imeRestoreRequired === true);
  keys(r.fixture, ['nativeLabelsMatch', 'width', 'height']);
  assert(r.fixture.nativeLabelsMatch === true && Number.isInteger(r.fixture.width) && r.fixture.width > 0 && Number.isInteger(r.fixture.height) && r.fixture.height > 0);
  processRecord(r.capability, true);
  assert(r.capability.deviceMs > 0);
  for (const [i, s] of r.samples.entries()) {
    keys(s, ['variant', 'round', 'outcome', 'traceComplete', 'activePhase', 'totalMs', 'capture', 'transfer', 'cleanup',
      'validationMs', 'validationFailure', 'bytes', 'width', 'height', 'dimensionsMatch', 'localRemoved']);
    const round = 1 + Math.floor(i / 3);
    const order = round % 2 ? ['plain', 'bracketed', 'control'] : ['control', 'bracketed', 'plain'];
    assert(s.round === round && s.variant === order[i % 3], 'Counterbalanced order/count');
    assert(s.outcome === 'ok' && s.traceComplete === true && s.activePhase === 'settled' && s.localRemoved === true);
    assert(finite(s.totalMs));
    processRecord(s.capture, s.variant !== 'plain');
    let measured = s.capture.closeMs;
    if (s.variant === 'control') {
      for (const k of ['transfer', 'cleanup', 'validationMs', 'validationFailure', 'bytes', 'width', 'height', 'dimensionsMatch']) assert(!(k in s));
    } else {
      processRecord(s.transfer, false); processRecord(s.cleanup, false);
      assert(finite(s.validationMs) && !('validationFailure' in s) && s.dimensionsMatch === true);
      assert(s.width === r.fixture.width && s.height === r.fixture.height && Number.isInteger(s.bytes) && s.bytes >= 33);
      measured += s.transfer.closeMs + s.cleanup.closeMs + s.validationMs;
    }
    // These sequential host envelopes are disjoint within one sample, not nested
    // stage spans or device/host clock subtraction. No cross-sample median sums.
    assert(measured <= s.totalMs + 0.01, 'Host envelopes exceed sample');
  }
  const groups = {};
  for (const variant of ['plain', 'bracketed', 'control']) {
    const samples = r.samples.filter(s => s.variant === variant);
    const metrics = { captureHostMs: stats(samples.map(s => s.capture.closeMs)), totalHostMs: stats(samples.map(s => s.totalMs)) };
    if (variant !== 'plain') {
      metrics.captureDeviceMs = stats(samples.map(s => s.capture.deviceMs));
      metrics.clockQuantumMs = [...new Set(samples.map(s => s.capture.clockQuantumMs))];
    }
    if (variant !== 'control') {
      metrics.transferHostMs = stats(samples.map(s => s.transfer.closeMs));
      metrics.cleanupHostMs = stats(samples.map(s => s.cleanup.closeMs));
      metrics.validationHostMs = stats(samples.map(s => s.validationMs));
      const bytes = stats(samples.map(s => s.bytes));
      metrics.pngBytes = { n: bytes.n, medianBytes: bytes.medianMs, minBytes: bytes.minMs, maxBytes: bytes.maxMs };
    }
    groups[variant] = metrics;
  }
  return { status: 'pass', samples: r.samples.length, groups };
}

export async function summarize(input1, input2, output, markdown) {
  assert(output && markdown && output !== markdown);
  for (const p of [output, markdown]) {
    try { await access(p); throw Error('Existing evidence'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  const reports = await Promise.all([input1, input2].map(async p => JSON.parse(await readFile(p, 'utf8'))));
  assert(reports[0].rounds === reports[1].rounds && same(reports[0].sourceBefore, reports[1].sourceBefore));
  const result = { kind: 'capture-envelope-audit-v1', status: 'pass', blocks: await Promise.all(reports.map(audit)),
    limits: ['Two unchanged-source diagnostic repetitions, not an optimization before/after or causal experiment.',
      'Host and device clocks separate; control and representation precision reported, never subtracted from medians.',
      'No CPU/encoding/storage/thermal/network attribution; no speedup, population-tail or cumulative-gain claim.',
      'Strict offline invariants/provenance cannot attest arbitrary JSON was honestly measured.'] };
  let md = '# Capture-envelope diagnostic audit\n\n';
  md += 'Two unchanged-source blocks. All samples retained; controls are not subtracted.\n\n';
  md += '| Block | Variant | Host capture median ms (min–max) | Device bracket median ms (min–max) | Quantum ms |\n| --- | --- | --- | --- | --- |\n';
  for (const [i, b] of result.blocks.entries()) for (const [v, g] of Object.entries(b.groups)) {
    const fmt = m => m ? `${m.medianMs.toFixed(2)} (${m.minMs.toFixed(2)}–${m.maxMs.toFixed(2)})` : 'not measured';
    md += `| ${i + 1} | ${v} | ${fmt(g.captureHostMs)} | ${fmt(g.captureDeviceMs)} | ${g.clockQuantumMs?.join(', ') ?? 'n/a'} |\n`;
  }
  md += '\n' + result.limits.map(l => '- ' + l).join('\n') + '\n';
  await writeFile(output, JSON.stringify(result, null, 2), { flag: 'wx', mode: 0o600 });
  await writeFile(markdown, md, { flag: 'wx', mode: 0o600 });
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await summarize(...process.argv.slice(2));
  console.log(JSON.stringify({ status: r.status, blocks: r.blocks.map(b => b.samples) }));
}
