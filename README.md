# u27-check

Pre-flight failure detector for product launches.

`u27-check` answers one narrow question:

```text
Will a real user hit a failure before they even get started?
```

It checks the path:

```text
Install -> Run -> Load -> Click
```

## Getting Started

```bash
npx u27-check
```

Run it from the root of a local project repository.

```bash
npx u27-check /path/to/repo
```

## What It Checks

- Build execution
- Runtime homepage load
- Runnable entry instructions
- Primary call-to-action detection
- Primary call-to-action target validity

## What It Does Not Check

- Product quality
- Startup readiness
- Deep application correctness
- Account creation, checkout, or backend workflows
- Live URLs

## Output

The CLI prints a concise terminal report and writes:

- `u27/LAUNCH_PACKET.md`
- `u27/AUDIT_LOG.json`

## Development

```bash
npm install
npm test
npm run build
```

## License

MIT
