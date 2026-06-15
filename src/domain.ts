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
