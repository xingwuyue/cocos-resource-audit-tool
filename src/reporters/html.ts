import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AuditResult, ResourceCategory } from "../domain.js";
import { CATEGORY_LABELS } from "../domain.js";
import { formatBytes } from "../format.js";

export async function writeHtmlReport(result: AuditResult, outputPath: string): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderHtml(result), "utf8");
}

function renderHtml(result: AuditResult): string {
  const categories = groupByCategory(result);
  const topRows = [...result.rows].sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 20);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cocos Resource Audit</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #222; background: #fafafa; }
    h1, h2 { margin-bottom: 8px; }
    .summary { display: flex; gap: 16px; flex-wrap: wrap; margin: 16px 0; }
    .metric { border: 1px solid #ddd; border-radius: 6px; padding: 12px; background: #fff; min-width: 180px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 28px; background: #fff; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f0f0f0; }
    code { font-family: Consolas, monospace; }
    .warning { border: 1px solid #d8a300; background: #fff8df; padding: 12px; border-radius: 6px; }
    .small { color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Cocos Resource Audit</h1>
  <p class="warning">Static analysis cannot prove a resource is safe to delete. Resources marked unreferenced were not found by UUID scan.</p>
  <div class="summary">
    <div class="metric"><strong>Total Size</strong><br>${escapeHtml(formatBytes(result.totalSizeBytes))}</div>
    <div class="metric"><strong>Resource Count</strong><br>${result.rows.length}</div>
    <div class="metric"><strong>Warnings</strong><br>${result.warnings.length}</div>
  </div>
  <h2>Category Summary</h2>
  ${renderCategorySummary(categories)}
  <h2>Top Largest Resources</h2>
  ${renderRows(topRows)}
  <h2>Resources By Category</h2>
  ${Object.entries(categories).map(([category, rows]) => `<h3>${escapeHtml(CATEGORY_LABELS[category as ResourceCategory])}</h3>${renderRows(rows)}`).join("\n")}
  <h2>Warnings</h2>
  ${renderWarnings(result)}
</body>
</html>
`;
}

function groupByCategory(result: AuditResult): Partial<Record<ResourceCategory, AuditResult["rows"]>> {
  const grouped: Partial<Record<ResourceCategory, AuditResult["rows"]>> = {};
  for (const row of result.rows) {
    grouped[row.category] ??= [];
    grouped[row.category]?.push(row);
  }
  return grouped;
}

function renderCategorySummary(categories: Partial<Record<ResourceCategory, AuditResult["rows"]>>): string {
  const rows = Object.entries(categories).map(([category, auditRows]) => {
    const size = auditRows.reduce((sum, row) => sum + row.sizeBytes, 0);
    return `<tr><td>${escapeHtml(CATEGORY_LABELS[category as ResourceCategory])}</td><td>${auditRows.length}</td><td>${escapeHtml(formatBytes(size))}</td></tr>`;
  });
  return `<table><thead><tr><th>Category</th><th>Count</th><th>Size</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function renderRows(rows: AuditResult["rows"]): string {
  if (rows.length === 0) {
    return "<p>No resources.</p>";
  }

  return `<table>
    <thead><tr><th>Category</th><th>Path</th><th>Size</th><th>Percent</th><th>Status</th><th>UUID</th><th>References</th></tr></thead>
    <tbody>
      ${rows.map((row) => `<tr>
        <td>${escapeHtml(CATEGORY_LABELS[row.category])}</td>
        <td><code>${escapeHtml(row.relativePath)}</code></td>
        <td>${escapeHtml(row.humanSize)}</td>
        <td>${escapeHtml(row.percentOfTotal)}</td>
        <td>${escapeHtml(row.referenceStatus)}</td>
        <td><code>${escapeHtml(row.uuid ?? "")}</code></td>
        <td>${escapeHtml(row.referenceSources.slice(0, 5).join("; "))}${row.referenceSources.length > 5 ? `<div class="small">+${row.referenceSources.length - 5} more in CSV</div>` : ""}</td>
      </tr>`).join("")}
    </tbody>
  </table>`;
}

function renderWarnings(result: AuditResult): string {
  if (result.warnings.length === 0) {
    return "<p>No warnings.</p>";
  }

  return `<table><thead><tr><th>Code</th><th>Path</th><th>Message</th></tr></thead><tbody>${result.warnings.map((warning) =>
    `<tr><td>${escapeHtml(warning.code)}</td><td><code>${escapeHtml(warning.path ?? "")}</code></td><td>${escapeHtml(warning.message)}</td></tr>`
  ).join("")}</tbody></table>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
