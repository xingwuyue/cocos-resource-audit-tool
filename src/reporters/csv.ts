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
      ].map(escapeCsvCell).join(",")
    )
  ];

  await writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
}
