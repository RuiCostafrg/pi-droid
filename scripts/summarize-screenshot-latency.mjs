#!/usr/bin/env node
// Offline diagnostic audit/summaries; never adjusts elapsed times or measured reports.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
export function stats(values) {
  if (!values.length || values.some(x => !Number.isFinite(x) || x < 0)) throw Error('Invalid metrics');
  const sorted = [...values].sort((a, b) => a - b), n = sorted.length;
  return { n, min: sorted[0], median: (sorted[Math.floor(n / 2)] + sorted[Math.ceil(n / 2) - 1]) / 2, max: sorted[n - 1] };
}
export function partition(sample) {
  const top = sample.spans.filter(s => s.stage.startsWith('screenshot_') || (s.stage === 'adb_attempt' && s.scope === 'unscoped'))
    .sort((a, b) => a.startMs - b.startMs);
  let end = 0, total = 0;
  for (const s of top) {
    if (!Number.isFinite(s.startMs) || !Number.isFinite(s.durationMs) || s.startMs < end || s.durationMs < 0) throw Error('Overlapping/invalid partition');
    end = s.startMs + s.durationMs;
    total += s.durationMs;
  }
  if (end > sample.publicMs || total > sample.publicMs) throw Error('Out-of-envelope spans');
  return sample.publicMs - total; // per-call disjoint intervals only, NOT nested-span totals
}
async function audit(path, creation = false) {
  const bytes = await readFile(path), r = JSON.parse(bytes);
  if (/\b\d{1,3}(?:\.\d{1,3}){3}:\d+\b/.test(bytes.toString())) throw Error('Transport identifier');
  if (r.status !== 'pass' || !r.imeRestored || !r.termuxRestored || !r.sourceUnchanged ||
      JSON.stringify(r.sourceBefore) !== JSON.stringify(r.sourceAfter)) throw Error('Failed run/provenance');
  for (const [file, hash] of Object.entries(r.sourceBefore)) {
    const current = createHash('sha256').update(await readFile(new URL('../' + file, import.meta.url))).digest('hex');
    if (hash !== current) throw Error('Changed source/driver');
  }
  const out = { reportSha256: createHash('sha256').update(bytes).digest('hex'), rounds: r.rounds, public: [], probes: [] };
  if (r.samples.length !== r.rounds * 4) throw Error('Missing samples');
  if (creation) {
    for (const variant of ['sdcard-fresh', 'sdcard-overwrite', 'localtmp-fresh', 'localtmp-overwrite']) {
      const samples = r.samples.filter(s => s.variant === variant);
      if (samples.length !== r.rounds || new Set(samples.map(s => s.round)).size !== r.rounds || samples.some(s =>
        !s.dimensionsMatch || [s.prime, s.measured, s.transfer, ...s.cleanup].some(p => p?.outcome !== 'ok'))) throw Error('Incomplete creation probes');
      out.probes.push({ variant, primeMs: stats(samples.map(s => s.prime.closeMs)),
        measuredMs: stats(samples.map(s => s.measured.closeMs)), transferMs: stats(samples.map(s => s.transfer.closeMs)) });
    }
  } else {
    for (const mode of ['sequential', 'concurrent']) for (const api of ['saved', 'base64']) {
      const samples = r.samples.filter(s => s.mode === mode && s.api === api);
      if (samples.length !== r.rounds || new Set(samples.map(s => s.round)).size !== r.rounds || samples.some(s =>
        s.outcome !== 'ok' || !s.traceComplete || s.spansTruncated || s.spans.some(p => p.outcome !== 'ok'))) throw Error('Incomplete public samples');
      const stages = {};
      for (const stage of ['screenshot_capture', 'screenshot_transfer', 'screenshot_dimensions', 'screenshot_read']) {
        const values = samples.flatMap(s => s.spans.filter(p => p.stage === stage).map(p => p.durationMs));
        if (values.length) stages[stage] = stats(values);
      }
      out.public.push({ mode, api, publicMs: stats(samples.map(s => s.publicMs)), bytes: stats(samples.map(s => s.bytes)),
        stages, unscopedCommandMs: stats(samples.flatMap(s => s.spans.filter(p => p.stage === 'adb_attempt' && p.scope === 'unscoped').map(p => p.durationMs))),
        uncoveredMs: stats(samples.map(partition)) });
    }
    if (r.probes.length !== r.rounds * 4) throw Error('Missing probes');
    for (const variant of ['noop', 'sdcard-long', 'sdcard-short', 'localtmp-long']) {
      const samples = r.probes.filter(s => s.variant === variant);
      if (samples.length !== r.rounds || new Set(samples.map(s => s.round)).size !== r.rounds || samples.some(s =>
        s.capture?.outcome !== 'ok' || (variant !== 'noop' && (!s.dimensionsMatch || s.transfer?.outcome !== 'ok' || s.cleanup?.outcome !== 'ok')))) throw Error('Incomplete direct probes');
      out.probes.push({ variant, captureMs: stats(samples.map(s => s.capture.closeMs)), spawnMs: stats(samples.map(s => s.capture.spawnMs)) });
    }
  }
  return out;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [first, second, creation, output] = process.argv.slice(2);
  if (!output) throw Error('Three input reports and a NEW output required');
  const report = { kind: 'screenshot-latency-summary-v1', status: 'pass',
    attempt1: await audit(first), attempt2: await audit(second), creation: await audit(creation, true),
    limits: ['Descriptive diagnostics, not production acceptance, an isolated causal estimate or a speedup claim.',
      'Uncovered time is calculated per invocation from nonoverlapping intervals, then summarized. Medians are never added/subtracted to attribute wall time.',
      'Current source/driver hashes and successful recorded flags checked; this cannot establish arbitrary JSON was honestly measured.'] };
  await writeFile(output, JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ status: report.status }));
}
