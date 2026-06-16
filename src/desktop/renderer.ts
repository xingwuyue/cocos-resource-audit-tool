import type { AuditResult, ReferenceStatus, ResourceCategory } from "../domain.js";
import type { DashboardFilters } from "./view-model.js";
import { createDashboardModel, DESKTOP_CATEGORY_LABELS, DESKTOP_REFERENCE_STATUS_LABELS } from "./view-model.js";

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
  setStatus("项目目录已选择，可以开始审计。");
  render();
});

elements.runAudit.addEventListener("click", async () => {
  if (!state.projectPath) {
    setStatus("请选择 Cocos Creator 项目目录。", true);
    return;
  }

  await runBusy("正在扫描资源...", async () => {
    state.result = await window.cocosAudit.runAudit(state.projectPath as string);
    state.outputDirectory = null;
    setStatus("审计完成，可以查看表格或导出报告。");
    render();
  });
});

elements.exportReports.addEventListener("click", async () => {
  if (!state.result) {
    setStatus("请先完成审计，再导出报告。", true);
    return;
  }

  await runBusy("正在导出报告...", async () => {
    const exported = await window.cocosAudit.exportReports(state.result as AuditResult);
    state.outputDirectory = exported.outputDirectory;
    setStatus(`报告已导出到 ${exported.outputDirectory}`);
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
  addOption(elements.categoryFilter, "all", "全部分类");
  for (const [category, label] of Object.entries(DESKTOP_CATEGORY_LABELS)) {
    addOption(elements.categoryFilter, category, label);
  }

  addOption(elements.statusFilter, "all", "全部状态");
  for (const status of ["entry", "referenced", "unreferenced", "no-meta", "unknown"]) {
    addOption(elements.statusFilter, status, DESKTOP_REFERENCE_STATUS_LABELS[status as ReferenceStatus]);
  }
}

function render(): void {
  elements.projectPath.textContent = state.projectPath ?? "未选择项目";
  elements.runAudit.disabled = !state.projectPath;
  elements.exportReports.disabled = !state.result;
  elements.openOutput.disabled = !state.outputDirectory;

  if (!state.result) {
    elements.summary.innerHTML = `<div class="empty">请选择项目目录并开始审计。</div>`;
    elements.categories.innerHTML = "";
    elements.rows.innerHTML = "";
    elements.warnings.innerHTML = "";
    return;
  }

  const model = createDashboardModel(state.result, state.filters);
  elements.summary.innerHTML = `
    <div class="metric"><span>总大小</span><strong>${escapeHtml(model.summary.totalSize)}</strong></div>
    <div class="metric"><span>文件数量</span><strong>${model.summary.fileCount}</strong></div>
    <div class="metric"><span>已引用</span><strong>${model.summary.referencedCount}</strong></div>
    <div class="metric"><span>未发现引用</span><strong>${model.summary.unreferencedCount}</strong></div>
    <div class="metric"><span>警告数量</span><strong>${model.summary.warningCount}</strong></div>
  `;
  elements.categories.innerHTML = renderCategories(model.categories);
  elements.rows.innerHTML = renderRows(model.rows);
  elements.warnings.innerHTML = renderWarnings(model.warnings);
}

function renderCategories(categories: ReturnType<typeof createDashboardModel>["categories"]): string {
  if (categories.length === 0) return `<div class="empty">暂无分类。</div>`;
  return categories.map((category) => `
    <div class="category-row">
      <div><strong>${escapeHtml(category.label)}</strong><span>${category.count} 个文件</span></div>
      <div>${escapeHtml(category.humanSize)} · ${escapeHtml(category.percentOfTotal)}</div>
    </div>
  `).join("");
}

function renderRows(rows: AuditResult["rows"]): string {
  if (rows.length === 0) return `<div class="empty">没有符合当前筛选条件的资源。</div>`;
  return `
    <table>
      <thead>
        <tr>
          <th>资源路径</th>
          <th>资源类型</th>
          <th>大小</th>
          <th>引用状态</th>
          <th>UUID</th>
          <th>引用数</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td><code>${escapeHtml(row.relativePath)}</code></td>
            <td>${escapeHtml(DESKTOP_CATEGORY_LABELS[row.category])}</td>
            <td>${escapeHtml(row.humanSize)}</td>
            <td><span class="status-pill">${escapeHtml(DESKTOP_REFERENCE_STATUS_LABELS[row.referenceStatus])}</span></td>
            <td><code>${escapeHtml(row.uuid ?? "")}</code></td>
            <td>${row.referenceSourceCount}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderWarnings(warnings: AuditResult["warnings"]): string {
  if (warnings.length === 0) return `<div class="empty">暂无警告。</div>`;
  return warnings.map((warning) => `
    <div class="warning-row">
      <strong>${escapeHtml(warning.code)}</strong>
      <span>${escapeHtml(warning.path ?? "")}</span>
      <p>${escapeHtml(formatWarningMessage(warning.code))}</p>
    </div>
  `).join("");
}

function formatWarningMessage(code: AuditResult["warnings"][number]["code"]): string {
  switch (code) {
    case "missing-meta":
      return "资源缺少对应的 .meta 文件。";
    case "invalid-meta":
      return ".meta 文件无法解析。";
    case "text-decode-failed":
      return "文本文件解码失败，相关引用可能无法识别。";
    case "unknown-reference":
      return "发现未匹配到已扫描资源的 UUID 引用。";
    case "project-validation":
      return "项目目录校验失败。";
  }
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
