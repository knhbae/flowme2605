# FLOW Validation Sessions

This folder stores observed user-session notes for Stage 0 export-first validation.

Use [TEMPLATE.md](./TEMPLATE.md) for every session. Keep raw notes factual: what the user did, where they hesitated, what they exported, and what they said they would do next.

## Rules

- Do not mark a route validated from one internal QA pass.
- Do not treat screenshots, green tests, or team walkthroughs as user validation.
- Use the decision labels from [first-user-validation-script.md](../flow-rules/first-user-validation-script.md).
- Keep health, legal, finance, official-document, family, and safety risks explicit.
- Record `no signal` when the user does not reach setup or artifact output.

## File Naming

Use:

```text
YYYY-MM-DD-<route-slug>-session-<number>.md
```

Example:

```text
2026-05-25-computer-skills-d30-study-session-01.md
```

## Status Impact

After at least three target-user sessions for a route, summarize evidence in `docs/content-audit/` before changing any public or representative status language.

No route should be called `validated` unless observed behavior shows the export-first loop:

```text
open -> setup -> artifact understood -> export/copy -> outside-use intent or real use -> completion/update/return signal
```
