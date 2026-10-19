# Capture-envelope diagnostic audit

Two unchanged-source blocks. All samples retained; controls are not subtracted.

| Block | Variant | Host capture median ms (min–max) | Device bracket median ms (min–max) | Quantum ms |
| --- | --- | --- | --- | --- |
| 1 | plain | 343.87 (310.32–353.27) | not measured | n/a |
| 1 | bracketed | 377.07 (345.64–406.10) | 315.00 (290.00–340.00) | 10 |
| 1 | control | 80.13 (70.02–93.60) | 20.00 (10.00–20.00) | 10 |
| 2 | plain | 343.04 (322.46–366.21) | not measured | n/a |
| 2 | bracketed | 388.18 (369.25–407.85) | 325.00 (310.00–340.00) | 10 |
| 2 | control | 75.82 (66.43–85.95) | 10.00 (10.00–20.00) | 10 |

- Two unchanged-source diagnostic repetitions, not an optimization before/after or causal experiment.
- Host and device clocks separate; control and representation precision reported, never subtracted from medians.
- No CPU/encoding/storage/thermal/network attribution; no speedup, population-tail or cumulative-gain claim.
- Strict offline invariants/provenance cannot attest arbitrary JSON was honestly measured.
