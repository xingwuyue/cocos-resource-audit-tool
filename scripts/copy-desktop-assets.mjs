import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDir = path.join(root, "src", "desktop");
const outputDir = path.join(root, "dist", "desktop");

await mkdir(outputDir, { recursive: true });

for (const fileName of ["index.html", "styles.css"]) {
  await copyFile(path.join(sourceDir, fileName), path.join(outputDir, fileName));
}

for (const staleFileName of ["preload.js", "preload.js.map", "preload.d.ts"]) {
  await rm(path.join(outputDir, staleFileName), { force: true });
}

await copyFile(path.join(sourceDir, "preload.cjs"), path.join(outputDir, "preload.cjs"));
