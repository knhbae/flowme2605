# URL-to-FLOW Prompt Lab v1 QA

## Required Commands

```powershell
node scripts/content-audit/build-url-to-flow-prompt-lab-cases.mjs
node scripts/content-audit/build-url-to-flow-prompt-lab-packets.mjs v0.1
node scripts/content-audit/build-url-to-flow-prompt-lab-packets.mjs v0.2
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

node scripts/content-audit/validate-url-to-flow-prompt-lab-reviews.mjs --round round-2
# Expected exit code: 1. Evidence integrity passes, but completion fails only at stability_gate.
node scripts/content-audit/verify-url-to-flow-prompt-lab.mjs --json
git diff --check -- docs/specs/2026-07-14-url-to-flow-prompt-lab docs/content-audit/2026-07-14-url-to-flow-prompt-lab scripts/content-audit/build-url-to-flow-prompt-lab-cases.mjs scripts/content-audit/build-url-to-flow-prompt-lab-packets.mjs scripts/content-audit/build-url-to-flow-blind-review-inputs.mjs scripts/content-audit/build-url-to-flow-prompt-lab-report.mjs scripts/content-audit/validate-url-to-flow-prompt-lab.mjs scripts/content-audit/validate-url-to-flow-prompt-lab-reviews.mjs scripts/content-audit/verify-url-to-flow-prompt-lab.mjs
```

`--all` is intentionally not the accepted-run command: Round 1 failures and discarded Round 3 orchestration envelopes are retained as historical evidence, so a recursive all-runs validation must fail.

## Repository-wide Diagnostic

`npm.cmd run docs:check`는 2026-07-15 현재 Prompt Lab과 무관한 기존 누락 링크 3개 때문에 실패한다. 이 실험 범위 밖 문서를 임의 수정하지 않았으며, Prompt Lab 내부 링크는 report builder와 completion verifier가 별도로 전건 확인한다.

- `docs/content-audit/2026-07-12-flowme-public-flow-visual-system-evidence/README.md` → 누락된 `2026-07-12-flowme-user-creator-value-chain-ceo-ko.html`
- `docs/DECISIONS.md` → 누락된 `../my_tests/260616_check_01.md`
- `docs/IDEAS.md` → 누락된 `2026-07-12-flowme-user-creator-value-chain-ceo-ko.html`

## Evidence Checklist

- [x] 10 positive and 2 negative case IDs are unique.
- [x] case packets contain no expected Item titles, expected status, readiness, or projections.
- [x] expectations never enter generator packets.
- [x] every raw run records prompt/case/schema/model evidence versions.
- [x] every accepted Round 2/3 proposal passes strict shape and SourceRow reference checks; Round 1 failures remain preserved.
- [x] Round 1 qualitative reviews are excluded; only its raw validator baseline is retained.
- [x] Round 2 direct blind reviews are valid for 12/12 cases and pass text-integrity checks.
- [x] every positive SourceRow is mapped or omitted.
- [x] failed cases emit zero Items and zero projections.
- [x] unsupported-content audit is zero: no hard-fail codes, false grounding flags, or schedule removals; all per-Item grounding audits are complete.
- [x] reviews hide model identity until content scoring is locked.
- [x] every score has a comment.
- [x] Item keep rate is recorded; human correction time/burden is explicitly `null` and unmeasured.
- [x] cost/latency evidence is null when not measured, never fabricated as zero.
- [x] comparison/report distinguishes controlled prompt evidence from real-provider evidence.
- [x] HTML has no horizontal overflow at 390px, 1024px, and 1440px; all 15 desktop stages have no internal overflow.
- [x] keyboard `ArrowDown`/`Home`, SVG controls, and mobile 44px control targets are verified.
- [x] browser console has zero errors at all three viewports.
- [x] report links resolve locally.
- [x] evidence integrity passes: 29/30 verifier checks pass.
- [ ] stability gate passes: actual 3/7 core-decision matches, below the required 6/7.
- [ ] Prompt Lab v1 completion and Backend Go are approved.

## Recorded Browser QA

- Playwright Chromium, local file report, 2026-07-15 KST
- 1440x900: document overflow 0; stage overflow 0/15; controls 42x42; console errors 0
- 1024x768: document overflow 0; stage overflow 0/15; console errors 0
- 390x844: document and stage horizontal overflow 0; controls 44x44; console errors 0
- visual comparison: accepted cover concept and rendered cover preserve the source-to-Item rail, editorial Korean type, true-white/cobalt/coral palette, open rules, and stacked mobile reading order
- intentional implementation additions: evidence-boundary note, slide progress, navigation dots, and accessible SVG controls

## Completion Note

Evidence integrity **PASS**; Prompt Lab v1 completion **FAIL**. All 3/3 allowed rounds were used, and the Round 3 stability result was 3/7 against the required 6/7. The current decision is **Backend No-Go**. A Prompt Lab v2 / fourth round requires explicit approval.

This proves the controlled contract and recorded run evidence only. It is not production URL security, provider quality, deployment, observed-user validation, or actual provider/model/cost comparison; those operational measurements remain unavailable.
