#!/usr/bin/env node
// V3.2: zero-area offscreen geometry cannot reverse product alignment. Measured v3/v3.1 stay frozen.
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { writeFile, readFile, access } from "node:fs/promises";
import { selectWorkflowField, selectionStrategy } from "./workflow-field-action.mjs";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";

if (process.env.PI_DROID_WORKFLOW_E2E !== "1" || !process.env.ANDROID_SERIAL ||
    !["before", "after"].includes(process.argv[2]) || !process.argv[3]) {
  console.error("Opt in with PI_DROID_WORKFLOW_E2E=1 ANDROID_SERIAL=current; arguments: before|after /private/NEW-report.json");
  process.exit(2);
}
if (process.env.PI_DROID_E2E_SOURCE) throw Error("v2 pins the current source tree");
try { await access(process.argv[3]); throw Error("Refusing existing report"); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const root = resolve(".");
const moduleAt = name => import(pathToFileURL(join(root, `src/adb/${name}.ts`)).href);
const { adbShell, getForegroundPackage, getScreenSize } = await moduleAt("exec");
const { dumpUiTree } = await moduleAt("ui-tree");
const { tap, swipe, typeText, keyEvent } = await moduleAt("input");
const { launchApp } = await moduleAt("app");
const { runOcrOnCurrentScreen } = await moduleAt("ocr");
const start = performance.now();
const options = { serial: process.env.ANDROID_SERIAL, exactSerial: true, autoReconnect: false, timeout: 15000 };
const runId = process.env.PI_DROID_E2E_RUN_ID ?? process.argv[2];
if (!/^[a-z0-9-]{1,32}$/.test(runId)) throw Error("Invalid public run label");
const titleToken = `source-${runId}`;
const title = `E2E Lower v3.2 ${titleToken}`;
const engineFiles = ["exec.ts", "capture-timing.ts", "ui-tree.ts", "cache.ts", "input.ts",
  "read-select-tap.ts", "app.ts", "ocr.ts", "screenshot.ts", "annotate.ts"];
const engineHash = createHash("sha256");
const sourceHashes = {};
for (const file of engineFiles) {
  const bytes = await readFile(join(root, "src/adb", file));
  engineHash.update(file).update(bytes);
  sourceHashes[file] = createHash("sha256").update(bytes).digest("hex");
}
const report = { schemaVersion: 3, kind: "source-workflow-e2e-v3", protocolRevision: "3.2", selectionStrategy, sourceHashes,
  consumerHash: createHash("sha256").update(await readFile(new URL("./workflow-field-action.mjs", import.meta.url))).digest("hex"),
  engineHash: engineHash.digest("hex"), phase: process.argv[2],
  startedAt: new Date().toISOString(),
  harnessHash: createHash("sha256").update(await readFile(new URL(import.meta.url))).digest("hex"),
  status: "fail", checks: [], operations: [], captureSpans: [], captureSpansTruncated: false,
  protocol: { maxProductScrolls: 8, visibleMinY: 200, visibleMaxY: 1900, productStepPx: 350, gestureMs: 600 },
  productAlignment: [], captureContexts: [], numericWrites: [], persistedValues: [],
  limits: ["Source workflow does not invoke annotation or actual registered Pi tools.",
    "Source spans use independent per-capture clocks; outer operation clocks must not be merged.",
    "Scoped command spans are not whole-workflow ADB counts. No independent screenshot count.",
    "Failed capture contexts are partial; no whole-workflow traceComplete claim."] };
let originalIme;
function check(name, ok) {
  report.checks.push({ name, ok: !!ok });
  if (!ok) throw Error("assertion");
}
async function operation(stage, fn, cleanup = false) {
  if (!cleanup && performance.now() - start > 900000) throw Error("budget");
  const begin = performance.now();
  let outcome = "error";
  try { const result = await fn(); outcome = "ok"; return result; }
  finally { report.operations.push({ stage, startMs: begin - start, durationMs: performance.now() - begin, outcome }); }
}
const shell = command => operation("shell", () => adbShell(command, options));
const settle = () => operation("settle", () => new Promise(resolve => setTimeout(resolve, 500)));
const key = async code => { await operation("key", () => keyEvent(code, options)); await settle(); };
const scroll = async () => { await operation("swipe", () => swipe(80, 1700, 80, 650, { ...options, duration: 400 })); await settle(); };
function captureSpan(span) {
  if (report.captureSpans.length < 2000) report.captureSpans.push(span);
  else report.captureSpansTruncated = true;
}
async function tracedCapture(kind, fn) {
  const context = { id: report.captureContexts.length, kind, spans: [], traceComplete: false, spansTruncated: false };
  report.captureContexts.push(context);
  const begin = performance.now();
  try {
    const result = await fn(span => {
      captureSpan(span);
      if (context.spans.length < 128) context.spans.push(span);
      else context.spansTruncated = true;
    });
    context.traceComplete = !context.spansTruncated;
    return result;
  } finally { context.durationMs = performance.now() - begin; }
}
async function look(pkg) {
  const tree = await operation("ui_dump", () => tracedCapture("ui_dump", onCaptureSpan => dumpUiTree({ ...options,
    skipCache: true, ocrFallback: false, requireDumpSuccess: true, throwOnError: true,
    onCaptureSpan,
  })));
  if (tree.foregroundPackage !== pkg) throw Error("foreground");
  return tree;
}
async function click(x, y, pkg) {
  const tree = await look(pkg);
  // Fail closed when the observed control moved. No stale coordinates.
  if (!tree.interactive.some(e => Math.abs(e.center.x - x) < 6 && Math.abs(e.center.y - y) < 6))
    throw Error("control");
  await operation("tap", () => tap(x, y, options));
  await settle();
}
async function replaceAt(x, y, value) {
  await click(x, y, "app.forge.gym");
  // Deliberate explicit workaround, not a claim that clear_first works.
  await shell("am broadcast -a ADB_CLEAR_TEXT");
  await operation("type", () => typeText(value, options));
  await key("KEYCODE_BACK");
}
function numeric(tree) {
  return tree.elements.filter(e => e.className.endsWith("EditText") && /^\d+$/.test(e.text) &&
    e.center.y > 100 && e.center.y < 2100);
}
async function alignFields(tree) {
  for (let retry = 0; retry < 3 && numeric(tree).length !== 6; retry++) {
    const clippedTop = tree.elements.some(e => e.className.endsWith("EditText") &&
      /^\d+$/.test(e.text) && e.center.y <= 100);
    await operation("field_scroll", () => swipe(80, 1400, 80, clippedTop ? 1750 : 1050,
      { ...options, duration: 400 }));
    await settle();
    tree = await look("app.forge.gym");
  }
  return tree;
}
function expectedFields(tree) {
  const fields = numeric(tree);
  return fields.length === 6 && fields.every(e => e.text === (e.center.x < 500 ? "20" : "8"));
}
function nextHeader(tree) {
  const bottom = Math.max(...numeric(tree).map(e => e.center.y));
  return tree.interactive.find(e => Math.abs(e.center.x - 918) < 6 &&
    e.center.y > bottom + 300 && e.center.y < 2250);
}
try {
  originalIme = await shell("settings get secure default_input_method");
  if (!/^[A-Za-z0-9_.]+\/[A-Za-z0-9_.]+$/.test(originalIme)) throw Error("ime");
  const size = await operation("screen_size", () => getScreenSize(options));
  check("fixture_screen_1080x2340", size.width === 1080 && size.height === 2340);
  await shell("ime set com.android.adbkeyboard/.AdbIME");
  await shell("am start -W -a android.intent.action.VIEW -d https://www.amazon.de -p com.brave.browser");
  let tree;
  let search;
  let previousSearch;
  for (let attempt = 0; attempt < 3 && !search; attempt++) {
    tree = await look("com.brave.browser");
    const matches = tree.elements.filter(e => e.resourceId === "nav-search-keywords" &&
      e.className.endsWith("EditText") && e.center.y > 300 && e.center.y < 500);
    const current = matches.length === 1 ? matches[0] : undefined;
    if (current && previousSearch && current.center.x === previousSearch.center.x &&
        current.center.y === previousSearch.center.y) search = current;
    previousSearch = current;
  }
  check("amazon_search_field", search);
  await click(search.center.x, search.center.y, "com.brave.browser");
  tree = await look("com.brave.browser");
  const searchNode = (tree.rawXml.match(/<node\s[^>]+>/g) ?? []).find(node =>
    node.includes('resource-id="nav-search-keywords"'));
  check("amazon_search_focused", searchNode?.includes('focused="true"'));
  await shell("am broadcast -a ADB_CLEAR_TEXT");
  await operation("type", () => typeText("Mandelmilch", options));
  tree = await look("com.brave.browser");
  check("amazon_query_readback", tree.elements.some(e => e.className.endsWith("EditText") && e.text === "Mandelmilch"));
  await key("KEYCODE_ENTER");
  let offers = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    tree = await look("com.brave.browser");
    const texts = tree.elements.map(e => e.text || e.contentDesc);
    offers = [];
    for (const pattern of [/^Alpro Almond Drink Without Sugar, 8 x 1 L/, /^Alpro Almond Drink Original - 8 x 1 L/, /^Alpro Barista Almond Plant-Based/]) {
      const index = texts.findIndex(text => pattern.test(text));
      if (index < 0) continue;
      const price = texts.slice(index, index + 35).find(text => /€\d+[.,]\d{2}.*€\d+[.,]\d{2}\s*\/\s*l/.test(text));
      const match = price?.match(/€(\d+[.,]\d{2}).*?€(\d+[.,]\d{2})\s*\/\s*l/);
      if (match) offers.push({ total: Number(match[1].replace(",", ".")), perLitre: Number(match[2].replace(",", ".")), index });
    }
    if (offers.length === 3) break;
  }
  check("three_fixed_comparable_offers", offers.length === 3);
  report.publicOffers = offers.map(({ total, perLitre }) => ({ total, perLitre }));
  const chosen = offers.reduce((a, b) => b.perLitre < a.perLitre ? b : a);
  const identity = tree.elements[chosen.index].text || tree.elements[chosen.index].contentDesc;
  if (!identity) throw Error("product_identity");
  report.chosenProduct = { offerIndex: offers.indexOf(chosen),
    identityHash: createHash("sha256").update(identity).digest("hex") };
  function productAt(snapshot, phase, attempt) {
    const matches = snapshot.interactive.filter(e => e.enabled && e.clickable && !e.scrollable &&
      (e.text || e.contentDesc) === identity);
    // Multiple accessibility nodes may represent the SAME control. Different
    // positions are ambiguous and must never result in a tap.
    const positions = new Map(matches.map(e => [JSON.stringify([e.center, e.bounds]), e]));
    const product = positions.size === 1 ? [...positions.values()][0] : undefined;
    const visible = !!product && product.center.x > 0 && product.center.x < 1080 &&
      product.bounds.right > product.bounds.left && product.bounds.bottom > product.bounds.top &&
      product.center.y > 200 && product.center.y < 1900;
    report.productAlignment.push({ phase, attempt, distinctTargets: positions.size,
      visible, centerY: product?.center.y ?? null });
    if (positions.size > 1) throw Error("product_ambiguous");
    return { product, visible };
  }
  let aligned = productAt(tree, "observe", 0);
  let towardTop = false; // Initial forward search; retain direction through unknown geometry.
  for (let attempt = 1; !aligned.visible && attempt <= 8; attempt++) {
    const p = aligned.product;
    if (p && p.bounds.right > p.bounds.left && p.bounds.bottom > p.bounds.top)
      towardTop = p.center.y <= 200;
    await operation("product_scroll", () => swipe(80, towardTop ? 1000 : 1350, 80,
      towardTop ? 1350 : 1000, { ...options, duration: 600 }));
    await settle();
    tree = await look("com.brave.browser");
    aligned = productAt(tree, "observe", attempt);
  }
  // Confirm exact identity/actionability/visibility again from a fresh snapshot
  // immediately before tap; never reuse the clipped original coordinates.
  tree = await look("com.brave.browser");
  aligned = productAt(tree, "confirm", report.operations.filter(o => o.stage === "product_scroll").length);
  check("chosen_product_visible", aligned.visible);
  await operation("tap", () => tap(aligned.product.center.x, aligned.product.center.y, options));
  await settle();
  tree = await look("com.brave.browser");
  check("amazon_product_open", tree.elements.some(e => e.resourceId === "com.brave.browser:id/url_bar" && e.text.includes("/dp/")));

  await operation("app", () => launchApp("app.forge.gym", options));
  await click(128, 2109, "app.forge.gym"); // Overview resets section scroll.
  await click(403, 2109, "app.forge.gym");
  await click(965, 296, "app.forge.gym");
  await click(540, 1116, "app.forge.gym");
  // Android popup foreground may be unknown, but parent activity must be Forge.
  check("forge_popup_parent_activity", (await shell("dumpsys activity activities | grep mResumedActivity")).includes("app.forge.gym/"));
  tree = await operation("ui_dump", () => tracedCapture("ui_dump", onCaptureSpan => dumpUiTree({ ...options, skipCache: true,
    ocrFallback: false, requireDumpSuccess: true, throwOnError: true, onCaptureSpan })));
  check("forge_six_template_options", tree.interactive.length === 6 && tree.interactive.some(e => e.center.x === 330 && e.center.y === 1766));
  await operation("tap", () => tap(330, 1766, options));
  await click(821, 1305, "app.forge.gym");
  tree = await look("app.forge.gym");
  check("new_lower_draft", tree.elements.some(e => e.className.endsWith("EditText") && e.text === "Lower session"));
  await replaceAt(540, 537, title);
  await scroll();
  for (let exercise = 1; exercise <= 5; exercise++) {
    tree = await look("app.forge.gym");
    tree = await alignFields(tree);
    check(`exercise_${exercise}_six_fields`, numeric(tree).length === 6);
    for (let field = 0; field < 6; field++) {
      const target = await operation("select_tap", () => tracedCapture("select_tap", onCaptureSpan => selectWorkflowField(elements => {
        const fields = numeric({ elements });
        if (fields.length !== 6 || !fields[field]) throw Error("field");
        return [fields[field]];
      }, { ...options, expectedPackage: "app.forge.gym", onCaptureSpan })));
      await settle();
      // Same clearing/input/key/readback on both strategies; only selection changes.
      await shell("am broadcast -a ADB_CLEAR_TEXT");
      await operation("type", () => typeText(target.center.x < 500 ? "20" : "8", options));
      await key("KEYCODE_BACK");
      report.numericWrites.push({ exercise, field, value: target.center.x < 500 ? "20" : "8" });
    }
    tree = await look("app.forge.gym");
    check(`exercise_${exercise}_readback`, expectedFields(tree));
    if (exercise < 5) {
      const header = nextHeader(tree);
      if (!header) throw Error("header");
      await click(header.center.x, header.center.y, "app.forge.gym");
      await scroll();
    }
  }
  await key("KEYCODE_BACK");
  await scroll();
  tree = await look("app.forge.gym");
  const ocr = await operation("ocr", () => runOcrOnCurrentScreen(options));
  const label = ocr.elements.find(e => e.text === titleToken);
  const draft = label && tree.interactive.find(e => e.center.x === 540 &&
    e.bounds.top <= label.center.y && e.bounds.bottom >= label.center.y &&
    e.bounds.left <= label.center.x && e.bounds.right >= label.center.x && !e.scrollable);
  check("draft_card_visible", draft);
  await click(draft.center.x, draft.center.y, "app.forge.gym");
  tree = await look("app.forge.gym");
  check("draft_title_reopened", tree.elements.some(e => e.className.endsWith("EditText") && e.text === title));
  await scroll();
  for (let exercise = 1; exercise <= 5; exercise++) {
    tree = await look("app.forge.gym");
    tree = await alignFields(tree);
    report.checks.push({ name: `exercise_${exercise}_persisted_field_count`, count: numeric(tree).length });
    check(`exercise_${exercise}_persisted`, expectedFields(tree));
    report.persistedValues.push({ exercise, values: numeric(tree).map(e => e.text) });
    if (exercise < 5) {
      const header = nextHeader(tree);
      if (!header) throw Error("header");
      await click(header.center.x, header.center.y, "app.forge.gym");
      await scroll();
    }
  }
  await key("KEYCODE_BACK");
  report.status = "pass";
} catch (error) {
  // Fixed assertions only; never retain errors, device identifiers or screen data.
  const checkpoints = new Set(["assertion", "budget", "ime", "foreground", "control", "field", "header", "product_identity", "product_ambiguous"]);
  report.failureCheckpoint = checkpoints.has(error?.message) ? error.message : "execution";
  report.status = "fail";
} finally {
  if (originalIme && /^[A-Za-z0-9_.]+\/[A-Za-z0-9_.]+$/.test(originalIme)) {
    try { await operation("restore_ime", () => adbShell(`ime set ${originalIme}`, options), true);
      check("original_ime_restored", (await adbShell("settings get secure default_input_method", options)) === originalIme);
    } catch { report.status = "fail"; }
  }
  try {
    await operation("restore_termux", () => launchApp("com.termux", options), true);
    check("termux_restored", await getForegroundPackage(options) === "com.termux");
  } catch { report.status = "fail"; }
  report.captureCounts = {
    completedDeviceDumps: report.captureSpans.filter(s => s.stage === "device_dump").length,
    captureStageErrors: report.captureSpans.filter(s => s.outcome === "error").length,
    explicitOcrCalls: report.operations.filter(op => op.stage === "ocr").length,
  };
  report.durationMs = performance.now() - start;
  await writeFile(process.argv[3], JSON.stringify(report, null, 2), { mode: 0o600, flag: "wx" });
}
console.log(JSON.stringify({ status: report.status, checks: report.checks, durationMs: report.durationMs }));
process.exitCode = report.status === "pass" ? 0 : 1;
