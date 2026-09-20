# Project Status

<!-- alpha-transition-20260920:start -->
## 현재 — 실사용 알파 전환 (2026-09-20)

현재 작업의 정본은 [실사용 알파 전환 원장](./specs/2026-09-12-flowme-integrated-product-poc-program/alpha-transition.md)이다. 과거 PoC 완료와 실제 서비스 준비를 구분하고, 세 결과물의 요구 참조·현재 구현·다음 단계·검증 조건을 연결했다. 인증·서버 저장·다기기 동기화는 아직 연결하지 않았다. 개발 Supabase `flowme-dev` 생성은 앞선 승인 작업이며 이번 목표는 조사·설계·문서 갱신만 수행한다.

아래 PoC 평가의 DB/계정/발행0과 테스트 수는 해당 평가 시점의 기록이다. 새 환경 조회 사실은 전환 원장에서 관리한다. 아래 8월 운영 release 상태 역시 이번에 다시 확인한 상태가 아니다.
<!-- alpha-transition-20260920:end -->

## Isolated whole-product PoC — 2026-09-14

2026-09-20 완료. 이 worktree의 격리 기능형 통합 PoC는 [현재 체크포인트](./specs/2026-09-12-flowme-integrated-product-poc-program/current-checkpoint.md), [요구별 최종 평가](./specs/2026-09-12-flowme-integrated-product-poc-program/final-evaluation-2026-09-20.md), [시나리오 원장](./specs/2026-09-12-flowme-integrated-product-poc-program/final-scenario-ledger-2026-09-20.md)을 최신 판정으로 삼는다. 세 산출물의 연결과 서로 다른 두 평가·개선 루프, 복구 버튼/원문 Redo/파일 복귀 포커스 수정 및 F-note 철회 후 기록 보존을 마쳤다. 최종 gdvy 빌드·통합1749/1749·strict390진입점 진단0이며 421소스와 실행 근거를 대조했다. npm 기존 출처기한1실패·의존성 취약점5개와 사용성 개선·실기기/관찰 검증은 남아 있어 출시·상시 실사용 준비 완료는 아니다. 원래 운영 저장소와 아래 운영 release 본문은 변경하지 않았고 DB·계정·commit/push/PR/배포·원격 CI·실기기/관찰 사용자 검증은 하지 않았다.

**Last Updated:** 2026-08-23 (PR #194 released and Production verified; PR #195 exact-head release gate active)
**Status:** v0.1.0 RELEASED / PR #194 VISUAL REFRESH IN PRODUCTION / PR #195 RELEASE AUTHORIZED / EXACT-HEAD CI AND POST-MERGE PRODUCTION VERIFICATION PENDING / OBSERVED USERS 0
**Current Version:** v0.1.0  
**Primary Focus:** Unify discovery entry and make each prepared Flow's complete Text, Todo, and Calendar result understandable before save, while preserving released ownership and persistence contracts.

## Current Control Panel

### Isolated P3-K checkpoint — 2026-09-06, C3 implementation / K4-D design package complete

이 격리 worktree에서는 [단계별 갭 구현 원장](./specs/2026-09-05-flowme-integrated-poc-gap-implementation-v1/progress.md)을 현재 PoC 상태의 기준으로 사용한다. 아래 운영 release 이력과 기존 P3-J 기록은 보존하며 이번에 외부 상태를 재검증한 것은 아니다. C3 로컬 색상·48px·중복 진입의 [요구별 QA](./specs/2026-09-05-flowme-integrated-poc-gap-implementation-v1/k3c-c3-local-ui-qa.md) 한정 범위를 마쳤다. 최종 React UI/복귀8/8·기존gate/실행/작성33/33, standalone4/4·제공file/host12/12 PASS다. 관련113/135, production build PASS이며 전체npm은2,031실행/2,030PASS/기존출처기한1FAIL로 전체green이 아니다. 현재 조작용 HTML은55C57D51/각1,925,497bytes다. K4-D는 [구체 화면·소유·버전·후속 gate](./specs/2026-09-05-flowme-integrated-poc-gap-implementation-v1/k4-implementation-gates.md)와 순수34/34·strict0, 보고서5/5로 설계 패키지를 마쳤다. 실제 K4 필드는 미구현이며 다음은 K4-A1 read-preview다. 전체254부모/424원자 판정은 다시 올리지 않았다. 보호551의 승인 밖 변경0·격리 운영 sentinel bytes 불변, 실기기/보조기술NOT_RUN, 관찰사용자0명, commit/push/PR/Preview/Production미실행이다.

### Isolated PoC checkpoint — 2026-09-05 P3-J

This worktree's [execution-detail spec](./specs/2026-09-05-flowme-integrated-poc-execution-detail-gap-v1/spec.md) and validation report (로컬 전용 근거: `./content-audit/2026-09-05-flowme-integrated-poc-execution-detail-validation-ko.html`) record a local-only requirement repair, not a release-state update. Source description, completion criteria and personal memo are distinct in React and the standalone HTML, including long-content wrapping. Focused checks `58/58`, standalone `96/96`, full `npm test` `2,210/2,210`, production build `18` static pages and selected product browser scenarios `26/26` passed. The trace repairs three subchecks and refreshes two evidence records without increasing parent requirement counts. Exact-query and PoC-prefix boundaries remain; operating fixture bytes are unchanged. Real-device/assistive-technology tests remain `NOT_RUN` and are outside this goal's completion conditions. Observed users `0`; no commit, push, PR, Preview or Production action. The release history below is inherited and was not revalidated by this PoC task.

Start from [PROJECT_CONTROL.md](./PROJECT_CONTROL.md). Dated HTML boards remain evidence snapshots; this file, [ROADMAP.md](./ROADMAP.md), and [specs/README.md](./specs/README.md) carry current truth.

| Lane | Current truth |
| --- | --- |
| Active product gate | [Flow Entry And Preview Clarity](./specs/2026-08-20-flow-entry-preview-clarity/spec.md) is the one active gate. [PR #196](https://github.com/knhbae/flowme2605/pull/196) resolved the source-review prerequisite with `135` normal-user routes current and overdue/missing counts `0`, and [PR #194](https://github.com/knhbae/flowme2605/pull/194) is released. The Owner completed FPC-11 and authorized [PR #195](https://github.com/knhbae/flowme2605/pull/195); reconciled exact-head CI, merge, and post-merge Production verification remain. Observed users remain `0`. |
| Current product release identity | [PR #194](https://github.com/knhbae/flowme2605/pull/194) merged as `c8a57ba37c4087b84b526bc778c3604f68299faa` after its exact-head release gate passed. This visual-only refresh is the current runtime-bearing product baseline. |
| Last runtime-bearing product deployment | The resulting PR #194 Production deployment was verified at the [canonical alias](https://flowme2605.vercel.app). Exact deployment evidence remains automation/deployment proof, not observed-user validation. |
| Evidence boundary | PR #196 merge `8c0bfd8de9fb8877c4045b2c3f725b60ca236843` records `135` current normal-user routes and overdue/missing counts `0`. Earlier PR #195 runs `624/625`, `623/629`, and `629/629` remain dated QA history; they do not prove the reconciled exact head and are not a current source-freshness blocker. Automated QA, deployment, screenshots, and local capture reports are not observed-user validation; observed users remain `0`. |
| Publication boundary | PR #194 is merged and Production-verified. PR #195 is Owner-authorized but remains unreleased until its reconciled exact head passes CI; its resulting Production deployment must be verified separately after merge. |
| User action now | Review the final Production result after PR #195 release evidence is reported. |
| AI action now | Pass PR #195 reconciled exact-head CI, merge only that green head, and verify the resulting Production deployment without expanding scope. |
| Paused Text Authoring | Preserved and pushed at `a5d5338`; separate from the release and not promoted. |
| Paused content review | Preserved and pushed at `0d27143` on `archive/flow-content-user-review-wip-20260806`; not a publication candidate. |
| Deferred candidates | P35 P2 mutation follow-ups, Text Authoring `TA-01`, collaborative authoring, content review, and research packages remain separate shelves. Select at most one by explicit decision. |
| Merged architecture baseline | R0, R1, and R2 were merged through [PR #168](https://github.com/knhbae/flowme2605/pull/168) on 2026-08-08 as `efa4d90a78a06134180701bed74874579ac94154`. Calendar view-model/controller and My Flow saved-library transitions are separated while `AppClient` remains the compatibility adapter. This merge did not create a production deployment, production smoke, or observed-user validation. |
| R3A release | [PR #169](https://github.com/knhbae/flowme2605/pull/169) merged implementation commit `eeac99213b58eeafb8f39b2cc71c723e6fa32712` and publication commit `950fd55f4176bf74d4739647040874a601faffcc` as `95a69257c73633077df2305232299f58cca03f73`. It adds a query-only, fail-closed My Flow experience boundary without changing the default UI, persistence, export, or receipt contracts. Production smoke passed; observed-user validation remains `0`. |
| Blocked by evidence | Observed usability, real Calendar/VTODO round-trip, cross-device recovery, real review/social data, account persistence, creator/update pilot, real AI backend, and external integrations. |

## System Health

| Area | Command or evidence | Current expectation |
| --- | --- | --- |
| Documentation harness | `npm run docs:check` | Required agent docs, skill synchronization, and local Markdown links pass. |
| Unit tests | `npm test` | PASS on the merged PR #196 prerequisite baseline; every subsequent PR exact head must pass again before merge. |
| Production build | `npm run build` | Next.js production build succeeds. |
| Flow entry and preview clarity | [Active spec](./specs/2026-08-20-flow-entry-preview-clarity/spec.md) / [QA evidence](./specs/2026-08-20-flow-entry-preview-clarity/qa.md) | One-input intent routing, source-faithful full Text, full approved Todo/Calendar, copy-title cardinality, legacy regression, production build, independent review, and three-width browser checks passed on the prior review head. The Owner authorized release. Because PR #195 was reconciled with the released baseline, its new exact head must pass CI before merge and its resulting Production deployment must be verified afterward. |
| Production visual-only refresh | [QA evidence](./specs/2026-08-20-production-visual-only-refresh/qa.md) | Focused components `53/53`, P35 P0 `449/449`, approved execution `191/191`, public surface `14/14`, build `18/18`, visual matrix `12/12`, affected E2E `52/52`, and final discovery/My Plan subset `9/9` pass. The historical `623/624` source-review result was resolved by PR #196. PR #194 passed its release gate, merged as `c8a57ba37c4087b84b526bc778c3604f68299faa`, and Production was verified. |
| Public Plan/Item edit release | [QA evidence](./specs/2026-08-12-public-plan-edit-surface-unification/qa.md) / [local UI capture review](./content-audit/2026-08-12-public-plan-edit-surface-unification-ui-review-ko.html) | The PR #178 foundation retains focused `105/105`, P35 P0 `446/446`, dedicated E2E `8/8`, Map action `7/7`, and affected browser `154/154`. The date-parity follow-up passed focused `33/33`, full `npm test`, build `18` routes, and dedicated E2E `11/11`; PR #182 exact-head CI and Production passed, with canonical smoke `41/41`. The capture review remains local evidence. |
| My Plan edit/lifecycle release | [QA evidence](./specs/2026-08-12-my-plan-edit-lifecycle-unification/qa.md) | Local checks remain origin/persistence/source/storage `172/172`, saved-library controller `19/19`, approved execution `187/187`, lock `59/59`, build `18` routes, dedicated E2E `23/23`, affected browser `80/80`, and full `npm test` PASS. The same PR #178 merge and Production smoke released this foundation. |
| Browser regression | Current runtime-bearing PR #194 merge `c8a57ba37c4087b84b526bc778c3604f68299faa` | Exact-head release checks and resulting Production verification passed. The earlier PR #182 canonical smoke `41/41` remains historical regression evidence. Neither is observed-user evidence. |
| Merged R0-R2 baseline | [PR #168](https://github.com/knhbae/flowme2605/pull/168) / `efa4d90a78a06134180701bed74874579ac94154` | Before merge: local docs PASS, controller `15/15`, lock `59/59`, unit/contract `615/615`, build PASS, selected E2E `20/20`, and final Playwright `542/542`. Production deployment and smoke remain `NOT_RUN`. |
| R3A release | [PR #169](https://github.com/knhbae/flowme2605/pull/169) / [R3A QA](./specs/2026-08-09-r3a-my-flow-experience-boundary/qa.md) | Focused boundary `72/72`, pretest `164/164`, P35 P0 `420/420`, lock `59/59`, main unit/contract `615/615`, build `18/18`, local R3A E2E `4/4`, local full runtime regression `545/545`, GitHub Playwright `546/546`, production deployment `READY`, and classic/lab production smoke PASS. Observed-user validation remains `0`. |
| Previous R3B production release | [R3B QA](./specs/2026-08-11-r3b-approved-plan-execution-boundaries/qa.md) | PR #172 and hotfix PR #173 established the inherited approved execution contracts and canonical smoke `23/23`. PR #176, PR #178, and PR #182 later extended that runtime; current PR #194 merge `c8a57ba37c4087b84b526bc778c3604f68299faa` preserves the inherited My Flow contracts. |
| Previous public plan surface release | [QA evidence](./specs/2026-08-12-public-plan-surface-unification/qa.md) | PR #176 merge `47c54803c6bb7544aad757ce62c4ce58decbfe53`, PR #178 merge `908ee849beb15cb10331b72d7894167a61458b18`, and PR #182 date parity remain historical foundations; PR #194 merge `c8a57ba37c4087b84b526bc778c3604f68299faa` is the current product-behavior baseline. |
| Worktree boundary | `git worktree list` | Release and documentation follow-ups use dedicated worktrees; user-owned and unrelated worktrees remain untouched. |

## Active Product Constraints

- Keep FLOW export-first in Stage 0: turn outside content into a user's familiar calendar, checklist, spreadsheet, or memo before expanding native record management.
- Keep source, creator version, personal overlay, execution, receipt, and export ownership separate.
- Keep official information and creator/user experience tips visually and structurally separate.
- Flow Map is an internal source/version/aggregate identity, not a separate user-facing plan type. Single-plan `save_all` content uses the ordinary Flow editor, real alternatives use `choose_child` then `/f`, and `review_hold` stays editor-free. Exact rollback flags retain their compatibility behavior without changing storage keys or schema.
- Do not label screenshots, simulation, internal review, automated QA, or deployment readiness as observed-user validation.
- Avoid login, payment, AI auto-publishing, full community, and heavy integrations before repeat-use evidence.
- Keep decisions aligned with [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md).

## Status History

P35 Round 2 release details and older implementation notes are preserved in [STATUS_HISTORY.md](./STATUS_HISTORY.md), the [P35 Round 2 spec](./specs/2026-08-04-p35-round2-bounded-ux-correction/README.md), and the [production closeout](./pr-history/2026-08-06-p35-round2-mvp-closeout-production.md). They are evidence, not the current queue.
