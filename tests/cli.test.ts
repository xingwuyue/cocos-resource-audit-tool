import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
});
