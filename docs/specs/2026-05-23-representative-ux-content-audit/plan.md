# Representative UX Content Audit Plan

## Files

| File | Responsibility |
| --- | --- |
| `lib/flow/ux-content-simplification-audit.ts` | Store route-level UX/content simplification records. |
| `lib/flow/content-lab.ts` | Surface the audit in Content Lab summary data. |
| `lib/flow/content-lab.test.ts` | Lock the audit count, decisions, route list, and key findings. |
| `docs/content-audit/2026-05-23-representative-ux-content-simplification.md` | Human-readable UX review findings. |
| `docs/specs/2026-05-23-representative-ux-content-audit/*` | Durable spec, plan, tasks, and QA evidence. |
| `docs/pr-history/2026-05-23-representative-ux-content-audit.md` | PR-level history and verification. |
| `docs/STATUS.md` | Current product state and next focus. |

## Sequence

1. Add RED tests for the audit summary and route-level findings.
2. Add the audit data model and records.
3. Connect the audit to Content Lab summary data.
4. Write audit/spec/QA/PR-history docs.
5. Capture screenshots for the audited sample.
6. Run focused and broad verification.
7. Open PR, update PR history, and merge if checks pass.

## Risk Controls

- Keep this as an audit and simplification-priority pass, not a new feature build.
- Do not promote sensitive public MVP routes to representative exposure.
- Preserve export-first positioning: external tools first, native records later.
- Use tests to make the product direction durable across later chats.
