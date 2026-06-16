const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cocosAudit", {
  selectProject: () => ipcRenderer.invoke("project:select"),
  runAudit: (projectPath) => ipcRenderer.invoke("audit:run", projectPath),
  exportReports: (result) => ipcRenderer.invoke("reports:export", result),
  openOutputDirectory: (outputDirectory) => ipcRenderer.invoke("folder:open", outputDirectory)
});

console.log("preload-bridge-ready");
