// Versioned workflow consumer. Baseline inspect-then-verify adapter; freeze the
// driver and save its baseline before replacing this adapter with readSelectTap.
import { dumpUiTree } from "../src/adb/ui-tree.ts";
import { tap } from "../src/adb/input.ts";
export const selectionStrategy = "inspect-then-verify";
export async function selectWorkflowField(select, options) {
  const capture = () => dumpUiTree({ ...options, exactSerial: true, autoReconnect: false,
    skipCache: true, ocrFallback: false, requireDumpSuccess: true, throwOnError: true });
  const first = await capture();
  if (first.foregroundPackage !== options.expectedPackage) throw Error("foreground");
  const candidates = select(first.elements);
  if (candidates.length !== 1) throw Error("field");
  const chosen = candidates[0];
  const second = await capture();
  if (second.foregroundPackage !== options.expectedPackage) throw Error("foreground");
  const verified = select(second.elements);
  if (verified.length !== 1 || verified[0].center.x !== chosen.center.x ||
      verified[0].center.y !== chosen.center.y || verified[0].className !== chosen.className ||
      verified[0].resourceId !== chosen.resourceId || verified[0].text !== chosen.text)
    throw Error("field");
  await tap(verified[0].center.x, verified[0].center.y,
    { ...options, exactSerial: true, autoReconnect: false });
  return verified[0];
}
