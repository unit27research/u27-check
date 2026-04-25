# U27-CLI01 // Design Notes

## System Philosophy

`u27-check` is intentionally narrow. It does not tell founders whether a product is good, fundable, polished, or ready as a business.

It checks whether a real user can get through the first practical path:

```text
Install -> Run -> Load -> Click
```

The tool should produce evidence, not vibes.

## Scope Boundaries

Version 0.1 supports local repository checks only.

It focuses on Node/web projects first and avoids:

1. Scores
2. Startup grading
3. Investor-readiness language
4. Dashboards
5. Live URL checking
6. Deep workflow automation
7. AI judgment

## Failure Modes

The hard failure path is limited to reproducible blockers:

1. The project does not build.
2. The product does not load.
3. There is no runnable entry.
4. The primary action cannot be identified.
5. The primary action points to a dead target.

Everything else should be reported as an observation unless it blocks the first user path.

## Evaluation Rationale

`u27-check` is built around mechanical checks because the goal is to make launch failures visible before users find them.

The output should help a maintainer answer:

1. What broke?
2. Why does it matter to a user?
3. What is the minimum mechanical fix?

The tool should stay boring, deterministic, and easy to rerun.
