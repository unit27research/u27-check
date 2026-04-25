import { join } from 'node:path';
import { readPackageJson, readTextFileIfExists } from './utils.js';

const SETUP_PATTERNS = [
  /npm\s+install/i,
  /npm\s+run\s+dev/i,
  /pnpm\s+install/i,
  /pnpm\s+(run\s+)?dev/i,
  /yarn\s+(install|dev)/i,
  /bun\s+(install|run\s+dev|dev)/i,
  /docker\s+compose\s+up/i,
  /open\s+.*index\.html/i,
  /python\s+-m\s+http\.server/i,
];

export async function checkEntry(repoPath) {
  const pkg = await readPackageJson(repoPath);
  const readme = await readTextFileIfExists(join(repoPath, 'README.md'));
  const scripts = pkg?.scripts ?? {};
  const runnableScript = ['dev', 'start', 'run'].find((script) => scripts[script]);
  const hasSetupInstructions = SETUP_PATTERNS.some((pattern) => pattern.test(readme));

  if (!runnableScript && !hasSetupInstructions) {
    return {
      id: 'H3',
      label: 'Entry',
      name: 'Runnable entry exists',
      status: 'fail',
      message: 'no dev/start/run script or README setup instructions found',
      measurement: 'package.json scripts + README setup patterns',
      evidence: 'No runnable entry point detected.',
      userFailure: 'User opens repo but does not know how to start the product.',
      fix: 'Add a dev/start script or clear Getting Started instructions to README.',
    };
  }

  if (runnableScript && !mentionsScript(readme, runnableScript)) {
    return {
      id: 'H3',
      label: 'Entry',
      name: 'Runnable entry exists',
      status: 'warn',
      message: `package.json has ${runnableScript} script, but README does not mention it`,
      measurement: 'package.json scripts + README setup patterns',
      evidence: scripts[runnableScript],
      userFailure: null,
      fix: 'Mention the run command in README Getting Started instructions.',
    };
  }

  return {
    id: 'H3',
    label: 'Entry',
    name: 'Runnable entry exists',
    status: 'pass',
    message: runnableScript ? `${scriptExample(runnableScript)} exists` : 'README setup instructions found',
    measurement: 'package.json scripts + README setup patterns',
    evidence: runnableScript ? scripts[runnableScript] : 'README contains setup instructions.',
    userFailure: null,
    fix: null,
  };
}

function mentionsScript(readme, scriptName) {
  if (!readme) return false;
  if (scriptName === 'dev') return /(?:npm|pnpm|bun)\s+run\s+dev|yarn\s+dev|bun\s+dev/i.test(readme);
  if (scriptName === 'start') return /(?:npm|pnpm|bun)\s+(run\s+)?start|yarn\s+start/i.test(readme);
  return new RegExp(scriptName, 'i').test(readme);
}

function scriptExample(scriptName) {
  if (scriptName === 'dev') return 'npm run dev';
  if (scriptName === 'start') return 'npm start';
  return `npm run ${scriptName}`;
}
