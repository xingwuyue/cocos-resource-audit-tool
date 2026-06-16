import type { AuditResult } from "../domain.js";
import type { ExportedReports } from "./service.js";

export interface CocosAuditApi {
  selectProject: () => Promise<string | null>;
  runAudit: (projectPath: string) => Promise<AuditResult>;
  exportReports: (result: AuditResult) => Promise<ExportedReports>;
  openOutputDirectory: (outputDirectory: string) => Promise<void>;
}

declare global {
  interface Window {
    cocosAudit?: CocosAuditApi;
  }
}
