import { describe, expect, test } from "vitest";
import type { AuditResult } from "../src/domain.js";
import { createDashboardModel } from "../src/desktop/view-model.js";

const auditResult: AuditResult = {
  projectRoot: "D:/GameProject",
  totalSizeBytes: 3_500,
  warnings: [
    { code: "unknown-reference", message: "Unknown uuid", path: "assets/Main.scene" }
  ],
  rows: [
    {
      category: "texture",
      fileName: "hero.png",
      relativePath: "assets/textures/hero.png",
      sizeBytes: 2_000,
      humanSize: "2 KB",
      percentOfTotal: "57.14%",
      referenceStatus: "referenced",
      uuid: "texture-uuid",
      referenceSourceCount: 1,
      referenceSources: ["assets/Main.scene"]
    },
    {
      category: "audio",
      fileName: "theme.mp3",
      relativePath: "assets/audio/theme.mp3",
      sizeBytes: 1_000,
      humanSize: "1000 B",
      percentOfTotal: "28.57%",
      referenceStatus: "unreferenced",
      uuid: "audio-uuid",
      referenceSourceCount: 0,
      referenceSources: []
    },
    {
      category: "texture",
      fileName: "button.png",
      relativePath: "assets/textures/button.png",
      sizeBytes: 500,
      humanSize: "500 B",
      percentOfTotal: "14.29%",
      referenceStatus: "no-meta",
      referenceSourceCount: 0,
      referenceSources: []
    }
  ]
};

describe("createDashboardModel", () => {
  test("builds summary and category totals", () => {
    const model = createDashboardModel(auditResult, {});

    expect(model.summary).toEqual({
      totalSizeBytes: 3_500,
      totalSize: "3.42 KB",
      fileCount: 3,
      referencedCount: 1,
      unreferencedCount: 1,
      warningCount: 1
    });
    expect(model.categories.map((category) => ({
      category: category.category,
      label: category.label,
      count: category.count,
      sizeBytes: category.sizeBytes,
      percentOfTotal: category.percentOfTotal
    }))).toEqual([
      { category: "texture", label: "贴图", count: 2, sizeBytes: 2_500, percentOfTotal: "71.43%" },
      { category: "audio", label: "音频", count: 1, sizeBytes: 1_000, percentOfTotal: "28.57%" }
    ]);
  });

  test("filters rows by category, status, and search text", () => {
    const model = createDashboardModel(auditResult, {
      category: "texture",
      referenceStatus: "no-meta",
      search: "button"
    });

    expect(model.rows).toHaveLength(1);
    expect(model.rows[0]?.relativePath).toBe("assets/textures/button.png");
  });

  test("sorts visible rows by size descending then path", () => {
    const result: AuditResult = {
      ...auditResult,
      rows: [
        { ...auditResult.rows[1]!, sizeBytes: 500, relativePath: "assets/z.mp3" },
        { ...auditResult.rows[2]!, sizeBytes: 500, relativePath: "assets/a.png" },
        { ...auditResult.rows[0]!, sizeBytes: 2_000, relativePath: "assets/b.png" }
      ]
    };

    const model = createDashboardModel(result, {});

    expect(model.rows.map((row) => row.relativePath)).toEqual([
      "assets/b.png",
      "assets/a.png",
      "assets/z.mp3"
    ]);
  });
});
