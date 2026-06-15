import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AuditResult } from "../domain.js";
import { escapeCsvCell } from "../format.js";

const HEADERS = [
  "category",
  "fileName",
  "relativePath",
  "sizeBytes",
  "humanSize",
  "percentOfTotal",
  "referenceStatus",
  "uuid",
  "referenceSourceCount",
  "referenceSources"
];

const DANGEROUS_CELL_PREFIX = /^[=+\-@\t\r]/;

export async function writeCsvReport(result: AuditResult, outputPath: string): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });

  const lines = [
    HEADERS.join(","),
    ...result.rows.map((row) =>
      [
        row.category,
        row.fileName,
        row.relativePath,
        row.sizeBytes,
        row.humanSize,
        row.percentOfTotal,
        row.referenceStatus,
        row.uuid,
        row.referenceSourceCount,
        row.referenceSources.join("; ")
      ].map(formatCsvReportCell).join(",")
    )
  ];

  await writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
}

function formatCsvReportCell(value: string | number | undefined): string {
  if (typeof value === "number") {
    return escapeCsvCell(value);
  }

  const text = value ?? "";
  const safeText = DANGEROUS_CELL_PREFIX.test(text) ? `'${text}` : text;
  return escapeCsvCell(safeText);
}
