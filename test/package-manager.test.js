import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTempProject } from './test-utils.js';
import { detectPackageManager, getScriptCommand } from '../src/package-manager.js';

test('detectPackageManager prefers pnpm lockfile before npm', async () => {
  const dir = await makeTempProject();
  await writeFile(join(dir, 'package-lock.json'), '{}');
  await writeFile(join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: 9');

  const result = await detectPackageManager(dir);

  assert.equal(result.name, 'pnpm');
  assert.equal(result.runCommand, 'pnpm');
});

test('detectPackageManager falls back to npm when no lockfile exists', async () => {
  const dir = await makeTempProject();

  const result = await detectPackageManager(dir);

  assert.equal(result.name, 'npm');
});

test('getScriptCommand builds package-manager specific run commands', () => {
  const pkg = { scripts: { dev: 'vite' } };

  assert.deepEqual(getScriptCommand({ name: 'npm', runCommand: 'npm' }, pkg, 'dev'), ['npm', 'run', 'dev']);
  assert.deepEqual(getScriptCommand({ name: 'yarn', runCommand: 'yarn' }, pkg, 'dev'), ['yarn', 'dev']);
  assert.deepEqual(getScriptCommand({ name: 'pnpm', runCommand: 'pnpm' }, pkg, 'dev'), ['pnpm', 'run', 'dev']);
  assert.deepEqual(getScriptCommand({ name: 'bun', runCommand: 'bun' }, pkg, 'dev'), ['bun', 'run', 'dev']);
});
