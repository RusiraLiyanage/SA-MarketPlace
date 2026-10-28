# ADR 0043 — The PDF browser recovers itself

## Context
Invoice PDFs are rendered by one shared headless Chromium per process (ADR 0036). In a
long-running dev server that Chromium can crash or hang, and the service only checked
whether a browser object existed. Every invoice without a stored PDF then failed with a
500 until the app was restarted.

## Decision

`PdfService` checks the browser is connected before each render and launches a new one if
not. If a render fails it kills the old Chromium, launches a clean one and retries once.
Each render step times out after 30 seconds, simultaneous renders share one launch, and a
failed launch at boot does not stop the app starting (the first render launches it).

## Consequences

- A crashed Chromium costs one slower request, not a run of 500s.
- A render that is genuinely broken (bad HTML) fails twice, about a second apart.
- A failed render still burns an invoice number if it fails after the number is taken; the
  retry happens inside the same transaction, so it takes no second one (ADR 0022).
- Covered by `pdf.service.spec.ts`, which kills the real browser mid-session.
