import { resolve } from 'node:path';
import { checkEntry } from './entry.js';
import { looksLikeMissingEnv } from './env.js';
import { detectPackageManager, findRuntimeScript, getScriptCommand } from './package-manager.js';
import { runCommand } from './processes.js';
import { checkRuntimeLoad } from './runtime.js';
import { collectObservations } from './observations.js';
import { identifyPrimaryCta, validateCtaTarget } from './cta.js';
import { readPackageJson } from './utils.js';

export const DEFAULT_CONFIG = {
  timeoutInstall: 120,
  timeoutBuild: 180,
  timeoutRuntime: 45,
  timeoutLoad: 15,
  timeoutCTAResolve: 5,
};

export async function runReport(repoPath, options = {}) {
  const absoluteRepoPath = resolve(repoPath);
  const config = { ...DEFAULT_CONFIG, ...(options.config ?? {}) };
  const pkg = await readPackageJson(absoluteRepoPath);
  const manager = await detectPackageManager(absoluteRepoPath);
  const checks = [];

  checks.push(await checkBuild(absoluteRepoPath, pkg, manager, config));

  const runtime = await checkRuntimeLoad(absoluteRepoPath, pkg, manager, config);
  checks.push(runtime.check);

  checks.push(await checkEntry(absoluteRepoPath));

  let ctaIdentification = null;

  try {
    if (runtime.html && runtime.check.status !== 'fail') {
      ctaIdentification = identifyPrimaryCta(runtime.html);
      const primaryActionCheck = checkPrimaryAction(ctaIdentification);
      checks.push(primaryActionCheck);

      const targetResult = await validateCtaTarget(ctaIdentification, {
        baseUrl: runtime.baseUrl,
        fetchImpl: options.fetchImpl,
      });
      checks.push(checkCtaTarget(targetResult, ctaIdentification));
    } else {
      checks.push(skippedCtaCheck('H4', 'Primary Action', 'Primary CTA resolves'));
      checks.push(skippedCtaCheck('H5', 'CTA Target', 'CTA target is valid'));
    }
  } finally {
    await runtime.cleanup?.();
  }

  const observations = await collectObservations(absoluteRepoPath, runtime.html, ctaIdentification);
  const likelyFailures = checks.filter((check) => check.status === 'fail' && check.userFailure).map((check) => check.userFailure);
  const minimumFixes = checks.filter((check) => check.status === 'fail' && check.fix).map((check) => check.fix);
  const summary = summarize(checks);

  return {
    timestamp: new Date().toISOString(),
    repoPath: absoluteRepoPath,
    checks,
    observations,
    likelyFailures: [...new Set(likelyFailures)],
    minimumFixes: [...new Set(minimumFixes)],
    ctaIdentification,
    summary,
  };
}

export async function checkBuild(repoPath, pkg, manager, config = DEFAULT_CONFIG) {
  if (!pkg) {
    return {
      id: 'H1',
      label: 'Build',
      name: 'Build execution',
      status: 'warn',
      message: 'no package.json found; build skipped',
      measurement: 'package.json build script',
      evidence: 'No package.json found.',
      userFailure: null,
      fix: null,
    };
  }

  if (!pkg.scripts?.build) {
    return {
      id: 'H1',
      label: 'Build',
      name: 'Build execution',
      status: 'warn',
      message: 'no build script found; build skipped',
      measurement: 'package.json build script',
      evidence: 'package.json has no scripts.build.',
      userFailure: null,
      fix: null,
    };
  }

  const command = getScriptCommand(manager, pkg, 'build');
  const result = await runCommand(command[0], command.slice(1), {
    cwd: repoPath,
    timeoutMs: config.timeoutBuild * 1000,
  });
  const commandText = command.join(' ');
  const output = `${result.stderr}\n${result.stdout}`;

  if (result.timedOut) {
    return {
      id: 'H1',
      label: 'Build',
      name: 'Build execution',
      status: 'fail',
      message: `${commandText} timed out`,
      durationMs: result.durationMs,
      measurement: 'build command exit code and stderr',
      evidence: trimEvidence(output),
      userFailure: 'User cannot deploy a stable version.',
      fix: 'Fix the first build error, then rerun u27-check.',
    };
  }

  if (result.exitCode !== 0) {
    const missingEnv = looksLikeMissingEnv(output);
    return {
      id: 'H1',
      label: 'Build',
      name: 'Build execution',
      status: missingEnv ? 'warn' : 'fail',
      message: missingEnv
        ? `${commandText} needs environment variables`
        : `${commandText} exited with code ${result.exitCode}`,
      durationMs: result.durationMs,
      measurement: 'build command exit code and stderr',
      evidence: trimEvidence(output),
      userFailure: missingEnv ? null : 'User cannot deploy a stable version.',
      fix: missingEnv ? 'Document required environment variables in README or .env.example.' : 'Fix the first build error, then rerun u27-check.',
    };
  }

  return {
    id: 'H1',
    label: 'Build',
    name: 'Build execution',
    status: 'pass',
    message: `${commandText} completed`,
    durationMs: result.durationMs,
    measurement: 'build command exit code and stderr',
    evidence: `exit_code=0`,
    userFailure: null,
    fix: null,
  };
}

function checkPrimaryAction(ctaIdentification) {
  if (!ctaIdentification || ctaIdentification.method === 'none') {
    return {
      id: 'H4',
      label: 'Primary Action',
      name: 'Primary CTA resolves',
      status: 'fail',
      message: 'no actionable CTA found',
      measurement: 'homepage HTML CTA parser',
      evidence: 'No a[href], button, role=button, input button, or onclick element found.',
      userFailure: 'User clicks main action and hits a dead end.',
      fix: 'Add a clear primary CTA with a working href or handler.',
    };
  }

  const target = ctaIdentification.primary_cta_href ?? 'onclick handler';
  return {
    id: 'H4',
    label: 'Primary Action',
    name: 'Primary CTA resolves',
    status: 'pass',
    message: `"${ctaIdentification.primary_cta_text}" points to ${target}`,
    measurement: 'homepage HTML CTA parser',
    evidence: JSON.stringify(ctaIdentification),
    userFailure: null,
    fix: null,
  };
}

function checkCtaTarget(targetResult, ctaIdentification) {
  const fail = targetResult.status === 'fail';
  return {
    id: 'H5',
    label: 'CTA Target',
    name: 'CTA target is valid',
    status: targetResult.status,
    message: targetResult.message,
    measurement: 'GET CTA href target or inspect onclick handler',
    evidence: targetResult.evidence,
    userFailure: fail ? 'User cannot complete the primary action.' : null,
    fix: fail ? 'Create the missing route or fix the broken link.' : null,
    ctaText: ctaIdentification?.primary_cta_text ?? null,
  };
}

function skippedCtaCheck(id, label, name) {
  return {
    id,
    label,
    name,
    status: 'fail',
    message: 'skipped because homepage could not load',
    measurement: 'runtime homepage required',
    evidence: 'No homepage HTML available.',
    userFailure: id === 'H4' ? 'User clicks main action and hits a dead end.' : 'User cannot complete the primary action.',
    fix: 'Fix runtime load first, then rerun CTA checks.',
  };
}

function summarize(checks) {
  return {
    total_checks: checks.length,
    passed: checks.filter((check) => check.status === 'pass').length,
    failed: checks.filter((check) => check.status === 'fail').length,
    warnings: checks.filter((check) => check.status === 'warn').length,
  };
}

function trimEvidence(value = '') {
  return value.replace(/\s+/g, ' ').trim().slice(0, 800);
}
