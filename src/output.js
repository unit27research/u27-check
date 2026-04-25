import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import pc from 'picocolors';
import { seconds } from './utils.js';

export function formatTerminal(report, { color = true } = {}) {
  const paint = color
    ? {
        pass: pc.green,
        warn: pc.yellow,
        fail: pc.red,
      }
    : {
        pass: (value) => value,
        warn: (value) => value,
        fail: (value) => value,
      };

  const lines = ['U27 CHECK', ''];

  for (const check of report.checks) {
    const status = check.status.toUpperCase();
    const duration = typeof check.durationMs === 'number' ? ` (${seconds(check.durationMs)}s)` : '';
    lines.push(`${check.label}: ${paint[check.status]?.(status) ?? status}${duration} -> ${check.message}`);
  }

  lines.push('', '--------------------------------', 'LIKELY USER FAILURES');
  lines.push(...numbered(report.likelyFailures, 'None detected.'));
  lines.push('', '--------------------------------', 'MINIMUM FIX SET');
  lines.push(...numbered(report.minimumFixes, 'No critical fixes required.'));
  lines.push('', '--------------------------------', 'OBSERVATIONS');
  lines.push(...bullets(report.observations, 'None.'));

  return `${lines.join('\n')}\n`;
}

export async function writeOutputs(report) {
  const outputDir = join(report.repoPath, 'u27');
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, 'LAUNCH_PACKET.md'), formatLaunchPacket(report));
  await writeFile(join(outputDir, 'AUDIT_LOG.json'), `${JSON.stringify(formatAuditLog(report), null, 2)}\n`);
}

export function formatLaunchPacket(report) {
  const ready = report.summary.failed === 0 ? 'ready' : 'not ready';
  const failures = report.checks.filter((check) => check.status === 'fail');

  return `# U27 CHECK // LAUNCH PACKET

## Summary

Product is ${ready} for public exposure.

## Critical Failures

${bullets(failures.map((check) => `${check.label}: ${check.message}`), 'None.').join('\n')}

## Likely User Failures

${bullets(report.likelyFailures, 'None detected.').join('\n')}

## Minimum Fix Set

${bullets(report.minimumFixes, 'No critical fixes required.').join('\n')}

## Evidence Log

${report.checks.map((check) => `- ${check.id} ${check.name}: ${check.status.toUpperCase()} - ${check.evidence}`).join('\n')}

## Observations

${bullets(report.observations, 'None.').join('\n')}
`;
}

export function formatAuditLog(report) {
  return {
    timestamp: report.timestamp,
    repo_path: report.repoPath,
    checks: report.checks.map((check) => ({
      id: check.id,
      name: check.name,
      status: check.status,
      measurement: check.measurement,
      evidence: check.evidence,
      message: check.message,
      duration_ms: check.durationMs,
    })),
    cta_identification: report.ctaIdentification,
    observations: report.observations,
    summary: report.summary,
  };
}

function numbered(items, emptyText) {
  if (!items.length) return [emptyText];
  return items.map((item, index) => `${index + 1}. ${item}`);
}

function bullets(items, emptyText) {
  if (!items.length) return [`- ${emptyText}`];
  return items.map((item) => `- ${item}`);
}
