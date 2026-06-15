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
