#!/usr/bin/env node
// Offline audit for this instrumentation pair; never use the migration comparator.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const [beforePath, afterPath, focusBeforePath, focusAfterPath, output] = process.argv.slice(2);
if (!output) throw Error("Expected workflow before/after, fixture before/after and NEW output");
const [before, after, focusBefore, focusAfter] = await Promise.all(
  [beforePath, afterPath, focusBeforePath, focusAfterPath].map(async path => JSON.parse(await readFile(path, "utf8"))));
const high = ["device_dump", "xml_transfer", "xml_read", "xml_parse", "foreground"];
const image = ["screenshot_capture", "screenshot_transfer", "screenshot_dimensions", "screenshot_read", "ocr_availability", "ocr_engine", "ocr_parse"];
const fixed = new Set([...high, ...image, "adb_attempt"]);
const finite = n => Number.isFinite(n) && n >= 0;
function spans(rows, elapsed) {
  for (const s of rows) {
    assert(fixed.has(s.stage) && s.outcome === "ok" && finite(s.startMs) && finite(s.durationMs));
    assert.deepEqual(Object.keys(s).sort(), ["durationMs", "outcome", "stage", "startMs"]);
    if (elapsed !== undefined) assert(s.startMs + s.durationMs <= elapsed);
  }
}
function workflow(r) {
  assert.equal(r.status, "pass");
  assert.equal(r.kind, "source-workflow-e2e-v2");
  assert.equal(r.selectionStrategy, "bounded-read-select-tap");
  const names = ["fixture_screen_1080x2340", "amazon_search_field", "amazon_search_focused", "amazon_query_readback",
    "three_fixed_comparable_offers", "chosen_product_visible", "amazon_product_open", "forge_popup_parent_activity",
    "forge_six_template_options", "new_lower_draft", "draft_card_visible", "draft_title_reopened", "original_ime_restored", "termux_restored"];
  for (let n = 1; n <= 5; n++) {
    names.push(`exercise_${n}_six_fields`, `exercise_${n}_readback`, `exercise_${n}_persisted`);
    assert(r.checks.some(c => c.name === `exercise_${n}_persisted_field_count` && c.count === 6));
  }
  assert.equal(r.checks.length, 34);
  assert.equal(new Set(r.checks.map(c => c.name)).size, 34);
  for (const name of names) assert(r.checks.some(c => c.name === name && c.ok === true));
  for (const op of r.operations) assert(op.outcome === "ok" && finite(op.startMs) && finite(op.durationMs));
  spans(r.captureSpans);
  assert.equal(r.captureSpansTruncated, false);
  const count = stage => r.operations.filter(o => o.stage === stage).length;
  const captures = r.captureSpans.filter(s => s.stage === "device_dump").length;
  assert.equal(count("select_tap"), 30);
  assert.equal(count("type"), 32);
  assert.equal(count("ocr"), 1);
  assert.equal(captures, count("ui_dump") + 30);
  assert.equal(r.captureCounts.completedDeviceDumps, captures);
  assert.equal(r.captureCounts.captureStageErrors, 0);
  assert.equal(r.captureCounts.explicitOcrCalls, 1);
  for (const stage of high) assert.equal(r.captureSpans.filter(s => s.stage === stage).length, captures);
  const attempts = r.captureSpans.filter(s => s.stage === "adb_attempt").length;
  assert.equal(attempts, captures * 3 + 60);
  const sequence = [];
  let alignmentMs = 0;
  for (let i = 0; i < r.operations.length; i++) {
    if (r.operations[i].stage === "field_scroll") {
      assert.equal(r.operations[i+1]?.stage, "settle");
      assert.equal(r.operations[i+2]?.stage, "ui_dump");
      alignmentMs += r.operations.slice(i, i+3).reduce((sum, o) => sum + o.durationMs, 0);
      i += 2;
    } else sequence.push(r.operations[i].stage);
  }
  return { elapsedMs: r.durationMs, operations: r.operations.length, captures, attempts,
    alignmentCycles: count("field_scroll"), alignmentMs, sequence,
    driverHash: r.harnessHash, consumerHash: r.consumerHash, engineHash: r.engineHash };
}
const a = workflow(before), b = workflow(after);
assert.deepEqual(a.sequence, b.sequence);
assert.deepEqual(before.checks, after.checks);
assert.deepEqual(before.publicOffers, after.publicOffers);
assert.equal(a.driverHash, b.driverHash);
assert.equal(a.consumerHash, b.consumerHash);
assert.notEqual(a.engineHash, b.engineHash);
for (const [file, expected] of [["scripts/workflow-v2.mjs", b.driverHash], ["scripts/workflow-field-action.mjs", b.consumerHash]])
  assert.equal(createHash("sha256").update(await readFile(file)).digest("hex"), expected);
function focused(r, changed) {
  assert.equal(r.status, "pass"); assert(r.imeUnchanged && r.termuxRestored);
  assert.equal(r.samples.length, 9);
  const out = {};
  for (const api of ["screenshot", "base64", "ocr"]) {
    const samples = r.samples.filter(s => s.api === api);
    assert.deepEqual(samples.map(s => s.round), [1, 2, 3]);
    for (const s of samples) {
      assert(s.outcome === "ok" && s.traceComplete && !s.spansTruncated && finite(s.ms));
      spans(s.spans, s.ms);
      const expected = api === "screenshot" ? ["adb_attempt", "screenshot_capture", "adb_attempt", "screenshot_transfer", "adb_attempt", "screenshot_dimensions", "screenshot_read"] :
        api === "base64" ? ["adb_attempt", "screenshot_capture", "adb_attempt", "screenshot_transfer", "screenshot_read"] :
        ["adb_attempt", "screenshot_capture", "adb_attempt", "screenshot_transfer", "adb_attempt", "screenshot_dimensions", "ocr_availability", "ocr_engine", "ocr_parse"];
      assert.deepEqual(s.spans.map(s => s.stage), changed ? expected : expected.filter(s => s === "adb_attempt"));
    }
    const sorted = samples.map(s => s.ms).sort((a,b) => a-b);
    out[api] = { attempts: 3, failures: 0, medianMs: sorted[1], totalMs: sorted.reduce((a,b) => a+b,0),
      spans: samples.reduce((n,s) => n+s.spans.length,0) };
  }
  return out;
}
assert.equal(focusBefore.driverHash, focusAfter.driverHash);
assert.notEqual(focusBefore.sourceHash, focusAfter.sourceHash);
const fa = focused(focusBefore, false), fb = focused(focusAfter, true);
const fixture = Object.fromEntries(Object.keys(fa).map(api => [api, { before: fa[api], after: fb[api],
  medianDeltaMs: fb[api].medianMs-fa[api].medianMs, medianDeltaPct: 100*(fb[api].medianMs/fa[api].medianMs-1) }]));
const { sequence: _a, ...wa } = a; const { sequence: _b, ...wb } = b;
await writeFile(output, JSON.stringify({ kind: "screenshot-ocr-instrumentation-pair", passed: true,
  before: wa, after: wb, deltaMs: b.elapsedMs-a.elapsedMs, deltaPct: 100*(b.elapsedMs/a.elapsedMs-1),
  fixture, fixtureDriverHash: focusBefore.driverHash,
  limits: ["Failed after attempt 1 is retained separately; this comparison uses passing after attempt 2.",
    "Workflow counts trace hierarchy/selection only; no independent screenshot counts or traceComplete flag.",
    "Fixture has three rounds per API and synchronous local sink completeness, not IPC or tool-clock completeness.",
    "Raw elapsed/counts are not normalized; extra alignment cycles are not instrumentation overhead.",
    "No demonstrated speedup, isolated overhead estimate, population or non-inferiority claim."] }, null, 2), { flag: "wx", mode: 0o600 });
console.log("Instrumentation pair checks passed");
