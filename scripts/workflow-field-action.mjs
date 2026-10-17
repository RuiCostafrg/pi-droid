// Versioned consumer adoption: synchronous field selection stays inside the
// public bounded operation. Polling, alignment and readback remain in the driver.
import { readSelectTap } from "../src/adb/index.ts";
export const selectionStrategy = "bounded-read-select-tap";
export async function selectWorkflowField(select, options) {
  return readSelectTap(select, options);
}
