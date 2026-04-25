import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function makeTempProject() {
  return mkdtemp(join(tmpdir(), 'u27-project-'));
}
