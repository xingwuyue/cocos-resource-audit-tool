import { readFile } from "node:fs/promises";
import type { AuditWarning, ReferenceInfo } from "./domain.js";
import { toProjectRelativePath } from "./scanner.js";

const UUID_PATTERN = /[0-9a-zA-Z_-]{6,}/g;
const UUID_FIELD_PATTERN = /["'](?:__uuid__|uuid)["']\s*:\s*["']([0-9a-zA-Z_-]{6,})["']/g;

export interface ReferenceScanResult {
  referencesByUuid: Map<string, ReferenceInfo>;
  warnings: AuditWarning[];
  unknownReferences: Map<string, Set<string>>;
}

export async function scanReferences(
  projectRoot: string,
  textCandidatePaths: string[],
  knownUuids: Set<string>
): Promise<ReferenceScanResult> {
  const referencesByUuid = new Map<string, ReferenceInfo>();
  const warnings: AuditWarning[] = [];
  const unknownReferences = new Map<string, Set<string>>();

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

    UUID_PATTERN.lastIndex = 0;
    let matchedUuid: RegExpExecArray | null;
    while ((matchedUuid = UUID_PATTERN.exec(text)) !== null) {
      const uuid = matchedUuid[0];
      if (knownUuids.has(uuid)) {
        const existing = referencesByUuid.get(uuid) ?? { uuid, sourceRelativePaths: [] };
        if (!existing.sourceRelativePaths.includes(relativePath)) {
          existing.sourceRelativePaths.push(relativePath);
        }
        referencesByUuid.set(uuid, existing);
      } else if (looksLikeUuid(uuid)) {
        addUnknownReference(unknownReferences, uuid, relativePath);
      }
    }

    UUID_FIELD_PATTERN.lastIndex = 0;
    let matchedUuidField: RegExpExecArray | null;
    while ((matchedUuidField = UUID_FIELD_PATTERN.exec(text)) !== null) {
      const uuid = matchedUuidField[1];
      if (!knownUuids.has(uuid) && looksLikeSerializedUuid(uuid)) {
        addUnknownReference(unknownReferences, uuid, relativePath);
      }
    }
  }

  return { referencesByUuid, warnings, unknownReferences };
}

function addUnknownReference(unknownReferences: Map<string, Set<string>>, uuid: string, relativePath: string): void {
  const sources = unknownReferences.get(uuid) ?? new Set<string>();
  sources.add(relativePath);
  unknownReferences.set(uuid, sources);
}

function looksLikeUuid(value: string): boolean {
  return value.length >= 20 && /[-_]/.test(value);
}

function looksLikeSerializedUuid(value: string): boolean {
  return /^[0-9a-zA-Z_-]{20,}$/.test(value);
}
