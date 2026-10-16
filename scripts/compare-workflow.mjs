#!/usr/bin/env node
// Offline only. Compare two preserved source-workflow reports, never mutate them.
import { readFile, writeFile } from "node:fs/promises";
const [beforePath, afterPath, output] = process.argv.slice(2);
if (!beforePath || !afterPath || !output) {
  console.error("Usage: node scripts/compare-workflow.mjs before.json after.json new-report.md");
  process.exit(2);
}
const [before, after] = await Promise.all([beforePath, afterPath].map(async path => JSON.parse(await readFile(path, "utf8"))));
for (const report of [before, after]) {
  if (report.kind !== "source-workflow-e2e" || !Array.isArray(report.operations) ||
      !Number.isFinite(report.durationMs) || report.durationMs < 0 ||
      report.operations.some(op => !/^[a-z_]+$/.test(op.stage) || !Number.isFinite(op.durationMs) || op.durationMs < 0))
    throw Error("Invalid workflow report");
}
function statistics(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  return { n, total: sorted.reduce((sum, value) => sum + value, 0),
    median: n ? (sorted[Math.floor((n - 1) / 2)] + sorted[Math.floor(n / 2)]) / 2 : null,
    p95: n ? sorted[Math.ceil(n * 0.95) - 1] : null, max: n ? sorted[n - 1] : null };
}
const fixed = value => value === null ? "n/a" : value.toFixed(2);
const stages = [...new Set([...before.operations, ...after.operations].map(op => op.stage))];
const sameHarness = !!before.harnessHash && before.harnessHash === after.harnessHash;
const offersEqual = JSON.stringify(before.publicOffers) === JSON.stringify(after.publicOffers);
const bothPassed = before.status === "pass" && after.status === "pass";
let md = `# Source workflow before/after comparison\n\n` +
  `Both workflows passed: **${bothPassed}**. Same harness hash: **${sameHarness}**. ` +
  `Same sampled public offers: **${offersEqual}**.\n\n` +
  `| Metric | Before | After |\n| --- | ---: | ---: |\n` +
  `| Workflow wall ms | ${fixed(before.durationMs)} | ${fixed(after.durationMs)} |\n` +
  `| Source operations (including settles/cleanup) | ${before.operations.length} | ${after.operations.length} |\n` +
  `| Explicit operation errors | ${before.operations.filter(op => op.outcome !== "ok").length} | ${after.operations.filter(op => op.outcome !== "ok").length} |\n\n` +
  `After minus before: **${fixed(after.durationMs - before.durationMs)} ms**` +
  (before.durationMs ? ` (**${fixed((after.durationMs / before.durationMs - 1) * 100)}%**).\n\n` : `.\n\n`) +
  `Single pair only: descriptive, not evidence of a speedup/regression. Source/API ` +
  `operations are NOT loaded Pi tool calls. Includes fixed 500ms settling waits.\n\n` +
  `| Stage | Before n | After n | Before total ms | After total ms | Before median ms | After median ms | Before p95 ms | After p95 ms | Before max ms | After max ms |\n` +
  `| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n`;
for (const stage of stages) {
  const a = statistics(before.operations.filter(op => op.stage === stage).map(op => op.durationMs));
  const b = statistics(after.operations.filter(op => op.stage === stage).map(op => op.durationMs));
  md += `| ${stage} | ${a.n} | ${b.n} | ${fixed(a.total)} | ${fixed(b.total)} | ${fixed(a.median)} | ${fixed(b.median)} | ${fixed(a.p95)} | ${fixed(b.p95)} | ${fixed(a.max)} | ${fixed(b.max)} |\n`;
}
md += `\n## Limits\n\n` +
  `First samples and failures are retained in raw reports. Stage p95 is nearest-rank, ` +
  `not a population tail estimate. App/network/cache/device/host load may differ. ` +
  `This report does not measure LLM latency, whole-observation cancellation, or ` +
  `guarantee that successful commands produced correct UI state. Review named ` +
  `correctness checks and the workflow evidence narrative separately.\n`;
await writeFile(output, md, { flag: "wx", mode: 0o600 });
console.log(JSON.stringify({ sameHarness, offersEqual, bothPassed, deltaMs: after.durationMs - before.durationMs }));
process.exitCode = sameHarness && bothPassed ? 0 : 1;
