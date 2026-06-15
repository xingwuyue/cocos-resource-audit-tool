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
  const invalidMetaResourcePaths = new Set<string>();

  for (const metaPath of scanned.metaPaths) {
    const parsed = await parseMetaFile(project.projectRoot, metaPath);
    if (parsed.warning) {
      warnings.push(parsed.warning);
      invalidMetaResourcePaths.add(parsed.resourceRelativePath);
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
  for (const [uuid, sources] of references.unknownReferences) {
    const sourceRelativePaths = [...sources];
    const firstSource = sourceRelativePaths[0];
    const sourceCount = sourceRelativePaths.length;
    warnings.push({
      code: "unknown-reference",
      path: firstSource,
      message: `Found UUID-like reference that is not present in scanned assets: ${uuid} (first source: ${firstSource}; ${sourceCount} source${sourceCount === 1 ? "" : "s"})`
    });
  }

  const totalSizeBytes = scanned.resources.reduce((sum, resource) => sum + resource.sizeBytes, 0);
  const rows = scanned.resources.map((resource) =>
    createAuditRow(
      resource,
      metaByResourcePath.get(resource.relativePath),
      references.referencesByUuid,
      totalSizeBytes,
      warnings,
      invalidMetaResourcePaths.has(resource.relativePath)
    )
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
  warnings: AuditWarning[],
  hasInvalidMeta: boolean
): AuditRow {
  const category = classifyResource(resource, meta);
  const referenceSources = meta?.uuid ? referencesByUuid.get(meta.uuid)?.sourceRelativePaths ?? [] : [];

  if (!meta && !hasInvalidMeta) {
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
    referenceStatus: getReferenceStatus(category, meta?.uuid, referenceSources, hasInvalidMeta, meta !== undefined),
    uuid: meta?.uuid,
    referenceSourceCount: referenceSources.length,
    referenceSources
  };
}

function getReferenceStatus(
  category: ResourceCategory,
  uuid: string | undefined,
  referenceSources: string[],
  hasInvalidMeta: boolean,
  hasMeta: boolean
): AuditRow["referenceStatus"] {
  if (hasInvalidMeta) return "unknown";
  if (category === "scene" || category === "prefab") return "entry";
  if (!uuid) return hasMeta ? "unknown" : "no-meta";
  if (referenceSources.length > 0) return "referenced";
  return "unreferenced";
}
