import { spawn } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dir, "../src/cli.js");

describe("CLI tests", () => {
  test("shows version with --version flag", async () => {
    const child = spawn("node", [cliPath, "--version"], {
      stdio: "pipe",
    });

    const output = await new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Process exited with code ${code}: ${stderr}`));
        }
      });
    });

    expect(output.code).toBe(0);
    expect(output.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("shows version with -v flag", async () => {
    const child = spawn("node", [cliPath, "-v"], {
      stdio: "pipe",
    });

    const output = await new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Process exited with code ${code}: ${stderr}`));
        }
      });
    });

    expect(output.code).toBe(0);
    expect(output.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("shows help with --help flag", async () => {
    const child = spawn("node", [cliPath, "--help"], {
      stdio: "pipe",
    });

    const output = await new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Process exited with code ${code}: ${stderr}`));
        }
      });
    });

    expect(output.code).toBe(0);
    expect(output.stdout).toContain("Usage:");
    expect(output.stdout).toContain("--no-spa");
    expect(output.stdout).toContain("--cache");
    expect(output.stdout).toContain("--plain-404");
  });

  test("shows help with -h flag", async () => {
    const child = spawn("node", [cliPath, "-h"], {
      stdio: "pipe",
    });

    const output = await new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Process exited with code ${code}: ${stderr}`));
        }
      });
    });

    expect(output.code).toBe(0);
    expect(output.stdout).toContain("Usage:");
    expect(output.stdout).toContain("cache 2000");
  });

  test("root argument can appear before or after options", async () => {
    const root = join(__dir, "fixtures");

    const run = (args) => {
      const child = spawn("node", [cliPath, ...args], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      return new Promise((resolve) => {
        let out = "";
        child.stdout.on("data", (d) => {
          out += d.toString();
          if (out.includes("nocase-server")) {
            child.kill();
          }
        });
        child.on("close", () => resolve(out));
      });
    };

    const first = await run(["-p", "0", root]);
    expect(first).toContain(`(root: ${resolve(root)})`);
    expect(first).toContain("localhost:0");

    const second = await run([root, "-p", "0"]);
    expect(second).toContain(`(root: ${resolve(root)})`);
  });
});
