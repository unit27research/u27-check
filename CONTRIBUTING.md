# Contributing

Thanks for helping improve `u27-check`.

This project is intentionally narrow. It should answer one practical question:

```text
Will a real user hit a failure before they even get started?
```

## Local Setup

```bash
npm install
npm test
npm run build
```

## Scope Rules

Version 0.1 focuses on:

- Local repositories only
- Node/web projects first
- Build, run, load, and primary CTA checks
- Deterministic evidence, not subjective scoring

Please avoid adding:

- Scores or product grades
- Investor-readiness language
- Dashboards
- Live URL checking
- Deep product correctness testing
- AI judgment or broad qualitative advice

## Pull Requests

Before opening a pull request:

```bash
npm run build
```

Include:

- What changed
- Why it matters for the pre-flight user path
- A sample output or test case when behavior changes

## Reports and Edge Cases

Good issues include:

- The project type being checked
- The command you ran
- The terminal output
- The generated `u27/AUDIT_LOG.json` if it is safe to share
- Whether the result was a false positive or false negative
