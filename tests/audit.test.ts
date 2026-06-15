import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { auditProject } from "../src/audit.js";
import { createMinimalCocosProject, writeFixtureFile } from "./fixtures.js";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "cocos-audit-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("auditProject", () => {
  it("marks referenced, unreferenced, entry, and no-meta resources", async () => {
    await createMinimalCocosProject(tempRoot);
    await writeFixtureFile(tempRoot, "assets/textures/hero.png", Buffer.from([1, 2, 3, 4]));
    await writeFixtureFile(tempRoot, "assets/textures/hero.png.meta", JSON.stringify({ uuid: "hero-uuid", importer: "image" }));
    await writeFixtureFile(tempRoot, "assets/audio/click.ogg", Buffer.from([1, 2]));
    await writeFixtureFile(tempRoot, "assets/audio/click.ogg.meta", JSON.stringify({ uuid: "click-uuid", importer: "audio-clip" }));
    await writeFixtureFile(tempRoot, "assets/no-meta.webp", Buffer.from([1]));
    await writeFixtureFile(
      tempRoot,
      "assets/Main.scene",
      JSON.stringify({ __type__: "cc.SceneAsset", texture: { __uuid__: "hero-uuid" } })
    );

    const result = await auditProject(tempRoot);
    const byPath = new Map(result.rows.map((row) => [row.relativePath, row]));

    expect(byPath.get("assets/Main.scene")?.referenceStatus).toBe("entry");
    expect(byPath.get("assets/textures/hero.png")?.referenceStatus).toBe("referenced");
    expect(byPath.get("assets/textures/hero.png")?.referenceSources).toEqual(["assets/Main.scene"]);
    expect(byPath.get("assets/audio/click.ogg")?.referenceStatus).toBe("unreferenced");
    expect(byPath.get("assets/no-meta.webp")?.referenceStatus).toBe("no-meta");
    expect(result.totalSizeBytes).toBeGreaterThan(0);
    expect(result.warnings.some((warning) => warning.code === "missing-meta")).toBe(true);
  });

  it("sorts rows by category then size descending", async () => {
    await createMinimalCocosProject(tempRoot);
    await writeFixtureFile(tempRoot, "assets/a.png", Buffer.from([1]));
    await writeFixtureFile(tempRoot, "assets/a.png.meta", JSON.stringify({ uuid: "a-uuid" }));
    await writeFixtureFile(tempRoot, "assets/b.png", Buffer.from([1, 2, 3]));
    await writeFixtureFile(tempRoot, "assets/b.png.meta", JSON.stringify({ uuid: "b-uuid" }));

    const result = await auditProject(tempRoot);
    const textures = result.rows.filter((row) => row.category === "texture");

    expect(textures.map((row) => row.relativePath)).toEqual(["assets/b.png", "assets/a.png"]);
  });
});
