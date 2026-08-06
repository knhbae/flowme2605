# P35 Round 2 B/B/B 구현 준비 상태

## Fixed Inputs

| Input | Value |
|---|---|
| Approval | `B/B/B` |
| Approval date | 2026-08-04 KST |
| Source checkout | `D:\flowme2605\flow-p35-production-mobile-p0` |
| Expected branch | `codex/p35-production-mobile-p0` |
| Original approval ref | `91fb66af063f7041f9442a9dfeb66f9a3e78d723` |
| Current baseline/upstream | `d5f693776f7cebbce72a247ddb33ca6c5d550900` |
| Current ticket | 없음 — `P0-01`~`P1-04` PASS; internal implementation gate complete; V1 `OUT_OF_SCOPE_CURRENT_PROGRAM` |
| Publish authority | `none` |
| Observed users | `0` |

개발 시작 시 base ref가 대상 branch ancestry에 포함되는지 확인한다. 포함되지 않으면 어느 branch가 맞는지 추측하거나 자동 rebase하지 않고 중지한다.

## Known Dirty Paths At Approval

다음 경로는 승인 시점부터 미추적 상태였다. 삭제·정리·전체 stage하지 않는다.

- `docs/content-audit/2026-08-03-p35-fundamental-ux-round2-planning-synthesis/`
- `docs/content-audit/2026-08-03-p35-fundamental-ux-round2-results/`
- `docs/content-audit/2026-08-03-p35-round2-ux-comparison-assets/`
- `docs/content-audit/2026-08-03-p35-round2-ux-comparison-ko.html`

이번 문서 준비로 생긴 tracked/untracked 변경도 개발 코드와 자동으로 함께 stage하지 않는다. 구현 세션은 실제 소유 경로를 별도로 기록한다.

## Resolved Product Gates

| Former TBD | Resolution |
|---|---|
| TBD-Q1 | RESOLVED-B — clean·eligible·local-only one-shot |
| TBD-Q2 | RESOLVED-B — saved-plan library shell + compact Today |
| TBD-Q3 | RESOLVED-B — core user surfaces use `계획` |
| TBD-REMOTE | OUT_OF_SCOPE — OAuth, remote send, sync 금지 |

## Foundation Discovery Gates

아래는 Owner 결정이 아니라 P0-01의 code-evidence deliverable이다. 답은 [P0-01 closeout](./p0-01-closeout.md#6-foundation-answers)에 코드 근거와 함께 고정됐다. P0-02~P1-04도 각 closeout으로 PASS했다. P0-08의 Q2 rollback·read-only storage 결과는 [P0-08 closeout](./p0-08-closeout.md), P0-09의 Q1-B artifact·receipt 결과는 [P0-09 closeout](./p0-09-closeout.md), 통합 gate는 [P0-10 closeout](./p0-10-closeout.md), 시각 감산은 [P1-01 closeout](./p1-01-closeout.md), Q3-B 문구·도움말은 [P1-02 closeout](./p1-02-closeout.md), format parity는 [P1-03 closeout](./p1-03-closeout.md)과 [field parity matrix](./p1-03-format-field-parity.md), 최종 내부 gate는 [P1-04 closeout](./p1-04-closeout.md)에 고정했다.

## Final Internal Gate Evidence

| Evidence | Result |
|---|---|
| P1-03 | `PASS` — [closeout](./p1-03-closeout.md), [format/field parity](./p1-03-format-field-parity.md) |
| P1-04 | `PASS` — [closeout](./p1-04-closeout.md) |
| Full E2E | `529/529 PASS` · workers `4` · retries `0` · `26.0m`; direct `6/6 PASS` |
| Unit | `1,086/1,086 PASS` |
| Build | Next `15.5.21` · pages `18/18` · pre-freeze BUILD_ID `vAb8e5TudUXvxEyowetMU` |
| Zoom / performance | actual browser zoom `NOT_ASSESSED`; performance `NOT_ASSESSED`; `720×500`은 reflow proxy |
| Candidate freeze | commit·push와 blind-only A/B 승인; exact SHA·clean proof는 source commit 뒤 외부 기록 |
| PR / deploy | PR·merge·Vercel Preview·Production 승인 없음 |
| Human gate | V1 `OUT_OF_SCOPE_CURRENT_PROGRAM`; observed users `0` |

이 문서는 구현 준비에서 내부 구현 종료 상태로 넘어갔지만 publish authority는 여전히 `none`이다. Text Authoring/creator worktree와 publishing은 이 gate에 편입하지 않는다.

| ID | P0-01에서 확인할 것 | Blocked tickets |
|---|---|---|
| FND-S10-COMMIT | **확인:** 현재 saved Item은 즉시 item-level commit이며 multi-key write는 원자적이지 않음 | P0-05, P0-06 입력 확정 |
| FND-RECEIPT | **확인:** save 전용 type 없음, export receipt는 component-local transient이며 persistent record 없음 | P0-04, P0-09 입력 확정 |
| FND-LEGACY | **확인:** saved Flow/Map 일부는 unversioned, missing base는 bytes가 남지만 UI에서 누락 가능 | P0-02, P1-04 입력 확정 |
| FND-ROLLBACK | **확인:** `/my?experiment=off`는 Todo surface만, local backup은 별도 복구 수단 | P0-04, P0-08, P1-02 입력 확정 |
| FND-CONSUMERS | **확인:** public/saved 일반 Flow는 effective snapshot, Map은 publish steps를 직접 읽고 export family도 둘로 갈림 | P0-02~09 입력 확정 |

## Historical P0-01 Start Conditions

아래 체크리스트와 중지 조건은 P0-01 시작 시점의 기록이다. 현재 단계 시작 조건은 [전체 프로그램](./full-program.md)의 해당 단계와 최신 closeout을 따른다.

- [x] `npm.cmd run workflow:session-start` 결과를 기록했다.
- [x] branch, HEAD, upstream ahead/behind, dirty paths를 직접 확인했다.
- [x] Node `24.x`와 package scripts를 확인했다.
- [x] active spec과 Owner 기록의 B/B/B가 일치했다.
- [x] P0-01만 소유하고 UI·route·save·`/my`·copy는 no-change로 선언했다.
- [x] 후보 test 파일이 실제로 존재하는지 확인했다.
- [x] 수정 예정 파일이 기존 dirty path와 겹치지 않았다.

## Historical P0-01 Immediate Stop Conditions

- B/B/B와 충돌하는 current decision 또는 spec이 발견됨
- source/base mutation이나 destructive migration 없이는 acceptance를 만족할 수 없음
- legacy record를 자동 rewrite해야만 parity가 맞음
- nested Item commit 단위가 현재 storage에서 서로 모순되며 하나를 선택하면 데이터 손실 가능
- remote export/OAuth가 요구됨
- 대상 code file이 다른 작업의 dirty change와 겹침
- P0-01을 통과시키려면 UI 또는 다음 티켓 기능을 함께 구현해야 함

중지 시 현재 근거, 충돌하는 계약, 사용자 영향, 가장 작은 권장 결정을 표로 보고한다.
