import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AuditResult } from "../src/domain.js";
import { writeCsvReport } from "../src/reporters/csv.js";
import { writeHtmlReport } from "../src/reporters/html.js";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "cocos-audit-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

const result: AuditResult = {
  projectRoot: "D:/Game",
  totalSizeBytes: 4,
  rows: [
    {
      category: "texture",
      fileName: "hero.png",
      relativePath: "assets/hero.png",
      sizeBytes: 4,
      humanSize: "4 B",
      percentOfTotal: "100.00%",
      referenceStatus: "referenced",
      uuid: "hero-uuid",
      referenceSourceCount: 1,
      referenceSources: ["assets/Main.scene"]
    }
  ],
  warnings: [
    {
      code: "missing-meta",
      path: "assets/missing.png",
      message: "Resource has no matching meta file: assets/missing.png"
    }
  ]
};

describe("report writers", () => {
  it("writes CSV rows with headers", async () => {
    const outputPath = path.join(tempRoot, "resource-audit.csv");
    await writeCsvReport(result, outputPath);
    const csv = await readFile(outputPath, "utf8");

    expect(csv).toContain("category,fileName,relativePath,sizeBytes,humanSize,percentOfTotal,referenceStatus,uuid,referenceSourceCount,referenceSources");
    expect(csv).toContain("texture,hero.png,assets/hero.png,4,4 B,100.00%,referenced,hero-uuid,1,assets/Main.scene");
  });

  it("writes HTML summary and rows", async () => {
    const outputPath = path.join(tempRoot, "resource-audit.html");
    await writeHtmlReport(result, outputPath);
    const html = await readFile(outputPath, "utf8");

    expect(html).toContain("<title>Cocos Resource Audit</title>");
    expect(html).toContain("assets/hero.png");
    expect(html).toContain("Static analysis cannot prove a resource is safe to delete.");
    expect(html).toContain("Resource has no matching meta file");
  });
});
