# Whole-field input replacement: fix and real-device regression

## Result

Fixed `typeText(value, { clear: true })`, the path used by `android_type`'s
`clear_first`. Previously it returned success while retaining old text. The
existing active-IME guard still rejects inactive ADBKeyboard before any mutation.

- **Before:** 0/4 exact live readbacks passed.
- **After clearing fix only:** 3/4 passed; emoji readback exposed a separate XML
  decoding bug, not failed insertion. This failed intermediate run is retained.
- **After clearing + XML readback fixes:** **4/4 passed**, including ordinary
  title replacement, shortening a numeric string, Unicode/emoji, and empty text.
- The same pre-existing test draft `E2E Lower v1 source-after5` was reused only
  for its title field. Its exact original title was restored after every run.
  No new drafts, numeric workout changes, completed sets, purchases or user
  record edits. Original Gboard and Termux restored and independently verified.

## Root cause and changes

1. `src/adb/input.ts` previously sent Home, then `input keyevent --longpress`
   with Shift and End, then Delete. Android sends these as individual key
   press/release pairs, not a held modifier chord. It moved to End and deleted
   one character, leaving e.g. `Lower sessioE2E replacement`. Home/End also does
   not provide reliable whole-field selection for multiline editors.
2. After checking active ADBKeyboard, use its `ADB_CLEAR_TEXT` InputConnection
   operation, then the existing Base64 commit. A clear command failure aborts
   insertion. No changes to IME-switching policy or automatic focus selection.
3. `useAdbKeyboard: false` with `clear: true` now fails BEFORE mutation, because
   generic shell keyevents cannot guarantee selection/clearing in arbitrary
   editors. Ordinary fallback insertion (`clear: false` or omitted) is unchanged.
   This is an intentional safety restriction, not an unverified key-chord fallback.
4. Live emoji verification then observed the exact raw attribute
   `Mandel &#129371;` and the same undecoded parser output. The input was correct;
   `src/adb/ui-tree.ts` decoded only named entities. The parser now decodes valid
   decimal/hex XML character references in ONE pass. Escaped literal entities
   stay literal; invalid/null/surrogate/out-of-range references remain unchanged
   rather than throwing or injecting invalid characters.

These are separate causes: the input fix addresses retained prefixes; the parser
fix makes exact Unicode readback truthful. The fallback restriction and parser
behavior changes are documented rather than hidden in a speed optimization.

## Evidence and commands

Saved reports (content-free aside from fixed case names, lengths and hashes):
- [Before](input-replacement-before-2026-10-16.json)
- [Intermediate, clear fix only](input-replacement-after-2026-10-16.json)
- [Final, all four pass](input-replacement-after-readback-fix-2026-10-16.json)

`sourceHash` in these reports hashes **input.ts only**: intermediate and final
match because the second change was in ui-tree.ts. Do not treat that hash as a
whole-repository revision or claim that the parser did not change.

The source-level driver `scripts/input-replacement-e2e.mjs` was unchanged between
all three runs. Its replacement UNDER TEST calls `typeText(..., { clear: true })`
without a workaround. Explicit ADB_CLEAR_TEXT is used only to seed independent
known initial values and restore the fixture's original title in cleanup.

```sh
# Open the explicitly named TEST draft at its title field first, then return to
# Termux. Discover exactly one currently authorized device; export ANDROID_SERIAL.
PI_DROID_INPUT_E2E=1 node --import tsx scripts/input-replacement-e2e.mjs /private/new-report.json
```

The driver refuses any draft with another title. It restores the fixture, IME
and Termux in finally on handled failures; it does not add a global SIGKILL/crash
cleanup guarantee. The supervisor must restore/verify if interrupted. This is
source/API validation, not proof that the current Pi session's cached tools have
reloaded. Rebuild succeeded; reload the active session before using the new tools.

### Exact live values (all applied to the test TITLE editor)

| Case | Seed | Replacement | Before exact | Final exact |
| --- | --- | --- | --- | --- |
| Old title prefix | Lower session | E2E replacement | FAIL | PASS |
| Numeric string shortening | 12345 | 8 | FAIL | PASS |
| Unicode/emoji | Alte Übung | Mandel 🥛 | FAIL | PASS |
| Empty value | erase me | empty string | FAIL | PASS |

The numeric case is a numeric string in the title editor, not an independent
numeric-only keyboard/widget test. Multiline clearing is tested at the fake-ADB
InputConnection boundary; the live title widget is single-line. Full automatic
focus/value verification in production tools, other editors and end-to-end IME
lifecycle management remain separate work.

### Timing (small descriptive sample, not a full-workflow speedup)

| Case | Before input call ms | Final input call ms |
| --- | ---: | ---: |
| Old title prefix | 543.13 | 304.61 |
| Numeric shortening | 542.42 | 265.62 |
| Unicode | 490.00 | 249.53 |
| Empty | 530.69 | 270.30 |

Median **536.56ms → 267.96ms**, roughly 50% lower in these four calls. The call
chain drops from **5 ADB commands to 3** (IME query + clear + insert). Input-call
timings exclude the fresh hierarchy reads/settling/fixture preparation/cleanup.
The full focused runner was 65.140s before and 63.851s final; most time is capture
and verification, not typing. Before cases were incorrect, so this is NOT a
correctness-equivalent throughput benchmark. No Amazon/full-workout rerun or
population latency improvement is claimed. Earlier workflow baseline/failed
reports and its frozen workaround-based runner remain unmodified.

## Regression validation

- Red first: `npx vitest run tests/adb/input-replacement.test.ts` failed with
  expected `E2E replacement`, received `Lower sessioE2E replacement`.
- Green: 9 real-process-boundary input tests cover ordinary/numeric/Unicode/
  multiline/empty replacement, clear failure, inactive IME, unsupported fallback
  fail-before-mutation and non-clearing insertion. They model the external
  Android/IME protocol; they do NOT prove the real Android InputConnection.
- Separate red → green: `npm run test:capture -- -t 'decodes XML character references'`
  exercises the real public dump/pull/parser/assertion path with synthetic ADB,
  including decimal, hex, exactly-once literals and invalid references.
- `npm run test:unit`: **599 tests, 47 files PASS**.
- `npm run lint`, `npm run build`, live script syntax and diff whitespace: PASS.
- Isolated sequential extension-load/sandbox integration: **9/9 PASS** with the
  previously documented explicit time allowances. Default parallel CI not claimed.
- Temporary Unicode diagnostic probe removed. No debug logging left in source.
- At experiment completion there were no new commits/pushes; the subsequent
  user-requested publication checkpoint is recorded in [PLAN.md](../PLAN.md).
  Earlier metadata/workflow edits are preserved.

## Remaining limits

Broadcast exit is still not proof of the intended field being focused; callers
must focus and read back. This fix does not promise race-free behavior if focus
or IME changes during the operation, nor does it review/restrict implicit
broadcast exposure for sensitive input. Unsupported/custom keyboards may not
implement ADBKeyboard's protocol. The active-IME check remains mandatory.
