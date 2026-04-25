import { resolve } from 'node:path';
import { fileExists, isHttpUrl } from './utils.js';
import { runReport } from './report.js';
import { formatTerminal, writeOutputs } from './output.js';

export async function runCli(argv = process.argv.slice(2), io = process) {
  const args = parseArgs(argv);

  if (args.help) {
    io.stdout.write(helpText());
    return 0;
  }

  if (isHttpUrl(args.repoPath)) {
    io.stderr.write('u27-check only supports local repository paths in v0.1.\n');
    return 1;
  }

  const repoPath = resolve(args.repoPath);
  if (!(await fileExists(repoPath))) {
    io.stderr.write(`Path does not exist: ${repoPath}\n`);
    return 1;
  }

  const report = await runReport(repoPath);
  await writeOutputs(report);
  io.stdout.write(formatTerminal(report, { color: io.stdout.isTTY }));
  return report.summary.failed > 0 ? 1 : 0;
}

export { runReport };

function parseArgs(argv) {
  const args = [...argv];
  if (args.includes('--help') || args.includes('-h')) return { help: true, repoPath: process.cwd() };
  const repoPath = args.find((arg) => !arg.startsWith('-')) ?? process.cwd();
  return { help: false, repoPath };
}

function helpText() {
  return `u27-check

Usage:
  u27-check [path]

Runs a local pre-flight launch check and writes:
  u27/LAUNCH_PACKET.md
  u27/AUDIT_LOG.json

v0.1 supports local repositories only.
`;
}
