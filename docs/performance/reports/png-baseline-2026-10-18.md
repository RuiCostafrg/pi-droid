# PNG isolation pre-implementation checkpoint

User approved the bounded PNG concurrency slice and validation sequence. Production
source remains at clean published 72559c93924da03d2fd32a492737c285cad81f7d.
New focused/loaded drivers were frozen before production edits; historical drivers
and reports remain unchanged. No implementation has occurred at this checkpoint.

- Authorized connected phone rediscovered using `adb devices -l`; one device,
  authorization/connectivity/screen/storage verified. `adb mdns services` is
  unsupported by this host server (exit 1); no reconnect/connectivity change made.
- Preflight inactive-ADBKeyboard warning expected: original Gboard active. Original
  IME captured privately; Termux and normal Forge Overview → Sessions verified.
  User asked to proceed; hands-off notice given. No concurrent device activity.
- Frozen v3.2 before attempt1 FAIL **8907.613278ms**, fixed execution checkpoint,
  before shopping observations/Forge/writes. No draft. Failed shell/native capture
  provenance is bounded by the retained report; no raw error captured, no proven
  cause inferred. Original IME/Termux independently verified after failure.
- Read-only Amazon homepage launch/native observation succeeded afterward. No
  viewport/check/driver changes, no shopping mutation or mid-run intervention.
- Unchanged before attempt2 PASS **309200.604882ms**, all shopping checks,
  all 30 writes + 30 persisted values. Retained TEST draft:
  `E2E Lower v3.2 source-png-before98`, 15 unchecked sets at 20kg × 8.
- NEW `png-concurrency-check.mjs`: Settings → Termux app info, three rounds each
  sequential and mixed concurrent takeScreenshot/base64; 12/12 correct PNGs,
  1080×2340, retained file matches returned base64. Per-call clocks separate,
  completed synchronous sinks; no live failure forced. Static concurrent success
  does not prove frame ownership; deterministic process tests must do that.
- Fresh build before loaded baseline. NEW `png-loaded-check.mjs` actual fresh
  nonpersistent Pi JSON CLI explicitly loads dist/index.js only, no MCP/discovered
  extensions. Actual android_screenshot(include_base64:true) **472ms** and
  android_look(include_image:true,all_elements:true) **2563ms** PASS. Both PNGs,
  exact Settings/Termux/OPEN index, matched calls, settled/not aborted, six build
  hashes checked unchanged. Parent session NOT reloaded. No clocks merged.
- Original Gboard and Termux independently verified after full/focused/loaded
  blocks. No new APK/helper/permission/debugging exposure or shopping mutation.

Reports (all NEW, exclusive-create):
- `workflow-v3.2-png-before-attempt1-2026-10-18.json` (failed, preserved)
- `workflow-v3.2-png-before-attempt2-2026-10-18.json` (passing reference)
- `png-focused-before-2026-10-18.json`
- `png-loaded-before-2026-10-18.json`

Next: deterministic public screenshot APIs/external fake ADB RED → GREEN, then
fresh full after/focused/loaded checks under the same frozen drivers. Full gate
remains OPEN until the changed implementation passes. New comparator must pin
72559c9 and only screenshot.ts; never modify historical checkpoint comparators.
