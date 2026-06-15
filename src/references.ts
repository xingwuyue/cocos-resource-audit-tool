import { readFile } from "node:fs/promises";
import type { AuditWarning, ReferenceInfo } from "./domain.js";
import { toProjectRelativePath } from "./scanner.js";

const UUID_PATTERN = /[0-9a-zA-Z_-]{6,}/g;

export interface ReferenceScanResult {
  referencesByUuid: Map<string, ReferenceInfo>;
  warnings: AuditWarning[];
  unknownUuids: Set<string>;
}

export async function scanReferences(
  projectRoot: string,
  textCandidatePaths: string[],
  knownUuids: Set<string>
): Promise<ReferenceScanResult> {
  const referencesByUuid = new Map<string, ReferenceInfo>();
  const warnings: AuditWarning[] = [];
  const unknownUuids = new Set<string>();

  for (const absolutePath of textCandidatePaths) {
    const relativePath = toProjectRelativePath(projectRoot, absolutePath);
    let text: string;

    try {
      text = await readFile(absolutePath, "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push({
        code: "text-decode-failed",
        path: relativePath,
        message: `Could not decode text candidate: ${message}`
      });
      continue;
    }

    const matches = text.match(UUID_PATTERN) ?? [];
    for (const match of matches) {
      if (knownUuids.has(match)) {
        const existing = referencesByUuid.get(match) ?? { uuid: match, sourceRelativePaths: [] };
        if (!existing.sourceRelativePaths.includes(relativePath)) {
          existing.sourceRelativePaths.push(relativePath);
        }
        referencesByUuid.set(match, existing);
      } else if (looksLikeUuid(match)) {
        unknownUuids.add(match);
      }
    }
  }

  return { referencesByUuid, warnings, unknownUuids };
}

function looksLikeUuid(value: string): boolean {
  return value.length >= 20 && /[-_]/.test(value);
}
