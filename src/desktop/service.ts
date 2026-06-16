import path from "node:path";
import type { AuditResult } from "../domain.js";

export interface ExportedReports {
  outputDirectory: string;
  htmlPath: string;
  csvPath: string;
}

export interface DesktopServiceDeps {
  chooseDirectory: () => Promise<string | null>;
  auditProject: (projectPath: string) => Promise<AuditResult>;
  writeHtmlReport: (result: AuditResult, outputPath: string) => Promise<void>;
  writeCsvReport: (result: AuditResult, outputPath: string) => Promise<void>;
  openPath: (targetPath: string) => Promise<void>;
}

export interface DesktopService {
  selectProject: () => Promise<string | null>;
  runAudit: (projectPath: string) => Promise<AuditResult>;
  exportReports: (result: AuditResult) => Promise<ExportedReports>;
  openOutputDirectory: (outputDirectory: string) => Promise<void>;
}

export function createDesktopService(deps: DesktopServiceDeps): DesktopService {
  return {
    selectProject: () => deps.chooseDirectory(),
    runAudit: (projectPath) => deps.auditProject(projectPath),
    exportReports: async (result) => {
      const selectedDirectory = await deps.chooseDirectory();
      const outputDirectory = selectedDirectory ?? path.resolve("reports");
      const htmlPath = path.join(outputDirectory, "resource-audit.html");
      const csvPath = path.join(outputDirectory, "resource-audit.csv");

      await deps.writeHtmlReport(result, htmlPath);
      await deps.writeCsvReport(result, csvPath);

      return { outputDirectory, htmlPath, csvPath };
    },
    openOutputDirectory: (outputDirectory) => deps.openPath(outputDirectory)
  };
}
