import { contextBridge, ipcRenderer } from "electron";
import type { AuditResult } from "../domain.js";
import type { ExportedReports } from "./service.js";

export interface CocosAuditApi {
  selectProject: () => Promise<string | null>;
  runAudit: (projectPath: string) => Promise<AuditResult>;
  exportReports: (result: AuditResult) => Promise<ExportedReports>;
  openOutputDirectory: (outputDirectory: string) => Promise<void>;
}

const api: CocosAuditApi = {
  selectProject: () => ipcRenderer.invoke("project:select") as Promise<string | null>,
  runAudit: (projectPath) => ipcRenderer.invoke("audit:run", projectPath) as Promise<AuditResult>,
  exportReports: (result) => ipcRenderer.invoke("reports:export", result) as Promise<ExportedReports>,
  openOutputDirectory: (outputDirectory) => ipcRenderer.invoke("folder:open", outputDirectory) as Promise<void>
};

contextBridge.exposeInMainWorld("cocosAudit", api);

declare global {
  interface Window {
    cocosAudit: CocosAuditApi;
  }
}
