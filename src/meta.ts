import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AuditWarning, MetaInfo } from "./domain.js";
import { toProjectRelativePath } from "./scanner.js";

export interface ParsedMetaInfo extends MetaInfo {
  warning?: AuditWarning;
}

export async function parseMetaFile(projectRoot: string, metaPath: string): Promise<ParsedMetaInfo> {
  const resourcePath = metaPath.endsWith(".meta") ? metaPath.slice(0, -5) : metaPath;
  const resourceRelativePath = toProjectRelativePath(projectRoot, resourcePath);

  try {
    const text = await readFile(metaPath, "utf8");
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return {
      resourceRelativePath,
      metaPath,
      uuid: readString(parsed.uuid),
      importer: readString(parsed.importer),
      type: readString(parsed.type)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      resourceRelativePath,
      metaPath,
      warning: {
        code: "invalid-meta",
        path: path.relative(projectRoot, metaPath).split(path.sep).join("/"),
        message: `Could not parse meta file: ${message}`
      }
    };
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
