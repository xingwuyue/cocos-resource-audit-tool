import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../src/cli.js";
import { createMinimalCocosProject, writeFixtureFile } from "./fixtures.js";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "cocos-audit-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("runCli", () => {
  it("writes HTML and CSV reports", async () => {
    await createMinimalCocosProject(tempRoot);
    await writeFixtureFile(tempRoot, "assets/hero.png", Buffer.from([1, 2, 3]));
    await writeFixtureFile(tempRoot, "assets/hero.png.meta", JSON.stringify({ uuid: "hero-uuid" }));

    const outputDir = path.join(tempRoot, "reports");
    const exitCode = await runCli(["node", "cocos-resource-audit", "--project", tempRoot, "--out", outputDir]);

    expect(exitCode).toBe(0);
    await expect(access(path.join(outputDir, "resource-audit.html"))).resolves.toBeUndefined();
    await expect(access(path.join(outputDir, "resource-audit.csv"))).resolves.toBeUndefined();
    await expect(readFile(path.join(outputDir, "resource-audit.csv"), "utf8")).resolves.toContain("assets/hero.png");
  });

  it("returns 0 for version output without printing an error", async () => {
    const output: string[] = [];
    const outputSpy = vi.spyOn(process.stdout, "write").mockImplementation(((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const exitCode = await runCli(["node", "cocos-resource-audit", "--version"]);

      expect(exitCode).toBe(0);
      expect(output.join("")).toContain("0.1.0");
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
      outputSpy.mockRestore();
    }
  });

  it("returns 0 for help output without printing an error", async () => {
    const output: string[] = [];
    const outputSpy = vi.spyOn(process.stdout, "write").mockImplementation(((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const exitCode = await runCli(["node", "cocos-resource-audit", "--help"]);

      expect(exitCode).toBe(0);
      expect(output.join("")).toContain("Usage:");
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
      outputSpy.mockRestore();
    }
  });

  it("returns 1 instead of exiting when project option is missing", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit should not be called");
    }) as typeof process.exit);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const exitCode = await runCli(["node", "cocos-resource-audit"]);

      expect(exitCode).toBe(1);
      expect(exitSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/^Error: /));
    } finally {
      errorSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });
});
