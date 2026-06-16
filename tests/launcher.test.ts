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
    };
    const main = await readFile(path.join(process.cwd(), 'src/desktop/main.ts'), 'utf8');
    const preload = await readFile(path.join(process.cwd(), 'src/desktop/preload.ts'), 'utf8');
    const html = await readFile(path.join(process.cwd(), 'src/desktop/index.html'), 'utf8');

    expect(packageJson.scripts['desktop:build']).toBe('tsc -p tsconfig.build.json');
    expect(packageJson.scripts['desktop:dev']).toBe('npm run desktop:build && electron dist/desktop/main.js');
    expect(packageJson.devDependencies.electron).toBeDefined();
    expect(main).toContain('BrowserWindow');
    expect(preload).toContain('contextBridge');
    expect(html).toContain('Cocos Resource Audit');
  });

  test('provides a Windows desktop startup script', async () => {
    const script = await readFile(path.join(process.cwd(), 'run-desktop.bat'), 'utf8');

    expect(script).toContain('npm install');
    expect(script).toContain('npm run desktop:dev');
    expect(script).toContain('--help');
  });
});
