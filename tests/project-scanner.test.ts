import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scanProjectFiles } from "../src/scanner.js";
import { ensureOutputDirectory, validateProject } from "../src/project.js";
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

describe("ensureOutputDirectory", () => {
  it("resolves a relative output path under the project root and creates it recursively", async () => {
    const projectRoot = path.join(tempRoot, "project");
    const outputPath = await ensureOutputDirectory("reports/nested", projectRoot);

    expect(outputPath).toBe(path.join(projectRoot, "reports/nested"));
    const outputStat = await stat(outputPath);
    expect(outputStat.isDirectory()).toBe(true);
  });

  it("respects an absolute output path and creates it", async () => {
    const projectRoot = path.join(tempRoot, "project");
    const absoluteOutputPath = path.join(tempRoot, "outside-project", "reports");
    const outputPath = await ensureOutputDirectory(absoluteOutputPath, projectRoot);

    expect(outputPath).toBe(absoluteOutputPath);
    const outputStat = await stat(outputPath);
    expect(outputStat.isDirectory()).toBe(true);
  });

  it("rejects when output creation is blocked by an existing file", async () => {
    const projectRoot = path.join(tempRoot, "project");
    await writeFixtureFile(projectRoot, "blocked", "not a directory");

    await expect(ensureOutputDirectory("blocked/reports", projectRoot)).rejects.toThrow();
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

  it("uses project-relative display paths and absolute internal file paths", async () => {
    await createMinimalCocosProject(tempRoot);
    await writeFixtureFile(tempRoot, "assets/nested/folder/config.json", "{}");
    await writeFixtureFile(tempRoot, "assets/nested/folder/config.json.meta", "{\"uuid\":\"config-uuid\"}");

    const project = await validateProject(tempRoot);
    const result = await scanProjectFiles(project);
    const configFile = result.resources.find((file) => file.relativePath === "assets/nested/folder/config.json");

    expect(configFile).toBeDefined();
    expect(configFile?.relativePath).toBe("assets/nested/folder/config.json");
    expect(path.isAbsolute(configFile?.absolutePath ?? "")).toBe(true);
    expect(path.isAbsolute(configFile?.metaPath ?? "")).toBe(true);
    expect(result.metaPaths.every((filePath) => path.isAbsolute(filePath))).toBe(true);
    expect(result.textCandidatePaths.every((filePath) => path.isAbsolute(filePath))).toBe(true);
  });
});
