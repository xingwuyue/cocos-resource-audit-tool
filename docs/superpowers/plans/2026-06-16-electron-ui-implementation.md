# Electron Audit UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Electron desktop UI that lets users choose a Cocos Creator project folder, run the existing audit engine, view results, and export HTML/CSV reports.

**Architecture:** Keep the current audit engine as the source of truth. Add Electron main/preload/renderer files around it, with filesystem and dialog operations in the main process and pure UI state logic in renderer modules.

**Tech Stack:** TypeScript, Electron, existing Node audit modules, Vitest, HTML/CSS/vanilla browser JavaScript.

---

## File Structure

- Create `src/desktop/view-model.ts`: pure functions for summary cards, category summaries, filtering, sorting, and table row mapping.
- Create `src/desktop/service.ts`: testable audit/export/open-folder orchestration with injected native dependencies.
- Create `src/desktop/main.ts`: Electron app entry, BrowserWindow creation, IPC handlers, native dialogs, and shell opening.
- Create `src/desktop/preload.ts`: typed `window.cocosAudit` bridge.
- Create `src/desktop/renderer.ts`: browser UI event handling and DOM rendering.
- Create `src/desktop/styles.css`: operational dashboard styling.
- Create `src/desktop/index.html`: desktop UI shell.
- Create `tests/desktop-view-model.test.ts`: view-model tests.
- Create `tests/desktop-service.test.ts`: service orchestration tests with injected fakes.
- Modify `package.json`: add Electron dependencies and scripts.
- Modify `tsconfig.build.json`: compile `src/desktop/**/*.ts`.
- Modify `README.md`: document desktop UI launch and usage.

## Task 1: View-Model

**Files:**
- Create: `src/desktop/view-model.ts`
- Test: `tests/desktop-view-model.test.ts`

- [ ] **Step 1: Write failing tests**

Test summary, category totals, filters, and stable sorting against a small `AuditReport`.

- [ ] **Step 2: Run tests**

Run: `npm test -- tests/desktop-view-model.test.ts`
Expected: fail because `src/desktop/view-model.ts` does not exist.

- [ ] **Step 3: Implement view-model functions**

Export `createDashboardModel(report, filters)` and helper types. Keep it DOM-free and Electron-free.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/desktop-view-model.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

Commit message: `feat: add desktop audit view model`

## Task 2: Desktop Service

**Files:**
- Create: `src/desktop/service.ts`
- Test: `tests/desktop-service.test.ts`

- [ ] **Step 1: Write failing tests**

Test project selection cancellation, audit success, export success, invalid project error propagation, and open-folder delegation.

- [ ] **Step 2: Run tests**

Run: `npm test -- tests/desktop-service.test.ts`
Expected: fail because service module does not exist.

- [ ] **Step 3: Implement service**

Create `createDesktopService(deps)` with injected `chooseDirectory`, `auditProject`, `writeHtmlReport`, `writeCsvReport`, and `openPath` dependencies.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/desktop-service.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

Commit message: `feat: add desktop audit service`

## Task 3: Electron Shell

**Files:**
- Create: `src/desktop/main.ts`
- Create: `src/desktop/preload.ts`
- Create: `src/desktop/index.html`
- Create: `src/desktop/renderer.ts`
- Create: `src/desktop/styles.css`
- Modify: `package.json`
- Modify: `tsconfig.build.json`

- [ ] **Step 1: Write failing smoke test**

Extend an existing smoke or launcher test to assert package scripts and desktop files exist.

- [ ] **Step 2: Run smoke test**

Run: `npm test -- tests/launcher.test.ts`
Expected: fail until package scripts/files exist.

- [ ] **Step 3: Add Electron dependencies and scripts**

Add `electron` as a dev dependency and scripts:
- `desktop:build`: `tsc -p tsconfig.build.json`
- `desktop:dev`: `npm run desktop:build && electron dist/desktop/main.js`

- [ ] **Step 4: Implement Electron files**

Main creates a window loading `dist/desktop/index.html`, preload exposes `selectProject`, `runAudit`, `exportReports`, and `openOutputDirectory`, renderer binds UI.

- [ ] **Step 5: Verify**

Run:
- `npm test -- tests/launcher.test.ts`
- `npm run typecheck`
- `npm run build`

Expected: all pass.

- [ ] **Step 6: Commit**

Commit message: `feat: add Electron desktop shell`

## Task 4: Docs and Manual Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document desktop launch**

Add desktop UI usage:
- `npm install`
- `npm run desktop:dev`
- Choose project folder
- Run audit
- Export report

- [ ] **Step 2: Run full verification**

Run:
- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run desktop:build`

Expected: all pass.

- [ ] **Step 3: Manual launch check**

Run: `npm run desktop:dev`
Expected: Electron window opens with the dashboard UI. Close it after checking.

- [ ] **Step 4: Commit and push**

Commit message: `docs: document desktop audit UI`
Push `main` to GitHub.

## Self-Review

- Spec coverage: folder selection, audit execution, in-app viewing, export, and open output are covered.
- Open-item scan: no unresolved markers.
- Type consistency: service/view-model names are consistent across tasks.
