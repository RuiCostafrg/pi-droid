import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'png-compare-')); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });
async function compare(change?: (before: any, after: any, focusedBefore: any, focusedAfter: any) => void) {
  const before = JSON.parse(await readFile('docs/performance/reports/workflow-v3.2-png-before-attempt2-2026-10-18.json', 'utf8'));
  const after = JSON.parse(await readFile('docs/performance/reports/workflow-v3.2-png-after-attempt1-2026-10-18.json', 'utf8'));
  const fb = JSON.parse(await readFile('docs/performance/reports/png-focused-before-2026-10-18.json', 'utf8'));
  const fa = JSON.parse(await readFile('docs/performance/reports/png-focused-after-2026-10-18.json', 'utf8'));
  change?.(before, after, fb, fa);
  const a = join(dir, 'before.json'), b = join(dir, 'after.json');
  const output = join(dir, 'comparison.json'), markdown = join(dir, 'comparison.md');
  await writeFile(a, JSON.stringify(before)); await writeFile(b, JSON.stringify(after));
  const focusedBefore = join(dir, 'focused-before.json'), focusedAfter = join(dir, 'focused-after.json');
  await writeFile(focusedBefore, JSON.stringify(fb)); await writeFile(focusedAfter, JSON.stringify(fa));
  const args = ['scripts/compare-workflow-png-v1.mjs', a, b, focusedBefore, focusedAfter, output, markdown];
  let code = 0;
  try { await exec(process.execPath, args, { cwd: resolve('.'), timeout: 10000 }); }
  catch { code = 1; }
  let json = '', md = '';
  try { json = await readFile(output, 'utf8'); md = await readFile(markdown, 'utf8'); } catch {}
  return { code, json, md, args };
}
const invalid: Array<[string, (before: any, after: any) => void]> = [
  ['failed attempt', (_b, a) => { a.status = 'fail'; }],
  ['old protocol revision', (_b, a) => { a.protocolRevision = '3.1'; }],
  ['different driver', (_b, a) => { a.harnessHash = 'e'.repeat(64); }],
  ['different source', (_b, a) => { a.sourceHashes['annotate.ts'] = 'e'.repeat(64); }],
  ['different consumer', (_b, a) => { a.consumerHash = 'e'.repeat(64); }],
  ['different chosen identity', (_b, a) => { a.chosenProduct.identityHash = 'e'.repeat(64); }],
  ['different offers', (_b, a) => { a.publicOffers[0].total = 99; }],
  ['missing write', (_b, a) => { a.numericWrites.pop(); }],
  ['wrong persisted value', (_b, a) => { a.persistedValues[0].values[0] = '99'; }],
  ['failed readback guard', (_b, a) => { a.checks.find((c: any) => c.name === 'exercise_1_readback').ok = false; }],
  ['missing confirmation', (_b, a) => { a.productAlignment.pop(); }],
  ['ambiguous product', (_b, a) => { a.productAlignment[0].distinctTargets = 2; }],
  ['incomplete capture', (_b, a) => { a.captureContexts[0].traceComplete = false; }],
  ['truncated spans', (_b, a) => { a.captureSpansTruncated = true; }],
  ['inconsistent capture count', (_b, a) => { a.captureCounts.completedDeviceDumps--; }],
  ['missing retained work', (_b, a) => { a.operations.splice(a.operations.findIndex((o: any) => o.stage === 'type'), 1); }],
  ['malformed alignment cycle', (b) => { const n = b.operations.findIndex((o: any) => o.stage === 'product_scroll'); b.operations[n + 1].stage = 'shell'; }],
  ['non-finite elapsed', (_b, a) => { a.durationMs = null; }],
];
it.each(invalid)('rejects %s', async (_name, change) => {
  const result = await compare(change);
  expect(result.code).not.toBe(0);
  if (result.json) expect(JSON.parse(result.json).passed).toBe(false);
});
it('validates the real pair without subtracting alignment from elapsed time', async () => {
  const r = await compare();
  expect(r.code).toBe(0);
  const result = JSON.parse(r.json);
  expect(result.passed).toBe(true);
  expect(result.before.elapsedMs).toBe(309200.604882);
  expect(result.after.elapsedMs).toBe(300495.08743799996);
  expect(result.before.alignment.field_scroll.cycles).toBe(2);
  expect(result.after.alignment.field_scroll.cycles).toBe(1);
  expect(result.workflowDelta.ms).toBeCloseTo(300495.08743799996 - 309200.604882);
  expect(r.md).toContain('Fresh chronological');
});
it.each(['screenshot.ts','exec.ts','annotate.ts'])('rejects tampered supplemental manifest %s', async file => {
  const r = await compare((_b,_a,_fb,fa) => { fa.sourceHashes[file] = 'e'.repeat(64); });
  expect(r.code).toBe(1);
  expect(JSON.parse(r.json).gates.focusedPngCorrectnessAndProvenance).toBe(false);
});
it('rejects a different focused driver', async () => {
  const r = await compare((_b,_a,fb) => { fb.driverHash = 'e'.repeat(64); });
  expect(r.code).toBe(1);
  expect(JSON.parse(r.json).gates.focusedPngCorrectnessAndProvenance).toBe(false);
});
it('does not publish unexpected private payloads', async () => {
  const r = await compare((b, a) => { b.privateError = a.privateError = 'PRIVATE_DEVICE_AND_PAGE'; });
  expect(r.code).toBe(0);
  expect(r.json + r.md).not.toContain('PRIVATE_DEVICE_AND_PAGE');
});
it('refuses to overwrite either output', async () => {
  const r = await compare();
  expect(r.code).toBe(0);
  await expect(exec(process.execPath, r.args, { cwd: resolve('.') })).rejects.toThrow();
  expect(await readFile(r.args[5], 'utf8')).toBe(r.json);
  expect(await readFile(r.args[6], 'utf8')).toBe(r.md);
});

it.each(['traceComplete','validPng','fileMatchesBase64'])('rejects incorrect focused %s',async field=>{
 const r=await compare((_b,_a,_fb,fa)=>{fa.samples[0][field]=false;});
 expect(r.code).toBe(1);expect(JSON.parse(r.json).gates.focusedPngCorrectnessAndProvenance).toBe(false);
});
it('rejects incomplete focused cleanup tracing',async()=>{
 const r=await compare((_b,_a,_fb,fa)=>{fa.samples[0].spans.pop();});
 expect(r.code).toBe(1);expect(JSON.parse(r.json).gates.focusedPngCorrectnessAndProvenance).toBe(false);
});
