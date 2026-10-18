import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
let dir: string;
let snapshot: string;
let gitDir: string;
// This comparator is annotation-checkpoint-specific, not a current-source audit.
// Preserve its implementation/reports; run it against the matching historical tree.
beforeAll(async () => {
  snapshot = await mkdtemp(join(tmpdir(), 'annotation-comparator-source-'));
  gitDir = (await exec('git', ['rev-parse', '--absolute-git-dir'])).stdout.trim();
  await mkdir(join(snapshot, 'src/adb'), { recursive: true });
  await mkdir(join(snapshot, 'scripts'));
  const files = ['exec.ts','capture-timing.ts','ui-tree.ts','cache.ts','input.ts',
    'read-select-tap.ts','app.ts','ocr.ts','screenshot.ts','annotate.ts'].map(f=>'src/adb/'+f);
  files.push('scripts/compare-workflow-v3.2.mjs','scripts/workflow-v3.2.mjs','scripts/workflow-field-action.mjs');
  for (const file of files) {
    const { stdout } = await exec('git', ['show', `f061509:${file}`]);
    await writeFile(join(snapshot,file),stdout);
  }
}, 20000);
afterAll(async () => { await rm(snapshot, { recursive: true, force: true }); });
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'workflow-v32-compare-')); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });
async function compare(change?: (before: any, after: any) => void) {
  const before = JSON.parse(await readFile('docs/performance/reports/workflow-v3.2-annotation-reference-2026-10-18-attempt2.json', 'utf8'));
  const after = JSON.parse(await readFile('docs/performance/reports/workflow-v3.2-annotation-current-2026-10-18-attempt1.json', 'utf8'));
  change?.(before, after);
  const a = join(dir, 'before.json'), b = join(dir, 'after.json');
  const output = join(dir, 'comparison.json'), markdown = join(dir, 'comparison.md');
  await writeFile(a, JSON.stringify(before)); await writeFile(b, JSON.stringify(after));
  const args = ['scripts/compare-workflow-v3.2.mjs', a, b, output, markdown];
  let code = 0;
  try { await exec(process.execPath, args, { cwd: snapshot, env: { ...process.env, GIT_DIR: gitDir }, timeout: 10000 }); }
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
  expect(result.before.elapsedMs).toBe(313865.858162);
  expect(result.after.elapsedMs).toBe(311786.372745);
  expect(result.before.alignment.field_scroll.cycles).toBe(1);
  expect(result.after.alignment.field_scroll.cycles).toBe(0);
  expect(result.workflowDelta.ms).toBeCloseTo(311786.372745 - 313865.858162);
  expect(r.md).toContain('Retrospective');
});
it('does not publish unexpected private payloads', async () => {
  const r = await compare((b, a) => { b.privateError = a.privateError = 'PRIVATE_DEVICE_AND_PAGE'; });
  expect(r.code).toBe(0);
  expect(r.json + r.md).not.toContain('PRIVATE_DEVICE_AND_PAGE');
});
it('refuses to overwrite either output', async () => {
  const r = await compare();
  expect(r.code).toBe(0);
  await expect(exec(process.execPath, r.args, { cwd: snapshot, env: { ...process.env, GIT_DIR: gitDir } })).rejects.toThrow();
  expect(await readFile(r.args[3], 'utf8')).toBe(r.json);
  expect(await readFile(r.args[4], 'utf8')).toBe(r.md);
});
