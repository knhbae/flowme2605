# New-Car Evidence Guardrail Copy

Date: 2026-05-25
Branch: `content/new-car-evidence-guardrail-copy`
PR: #79
Status: Merged

## Why

The representative UX/content review found that `new-car-delivery-check` had the right evidence artifact, but generic checklist completion could still compete with the delivery-day job. The first success signal needs to be a portable evidence table.

## Changed

- Reframed the comparison artifact as `인수 전 하자·증빙표`.
- Renamed rows around photo filenames, dealer confirmation, document status, and signing hold conditions.
- Rewrote the evidence memo title and description so FLOW records evidence without deciding whether to accept delivery.
- Rewrote route description and warning around photo filenames, dealer confirmation, and signing before handover.

## Not Done

- Did not claim validation.
- Did not add legal or financial advice.
- Did not add dealer, insurance, or external app integration.

## Verification

- RED: `npm test -- lib/flow/artifact-fields.test.ts lib/flow/seed-flows.test.ts` failed on the old comparison title and generic description.
- GREEN: `npm test -- lib/flow/artifact-fields.test.ts lib/flow/seed-flows.test.ts`
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "public MVP guardrail screens"`
- PASS: desktop screenshot `docs/screenshots/2026-05-25-new-car-evidence-guardrail-desktop.png`
- PASS: mobile screenshot `docs/screenshots/2026-05-25-new-car-evidence-guardrail-mobile.png`
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "risk-boundary QA exports|public MVP guardrail screens|flow lab shows converted pilot"`
- PASS: `npm test`
- PASS: `npm run build`
- PASS: `npm run docs:check`
- PASS: Vercel `https://vercel.com/flowme/flowme2605/8bLp2pDKSnnDHThScEmSS769REVB`
- Merged: PR #79 as squash commit `f044cc94a24d3eed1db16741e32e3e0ba2f9fac3`.
