# URL-to-FLOW Prompt Lab v1 QA

## Required Commands

```powershell
node scripts/content-audit/build-url-to-flow-prompt-lab-cases.mjs
node scripts/content-audit/validate-url-to-flow-prompt-lab.mjs --all
npm.cmd run docs:check
git diff --check -- docs/specs/2026-07-14-url-to-flow-prompt-lab docs/content-audit/2026-07-14-url-to-flow-prompt-lab scripts/content-audit
```

## Evidence Checklist

- [ ] 10 positive and 2 negative case IDs are unique.
- [ ] case packets contain no expected Item titles, expected status, readiness, or projections.
- [ ] expectations never enter generator packets.
- [ ] every raw run records prompt/case/schema/model evidence versions.
- [ ] every proposal passes strict shape and SourceRow reference checks.
- [ ] every positive SourceRow is mapped or omitted.
- [ ] failed cases emit zero Items and zero projections.
- [ ] no Item or schedule uses unsupported source text.
- [ ] reviews hide model identity until content scoring is locked.
- [ ] every score has a comment.
- [ ] correction burden and Item keep rate are recorded.
- [ ] cost/latency evidence is null when not measured, never fabricated as zero.
- [ ] comparison/report distinguishes controlled prompt evidence from real-provider evidence.
- [ ] HTML has no horizontal overflow at 390px, 1024px, and desktop.
- [ ] report links resolve locally.

## Completion Note

Passing automation proves the controlled contract and recorded run evidence only. It is not production URL security, provider quality, deployment, or observed-user validation.
