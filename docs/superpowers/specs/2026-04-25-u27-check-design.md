# u27-check Design

## Goal

Build `u27-check` as Unit27's first open-source CLI: a deterministic local pre-flight check that verifies whether a user can run, load, and click the primary action in a Node/web project.

## Scope

Version 0.1 implements the handoff's v2.1 scope: H1-H5 only, local repositories only, no pricing or sales language, no score, no dashboard, and no live URL support.

## Architecture

The CLI is a small Node package with focused modules for package-manager detection, command execution, runtime startup, HTML/CTA parsing, observations, and report generation. The runtime check starts the target project's dev/start command, probes common localhost ports, fetches `/`, parses the returned HTML with Cheerio, and writes deterministic evidence to `u27/AUDIT_LOG.json` plus a human-readable `u27/LAUNCH_PACKET.md`.

## Key Decisions

- Package, repository, and binary name: `u27-check`.
- License: MIT.
- Initial ecosystem: Node/web-first. Other project types are not first-class in v0.1.
- Primary CTA "above fold" is approximated by DOM/source-order heuristics; browser pixel rendering is deferred.
- Build failures caused by likely missing env vars are reported as warnings/observations, not hard launch-path failures.
- H4 and H5 share one CTA resolution engine but produce separate report rows.

## Components

- `src/package-manager.js`: lockfile and script command detection.
- `src/processes.js`: timeout-safe child process helpers.
- `src/runtime.js`: dev server startup, port probing, homepage fetch, and cleanup.
- `src/entry.js`: package and README runnable-entry checks.
- `src/cta.js`: deterministic CTA extraction, primary CTA selection, and target validation.
- `src/observations.js`: non-blocking measured friction.
- `src/report.js`: check orchestration and audit model.
- `src/output.js`: terminal, Markdown, and JSON output.
- `bin/u27-check.js`: executable entrypoint.

## Testing

Use Node's built-in test runner. Tests cover package-manager detection, entry checks, CTA selection/validation, output generation, and end-to-end report behavior with local fixture projects.
