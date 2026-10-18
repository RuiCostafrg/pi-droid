# Fresh annotation baseline — saved before production edits

Source `09c3cc8`, clean production tree. Frozen workflow/consumer unchanged.

- `workflow-annotation-before-2026-10-18-attempt1.json`: PASS, 290991.75ms,
  Amazon observations + 30 writes + 30 persisted values, original IME/Termux restored.
- `annotation-before-2026-10-18-attempt1.json`: PASS, 6/6 Settings → Termux
  app-info calls, three rounds each interactive/no-base64 and all-elements/base64.
  Exact OPEN, all-elements Termux, numbering/index and image checks pass.
  Counts 10 / 46. Medians 2552.23ms / 2503.80ms. Source clocks currently
  independent between siblings; NOT a shared annotation clock. 87 spans total.
- `annotation-loaded-before-2026-10-18-attempt3.json`: PASS, actual freshly
  started nonpersistent Pi JSON CLI explicitly loading rebuilt dist/index.js,
  only android_look allowed, MCP disabled. Exact Settings/Termux/OPEN in numbered
  index; 2799ms tool execute. Build hashes checked unchanged afterward.
- Loaded attempts 1 and 2 fail before any tool events. The new runner left piped
  stdin open; CLI input waiting was implicated by the successful stdin-close probe.
  Each child was configured with a 180s limit, but detailed exception/deadline
  provenance was NOT retained. Attempt 1 discarded raw exception metadata;
  attempt 2's first diagnostic file
  was empty, so detailed timeout provenance was not retained. Closing child stdin
  makes attempt 3 pass with the same extension/model. Both failed reports retained;
  no claim they exercise annotation or establish ADB timeouts. Runner diagnostic
  retention corrected before passing baseline; driver now frozen across pair.

All reports exclusively created, no production changes yet. No concurrent
builds/tests/device actions during measurements. Gboard and Termux independently
verified after every full/focused/loaded attempt. Fresh authorized transport,
normal Forge navigation and hands-off use checked. One new TEST draft remains:
`E2E Lower v2 source-ann-before88` (15 total including prior 14), 15 unchecked sets
at 20kg × 8; no real workout completed or Amazon mutation. No new APK/helper/
permission/debugging exposure. Raw loaded events remain private in temporary storage.

Next implement only shared annotation clock and sibling/map/text-index spans.
No backend/concurrency/retry/timeout/failure-policy changes or sibling cancellation.
The workflow does not exercise annotation; focused/loaded coverage is separate.
