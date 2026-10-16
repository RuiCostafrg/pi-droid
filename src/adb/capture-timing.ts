import { performance } from "node:perf_hooks";

/** Fixed vocabulary only: never attach commands, selectors, content or errors. */
export type CaptureStage = "cache_lookup" | "device_dump" | "xml_transfer" |
  "xml_read" | "xml_parse" | "foreground" | "ocr_fallback";

export interface CaptureSpan {
  stage: CaptureStage;
  startMs: number;
  durationMs: number;
  outcome: "ok" | "error";
  /** Present only on a cache lookup; skipCache produces no lookup span. */
  cacheHit?: boolean;
}

export type CaptureSpanSink = (span: CaptureSpan) => void;

/** Per-observation clock and sink, never global; diagnostics cannot break capture. */
export function captureTiming(sink?: CaptureSpanSink) {
  const origin = sink ? performance.now() : 0;
  function finish(stage: CaptureStage, start: number, outcome: CaptureSpan["outcome"], cacheHit?: boolean) {
    if (!sink) return;
    const span: CaptureSpan = {
      stage, startMs: start - origin, durationMs: performance.now() - start, outcome,
      ...(cacheHit === undefined ? {} : { cacheHit }),
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
      } finally { finish(stage, start, outcome, cacheHit); }
    },
    async async<T>(stage: CaptureStage, operation: () => Promise<T>): Promise<T> {
      if (!sink) return operation();
      const start = performance.now();
      let outcome: CaptureSpan["outcome"] = "error";
      try {
        const value = await operation();
        outcome = "ok";
        return value;
      } finally { finish(stage, start, outcome); }
    },
  };
}
