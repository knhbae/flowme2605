# URL-first AI Draft Gate QA

## Required Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Runtime/app UI change | Pass | P21-02 spec files and spec index only |
| AI SDK/API/env change | Pass | No provider package, API key, or environment variable added |
| P21-01 fallback retained | Pass | Existing deterministic draft implementation remains canonical |
| `npm.cmd run docs:check` | Pass | 14 required files and 1,771 local links checked |
| `git diff --check` | Pass | No whitespace errors; existing CRLF conversion warnings only |

## Review Notes

- Product constraint review: AI is draft assistance only; no auto-publish, auto-complete, or auto-Calendar behavior.
- Source/risk review: source snapshot, AI proposal, and user overlay are separate; sensitive content requires a stricter gate.
- Browser or screenshot review: Not applicable to this documentation-only slice. P21-04/P21-05/final evidence covers current UI.
- Residual risk: Provider retention, privacy, cost, and runtime behavior remain unverified until a provider is selected. The implementation gate therefore remains closed.
