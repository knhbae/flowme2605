# URL-to-FLOW Prompt Lab v1 QA

## Required Commands

```powershell
node scripts/content-audit/build-url-to-flow-prompt-lab-cases.mjs
node scripts/content-audit/build-url-to-flow-prompt-lab-packets.mjs v0.1
node scripts/content-audit/build-url-to-flow-prompt-lab-packets.mjs v0.2
node scripts/content-audit/build-url-to-flow-blind-review-inputs.mjs round-1
node scripts/content-audit/build-url-to-flow-blind-review-inputs.mjs round-2
node scripts/content-audit/build-url-to-flow-prompt-lab-report.mjs
node scripts/content-audit/validate-canonical-flow-model.mjs

$acceptedRuns = @(
  'docs/content-audit/2026-07-14-url-to-flow-prompt-lab/runs/round-2/batch-a.json',
  'docs/content-audit/2026-07-14-url-to-flow-prompt-lab/runs/round-2/batch-b.json',
  'docs/content-audit/2026-07-14-url-to-flow-prompt-lab/runs/round-2/batch-c.json',
  'docs/content-audit/2026-07-14-url-to-flow-prompt-lab/runs/round-3/batch-f.json',
  'docs/content-audit/2026-07-14-url-to-flow-prompt-lab/runs/round-3/batch-g.json'
)
$acceptedRuns | ForEach-Object {
  node scripts/content-audit/validate-url-to-flow-prompt-lab.mjs --file $_
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

node scripts/content-audit/validate-url-to-flow-prompt-lab-reviews.mjs --round round-1
node scripts/content-audit/validate-url-to-flow-prompt-lab-reviews.mjs --round round-2
node scripts/content-audit/verify-url-to-flow-prompt-lab.mjs
npm.cmd run docs:check
git diff --check -- docs/specs/2026-07-14-url-to-flow-prompt-lab docs/content-audit/2026-07-14-url-to-flow-prompt-lab scripts/content-audit/build-url-to-flow-prompt-lab-cases.mjs scripts/content-audit/build-url-to-flow-prompt-lab-packets.mjs scripts/content-audit/build-url-to-flow-blind-review-inputs.mjs scripts/content-audit/build-url-to-flow-prompt-lab-report.mjs scripts/content-audit/validate-url-to-flow-prompt-lab.mjs scripts/content-audit/validate-url-to-flow-prompt-lab-reviews.mjs scripts/content-audit/verify-url-to-flow-prompt-lab.mjs
```

`--all` is intentionally not the accepted-run command: Round 1 failures and discarded Round 3 orchestration envelopes are retained as historical evidence, so a recursive all-runs validation must fail.

## Evidence Checklist

- [x] 10 positive and 2 negative case IDs are unique.
- [x] case packets contain no expected Item titles, expected status, readiness, or projections.
- [x] expectations never enter generator packets.
- [x] every raw run records prompt/case/schema/model evidence versions.
- [x] every accepted Round 2/3 proposal passes strict shape and SourceRow reference checks; Round 1 failures remain preserved.
- [x] every positive SourceRow is mapped or omitted.
- [x] failed cases emit zero Items and zero projections.
- [x] no accepted Item or schedule has an explicit unsupported-content hard fail.
- [x] reviews hide model identity until content scoring is locked.
- [x] every score has a comment.
- [x] Item keep rate is recorded; human correction time/burden is explicitly `null` and unmeasured.
- [x] cost/latency evidence is null when not measured, never fabricated as zero.
- [x] comparison/report distinguishes controlled prompt evidence from real-provider evidence.
- [x] HTML has no horizontal overflow at 390px, 1024px, and 1440px; all 15 desktop stages have no internal overflow.
- [x] keyboard `ArrowDown`/`Home`, SVG controls, and mobile 44px control targets are verified.
- [x] browser console has zero errors at all three viewports.
- [x] report links resolve locally.

## Recorded Browser QA

- Playwright Chromium, local HTTP server, 2026-07-14 KST
- 1440x900: document overflow 0; stage overflow 0/15; controls 44x44; console errors 0
- 1024x768: document overflow 0; stage overflow 0/15; console errors 0
- 390x844: document and stage horizontal overflow 0; controls 44x44; console errors 0
- visual comparison: accepted cover concept and rendered cover preserve the source-to-Item rail, editorial Korean type, true-white/cobalt/coral palette, open rules, and stacked mobile reading order
- intentional implementation additions: evidence-boundary note, slide progress, navigation dots, and accessible SVG controls

## Completion Note

Passing automation proves the controlled contract and recorded run evidence only. It is not production URL security, provider quality, deployment, or observed-user validation.
