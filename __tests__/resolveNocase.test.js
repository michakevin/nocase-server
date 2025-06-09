import { resolveNocaseSafe } from "../src/server.js";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "fixtures");

describe("resolveNocaseSafe()", () => {
  test("finds file regardless of case", async () => {
    const file = await resolveNocaseSafe(root, ["img", "logo.png"]);
    expect(file).not.toBeNull();

    // Pfad in lower-case normalisieren, damit Groß-/Kleinschreibung egal ist
    const expectSuffix = join("img", "logo.png").toLowerCase();
    expect(file.toLowerCase().endsWith(expectSuffix)).toBe(true);
  });

  test("blocks path traversal", async () => {
    const file = await resolveNocaseSafe(root, ["..", "etc", "passwd"]);
    expect(file).toBeNull();
  });
});
