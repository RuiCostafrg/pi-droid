import { afterEach, beforeEach, expect, it } from "vitest";
import { mkdtemp, writeFile, readFile, chmod, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "input-replacement-"));
  // OS transport boundary. Model Android's sequential keyevents (NOT a chord)
  // and ADBKeyboard's InputConnection clear/commit protocol, not pi-droid logic.
  await writeFile(join(dir, "adb"), `#!${process.execPath}
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] !== "-s" || args[1] !== "fixture-device" || args[2] !== "shell") process.exit(9);
const command = args[3];
const path = process.env.INPUT_STATE;
const state = JSON.parse(fs.readFileSync(path, "utf8"));
if (command === "settings get secure default_input_method") {
  console.log(state.ime);
  process.exit(0);
}
state.commands.push(command);
if (command.includes("ADB_CLEAR_TEXT")) {
  if (state.failClear) { fs.writeFileSync(path, JSON.stringify(state)); process.exit(1); }
  state.text = ""; state.cursor = 0;
} else if (command.includes("ADB_INPUT_B64")) {
  const encoded = command.match(/--es msg '([^']*)'/)?.[1];
  if (encoded === undefined) process.exit(8);
  const text = Buffer.from(encoded, "base64").toString("utf8");
  state.text = state.text.slice(0, state.cursor) + text + state.text.slice(state.cursor);
  state.cursor += text.length;
} else if (command.includes("KEYCODE_MOVE_HOME")) {
  state.cursor = state.text.lastIndexOf("\\n", state.cursor - 1) + 1;
} else if (command.includes("KEYCODE_MOVE_END")) {
  const newline = state.text.indexOf("\\n", state.cursor);
  state.cursor = newline === -1 ? state.text.length : newline;
} else if (command.includes("KEYCODE_DEL")) {
  state.text = state.text.slice(0, Math.max(0, state.cursor - 1)) + state.text.slice(state.cursor);
  state.cursor = Math.max(0, state.cursor - 1);
} else process.exit(7);
fs.writeFileSync(path, JSON.stringify(state));
console.log("Broadcast completed: result=0");
`);
  await chmod(join(dir, "adb"), 0o700);
});
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

async function replace(initial: string, replacement: string, extra = {}, options = {}) {
  const state = join(dir, "state.json");
  await writeFile(state, JSON.stringify({ text: initial, cursor: 4,
    ime: "com.android.adbkeyboard/.AdbIME", commands: [], ...extra }));
  const probe = join(dir, "probe.mjs");
  await writeFile(probe, `
import { typeText } from ${JSON.stringify(resolve("src/adb/input.ts"))};
let rejected = false;
try { await typeText(${JSON.stringify(replacement)}, {
  serial: "fixture-device", exactSerial: true, autoReconnect: false, clear: true,
  ...${JSON.stringify(options)} }); }
catch { rejected = true; }
console.log(JSON.stringify({ rejected }));
`);
  const { stdout } = await exec(process.execPath, ["--import", "tsx", probe], {
    cwd: resolve("."), timeout: 10000,
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, INPUT_STATE: state },
  });
  return { ...JSON.parse(await readFile(state, "utf8")), ...JSON.parse(stdout) };
}

it.each([
  ["Lower session", "E2E replacement"],
  ["12345", "8"],
  ["Alte Übung", "Mandel 🥛"],
  ["first line\nsecond line", "one line"],
  ["erase me", ""],
])("replaces the whole focused value: %j → %j", async (initial, replacement) => {
  const result = await replace(initial, replacement);
  expect(result.rejected).toBe(false);
  expect(result.text).toBe(replacement);
});

it("does not commit replacement text when clearing fails", async () => {
  const result = await replace("Keep this value", "replacement", { failClear: true });
  expect(result.rejected).toBe(true);
  expect(result.text).toBe("Keep this value");
  expect(result.commands).toHaveLength(1);
});

it("rejects inactive ADBKeyboard before any field mutation", async () => {
  const result = await replace("Keep this value", "replacement", { ime: "other.keyboard/.IME" });
  expect(result.rejected).toBe(true);
  expect(result.text).toBe("Keep this value");
  expect(result.commands).toEqual([]);
});

it("fails closed for replacement through the non-IME fallback", async () => {
  const result = await replace("Keep this value", "replacement", {}, { useAdbKeyboard: false });
  expect(result.rejected).toBe(true);
  expect(result.text).toBe("Keep this value");
  expect(result.commands).toEqual([]);
});

it("preserves insertion mode without clearing the existing value", async () => {
  const result = await replace("Keep", " plus", { cursor: 4 }, { clear: false });
  expect(result.rejected).toBe(false);
  expect(result.text).toBe("Keep plus");
});
