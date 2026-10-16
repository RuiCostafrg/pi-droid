# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — Termux fork

### Added

- Explicit ADB execution failure categories and `AbortSignal` command cancellation, propagated through content-free capture timing and bounded benchmark IPC.
- Opt-in capture and source/API workflow regression runners, preserved before/after evidence, and offline workflow comparison.
- Checked `android_app` launch with an explicit HTTP(S) `fallback_url` and optional installed `browser_package`; report missing apps without guessing websites or installing packages.
- Automatic secure Wireless debugging recovery for missing/offline ADB transports, with a single retry, host-filtered discovery, concurrent recovery sharing, and changed-port tracking.
- Verified device readiness: poll for wake and keyguard dismissal, verify foreground app, retry launch once, and report secure locks or failed readiness explicitly.

### Fixed

- Whole-field ADBKeyboard replacement (`clear_first`) now uses the IME clear operation instead of unreliable Shift/End keyevents that retained old text.
- UI hierarchy attribute decoding now handles decimal/hex XML character references, including emoji, exactly once while preserving invalid references.
- ASUS/OEM screen detection now recognizes `Display State=ON` as well as older `Display Power: state=ON` dumps.

### Safety

- Replacement requires active ADBKeyboard; source/API `clear: true` with `useAdbKeyboard: false` fails before mutation. Non-clearing fallback insertion remains supported. Callers must still focus and verify the intended field.
- Recovery does not enable legacy TCP/IP debugging, redirect explicit USB targets, guess among multiple devices, or replay timeouts/closed connections/authorization errors.
- Readiness never enters credentials or changes screen timeout or lock settings.

## [0.2.0] - 2026-04-14

### Changed

- Renamed package from `@artemisai/pi-droid` to `pi-droid` (cleaner install: `pi install pi-droid`)

## [0.1.3] - 2026-04-13

### Changed

- Add `pi.image` field to package manifest for logo display on pi.dev package registry

## [0.1.2] - 2026-04-13

### Changed

- Restored `banner.jpeg` to README heading
- Added GitHub release badge to README
- Improved intro paragraph for clarity and SEO

## [0.1.1] - 2026-04-13

### Changed

- Optimized npm description for discoverability on pi.dev and npm search
- Added keywords: `phone`, `mobile`, `ui-automation`, `testing`, `pi`, `pi-coding-agent`, `ai`
- Added `publishConfig.access: "public"` for simpler publishing
- Added `pi install` callout at top of README for instant visibility

## [0.1.0] - 2026-04-13

### Added

- 36 LLM-visible tools for full Android device control via ADB
- Annotated screenshots with numbered element indices for resolution-independent interaction
- Plugin system with `CliPlugin` base class and marketplace integration
- 4 skill definitions (`android-screen`, `android-interact`, `android-automate`, `android-plugin`)
- Deterministic input routing for common one-tool actions
- Multi-device support with device registry and serial-based targeting
- Gesture macro recording, saving, and replay
- Screen lock management (PIN, pattern, query, clear)
- WiFi ADB for wireless device connections
- OCR fallback via Tesseract for WebViews and dynamic content
- Full public API re-exporting ADB primitives for custom automation
- 473+ tests across 36 test files (unit, integration, device E2E)
- Comprehensive documentation (README, ARCHITECTURE, PLUGINS, CONTRIBUTING, SECURITY)

[0.1.0]: https://github.com/ArtemisAI/pi-droid/releases/tag/v0.1.0
