import http from "node:http";
import request from "supertest";
import { createHandler } from "../src/server.js";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "fixtures");

describe("SPA functionality", () => {
  let spaServer, noSpaServer;

  beforeAll(() => {
    spaServer = http.createServer(createHandler(root, { spa: true })).listen(0);
    noSpaServer = http
      .createServer(createHandler(root, { spa: false }))
      .listen(0);
  });

  afterAll(async () => {
    await Promise.all([
      new Promise((res) => spaServer.close(res)),
      new Promise((res) => noSpaServer.close(res)),
    ]);
  });

  test("SPA mode falls back to index.html for missing routes", async () => {
    const res = await request(spaServer).get("/nonexistent/route");
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("<!DOCTYPE html>");
  });

  test("no-SPA mode returns 404 for missing routes", async () => {
    const res = await request(noSpaServer).get("/nonexistent/route");
    expect(res.statusCode).toBe(404);
  });

  test("both modes serve existing files normally", async () => {
    const spaRes = await request(spaServer).get("/img/logo.png");
    const noSpaRes = await request(noSpaServer).get("/img/logo.png");

    expect(spaRes.statusCode).toBe(200);
    expect(noSpaRes.statusCode).toBe(200);
    expect(spaRes.headers["content-type"]).toMatch(/image\/png/);
    expect(noSpaRes.headers["content-type"]).toMatch(/image\/png/);
  });
});
