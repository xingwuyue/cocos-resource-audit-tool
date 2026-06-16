import { app, BrowserWindow, dialog, ipcMain, shell, type OpenDialogOptions } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditProject } from "../audit.js";
import { writeCsvReport } from "../reporters/csv.js";
import { writeHtmlReport } from "../reporters/html.js";
import { createDesktopService } from "./service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: "Cocos Resource Audit",
    backgroundColor: "#f6f7f9",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    }
  });

  await window.loadFile(path.join(__dirname, "index.html"));
}

ipcMain.handle("project:select", () => service.selectProject());
ipcMain.handle("audit:run", (_event, projectPath: string) => service.runAudit(projectPath));
ipcMain.handle("reports:export", (_event, result) => service.exportReports(result));
ipcMain.handle("folder:open", (_event, outputDirectory: string) => service.openOutputDirectory(outputDirectory));

await app.whenReady();
await createWindow();

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
