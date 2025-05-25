import { setCacheSize, resolveNocaseSafe } from "../src/server.js";
import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";

const __dir = dirname(fileURLToPath(import.meta.url));

describe("Cache functionality tests", () => {
  let tempDir;
  let testRoot;
  let originalOpendir;
  let opendirCallCount;

  beforeEach(async () => {
    // Reset cache size to default
    setCacheSize(2000);

    // Create temporary directory for each test
    tempDir = await mkdtemp(join(tmpdir(), "nocase-cache-test-"));
    testRoot = join(tempDir, "webroot");
    await fs.mkdir(testRoot, { recursive: true });

    // Create test files
    await fs.writeFile(join(testRoot, "test.txt"), "test content");
    await fs.mkdir(join(testRoot, "subdir"));
    await fs.writeFile(
      join(testRoot, "subdir", "nested.txt"),
      "nested content"
    );

    // Mock fs.opendir to count calls
    originalOpendir = fs.opendir;
    opendirCallCount = 0;
    fs.opendir = async (...args) => {
      opendirCallCount++;
      return originalOpendir.apply(fs, args);
    };
  });

  afterEach(async () => {
    // Restore original opendir
    fs.opendir = originalOpendir;

    // Cleanup
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  test("cache reduces fs.opendir calls on repeated requests", async () => {
    // First request
    const result1 = await resolveNocaseSafe(testRoot, ["test.txt"]);
    const firstCallCount = opendirCallCount;

    // Second request - should use cache
    const result2 = await resolveNocaseSafe(testRoot, ["test.txt"]);
    const secondCallCount = opendirCallCount;

    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();
    expect(result1).toBe(result2);
    expect(secondCallCount).toBe(firstCallCount); // No additional calls due to cache
  });

  test("cache can be disabled", async () => {
    // Disable cache
    setCacheSize(0);

    // First request
    await resolveNocaseSafe(testRoot, ["test.txt"]);
    const firstCallCount = opendirCallCount;

    // Second request - should not use cache
    await resolveNocaseSafe(testRoot, ["test.txt"]);
    const secondCallCount = opendirCallCount;

    expect(secondCallCount).toBeGreaterThan(firstCallCount);
  });

  test("cache size can be customized", async () => {
    // Set very small cache size
    setCacheSize(1);

    // Make requests for different files
    await resolveNocaseSafe(testRoot, ["test.txt"]);
    const firstCallCount = opendirCallCount;

    await resolveNocaseSafe(testRoot, ["subdir", "nested.txt"]);
    const secondCallCount = opendirCallCount;

    // Make first request again - should not be cached due to small cache size
    await resolveNocaseSafe(testRoot, ["test.txt"]);
    const thirdCallCount = opendirCallCount;

    expect(thirdCallCount).toBeGreaterThan(secondCallCount);
  });
});
