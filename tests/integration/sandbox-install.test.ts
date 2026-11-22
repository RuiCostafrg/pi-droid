/**
 * Integration test: sandbox install verification.
 *
 * Simulates `pi install pi-droid` by running npm pack,
 * installing into a sandbox, and verifying the package installs cleanly.
 *
 * Note: The pi extension loader discovers extensions via its own internal
 * resolution logic which differs between dev (jiti + TypeScript) and
 * production (compiled JS). Full extension loading is tested by
 * extension-load.test.ts using the packaged entry point.
 *
 * This test verifies the npm package artifact is valid.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const exec = promisify(execFile);
const PACKAGE_DIR = join(import.meta.dirname, "../..");

beforeAll(async () => {
  // Ensure dist/ is fresh before packing
  await exec("npm", ["run", "build"], { cwd: PACKAGE_DIR, timeout: 120_000 });
}, 135_000);

describe("Sandbox install verification", () => {
  it("npm pack produces a valid tarball", async () => {
    const { stdout: output } = await exec("npm", ["pack", "--dry-run", "--json"], {
      cwd: PACKAGE_DIR,
      encoding: "utf-8",
      timeout: 45_000,
    });
    // Verify key files are present
    expect(output).toContain("dist/index.js");
    expect(output).toContain("dist/index.d.ts");
    expect(output).toContain("LICENSE");
    expect(output).toContain("README.md");
    expect(output).toContain("config/default.json");
    // Skills included
    expect(output).toContain("skills/android-screen/SKILL.md");
    expect(output).toContain("skills/android-interact/SKILL.md");
    expect(output).toContain("skills/android-automate/SKILL.md");
    expect(output).toContain("skills/android-plugin/SKILL.md");
    // Excluded: flows, tests, src, debug artifacts
    expect(output).not.toContain("dist/flows/");
    expect(output).not.toContain("src/");
    expect(output).not.toContain("tests/");
    expect(output).not.toContain(".claude/");
    expect(output).not.toContain(".png");
  }, 55_000);

  it("installs cleanly in a sandbox", async () => {
    const sandbox = mkdtempSync(join(tmpdir(), "pi-droid-sandbox-"));
    try {
      const { stdout } = await exec("npm", ["pack", "--pack-destination", sandbox], {
        cwd: PACKAGE_DIR,
        encoding: "utf-8",
        timeout: 45_000,
      });
      const tarball = stdout.trim().split("\n").pop()!.trim();

      // Create minimal package.json
      writeFileSync(join(sandbox, "package.json"), JSON.stringify({
        name: "test-sandbox",
        private: true,
        type: "module",
        dependencies: { "pi-droid": `file:./${tarball}` },
      }));

      // Pi provides the host peers. This fixture installs the extension and its own dependencies.
      await exec("npm", ["install", "--omit=peer", "--no-audit", "--no-fund", "--prefer-offline", "--fetch-retries=0"], {
        cwd: sandbox,
        timeout: 120_000,
      });

      // Verify installed
      const pkgDir = join(sandbox, "node_modules/pi-droid");
      expect(existsSync(pkgDir)).toBe(true);
      expect(existsSync(join(pkgDir, "dist/index.js"))).toBe(true);
      expect(existsSync(join(pkgDir, "dist/index.d.ts"))).toBe(true);
      expect(existsSync(join(pkgDir, "skills/android-screen/SKILL.md"))).toBe(true);

      // Verify pi manifest
      const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf-8"));
      expect(pkg.pi.extensions).toContain("./dist/index.js");
      expect(pkg.pi.skills).toContain("./skills");

      // Verify no flows leaked
      expect(existsSync(join(pkgDir, "dist/flows"))).toBe(false);

      // Verify no personal data
      const configContent = readFileSync(join(pkgDir, "config/default.json"), "utf-8");
      expect(configContent).not.toContain("hinge");
      expect(configContent).not.toContain("1440");
      expect(configContent).not.toContain("2960");
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  }, 180_000);
});
