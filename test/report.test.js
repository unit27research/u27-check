import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTempProject } from './test-utils.js';
import { runReport } from '../src/report.js';

test('runReport passes CTA checks for a static project with a valid primary link', async () => {
  const dir = await makeTempProject();
  await writeStaticProject(dir, '/signup.html');
  await writeFile(join(dir, 'signup.html'), '<!doctype html><h1>Signup app page</h1><p>Enough content to resolve.</p>');

  const report = await runReport(dir, { config: { timeoutRuntime: 2, timeoutLoad: 2 } });

  assert.equal(report.checks.find((check) => check.id === 'H2').status, 'pass');
  assert.equal(report.checks.find((check) => check.id === 'H4').status, 'pass');
  assert.equal(report.checks.find((check) => check.id === 'H5').status, 'pass');
  assert.equal(report.summary.failed, 0);
});

test('runReport fails CTA target when primary link returns 404', async () => {
  const dir = await makeTempProject();
  await writeStaticProject(dir, '/signup');

  const report = await runReport(dir, { config: { timeoutRuntime: 2, timeoutLoad: 2 } });

  const ctaTarget = report.checks.find((check) => check.id === 'H5');

  assert.equal(ctaTarget.status, 'fail');
  assert.match(ctaTarget.message, /returned 404/);
  assert.deepEqual(report.likelyFailures, ['User cannot complete the primary action.']);
});

async function writeStaticProject(dir, ctaHref) {
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, 'README.md'),
    '# Static App\n\n## Getting Started\n\nOpen index.html in a browser.\n',
  );
  await writeFile(
    join(dir, 'index.html'),
    `<!doctype html>
    <html>
      <head><title>Static Product App</title></head>
      <body>
        <main class="hero">
          <h1>Launch checklist app for founders</h1>
          <p>This page contains enough homepage copy to pass the blank-page content length check.</p>
          <a class="primary" href="${ctaHref}">Get Started</a>
        </main>
      </body>
    </html>`,
  );
}
