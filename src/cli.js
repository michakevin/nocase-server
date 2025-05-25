#!/usr/bin/env node
// src/cli.js
import http from "node:http";
import { resolve } from "node:path";
import { createHandler } from "./server.js";

/* ─── very tiny CLI parsing ─── */
const argv = process.argv.slice(2);
const root = resolve(argv[0] || ".");
const port = Number(
  argv.includes("-p") ? argv[argv.indexOf("-p") + 1] : process.env.PORT || 8080
);

if (argv.includes("-h") || argv.includes("--help")) {
  console.log(`Usage: nocase-server [folder] [-p port]
Default folder "."  port 8080`);
  process.exit(0);
}

/* ─── start server ─── */
http.createServer(createHandler(root)).listen(port, () => {
  console.log(`★ nocase-server » http://localhost:${port}  (root: ${root})`);
});
