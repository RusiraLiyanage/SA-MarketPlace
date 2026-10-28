# ADR 0004 — Static module imports, not runtime discovery

## Context
The reference repo auto-discovers feature modules at boot by globbing compiled `.module.js`
files (`dynamicImport`).

## Decision

Import feature modules explicitly in `AppModule`.

## Consequences

- Type-checked, greppable, and obvious in a stack trace.
- Adding a module means one extra import line — deliberate, not a cost.
- Removes filesystem globbing that behaves differently under ts-node and from `dist`.
