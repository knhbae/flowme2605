# Writing UX Development-Host Release — 2026-10-01

[Draft PR206](https://github.com/knhbae/flowme2605/pull/206) is stacked on `agent/alpha-core-ux-save-ack-20260930` (`905c4c31`) and includes the already-serving host dependency `1eb9be68`. It does not merge main or the earlier PRs.

## Product and published source

- `db47835bfe1bd1c76ff092c522f8ffec2e510678`:104 owned paths for three writing UX candidates and the narrow mobile handoff.
- `3efea9052e04332570a920b732f952077ca274fe`: exact backup-route inventory expectation and local-only historical evidence links; product source unchanged.
- `ae5a97f09b4ea9284ec37ba912fc5515af838823`: historical month fixture Date and checkpoint-ready test assertions; product source unchanged.
- Cumulative exact publication manifest:108 paths after the final history/summary records. Private catalog source, settings, raw JSON/log/PNG/trace and other worktrees are excluded. Final record commit and latest-head checks are visible on the PR; they are not asserted before execution here.

## Verification and actual development update

- Local npm2,258/2,258; private contracts267files2,744/2,744; targeted types564entries0diagnostics; production build; source639 with no in-run drift.
- Local app browser155/155; final serving build local35/35; deployed synthetic35/35 across390×844,375×812,844×390,1024×768,1440×900. These overlap and are not unique requirement coverage or observed-user/device tests.
- Product [CI36824430918](https://github.com/knhbae/flowme2605/actions/runs/36824430918): four required jobs succeeded. Full browser760scenarios/762attempts =758 first-attempt passes and2 retry passes. P24 Calendar and historical PoC move tests remain flaky; no test was skipped or weakened to hide the result. Earlier inventory/month failures and the one-off recurrence reload failure are retained in [QA](../specs/2026-10-01-alpha-writing-ux-dev-release/qa.md).
- Existing3105 app was replaced at `2026-10-01T06:39:23Z`, launcher5728/child11220, loopback only. Build `zEY9jP0Mcmqs90L0HCPvB`; Windows source snapshot `e088af46af01fa14f1da02bb2464d2d266da262b3106344cef79eef8571ac4cb`. The separate Linux CI LF snapshot is recorded in QA, not falsely equated to Windows CRLF bytes.
- Post-switch unauthenticated HTTPS10/10:health empty200/no-store, alpha/callback200, protected APIs401, backup-jobs503/off. Browser fixture forwards only fixed-origin document/static GETs; all Auth/API is synthetic and telemetry is blocked. Expected synthetic SRI errors are classified separately, not telemetry validation or a claim of zero total console errors.
- Local/remote35pairs,40boundary records,24unique static assets match the built files exactly; manifest SHA256 `da8222c9a636ae0bf3f40e5a532a61e27df2a325c42671b4acabd06ea9ad57ef`. Unexpected console/page errors, overflow, outside-prefix Storage calls and real account writes are0; synthetic sentinels stay byte-identical.

## Preservation, exclusions and follow-up

The previous core-UX build `F9QqWgnGf7n_PaVUEavrK`, its config, two settings files and the private catalog pack stayed hash-identical. Tunnel3864, DNS, DB/Auth and real-account data were not modified. Rollback is prepared in the previous worktree; it was not actually executed. New5D remainsoff. Final summary commit/build runs in a separate publication worktree, never over the live `.next`.

Actual Android Chrome/iOS Safari, OS IME and assistive-technology checks areNOT_RUN; observed users0. Main merge/automerge, Render/Vercel new Preview, Production deployment and semantic-version tag creation are0. Creator/public discovery/Flow Map/community, larger focus mode, recurrence/relative-date work,5D large backups,long-lived tabs/auto-start,cost/rate/device work remain separate. Existing21feedback and424requirements are not declared fully covered.
