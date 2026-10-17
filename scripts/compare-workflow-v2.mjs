#!/usr/bin/env node
// Offline, content-free, fail-closed comparison. Never rewrites evidence.
import { readFile, writeFile } from "node:fs/promises";
const [beforePath, afterPath, output] = process.argv.slice(2);
if (!beforePath || !afterPath || !output) {
  console.error("Usage: node scripts/compare-workflow-v2.mjs before.json after.json NEW.md");
  process.exit(2);
}
const [before, after] = await Promise.all([beforePath, afterPath].map(async p => JSON.parse(await readFile(p, "utf8"))));
const stages = new Set(["shell", "screen_size", "ui_dump", "tap", "settle", "type", "key", "app", "swipe", "field_scroll", "select_tap", "ocr", "restore_ime", "restore_termux"]);
const captureStages = new Set(["device_dump", "xml_transfer", "xml_read", "xml_parse", "foreground"]);
const finite = n => Number.isFinite(n) && n >= 0;
const hash = h => typeof h === "string" && /^[a-f0-9]{64}$/.test(h);
function validate(r) {
  if (r?.kind !== "source-workflow-e2e-v2" || r.schemaVersion !== 2 || !finite(r.durationMs) ||
      !["pass", "fail"].includes(r.status) || !Array.isArray(r.operations) ||
      !Array.isArray(r.checks) || !Array.isArray(r.captureSpans) ||
      ![r.harnessHash, r.engineHash, r.consumerHash].every(hash) ||
      r.operations.some(o => !stages.has(o.stage) || !finite(o.startMs) || !finite(o.durationMs) || !["ok", "error"].includes(o.outcome)) ||
      r.captureSpans.some(s => !captureStages.has(s.stage) || !finite(s.startMs) || !finite(s.durationMs) || !["ok", "error"].includes(s.outcome)))
    throw Error("Invalid v2 workflow report");
}
validate(before); validate(after);
const count = (r, stage) => r.operations.filter(o => o.stage === stage).length;
const dumps = r => r.captureSpans.filter(s => s.stage === "device_dump").length;
const errors = r => r.captureSpans.filter(s => s.outcome === "error").length;
const checks = ["fixture_screen_1080x2340", "amazon_search_field", "amazon_search_focused", "amazon_query_readback",
  "three_fixed_comparable_offers", "chosen_product_visible", "amazon_product_open", "forge_popup_parent_activity",
  "forge_six_template_options", "new_lower_draft", "draft_card_visible", "draft_title_reopened",
  "original_ime_restored", "termux_restored"];
for (let n = 1; n <= 5; n++) checks.push(`exercise_${n}_six_fields`, `exercise_${n}_readback`, `exercise_${n}_persisted`);
function correct(r) {
  const names = r.checks.map(c => c.name);
  return names.length === 34 && new Set(names).size === names.length &&
    checks.every(name => r.checks.some(c => c.name === name && c.ok === true)) &&
    [1,2,3,4,5].every(n => r.checks.some(c => c.name === `exercise_${n}_persisted_field_count` && c.count === 6));
}
function consistent(r, perSelection) {
  return r.captureSpansTruncated === false && errors(r) === 0 &&
    r.captureCounts?.completedDeviceDumps === dumps(r) &&
    r.captureCounts?.captureStageErrors === errors(r) &&
    r.captureCounts?.explicitOcrCalls === count(r, "ocr") &&
    dumps(r) === count(r, "ui_dump") + count(r, "select_tap") * perSelection;
}
// Alignment is explicitly bounded in the frozen driver. Strip only complete
// field_scroll → settle → ui_dump cycles; do not discard arbitrary observations.
function normalized(r) {
  const sequence = [];
  let alignmentMs = 0;
  for (let i = 0; i < r.operations.length; i++) {
    if (r.operations[i].stage === "field_scroll") {
      if (r.operations[i+1]?.stage !== "settle" || r.operations[i+2]?.stage !== "ui_dump")
        throw Error("Invalid alignment cycle");
      alignmentMs += r.operations.slice(i,i+3).reduce((s,o) => s+o.durationMs,0);
      i += 2;
    } else sequence.push(r.operations[i].stage);
  }
  return { sequence, alignmentMs };
}
const a = normalized(before), b = normalized(after);
const validOffers = r => Array.isArray(r.publicOffers) && r.publicOffers.length === 3 &&
  r.publicOffers.every(p => finite(p.total) && p.total > 0 && finite(p.perLitre) && p.perLitre > 0);
const gates = {
  bothPassed: before.status === "pass" && after.status === "pass",
  correctModes: before.phase === "before" && after.phase === "after" &&
    before.selectionStrategy === "inspect-then-verify" && after.selectionStrategy === "bounded-read-select-tap",
  sameDriver: before.harnessHash === after.harnessHash,
  sameEngine: before.engineHash === after.engineHash,
  changedConsumer: before.consumerHash !== after.consumerHash,
  allRequiredChecks: correct(before) && correct(after),
  identicalChecks: JSON.stringify(before.checks) === JSON.stringify(after.checks),
  sameOffers: validOffers(before) && validOffers(after) && JSON.stringify(before.publicOffers) === JSON.stringify(after.publicOffers),
  exactCaptureAccounting: consistent(before, 2) && consistent(after, 1),
  allOperationsOk: [...before.operations,...after.operations].every(o => o.outcome === "ok"),
  all30Selections: count(before,"select_tap") === 30 && count(after,"select_tap") === 30,
  retainedOtherWork: JSON.stringify(a.sequence) === JSON.stringify(b.sequence),
  oneOcrEach: count(before,"ocr") === 1 && count(after,"ocr") === 1,
};
const passed = Object.values(gates).every(Boolean);
const f = n => n.toFixed(2);
const delta = before.durationMs - after.durationMs;
const pct = before.durationMs > 0 ? f(100*delta/before.durationMs) : "n/a";
const total = (r, stage) => r.operations.filter(o => o.stage === stage).reduce((s,o) => s+o.durationMs,0);
let md = `# Workflow v2 consumer migration comparison\n\nComparison gates pass: **${passed}**.\n\n`;
if (!passed) md += `This pair fails comparison gates. Do NOT claim a validated optimization or speedup from it.\n\n`;
md += `| Gate | Pass |\n| --- | --- |\n`;
for (const [gate, ok] of Object.entries(gates)) md += `| ${gate} | ${ok} |\n`;
md += `\n| Metric | Before | After |\n| --- | ---: | ---: |\n` +
  `| Workflow wall ms | ${f(before.durationMs)} | ${f(after.durationMs)} |\n` +
  `| Completed hierarchy captures | ${dumps(before)} | ${dumps(after)} |\n` +
  `| Field-selection operations | ${count(before,"select_tap")} | ${count(after,"select_tap")} |\n` +
  `| Other direct hierarchy observations | ${count(before,"ui_dump")} | ${count(after,"ui_dump")} |\n` +
  `| Explicit OCR calls | ${count(before,"ocr")} | ${count(after,"ocr")} |\n` +
  `| Field-alignment cycles | ${count(before,"field_scroll")} | ${count(after,"field_scroll")} |\n` +
  `| Source operation records | ${before.operations.length} | ${after.operations.length} |\n` +
  `| Field-selection total ms | ${f(total(before,"select_tap"))} | ${f(total(after,"select_tap"))} |\n` +
  `| Alignment-cycle total ms | ${f(a.alignmentMs)} | ${f(b.alignmentMs)} |\n\n` +
  `Observed before minus after: **${f(delta)}ms (${pct}% lower elapsed time)**. ` +
  `This is one live pair, not a population or causal estimate.\n\n` +
  `## Work retained and variation\n\n` +
  (passed ? `The 30 targeted duplicate captures are removed by consumer adoption of the public bounded operation. ` :
    `A passing migration requires 30 targeted duplicate captures to be removed; this pair did not meet all gates. `) +
  `The remaining capture-count difference is reported separately: ` +
  `field alignment ran ${count(before,"field_scroll")} → ${count(after,"field_scroll")} cycles. ` +
  `Each such cycle includes a scroll, settling wait and fresh observation. ` +
  `Those checks were NOT deleted; the unchanged driver needed a different number. ` +
  `The entire wall-time difference must not be attributed solely to the 30 removals.\n\n` +
  `All 30 numeric values, all 30 persisted values, query/product navigation and cleanup ` +
  `must pass. Only full, explicitly recognized alignment cycles are normalized for ` +
  `the retained-other-work gate; reported elapsed times/counts are NEVER normalized. ` +
  `Other polling/operation differences fail that gate. Explicit OCR is one call each; ` +
  `this is not an independently instrumented screenshot count.\n\n` +
  `## Limits\n\n` +
  `Source/API workflow only: not model latency, active Pi tools, all Amazon offers, ` +
  `independent exercise-name/stock/detail-price checks, or hard process-group cancellation. ` +
  `See the protocol/evidence for preserved failures and test drafts. Driver/engine hashes ` +
  `record provenance, not cryptographic attestation of a report. Input/UI/network/host ` +
  `load can vary. Raw errors, page content, device identifiers and private paths are not ` +
  `copied into this comparison. Earlier v1 timings are NOT the reference for v2.\n`;
await writeFile(output, md, {flag:"wx",mode:0o600});
console.log(JSON.stringify({passed,gates,savedMs:delta,reductionPct:before.durationMs>0?100*delta/before.durationMs:null}));
process.exitCode = passed ? 0 : 1;
