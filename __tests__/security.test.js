import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveNocaseSafe, checkSymlinkSafety } from "../src/server.js";
import { tmpdir } from "node:os";

const __dir = dirname(fileURLToPath(import.meta.url));

describe("Security tests", () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), "nocase-test-"));

    // Create test structure
    await fs.mkdir(join(tempDir, "public"));
    await fs.writeFile(join(tempDir, "public", "test.html"), "<h1>Test</h1>");
    await fs.writeFile(join(tempDir, "secret.txt"), "SECRET DATA");
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  test("prevents symlink traversal", async () => {
    const publicDir = join(tempDir, "public");
    const secretFile = join(tempDir, "secret.txt");

    try {
      // Create symlink from public dir to parent's secret file
      await fs.symlink("../secret.txt", join(publicDir, "escape"));

      // Try to access the symlinked secret file
      const result = await resolveNocaseSafe(publicDir, ["escape"]);

      // resolveNocaseSafe should find the symlink, but checkSymlinkSafety should reject it
      expect(result).not.toBeNull();

      // The safety check should prevent the escape
      const safePath = await checkSymlinkSafety(publicDir, result);
      expect(safePath).toBeNull();
    } catch (e) {
      // Some systems might not support symlinks, skip test
      if (e.code === "EPERM" || e.code === "ENOTSUP") {
        console.log("Skipping symlink test - not supported on this system");
        return;
      }
      throw e;
    }
  });

  test("prevents path traversal with dot-dot", async () => {
    const publicDir = join(tempDir, "public");

    // Try various traversal attempts
    const attempts = [
      [".."],
      ["..", "secret.txt"],
      [".", "..", "secret.txt"],
      ["test", "..", "..", "secret.txt"],
    ];

    for (const segs of attempts) {
      const result = await resolveNocaseSafe(publicDir, segs);
      expect(result).toBeNull();
    }
  });

  test("allows legitimate access to files in root", async () => {
    const publicDir = join(tempDir, "public");

    const result = await resolveNocaseSafe(publicDir, ["test.html"]);
    expect(result).toBe(join(publicDir, "test.html"));
  });

  test("handles empty path segments correctly", async () => {
    const publicDir = join(tempDir, "public");

    // Empty segments should resolve to root
    const result = await resolveNocaseSafe(publicDir, []);
    expect(result).toBe(publicDir);
  });
});
