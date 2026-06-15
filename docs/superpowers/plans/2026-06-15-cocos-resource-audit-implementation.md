# Cocos Resource Audit Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js command line tool that audits a Cocos Creator 3.x project source directory and emits HTML plus CSV resource size reports.

**Architecture:** The tool is a focused TypeScript CLI with small modules for project validation, file scanning, meta parsing, classification, reference scanning, aggregation, and report writing. Each module returns plain data objects so fixture tests can exercise behavior without shelling out to the CLI.

**Tech Stack:** Node.js 20+, TypeScript, Vitest, `tsx` for development execution, `commander` for CLI parsing.

---

## File Structure

- Create `package.json`: npm scripts, runtime dependencies, dev dependencies, CLI binary entry.
- Create `tsconfig.json`: strict TypeScript settings for `src/` and `tests/`.
- Create `src/domain.ts`: shared types and constants.
- Create `src/format.ts`: size formatting and CSV escaping helpers.
- Create `src/project.ts`: project path validation and output directory creation.
- Create `src/scanner.ts`: asset file walking and text candidate discovery.
- Create `src/meta.ts`: Cocos `.meta` JSON parsing and UUID extraction.
- Create `src/classifier.ts`: resource category decisions.
- Create `src/references.ts`: UUID reference scanning from text-like files.
- Create `src/audit.ts`: orchestration and aggregation into report rows.
- Create `src/reporters/csv.ts`: CSV report writer.
- Create `src/reporters/html.ts`: static HTML report writer.
- Create `src/cli.ts`: CLI argument parsing and terminal summary.
- Create `src/index.ts`: public export surface.
- Create `tests/fixtures.ts`: fixture project builder helpers.
- Create `tests/*.test.ts`: unit and integration coverage.
- Modify `README.md`: add usage instructions after implementation passes.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/index.ts`
- Create: `tests/smoke.test.ts`

- [ ] **Step 1: Write the failing smoke test**

Create `tests/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { version } from "../src/index";

describe("package smoke", () => {
  it("exports a version string", () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
```

- [ ] **Step 2: Add package metadata and scripts**

Create `package.json`:

```json
{
  "name": "cocos-resource-audit-tool",
  "version": "0.1.0",
  "description": "Audit Cocos Creator resource sizes, categories, and static references.",
  "type": "module",
  "bin": {
    "cocos-resource-audit": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx src/cli.ts",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "keywords": [
    "cocos",
    "cocos-creator",
    "asset-audit",
    "resource-size"
  ],
  "license": "MIT",
  "dependencies": {
    "commander": "^12.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.10",
    "tsx": "^4.16.2",
    "typescript": "^5.5.3",
    "vitest": "^2.0.4"
  }
}
```

- [ ] **Step 3: Add TypeScript configuration**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "types": ["node", "vitest/globals"],
    "rootDir": ".",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 4: Add the first public export**

Create `src/index.ts`:

```ts
export const version = "0.1.0";
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` is created and npm exits with code 0.

- [ ] **Step 6: Run the smoke test**

Run: `npm test -- tests/smoke.test.ts`

Expected: PASS with `package smoke`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json src/index.ts tests/smoke.test.ts
git commit -m "chore: scaffold TypeScript CLI project"
```

---

### Task 2: Domain Types And Formatting Helpers

**Files:**
- Create: `src/domain.ts`
- Create: `src/format.ts`
- Create: `tests/format.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write formatting tests**

Create `tests/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { escapeCsvCell, formatBytes, toPercent } from "../src/format";

describe("formatBytes", () => {
  it("formats bytes using binary units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.00 KB");
    expect(formatBytes(1536)).toBe("1.50 KB");
    expect(formatBytes(1048576)).toBe("1.00 MB");
  });
});

describe("toPercent", () => {
  it("formats percentages with two decimals", () => {
    expect(toPercent(25, 100)).toBe("25.00%");
    expect(toPercent(0, 0)).toBe("0.00%");
  });
});

describe("escapeCsvCell", () => {
  it("escapes commas, quotes, and newlines", () => {
    expect(escapeCsvCell("plain")).toBe("plain");
    expect(escapeCsvCell("a,b")).toBe("\"a,b\"");
    expect(escapeCsvCell("a\"b")).toBe("\"a\"\"b\"");
    expect(escapeCsvCell("a\nb")).toBe("\"a\nb\"");
  });
});
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `npm test -- tests/format.test.ts`

Expected: FAIL because `src/format.ts` does not exist.

- [ ] **Step 3: Add shared domain types**

Create `src/domain.ts`:

```ts
export type ResourceCategory =
  | "texture"
  | "audio"
  | "animation"
  | "model"
  | "scene"
  | "prefab"
  | "material-shader"
  | "font"
  | "video"
  | "data"
  | "script"
  | "other";

export type ReferenceStatus = "entry" | "referenced" | "unreferenced" | "no-meta" | "unknown";

export interface AuditWarning {
  code:
    | "missing-meta"
    | "invalid-meta"
    | "text-decode-failed"
    | "unknown-reference"
    | "project-validation";
  message: string;
  path?: string;
}

export interface ResourceFile {
  absolutePath: string;
  relativePath: string;
  fileName: string;
  extension: string;
  sizeBytes: number;
  metaPath?: string;
}

export interface MetaInfo {
  resourceRelativePath: string;
  metaPath: string;
  uuid?: string;
  importer?: string;
  type?: string;
}

export interface ReferenceInfo {
  uuid: string;
  sourceRelativePaths: string[];
}

export interface AuditRow {
  category: ResourceCategory;
  fileName: string;
  relativePath: string;
  sizeBytes: number;
  humanSize: string;
  percentOfTotal: string;
  referenceStatus: ReferenceStatus;
  uuid?: string;
  referenceSourceCount: number;
  referenceSources: string[];
}

export interface AuditResult {
  projectRoot: string;
  totalSizeBytes: number;
  rows: AuditRow[];
  warnings: AuditWarning[];
}

export const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  texture: "Texture",
  audio: "Audio",
  animation: "Animation",
  model: "Model",
  scene: "Scene",
  prefab: "Prefab",
  "material-shader": "Material / Shader",
  font: "Font",
  video: "Video",
  data: "Data",
  script: "Script",
  other: "Other"
};
```

- [ ] **Step 4: Add formatting helpers**

Create `src/format.ts`:

```ts
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  if (unitIndex === 0) {
    return `${Math.round(value)} ${units[unitIndex]}`;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

export function toPercent(value: number, total: number): string {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return "0.00%";
  }

  return `${((value / total) * 100).toFixed(2)}%`;
}

export function escapeCsvCell(value: string | number | undefined): string {
  const text = value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}
```

- [ ] **Step 5: Export new modules**

Modify `src/index.ts`:

```ts
export const version = "0.1.0";

export * from "./domain.js";
export * from "./format.js";
```

- [ ] **Step 6: Run tests**

Run: `npm test -- tests/format.test.ts tests/smoke.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain.ts src/format.ts src/index.ts tests/format.test.ts
git commit -m "feat: add audit domain types and formatting helpers"
```

---

### Task 3: Project Validation And File Scanning

**Files:**
- Create: `src/project.ts`
- Create: `src/scanner.ts`
- Create: `tests/fixtures.ts`
- Create: `tests/project-scanner.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write fixture helper and scanner tests**

Create `tests/fixtures.ts`:

```ts
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
```

Create `tests/project-scanner.test.ts`:

```ts
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scanProjectFiles } from "../src/scanner";
import { validateProject } from "../src/project";
import { createMinimalCocosProject, writeFixtureFile } from "./fixtures";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "cocos-audit-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("validateProject", () => {
  it("accepts a project with assets directory", async () => {
    await createMinimalCocosProject(tempRoot);
    await expect(validateProject(tempRoot)).resolves.toEqual({
      projectRoot: path.resolve(tempRoot),
      assetsRoot: path.join(path.resolve(tempRoot), "assets")
    });
  });

  it("rejects a directory without assets", async () => {
    await expect(validateProject(tempRoot)).rejects.toThrow("does not contain an assets directory");
  });
});

describe("scanProjectFiles", () => {
  it("returns resources, meta files, and text candidates", async () => {
    await createMinimalCocosProject(tempRoot);
    await writeFixtureFile(tempRoot, "assets/textures/hero.png", Buffer.from([1, 2, 3]));
    await writeFixtureFile(tempRoot, "assets/textures/hero.png.meta", "{\"uuid\":\"hero-uuid\"}");
    await writeFixtureFile(tempRoot, "assets/readme.txt", "notes");

    const project = await validateProject(tempRoot);
    const result = await scanProjectFiles(project);

    expect(result.resources.map((file) => file.relativePath).sort()).toEqual([
      "assets/Main.scene",
      "assets/readme.txt",
      "assets/textures/hero.png"
    ]);
    expect(result.resources.find((file) => file.relativePath === "assets/textures/hero.png")?.sizeBytes).toBe(3);
    expect(result.metaPaths.map((file) => path.basename(file)).sort()).toEqual([
      "Main.scene.meta",
      "hero.png.meta"
    ]);
    expect(result.textCandidatePaths.map((file) => path.basename(file))).toContain("Main.scene");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/project-scanner.test.ts`

Expected: FAIL because `src/project.ts` and `src/scanner.ts` do not exist.

- [ ] **Step 3: Add project validation**

Create `src/project.ts`:

```ts
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
```

- [ ] **Step 4: Add scanner**

Create `src/scanner.ts`:

```ts
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
```

- [ ] **Step 5: Export project and scanner modules**

Modify `src/index.ts`:

```ts
export const version = "0.1.0";

export * from "./domain.js";
export * from "./format.js";
export * from "./project.js";
export * from "./scanner.js";
```

- [ ] **Step 6: Run tests**

Run: `npm test -- tests/project-scanner.test.ts tests/format.test.ts tests/smoke.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/project.ts src/scanner.ts src/index.ts tests/fixtures.ts tests/project-scanner.test.ts
git commit -m "feat: scan Cocos project resources"
```

---

### Task 4: Meta Parsing And Classification

**Files:**
- Create: `src/meta.ts`
- Create: `src/classifier.ts`
- Create: `tests/meta-classifier.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write tests**

Create `tests/meta-classifier.test.ts`:

```ts
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { classifyResource } from "../src/classifier";
import { parseMetaFile } from "../src/meta";
import type { ResourceFile } from "../src/domain";
import { writeFixtureFile } from "./fixtures";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "cocos-audit-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

function resource(relativePath: string): ResourceFile {
  return {
    absolutePath: path.join(tempRoot, relativePath),
    relativePath,
    fileName: path.basename(relativePath),
    extension: path.extname(relativePath).toLowerCase(),
    sizeBytes: 10
  };
}

describe("parseMetaFile", () => {
  it("extracts uuid and importer hints", async () => {
    const metaPath = await writeFixtureFile(
      tempRoot,
      "assets/hero.png.meta",
      JSON.stringify({ uuid: "hero-uuid", importer: "image", type: "sprite-frame" })
    );

    await expect(parseMetaFile(tempRoot, metaPath)).resolves.toEqual({
      resourceRelativePath: "assets/hero.png",
      metaPath,
      uuid: "hero-uuid",
      importer: "image",
      type: "sprite-frame"
    });
  });

  it("reports invalid JSON as a warning", async () => {
    const metaPath = await writeFixtureFile(tempRoot, "assets/bad.png.meta", "{bad");
    await expect(parseMetaFile(tempRoot, metaPath)).resolves.toMatchObject({
      resourceRelativePath: "assets/bad.png",
      metaPath,
      warning: {
        code: "invalid-meta"
      }
    });
  });
});

describe("classifyResource", () => {
  it("classifies common resource extensions", () => {
    expect(classifyResource(resource("assets/hero.png"))).toBe("texture");
    expect(classifyResource(resource("assets/click.ogg"))).toBe("audio");
    expect(classifyResource(resource("assets/run.anim"))).toBe("animation");
    expect(classifyResource(resource("assets/character.fbx"))).toBe("model");
    expect(classifyResource(resource("assets/Main.scene"))).toBe("scene");
    expect(classifyResource(resource("assets/Hero.prefab"))).toBe("prefab");
    expect(classifyResource(resource("assets/body.material"))).toBe("material-shader");
    expect(classifyResource(resource("assets/font.ttf"))).toBe("font");
    expect(classifyResource(resource("assets/intro.mp4"))).toBe("video");
    expect(classifyResource(resource("assets/config.csv"))).toBe("data");
    expect(classifyResource(resource("assets/Game.ts"))).toBe("script");
  });

  it("classifies recognizable Spine files as animation", () => {
    expect(classifyResource(resource("assets/spine/hero.atlas"))).toBe("animation");
    expect(classifyResource(resource("assets/spine/hero.skel"))).toBe("animation");
    expect(classifyResource(resource("assets/spine/hero.json"), { importer: "spine-data" })).toBe("animation");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/meta-classifier.test.ts`

Expected: FAIL because `src/meta.ts` and `src/classifier.ts` do not exist.

- [ ] **Step 3: Add meta parser**

Create `src/meta.ts`:

```ts
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AuditWarning, MetaInfo } from "./domain.js";
import { toProjectRelativePath } from "./scanner.js";

export interface ParsedMetaInfo extends MetaInfo {
  warning?: AuditWarning;
}

export async function parseMetaFile(projectRoot: string, metaPath: string): Promise<ParsedMetaInfo> {
  const resourcePath = metaPath.endsWith(".meta") ? metaPath.slice(0, -5) : metaPath;
  const resourceRelativePath = toProjectRelativePath(projectRoot, resourcePath);

  try {
    const text = await readFile(metaPath, "utf8");
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return {
      resourceRelativePath,
      metaPath,
      uuid: readString(parsed.uuid),
      importer: readString(parsed.importer),
      type: readString(parsed.type)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      resourceRelativePath,
      metaPath,
      warning: {
        code: "invalid-meta",
        path: path.relative(projectRoot, metaPath).split(path.sep).join("/"),
        message: `Could not parse meta file: ${message}`
      }
    };
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
```

- [ ] **Step 4: Add classifier**

Create `src/classifier.ts`:

```ts
import type { MetaInfo, ResourceCategory, ResourceFile } from "./domain.js";

const TEXTURE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".pvr", ".pkm", ".astc", ".ktx"]);
const AUDIO_EXTENSIONS = new Set([".mp3", ".ogg", ".wav", ".m4a"]);
const MODEL_EXTENSIONS = new Set([".fbx", ".gltf", ".glb", ".obj", ".mesh"]);
const MATERIAL_EXTENSIONS = new Set([".mtl", ".mat", ".material", ".effect", ".shader"]);
const FONT_EXTENSIONS = new Set([".ttf", ".otf", ".fnt"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm"]);
const DATA_EXTENSIONS = new Set([".json", ".csv", ".plist", ".xml"]);
const SCRIPT_EXTENSIONS = new Set([".ts", ".js"]);

export function classifyResource(resource: ResourceFile, meta?: Pick<MetaInfo, "importer" | "type">): ResourceCategory {
  const extension = resource.extension.toLowerCase();
  const normalizedPath = resource.relativePath.toLowerCase();
  const importer = meta?.importer?.toLowerCase() ?? "";
  const type = meta?.type?.toLowerCase() ?? "";

  if (extension === ".scene") return "scene";
  if (extension === ".prefab") return "prefab";
  if (extension === ".anim") return "animation";
  if (extension === ".atlas" || extension === ".skel") return "animation";
  if (importer.includes("spine") || importer.includes("dragonbones")) return "animation";
  if (type.includes("spine") || type.includes("dragonbones")) return "animation";
  if (normalizedPath.includes("/spine/") && extension === ".json") return "animation";
  if (TEXTURE_EXTENSIONS.has(extension)) return "texture";
  if (AUDIO_EXTENSIONS.has(extension)) return "audio";
  if (MATERIAL_EXTENSIONS.has(extension)) return "material-shader";
  if (FONT_EXTENSIONS.has(extension)) return "font";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  if (MODEL_EXTENSIONS.has(extension)) return "model";
  if (extension === ".bin" && (normalizedPath.includes("/model") || importer.includes("gltf"))) return "model";
  if (SCRIPT_EXTENSIONS.has(extension)) return "script";
  if (DATA_EXTENSIONS.has(extension)) return "data";
  return "other";
}
```

- [ ] **Step 5: Export modules**

Modify `src/index.ts`:

```ts
export const version = "0.1.0";

export * from "./domain.js";
export * from "./format.js";
export * from "./project.js";
export * from "./scanner.js";
export * from "./meta.js";
export * from "./classifier.js";
```

- [ ] **Step 6: Run tests**

Run: `npm test -- tests/meta-classifier.test.ts tests/project-scanner.test.ts tests/format.test.ts tests/smoke.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/meta.ts src/classifier.ts src/index.ts tests/meta-classifier.test.ts
git commit -m "feat: parse Cocos metadata and classify resources"
```

---

### Task 5: Reference Scanner And Audit Aggregation

**Files:**
- Create: `src/references.ts`
- Create: `src/audit.ts`
- Create: `tests/audit.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write audit tests**

Create `tests/audit.test.ts`:

```ts
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { auditProject } from "../src/audit";
import { createMinimalCocosProject, writeFixtureFile } from "./fixtures";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "cocos-audit-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("auditProject", () => {
  it("marks referenced, unreferenced, entry, and no-meta resources", async () => {
    await createMinimalCocosProject(tempRoot);
    await writeFixtureFile(tempRoot, "assets/textures/hero.png", Buffer.from([1, 2, 3, 4]));
    await writeFixtureFile(tempRoot, "assets/textures/hero.png.meta", JSON.stringify({ uuid: "hero-uuid", importer: "image" }));
    await writeFixtureFile(tempRoot, "assets/audio/click.ogg", Buffer.from([1, 2]));
    await writeFixtureFile(tempRoot, "assets/audio/click.ogg.meta", JSON.stringify({ uuid: "click-uuid", importer: "audio-clip" }));
    await writeFixtureFile(tempRoot, "assets/no-meta.webp", Buffer.from([1]));
    await writeFixtureFile(
      tempRoot,
      "assets/Main.scene",
      JSON.stringify({ __type__: "cc.SceneAsset", texture: { __uuid__: "hero-uuid" } })
    );

    const result = await auditProject(tempRoot);
    const byPath = new Map(result.rows.map((row) => [row.relativePath, row]));

    expect(byPath.get("assets/Main.scene")?.referenceStatus).toBe("entry");
    expect(byPath.get("assets/textures/hero.png")?.referenceStatus).toBe("referenced");
    expect(byPath.get("assets/textures/hero.png")?.referenceSources).toEqual(["assets/Main.scene"]);
    expect(byPath.get("assets/audio/click.ogg")?.referenceStatus).toBe("unreferenced");
    expect(byPath.get("assets/no-meta.webp")?.referenceStatus).toBe("no-meta");
    expect(result.totalSizeBytes).toBeGreaterThan(0);
    expect(result.warnings.some((warning) => warning.code === "missing-meta")).toBe(true);
  });

  it("sorts rows by category then size descending", async () => {
    await createMinimalCocosProject(tempRoot);
    await writeFixtureFile(tempRoot, "assets/a.png", Buffer.from([1]));
    await writeFixtureFile(tempRoot, "assets/a.png.meta", JSON.stringify({ uuid: "a-uuid" }));
    await writeFixtureFile(tempRoot, "assets/b.png", Buffer.from([1, 2, 3]));
    await writeFixtureFile(tempRoot, "assets/b.png.meta", JSON.stringify({ uuid: "b-uuid" }));

    const result = await auditProject(tempRoot);
    const textures = result.rows.filter((row) => row.category === "texture");

    expect(textures.map((row) => row.relativePath)).toEqual(["assets/b.png", "assets/a.png"]);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/audit.test.ts`

Expected: FAIL because `src/audit.ts` does not exist.

- [ ] **Step 3: Add UUID reference scanner**

Create `src/references.ts`:

```ts
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
```

- [ ] **Step 4: Add audit aggregator**

Create `src/audit.ts`:

```ts
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
```

- [ ] **Step 5: Export modules**

Modify `src/index.ts`:

```ts
export const version = "0.1.0";

export * from "./domain.js";
export * from "./format.js";
export * from "./project.js";
export * from "./scanner.js";
export * from "./meta.js";
export * from "./classifier.js";
export * from "./references.js";
export * from "./audit.js";
```

- [ ] **Step 6: Run audit tests**

Run: `npm test -- tests/audit.test.ts tests/meta-classifier.test.ts tests/project-scanner.test.ts tests/format.test.ts tests/smoke.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/references.ts src/audit.ts src/index.ts tests/audit.test.ts
git commit -m "feat: aggregate resource audit data"
```

---

### Task 6: CSV And HTML Report Writers

**Files:**
- Create: `src/reporters/csv.ts`
- Create: `src/reporters/html.ts`
- Create: `tests/reporters.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write reporter tests**

Create `tests/reporters.test.ts`:

```ts
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AuditResult } from "../src/domain";
import { writeCsvReport } from "../src/reporters/csv";
import { writeHtmlReport } from "../src/reporters/html";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "cocos-audit-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

const result: AuditResult = {
  projectRoot: "D:/Game",
  totalSizeBytes: 4,
  rows: [
    {
      category: "texture",
      fileName: "hero.png",
      relativePath: "assets/hero.png",
      sizeBytes: 4,
      humanSize: "4 B",
      percentOfTotal: "100.00%",
      referenceStatus: "referenced",
      uuid: "hero-uuid",
      referenceSourceCount: 1,
      referenceSources: ["assets/Main.scene"]
    }
  ],
  warnings: [
    {
      code: "missing-meta",
      path: "assets/missing.png",
      message: "Resource has no matching meta file: assets/missing.png"
    }
  ]
};

describe("report writers", () => {
  it("writes CSV rows with headers", async () => {
    const outputPath = path.join(tempRoot, "resource-audit.csv");
    await writeCsvReport(result, outputPath);
    const csv = await readFile(outputPath, "utf8");

    expect(csv).toContain("category,fileName,relativePath,sizeBytes,humanSize,percentOfTotal,referenceStatus,uuid,referenceSourceCount,referenceSources");
    expect(csv).toContain("texture,hero.png,assets/hero.png,4,4 B,100.00%,referenced,hero-uuid,1,assets/Main.scene");
  });

  it("writes HTML summary and rows", async () => {
    const outputPath = path.join(tempRoot, "resource-audit.html");
    await writeHtmlReport(result, outputPath);
    const html = await readFile(outputPath, "utf8");

    expect(html).toContain("<title>Cocos Resource Audit</title>");
    expect(html).toContain("assets/hero.png");
    expect(html).toContain("Static analysis cannot prove a resource is safe to delete.");
    expect(html).toContain("Resource has no matching meta file");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/reporters.test.ts`

Expected: FAIL because reporter files do not exist.

- [ ] **Step 3: Add CSV writer**

Create `src/reporters/csv.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AuditResult } from "../domain.js";
import { escapeCsvCell } from "../format.js";

const HEADERS = [
  "category",
  "fileName",
  "relativePath",
  "sizeBytes",
  "humanSize",
  "percentOfTotal",
  "referenceStatus",
  "uuid",
  "referenceSourceCount",
  "referenceSources"
];

export async function writeCsvReport(result: AuditResult, outputPath: string): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });

  const lines = [
    HEADERS.join(","),
    ...result.rows.map((row) =>
      [
        row.category,
        row.fileName,
        row.relativePath,
        row.sizeBytes,
        row.humanSize,
        row.percentOfTotal,
        row.referenceStatus,
        row.uuid,
        row.referenceSourceCount,
        row.referenceSources.join("; ")
      ].map(escapeCsvCell).join(",")
    )
  ];

  await writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
}
```

- [ ] **Step 4: Add HTML writer**

Create `src/reporters/html.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AuditResult, ResourceCategory } from "../domain.js";
import { CATEGORY_LABELS } from "../domain.js";
import { formatBytes } from "../format.js";

export async function writeHtmlReport(result: AuditResult, outputPath: string): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderHtml(result), "utf8");
}

function renderHtml(result: AuditResult): string {
  const categories = groupByCategory(result);
  const topRows = [...result.rows].sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 20);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cocos Resource Audit</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #222; background: #fafafa; }
    h1, h2 { margin-bottom: 8px; }
    .summary { display: flex; gap: 16px; flex-wrap: wrap; margin: 16px 0; }
    .metric { border: 1px solid #ddd; border-radius: 6px; padding: 12px; background: #fff; min-width: 180px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 28px; background: #fff; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f0f0f0; }
    code { font-family: Consolas, monospace; }
    .warning { border: 1px solid #d8a300; background: #fff8df; padding: 12px; border-radius: 6px; }
    .small { color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Cocos Resource Audit</h1>
  <p class="warning">Static analysis cannot prove a resource is safe to delete. Resources marked unreferenced were not found by UUID scan.</p>
  <div class="summary">
    <div class="metric"><strong>Total Size</strong><br>${escapeHtml(formatBytes(result.totalSizeBytes))}</div>
    <div class="metric"><strong>Resource Count</strong><br>${result.rows.length}</div>
    <div class="metric"><strong>Warnings</strong><br>${result.warnings.length}</div>
  </div>
  <h2>Category Summary</h2>
  ${renderCategorySummary(categories)}
  <h2>Top Largest Resources</h2>
  ${renderRows(topRows)}
  <h2>Resources By Category</h2>
  ${Object.entries(categories).map(([category, rows]) => `<h3>${escapeHtml(CATEGORY_LABELS[category as ResourceCategory])}</h3>${renderRows(rows)}`).join("\n")}
  <h2>Warnings</h2>
  ${renderWarnings(result)}
</body>
</html>
`;
}

function groupByCategory(result: AuditResult): Partial<Record<ResourceCategory, AuditResult["rows"]>> {
  const grouped: Partial<Record<ResourceCategory, AuditResult["rows"]>> = {};
  for (const row of result.rows) {
    grouped[row.category] ??= [];
    grouped[row.category]?.push(row);
  }
  return grouped;
}

function renderCategorySummary(categories: Partial<Record<ResourceCategory, AuditResult["rows"]>>): string {
  const rows = Object.entries(categories).map(([category, auditRows]) => {
    const size = auditRows.reduce((sum, row) => sum + row.sizeBytes, 0);
    return `<tr><td>${escapeHtml(CATEGORY_LABELS[category as ResourceCategory])}</td><td>${auditRows.length}</td><td>${escapeHtml(formatBytes(size))}</td></tr>`;
  });
  return `<table><thead><tr><th>Category</th><th>Count</th><th>Size</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function renderRows(rows: AuditResult["rows"]): string {
  if (rows.length === 0) {
    return "<p>No resources.</p>";
  }

  return `<table>
    <thead><tr><th>Category</th><th>Path</th><th>Size</th><th>Percent</th><th>Status</th><th>UUID</th><th>References</th></tr></thead>
    <tbody>
      ${rows.map((row) => `<tr>
        <td>${escapeHtml(CATEGORY_LABELS[row.category])}</td>
        <td><code>${escapeHtml(row.relativePath)}</code></td>
        <td>${escapeHtml(row.humanSize)}</td>
        <td>${escapeHtml(row.percentOfTotal)}</td>
        <td>${escapeHtml(row.referenceStatus)}</td>
        <td><code>${escapeHtml(row.uuid ?? "")}</code></td>
        <td>${escapeHtml(row.referenceSources.slice(0, 5).join("; "))}${row.referenceSources.length > 5 ? `<div class="small">+${row.referenceSources.length - 5} more in CSV</div>` : ""}</td>
      </tr>`).join("")}
    </tbody>
  </table>`;
}

function renderWarnings(result: AuditResult): string {
  if (result.warnings.length === 0) {
    return "<p>No warnings.</p>";
  }

  return `<table><thead><tr><th>Code</th><th>Path</th><th>Message</th></tr></thead><tbody>${result.warnings.map((warning) =>
    `<tr><td>${escapeHtml(warning.code)}</td><td><code>${escapeHtml(warning.path ?? "")}</code></td><td>${escapeHtml(warning.message)}</td></tr>`
  ).join("")}</tbody></table>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
```

- [ ] **Step 5: Export reporter modules**

Modify `src/index.ts`:

```ts
export const version = "0.1.0";

export * from "./domain.js";
export * from "./format.js";
export * from "./project.js";
export * from "./scanner.js";
export * from "./meta.js";
export * from "./classifier.js";
export * from "./references.js";
export * from "./audit.js";
export * from "./reporters/csv.js";
export * from "./reporters/html.js";
```

- [ ] **Step 6: Run reporter tests**

Run: `npm test -- tests/reporters.test.ts tests/audit.test.ts tests/meta-classifier.test.ts tests/project-scanner.test.ts tests/format.test.ts tests/smoke.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/reporters/csv.ts src/reporters/html.ts src/index.ts tests/reporters.test.ts
git commit -m "feat: write audit HTML and CSV reports"
```

---

### Task 7: CLI Orchestration

**Files:**
- Create: `src/cli.ts`
- Create: `tests/cli.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write CLI integration test**

Create `tests/cli.test.ts`:

```ts
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCli } from "../src/cli";
import { createMinimalCocosProject, writeFixtureFile } from "./fixtures";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "cocos-audit-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("runCli", () => {
  it("writes HTML and CSV reports", async () => {
    await createMinimalCocosProject(tempRoot);
    await writeFixtureFile(tempRoot, "assets/hero.png", Buffer.from([1, 2, 3]));
    await writeFixtureFile(tempRoot, "assets/hero.png.meta", JSON.stringify({ uuid: "hero-uuid" }));

    const outputDir = path.join(tempRoot, "reports");
    const exitCode = await runCli(["node", "cocos-resource-audit", "--project", tempRoot, "--out", outputDir]);

    expect(exitCode).toBe(0);
    await expect(access(path.join(outputDir, "resource-audit.html"))).resolves.toBeUndefined();
    await expect(access(path.join(outputDir, "resource-audit.csv"))).resolves.toBeUndefined();
    await expect(readFile(path.join(outputDir, "resource-audit.csv"), "utf8")).resolves.toContain("assets/hero.png");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- tests/cli.test.ts`

Expected: FAIL because `src/cli.ts` does not exist.

- [ ] **Step 3: Add CLI**

Create `src/cli.ts`:

```ts
#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import { auditProject } from "./audit.js";
import { formatBytes } from "./format.js";
import { ensureOutputDirectory } from "./project.js";
import { writeCsvReport } from "./reporters/csv.js";
import { writeHtmlReport } from "./reporters/html.js";
import { version } from "./index.js";

export async function runCli(argv: string[] = process.argv): Promise<number> {
  const program = new Command();

  program
    .name("cocos-resource-audit")
    .description("Audit Cocos Creator 3.x resource sizes and static references.")
    .version(version)
    .requiredOption("-p, --project <path>", "Cocos Creator project source directory")
    .option("-o, --out <path>", "Output directory for reports", "reports");

  try {
    program.parse(argv);
    const options = program.opts<{ project: string; out: string }>();
    const result = await auditProject(options.project);
    const outputDir = await ensureOutputDirectory(options.out, result.projectRoot);
    const htmlPath = path.join(outputDir, "resource-audit.html");
    const csvPath = path.join(outputDir, "resource-audit.csv");

    await writeHtmlReport(result, htmlPath);
    await writeCsvReport(result, csvPath);

    console.log(`Scanned ${result.rows.length} resources (${formatBytes(result.totalSizeBytes)}).`);
    console.log(`HTML report: ${htmlPath}`);
    console.log(`CSV report: ${csvPath}`);
    if (result.warnings.length > 0) {
      console.warn(`Warnings: ${result.warnings.length}`);
    }
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}`) {
  runCli().then((code) => {
    process.exitCode = code;
  });
}
```

- [ ] **Step 4: Export CLI helper**

Modify `src/index.ts`:

```ts
export const version = "0.1.0";

export * from "./domain.js";
export * from "./format.js";
export * from "./project.js";
export * from "./scanner.js";
export * from "./meta.js";
export * from "./classifier.js";
export * from "./references.js";
export * from "./audit.js";
export * from "./reporters/csv.js";
export * from "./reporters/html.js";
export { runCli } from "./cli.js";
```

- [ ] **Step 5: Run CLI tests and typecheck**

Run: `npm test -- tests/cli.test.ts tests/reporters.test.ts tests/audit.test.ts tests/meta-classifier.test.ts tests/project-scanner.test.ts tests/format.test.ts tests/smoke.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Build**

Run: `npm run build`

Expected: PASS and `dist/src/cli.js` exists. If the `bin` path in `package.json` points to `./dist/cli.js` but the build emits `dist/src/cli.js`, update `package.json` bin to `./dist/src/cli.js`, rerun `npm run build`, and rerun `npm test`.

- [ ] **Step 7: Commit**

```bash
git add src/cli.ts src/index.ts package.json package-lock.json tests/cli.test.ts
git commit -m "feat: add resource audit CLI"
```

---

### Task 8: End-To-End Fixture Test And README

**Files:**
- Create: `tests/e2e.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Write end-to-end test**

Create `tests/e2e.test.ts`:

```ts
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCli } from "../src/cli";
import { writeFixtureFile } from "./fixtures";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "cocos-audit-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("end-to-end audit", () => {
  it("audits a representative Cocos Creator 3.x source tree", async () => {
    await writeFixtureFile(tempRoot, "settings/v2/packages/builder.json", "{}");
    await writeFixtureFile(tempRoot, "assets/Main.scene", JSON.stringify({ texture: { __uuid__: "hero-uuid" } }));
    await writeFixtureFile(tempRoot, "assets/Main.scene.meta", JSON.stringify({ uuid: "scene-uuid", importer: "scene" }));
    await writeFixtureFile(tempRoot, "assets/textures/hero.png", Buffer.from([1, 2, 3, 4, 5]));
    await writeFixtureFile(tempRoot, "assets/textures/hero.png.meta", JSON.stringify({ uuid: "hero-uuid", importer: "image" }));
    await writeFixtureFile(tempRoot, "assets/audio/theme.mp3", Buffer.from([1, 2, 3]));
    await writeFixtureFile(tempRoot, "assets/audio/theme.mp3.meta", JSON.stringify({ uuid: "theme-uuid", importer: "audio-clip" }));
    await writeFixtureFile(tempRoot, "assets/spine/hero.json", JSON.stringify({ skeleton: { hash: "abc" } }));
    await writeFixtureFile(tempRoot, "assets/spine/hero.json.meta", JSON.stringify({ uuid: "spine-uuid", importer: "spine-data" }));

    const outputDir = path.join(tempRoot, "audit-output");
    const exitCode = await runCli(["node", "cocos-resource-audit", "--project", tempRoot, "--out", outputDir]);

    expect(exitCode).toBe(0);
    const csv = await readFile(path.join(outputDir, "resource-audit.csv"), "utf8");
    const html = await readFile(path.join(outputDir, "resource-audit.html"), "utf8");

    expect(csv).toContain("assets/textures/hero.png");
    expect(csv).toContain("referenced");
    expect(csv).toContain("assets/audio/theme.mp3");
    expect(csv).toContain("unreferenced");
    expect(csv).toContain("assets/spine/hero.json");
    expect(html).toContain("Cocos Resource Audit");
    expect(html).toContain("Static analysis cannot prove a resource is safe to delete.");
  });
});
```

- [ ] **Step 2: Run end-to-end test**

Run: `npm test -- tests/e2e.test.ts`

Expected: PASS.

- [ ] **Step 3: Update README usage**

Modify `README.md`:

```md
# Cocos 资源体积审计工具

用于调查 Cocos Creator 3.x 游戏项目源码目录中资源文件的大小、分类和静态引用情况，帮助开发者评估包体与资源优化优先级。

## 功能

- 扫描 Cocos Creator 项目的 `assets/` 目录。
- 解析资源旁边的 `.meta` 文件，建立 UUID 索引。
- 按资源类型分类，例如贴图、音频、动画、模型、场景、Prefab、材质、字体、视频和数据文件。
- 输出文件名、目录、大小、分类、UUID 和静态引用状态。
- 每个分类内按文件大小从大到小排序。
- 同时生成 HTML 和 CSV 报告。

## 安装依赖

```bash
npm install
```

## 开发运行

```bash
npm run dev -- --project D:\GameProject --out reports
```

## 构建

```bash
npm run build
```

## 使用

```bash
npx cocos-resource-audit-tool --project D:\GameProject --out reports
```

输出：

- `reports/resource-audit.html`
- `reports/resource-audit.csv`

## 引用状态说明

- `entry`：场景、Prefab 或可从项目元数据发现的入口类资源。
- `referenced`：静态文件中发现了资源 UUID 引用。
- `unreferenced`：静态扫描没有发现 UUID 引用，不代表可以直接删除。
- `no-meta`：资源没有对应 `.meta` 文件。
- `unknown`：无法可靠判断。

## 限制

- 第一版只分析 Cocos Creator 3.x 项目源码目录，不分析构建产物。
- 不会修改、删除或移动目标项目里的任何资源。
- 代码动态加载、远程资源和热更新资源无法保证被完整识别。
- FBX/GLB 内部嵌入的贴图或动画不会被深度解析。

## 测试

```bash
npm test
npm run typecheck
npm run build
```
```

- [ ] **Step 4: Run full verification**

Run: `npm test`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md tests/e2e.test.ts
git commit -m "docs: document resource audit CLI usage"
```

---

### Task 9: Final Verification And Push

**Files:**
- No source file changes expected unless verification exposes a concrete failure.

- [ ] **Step 1: Inspect working tree**

Run: `git status --short --branch`

Expected: clean working tree on `main` ahead of `origin/main`.

- [ ] **Step 2: Run full test suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Push commits**

Run: `git push`

Expected: `main` pushes to `https://github.com/xingwuyue/cocos-resource-audit-tool.git`.

- [ ] **Step 6: Report final result**

Return a concise summary containing:

- Implemented CLI command.
- Report files generated.
- Verification commands and pass/fail results.
- Latest commit hash from `git log --oneline -1`.

---

## Self-Review Notes

- Spec coverage: project validation, asset scanning, meta UUID indexing, classification, reference scanning, status aggregation, HTML output, CSV output, warning behavior, tests, and no project mutation are covered by Tasks 1-9.
- Scope: this plan implements the approved first version only. Build output analysis, deletion, deep model parsing, history, CI thresholds, and interactive UI remain outside this plan.
- Type consistency: shared interfaces originate in `src/domain.ts`; later modules import and reuse those names.
