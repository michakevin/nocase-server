import http from "node:http";
import request from "supertest";
import { createHandler } from "../src/server.js";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "fixtures");

describe("Error handling tests", () => {
  let htmlServer, plainServer;

  beforeAll(() => {
    // Server with HTML 404 responses (default)
    htmlServer = http
      .createServer(createHandler(root, { spa: false, plainError: false }))
      .listen(0);

    // Server with plain text 404 responses
    plainServer = http
      .createServer(createHandler(root, { spa: false, plainError: true }))
      .listen(0);
  });

  afterAll(async () => {
    await Promise.all([
      new Promise((res) => htmlServer.close(res)),
      new Promise((res) => plainServer.close(res)),
    ]);
  });

  test("serves HTML 404 error by default", async () => {
    const res = await request(htmlServer).get("/does/not/exist");
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toBe("text/html; charset=utf-8");
    expect(res.text).toContain("404 - File not found");
    expect(res.text).toContain("<!DOCTYPE html>");
    expect(res.text).toContain("<h1>");
  });

  test("serves plain text 404 error when plainError is true", async () => {
    const res = await request(plainServer).get("/does/not/exist");
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toBe("text/plain; charset=utf-8");
    expect(res.text).toBe("Not found");
  });

  test("HTML 404 contains helpful message", async () => {
    const res = await request(htmlServer).get("/missing/file.txt");
    expect(res.statusCode).toBe(404);
    expect(res.text).toContain("The requested file could not be found");
  });
});
