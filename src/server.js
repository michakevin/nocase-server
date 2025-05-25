// src/server.js
import http from "node:http";
import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import { join, resolve, relative, sep } from "node:path";
import mime from "mime";

/* ─────────────────── helper ─────────────────── */

/** Prüft, ob `target` sich noch innerhalb von `base` befindet. */
function isInside(base, target) {
  const rel = relative(base, target);
  return (
    rel &&
    !rel.startsWith(".." + sep) &&
    !relative(base, target).includes(".." + sep)
  );
}

/**
 * Case-insensitive Pfadauflösung mit Schutz vor
 * `..` Traversal & Symlink-Escape.
 *
 * @param {string} root   – absolutes Verzeichnis-Root
 * @param {string[]} segs – einzeln zerlegte URL-Segmente
 * @returns {string|null} – aufgelöster Dateipfad oder `null`
 */
export async function resolveNocaseSafe(root, segs) {
  if (segs.some((s) => s === "." || s === "..")) return null; // Traversal-Versuch

  let cur = root;
  for (const seg of segs) {
    const entries = await fs.readdir(cur);
    const hit = entries.find((e) => e.toLowerCase() === seg.toLowerCase());
    if (!hit) return null;
    cur = join(cur, hit);
  }

  // Symlink/Escape verhindern
  const abs = resolve(cur);
  const base = resolve(root);
  if (!isInside(base, abs)) return null;

  return abs;
}

/* ─────────────────── factory ─────────────────── */
export function createHandler(root, { spa = true } = {}) {
  return async (req, res) => {
    try {
      const urlPath = decodeURIComponent(req.url.split("?")[0]);
      const segs = urlPath.split("/").filter(Boolean);

      let file = await resolveNocaseSafe(root, segs);

      // SPA-Fallback
      if (!file && spa) file = join(root, "index.html");
      if (!file) throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });

      let stat = await fs.stat(file);
      if (stat.isDirectory()) {
        file = join(file, "index.html");
        stat = await fs.stat(file);
      }

      const type = mime.getType(file) || "application/octet-stream";
      res.writeHead(200, { "Content-Type": type, "Content-Length": stat.size });
      createReadStream(file).pipe(res);
    } catch (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404).end("Not found");
      } else {
        console.error(err);
        res.writeHead(500).end("Internal error");
      }
    }
  };
}

/* ─────────────────── dev helper ─────────────────── */
if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.cwd();
  const port = process.env.PORT || 8080;
  http
    .createServer(createHandler(root))
    .listen(port, () =>
      console.log(`★ nocase-server » http://localhost:${port}  (root: ${root})`)
    );
}
