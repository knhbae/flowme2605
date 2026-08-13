# FlowMe Text Authoring P1-E 원문 후보 갱신 결과

- 승인 ID: `TA-P1-E-SOURCE-UPDATE-20260813-01`
- track/status: `P1-E-SOURCE-UPDATE / APPROVED_FOR_LOCAL_IMPLEMENTATION`
- target checkout: `D:\flowme2605\flow-text-authoring-p1-e-source-update-20260813`
- branch: `codex/text-authoring-p1-e-source-update-20260813`
- baseline commit: `0e02a83664b5c8fb22b6d8619ab7fb2366784d0b`
- upstream: `NONE`
- 현재 상태: `LOCAL_INTERNAL_QA_PASS / LOCAL_COMMIT_INCLUDED(authorized)`
- host adapter: `LOCAL_SYNTHETIC_HOST_ADAPTER`
- 게시 경계: `LOCAL_ONLY`
- 외부 side effect: `0`
- 관찰 사용자 세션: `0`

> 이 문서는 [개발 목표](../../specs/2026-08-13-flowme-text-authoring-p1-e-source-update/00-development-goal-ko.md)의 구현·검증 ledger다. 아래 PASS는 이 target tree에서 새로 실행한 local automated/browser QA만 뜻한다. release, 실제 사용자 검증 또는 외부 provider 연동 완료를 뜻하지 않는다.

## 1. 결론

P1-C 완료 baseline `0e02a83664b5c8fb22b6d8619ab7fb2366784d0b`에서 승인된 P1-E vertical slice를 `14`개 path에 구현했다. 완전한 versioned candidate만 local synthetic host event로 받고, 비교 중 write `0`, 명시 결정, creator 재승인, stale·tamper 차단, source+canonical+projection atomic apply, 별도 save, receipt, 재진입과 1-step undo를 연결했다. 최종 production-build browser 회귀는 `75/75`를 통과했다. P1-A/B/D/F/G와 P2는 건드리지 않았고 push·PR·merge·deploy·P35·외부 side effect·관찰 사용자 세션은 모두 `0`이다.

## 2. 승인·Git 기준

### 2.1 사용자 승인

- approved by: FlowMe repository owner / current user
- approved at: `2026-08-13 13:37:57 KST`
- 승인 문구:

  > TA-P1-E-SOURCE-UPDATE-20260813-01 승인.
  > 직전 답변의 APPROVAL_MANIFEST 전체를 그대로 승인하며,
  > P1-C 완료 커밋 0e02a83664b5c8fb22b6d8619ab7fb2366784d0b에서
  > 새 worktree/branch 생성, P1-E 구현, fresh QA와 target local commit까지 허용한다.
  > LOCAL_SYNTHETIC_HOST_ADAPTER를 사용하고 명시된 제외 범위,
  > LOCAL_ONLY, external side effect 0, observed-user 0 경계를 유지한다.

- session evidence:
  `C:\Users\HUBERT\.codex\sessions\2026\08\13\rollout-2026-08-13T13-37-57-019ff969-a0e6-7aa3-90f2-87f028767846.jsonl:13985`

현재 `flow-mvp` working copy에 canonical manifest 경로는 없다. 이 goal/result가 현재
target의 durable execution ledger며, 이전 8월 13일 아카이브 패키지 복원은 별도
scope다.

### 2.2 Git 대조

| 항목             | 승인값                                             | closeout 확인              |
| ---------------- | -------------------------------------------------- | -------------------------- |
| target branch    | `codex/text-authoring-p1-e-source-update-20260813` | `CONFIRMED`                |
| baseline commit  | `0e02a83664b5c8fb22b6d8619ab7fb2366784d0b`         | `CONFIRMED`                |
| upstream         | `NONE`                                             | `CONFIRMED`                |
| starting tree    | clean P1-C local commit                            | `CONFIRMED`                |
| owned inventory  | exact P1-E `14` paths                              | `14 / 14`, scope drift `0` |
| publish boundary | target local commit까지                            | push·PR·merge·deploy `0`   |

## 3. current → target 결과

| 영역               | 구현 결과                                                                                   | fresh 근거          |
| ------------------ | ------------------------------------------------------------------------------------------- | ------------------- |
| complete envelope  | source/content/candidate identity, version, exact raw, hash, timestamps, actor, base를 검증 | domain+browser PASS |
| local host adapter | 합성 candidate event만 수신하고 fetch·provider·network는 사용하지 않음                      | side effect `0`     |
| write-zero stage   | candidate·decision을 별도 session에 두고 비교·나중에 중 WorkingSource 불변                  | H01/R02 PASS        |
| explicit decision  | `내 작업 유지 / 새 원문 선택 / 나중에`, unresolved 시 적용 disabled                         | H01/F02 PASS        |
| permission         | 현재 document의 creator ownership와 명시 permission을 함께 재확인                           | P01 PASS            |
| stale/hash guard   | 적용 직전 base/current revision와 raw/hash 불일치를 다시 검증                               | F01/F03 PASS        |
| atomic apply       | 기존 operation을 통해 source+canonical+네 projection을 한 transaction으로 갱신              | H01 PASS            |
| apply receipt      | 결정·identity·result·side-effect `0`과 적용 전 aggregate를 기록, 중복 `0`                   | H01/I01 PASS        |
| save separation    | apply는 dirty만 만들고 P0 explicit save가 coherent pair와 save receipt를 소유               | H02 PASS            |
| undo/re-entry      | exact pre-apply aggregate 복원, candidate·failure·focus·scroll session 보존                 | I01/R02 PASS        |
| gate off           | candidate ingress·banner·dialog·mutation `0`, P0 authoring 계속                             | G01 PASS            |

local byte hash는 FNV-1a 32-bit 기반의 결정적 consistency guard다. 동일 입력의 local
tamper/stale 검출을 위한 것이며 암호학적 hash, 인증, 서명 또는 보안 보증으로 사용하지
않는다.

## 4. 변경 파일·소유 경계

승인 inventory는 다음 `14`개 path다.

| 분류                  | 실제 파일                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------ |
| domain·contract       | `lib/flow/text-authoring/source-update-service.ts`                                         |
| domain test           | `lib/flow/text-authoring/source-update-service.test.ts`                                    |
| public export         | `lib/flow/text-authoring/index.ts`                                                         |
| feature gate          | `lib/flow/text-authoring/text-authoring-feature-flags.ts`                                  |
| gate test             | `lib/flow/text-authoring/text-authoring-feature-flags.test.ts`                             |
| workspace integration | `components/flow/text-authoring/TextAuthoringWorkspace.tsx`                                |
| compare UX            | `components/flow/text-authoring/SourceUpdateDialog.tsx`                                    |
| result notice·undo    | `components/flow/text-authoring/ResultPane.tsx`                                            |
| UX test               | `components/flow/text-authoring/SourceUpdateDialog.test.tsx`                               |
| surface regression    | `components/flow/text-authoring/product-result-surfaces.test.tsx`                          |
| browser acceptance    | `tests/e2e/text-authoring-p1-source-update.spec.ts`                                        |
| development contract  | `docs/specs/2026-08-13-flowme-text-authoring-p1-e-source-update/00-development-goal-ko.md` |
| result ledger         | `docs/content-audit/2026-08-13-flowme-text-authoring-p1-e-source-update-results/README.md` |
| spec index            | `docs/specs/README.md`                                                                     |

기존 parser, operations, service-state, storage, route, app shell과 P1-C longform module은
수정하지 않고 재사용·회귀 검증했다. 승인 밖 path 변경과 scope drift는 `0`이다.

## 5. fixture·권리 경계

| fixture                  | 검증                          | 권리·side-effect 경계         |
| ------------------------ | ----------------------------- | ----------------------------- |
| complete synthetic v1→v2 | happy/conflict/apply/save     | 새로 작성한 원문, network `0` |
| incomplete/tampered      | missing field/hash fail-close | local in-memory only          |
| stale base/version       | stale apply `0`               | local identity only           |
| injected failure         | rollback/retry/idempotency    | production provider `0`       |

OSSU commit pair는 shape·identity 근거로만 사용했고 외부 raw 전체를 fixture에 복제하지
않았다. 일반 URL에 snapshot history를 발명하지 않았다. candidate, actor, ownership과
version은 모두 테스트용 synthetic data다.

## 6. failure·recovery·rollback

| 시나리오            | fresh 결과 | 보존·차단 근거                                       |
| ------------------- | ---------- | ---------------------------------------------------- |
| incomplete envelope | `PASS`     | structured stage/apply `0`                           |
| hash mismatch       | `PASS`     | candidate reject, current source/focus 보존          |
| unresolved/deferred | `PASS`     | 적용 disabled, partial commit `0`                    |
| permission denied   | `PASS`     | creator 재승인 전 compare/apply write `0`            |
| stale candidate     | `PASS`     | current revision 불일치에서 apply `0`                |
| injected failure    | `PASS`     | source/canonical/projection/focus 불변               |
| retry/idempotency   | `PASS`     | duplicate transaction·receipt·side effect `0`        |
| undo                | `PASS`     | source+canonical+projection을 exact pre-state로 복원 |
| reload/re-entry     | `PASS`     | deferred candidate·decision·source·focus·scroll 보존 |
| gate off            | `PASS`     | P0 fallback, candidate UI/mutation `0`               |

rollback gate는 `NEXT_PUBLIC_FLOWME_TEXT_AUTHORING_P1_SOURCE_CANDIDATE`다. gate off면
host candidate ingress와 P1-E UI/mutation을 제거하고 P0 manual authoring을 유지한다.
gate off·retry·undo는 current WorkingSource를 삭제하지 않는다.

## 7. fresh QA ledger

모든 명령은 target checkout과 branch
`codex/text-authoring-p1-e-source-update-20260813`, baseline commit
`0e02a83664b5c8fb22b6d8619ab7fb2366784d0b` 위 exact working tree에서 실행했다.

| 순서 | 명령·lane                                                                                                                                                                                                                                                                                           | fresh 결과                                                                                                                                                 |
| ---: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    1 | focused domain·gate·UI contract: `npx.cmd tsx --test lib/flow/text-authoring/source-update-service.test.ts lib/flow/text-authoring/text-authoring-feature-flags.test.ts components/flow/text-authoring/SourceUpdateDialog.test.tsx components/flow/text-authoring/product-result-surfaces.test.tsx` | exit `0`, `44/44`; domain `9/9` 포함                                                                                                                       |
|    2 | `npm.cmd run test:text-authoring`                                                                                                                                                                                                                                                                   | exit `0`, `276/276`                                                                                                                                        |
|    3 | `npx.cmd tsc --noEmit -p tsconfig.next.json`                                                                                                                                                                                                                                                        | exit `0`                                                                                                                                                   |
|    4 | `npm.cmd test`                                                                                                                                                                                                                                                                                      | exit `0`; pretest `173/173`, main `622/622`, approved-plan-execution `182/182`; 실행 출력에 포함된 P35 하위 lane의 별도 총계는 이 ledger에서 발명하지 않음 |
|    5 | gate-on `npm.cmd run build`                                                                                                                                                                                                                                                                         | exit `0`, Next.js production build, static pages `19/19`                                                                                                   |
|    6 | P1-E production-build browser                                                                                                                                                                                                                                                                       | exit `0`, `9/9`, `49.1s`                                                                                                                                   |
|    7 | receipt·ownership 수정 후 targeted browser                                                                                                                                                                                                                                                          | exit `0`, `2/2`, `24.1s`                                                                                                                                   |
|    8 | P1-E + P1-C + 기존 Text Authoring final browser regression, workers `2`                                                                                                                                                                                                                             | exit `0`, `75/75`, `4.2m`; `2026-08-13 15:02:09–15:06:23 KST`                                                                                              |
|    9 | 8 width·200%·reduced-motion·keyboard·focus                                                                                                                                                                                                                                                          | `P1E-R02`와 final browser run에서 PASS                                                                                                                     |
|   10 | `npm.cmd run docs:check`                                                                                                                                                                                                                                                                            | exit `0`, `16` required files, `4560` local links                                                                                                          |
|   11 | Prettier·scoped diff·subtraction audit                                                                                                                                                                                                                                                              | PASS; 승인 밖 path·P1/P2 scope drift `0`                                                                                                                   |

### 실패 발견과 수정 이력

실패 run을 최종 PASS로 덮지 않고 다음과 같이 남긴다.

1. 첫 결합 run은 `73/75`였다. gate-on이 새 P0 초안을 creator로 바꾸던 P0 continuity
   회귀와 save receipt handoff가 candidate drawer 위에 다시 뜨는 test race를 발견했다.
   새 P0 초안의 기본 ownership을 personal로 복원하고 E2E helper가 receipt 종료와
   canonical saved URL 정착을 기다리게 했다.
2. 수정 후 run은 `74/75`였다. 남은 한 건은 기존 route의 `5s` timing flake였고 해당
   시나리오 isolated rerun `3/3`으로 동작을 확인했다.
3. 같은 exact tree의 최종 workers `2` 결합 회귀가 `75/75`로 통과했다.

이 이력은 첫 두 run이 green이었다는 뜻이 아니다. 최종 `LOCAL_INTERNAL_QA_PASS`는 세
번째 결합 run과 위 fresh unit/build evidence에만 근거한다.

## 8. E2E acceptance map

| ID        | production-build browser 검증                                                   |
| --------- | ------------------------------------------------------------------------------- |
| `P1E-H01` | complete candidate→compare write-zero→모든 해결→atomic apply→receipt 1          |
| `P1E-H02` | apply→explicit save/reload coherent pair, first snapshot 보존, history 증가 `0` |
| `P1E-F01` | incomplete/tampered candidate의 banner/dialog/apply/source write `0`            |
| `P1E-F02` | unresolved/defer에서 적용 disabled, source/revision/storage 불변                |
| `P1E-F03` | stale/injected failure에서 current source/projection/focus 보존                 |
| `P1E-P01` | creator permission denied와 reload 후 재승인 전 apply `0`                       |
| `P1E-I01` | 동일 candidate retry의 receipt·transaction·side effect 중복 `0`, undo 1-step    |
| `P1E-R01` | undo 후 source+canonical+projection exact pre-state 복원                        |
| `P1E-R02` | deferred reload·focus/scroll, 8 widths, 200% reflow, reduced motion 보존        |
| `P1E-G01` | gate off에 injection/banner/dialog/mutation `0`, P0 authoring 계속              |

고정 browser seam:

- gate: `NEXT_PUBLIC_FLOWME_TEXT_AUTHORING_P1_SOURCE_CANDIDATE=1`
- event: `flowme:text-authoring-source-candidate`
- adapter: `LOCAL_SYNTHETIC_HOST_ADAPTER`
- session: `flowme:text-authoring:source-candidate-session:v1:<documentId>`
- P1-E E2E inventory: 위 acceptance를 묶은 `9`개 test

## 9. subtraction 결과

| 제거·비도입 대상                               | 결과                        |
| ---------------------------------------------- | --------------------------- |
| URL fetch/auth/crawl/watch/poll 제어           | `0 / NOT_INTRODUCED`        |
| source update 전용 third pane·상시 history     | `0 / NOT_INTRODUCED`        |
| 사용자 surface의 hash/canonical/receipt 내부어 | `0 / HIDDEN_OR_DETAIL_ONLY` |
| auto match·merge·apply                         | `0 / NOT_INTRODUCED`        |
| P1-B service history·P2 review/publication     | `0 / UNTOUCHED`             |
| external provider/network receipt              | `0 / NOT_INTRODUCED`        |

남긴 것은 complete candidate 알림, 이전 원문·내 작업·새 원문의 3-way 비교, 변경별
명시 선택, disabled/error 이유, 적용·나중에, undo·retry·재진입과 P0 fallback이다.

## 10. 상태 분리

| 상태                     | closeout 값                                               |
| ------------------------ | --------------------------------------------------------- |
| local edits              | `14 PATHS / QA PASS / INCLUDED IN AUTHORIZED CLOSEOUT`    |
| local commit             | `LOCAL_COMMIT_INCLUDED(authorized)`; SHA는 commit 후 보고 |
| push                     | `0 / NOT_AUTHORIZED`                                      |
| PR                       | `0 / NOT_AUTHORIZED`                                      |
| merge                    | `0 / NOT_AUTHORIZED`                                      |
| deploy                   | `0 / NOT_AUTHORIZED`                                      |
| P35/external side effect | `0`                                                       |
| observed-user sessions   | `0`                                                       |

P1-A 검색·필터, P1-B service revision/history/trash, P1-D advanced recurrence,
P1-F export history, P1-G linked lineage와 P2 전체는 수정하지 않았다. 이번 local commit은
이 문서를 포함한 승인 P1-E `14`개 path만 고정한다.

## 11. closeout 검증

- docs link validation: `PASS`, `16` required files, `4560` local links
- scoped formatting: `PASS`
- `git diff --check` on the `14` owned paths: `PASS`
- 승인 밖 dirty path: `0`
- independent domain audit: blocker `0`

`LOCAL_INTERNAL_QA_PASS`는 local automated/browser QA만 뜻한다. push, PR, merge,
deployment, P35 integration, external provider 검증 또는 실제 사용자 검증으로 확대 해석하지
않는다.
