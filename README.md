# U27-CLI01 // u27-check

[![CI](https://github.com/unit27research/u27-check/actions/workflows/ci.yml/badge.svg)](https://github.com/unit27research/u27-check/actions/workflows/ci.yml)

`u27-check` is a pre-flight failure detector for product launches.

It answers one narrow question:

> Will a real user hit a failure before they even get started?

## Why Use It

Use `u27-check` before sharing a product demo, launch link, or portfolio project when the first user path needs a fast deterministic failure check.

It is useful when the page might build but still fail at the first real interaction: no runnable entry, broken homepage load, missing primary call-to-action, or a primary action that points nowhere useful.

Example:

```text
Problem: The project "works locally" but the first CTA is broken.
Result: `u27-check` writes a launch packet and audit log before a real user hits the failure.
```

Read [DESIGN_NOTES.md](DESIGN_NOTES.md) for the system philosophy, scope boundaries, failure modes, and evaluation rationale.

## What It Does

`u27-check` runs a local repository through the first user path:

1. Build execution
2. Runtime homepage load
3. Runnable entry detection
4. Primary call-to-action identification
5. Primary call-to-action target validation

It is designed to feel like a deterministic pre-flight check, not a product review.

## Install

```bash
npx u27-check
```

Run it from the root of a local project repository:

```bash
npx u27-check
```

Or point it at a local repo:

```bash
npx u27-check /path/to/repo
```

## Output

The CLI prints a concise terminal report and writes:

1. `u27/LAUNCH_PACKET.md`
2. `u27/AUDIT_LOG.json`

## What It Does Not Do

`u27-check` does not evaluate:

1. Product quality
2. Startup readiness
3. Deep application correctness
4. Account creation
5. Checkout
6. Backend workflows
7. Live URLs

## Development

```bash
npm install
npm test
npm run build
```

## Reliability

`u27-check` is maintained as part of the Unit27 research toolchain. CI verifies the build path and Node.js test suite before changes are considered ready.

## Contributing

Issues and pull requests are welcome. Keep proposed changes focused on deterministic pre-flight failures in the run, load, and primary-action path.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
