#!/usr/bin/env node
// Follow-up diagnostic. Every probe owns unique files; no production code changes.
import { readFile, writeFile, mkdtemp, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { processProbe, pngMetadata, ordered } from './screenshot-latency-diagnostic.mjs';
import { adbShell, getForegroundPackage } from '../src/adb/exec.ts';
import { dumpUiTree } from '../src/adb/ui-tree.ts';
const sha = b => createHash('sha256').update(b).digest('hex');
async function manifest() {
  return Object.fromEntries(await Promise.all(['src/adb/screenshot.ts', 'src/adb/exec.ts',
    'scripts/screenshot-latency-diagnostic.mjs', 'scripts/screenshot-file-creation-diagnostic.mjs'].map(async p =>
    [p, sha(await readFile(new URL('../' + p, import.meta.url)))])));
}
export async function runCreation(output, serial, rounds = 8) {
  if (!output || !serial || !Number.isInteger(rounds) || rounds < 2 || rounds > 20) throw Error('Explicit output/transport and 2–20 rounds required');
  const report = { kind: 'screenshot-file-creation-diagnostic-v1', status: 'fail', rounds,
    sourceBefore: await manifest(), samples: [],
    limits: ['Diagnostic only, no production change or full-workflow acceptance.',
      'Each sample primes a new UUID-owned file, then captures to the same file or a second fresh owned file.',
      'Prime and measurement both retained. Fixed prime-before-measure order does not isolate all cache/thermal effects.',
      'Reversed variant order is counterbalancing, not randomization. Independent host process clocks; no device CPU claims.',
      'PNG signature/IHDR/dimensions checked; not a full image decode. No images, identifiers, paths or raw errors exported.'] };
  await writeFile(output, JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
  const options = { serial, exactSerial: true, autoReconnect: false, timeout: 15000 };
  let ime, local;
  try {
    ime = await adbShell('settings get secure default_input_method', options);
    if (await getForegroundPackage(options) !== 'com.termux') throw Error('Start in Termux');
    local = await mkdtemp(join(tmpdir(), 'screenshot-creation-'));
    await adbShell('am start -W -a android.settings.APPLICATION_DETAILS_SETTINGS -d package:com.termux', options);
    const tree = await dumpUiTree({ ...options, skipCache: true, ocrFallback: false, throwOnError: true });
    if (tree.foregroundPackage !== 'com.android.settings' || !['Termux', 'OPEN'].every(t => tree.elements.some(e => e.text === t))) throw Error('Fixture mismatch');
    const size = (await adbShell('wm size', options)).match(/(\d+)x(\d+)/);
    if (!size) throw Error('Missing size');
    report.fixture = { nativeLabelsMatch: true, width: Number(size[1]), height: Number(size[2]) };
    for (let round = 1; round <= rounds; round++) {
      for (const variant of ordered(['sdcard-fresh', 'sdcard-overwrite', 'localtmp-fresh', 'localtmp-overwrite'], round)) {
        const root = variant.startsWith('sdcard') ? '/sdcard' : '/data/local/tmp';
        const first = `${root}/pi-droid-screen-${randomUUID()}.png`;
        const second = variant.endsWith('overwrite') ? first : `${root}/pi-droid-screen-${randomUUID()}.png`;
        const sample = { variant, round, cleanup: [] };
        report.samples.push(sample);
        try {
          sample.prime = await processProbe(['shell', `screencap -p ${first}`], serial);
          if (sample.prime.outcome !== 'ok') continue;
          sample.measured = await processProbe(['shell', `screencap -p ${second}`], serial);
          if (sample.measured.outcome !== 'ok') continue;
          const file = join(local, randomUUID() + '.png');
          try {
            sample.transfer = await processProbe(['pull', second, file], serial);
            if (sample.transfer.outcome === 'ok') {
              Object.assign(sample, pngMetadata(await readFile(file)));
              sample.dimensionsMatch = sample.width === report.fixture.width && sample.height === report.fixture.height;
            }
          } finally { await unlink(file).catch(() => {}); }
        } finally {
          // One deletion command/sample, covering only this probe's owned names.
          sample.cleanup.push(await processProbe(['shell', `rm -f ${[...new Set([first, second])].join(' ')}`], serial));
        }
      }
      await writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
    }
    report.status = report.samples.length === rounds * 4 && report.samples.every(s =>
      s.prime?.outcome === 'ok' && s.measured?.outcome === 'ok' && s.transfer?.outcome === 'ok' &&
      s.dimensionsMatch && s.cleanup.every(c => c.outcome === 'ok')) ? 'pass' : 'fail';
  } catch { report.failureKind = 'unknown'; }
  finally {
    try {
      if (ime) {
        if (await adbShell('settings get secure default_input_method', options) !== ime) await adbShell(`ime set ${ime}`, options);
        report.imeRestored = await adbShell('settings get secure default_input_method', options) === ime;
      }
      await adbShell('am start -W -n com.termux/.app.TermuxActivity', options);
      report.termuxRestored = await getForegroundPackage(options) === 'com.termux';
    } catch { report.restoreFailure = true; }
    if (local) await rm(local, { recursive: true, force: true }).catch(() => { report.localCleanupFailure = true; });
    report.sourceAfter = await manifest();
    report.sourceUnchanged = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
    if (!report.imeRestored || !report.termuxRestored || !report.sourceUnchanged || report.localCleanupFailure) report.status = 'fail';
    await writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
  }
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.PI_DROID_SCREENSHOT_DIAG !== '1') throw Error('Explicit diagnostic opt-in required');
  const r = await runCreation(process.argv[2], process.env.ANDROID_SERIAL, Number(process.env.PI_DROID_DIAG_ROUNDS ?? 8));
  console.log(JSON.stringify({ status: r.status, samples: r.samples.length, imeRestored: r.imeRestored,
    termuxRestored: r.termuxRestored, sourceUnchanged: r.sourceUnchanged }));
  process.exitCode = r.status === 'pass' ? 0 : 1;
}
