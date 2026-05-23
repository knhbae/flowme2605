# Flow Lifecycle Classification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:test-driven-development` and `superpowers:verification-before-completion`.

**Goal:** Add an explicit lifecycle layer over the existing content inventory so every Flow is classified as keep, fix, preview-only, hidden, or removal candidate, then surface the counts in Content Lab.

**Architecture:** Keep existing `content-inventory.ts`, `source-fit.ts`, and `natural-artifact-audit.ts` as source-of-truth inputs. Add a pure `content-lifecycle.ts` mapper that derives product handling. Do not change public route deletion behavior in this pass.

## Tasks

- [x] Add failing lifecycle tests.
- [x] Implement `lib/flow/content-lifecycle.ts`.
- [x] Wire lifecycle summary into `getContentLabSummary`.
- [x] Render lifecycle summary in `components/flow/ContentLab.tsx`.
- [x] Add content audit document with current bucket counts and policy.
- [x] Add PR history entry.
- [x] Run docs, unit, build, and targeted e2e checks.

## Expected Policy

- `keep`: manual source-fit `keep_representative`.
- `fix`: manual source-fit `reshape_before_featured` / `catalog_preview_only` and all derived real-source Flow until manual promotion.
- `preview_only`: generated preview candidates.
- `hide`: explicit hidden or natural artifact `replace_or_hide_source`.
- `remove_candidate`: legacy accessible Flow with no source URL. Source-backed legacy items stay in `fix`.

## Verification

Run:

```powershell
npm run docs:check
npm test
npm run build
npm run test:e2e -- --grep "flow lab"
```
