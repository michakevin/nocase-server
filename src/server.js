// src/server.js
import http from "node:http";
import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import { join, resolve, relative, sep } from "node:path";
import mime from "mime";

/* ─────────────────── helper ─────────────────── */

// Simple LRU cache for directory resolution
const cache = new Map();
let MAX_CACHE_SIZE = 2000;

/** Prüft, ob `target` sich noch innerhalb von `base` befindet. */
function isInside(base, target) {
  const rel = relative(base, target);
  return rel !== ".." && !rel.startsWith(".." + sep);
}

/**
 * Checks if a file path is safe after symlink resolution.
 * @param {string} base - The base directory
 * @param {string} filePath - The file path to check
 * @returns {Promise<string|null>} - The real path if safe, null otherwise
 */
export async function checkSymlinkSafety(base, filePath) {
  try {
    const realPath = await fs.realpath(filePath);
    const realBase = await fs.realpath(base);
    return isInside(realBase, realPath) ? realPath : null;
  } catch {
    return null;
  }
}

/**
 * Parse simple Range header for byte ranges.
 * @param {string} rangeHeader - The Range header value
 * @param {number} fileSize - The file size
 * @returns {object|null} - Range info or null if invalid
 */
function parseRange(rangeHeader, fileSize) {
  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) return null;

  const range = rangeHeader.substring(6).trim();
  if (!range) return null;

  const [startStr, endStr] = range.split("-");

  let start;
  let end;

  // Suffix byte range, e.g. "bytes=-100" → last 100 bytes
  if (startStr === "") {
    const suffixLength = parseInt(endStr, 10);
    if (isNaN(suffixLength)) return null;
    start = fileSize - suffixLength;
    if (start < 0) start = 0;
    end = fileSize - 1;
  } else {
    start = parseInt(startStr, 10);
    if (isNaN(start)) return null;

    if (!endStr) {
      end = fileSize - 1;
    } else {
      end = parseInt(endStr, 10);
      if (isNaN(end)) return null;
    }
  }

  if (start < 0 || end >= fileSize || start > end) return null;

  return { start, end, length: end - start + 1 };
}

/**
 * Set the cache size for directory resolution.
 * @param {number} size - Cache size (0 to disable)
 */
export function setCacheSize(size) {
  MAX_CACHE_SIZE = size;
  if (size === 0) {
    cache.clear();
  } else if (cache.size > size) {
    // Trim cache to new size
    const entries = Array.from(cache.entries());
    cache.clear();
    entries.slice(-size).forEach(([k, v]) => cache.set(k, v));
  }
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

    if (MAX_CACHE_SIZE > 0 && cache.has(key)) {
      cur = cache.get(key);
      continue;
    }

    let found = false;
    for await (const dirent of await fs.opendir(cur)) {
      // Note: We allow symlinks here but check safety later with checkSymlinkSafety
      if (dirent.name.toLowerCase() === seg.toLowerCase()) {
        cur = join(cur, dirent.name);

        // Add to cache with LRU eviction
        if (MAX_CACHE_SIZE > 0) {
          if (cache.size >= MAX_CACHE_SIZE) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
          }
          cache.set(key, cur);
        }

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
export function createHandler(root, { spa = true, plainError = false } = {}) {
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

      // Additional symlink safety check on final file
      const safePath = await checkSymlinkSafety(root, file);
      if (!safePath)
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      file = safePath;

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

      // Handle Range requests
      const rangeHeader = req.headers.range;
      const range = parseRange(rangeHeader, stat.size);

      if (range) {
        // Partial content response
        res.writeHead(206, {
          "Content-Type": type,
          "Content-Length": range.length,
          "Content-Range": `bytes ${range.start}-${range.end}/${stat.size}`,
          "Accept-Ranges": "bytes",
        });

        // Handle HEAD requests for ranges
        if (req.method === "HEAD") {
          res.end();
          return;
        }

        const stream = createReadStream(file, {
          start: range.start,
          end: range.end,
        });
        stream.on("error", (e) => {
          if (e.code !== "ECONNRESET") console.error(e);
        });
        stream.pipe(res);
      } else if (rangeHeader) {
        // Invalid range
        res
          .writeHead(416, {
            "Content-Range": `bytes */${stat.size}`,
          })
          .end();
      } else {
        // Normal response
        res.writeHead(200, {
          "Content-Type": type,
          "Content-Length": stat.size,
          "Accept-Ranges": "bytes",
        });

        // Handle HEAD requests without opening stream
        if (req.method === "HEAD") {
          res.end();
          return;
        }

        const stream = createReadStream(file);
        stream.on("error", (e) => {
          if (e.code !== "ECONNRESET") console.error(e);
        });
        stream.pipe(res);
      }
    } catch (err) {
      if (err.code === "ENOENT") {
        if (plainError) {
          res
            .writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
            .end("Not found");
        } else {
          const html = `<!DOCTYPE html>
<html>
<head><title>404 - File not found</title></head>
<body>
<h1>404 - File not found</h1>
<p>The requested file could not be found.</p>
</body>
</html>`;
          res
            .writeHead(404, { "Content-Type": "text/html; charset=utf-8" })
            .end(html);
        }
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
