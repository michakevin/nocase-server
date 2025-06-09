import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveNocaseSafe, checkSymlinkSafety } from "../src/server.js";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";

const __dir = dirname(fileURLToPath(import.meta.url));

describe("Symlink security tests", () => {
  let tempDir;
  let testRoot;

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = await mkdtemp(join(tmpdir(), "nocase-test-"));
    testRoot = join(tempDir, "webroot");
    await fs.mkdir(testRoot, { recursive: true });

    // Create test files
    await fs.writeFile(join(testRoot, "safe.txt"), "safe content");
    await fs.mkdir(join(testRoot, "subdir"));
    await fs.writeFile(
      join(testRoot, "subdir", "nested.txt"),
      "nested content"
    );

    // Create a file outside webroot that we shouldn't access
    await fs.writeFile(join(tempDir, "secret.txt"), "secret content");
  });

  afterEach(async () => {
    // Cleanup
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  test("blocks symlink escape attempts", async () => {
    try {
      // Create symlink pointing outside webroot
      await fs.symlink(
        join(tempDir, "secret.txt"),
        join(testRoot, "escape.txt")
      );

      // Try to resolve the symlinked file
      const result = await resolveNocaseSafe(testRoot, ["escape.txt"]);

      // resolveNocaseSafe should find the file, but checkSymlinkSafety should reject it
      expect(result).not.toBeNull();

      // Test the safety check
      const safePath = await checkSymlinkSafety(testRoot, result);
      expect(safePath).toBeNull(); // Should be rejected by safety check
    } catch (err) {
      // On systems where symlinks aren't supported, this is expected
      if (err.code !== "EPERM" && err.code !== "ENOTSUP") {
        throw err;
      }
    }
  });

  test("allows safe symlinks within webroot", async () => {
    try {
      // Create symlink pointing to file within webroot
      await fs.symlink(join(testRoot, "safe.txt"), join(testRoot, "alias.txt"));

      // Should be able to resolve this
      const result = await resolveNocaseSafe(testRoot, ["alias.txt"]);
      expect(result).not.toBeNull();

      // Safety check should pass for safe symlinks
      const safePath = await checkSymlinkSafety(testRoot, result);
      expect(safePath).not.toBeNull();
      if (safePath) {
        expect(safePath).toContain("safe.txt");
      }
    } catch (err) {
      // On systems where symlinks aren't supported, skip this test
      if (err.code === "EPERM" || err.code === "ENOTSUP") {
        console.log("Skipping symlink test - not supported on this system");
        return;
      }
      throw err;
    }
  });

  test("blocks symlink pointing to parent directory", async () => {
    try {
      // Symlink that points to the parent directory
      await fs.symlink("..", join(testRoot, "parent"));

      // Attempt to access a file in the parent directory via the symlink
      const result = await resolveNocaseSafe(testRoot, ["parent", "secret.txt"]);
      expect(result).not.toBeNull();

      const safePath = await checkSymlinkSafety(testRoot, result);
      expect(safePath).toBeNull();
    } catch (err) {
      if (err.code === "EPERM" || err.code === "ENOTSUP") {
        console.log("Skipping symlink test - not supported on this system");
        return;
      }
      throw err;
    }
  });
});
