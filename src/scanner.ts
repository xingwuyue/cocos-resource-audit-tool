import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { ResourceFile } from "./domain.js";
import type { ValidatedProject } from "./project.js";

const TEXT_CANDIDATE_EXTENSIONS = new Set([
  ".scene",
  ".prefab",
  ".anim",
  ".material",
  ".mat",
  ".effect",
  ".json",
  ".txt",
  ".plist",
  ".xml"
]);

const STAT_CONCURRENCY = 32;

export interface ScanResult {
  resources: ResourceFile[];
  metaPaths: string[];
  textCandidatePaths: string[];
}

export async function scanProjectFiles(project: ValidatedProject): Promise<ScanResult> {
  const allFiles = await walkFiles(project.assetsRoot);
  const metaPathSet = new Set(allFiles.filter((file) => file.endsWith(".meta")));
  const resourceEntries = await mapWithConcurrency(
    allFiles.filter((file) => !file.endsWith(".meta")),
    STAT_CONCURRENCY,
    async (absolutePath) => buildResourceEntry(project, absolutePath, metaPathSet)
  );

  return {
    resources: resourceEntries.map((entry) => entry.resource).sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
    metaPaths: [...metaPathSet].sort(),
    textCandidatePaths: resourceEntries
      .filter((entry) => entry.isTextCandidate)
      .map((entry) => entry.resource.absolutePath)
      .sort()
  };
}

interface ResourceEntry {
  resource: ResourceFile;
  isTextCandidate: boolean;
}

async function buildResourceEntry(
  project: ValidatedProject,
  absolutePath: string,
  metaPathSet: Set<string>
): Promise<ResourceEntry> {
  const fileStat = await stat(absolutePath);
  const relativePath = toProjectRelativePath(project.projectRoot, absolutePath);
  const extension = path.extname(absolutePath).toLowerCase();
  const metaPath = `${absolutePath}.meta`;

  return {
    resource: {
      absolutePath,
      relativePath,
      fileName: path.basename(absolutePath),
      extension,
      sizeBytes: fileStat.size,
      metaPath: metaPathSet.has(metaPath) ? metaPath : undefined
    },
    isTextCandidate: TEXT_CANDIDATE_EXTENSIONS.has(extension)
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function walkFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(absolutePath));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

export function toProjectRelativePath(projectRoot: string, absolutePath: string): string {
  return path.relative(projectRoot, absolutePath).split(path.sep).join("/");
}
