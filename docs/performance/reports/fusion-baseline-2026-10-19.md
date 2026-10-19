# Transfer/cleanup fusion — pre-production-edit checkpoint

User approved binary-safe transfer + best-effort owned remote cleanup in one ADB
process, fallback cleanup retained, shared existing execution policies. Scope is
exec.ts plus screenshot.ts, public API/external-process tests and opt-in bounded,
content-free cleanup outcome events. No public result-shape change, image-size
cap, cancellation/recovery redesign, shared filenames or new device helper.

Published starting source `35de2c6096e76caa6b69aa95af268ed0312d868d` independently
matched origin/main; tree initially clean. All production source still matches it
at this checkpoint. New `fusion-check.mjs` frozen before production edits.

Fresh authorized phone rediscovered, unlocked/connected/storage verified. Original
Gboard active; screenshot blocks do not change it. Full workflow temporarily uses
existing ADBKeyboard and restores original. Normal Forge Overview → Sessions
navigation verified; hands-off notice given. No concurrent build/test/device use.

- Frozen v3.2 baseline attempt1 FAIL **9067.913642ms** at first native UI dump:
  adb_attempt/device_dump exit errors, trace partial; before shopping/Forge writes.
  Failure preserved. Subsequent read-only Amazon launch/native inspection succeeded;
  no proven cause inferred, no historical driver/check/settings changed.
- Unchanged baseline attempt2 PASS **318324.816910ms**, all shopping checks,
  **30 exact writes +30 persisted values**. Retained TEST draft
  `E2E Lower v3.2 source-fuse-before14`, 15 unchecked sets, 20kg ×8.
- Frozen png-concurrency-check: **12/12** PNGs, 1080×2340, saved bytes/base64 match.
  New frozen fusion-check: **32/32**, eight reversed-order rounds/mode/API, public
  wall vs validation, bounded scoped spans, cleanup callback intentionally ignored
  by baseline and records zero events. All source-before/after hashes match.
- Fresh rebuild + actual fresh Pi JSON CLI registered screenshot/look PASS:
  **591/2544ms**, image/index guards, all six build hashes unchanged. Parent NOT
  reloaded; raw events stay private/temp; not source/model clocks.
- Original Gboard + Termux independently queried after each attempt and block.
  No Amazon mutation/completed workout/new APK/helper/permission/debug exposure.
- New fusion-check initially failed node --check on one extra parenthesis, before
  any script/device execution or report creation. Fixed before freezing/measuring.
  A first replacement was accidentally identical/no-op; neither was a live attempt.

Reports retained: workflow-v3.2-fusion-before-attempt1/attempt2-2026-10-19.json,
fusion-focused-before-2026-10-19.json, fusion-loaded-before-2026-10-19.json,
fusion-metrics-before-2026-10-19.json.

Next: deterministic RED→GREEN at approved seams, then unchanged full/focused/
metrics/actual loaded after gates. No optimization acceptance yet. Historical
comparator fixtures must remain checkpoint-matching; never rewrite old evidence.
