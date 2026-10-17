---
name: android-screen
description: Perceive Android device state — screenshots, annotated UI views, OCR, activity detection, screen state queries
---

## When to use

Use this skill when you need to understand what's currently displayed on the Android device. This includes seeing the screen, identifying UI elements, reading text via OCR, or checking which app/activity is in the foreground.

## Tools

| Tool | Purpose | Context cost |
|------|---------|-------------|
| `android_look` | Annotated screenshot with numbered element index — primary perception tool | Low |
| `android_screen_state` | Current activity, package, orientation, lock state as JSON | ~0 |
| `android_screenshot` | Raw screenshot image — use for failure diagnosis only | HIGH |
| `android_ui_dump` | Text hierarchy summary; optional information labels and native-only acquisition | Medium |
| `android_ocr` | Tesseract OCR on current screen or saved screenshot | Medium |
| `android_observe` | Continuous screen state observation | Low |

## Preferred order

1. Start with `android_screen_state` to check activity/package (zero context cost)
2. For native information reading, use `android_ui_dump` with `all_elements: true, ocr_fallback: false`: fresh hierarchy, no screenshots/OCR, acquisition errors propagate. `[non-interactive]` labels are information, not tap targets. Native text may be incomplete; choose explicit OCR/visual perception if needed.
3. Use `android_look` when a screenshot with labeled elements is needed
4. Fall back to `android_ocr` if UI tree doesn't capture text (dynamic/WebView content)
5. Use `android_screenshot` only for final confirmation or debugging failures

## Examples

```
"What app is open?" → android_screen_state
"What's on the screen?" → android_look
"Read the text in this image" → android_ocr
"Is the screen locked?" → android_screen_state
```
