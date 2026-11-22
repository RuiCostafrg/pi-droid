# Stage definitions for the shared verified-release-kit runner.
LOCAL_CI_NAME="pi-droid"
LOCAL_CI_DESCRIPTION="Mirrors .github/workflows/ci.yml (ubuntu-latest test job)."
LOCAL_CI_STAGES=(lint build tests)
LOCAL_CI_DEFAULT_STAGES=(lint build tests)

prepare() { node_min 22; require npm ""; npm ci; }

stage_lint()  { npm run lint; }
stage_build() { npm run build; }
stage_tests() {
  local timeout_ms="${PI_DROID_TEST_TIMEOUT_MS:-30000}"
  [[ "$timeout_ms" =~ ^[1-9][0-9]{0,8}$ ]] || _fail "PI_DROID_TEST_TIMEOUT_MS must be a positive number of milliseconds"
  npm run test:ci -- --no-file-parallelism --testTimeout="$timeout_ms" --hookTimeout="$timeout_ms"
}
