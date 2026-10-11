import { beforeEach, describe, expect, it, vi } from "vitest";
import { join } from "node:path";

// Deliberately not /tmp: catches Linux-only defaults even on Linux CI.
vi.mock("node:os", () => ({ tmpdir: () => "/custom-system-temp" }));
vi.mock("node:fs", () => ({ existsSync: vi.fn(() => false) }));
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(async () => undefined),
  readFile: vi.fn(async () => '<hierarchy><node text="Test" clickable="true" enabled="true" bounds="[0,0][100,100]"/><node text="Other" enabled="true" bounds="[0,100][100,200]"/></hierarchy>'),
  readdir: vi.fn(async () => []),
  stat: vi.fn(),
  unlink: vi.fn(async () => undefined),
}));
vi.mock("../../src/adb/exec.js", () => ({
  adb: vi.fn(async () => ""),
  adbShell: vi.fn(async () => "Physical size: 1080x2340"),
  getForegroundPackage: vi.fn(async () => "com.example.test"),
}));
vi.mock("../../src/adb/ocr.js", () => ({ runOcrOnCurrentScreen: vi.fn() }));

import { mkdir } from "node:fs/promises";
import { adb } from "../../src/adb/exec.js";
import { takeScreenshot, screenshotBase64 } from "../../src/adb/screenshot.js";
import { dumpUiTree } from "../../src/adb/ui-tree.js";
import { pullRecording } from "../../src/adb/recording.js";

beforeEach(() => vi.clearAllMocks());

describe("portable temporary storage defaults", () => {
  it("captures screenshots under the system temp directory", async () => {
    const result = await takeScreenshot();
    expect(result.path.startsWith(join("/custom-system-temp", "pi-droid", "screenshots") + "/")).toBe(true);
    expect(mkdir).toHaveBeenCalledWith(join("/custom-system-temp", "pi-droid", "screenshots"), { recursive: true });
  });

  it("pulls quick screenshots into the system temp directory", async () => {
    await screenshotBase64();
    expect(adb).toHaveBeenCalledWith(
      ["pull", "/sdcard/pi-droid-screen.png", expect.stringContaining(join("/custom-system-temp", "pi-droid-quick-"))],
      expect.any(Object),
    );
  });

  it("stores UI dumps under the system temp directory", async () => {
    const result = await dumpUiTree({ skipCache: true });
    expect(result.xmlPath.startsWith(join("/custom-system-temp", "pi-droid", "ui-dumps") + "/")).toBe(true);
    expect(result.elements).toHaveLength(2);
  });

  it("stores recordings under the system temp directory", async () => {
    const result = await pullRecording();
    expect(result.startsWith(join("/custom-system-temp", "pi-droid", "recordings") + "/")).toBe(true);
  });
});
