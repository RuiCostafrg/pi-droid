// Development harness: execute the current source, not potentially stale dist/.
import { dumpUiTree, setUiDumpDir, findElements } from "../src/adb/ui-tree.ts";
import { performance } from "node:perf_hooks";

process.once("message", async ({ config, directory, serial }) => {
  setUiDumpDir(directory);
  const start = performance.now();
  let result;
  try {
    const tree = await dumpUiTree({
      serial, skipCache: true, autoReconnect: false,
      onCaptureSpan: config.trace ? span => {
        // Send completed stages immediately, before a later stage can hang.
        if (process.connected) process.send({ type: "span", span }, () => {});
      } : undefined,
      timeout: config.observationMs, ocrFallback: false, requireDumpSuccess: true,
    });
    const correct = tree.source === "uiautomator" &&
      tree.foregroundPackage === config.foregroundPackage &&
      config.assertions.every(assertion => {
        const matches = findElements(tree.elements, { resourceId: assertion.resourceId });
        return matches.length === 1 && matches.every(el =>
          el.text === assertion.text &&
          (!assertion.className || el.className === assertion.className) &&
          (!assertion.bounds || ["left", "top", "right", "bottom"].every(
            key => el.bounds[key] === assertion.bounds[key])));
      });
    result = { outcome: correct ? "ok" : "incorrect", captureMs: performance.now() - start };
  } catch {
    // Never serialize commands, errors, page text, identifiers or selectors.
    result = { outcome: "error", captureMs: performance.now() - start };
  }
  process.send({ type: "result", ...result }, () => process.disconnect());
});
