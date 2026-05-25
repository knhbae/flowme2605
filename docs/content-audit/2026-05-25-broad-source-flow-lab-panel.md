# Broad Source Flow Lab Panel

Date: 2026-05-25
Related audit: [Broad Source Code Guard](./2026-05-25-broad-source-code-guard.md)

## Decision

Flow Lab now renders a small internal "Broad Source Guard" panel below lifecycle classification. It makes the broad-source code guard visible to editors without changing public route exposure.

Current panel values:

- Broad real sources: 4
- Representative leaks: 0
- Replacement queue: the four remaining broad real-source route slugs

## Why

The code guard made the broad-source risk queryable, but editors still had to inspect summary data or tests. The panel keeps the next source replacement queue visible in the same internal surface that already shows lifecycle, source-fit, natural artifact, and validation-readiness status.

## UX Notes

- The panel is internal Flow Lab UI only.
- It uses two compact metrics and one route list, avoiding another large audit table.
- It appears after lifecycle classification because the key question is whether broad sources leak into lifecycle `keep`.
- It does not create new public calls to action and does not label routes validated.

## Screenshot

![Broad Source Flow Lab panel](../screenshots/2026-05-25-broad-source-flow-lab-panel-desktop.png)

Updated screenshot after ThankyouBUBU source replacement:

![Broad Source Flow Lab panel after source replacement](../screenshots/2026-05-25-thankyou-bubu-source-replacement-flow-lab.png)

Updated screenshot after FITVELY diet source replacement:

![Broad Source Flow Lab panel after FITVELY diet source replacement](../screenshots/2026-05-25-fitvely-diet-source-replacement-flow-lab.png)

## Verification

- RED: targeted Flow Lab E2E failed because the `Broad Source Guard` panel did not exist.
- GREEN: targeted Flow Lab E2E passed after adding the panel.
- Screenshot captured: `docs/screenshots/2026-05-25-broad-source-flow-lab-panel-desktop.png`.

Update:

- 2026-05-25: After replacing the two ThankyouBUBU broad channel sources, the same panel should show 5 broad real sources and 0 representative leaks.
- 2026-05-25: After replacing the FITVELY diet-record broad site source, the same panel should show 4 broad real sources and 0 representative leaks.
