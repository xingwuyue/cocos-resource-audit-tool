import path from "node:path";
import { classifyResource } from "./classifier.js";
import type { AuditResult, AuditRow, AuditWarning, MetaInfo, ResourceCategory, ResourceFile } from "./domain.js";
import { formatBytes, toPercent } from "./format.js";
import { parseMetaFile } from "./meta.js";
import { validateProject } from "./project.js";
import { scanReferences } from "./references.js";
import { scanProjectFiles } from "./scanner.js";

const CATEGORY_ORDER: ResourceCategory[] = [
  "texture",
  "audio",
  "animation",
  "model",
  "scene",
  "prefab",
  "material-shader",
  "font",
  "video",
  "data",
  "script",
  "other"
];

export async function auditProject(projectPath: string): Promise<AuditResult> {
  const project = await validateProject(projectPath);
  const scanned = await scanProjectFiles(project);
  const warnings: AuditWarning[] = [];
  const metaByResourcePath = new Map<string, MetaInfo>();
  const resourceByUuid = new Map<string, ResourceFile>();

  for (const metaPath of scanned.metaPaths) {
    const parsed = await parseMetaFile(project.projectRoot, metaPath);
    if (parsed.warning) {
      warnings.push(parsed.warning);
      continue;
    }

    metaByResourcePath.set(parsed.resourceRelativePath, parsed);
  }

  for (const resource of scanned.resources) {
    const meta = metaByResourcePath.get(resource.relativePath);
    if (meta?.uuid) {
      resourceByUuid.set(meta.uuid, resource);
    }
  }

  const references = await scanReferences(project.projectRoot, scanned.textCandidatePaths, new Set(resourceByUuid.keys()));
  warnings.push(...references.warnings);
  for (const uuid of references.unknownUuids) {
    warnings.push({
      code: "unknown-reference",
      message: `Found UUID-like reference that is not present in scanned assets: ${uuid}`
    });
  }

  const totalSizeBytes = scanned.resources.reduce((sum, resource) => sum + resource.sizeBytes, 0);
  const rows = scanned.resources.map((resource) =>
    createAuditRow(resource, metaByResourcePath.get(resource.relativePath), references.referencesByUuid, totalSizeBytes, warnings)
  );

  rows.sort((a, b) => {
    const categoryDelta = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    if (categoryDelta !== 0) return categoryDelta;
    return b.sizeBytes - a.sizeBytes || a.relativePath.localeCompare(b.relativePath);
  });

  return {
    projectRoot: project.projectRoot,
    totalSizeBytes,
    rows,
    warnings
  };
}

function createAuditRow(
  resource: ResourceFile,
  meta: MetaInfo | undefined,
  referencesByUuid: Map<string, { sourceRelativePaths: string[] }>,
  totalSizeBytes: number,
  warnings: AuditWarning[]
): AuditRow {
  const category = classifyResource(resource, meta);
  const referenceSources = meta?.uuid ? referencesByUuid.get(meta.uuid)?.sourceRelativePaths ?? [] : [];

  if (!meta) {
    warnings.push({
      code: "missing-meta",
      path: resource.relativePath,
      message: `Resource has no matching meta file: ${resource.relativePath}`
    });
  }

  return {
    category,
    fileName: path.basename(resource.relativePath),
    relativePath: resource.relativePath,
    sizeBytes: resource.sizeBytes,
    humanSize: formatBytes(resource.sizeBytes),
    percentOfTotal: toPercent(resource.sizeBytes, totalSizeBytes),
    referenceStatus: getReferenceStatus(category, meta?.uuid, referenceSources),
    uuid: meta?.uuid,
    referenceSourceCount: referenceSources.length,
    referenceSources
  };
}

function getReferenceStatus(category: ResourceCategory, uuid: string | undefined, referenceSources: string[]): AuditRow["referenceStatus"] {
  if (category === "scene" || category === "prefab") return "entry";
  if (!uuid) return "no-meta";
  if (referenceSources.length > 0) return "referenced";
  return "unreferenced";
}
