# Local CI — `gh-signoff` (Linux only)

Run the CI checks on your own machine and post green `signoff/<stage>` commit
statuses with [basecamp/gh-signoff](https://github.com/basecamp/gh-signoff).

Use it when free Actions minutes run out — or as a fast pre-push gate. The GitHub
Actions workflows stay untouched; this lane covers **Linux only**.

## Setup (Linux)

```bash
gh auth login
gh extension install basecamp/gh-signoff
```

Toolchains: Node ≥ 22.

## Usage

```bash
scripts/local-ci.sh                # stages: lint build tests
scripts/local-ci.sh tests          # run selected stages only
scripts/local-ci.sh --no-signoff   # checks only, no statuses posted
```

Push your commits first: `gh signoff` only attests pushed work. Failing stages post
a red `signoff/<stage>` status automatically.

## Optional: make sign-off a merge requirement

```bash
gh signoff install lint build tests
gh signoff uninstall
```

## Notes

- The Claude review workflows (`claude.yml`, `claude-code-review.yml`) need OAuth
  secrets and hosted runtimes — they stay in Actions and are not covered locally.
