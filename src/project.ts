import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

export interface ValidatedProject {
  projectRoot: string;
  assetsRoot: string;
}

export async function validateProject(projectPath: string): Promise<ValidatedProject> {
  if (!projectPath || projectPath.trim() === "") {
    throw new Error("--project is required");
  }

  const projectRoot = path.resolve(projectPath);

  try {
    const projectStat = await stat(projectRoot);
    if (!projectStat.isDirectory()) {
      throw new Error(`Project path is not a directory: ${projectRoot}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Project path is not a directory")) {
      throw error;
    }
    throw new Error(`Project path does not exist: ${projectRoot}`);
  }

  const assetsRoot = path.join(projectRoot, "assets");
  try {
    const assetsStat = await stat(assetsRoot);
    if (!assetsStat.isDirectory()) {
      throw new Error(`Project path does not contain an assets directory: ${projectRoot}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("does not contain")) {
      throw error;
    }
    throw new Error(`Project path does not contain an assets directory: ${projectRoot}`);
  }

  return { projectRoot, assetsRoot };
}

export async function ensureOutputDirectory(outputPath: string, projectRoot: string): Promise<string> {
  const resolved = path.isAbsolute(outputPath)
    ? outputPath
    : path.join(projectRoot, outputPath);
  await mkdir(resolved, { recursive: true });
  return resolved;
}
