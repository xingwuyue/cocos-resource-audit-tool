# Electron UI Design

## Goal

Build a local desktop UI for the Cocos resource audit tool so users can choose a Cocos Creator project folder, run the audit, inspect the results inside the app, and export HTML/CSV reports without using the command line.

## Scope

The UI is a local Electron app. It keeps the existing CLI, scanner, classifier, audit, CSV reporter, HTML reporter, and `run-audit.bat` behavior intact. The first UI version focuses on Cocos Creator source projects with an `assets/` directory, matching the existing audit engine.

## User Workflow

1. User launches the desktop app with `npm run desktop` or a Windows launcher.
2. User clicks a folder button and selects a Cocos Creator project directory.
3. The app validates that the selected directory has an `assets/` folder.
4. User clicks run. The main process runs the existing audit engine.
5. The renderer shows summary metrics, category totals, largest resources, and a filterable resource table.
6. User exports reports to a selected directory. The app writes `resource-audit.html` and `resource-audit.csv`.
7. User can open the export directory from the UI.

## Architecture

Electron has three pieces:

- Main process: owns native dialogs, filesystem access, audit execution, report export, and opening folders.
- Preload bridge: exposes a small typed API to the renderer via `contextBridge`.
- Renderer: displays the app state, controls, summaries, filters, tables, and export buttons.

The renderer cannot read arbitrary local files directly. It asks the main process to choose folders, run audits, and export reports. This keeps filesystem access centralized and testable.

## UI

The UI should be utilitarian and dense enough for resource review:

- Top toolbar: selected project path, choose-folder button, run button, export button, open-output button.
- Summary band: total resource size, file count, referenced count, unreferenced count, warning count.
- Category panel: category rows sorted by total size, with file count and percentage of total size.
- Main table: resource path, category, size, reference status, UUID, and reference count/source summary.
- Filters: category select, reference status select, text search.
- State handling: empty state, running state, error state, and finished state.

The UI should avoid decorative marketing layout. It is an operational tool for repeated inspection.

## Export Behavior

Export writes the same report formats as the CLI:

- `resource-audit.html`
- `resource-audit.csv`

The export default directory is `reports` under the tool repository when the user does not choose one. The UI also supports selecting another output directory.

## Testing

Automated tests should cover:

- UI view-model functions for summary, categories, filtering, and sorting.
- Preload/main shared payload types where practical.
- Electron main service functions that can be tested without launching a GUI, especially audit/export orchestration with injected dependencies.

Manual verification should cover:

- `npm run desktop:dev` opens the UI.
- Choosing a fixture Cocos project runs an audit.
- Export writes HTML and CSV.
- Existing CLI tests still pass.

## Non-Goals

- No packaged installer in the first version.
- No deep parsing of model internals beyond the existing engine.
- No editing, deleting, or moving target project assets.
- No web-hosted mode, because browser-only folder access cannot reliably support this audit workflow.
