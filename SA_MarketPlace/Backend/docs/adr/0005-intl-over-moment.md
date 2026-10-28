# ADR 0005 — Intl.DateTimeFormat instead of moment

## Context
The reference repo's helpers carried three overlapping timezone formatters built on
`moment` and `moment-timezone`. Moment is in maintenance mode.

## Decision

One `formatDate(value, options)` helper built on the platform's `Intl.DateTimeFormat`,
defaulting to `Australia/Sydney`.

## Consequences

- Drops two dependencies; `Intl` is built into Node and fully timezone-aware.
- Callers pick a style (`date` / `dateTime` / `time`) rather than passing a format string.
- Invalid input and unknown timezones return an empty string rather than throwing.
