import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

describe('Windows one-click launcher', () => {
  test('documents and invokes the built CLI', async () => {
    const script = await readFile(path.join(process.cwd(), 'run-audit.bat'), 'utf8');

    expect(script).toContain('--help');
    expect(script).toContain('set /p PROJECT_DIR=');
    expect(script).toContain('npm install');
    expect(script).toContain('npm run build');
    expect(script).toContain('node dist\\cli.js');
    expect(script).toContain('resource-audit.html');
  });
});

describe('Electron desktop launcher', () => {
  test('declares desktop scripts and UI entry files', async () => {
    const packageJson = JSON.parse(await readFile(path.join(process.cwd(), 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
      build: { win: { target: string[] } };
    };
    const main = await readFile(path.join(process.cwd(), 'src/desktop/main.ts'), 'utf8');
    const preload = await readFile(path.join(process.cwd(), 'src/desktop/preload.cjs'), 'utf8');
    const html = await readFile(path.join(process.cwd(), 'src/desktop/index.html'), 'utf8');
    const copyAssets = await readFile(path.join(process.cwd(), 'scripts/copy-desktop-assets.mjs'), 'utf8');

    expect(packageJson.scripts['desktop:build']).toBe('tsc -p tsconfig.build.json && node scripts/copy-desktop-assets.mjs');
    expect(packageJson.scripts['desktop:dev']).toBe('npm run desktop:build && electron dist/desktop/main.js');
    expect(packageJson.scripts['package:win']).toBe('npm run package:win:portable');
    expect(packageJson.scripts['package:win:installer']).toBe('npm run desktop:build && electron-builder --win --x64 --config.win.target=nsis');
    expect(packageJson.scripts['package:win:portable']).toBe('npm run desktop:build && electron-builder --win --x64 --config.win.target=portable');
    expect(packageJson.devDependencies.electron).toBeDefined();
    expect(packageJson.devDependencies['electron-builder']).toBeDefined();
    expect(packageJson.build.win.target).toContain('portable');
    expect(main).toContain('BrowserWindow');
    expect(main).toContain('path.join(__dirname, "index.html")');
    expect(main).toContain('path.join(__dirname, "preload.cjs")');
    expect(main).not.toContain('"src", "desktop", "index.html"');
    expect(main).not.toContain('preload.js');
    expect(main).toContain('cocos-resource-audit-desktop.log');
    expect(main).toContain('app.whenReady().then');
    expect(main).toContain('Cocos 资源审计工具');
    expect(main).toContain('ipc-project-select');
    expect(main).toContain('console-message');
    expect(preload).toContain('contextBridge');
    expect(preload).toContain('require("electron")');
    expect(preload).toContain('preload-bridge-ready');
    expect(html).toContain('Cocos 资源审计工具');
    expect(html).toContain('src="./renderer.js"');
    expect(copyAssets).toContain('index.html');
    expect(copyAssets).toContain('styles.css');
    expect(copyAssets).toContain('preload.cjs');
  });

  test('provides a Windows desktop startup script', async () => {
    const script = await readFile(path.join(process.cwd(), 'run-desktop.bat'), 'utf8');

    expect(script).toContain('npm install');
    expect(script).toContain('npm run desktop:dev');
    expect(script).toContain('--help');
  });
});
