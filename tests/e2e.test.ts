import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../src/cli.js";
import { writeFixtureFile } from "./fixtures.js";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "cocos-audit-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("end-to-end audit", () => {
  it("audits a representative Cocos Creator 3.x source tree", async () => {
    await writeFixtureFile(tempRoot, "settings/v2/packages/builder.json", "{}");
    await writeFixtureFile(tempRoot, "assets/Main.scene", JSON.stringify({ texture: { __uuid__: "hero-uuid" } }));
    await writeFixtureFile(tempRoot, "assets/Main.scene.meta", JSON.stringify({ uuid: "scene-uuid", importer: "scene" }));
    await writeFixtureFile(tempRoot, "assets/textures/hero.png", Buffer.from([1, 2, 3, 4, 5]));
    await writeFixtureFile(tempRoot, "assets/textures/hero.png.meta", JSON.stringify({ uuid: "hero-uuid", importer: "image" }));
    await writeFixtureFile(tempRoot, "assets/audio/theme.mp3", Buffer.from([1, 2, 3]));
    await writeFixtureFile(tempRoot, "assets/audio/theme.mp3.meta", JSON.stringify({ uuid: "theme-uuid", importer: "audio-clip" }));
    await writeFixtureFile(tempRoot, "assets/spine/hero.json", JSON.stringify({ skeleton: { hash: "abc" } }));
    await writeFixtureFile(tempRoot, "assets/spine/hero.json.meta", JSON.stringify({ uuid: "spine-uuid", importer: "spine-data" }));

    const outputDir = path.join(tempRoot, "audit-output");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    let exitCode: number;
    try {
      exitCode = await runCli(["node", "cocos-resource-audit", "--project", tempRoot, "--out", outputDir]);
    } finally {
      logSpy.mockRestore();
    }

    expect(exitCode).toBe(0);
    const csv = await readFile(path.join(outputDir, "resource-audit.csv"), "utf8");
    const html = await readFile(path.join(outputDir, "resource-audit.html"), "utf8");

    expect(csv).toContain("assets/textures/hero.png");
    expect(csv).toContain("referenced");
    expect(csv).toContain("assets/audio/theme.mp3");
    expect(csv).toContain("unreferenced");
    expect(csv).toContain("assets/spine/hero.json");
    expect(html).toContain("Cocos Resource Audit");
    expect(html).toContain("Static analysis cannot prove a resource is safe to delete.");
  });
});
