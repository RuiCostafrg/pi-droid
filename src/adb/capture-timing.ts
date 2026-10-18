import { performance } from "node:perf_hooks";
import { AdbError, type ExecutionFailureKind } from "./exec.js";

/** Fixed vocabulary only: never attach commands, selectors, content or errors. */
export type CaptureStage = "cache_lookup" | "device_dump" | "xml_transfer" |
  "xml_read" | "xml_parse" | "foreground" | "ocr_fallback" |
  "adb_attempt" | "reconnect" | "reconnect_discovery" | "reconnect_connect" | "screenshot_capture" | "screenshot_transfer" |
  "screenshot_dimensions" | "screenshot_read" | "ocr_availability" | "ocr_engine" | "ocr_parse" | "annotation_screenshot" |
  "annotation_ui_dump" | "annotation_map" | "annotation_text_index";

export interface CaptureSpan {
  stage: CaptureStage;
  startMs: number;
  durationMs: number;
  outcome: "ok" | "error";
  /** Fixed category only; absent for successes. Non-ADB errors are unknown. */
  failureKind?: ExecutionFailureKind;
  /** Present only on a cache lookup; skipCache produces no lookup span. */
  cacheHit?: boolean;
}

export type CaptureSpanSink = (span: CaptureSpan) => void;
export type CaptureTiming = ReturnType<typeof captureTiming>;

/** Per-observation clock and sink, never global; diagnostics cannot break capture. */
export function captureTiming(sink?: CaptureSpanSink) {
  const origin = sink ? performance.now() : 0;
  function finish(stage: CaptureStage, start: number, outcome: CaptureSpan["outcome"], cacheHit?: boolean, failureKind?: ExecutionFailureKind) {
    if (!sink) return;
    const span: CaptureSpan = {
      stage, startMs: start - origin, durationMs: performance.now() - start, outcome,
      ...(cacheHit === undefined ? {} : { cacheHit }),
      ...(failureKind === undefined ? {} : { failureKind }),
    };
    try { sink(span); } catch { /* Diagnostic consumers must not alter capture behavior. */ }
  }
  return {
    sync<T>(stage: CaptureStage, operation: () => T): T {
      if (!sink) return operation();
      const start = performance.now();
      let outcome: CaptureSpan["outcome"] = "error";
      let cacheHit: boolean | undefined;
      try {
        const value = operation();
        outcome = "ok";
        if (stage === "cache_lookup") cacheHit = value !== null;
        return value;
      } catch (error) {
        finish(stage, start, "error", cacheHit, error instanceof AdbError ? error.failureKind : "unknown");
        throw error;
      } finally { if (outcome === "ok") finish(stage, start, outcome, cacheHit); }
    },
    async async<T>(stage: CaptureStage, operation: () => Promise<T>): Promise<T> {
      if (!sink) return operation();
      const start = performance.now();
      let outcome: CaptureSpan["outcome"] = "error";
      try {
        const value = await operation();
        outcome = "ok";
        return value;
      } catch (error) {
        finish(stage, start, "error", undefined, error instanceof AdbError ? error.failureKind : "unknown");
        throw error;
      } finally { if (outcome === "ok") finish(stage, start, outcome); }
    },
  };
}
