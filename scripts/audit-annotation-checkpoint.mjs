#!/usr/bin/env node
// Offline checkpoint audit, including BLOCKED workflow acceptance. Not a passing-pair comparator.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const [wb, wa1, wa2, fb, fa, lb, la, output] = process.argv.slice(2);
assert(output, "Expected workflow before/two failed afters, focused pair, loaded pair, NEW output");
const read = async p => JSON.parse(await readFile(p, "utf8"));
const [before, ...rest] = await Promise.all([wb, wa1, wa2, fb, fa, lb, la].map(read));
const [after1, after2, focusBefore, focusAfter, loadedBefore, loadedAfter] = rest;
const sha = data => createHash("sha256").update(data).digest("hex");
const finite = n => Number.isFinite(n) && n >= 0;
const high = ["device_dump", "xml_transfer", "xml_read", "xml_parse", "foreground"];
const added = ["annotation_screenshot", "annotation_ui_dump", "annotation_map", "annotation_text_index"];
const fixed = new Set([...high, ...added, "adb_attempt", "screenshot_capture", "screenshot_transfer", "screenshot_dimensions", "screenshot_read"]);
function spans(rows, elapsed) {
  for (const s of rows) {
    assert(fixed.has(s.stage) && s.outcome === "ok" && finite(s.startMs) && finite(s.durationMs));
    assert.deepEqual(Object.keys(s).sort(), ["durationMs", "outcome", "stage", "startMs"]);
    if (elapsed !== undefined) assert(s.startMs + s.durationMs <= elapsed);
  }
}
// Hash source bytes independently, never treating a report's hash as attestation alone.
async function engineHash(names, baseline, suffix) {
  const h = createHash("sha256");
  for (const name of names) {
    const file = `src/adb/${name}${suffix}`;
    h.update(name).update(baseline ? execFileSync("git", ["show", `09c3cc8:${file}`]) : await readFile(file));
  }
  return h.digest("hex");
}
const engine = ["exec.ts", "capture-timing.ts", "ui-tree.ts", "cache.ts", "input.ts", "read-select-tap.ts", "app.ts", "ocr.ts", "screenshot.ts"];
const focusedEngine = ["annotate", "screenshot", "ui-tree", "ocr", "cache", "exec", "capture-timing"];
const beforeEngine = await engineHash(engine, true, ""), afterEngine = await engineHash(engine, false, "");
const driverHash = sha(await readFile("scripts/workflow-v2.mjs"));
const consumerHash = sha(await readFile("scripts/workflow-field-action.mjs"));
const shopping = ["fixture_screen_1080x2340", "amazon_search_field", "amazon_search_focused", "amazon_query_readback", "three_fixed_comparable_offers", "chosen_product_visible"];
const cleanup = ["original_ime_restored", "termux_restored"];
function workflow(r, baseline) {
  assert.equal(r.schemaVersion, 2); assert.equal(r.kind, "source-workflow-e2e-v2");
  assert.equal(r.selectionStrategy, "bounded-read-select-tap");
  assert.equal(r.harnessHash, driverHash); assert.equal(r.consumerHash, consumerHash);
  assert.equal(r.engineHash, baseline ? beforeEngine : afterEngine);
  assert(finite(r.durationMs) && r.captureSpansTruncated === false);
  spans(r.captureSpans);
  for (const op of r.operations) assert(op.outcome === "ok" && finite(op.startMs) && finite(op.durationMs) && op.startMs + op.durationMs <= r.durationMs);
  const count = s => r.operations.filter(o => o.stage === s).length;
  const captures = r.captureSpans.filter(s => s.stage === "device_dump").length;
  assert.equal(r.captureCounts.completedDeviceDumps, captures);
  assert.equal(r.captureCounts.captureStageErrors, 0);
  assert.equal(r.captureCounts.explicitOcrCalls, count("ocr"));
  assert.equal(captures, count("ui_dump") + count("select_tap"));
  for (const s of high) assert.equal(r.captureSpans.filter(x => x.stage === s).length, captures);
  const attempts = r.captureSpans.filter(s => s.stage === "adb_attempt").length;
  assert.equal(attempts, captures * 3 + 2 * count("select_tap"));
  assert.deepEqual(r.publicOffers, before.publicOffers);
  if (baseline) {
    assert.equal(r.status, "pass"); assert.equal(r.phase, "before");
    const names = [...shopping, "amazon_product_open", "forge_popup_parent_activity", "forge_six_template_options", "new_lower_draft", "draft_card_visible", "draft_title_reopened", ...cleanup];
    for (let n = 1; n <= 5; n++) {
      names.push(`exercise_${n}_six_fields`, `exercise_${n}_readback`, `exercise_${n}_persisted`);
      assert(r.checks.some(c => c.name === `exercise_${n}_persisted_field_count` && c.count === 6));
    }
    assert.equal(r.checks.length, 34); assert.equal(new Set(r.checks.map(c => c.name)).size, 34);
    for (const name of names) assert(r.checks.some(c => c.name === name && c.ok === true));
    assert.equal(count("select_tap"), 30); assert.equal(count("type"), 32); assert.equal(count("ocr"), 1);
  } else {
    assert.equal(r.status, "fail"); assert.equal(r.phase, "after"); assert.equal(r.failureCheckpoint, "assertion");
    assert.deepEqual(r.checks, [...shopping.map(name => ({ name, ok: name !== "chosen_product_visible" })), ...cleanup.map(name => ({ name, ok: true }))]);
    assert.equal(count("select_tap"), 0); assert.equal(count("type"), 1); assert.equal(count("ocr"), 0);
    assert.equal(count("app"), 0); // failed before Forge navigation/draft creation
  }
  return { status: r.status, elapsedMs: r.durationMs, operations: r.operations.length, captures,
    scopedCommandAttempts: attempts, fieldSelections: count("select_tap"), explicitOcrCalls: count("ocr"),
    captureSpansTruncated: r.captureSpansTruncated, captureStageErrors: r.captureCounts.captureStageErrors,
    driverHash: r.harnessHash, consumerHash: r.consumerHash, engineHash: r.engineHash };
}
const workflows = [workflow(before, true), workflow(after1, false), workflow(after2, false)];
async function focused(r, changed) {
  assert.equal(r.kind, "annotation-fixture"); assert.equal(r.status, "pass"); assert(r.imeUnchanged && r.termuxRestored);
  assert.equal(r.driverHash, sha(await readFile("scripts/annotation-check.mjs")));
  assert.equal(r.sourceHash, await engineHash(focusedEngine, !changed, ".ts"));
  assert.equal(r.samples.length, 6);
  const out = {};
  for (const all of [false, true]) {
    const rows = r.samples.filter(s => s.allElements === all);
    assert.deepEqual(rows.map(s => s.round), [1, 2, 3]);
    for (const s of rows) {
      assert(s.outcome === "ok" && s.traceComplete === true && s.spansTruncated === false && finite(s.ms));
      assert.equal(s.includeBase64, all); assert.equal(s.count, all ? 46 : 10);
      spans(s.spans, s.ms);
      const counts = Object.fromEntries([...fixed].map(stage => [stage, s.spans.filter(x => x.stage === stage).length]));
      for (const stage of high) assert.equal(counts[stage], 1);
      for (const stage of ["screenshot_capture", "screenshot_transfer", "screenshot_dimensions"]) assert.equal(counts[stage], 1);
      assert.equal(counts.adb_attempt, 6); assert.equal(counts.screenshot_read, all ? 1 : 0);
      for (const stage of added) assert.equal(counts[stage], changed ? 1 : 0);
      if (changed) {
        const shot = s.spans.find(x => x.stage === "annotation_screenshot");
        const tree = s.spans.find(x => x.stage === "annotation_ui_dump");
        assert(Math.max(shot.startMs, tree.startMs) < Math.min(shot.startMs + shot.durationMs, tree.startMs + tree.durationMs));
        for (const span of s.spans.filter(x => high.includes(x.stage) || x.stage.startsWith("screenshot_"))) {
          const parent = span.stage.startsWith("screenshot_") ? shot : tree;
          assert(span.startMs >= parent.startMs && span.startMs + span.durationMs <= parent.startMs + parent.durationMs);
        }
        assert.deepEqual(s.spans.slice(-2).map(x => x.stage), ["annotation_map", "annotation_text_index"]);
        assert(s.spans.at(-2).startMs >= Math.max(shot.startMs + shot.durationMs, tree.startMs + tree.durationMs));
      }
    }
    const sorted = rows.map(s => s.ms).sort((a,b) => a-b);
    out[all ? "allWithBase64" : "interactiveNoBase64"] = { attempts: 3, failures: 0, medianMs: sorted[1],
      totalMs: sorted.reduce((a,b) => a+b, 0), spans: rows.reduce((n,s) => n+s.spans.length, 0) };
  }
  return out;
}
const a = await focused(focusBefore, false), b = await focused(focusAfter, true);
for (const r of [loadedBefore, loadedAfter]) {
  assert.equal(r.status, "pass"); assert(r.imeUnchanged && r.termuxRestored);
  assert.equal(r.driverHash, sha(await readFile("scripts/annotation-loaded-check.mjs")));
  assert.equal(r.tools.length, 1); assert.equal(r.tools[0].tool, "android_look");
  assert(r.tools[0].outcome === "ok" && finite(r.tools[0].durationMs));
  for (const key of ["exactlyOneMatchingCall", "noToolError", "nativeTitleAndOpen", "agentSettledNotAborted", "buildUnchanged"]) assert.equal(r.checks[key], true);
}
for (const [file, hash] of Object.entries(loadedAfter.buildHashes)) assert.equal(sha(await readFile(file)), hash);
assert.notEqual(loadedBefore.buildHashes["dist/adb/annotate.js"], loadedAfter.buildHashes["dist/adb/annotate.js"]);
await writeFile(output, JSON.stringify({ kind: "annotation-checkpoint-audit", auditPassed: true,
  fullWorkflowAcceptance: "open", workflowDelta: null, workflows,
  focused: Object.fromEntries(Object.keys(a).map(key => [key, { before: a[key], after: b[key],
    medianDeltaMs: b[key].medianMs-a[key].medianMs, medianDeltaPct: 100*(b[key].medianMs/a[key].medianMs-1) }])),
  loadedToolMs: { before: loadedBefore.tools[0].durationMs, after: loadedAfter.tools[0].durationMs },
  limits: ["Both after workflows failed before Forge; no passing wall-time/30-write/persistence comparison.",
    "Focused pair has three samples/mode; no isolated overhead/non-inferiority/speedup claim.",
    "Baseline sibling clocks independent; after shared clock; nested sums are not elapsed wall time.",
    "Focused synchronous-sink traceComplete is not IPC/tool completeness. Workflow has no traceComplete flag or independent screenshot count.",
    "Loaded tools are actual fresh sessions with default-disabled source diagnostics; clocks not merged."] }, null, 2), { flag: "wx", mode: 0o600 });
console.log("Checkpoint audit passes; full-workflow acceptance remains OPEN");
