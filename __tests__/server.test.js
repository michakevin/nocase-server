import http from "node:http";
import request from "supertest";
import { createHandler } from "../src/server.js";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "fixtures");

let srv;

/*
 *  Für die Tests schalten wir den SPA-Fallback bewusst ab
 *  (spa:false), damit wirklich 404 zurückkommt, wenn eine Datei fehlt.
 */
beforeAll(() => {
  srv = http.createServer(createHandler(root, { spa: false })).listen(0); // Port 0 → OS wählt freien Port
});

afterAll(async () => {
  await new Promise((res) => srv.close(res)); // graceful shutdown
});

describe("nocase-server integration", () => {
  test("serves file ignoring case", async () => {
    const res = await request(srv).get("/IMG/logo.png");
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/image\/png/);

    // Bei Binärdaten liefert Supertest den Body als Buffer
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("responds 404 for missing file", async () => {
    const res = await request(srv).get("/does/not/exist");
    expect(res.statusCode).toBe(404);
  });
});
