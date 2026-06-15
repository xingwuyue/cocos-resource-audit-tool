import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scanProjectFiles } from "../src/scanner.js";
import { validateProject } from "../src/project.js";
import { createMinimalCocosProject, writeFixtureFile } from "./fixtures.js";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "cocos-audit-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("validateProject", () => {
  it("accepts a project with assets directory", async () => {
    await createMinimalCocosProject(tempRoot);
    await expect(validateProject(tempRoot)).resolves.toEqual({
      projectRoot: path.resolve(tempRoot),
      assetsRoot: path.join(path.resolve(tempRoot), "assets")
    });
  });

  it("rejects a directory without assets", async () => {
    await expect(validateProject(tempRoot)).rejects.toThrow("does not contain an assets directory");
  });
});

describe("scanProjectFiles", () => {
  it("returns resources, meta files, and text candidates", async () => {
    await createMinimalCocosProject(tempRoot);
    await writeFixtureFile(tempRoot, "assets/textures/hero.png", Buffer.from([1, 2, 3]));
    await writeFixtureFile(tempRoot, "assets/textures/hero.png.meta", "{\"uuid\":\"hero-uuid\"}");
    await writeFixtureFile(tempRoot, "assets/readme.txt", "notes");

    const project = await validateProject(tempRoot);
    const result = await scanProjectFiles(project);

    expect(result.resources.map((file) => file.relativePath).sort()).toEqual([
      "assets/Main.scene",
      "assets/readme.txt",
      "assets/textures/hero.png"
    ]);
    expect(result.resources.find((file) => file.relativePath === "assets/textures/hero.png")?.sizeBytes).toBe(3);
    expect(result.metaPaths.map((file) => path.basename(file)).sort()).toEqual([
      "Main.scene.meta",
      "hero.png.meta"
    ]);
    expect(result.textCandidatePaths.map((file) => path.basename(file))).toContain("Main.scene");
  });
});
