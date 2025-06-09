#!/usr/bin/env node
// src/cli.js
import http from "node:http";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { createHandler, setCacheSize } from "./server.js";

/* ─── very tiny CLI parsing ─── */
const argv = process.argv.slice(2);

// Version flag
if (argv.includes("-v") || argv.includes("--version")) {
  const pkg = JSON.parse(
    await fs.readFile(new URL("../package.json", import.meta.url), "utf8")
  );
  console.log(pkg.version);
  process.exit(0);
}

if (argv.includes("-h") || argv.includes("--help")) {
  console.log(`Usage: nocase-server [folder] [-p port] [--no-spa] [--cache <n>] [--plain-404]
Default folder "."  port 8080  cache 2000
--cache 0 disables cache`);
  process.exit(0);
}

// collect options regardless of position
let port = Number(process.env.PORT || 8080);
let spa = true;
let plainError = false;
const positionals = [];

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "-p") {
    port = Number(argv[i + 1]);
    i++;
    continue;
  }
  if (arg === "--no-spa") {
    spa = false;
    continue;
  }
  if (arg === "--cache") {
    const cacheSize = Number(argv[i + 1]);
    if (!isNaN(cacheSize)) {
      setCacheSize(cacheSize);
    }
    i++;
    continue;
  }
  if (arg === "--plain-404") {
    plainError = true;
    continue;
  }
  if (arg !== "-v" && arg !== "--version" && arg !== "-h" && arg !== "--help") {
    positionals.push(arg);
  }
}

const root = resolve(positionals[0] || ".");

/* ─── start server ─── */
const srv = http.createServer(createHandler(root, { spa, plainError }));

srv.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error(`Port ${port} already in use`);
    process.exit(1);
  }
  throw e;
});

srv.listen(port, () => {
  console.log(`★ nocase-server » http://localhost:${port}  (root: ${root})`);
});
