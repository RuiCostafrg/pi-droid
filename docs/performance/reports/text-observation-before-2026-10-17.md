# Registered text-observation before baseline

Status: **pass**. Correct: 6/6.
Driver SHA-256: `68a295ec48d859066c1e4e624bc31f9738f3abe489c5f550294cd0b9b9f81a22`.

Tool: `android_look`; arguments: `{"all_elements":true,"include_image":false}`.
Median: 3077.87ms; max: 3133.80ms.

Default dump exposes title: false; OPEN: true.
IME restored: true; Termux restored: true.

Same read-only Settings → Termux app-info fixture; exact title, OPEN control and foreground checks. Six fresh observations; cache invalidated before each, no TTL changes. Counts come from a category-only external ADB wrapper; raw text/errors/endpoints are not retained. Timing includes wrapper overhead and tool execution, excludes imports, warmup, setup and cleanup. This is source-registered tool execution, NOT active-session reload or LLM latency. 120s budget checked between rounds, 15s wrapper/ADB command bounds; not a hard whole-run watchdog. Finally handles caught failures, not host crashes/SIGKILL. No field writes, installs, permissions, purchases or draft changes.
