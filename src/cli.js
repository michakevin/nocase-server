#!/usr/bin/env node
// src/cli.js
import http from "node:http";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { createHandler } from "./server.js";

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
  console.log(`Usage: nocase-server [folder] [-p port] [--no-spa]
Default folder "."  port 8080`);
  process.exit(0);
}

const root = resolve(argv[0] || ".");
const port = Number(
  argv.includes("-p") ? argv[argv.indexOf("-p") + 1] : process.env.PORT || 8080
);

// SPA flag handling
const spa = !argv.includes("--no-spa");

/* ─── start server ─── */
const srv = http.createServer(createHandler(root, { spa }));

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
