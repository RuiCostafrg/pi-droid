import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock exec module before importing input
vi.mock("../../src/adb/exec.js", () => ({
  adbShell: vi.fn(async () => ""),
  adb: vi.fn(async () => ""),
}));

vi.mock("../../src/adb/cache.js", () => ({
  invalidateCache: vi.fn(),
}));

import { adbShell } from "../../src/adb/exec.js";
import { invalidateCache } from "../../src/adb/cache.js";
import {
  tap,
  swipe,
  typeText,
  keyEvent,
  pressBack,
  pressHome,
  pressEnter,
  scrollDown,
  scrollUp,
} from "../../src/adb/input.js";

const mockAdbShell = vi.mocked(adbShell);
const mockInvalidate = vi.mocked(invalidateCache);

beforeEach(() => {
  vi.clearAllMocks();
  mockAdbShell.mockImplementation(async (command) =>
    command === "settings get secure default_input_method" ? "com.android.adbkeyboard/.AdbIME" : "",
  );
});

describe("tap()", () => {
  it("sends input tap command with coordinates", async () => {
    await tap(100, 200);
    expect(mockAdbShell).toHaveBeenCalledWith("input tap 100 200", {});
  });

  it("invalidates cache before tapping", async () => {
    await tap(50, 75);
    expect(mockInvalidate).toHaveBeenCalled();
    // invalidateCache should be called before adbShell
    const invalidateOrder = mockInvalidate.mock.invocationCallOrder[0];
    const shellOrder = mockAdbShell.mock.invocationCallOrder[0];
    expect(invalidateOrder).toBeLessThan(shellOrder);
  });

  it("uses swipe for long press when duration is set", async () => {
    await tap(100, 200, { duration: 500 });
    expect(mockAdbShell).toHaveBeenCalledWith(
      "input swipe 100 200 100 200 500",
      { duration: 500 },
    );
  });

  it("sends normal tap when duration is 0", async () => {
    await tap(100, 200, { duration: 0 });
    expect(mockAdbShell).toHaveBeenCalledWith("input tap 100 200", { duration: 0 });
  });

  it("passes serial option through", async () => {
    await tap(10, 20, { serial: "ABC123" });
    expect(mockAdbShell).toHaveBeenCalledWith(
      "input tap 10 20",
      { serial: "ABC123" },
    );
  });
});

describe("swipe()", () => {
  it("sends swipe command with default 300ms duration", async () => {
    await swipe(0, 100, 0, 500);
    expect(mockAdbShell).toHaveBeenCalledWith(
      "input swipe 0 100 0 500 300",
      {},
    );
  });

  it("uses custom duration when provided", async () => {
    await swipe(0, 100, 0, 500, { duration: 1000 });
    expect(mockAdbShell).toHaveBeenCalledWith(
      "input swipe 0 100 0 500 1000",
      { duration: 1000 },
    );
  });

  it("invalidates cache", async () => {
    await swipe(0, 0, 100, 100);
    expect(mockInvalidate).toHaveBeenCalled();
  });
});

describe("typeText()", () => {
  it("sends ADBKeyboard base64 broadcast by default", async () => {
    await typeText("hello");
    const encoded = Buffer.from("hello", "utf-8").toString("base64");
    expect(mockAdbShell).toHaveBeenCalledWith(
      `am broadcast -a ADB_INPUT_B64 --es msg '${encoded}'`,
      {},
    );
  });

  it("checks the active IME using the requested device options", async () => {
    await typeText("hello", { serial: "phone", timeout: 1000 });
    expect(mockAdbShell.mock.calls[0]).toEqual([
      "settings get secure default_input_method", { serial: "phone", timeout: 1000 },
    ]);
  });

  it.each(["com.google.android.inputmethod.latin/.LatinIME", "null", ""])(
    "rejects inactive ADBKeyboard (%s) before clearing or sending input", async (ime) => {
      mockAdbShell.mockResolvedValue(ime);
      await expect(typeText("private text", { clear: true })).rejects.toThrow(
        "ADBKeyboard is not the active input method",
      );
      expect(mockAdbShell).toHaveBeenCalledTimes(1);
      expect(mockInvalidate).not.toHaveBeenCalled();
    },
  );

  it("accepts the fully qualified ADBKeyboard component", async () => {
    mockAdbShell.mockResolvedValue("com.android.adbkeyboard/com.android.adbkeyboard.AdbIME\n");
    await expect(typeText("hello")).resolves.toBeUndefined();
    expect(mockAdbShell).toHaveBeenLastCalledWith(expect.stringContaining("ADB_INPUT_B64"), {});
  });

  it("propagates IME-query failures without clearing or broadcasting", async () => {
    mockAdbShell.mockRejectedValue(new Error("device offline"));
    await expect(typeText("hello", { clear: true })).rejects.toThrow("device offline");
    expect(mockAdbShell).toHaveBeenCalledTimes(1);
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it("encodes Unicode text correctly", async () => {
    await typeText("cafe\u0301");
    const encoded = Buffer.from("cafe\u0301", "utf-8").toString("base64");
    expect(mockAdbShell).toHaveBeenCalledWith(
      `am broadcast -a ADB_INPUT_B64 --es msg '${encoded}'`,
      {},
    );
  });

  it("uses fallback input text when useAdbKeyboard is false", async () => {
    await typeText("hello", { useAdbKeyboard: false });
    expect(mockAdbShell).toHaveBeenCalledTimes(1);
    expect(mockAdbShell).toHaveBeenCalledWith(
      "input text 'hello'",
      { useAdbKeyboard: false },
    );
  });

  it("escapes special characters in fallback mode", async () => {
    await typeText("hi there!", { useAdbKeyboard: false });
    // single-quote escaping wraps the entire string safely
    expect(mockAdbShell).toHaveBeenCalledWith(
      "input text 'hi there!'",
      { useAdbKeyboard: false },
    );
  });

  it("clears existing text when clear option is set", async () => {
    await typeText("new", { clear: true });
    // Verify IME, clear the InputConnection, then commit replacement text.
    expect(mockAdbShell).toHaveBeenCalledTimes(3);
    expect(mockAdbShell.mock.calls[0][0]).toBe("settings get secure default_input_method");
    expect(mockAdbShell.mock.calls[1][0]).toBe("am broadcast -a ADB_CLEAR_TEXT");
    expect(mockAdbShell.mock.calls[2][0]).toContain("am broadcast -a ADB_INPUT_B64");
  });

  it("invalidates cache", async () => {
    await typeText("test");
    expect(mockInvalidate).toHaveBeenCalled();
  });
});

describe("keyEvent()", () => {
  it("sends key event with string keycode", async () => {
    await keyEvent("KEYCODE_ENTER");
    expect(mockAdbShell).toHaveBeenCalledWith(
      "input keyevent KEYCODE_ENTER",
      {},
    );
  });

  it("sends key event with numeric keycode", async () => {
    await keyEvent(66);
    expect(mockAdbShell).toHaveBeenCalledWith("input keyevent 66", {});
  });

  it("invalidates cache", async () => {
    await keyEvent("KEYCODE_BACK");
    expect(mockInvalidate).toHaveBeenCalled();
  });
});

describe("pressBack()", () => {
  it("sends KEYCODE_BACK", async () => {
    await pressBack();
    expect(mockAdbShell).toHaveBeenCalledWith(
      "input keyevent KEYCODE_BACK",
      {},
    );
  });
});

describe("pressHome()", () => {
  it("sends KEYCODE_HOME", async () => {
    await pressHome();
    expect(mockAdbShell).toHaveBeenCalledWith(
      "input keyevent KEYCODE_HOME",
      {},
    );
  });
});

describe("pressEnter()", () => {
  it("sends KEYCODE_ENTER", async () => {
    await pressEnter();
    expect(mockAdbShell).toHaveBeenCalledWith(
      "input keyevent KEYCODE_ENTER",
      {},
    );
  });
});

describe("scrollDown()", () => {
  it("swipes from 70% to 30% height at screen center", async () => {
    await scrollDown(1440, 2960);
    // cx = 720, fromY = 2072, toY = 888
    expect(mockAdbShell).toHaveBeenCalledWith(
      "input swipe 720 2072 720 888 400",
      { duration: 400 },
    );
  });

  it("invalidates cache via swipe", async () => {
    await scrollDown(1080, 1920);
    expect(mockInvalidate).toHaveBeenCalled();
  });
});

describe("scrollUp()", () => {
  it("swipes from 30% to 70% height at screen center", async () => {
    await scrollUp(1440, 2960);
    // cx = 720, fromY = 888, toY = 2072
    expect(mockAdbShell).toHaveBeenCalledWith(
      "input swipe 720 888 720 2072 400",
      { duration: 400 },
    );
  });
});
