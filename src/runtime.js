import http from 'node:http';
import { findRuntimeScript, getScriptCommand } from './package-manager.js';
import { startProcess } from './processes.js';
import { fileExists } from './utils.js';
import { join } from 'node:path';

const COMMON_PORTS = [3000, 3001, 5173, 8000, 8080];

export async function checkRuntimeLoad(repoPath, pkg, manager, config) {
  const scriptName = findRuntimeScript(pkg);
  const startedAt = Date.now();
  let server = null;

  if (!scriptName && (await fileExists(join(repoPath, 'index.html')))) {
    server = await startStaticServer(repoPath);
  } else if (!scriptName) {
    return {
      check: {
        id: 'H2',
        label: 'Load',
        name: 'Runtime load',
        status: 'fail',
        message: 'no dev/start script found to start runtime',
        measurement: 'package.json runtime script + GET /',
        evidence: 'No runtime script found.',
        userFailure: 'User cannot access a working product.',
        fix: 'Ensure dev command starts the app and renders a working homepage.',
      },
      html: null,
      baseUrl: null,
      cleanup: async () => {},
    };
  }

  const command = server ? null : getScriptCommand(manager, pkg, scriptName);
  const processHandle = server ? null : startProcess(command[0], command.slice(1), { cwd: repoPath });
  const cleanup = async () => {
    await processHandle?.stop();
    await server?.close();
  };

  const result = await waitForServer({
    ports: server ? [server.port] : COMMON_PORTS,
    timeoutMs: config.timeoutRuntime * 1000,
    loadTimeoutMs: config.timeoutLoad * 1000,
  });

  if (!result) {
    const output = processHandle?.getOutput() ?? {};
    return {
      check: {
        id: 'H2',
        label: 'Load',
        name: 'Runtime load',
        status: 'fail',
        message: 'dev server did not respond on expected port',
        measurement: `probed ports ${COMMON_PORTS.join(', ')}`,
        evidence: trimEvidence(`${output.stdout ?? ''}\n${output.stderr ?? ''}`) || 'No HTTP response detected.',
        userFailure: 'User cannot access a working product.',
        fix: 'Ensure dev command starts the app and renders a working homepage.',
      },
      html: null,
      baseUrl: null,
      cleanup,
    };
  }

  const contentLength = result.html.length;
  const slow = Date.now() - startedAt > 30_000;
  const status = result.status >= 400 || contentLength < 100 ? 'fail' : slow ? 'warn' : 'pass';
  const message =
    result.status >= 400
      ? `homepage returned HTTP ${result.status}`
      : contentLength < 100
        ? `homepage content length was ${contentLength}`
        : `homepage returned HTTP ${result.status}`;

  return {
    check: {
      id: 'H2',
      label: 'Load',
      name: 'Runtime load',
      status,
      message,
      durationMs: Date.now() - startedAt,
      measurement: 'start runtime + GET /',
      evidence: `${result.url} length=${contentLength}`,
      userFailure: status === 'fail' ? 'User cannot access a working product.' : null,
      fix: status === 'fail' ? 'Ensure dev command starts the app and renders a working homepage.' : null,
    },
    html: result.html,
    baseUrl: result.baseUrl,
    cleanup,
  };
}

export async function waitForServer({ ports = COMMON_PORTS, timeoutMs = 45_000, loadTimeoutMs = 15_000 }) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const port of ports) {
      const baseUrl = `http://127.0.0.1:${port}`;
      const response = await tryFetch(`${baseUrl}/`, loadTimeoutMs);
      if (response) return { ...response, baseUrl };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return null;
}

async function tryFetch(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const html = await response.text();
    return { url, status: response.status, html };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function startStaticServer(repoPath) {
  return new Promise((resolve) => {
    const server = http.createServer(async (request, response) => {
      const path = request.url === '/' ? 'index.html' : request.url.replace(/^\//, '');
      const fileUrl = new URL(`file://${join(repoPath, path)}`);
      try {
        const body = await import('node:fs/promises').then((fs) => fs.readFile(fileUrl));
        response.writeHead(200);
        response.end(body);
      } catch {
        response.writeHead(404);
        response.end('Not found');
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        port: address.port,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

function trimEvidence(value) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 500);
}
