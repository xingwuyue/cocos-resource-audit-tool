import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function writeFixtureFile(root: string, relativePath: string, content: string | Buffer): Promise<string> {
  const absolutePath = path.join(root, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content);
  return absolutePath;
}

export async function createMinimalCocosProject(root: string): Promise<void> {
  await writeFixtureFile(root, "assets/Main.scene", "{\"__type__\":\"cc.SceneAsset\"}");
  await writeFixtureFile(root, "assets/Main.scene.meta", "{\"uuid\":\"scene-uuid\",\"importer\":\"scene\"}");
  await writeFixtureFile(root, "settings/v2/packages/builder.json", "{}");
}
