import type { AuditResult, ReferenceStatus, ResourceCategory } from "../domain.js";
import { CATEGORY_LABELS } from "../domain.js";
import type { DashboardFilters } from "./view-model.js";
import { createDashboardModel } from "./view-model.js";

type AppState = {
  projectPath: string | null;
  result: AuditResult | null;
  outputDirectory: string | null;
  filters: DashboardFilters;
};

const state: AppState = {
  projectPath: null,
  result: null,
  outputDirectory: null,
  filters: {}
};

const elements = {
  projectPath: getElement("projectPath"),
  chooseProject: getButton("chooseProject"),
  runAudit: getButton("runAudit"),
  exportReports: getButton("exportReports"),
  openOutput: getButton("openOutput"),
  status: getElement("status"),
  summary: getElement("summary"),
  categories: getElement("categories"),
  rows: getElement("rows"),
  warnings: getElement("warnings"),
  categoryFilter: getSelect("categoryFilter"),
  statusFilter: getSelect("statusFilter"),
  search: getInput("search")
};

initialiseFilters();
render();

elements.chooseProject.addEventListener("click", async () => {
  const selectedPath = await window.cocosAudit.selectProject();
  if (!selectedPath) return;
  state.projectPath = selectedPath;
  state.outputDirectory = null;
  state.result = null;
  setStatus("Project selected. Run an audit to inspect resources.");
  render();
});

elements.runAudit.addEventListener("click", async () => {
  if (!state.projectPath) {
    setStatus("Select a Cocos Creator project folder first.", true);
    return;
  }

  await runBusy("Scanning resources...", async () => {
    state.result = await window.cocosAudit.runAudit(state.projectPath as string);
    state.outputDirectory = null;
    setStatus("Audit complete. Review the table or export reports.");
    render();
  });
});

elements.exportReports.addEventListener("click", async () => {
  if (!state.result) {
    setStatus("Run an audit before exporting reports.", true);
    return;
  }

  await runBusy("Exporting reports...", async () => {
    const exported = await window.cocosAudit.exportReports(state.result as AuditResult);
    state.outputDirectory = exported.outputDirectory;
    setStatus(`Reports exported to ${exported.outputDirectory}`);
    render();
  });
});

elements.openOutput.addEventListener("click", async () => {
  if (!state.outputDirectory) return;
  await window.cocosAudit.openOutputDirectory(state.outputDirectory);
});

elements.categoryFilter.addEventListener("change", () => {
  state.filters.category = elements.categoryFilter.value as ResourceCategory | "all";
  render();
});

elements.statusFilter.addEventListener("change", () => {
  state.filters.referenceStatus = elements.statusFilter.value as ReferenceStatus | "all";
  render();
});

elements.search.addEventListener("input", () => {
  state.filters.search = elements.search.value;
  render();
});

function initialiseFilters(): void {
  addOption(elements.categoryFilter, "all", "All categories");
  for (const [category, label] of Object.entries(CATEGORY_LABELS)) {
    addOption(elements.categoryFilter, category, label);
  }

  addOption(elements.statusFilter, "all", "All statuses");
  for (const status of ["entry", "referenced", "unreferenced", "no-meta", "unknown"]) {
    addOption(elements.statusFilter, status, status);
  }
}

function render(): void {
  elements.projectPath.textContent = state.projectPath ?? "No project selected";
  elements.runAudit.disabled = !state.projectPath;
  elements.exportReports.disabled = !state.result;
  elements.openOutput.disabled = !state.outputDirectory;

  if (!state.result) {
    elements.summary.innerHTML = `<div class="empty">Select a project folder and run an audit.</div>`;
    elements.categories.innerHTML = "";
    elements.rows.innerHTML = "";
    elements.warnings.innerHTML = "";
    return;
  }

  const model = createDashboardModel(state.result, state.filters);
  elements.summary.innerHTML = `
    <div class="metric"><span>Total size</span><strong>${escapeHtml(model.summary.totalSize)}</strong></div>
    <div class="metric"><span>Files</span><strong>${model.summary.fileCount}</strong></div>
    <div class="metric"><span>Referenced</span><strong>${model.summary.referencedCount}</strong></div>
    <div class="metric"><span>Unreferenced</span><strong>${model.summary.unreferencedCount}</strong></div>
    <div class="metric"><span>Warnings</span><strong>${model.summary.warningCount}</strong></div>
  `;
  elements.categories.innerHTML = renderCategories(model.categories);
  elements.rows.innerHTML = renderRows(model.rows);
  elements.warnings.innerHTML = renderWarnings(model.warnings);
}

function renderCategories(categories: ReturnType<typeof createDashboardModel>["categories"]): string {
  if (categories.length === 0) return `<div class="empty">No categories.</div>`;
  return categories.map((category) => `
    <div class="category-row">
      <div><strong>${escapeHtml(category.label)}</strong><span>${category.count} files</span></div>
      <div>${escapeHtml(category.humanSize)} · ${escapeHtml(category.percentOfTotal)}</div>
    </div>
  `).join("");
}

function renderRows(rows: AuditResult["rows"]): string {
  if (rows.length === 0) return `<div class="empty">No rows match the current filters.</div>`;
  return `
    <table>
      <thead>
        <tr>
          <th>Path</th>
          <th>Category</th>
          <th>Size</th>
          <th>Status</th>
          <th>UUID</th>
          <th>Refs</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td><code>${escapeHtml(row.relativePath)}</code></td>
            <td>${escapeHtml(CATEGORY_LABELS[row.category])}</td>
            <td>${escapeHtml(row.humanSize)}</td>
            <td><span class="status-pill">${escapeHtml(row.referenceStatus)}</span></td>
            <td><code>${escapeHtml(row.uuid ?? "")}</code></td>
            <td>${row.referenceSourceCount}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderWarnings(warnings: AuditResult["warnings"]): string {
  if (warnings.length === 0) return `<div class="empty">No warnings.</div>`;
  return warnings.map((warning) => `
    <div class="warning-row">
      <strong>${escapeHtml(warning.code)}</strong>
      <span>${escapeHtml(warning.path ?? "")}</span>
      <p>${escapeHtml(warning.message)}</p>
    </div>
  `).join("");
}

async function runBusy(message: string, action: () => Promise<void>): Promise<void> {
  setStatus(message);
  setBusy(true);
  try {
    await action();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  } finally {
    setBusy(false);
  }
}

function setBusy(isBusy: boolean): void {
  elements.chooseProject.disabled = isBusy;
  elements.runAudit.disabled = isBusy || !state.projectPath;
  elements.exportReports.disabled = isBusy || !state.result;
}

function setStatus(message: string, isError = false): void {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", isError);
}

function addOption(select: HTMLSelectElement, value: string, label: string): void {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.append(option);
}

function getElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element: ${id}`);
  return element;
}

function getButton(id: string): HTMLButtonElement {
  return getElement(id) as HTMLButtonElement;
}

function getSelect(id: string): HTMLSelectElement {
  return getElement(id) as HTMLSelectElement;
}

function getInput(id: string): HTMLInputElement {
  return getElement(id) as HTMLInputElement;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
