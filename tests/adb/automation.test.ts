import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependency modules before importing the module under test
vi.mock("../../src/adb/exec.js", () => ({
  adbShell: vi.fn(),
  getForegroundPackage: vi.fn(),
  getScreenSize: vi.fn(),
}));

vi.mock("../../src/adb/input.js", () => ({
  tap: vi.fn(),
  typeText: vi.fn(),
  scrollDown: vi.fn(),
  scrollUp: vi.fn(),
}));

vi.mock("../../src/adb/app.js", () => ({
  launchApp: vi.fn(),
  wakeScreen: vi.fn(),
  isScreenOn: vi.fn(),
  isKeyguardShowing: vi.fn(),
}));

vi.mock("../../src/adb/ui-tree.js", () => ({
  dumpUiTree: vi.fn(),
  findElement: vi.fn(),
  waitForElement: vi.fn(),
}));

vi.mock("../../src/adb/screenshot.js", () => ({
  takeScreenshot: vi.fn(),
}));

import { adbShell, getForegroundPackage, getScreenSize } from "../../src/adb/exec.js";
import { tap, typeText, scrollDown, scrollUp } from "../../src/adb/input.js";
import { launchApp, wakeScreen, isScreenOn, isKeyguardShowing } from "../../src/adb/app.js";
import { dumpUiTree, findElement, waitForElement } from "../../src/adb/ui-tree.js";
import { takeScreenshot } from "../../src/adb/screenshot.js";
import { createTaskBudget } from "../../src/adb/task-budget.js";
import {
  ensureReady,
  observe,
  findAndTap,
  tapAndWait,
  typeIntoField,
  scrollToFind,
} from "../../src/adb/automation.js";
import { DefaultStuckDetector } from "../../src/adb/stuck-detector.js";
import type { UIElement, UITreeResult, ScreenshotResult } from "../../src/adb/types.js";

const mockAdbShell = vi.mocked(adbShell);
const mockGetForegroundPackage = vi.mocked(getForegroundPackage);
const mockGetScreenSize = vi.mocked(getScreenSize);
const mockTap = vi.mocked(tap);
const mockTypeText = vi.mocked(typeText);
const mockScrollDown = vi.mocked(scrollDown);
const mockScrollUp = vi.mocked(scrollUp);
const mockLaunchApp = vi.mocked(launchApp);
const mockWakeScreen = vi.mocked(wakeScreen);
const mockIsScreenOn = vi.mocked(isScreenOn);
const mockIsKeyguardShowing = vi.mocked(isKeyguardShowing);
const mockDumpUiTree = vi.mocked(dumpUiTree);
const mockFindElement = vi.mocked(findElement);
const mockWaitForElement = vi.mocked(waitForElement);
const mockTakeScreenshot = vi.mocked(takeScreenshot);

/** Helper to build a UIElement with defaults. */
function makeElement(overrides: Partial<UIElement> = {}): UIElement {
  return {
    resourceId: "",
    text: "",
    contentDesc: "",
    className: "android.widget.View",
    packageName: "com.example",
    bounds: { left: 0, top: 0, right: 100, bottom: 100 },
    center: { x: 50, y: 50 },
    clickable: false,
    focusable: false,
    scrollable: false,
    enabled: true,
    selected: false,
    checked: false,
    children: [],
    depth: 0,
    index: 0,
    ...overrides,
  };
}

function makeUiTree(overrides: Partial<UITreeResult> = {}): UITreeResult {
  return {
    elements: [],
    interactive: [],
    rawXml: "<hierarchy></hierarchy>",
    xmlPath: "/tmp/ui.xml",
    foregroundPackage: "com.example.app",
    ...overrides,
  };
}

function makeScreenshot(overrides: Partial<ScreenshotResult> = {}): ScreenshotResult {
  return {
    path: "/tmp/screen.png",
    width: 1440,
    height: 2960,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

// ── ensureReady ────────────────────────────────────────────────────

describe("ensureReady()", () => {
  beforeEach(() => {
    mockIsScreenOn.mockReset().mockResolvedValue(true);
    mockIsKeyguardShowing.mockReset().mockResolvedValue(false);
    mockGetForegroundPackage.mockReset().mockResolvedValue("com.example.myapp");
    mockLaunchApp.mockReset().mockResolvedValue(undefined);
    mockWakeScreen.mockReset().mockResolvedValue(undefined);
    mockGetScreenSize.mockResolvedValue({ width: 1080, height: 1920 });
    mockAdbShell.mockResolvedValue("");
  });

  it("does nothing when awake and unlocked", async () => {
    expect(await ensureReady()).toEqual({ wasAsleep: false, launched: false });
    expect(mockWakeScreen).not.toHaveBeenCalled();
    expect(mockAdbShell).not.toHaveBeenCalled();
  });

  it("waits for wake before dismissing and launching", async () => {
    mockIsScreenOn.mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValue(true);
    mockIsKeyguardShowing.mockResolvedValueOnce(true).mockResolvedValue(false);
    mockGetForegroundPackage.mockResolvedValueOnce("com.android.launcher").mockResolvedValue("com.example.myapp");
    const result = await ensureReady({ packageName: "com.example.myapp", pollInterval: 1 });
    expect(result).toEqual({ wasAsleep: true, launched: true });
    expect(mockAdbShell).toHaveBeenCalledWith("wm dismiss-keyguard", expect.anything());
    expect(mockWakeScreen.mock.invocationCallOrder[0]).toBeLessThan(mockAdbShell.mock.invocationCallOrder[0]);
    expect(mockAdbShell.mock.invocationCallOrder[0]).toBeLessThan(mockLaunchApp.mock.invocationCallOrder[0]);
  });

  it("dismisses keyguard even when screen was already on", async () => {
    mockIsKeyguardShowing.mockResolvedValueOnce(true).mockResolvedValue(false);
    expect((await ensureReady()).wasAsleep).toBe(false);
    expect(mockAdbShell).toHaveBeenCalledWith("wm dismiss-keyguard", expect.anything());
    expect(mockWakeScreen).not.toHaveBeenCalled();
  });

  it("swipes only if keyguard dismissal did not work", async () => {
    let swiped = false;
    mockIsKeyguardShowing.mockImplementation(async () => !swiped);
    mockAdbShell.mockImplementation(async command => {
      if (command.startsWith("input swipe")) swiped = true;
      return "";
    });
    await ensureReady({ readinessTimeout: 5, pollInterval: 1 });
    expect(mockAdbShell).toHaveBeenCalledWith("input swipe 540 1440 540 634 300", expect.anything());
  });

  it("fails without launching when the screen never wakes", async () => {
    mockIsScreenOn.mockResolvedValue(false);
    await expect(ensureReady({ packageName: "com.example.myapp", readinessTimeout: 5, pollInterval: 1 })).rejects.toThrow("did not wake");
    expect(mockLaunchApp).not.toHaveBeenCalled();
    expect(mockAdbShell).not.toHaveBeenCalled();
  });

  it("fails without launching when credentials are required", async () => {
    mockIsKeyguardShowing.mockResolvedValue(true);
    await expect(ensureReady({ packageName: "com.example.myapp", readinessTimeout: 5, pollInterval: 1 })).rejects.toThrow("unlock it manually");
    expect(mockLaunchApp).not.toHaveBeenCalled();
  });

  it("waits for foreground rather than assuming launch succeeded", async () => {
    mockGetForegroundPackage.mockResolvedValueOnce("launcher").mockResolvedValueOnce("launcher").mockResolvedValue("com.example.myapp");
    expect((await ensureReady({ packageName: "com.example.myapp", pollInterval: 1 })).launched).toBe(true);
    expect(mockLaunchApp).toHaveBeenCalledTimes(1);
  });

  it("does not relaunch the app already in foreground", async () => {
    expect((await ensureReady({ packageName: "com.example.myapp" })).launched).toBe(false);
    expect(mockLaunchApp).not.toHaveBeenCalled();
  });

  it("retries launch once then verifies foreground", async () => {
    mockGetForegroundPackage.mockImplementation(async () => mockLaunchApp.mock.calls.length < 2 ? "launcher" : "com.example.myapp");
    await ensureReady({ packageName: "com.example.myapp", readinessTimeout: 5, pollInterval: 1 });
    expect(mockLaunchApp).toHaveBeenCalledTimes(2);
  });

  it("reports foreground failure after two attempts", async () => {
    mockGetForegroundPackage.mockResolvedValue("launcher");
    await expect(ensureReady({ packageName: "com.example.myapp", readinessTimeout: 5, pollInterval: 1 })).rejects.toThrow("did not reach the foreground");
    expect(mockLaunchApp).toHaveBeenCalledTimes(2);
  });

  it("does not retry a launch error", async () => {
    mockGetForegroundPackage.mockResolvedValue("launcher");
    mockLaunchApp.mockRejectedValue(new Error("not installed"));
    await expect(ensureReady({ packageName: "com.example.myapp" })).rejects.toThrow("not installed");
    expect(mockLaunchApp).toHaveBeenCalledTimes(1);
  });

  it("does not report success if screen sleeps again", async () => {
    mockIsScreenOn.mockResolvedValueOnce(true).mockResolvedValue(false);
    await expect(ensureReady()).rejects.toThrow("not awake and unlocked");
  });

  it("honors the task budget before waking", async () => {
    mockIsScreenOn.mockResolvedValue(false);
    await expect(ensureReady({ taskBudget: createTaskBudget({ stepLimit: 0 }) })).rejects.toThrow("budget_exceeded");
    expect(mockWakeScreen).not.toHaveBeenCalled();
  });

  it("fails if a foreground app disappears before final verification", async () => {
    mockGetForegroundPackage.mockResolvedValueOnce("com.example.myapp").mockResolvedValue("launcher");
    await expect(ensureReady({ packageName: "com.example.myapp" })).rejects.toThrow("left the foreground");
  });

  it("does not retry launch if the device sleeps during launch", async () => {
    mockGetForegroundPackage.mockResolvedValue("launcher");
    mockIsScreenOn.mockImplementation(async () => mockLaunchApp.mock.calls.length === 0);
    await expect(ensureReady({ packageName: "com.example.myapp", readinessTimeout: 5, pollInterval: 1 })).rejects.toThrow("slept or locked");
    expect(mockLaunchApp).toHaveBeenCalledTimes(1);
  });

  it("validates bounded polling options", async () => {
    await expect(ensureReady({ readinessTimeout: Infinity })).rejects.toThrow("finite positive");
    await expect(ensureReady({ pollInterval: 0 })).rejects.toThrow("finite positive");
  });
});

// ── observe ────────────────────────────────────────────────────────

describe("observe()", () => {
  it("captures screenshot, UI tree, and foreground package in parallel", async () => {
    const screenshot = makeScreenshot();
    const btn = makeElement({ text: "OK", clickable: true });
    const label = makeElement({ text: "Title" });
    const tree = makeUiTree({
      interactive: [btn],
      elements: [btn, label],
    });

    mockTakeScreenshot.mockResolvedValue(screenshot);
    mockDumpUiTree.mockResolvedValue(tree);
    mockGetForegroundPackage.mockResolvedValue("com.example.testapp");

    const result = await observe();

    expect(result.screenshot).toEqual(screenshot);
    expect(result.foregroundPackage).toBe("com.example.testapp");
    expect(result.interactiveElements).toEqual([btn]);
    expect(result.allElements).toEqual([btn, label]);
  });

  it("forwards includeBase64 option to takeScreenshot", async () => {
    mockTakeScreenshot.mockResolvedValue(makeScreenshot({ base64: "AAAA" }));
    mockDumpUiTree.mockResolvedValue(makeUiTree());
    mockGetForegroundPackage.mockResolvedValue("com.example");

    await observe({ includeBase64: true });

    expect(mockTakeScreenshot).toHaveBeenCalledWith(
      expect.objectContaining({ includeBase64: true }),
    );
  });
});

// ── findAndTap ─────────────────────────────────────────────────────

describe("findAndTap()", () => {
  it("finds element and taps its center on first try", async () => {
    const btn = makeElement({ text: "Like", center: { x: 300, y: 500 } });
    mockDumpUiTree.mockResolvedValue(makeUiTree({ elements: [btn] }));
    mockFindElement.mockReturnValue(btn);
    mockTap.mockResolvedValue(undefined);

    const result = await findAndTap({ text: "Like" });

    expect(result).toEqual(btn);
    expect(mockTap).toHaveBeenCalledWith(300, 500, expect.anything());
    // Only one dump needed
    expect(mockDumpUiTree).toHaveBeenCalledTimes(1);
  });

  it("retries when element not found initially", async () => {
    const btn = makeElement({ text: "Like", center: { x: 300, y: 500 } });

    mockDumpUiTree.mockResolvedValue(makeUiTree({ elements: [] }));
    // Not found on first two tries, found on third
    mockFindElement
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(btn);
    mockTap.mockResolvedValue(undefined);

    const result = await findAndTap({ text: "Like" }, { retries: 3, retryDelay: 10 });

    expect(result).toEqual(btn);
    expect(mockDumpUiTree).toHaveBeenCalledTimes(3);
    expect(mockTap).toHaveBeenCalledTimes(1);
  });

  it("returns null when element never found after all retries", async () => {
    mockDumpUiTree.mockResolvedValue(makeUiTree({ elements: [] }));
    mockFindElement.mockReturnValue(null);

    const result = await findAndTap({ text: "Missing" }, { retries: 2, retryDelay: 10 });

    expect(result).toBeNull();
    expect(mockTap).not.toHaveBeenCalled();
    // 1 initial + 2 retries = 3
    expect(mockDumpUiTree).toHaveBeenCalledTimes(3);
  });

  it("defaults to 3 retries", async () => {
    mockDumpUiTree.mockResolvedValue(makeUiTree({ elements: [] }));
    mockFindElement.mockReturnValue(null);

    await findAndTap({ text: "X" }, { retryDelay: 10 });

    // 1 initial + 3 retries = 4
    expect(mockDumpUiTree).toHaveBeenCalledTimes(4);
  });

  it("aborts early when stuck detector flags repeated screens", async () => {
    const detector = new DefaultStuckDetector({ screenRepeatThreshold: 1 });
    mockDumpUiTree.mockResolvedValue(makeUiTree({ elements: [] }));

    const result = await findAndTap(
      { text: "Missing" },
      { retries: 3, retryDelay: 10, stuckDetector: detector },
    );

    expect(result).toBeNull();
    expect(mockDumpUiTree).toHaveBeenCalledTimes(1);
    expect(mockTap).not.toHaveBeenCalled();
  });

  it("throws budget_exceeded before tap when budget is exhausted", async () => {
    const btn = makeElement({ text: "Like", center: { x: 300, y: 500 } });
    mockDumpUiTree.mockResolvedValue(makeUiTree({ elements: [btn] }));
    mockFindElement.mockReturnValue(btn);

    const budget = createTaskBudget({ stepLimit: 0, timeLimitMs: 60_000 });
    await expect(findAndTap({ text: "Like" }, { taskBudget: budget })).rejects.toThrow("budget_exceeded");
    expect(mockTap).not.toHaveBeenCalled();
  });
});

// ── tapAndWait ─────────────────────────────────────────────────────

describe("tapAndWait()", () => {
  it("waits for tap element, taps, then waits for follow-up element", async () => {
    const tapBtn = makeElement({ text: "Next", center: { x: 200, y: 800 } });
    const waitEl = makeElement({ text: "Page 2" });

    mockWaitForElement
      .mockResolvedValueOnce(tapBtn)   // wait for tap target
      .mockResolvedValueOnce(waitEl);  // wait for follow-up

    mockTap.mockResolvedValue(undefined);

    const result = await tapAndWait({ text: "Next" }, { text: "Page 2" });

    expect(result.tapped).toEqual(tapBtn);
    expect(result.found).toEqual(waitEl);
    expect(mockTap).toHaveBeenCalledWith(200, 800, expect.anything());
  });

  it("throws when tap element not found", async () => {
    mockWaitForElement.mockResolvedValue(null);

    await expect(
      tapAndWait({ text: "Missing" }, { text: "Whatever" }, { tapTimeout: 100 }),
    ).rejects.toThrow("Element to tap not found");
  });

  it("returns null found when follow-up element never appears", async () => {
    const tapBtn = makeElement({ text: "Next", center: { x: 200, y: 800 } });

    mockWaitForElement
      .mockResolvedValueOnce(tapBtn)
      .mockResolvedValueOnce(null);

    mockTap.mockResolvedValue(undefined);

    const result = await tapAndWait(
      { text: "Next" },
      { text: "Ghost" },
      { waitTimeout: 100 },
    );

    expect(result.tapped).toEqual(tapBtn);
    expect(result.found).toBeNull();
  });

  it("throws when stuck detector flags before waiting", async () => {
    const detector = new DefaultStuckDetector({ actionRepeatThreshold: 1 });

    await expect(
      tapAndWait(
        { text: "Next" },
        { text: "Page 2" },
        { stuckDetector: detector },
      ),
    ).rejects.toThrow("Stuck detected before tapAndWait");
  });
});

// ── typeIntoField ──────────────────────────────────────────────────

describe("typeIntoField()", () => {
  it("taps field, waits, then types text", async () => {
    const field = makeElement({
      text: "",
      resourceId: "com.example:id/email",
      center: { x: 400, y: 300 },
    });

    mockDumpUiTree.mockResolvedValue(makeUiTree({ elements: [field] }));
    mockFindElement.mockReturnValue(field);
    mockTap.mockResolvedValue(undefined);
    mockTypeText.mockResolvedValue(undefined);

    const result = await typeIntoField({ resourceId: "email" }, "hello@test.com");

    expect(result).toEqual(field);
    expect(mockTap).toHaveBeenCalledWith(400, 300, expect.anything());
    expect(mockTypeText).toHaveBeenCalledWith("hello@test.com", expect.anything());
  });

  it("throws when field not found", async () => {
    mockDumpUiTree.mockResolvedValue(makeUiTree({ elements: [] }));
    mockFindElement.mockReturnValue(null);

    await expect(
      typeIntoField({ resourceId: "missing" }, "text"),
    ).rejects.toThrow("Field not found");
  });

  it("clears field first when clearFirst is true", async () => {
    const field = makeElement({ center: { x: 100, y: 200 } });

    mockDumpUiTree.mockResolvedValue(makeUiTree({ elements: [field] }));
    mockFindElement.mockReturnValue(field);
    mockTap.mockResolvedValue(undefined);
    mockAdbShell.mockResolvedValue("");
    mockTypeText.mockResolvedValue(undefined);

    await typeIntoField({ text: "field" }, "new text", { clearFirst: true });

    // Should call adbShell for key events to clear
    expect(mockAdbShell).toHaveBeenCalledWith(
      "input keyevent KEYCODE_MOVE_HOME",
      expect.anything(),
    );
    expect(mockAdbShell).toHaveBeenCalledWith(
      "input keyevent KEYCODE_DEL",
      expect.anything(),
    );
    // Then type the new text
    expect(mockTypeText).toHaveBeenCalledWith("new text", expect.anything());
  });

  it("throws budget_exceeded before typing when step limit is hit", async () => {
    const field = makeElement({ center: { x: 100, y: 200 } });

    mockDumpUiTree.mockResolvedValue(makeUiTree({ elements: [field] }));
    mockFindElement.mockReturnValue(field);
    mockTap.mockResolvedValue(undefined);

    const budget = createTaskBudget({ stepLimit: 1, timeLimitMs: 60_000 });
    await expect(typeIntoField({ text: "field" }, "new text", { taskBudget: budget })).rejects.toThrow(
      "budget_exceeded",
    );
    expect(mockTap).toHaveBeenCalledTimes(1);
    expect(mockTypeText).not.toHaveBeenCalled();
  });
});

// ── scrollToFind ───────────────────────────────────────────────────

describe("scrollToFind()", () => {
  it("returns element immediately if found on first dump", async () => {
    const el = makeElement({ text: "Target" });

    mockDumpUiTree.mockResolvedValue(makeUiTree({ elements: [el] }));
    mockFindElement.mockReturnValue(el);
    mockGetScreenSize.mockResolvedValue({ width: 1440, height: 2960 });

    const result = await scrollToFind({ text: "Target" });

    expect(result).toEqual(el);
    expect(mockScrollDown).not.toHaveBeenCalled();
    expect(mockScrollUp).not.toHaveBeenCalled();
  });

  it("scrolls down and finds element after a few scrolls", async () => {
    const el = makeElement({ text: "Target" });

    mockGetScreenSize.mockResolvedValue({ width: 1440, height: 2960 });
    mockDumpUiTree.mockResolvedValue(makeUiTree({ elements: [] }));
    mockScrollDown.mockResolvedValue(undefined);

    // Not found first 2 tries, found on 3rd
    mockFindElement
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(el);

    const result = await scrollToFind({ text: "Target" }, { maxScrolls: 5 });

    expect(result).toEqual(el);
    expect(mockScrollDown).toHaveBeenCalledTimes(2);
  });

  it("scrolls up when direction is up", async () => {
    const el = makeElement({ text: "Target" });

    mockGetScreenSize.mockResolvedValue({ width: 1440, height: 2960 });
    mockDumpUiTree.mockResolvedValue(makeUiTree({ elements: [] }));
    mockScrollUp.mockResolvedValue(undefined);

    mockFindElement
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(el);

    const result = await scrollToFind({ text: "Target" }, { direction: "up", maxScrolls: 5 });

    expect(result).toEqual(el);
    expect(mockScrollUp).toHaveBeenCalledTimes(1);
    expect(mockScrollDown).not.toHaveBeenCalled();
  });

  it("returns null when element not found after maxScrolls", async () => {
    mockGetScreenSize.mockResolvedValue({ width: 1440, height: 2960 });
    mockDumpUiTree.mockResolvedValue(makeUiTree({ elements: [] }));
    mockFindElement.mockReturnValue(null);
    mockScrollDown.mockResolvedValue(undefined);

    const result = await scrollToFind({ text: "Ghost" }, { maxScrolls: 3 });

    expect(result).toBeNull();
    expect(mockScrollDown).toHaveBeenCalledTimes(3);
  });

  it("stops scrolling when stuck detector flags repeated screens", async () => {
    const detector = new DefaultStuckDetector({ screenRepeatThreshold: 2 });
    mockGetScreenSize.mockResolvedValue({ width: 1440, height: 2960 });
    mockDumpUiTree.mockResolvedValue(makeUiTree({ elements: [] }));
    mockFindElement.mockReturnValue(null);
    mockScrollDown.mockResolvedValue(undefined);

    const result = await scrollToFind({ text: "Ghost" }, { maxScrolls: 5, stuckDetector: detector });

    expect(result).toBeNull();
    expect(mockDumpUiTree).toHaveBeenCalledTimes(2);
    expect(mockScrollDown).toHaveBeenCalledTimes(1);
  });

  it("defaults to down direction", async () => {
    mockGetScreenSize.mockResolvedValue({ width: 1440, height: 2960 });
    mockDumpUiTree.mockResolvedValue(makeUiTree({ elements: [] }));
    mockFindElement.mockReturnValue(null);
    mockScrollDown.mockResolvedValue(undefined);

    // Use explicit maxScrolls to keep test fast; direction default is verified
    await scrollToFind({ text: "X" }, { maxScrolls: 2 });

    expect(mockScrollDown).toHaveBeenCalledTimes(2);
    expect(mockScrollUp).not.toHaveBeenCalled();
  });
});
