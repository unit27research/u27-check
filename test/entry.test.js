import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTempProject } from './test-utils.js';
import { checkEntry } from '../src/entry.js';

test('checkEntry passes when a dev script exists and README mentions it', async () => {
  const dir = await makeTempProject();
  await writeFile(join(dir, 'package.json'), JSON.stringify({ scripts: { dev: 'vite' } }));
  await writeFile(join(dir, 'README.md'), '## Getting Started\n\nnpm install\nnpm run dev\n');

  const result = await checkEntry(dir);

  assert.equal(result.status, 'pass');
  assert.match(result.message, /npm run dev/);
});

test('checkEntry warns when script exists but README omits it', async () => {
  const dir = await makeTempProject();
  await writeFile(join(dir, 'package.json'), JSON.stringify({ scripts: { dev: 'vite' } }));
  await writeFile(join(dir, 'README.md'), '# App\n');

  const result = await checkEntry(dir);

  assert.equal(result.status, 'warn');
  assert.match(result.message, /README/);
});

test('checkEntry fails when neither scripts nor setup instructions exist', async () => {
  const dir = await makeTempProject();
  await writeFile(join(dir, 'package.json'), JSON.stringify({ scripts: {} }));
  await writeFile(join(dir, 'README.md'), '# App\n');

  const result = await checkEntry(dir);

  assert.equal(result.status, 'fail');
  assert.match(result.message, /no dev\/start\/run script/i);
});
