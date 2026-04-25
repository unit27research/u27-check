import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeOutputs } from '../src/output.js';

test('writeOutputs creates launch packet and audit log', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'u27-output-'));
  const report = {
    repoPath: dir,
    checks: [
      {
        id: 'H5',
        label: 'CTA Target',
        name: 'CTA target is valid',
        status: 'fail',
        message: '/signup returned 404',
        userFailure: 'User cannot complete the primary action.',
        fix: 'Create the missing route or fix the broken link.',
      },
    ],
    observations: [],
    likelyFailures: ['User cannot complete the primary action.'],
    minimumFixes: ['Create the missing route or fix the broken link.'],
    ctaIdentification: null,
    summary: { total_checks: 1, passed: 0, failed: 1, warnings: 0 },
  };

  await writeOutputs(report);

  const packet = await readFile(join(dir, 'u27', 'LAUNCH_PACKET.md'), 'utf8');
  const audit = JSON.parse(await readFile(join(dir, 'u27', 'AUDIT_LOG.json'), 'utf8'));

  assert.match(packet, /not ready/);
  assert.equal(audit.summary.failed, 1);
});
