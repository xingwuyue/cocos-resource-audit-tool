import { app, BrowserWindow, dialog, ipcMain, shell, type OpenDialogOptions } from "electron";
import { appendFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditProject } from "../audit.js";
import { writeCsvReport } from "../reporters/csv.js";
import { writeHtmlReport } from "../reporters/html.js";
import { createDesktopService } from "./service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logPath = path.join(os.tmpdir(), "cocos-resource-audit-desktop.log");

function log(message: string, error?: unknown): void {
  const details = error instanceof Error ? ` ${error.stack ?? error.message}` : error ? ` ${String(error)}` : "";
  appendFileSync(logPath, `${new Date().toISOString()} ${message}${details}\n`, "utf8");
}

log("module-start");

process.on("uncaughtException", (error) => log("uncaughtException", error));
process.on("unhandledRejection", (reason) => log("unhandledRejection", reason));

const service = createDesktopService({
  chooseDirectory: async () => {
    const options: OpenDialogOptions = {
      properties: ["openDirectory"],
      title: "Select a folder"
    };
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const result = focusedWindow
      ? await dialog.showOpenDialog(focusedWindow, options)
      : await dialog.showOpenDialog(options);

    return result.canceled ? null : result.filePaths[0] ?? null;
  },
  auditProject,
  writeHtmlReport,
  writeCsvReport,
  openPath: async (targetPath) => {
    const error = await shell.openPath(targetPath);
    if (error) throw new Error(error);
  }
});

async function createWindow(): Promise<void> {
  log("create-window-start");
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: "Cocos 资源审计工具",
    backgroundColor: "#f6f7f9",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    }
  });

  window.on("ready-to-show", () => {
    log("window-ready-to-show");
    window.show();
    window.focus();
  });
  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedUrl) => {
    log(`did-fail-load code=${errorCode} description=${errorDescription} url=${validatedUrl}`);
  });
  window.webContents.on("render-process-gone", (_event, details) => {
    log(`render-process-gone reason=${details.reason} exitCode=${details.exitCode}`);
  });

  await window.loadFile(path.join(__dirname, "index.html"));
  log("window-load-complete");
}

ipcMain.handle("project:select", () => service.selectProject());
ipcMain.handle("audit:run", (_event, projectPath: string) => service.runAudit(projectPath));
ipcMain.handle("reports:export", (_event, result) => service.exportReports(result));
ipcMain.handle("folder:open", (_event, outputDirectory: string) => service.openOutputDirectory(outputDirectory));

app.whenReady().then(async () => {
  log("app-ready");
  await createWindow();
}).catch((error) => {
  log("app-start-failed", error);
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
