#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { auditProject } from "./audit.js";
import { formatBytes } from "./format.js";
import { ensureOutputDirectory } from "./project.js";
import { writeCsvReport } from "./reporters/csv.js";
import { writeHtmlReport } from "./reporters/html.js";
import { version } from "./version.js";

export async function runCli(argv: string[] = process.argv): Promise<number> {
  const program = new Command();

  program
    .name("cocos-resource-audit")
    .description("Audit Cocos Creator 3.x resource sizes and static references.")
    .version(version)
    .requiredOption("-p, --project <path>", "Cocos Creator project source directory")
    .option("-o, --out <path>", "Output directory for reports", "reports");

  try {
    program.parse(argv);
    const options = program.opts<{ project: string; out: string }>();
    const result = await auditProject(options.project);
    const outputDir = await ensureOutputDirectory(options.out, result.projectRoot);
    const htmlPath = path.join(outputDir, "resource-audit.html");
    const csvPath = path.join(outputDir, "resource-audit.csv");

    await writeHtmlReport(result, htmlPath);
    await writeCsvReport(result, csvPath);

    console.log(`Scanned ${result.rows.length} resources (${formatBytes(result.totalSizeBytes)}).`);
    console.log(`HTML report: ${htmlPath}`);
    console.log(`CSV report: ${csvPath}`);
    if (result.warnings.length > 0) {
      console.warn(`Warnings: ${result.warnings.length}`);
    }
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli().then((code) => {
    process.exitCode = code;
  });
}
