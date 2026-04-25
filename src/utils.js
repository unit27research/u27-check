import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';

export async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile(path) {
  const text = await readFile(path, 'utf8');
  return JSON.parse(text);
}

export async function readTextFileIfExists(path) {
  if (!(await fileExists(path))) return '';
  return readFile(path, 'utf8');
}

export async function readPackageJson(repoPath) {
  const path = join(repoPath, 'package.json');
  if (!(await fileExists(path))) return null;
  return readJsonFile(path);
}

export function seconds(ms) {
  return Math.round((ms / 1000) * 10) / 10;
}

export function unique(values) {
  return [...new Set(values)];
}

export function isHttpUrl(value) {
  return /^https?:\/\//i.test(value);
}
