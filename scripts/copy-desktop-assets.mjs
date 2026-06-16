import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDir = path.join(root, "src", "desktop");
const outputDir = path.join(root, "dist", "desktop");

await mkdir(outputDir, { recursive: true });

for (const fileName of ["index.html", "styles.css"]) {
  await copyFile(path.join(sourceDir, fileName), path.join(outputDir, fileName));
}
