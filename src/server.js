// src/server.js
import http from "node:http";
import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import { join, resolve, relative, sep } from "node:path";
import mime from "mime";

/* ─────────────────── helper ─────────────────── */

// Simple LRU cache for directory resolution
const cache = new Map();
const MAX_CACHE_SIZE = 2000;

/** Prüft, ob `target` sich noch innerhalb von `base` befindet. */
function isInside(base, target) {
  const rel = relative(base, target);
  return rel !== undefined && !rel.startsWith(".." + sep);
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
    const key = `${cur}|${seg.toLowerCase()}`;

    if (cache.has(key)) {
      cur = cache.get(key);
      continue;
    }

    let found = false;
    for await (const dirent of await fs.opendir(cur)) {
      if (dirent.isSymbolicLink()) continue;
      if (dirent.name.toLowerCase() === seg.toLowerCase()) {
        cur = join(cur, dirent.name);

        // Add to cache with LRU eviction
        if (cache.size >= MAX_CACHE_SIZE) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
        cache.set(key, cur);

        found = true;
        break;
      }
    }
    if (!found) return null;
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
    // HTTP method whitelist
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }

    try {
      const urlPath = decodeURIComponent(req.url.split("?")[0]);
      const segs = urlPath.split("/").filter(Boolean);

      let file = await resolveNocaseSafe(root, segs);

      // SPA-Fallback
      if (!file && spa) {
        file = await resolveNocaseSafe(root, ["index.html"]);
      }
      if (!file) throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });

      let stat = await fs.stat(file);
      if (stat.isDirectory()) {
        // For directories, try to find index.html case-insensitively
        const indexFile = await resolveNocaseSafe(file, ["index.html"]);
        if (indexFile) {
          file = indexFile;
          stat = await fs.stat(file);
        } else {
          throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
        }
      }

      const type = mime.getType(file) || "application/octet-stream";
      res.writeHead(200, { "Content-Type": type, "Content-Length": stat.size });

      const stream = createReadStream(file);
      stream.on("error", (e) => {
        if (e.code !== "ECONNRESET") console.error(e);
      });
      stream.pipe(res);
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
  const srv = http.createServer(createHandler(root));

  srv.on("error", (e) => {
    if (e.code === "EADDRINUSE") {
      console.error(`Port ${port} already in use`);
      process.exit(1);
    }
    throw e;
  });

  srv.listen(port, () =>
    console.log(`★ nocase-server » http://localhost:${port}  (root: ${root})`)
  );
}
