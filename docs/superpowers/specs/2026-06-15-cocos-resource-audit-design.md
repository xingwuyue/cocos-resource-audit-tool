# Cocos Resource Audit Tool Design

Date: 2026-06-15

## Goal

Build a command line tool that audits a Cocos Creator 3.x project source directory and reports resource size, type, and static reference status. The first version helps developers, artists, and producers identify large resources and optimization priorities without modifying the target project.

## Target Input

The first version accepts a Cocos Creator 3.x project source directory, typically containing:

- `assets/`
- `settings/`
- Cocos `.meta` files
- Serialized Cocos files such as `.scene`, `.prefab`, `.anim`, and material-related assets

The tool does not target build output directories in the first version.

## Command Shape

Expected usage:

```bash
cocos-resource-audit --project D:\GameProject --out reports
```

Expected outputs:

- `reports/resource-audit.html`
- `reports/resource-audit.csv`

## Core Capabilities

1. Scan resource files under `assets/`.
2. Scan adjacent `.meta` files and build a UUID-to-resource-path index.
3. Classify resources by type.
4. Calculate file size for each resource.
5. Parse serialized Cocos project files for UUID references.
6. Mark each resource with a static reference status.
7. Generate HTML and CSV reports grouped by resource type and sorted by size descending.

## Resource Classification

The first version classifies resources primarily by extension, with `.meta` importer/type data used when available.

| Category | Examples |
| --- | --- |
| Texture | `.png`, `.jpg`, `.jpeg`, `.webp`, `.pvr`, `.pkm`, `.astc`, `.ktx` |
| Audio | `.mp3`, `.ogg`, `.wav`, `.m4a` |
| Animation | `.anim`, Spine `.json/.skel/.atlas`, DragonBones `.json` when recognizable |
| Model | `.fbx`, `.gltf`, `.glb`, `.obj`, `.mesh`, `.bin` when model-related |
| Scene | `.scene` |
| Prefab | `.prefab` |
| Material / Shader | `.mtl`, `.mat`, `.material`, `.effect`, `.shader` |
| Font | `.ttf`, `.otf`, `.fnt` |
| Video | `.mp4`, `.mov`, `.webm` |
| Data | `.json`, `.csv`, `.plist`, `.xml`, excluding files classified more specifically |
| Script | `.ts`, `.js` |
| Other | Anything not matched by a known rule |

If an asset could fit multiple categories, the more Cocos-specific rule wins before generic extension rules. For example, a Spine JSON should be animation, not data.

## Reference Status

Each resource receives one status:

- `entry`: The resource is an entry-like asset such as a scene, prefab, or a bundle entry that can be discovered from project metadata. This does not imply full build output analysis.
- `referenced`: At least one serialized project file contains the resource UUID.
- `unreferenced`: The scanner found a UUID for the resource but did not find static references to it.
- `no-meta`: The resource has no matching `.meta` file.
- `unknown`: The resource cannot be confidently evaluated.

The report must describe `unreferenced` as "not found by static scan", not as "safe to delete".

## Reference Analysis

The first version performs static UUID reference analysis:

1. Parse `.meta` files to extract UUIDs.
2. Scan serialized Cocos files for UUID string occurrences.
3. Link discovered UUIDs back to resource paths.
4. Record reference sources so the report can show where a resource was found.

Reference source files include:

- `.scene`
- `.prefab`
- `.anim`
- `.material`
- `.mat`
- `.effect`
- `.json` where relevant

The tool may scan text-like project files broadly, but it should avoid treating binary files as text.

## Report Contents

Each report row includes:

- Category
- File name
- Relative path
- Size in bytes
- Human-readable size
- Percent of scanned asset size
- Reference status
- UUID if available
- Reference source count
- Reference source paths, capped in the HTML view if needed

The HTML report includes:

- Total scanned size
- Total resource count
- Category summary table
- Top largest resources
- Per-category tables sorted by size descending
- A clear warning about static analysis limits

The CSV report contains the full row-level data without visual truncation.

## Architecture

The implementation should keep the scanner modular:

- CLI: Parses `--project` and `--out`, validates paths, and orchestrates the run.
- Project detector: Confirms the input resembles a Cocos Creator project and locates `assets/`.
- File scanner: Walks project files, collects resources, sizes, and related meta paths.
- Meta parser: Extracts UUIDs and optional type/importer hints from `.meta` files.
- Classifier: Assigns resource categories using path, extension, and meta hints.
- Reference scanner: Finds UUID references in serialized Cocos files.
- Aggregator: Combines file info, classification, size, and reference status.
- Report writers: Emit HTML and CSV.

Each module should expose plain data structures so it can be tested without running the full CLI.

## Data Flow

```text
CLI arguments
  -> project validation
  -> asset file scan
  -> meta UUID index
  -> resource classification
  -> serialized file reference scan
  -> audit row aggregation
  -> HTML and CSV report output
```

## Error Handling

The CLI should fail with a clear message when:

- `--project` is missing.
- The project path does not exist.
- The project path does not contain `assets/`.
- The output directory cannot be created.

The CLI should continue with warnings when:

- A resource has no `.meta`.
- A `.meta` file cannot be parsed.
- A serialized file cannot be decoded as text.
- A referenced UUID is not present in the scanned asset index.

Warnings should appear in the terminal summary and HTML report.

## Non-Goals For Version 1

- No build output analysis.
- No automatic deletion or modification of target project resources.
- No guarantee that code-driven dynamic loads are fully detected.
- No deep parsing of FBX/GLB internals.
- No historical comparison or CI threshold enforcement.
- No interactive web application.

## Testing Strategy

The first implementation should include fixture-based tests:

1. A minimal fake Cocos project with `assets/`, `.meta`, one scene, and referenced resources.
2. An unreferenced resource fixture.
3. A missing-meta fixture.
4. Resource classification tests for common extensions.
5. Report generation tests that assert HTML and CSV files are created and contain expected rows.

The implementation should also support a manual smoke test against a real Cocos Creator 3.x project path.

## Acceptance Criteria

The first version is acceptable when:

- Running the CLI against a valid Cocos Creator 3.x project produces HTML and CSV reports.
- Reports group resources by category and sort each category by size descending.
- Reports include file name, relative path, size, category, UUID, and reference status.
- Referenced and unreferenced resources are distinguishable.
- Missing `.meta` files are reported without crashing.
- The tool never modifies the audited Cocos project.
