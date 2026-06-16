import type { AuditResult, AuditRow, ReferenceStatus, ResourceCategory } from "../domain.js";
import { CATEGORY_LABELS } from "../domain.js";
import { formatBytes } from "../format.js";

export interface DashboardFilters {
  category?: ResourceCategory | "all";
  referenceStatus?: ReferenceStatus | "all";
  search?: string;
}

export interface DashboardSummary {
  totalSizeBytes: number;
  totalSize: string;
  fileCount: number;
  referencedCount: number;
  unreferencedCount: number;
  warningCount: number;
}

export interface CategorySummary {
  category: ResourceCategory;
  label: string;
  count: number;
  sizeBytes: number;
  humanSize: string;
  percentOfTotal: string;
}

export interface DashboardModel {
  summary: DashboardSummary;
  categories: CategorySummary[];
  rows: AuditRow[];
  warnings: AuditResult["warnings"];
}

export function createDashboardModel(result: AuditResult, filters: DashboardFilters): DashboardModel {
  return {
    summary: createSummary(result),
    categories: createCategorySummaries(result),
    rows: filterRows(result.rows, filters),
    warnings: result.warnings
  };
}

function createSummary(result: AuditResult): DashboardSummary {
  return {
    totalSizeBytes: result.totalSizeBytes,
    totalSize: formatBytes(result.totalSizeBytes),
    fileCount: result.rows.length,
    referencedCount: result.rows.filter((row) => row.referenceStatus === "referenced").length,
    unreferencedCount: result.rows.filter((row) => row.referenceStatus === "unreferenced").length,
    warningCount: result.warnings.length
  };
}

function createCategorySummaries(result: AuditResult): CategorySummary[] {
  const byCategory = new Map<ResourceCategory, { count: number; sizeBytes: number }>();
  for (const row of result.rows) {
    const current = byCategory.get(row.category) ?? { count: 0, sizeBytes: 0 };
    current.count += 1;
    current.sizeBytes += row.sizeBytes;
    byCategory.set(row.category, current);
  }

  return [...byCategory.entries()]
    .map(([category, value]) => ({
      category,
      label: CATEGORY_LABELS[category],
      count: value.count,
      sizeBytes: value.sizeBytes,
      humanSize: formatBytes(value.sizeBytes),
      percentOfTotal: formatPercent(value.sizeBytes, result.totalSizeBytes)
    }))
    .sort((a, b) => b.sizeBytes - a.sizeBytes || a.label.localeCompare(b.label));
}

function filterRows(rows: AuditRow[], filters: DashboardFilters): AuditRow[] {
  const category = filters.category && filters.category !== "all" ? filters.category : undefined;
  const referenceStatus = filters.referenceStatus && filters.referenceStatus !== "all" ? filters.referenceStatus : undefined;
  const search = filters.search?.trim().toLocaleLowerCase();

  return rows
    .filter((row) => !category || row.category === category)
    .filter((row) => !referenceStatus || row.referenceStatus === referenceStatus)
    .filter((row) => !search || row.relativePath.toLocaleLowerCase().includes(search) || row.fileName.toLocaleLowerCase().includes(search))
    .sort((a, b) => b.sizeBytes - a.sizeBytes || a.relativePath.localeCompare(b.relativePath));
}

function formatPercent(value: number, total: number): string {
  if (total <= 0) return "0.00%";
  return `${((value / total) * 100).toFixed(2)}%`;
}
