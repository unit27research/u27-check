import { join } from 'node:path';
import { fileExists } from './utils.js';

const MANAGERS = [
  { name: 'pnpm', lockfiles: ['pnpm-lock.yaml'], runCommand: 'pnpm' },
  { name: 'yarn', lockfiles: ['yarn.lock'], runCommand: 'yarn' },
  { name: 'bun', lockfiles: ['bun.lockb', 'bun.lock'], runCommand: 'bun' },
  { name: 'npm', lockfiles: ['package-lock.json', 'npm-shrinkwrap.json'], runCommand: 'npm' },
];

export async function detectPackageManager(repoPath) {
  for (const manager of MANAGERS) {
    for (const lockfile of manager.lockfiles) {
      if (await fileExists(join(repoPath, lockfile))) {
        return manager;
      }
    }
  }

  return MANAGERS.find((manager) => manager.name === 'npm');
}

export function getScriptCommand(manager, pkg, scriptName) {
  if (!pkg?.scripts?.[scriptName]) return null;

  if (manager.name === 'yarn') {
    return [manager.runCommand, scriptName];
  }

  return [manager.runCommand, 'run', scriptName];
}

export function findRuntimeScript(pkg) {
  const scripts = pkg?.scripts ?? {};
  for (const name of ['dev', 'start', 'run']) {
    if (scripts[name]) return name;
  }
  return null;
}
