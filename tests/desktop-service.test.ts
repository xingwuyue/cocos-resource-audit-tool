import path from "node:path";
import { describe, expect, test, vi } from "vitest";
import type { AuditResult } from "../src/domain.js";
import { createDesktopService } from "../src/desktop/service.js";

const result: AuditResult = {
  projectRoot: "D:/GameProject",
  totalSizeBytes: 10,
  warnings: [],
  rows: []
};

describe("createDesktopService", () => {
  test("returns null when project selection is cancelled", async () => {
    const service = createDesktopService({
      chooseDirectory: vi.fn(async () => null),
      auditProject: vi.fn(),
      writeHtmlReport: vi.fn(),
      writeCsvReport: vi.fn(),
      openPath: vi.fn()
    });

    await expect(service.selectProject()).resolves.toBeNull();
  });

  test("runs the audit for the selected project", async () => {
    const auditProject = vi.fn(async () => result);
    const service = createDesktopService({
      chooseDirectory: vi.fn(async () => "D:/GameProject"),
      auditProject,
      writeHtmlReport: vi.fn(),
      writeCsvReport: vi.fn(),
      openPath: vi.fn()
    });

    await expect(service.runAudit("D:/GameProject")).resolves.toEqual(result);
    expect(auditProject).toHaveBeenCalledWith("D:/GameProject");
  });

  test("exports HTML and CSV reports to the selected directory", async () => {
    const writeHtmlReport = vi.fn(async () => undefined);
    const writeCsvReport = vi.fn(async () => undefined);
    const service = createDesktopService({
      chooseDirectory: vi.fn(async () => "D:/Reports"),
      auditProject: vi.fn(),
      writeHtmlReport,
      writeCsvReport,
      openPath: vi.fn()
    });

    const exported = await service.exportReports(result);

    expect(exported.outputDirectory).toBe("D:/Reports");
    expect(exported.htmlPath).toBe(path.join("D:/Reports", "resource-audit.html"));
    expect(exported.csvPath).toBe(path.join("D:/Reports", "resource-audit.csv"));
    expect(writeHtmlReport).toHaveBeenCalledWith(result, exported.htmlPath);
    expect(writeCsvReport).toHaveBeenCalledWith(result, exported.csvPath);
  });

  test("uses the default reports directory when export selection is cancelled", async () => {
    const service = createDesktopService({
      chooseDirectory: vi.fn(async () => null),
      auditProject: vi.fn(),
      writeHtmlReport: vi.fn(async () => undefined),
      writeCsvReport: vi.fn(async () => undefined),
      openPath: vi.fn()
    });

    const exported = await service.exportReports(result);

    expect(exported.outputDirectory).toBe(path.resolve("reports"));
  });

  test("delegates opening the output directory", async () => {
    const openPath = vi.fn(async () => undefined);
    const service = createDesktopService({
      chooseDirectory: vi.fn(async () => null),
      auditProject: vi.fn(),
      writeHtmlReport: vi.fn(),
      writeCsvReport: vi.fn(),
      openPath
    });

    await service.openOutputDirectory("D:/Reports");

    expect(openPath).toHaveBeenCalledWith("D:/Reports");
  });
});
