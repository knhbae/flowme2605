---
name: flow-knowledge-maintenance
description: Audit or clean FlowMe backlog, status, decisions, ideas, specs, and evidence when explicitly requested. Read-only first; skip ordinary implementation and product review.
---

# FLOW Knowledge Maintenance

1. Read [the canonical workflow](../../../docs/workflows/knowledge-maintenance.md) and [the stable project-control index](../../../docs/PROJECT_CONTROL.md).
2. Audit before editing. Compare `PROJECT_CONTROL`, `STATUS`, `ROADMAP`, the active section of `specs/README`, relevant decisions and ideas, `HISTORY`, recent PR history, and current Git state.
3. Classify findings as current, stale, duplicated, superseded, orphaned, or awaiting a human decision. Search before reading large logs end to end.
4. Keep the first pass read-only. Edit only when the user explicitly asks for maintenance or approves the proposed scope.
5. Preserve history. Move or link old material; do not delete evidence, rewrite prior decisions, or silently promote ideas. Supersede an old rule with a dated decision and forward link.
6. Keep `STATUS` current, `PROJECT_CONTROL` stable, dated HTML files immutable, and the repo canonical. Do not project maintenance detail to Notion.
7. Run `npm run skills:sync` after canonical skill changes and `npm run docs:check` after documentation changes. Inspect the scoped diff and confirm that app/runtime files are untouched.

Do not turn knowledge maintenance into product planning, implementation, user testing, deployment, destructive cleanup, or an always-on workflow.
