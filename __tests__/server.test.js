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

  test("handles HEAD requests", async () => {
    const res = await request(srv).head("/IMG/logo.png");
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/image\/png/);
    expect(res.headers["content-length"]).toBeDefined();
    expect(res.body).toEqual({});
  });

  test("rejects unsupported HTTP methods", async () => {
    const res = await request(srv).post("/IMG/logo.png");
    expect(res.statusCode).toBe(405);
    expect(res.headers["allow"]).toBe("GET, HEAD");
  });

  test("rejects PUT method", async () => {
    const res = await request(srv).put("/IMG/logo.png");
    expect(res.statusCode).toBe(405);
    expect(res.headers["allow"]).toBe("GET, HEAD");
  });

  test("HEAD requests have no body but correct content-length", async () => {
    const res = await request(srv).head("/IMG/logo.png");
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-length"]).toBeDefined();
    expect(Number(res.headers["content-length"])).toBeGreaterThan(0);
    expect(res.body).toEqual({});
    // HEAD responses have no text property in supertest
    expect(res.text).toBeUndefined();
  });

  test("supports byte range requests", async () => {
    // First get the full file to know its size
    const fullRes = await request(srv).get("/IMG/logo.png");
    const fileSize = fullRes.body.length;

    // Request first 100 bytes
    const rangeRes = await request(srv)
      .get("/IMG/logo.png")
      .set("Range", "bytes=0-99");

    expect(rangeRes.statusCode).toBe(206);
    expect(rangeRes.headers["content-range"]).toBe(`bytes 0-99/${fileSize}`);
    expect(rangeRes.headers["content-length"]).toBe("100");
    expect(rangeRes.headers["accept-ranges"]).toBe("bytes");
    expect(rangeRes.body.length).toBe(100);
  });

  test("supports suffix byte range requests", async () => {
    const fullRes = await request(srv).get("/IMG/logo.png");
    const fileSize = fullRes.body.length;

    const rangeRes = await request(srv)
      .get("/IMG/logo.png")
      .set("Range", "bytes=-100");

    const start = fileSize - 100;
    const end = fileSize - 1;

    expect(rangeRes.statusCode).toBe(206);
    expect(rangeRes.headers["content-range"]).toBe(`bytes ${start}-${end}/${fileSize}`);
    expect(rangeRes.headers["content-length"]).toBe("100");
    expect(rangeRes.headers["accept-ranges"]).toBe("bytes");
    expect(rangeRes.body.length).toBe(100);
    expect(rangeRes.body.equals(fullRes.body.slice(start))).toBe(true);
  });

  test("handles invalid range requests", async () => {
    const res = await request(srv)
      .get("/IMG/logo.png")
      .set("Range", "bytes=9999999-");

    expect(res.statusCode).toBe(416);
    expect(res.headers["content-range"]).toMatch(/bytes \*\/\d+/);
  });

  test("HEAD requests work with range headers", async () => {
    const res = await request(srv)
      .head("/IMG/logo.png")
      .set("Range", "bytes=0-99");

    expect(res.statusCode).toBe(206);
    expect(res.headers["content-length"]).toBe("100");
    expect(res.body).toEqual({});
  });

  test("serves HTML 404 error by default", async () => {
    const res = await request(srv).get("/does/not/exist");
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toBe("text/html; charset=utf-8");
    expect(res.text).toContain("404 - File not found");
    expect(res.text).toContain("<!DOCTYPE html>");
  });
});
