# Pi-Droid

![Pi-Droid](./banner.jpeg)

**Give your AI agent hands on an Android phone.**

```bash
pi install pi-droid
```

Pi-Droid is a [pi-agent](https://github.com/badlogic/pi-mono) extension that gives AI agents direct, real-time control over Android devices via ADB. Annotated screenshots with numbered element indices let the agent tap, swipe, and type without guessing pixel coordinates — works on any screen size, any device.

[![npm version](https://img.shields.io/npm/v/pi-droid)](https://www.npmjs.com/package/pi-droid)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![tests](https://img.shields.io/badge/tests-473%2B%20passing-brightgreen)]()
[![latest release](https://img.shields.io/github/v/release/ArtemisAI/pi-droid)](https://github.com/ArtemisAI/pi-droid/releases/latest)

---

Performance work in progress: [implementation checklist and session resume point](docs/performance/PLAN.md).

## What it does

| Category | Tools | Highlights |
|----------|-------|------------|
| **See** | 6 perception tools | Annotated screenshots with numbered indices, raw UI tree, OCR fallback |
| **Touch** | 5 input tools | Tap by text/ID/coords, type with clear-first, swipe, scroll, key events |
| **Navigate** | 3 app tools | Launch/stop apps, wait for elements, wait for activities |
| **System** | 6 system tools | Battery, settings, processes, logcat, shell, APK install |
| **Manage** | 3 device tools | Multi-device registry, preflight checks, WiFi ADB |
| **Lock** | 4 lock tools | Query/set/clear PIN and pattern locks |
| **Record** | 2 recording tools | Screen recording, gesture macro record/save/replay |
| **Automate** | 3 automation tools | Wake+unlock, find-and-tap with scrolling, scroll-until-found |
| **Extend** | 4 plugin tools | Discover capabilities, run plugin actions, health check, heartbeat cycle |

**36 tools total**, organized into 4 skills that scope tool sets for focused agent behavior.

---

## Termux fork: secure wireless reconnect

This fork fixes host-side temporary paths to use Node's system temporary directory (including Termux's `$TMPDIR`).

`android_wifi { action: "auto" }` now discovers the current **secure Wireless debugging** connection port and reconnects an already-paired phone:

1. Try `adb mdns services`.
2. If unsupported or empty, independently browse `_adb-tls-connect._tcp.local` using `multicast-dns`.
3. Resolve the advertised IPv4 address and port, connect, and verify the transport is authorized and online.

Discovery is bounded (five seconds per discovery stage by default), and sockets/timers are released afterward. Pairing and legacy TCP services are ignored. When multiple endpoints are found, supply `host` (and optionally `port`) to choose a phone. Wireless debugging must be enabled, the host must already be paired, and multicast traffic must be reachable on the WiFi network.

**Behavior change:** `auto` no longer runs `adb tcpip 5555` or enables unencrypted legacy mode. Explicit `connect`/`disconnect` remain available. Reconnect runs automatically when initial device selection finds no reachable phone, or a device command fails with a missing/offline transport. The action is retried once after secure discovery and authorization verification. Concurrent failures for the same host share one recovery, and old host:port callers use the recovered port. Explicit USB targets are never redirected to WiFi; ambiguous discovery fails instead of guessing. Timeouts, closed connections, authorization failures, and app/shell errors are not replayed because the action may already have executed. Low-level callers can opt out with `autoReconnect: false`. This is not a background reconnection daemon.

### Verified wake → unlock → launch

`android_ensure_ready` now waits for a confirmed awake screen, checks keyguard even when the screen was already on, requests non-secure keyguard dismissal (with one swipe fallback), and verifies the requested app reaches the foreground. App launch is retried at most once. Success is returned only after a final awake/unlocked/foreground check; credential-protected locks require manual unlocking. No credentials are entered and no screen timeout or lock settings are changed.

Screen detection supports both the older `Display Power: state=ON` and ASUS/OEM `Display State=ON` formats. Library callers can set positive `readinessTimeout` (default 5000 ms per polling phase) and `pollInterval` (default 250 ms); ADB command timeouts remain independently bounded by execution options. Task budgets are honored during polling and before actions.

To use this fork from a local checkout:

```bash
git clone https://github.com/RuiCostafrg/pi-droid.git
cd pi-droid
npm ci --ignore-scripts
npm run build
pi install "$(pwd)"
```

Run `/reload` in Pi after rebuilding. For phone-friendly unit testing:

```bash
npm run test:unit -- --maxWorkers=2 --testTimeout=30000
```

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Node.js** >= 18 | ESM support required |
| **ADB** on PATH | `adb devices` should list your device |
| **Android device** | USB debugging enabled, USB or WiFi connected |
| **[ADBKeyboard](https://github.com/senzhk/ADBKeyboard)** | Required for Unicode text input via `android_type` |
| **Tesseract OCR** *(optional)* | Enables `android_ocr` and OCR fallback in `android_look`. Without it, OCR is silently skipped — all other tools work normally. Install: `sudo apt install tesseract-ocr` |

---

## Installation

```bash
pi install pi-droid
```

Set your device serial (optional if only one device is connected):

```bash
export ANDROID_SERIAL=your_device_serial
```

### Verify

```bash
npx tsx run.mts screen
```

### Development

```bash
git clone https://github.com/ArtemisAI/pi-droid.git
cd pi-droid
npm install
npm run build
npm test
```

---

## Tool Reference

### Perception (6 tools)

| Tool | Description |
|------|-------------|
| `android_look` | Annotated screenshot with numbered element index — primary perception tool |
| `android_screenshot` | Raw screenshot — use for failure diagnosis only |
| `android_ui_dump` | Raw UI tree XML for full element hierarchy |
| `android_ocr` | Tesseract OCR on current screen or saved screenshot |
| `android_observe` | Continuous screen state observation |
| `android_screen_state` | Current activity, package, orientation, lock state as JSON |

### Input (5 tools)

| Tool | Description |
|------|-------------|
| `android_tap` | Tap by coordinates, text match, or resource ID; supports long press |
| `android_type` | Type text into the focused field; optional `clear_first` to replace. Requires ADBKeyboard to be the active IME; otherwise fails before clearing or sending text. |
| `android_swipe` | Swipe between two coordinates with configurable duration |
| `android_scroll` | Scroll up or down on the current screen |
| `android_key` | Press a key: `back`, `home`, `enter`, `tab`, or any `KEYCODE_*` |

### App and Navigation (3 tools)

| Tool | Description |
|------|-------------|
| `android_app` | Launch with installation check and optional website fallback, stop, or check status |
| `android_wait` | Wait for an element to appear (by text or resource ID) with timeout |
| `android_wait_activity` | Wait for a specific activity to reach the foreground |

#### Missing-app fallback

`android_app` checks whether the requested package is installed before launch.
If it is missing and no alternative is supplied, it returns `app_not_installed`
without launching or installing anything. Supply an explicit `fallback_url` to
open the intended website instead:

```json
{
  "action": "launch",
  "package": "com.amazon.mShop.android.shopping",
  "fallback_url": "https://www.amazon.de/s?k=versa+gripps",
  "browser_package": "com.android.chrome"
}
```

`browser_package` is optional; without it Android uses its default URL handler
(which may require choosing a browser). The tool reports the actual handler
package and whether fallback was used. Only HTTP(S) URLs without embedded
credentials are accepted. Connection failures, launch failures for installed
apps, and missing browsers are not silently converted into website launches.
Use `android_ensure_ready` first when the screen may be asleep or locked; this
fallback does not unlock the phone. The low-level `launchApp` and deterministic
input router retain their original behavior; checked launches are available via
`launchAppWithFallback` and the `android_app` tool.

### System (6 tools)

| Tool | Description |
|------|-------------|
| `android_device_info` | Battery, network, and hardware info |
| `android_settings` | Read/write system settings (WiFi, Bluetooth, brightness, volume, etc.) |
| `android_processes` | List running processes, kill by PID or name |
| `android_logcat` | Capture, search, and clear logcat |
| `android_shell` | Execute arbitrary ADB shell commands |
| `android_install` | Install/uninstall APKs, check package versions |

### Device Management (3 tools)

| Tool | Description |
|------|-------------|
| `android_devices` | List connected devices, register/unregister, set active device |
| `android_preflight` | Run device readiness checks (ADB, screen, battery, etc.) |
| `android_wifi` | Connect/disconnect WiFi ADB, auto-discover devices |

### Lock Management (4 tools)

| Tool | Description |
|------|-------------|
| `android_lock_status` | Query current lock state and type |
| `android_lock_clear` | Remove existing lock |
| `android_lock_set_pattern` | Set a pattern lock |
| `android_lock_set_pin` | Set a PIN lock |

### Recording and Macros (2 tools)

| Tool | Description |
|------|-------------|
| `android_record` | Start/stop screen recording, pull recordings |
| `android_macro` | Record, save, load, and replay gesture macros |

### Automation (3 tools)

| Tool | Description |
|------|-------------|
| `android_ensure_ready` | Wake screen, unlock, dismiss overlays — call before any automation |
| `android_find_and_tap` | Search UI tree for element and tap it; retries with scrolling |
| `android_scroll_find` | Scroll until an element appears, then return it |

### Plugin System (4 tools)

| Tool | Description |
|------|-------------|
| `android_skills` | Discover all loaded plugin capabilities and parameters |
| `android_plugin_action` | Execute a plugin action with approval gates for sensitive operations |
| `android_plugin_status` | Get health status of all loaded plugins |
| `android_plugin_cycle` | Run a plugin's autonomous heartbeat cycle |

---

## Skills

Pi-Droid defines four skills that scope tool sets for focused agent behavior. Skills are discovered automatically by pi-agent's package manager.

| Skill | Description | Key Tools |
|-------|-------------|-----------|
| `android-screen` | Perceive device state | `look`, `screen_state`, `screenshot`, `ui_dump`, `ocr`, `observe` |
| `android-interact` | Perform actions on the device | `tap`, `type`, `swipe`, `scroll`, `key`, `app` |
| `android-automate` | High-level automation sequences | `ensure_ready`, `find_and_tap`, `scroll_find`, `wait`, `wait_activity`, `preflight` |
| `android-plugin` | Manage and execute app plugins | `skills`, `plugin_action`, `plugin_status`, `plugin_cycle` |

---

## Plugin System

Pi-Droid's plugin system lets you add app-specific automation behind a standard interface. Plugins can declare approval gates for sensitive actions (sending messages, making purchases, posting content).

### Building a plugin

Extend `CliPlugin` for CLI-backed apps, or implement `PiDroidPlugin` for full control:

```typescript
import { CliPlugin } from "pi-droid";

export class WeatherPlugin extends CliPlugin {
  name = "weather";
  // ...
}
```

### Loading plugins

Plugins are configured in `config/default.json` and loaded automatically on session start:

```json
{
  "plugins": {
    "weather": {
      "enabled": true,
      "package": "@example/pi-droid-weather"
    }
  }
}
```

Distribute plugins as npm packages. See [PLUGINS.md](./PLUGINS.md) for the full plugin development guide, manifest schema, and marketplace integration.

---

## Configuration

Pi-Droid reads configuration from `config/default.json`:

```json
{
  "adb": {
    "serial": "your_device_serial"
  },
  "plugins": {},
  "routing": {}
}
```

| Key | Purpose |
|-----|---------|
| `adb.serial` | Device serial (overridden by `ANDROID_SERIAL` env var) |
| `plugins` | Plugin configurations keyed by name |
| `routing` | Input router settings for deterministic action dispatch |

Environment variables:

| Variable | Purpose |
|----------|---------|
| `ANDROID_SERIAL` | Target device serial (takes precedence over config) |

---

## Programmatic Usage

Pi-Droid exports its full ADB layer for use in custom automation scripts, external plugins, or standalone tools:

```typescript
import {
  Device,
  tap, swipe, typeText, keyEvent,
  takeScreenshot, annotatedScreenshot,
  getScreenState, waitForActivity,
  launchApp, stopApp,
  dumpUiTree, findElement, waitForElement,
  ensureReady, findAndTap, scrollToFind,
  getBatteryInfo, getDeviceInfo,
  adbShell,
} from "pi-droid";

// Connect to a device
const device = await Device.connect(process.env.ANDROID_SERIAL);

// Take an annotated screenshot with numbered elements
const annotated = await annotatedScreenshot();

// Find and tap an element by text
await findAndTap({ text: "Settings" });

// Wait for an activity transition
await waitForActivity("com.android.settings/.Settings");

// Run a raw ADB shell command
const result = await adbShell("dumpsys battery");
```

### Available exports

- **Device abstraction**: `Device`
- **Command execution**: `adb`, `adbShell`, `AdbError`, `listDevices`, `isDeviceReady`
- **Input**: `tap`, `swipe`, `typeText`, `keyEvent`, `pressBack`, `pressHome`, `pressEnter`, `scrollDown`, `scrollUp`
- **Screen state**: `getScreenState`, `waitForActivity`, `getActivityStack`, `isKeyboardVisible`, `getOrientation`
- **Screenshots and perception**: `takeScreenshot`, `screenshotBase64`, `annotatedScreenshot`, `dumpUiTree`, `findElements`, `findElement`, `waitForElement`
- **App management**: `launchApp`, `stopApp`, `getAppInfo`, `listPackages`, `wakeScreen`, `isScreenOn`
- **Monitoring**: `getBatteryInfo`, `getNetworkInfo`, `getDeviceInfo`, `isScreenLocked`, `getRunningApps`
- **Automation**: `ensureReady`, `findAndTap`, `scrollToFind`, `DefaultStuckDetector`, `createTaskBudget`
- **OCR**: `runOcrOnImage`, `runOcrOnCurrentScreen`
- **Plugin system**: `PluginManager`, `CliPlugin`, `TelegramPlugin`, `ApprovalQueue`
- **Types**: `AdbExecOptions`, `UIElement`, `Bounds`, `ElementSelector`, `StuckEvent`, and more

---

## Development

```bash
npm install            # Install dependencies
npm run build          # Compile TypeScript
npm run lint           # Type-check without emitting
npm test               # Run all tests (473+)
npm run test:unit      # Unit tests only (mocked ADB)
npm run test:ci        # CI-safe subset (unit + sandbox integration)
npm run test:integration # All integration tests
npm run test:device    # Full suite including device E2E
npm run dev            # Development mode (load as pi extension)
```

### Project structure

```
src/
  index.ts          Extension entry point
  adb/              ADB primitives (app-agnostic, 28 modules)
  tools/            LLM tool registrations
  plugins/          Plugin system (loader, CLI base class, marketplace)
  notifications/    Notification channels and approval queues
skills/             Skill definitions (scoped tool sets)
tests/              473+ tests mirroring src/ structure
config/             Default configuration
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines, coding standards, and the PR checklist.

## Security

See [SECURITY.md](./SECURITY.md) for vulnerability reporting and security considerations.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history.

## License

[MIT](./LICENSE) -- ArtemisAI
