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
