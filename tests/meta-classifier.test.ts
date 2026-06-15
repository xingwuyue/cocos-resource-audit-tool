import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { classifyResource } from "../src/classifier.js";
import { parseMetaFile } from "../src/meta.js";
import type { ResourceFile } from "../src/domain.js";
import { writeFixtureFile } from "./fixtures.js";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "cocos-audit-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

function resource(relativePath: string): ResourceFile {
  return {
    absolutePath: path.join(tempRoot, relativePath),
    relativePath,
    fileName: path.basename(relativePath),
    extension: path.extname(relativePath).toLowerCase(),
    sizeBytes: 10
  };
}

describe("parseMetaFile", () => {
  it("extracts uuid and importer hints", async () => {
    const metaPath = await writeFixtureFile(
      tempRoot,
      "assets/hero.png.meta",
      JSON.stringify({ uuid: "hero-uuid", importer: "image", type: "sprite-frame" })
    );

    await expect(parseMetaFile(tempRoot, metaPath)).resolves.toEqual({
      resourceRelativePath: "assets/hero.png",
      metaPath,
      uuid: "hero-uuid",
      importer: "image",
      type: "sprite-frame"
    });
  });

  it("reports invalid JSON as a warning", async () => {
    const metaPath = await writeFixtureFile(tempRoot, "assets/bad.png.meta", "{bad");
    await expect(parseMetaFile(tempRoot, metaPath)).resolves.toMatchObject({
      resourceRelativePath: "assets/bad.png",
      metaPath,
      warning: {
        code: "invalid-meta"
      }
    });
  });
});

describe("classifyResource", () => {
  it("classifies common resource extensions", () => {
    expect(classifyResource(resource("assets/hero.png"))).toBe("texture");
    expect(classifyResource(resource("assets/click.ogg"))).toBe("audio");
    expect(classifyResource(resource("assets/run.anim"))).toBe("animation");
    expect(classifyResource(resource("assets/character.fbx"))).toBe("model");
    expect(classifyResource(resource("assets/Main.scene"))).toBe("scene");
    expect(classifyResource(resource("assets/Hero.prefab"))).toBe("prefab");
    expect(classifyResource(resource("assets/body.material"))).toBe("material-shader");
    expect(classifyResource(resource("assets/font.ttf"))).toBe("font");
    expect(classifyResource(resource("assets/intro.mp4"))).toBe("video");
    expect(classifyResource(resource("assets/config.csv"))).toBe("data");
    expect(classifyResource(resource("assets/Game.ts"))).toBe("script");
  });

  it("classifies recognizable Spine files as animation", () => {
    expect(classifyResource(resource("assets/spine/hero.atlas"))).toBe("animation");
    expect(classifyResource(resource("assets/spine/hero.skel"))).toBe("animation");
    expect(classifyResource(resource("assets/spine/hero.json"), { importer: "spine-data" })).toBe("animation");
  });
});
