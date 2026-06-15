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

export interface ScanResult {
  resources: ResourceFile[];
  metaPaths: string[];
  textCandidatePaths: string[];
}

export async function scanProjectFiles(project: ValidatedProject): Promise<ScanResult> {
  const allFiles = await walkFiles(project.assetsRoot);
  const metaPathSet = new Set(allFiles.filter((file) => file.endsWith(".meta")));
  const resources: ResourceFile[] = [];
  const textCandidatePaths: string[] = [];

  for (const absolutePath of allFiles) {
    if (absolutePath.endsWith(".meta")) {
      continue;
    }

    const fileStat = await stat(absolutePath);
    const relativePath = toProjectRelativePath(project.projectRoot, absolutePath);
    const extension = path.extname(absolutePath).toLowerCase();
    const metaPath = `${absolutePath}.meta`;

    resources.push({
      absolutePath,
      relativePath,
      fileName: path.basename(absolutePath),
      extension,
      sizeBytes: fileStat.size,
      metaPath: metaPathSet.has(metaPath) ? metaPath : undefined
    });

    if (TEXT_CANDIDATE_EXTENSIONS.has(extension)) {
      textCandidatePaths.push(absolutePath);
    }
  }

  return {
    resources: resources.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
    metaPaths: [...metaPathSet].sort(),
    textCandidatePaths: textCandidatePaths.sort()
  };
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
