/** One fresh hierarchy, local synchronous selection, one guarded tap. */
import { performance } from "node:perf_hooks";
import { dumpUiTree } from "./ui-tree.js";
import { tap } from "./input.js";
import { getForegroundPackage, type AdbExecOptions } from "./exec.js";
import { getCacheRevision } from "./cache.js";
import type { UIElement } from "./types.js";
import type { CaptureSpanSink } from "./capture-timing.js";

export interface ReadSelectTapOptions extends AdbExecOptions {
  /** Exact authorized transport; never reconnects or remaps a target mid-operation. */
  serial: string;
  expectedPackage: string;
  /** Entire operation's cooperative deadline; default 15000, maximum 30000ms. */
  operationTimeoutMs?: number;
  /** Post-capture selection + foreground-check window; default 500, maximum 1000ms. */
  selectionMs?: number;
  onCaptureSpan?: CaptureSpanSink;
}

export type FreshUIElement = Omit<Readonly<UIElement>, "bounds" | "center" | "children"> & {
  readonly bounds: Readonly<UIElement["bounds"]>;
  readonly center: Readonly<UIElement["center"]>;
  readonly children: readonly FreshUIElement[];
};

/** Pure synchronous selection: return exactly one supplied element; never await. */
export type FreshTargetSelector = (elements: readonly FreshUIElement[]) => readonly FreshUIElement[];

function snapshot(element: UIElement): FreshUIElement {
  return Object.freeze({ ...element, bounds: Object.freeze({ ...element.bounds }),
    center: Object.freeze({ ...element.center }), children: Object.freeze(element.children.map(snapshot)) });
}

/**
 * Requires exclusive device interaction and trusted, pure synchronous callbacks.
 * No cached coordinates, screenshots, OCR, retries or snapshots accepted from callers.
 * Checks cannot make Android capture/input atomic or preempt a blocked JS callback.
 * A successful return means tap dispatch completed, NOT app-level success; read back.
 */
export async function readSelectTap(
  select: FreshTargetSelector,
  options: ReadSelectTapOptions,
): Promise<FreshUIElement> {
  if (typeof select !== "function" || !options || typeof options.serial !== "string" ||
      !options.serial.trim() || options.serial !== options.serial.trim() ||
      !/^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+$/.test(options.expectedPackage)) {
    throw new Error("readSelectTap requires a selector, exact serial and expected package");
  }
  const operationMs = options.operationTimeoutMs ?? 15000;
  const selectionMs = options.selectionMs ?? 500;
  if (!Number.isInteger(operationMs) || operationMs <= 0 || operationMs > 30000 ||
      !Number.isInteger(selectionMs) || selectionMs <= 0 || selectionMs > 1000) {
    throw new Error("Invalid readSelectTap deadline/window");
  }
  const start = performance.now();
  const controller = new AbortController();
  const abort = (kind: string) => {
    if (!controller.signal.aborted) controller.abort(new Error(`readSelectTap ${kind}`));
  };
  const cancel = () => abort("cancelled");
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();
  const timer = setTimeout(() => abort("timeout"), operationMs);
  timer.unref();
  const active = () => {
    if (performance.now() - start >= operationMs) abort("timeout");
    controller.signal.throwIfAborted();
  };
  const run = { ...options, exactSerial: true, autoReconnect: false, signal: controller.signal };
  try {
    active();
    const tree = await dumpUiTree({ ...run, skipCache: true, ocrFallback: false,
      requireDumpSuccess: true, throwOnError: true });
    active();
    if (tree.foregroundPackage !== options.expectedPackage) throw new Error("Unexpected capture foreground");
    const selectionStart = performance.now();
    const revision = getCacheRevision();
    const elements = Object.freeze(tree.elements.map(snapshot));
    const matches = select(elements);
    // Unsupported async callbacks may already have returned a rejected promise.
    // Observe its rejection, but never await it or accept its selection.
    if (matches instanceof Promise) void matches.catch(() => {});
    const selectionActive = () => {
      active();
      if (performance.now() - selectionStart >= selectionMs || getCacheRevision() !== revision) {
        throw new Error("Selection expired or an intervening observation/input occurred");
      }
    };
    selectionActive();
    if (!Array.isArray(matches) || matches.length !== 1 || !elements.includes(matches[0])) {
      throw new Error("Selection must return exactly one captured element");
    }
    const selected = matches[0];
    const { left, top, right, bottom } = selected.bounds;
    const { x, y } = selected.center;
    if (!selected.enabled || !(selected.clickable || selected.focusable) ||
        selected.packageName !== options.expectedPackage ||
        ![left, top, right, bottom, x, y].every(Number.isFinite) ||
        left < 0 || top < 0 || right <= left || bottom <= top ||
        x < left || x >= right || y < top || y >= bottom) {
      throw new Error("Target is not a valid actionable control");
    }
    if (await getForegroundPackage(run) !== options.expectedPackage) throw new Error("Foreground changed before tap");
    selectionActive();
    await tap(x, y, run);
    return selected;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  }
}
