# FlowMe 전체 개발 목표 요약·링크

- 기준일: 2026-08-05 KST
- 용도: 개발자와 다음 기획·검토 세션이 이 파일 하나에서 현재 상태, 정본 문서, 다음 시작점을 찾기 위한 안내서
- 기준 checkout: `D:\flowme2605\flow-p35-production-mobile-p0`
- 기준 branch: `codex/p35-production-mobile-p0`

> 이 문서는 길잡이다. 제품 계약은 `spec.md`, QA 판정은 `qa.md`, 현재 단계와
> 실행 순서는 `full-program.md`가 우선한다.

## 1. 현재 상태 한눈에 보기

| 구분 | 현재 상태 | 다음 행동 |
|---|---|---|
| P35 Round 2 B/B/B | `INTERNAL_IMPLEMENTATION_GATE_COMPLETE_LOCAL` | P0-01~P1-04 PASS. V1은 `NOT_STARTED`다. |
| 현재 활성 구현 티켓 | 없음 | V1은 별도 Owner 승인 전 시작하지 않는다. |
| Text Authoring v2 | 별도 worktree에서 로컬 구현·기능 내부 QA 완료 | BBB 단계와 자동 합치지 않는다. 통합·게시·사용자 연구는 별도 결정이다. |
| 게시 상태 | local only | commit, push, PR, CI, merge, 새 Preview, Production 배포 모두 하지 않음 |
| 관찰 사용자 | `0명` | 자동 테스트·브라우저 QA·스크린샷을 사용자 검증이라고 부르지 않는다. |
| 보안 후속 | Text Authoring checkout의 dependency audit High 2 | publish 전 별도 remediation과 전체 회귀가 필요하다. |

## 2. 승인된 B/B/B 결정

| 결정 | 승인값 | 구현 의미 |
|---|---|---|
| Q1 | B | 공개 화면에서는 미수정·eligible·local-only 결과만 저장 없이 한 번 사용할 수 있다. 범위·재생성·중복·이력·원격 전송은 저장 계획이 소유한다. |
| Q2 | B | 일반 `/my`는 저장 계획 library shell이다. Today는 같은 실행 상태의 compact 요약이며 별도 저장소가 아니다. |
| Q3 | B | 핵심 사용자 화면은 `계획 찾기 / 내 계획 / 계획 수정`처럼 `계획`을 우선한다. FLOW 브랜드·URL·내부 type·storage key는 유지한다. |

## 3. BBB 전체 개발 문서 읽는 순서

1. [README — 현재 상태와 문서 허브](./README.md)
2. [full-program — 전체 단계별 개발 목표와 현재 단계 정본](./full-program.md)
3. [spec — 제품·상태·scope·non-goal 계약](./spec.md)
4. [plan — strict sequence와 PR 경계](./plan.md)
5. [tasks — 실행 체크리스트](./tasks.md)
6. [qa — PASS/FAIL, hard fail, 증거 경계](./qa.md)
7. [implementation-readiness — 승인 시점 준비 상태](./implementation-readiness.md)

`implementation-readiness.md`의 최초 P0-01 조건은 승인·준비 시점의 역사 기록이고,
상단 current gate는 README, full-program, plan과 같이 **P1-03 PASS / P1-04 PASS /
internal implementation gate complete / V1 NOT_STARTED**를 따른다.

## 4. 완료된 단계와 closeout

| 단계 | 결과 | 근거 |
|---|---|---|
| P0-01 | 결과 계약·소유권·fixture | [P0-01 closeout](./p0-01-closeout.md) |
| P0-02 | Flow Map selected/applied/preview/save parity | [P0-02 closeout](./p0-02-closeout.md) |
| P0-03 | 완료 기준 UI/payload parity | [P0-03 closeout](./p0-03-closeout.md) |
| P0-04 | 저장 lifecycle·atomic save·direct detail | [P0-04 closeout](./p0-04-closeout.md) |
| P0-05 | 공통 editor transaction | [P0-05 closeout](./p0-05-closeout.md) |
| P0-06 | 공개·저장 Plan/Item 공통 editor surface | [P0-06 closeout](./p0-06-closeout.md) |
| P0-07 | capability 기반 실제 결과 preview·행동 소유권 | [P0-07 closeout](./p0-07-closeout.md) |
| P0-08 | 저장 계획 library·파생 Today·selected detail·rollback | [P0-08 closeout](./p0-08-closeout.md) |
| P0-09 | local quick result·saved transfer·receipt | [P0-09 closeout](./p0-09-closeout.md) |
| P0-10 | hard fail 0·P0 통합 회귀 | [P0-10 closeout](./p0-10-closeout.md) |
| P1-01 | Item·Flow Map·시작일 시각 감산 | [P1-01 closeout](./p1-01-closeout.md) |
| P1-02 | Q3-B 용어·CTA·도움/주의·owned-copy 독립 감사 | [P1-02 closeout](./p1-02-closeout.md) |
| P1-03 | 형식별 field parity·실제 artifact | [closeout](./p1-03-closeout.md) · [format/field parity](./p1-03-format-field-parity.md) |
| P1-04 | 극단값·접근성·legacy 최종 내부 gate | [P1-04 closeout](./p1-04-closeout.md) |

최종 candidate-preflight 증거는 full E2E `529 / 529 PASS`(workers `4`, retries `0`, `26.0m`), direct `6 / 6 PASS`,
full unit `1,086 / 1,086 PASS`, Next `15.5.21` build pages `18 / 18`, BUILD_ID
pre-freeze BUILD_ID `vAb8e5TudUXvxEyowetMU`다. 실제 browser zoom과 performance는 `NOT_ASSESSED`이며
`720×500`은 reflow proxy일 뿐 zoom 증거가 아니다. 이는 로컬 내부 구현 gate
완료이며 게시나 관찰 사용자 검증을 뜻하지 않는다.

## 5. 남은 BBB strict sequence

```text
P0-10 hard fail 0·통합 회귀 PASS
-> P1-01 시각 감산 PASS
-> P1-02 Q3-B copy·CTA·도움/주의 PASS
-> P1-03 형식별 field parity PASS
-> P1-04 극단값·접근성·legacy 회귀 PASS
-> internal implementation gate complete
-> V1 NOT_STARTED · 별도 Owner 승인 필요 · observed users 0
```

다음 human gate를 검토할 때는 아래 순서로 읽는다.

1. [P1-04 closeout](./p1-04-closeout.md)
2. [P1-03 closeout](./p1-03-closeout.md)
3. [P1-03 format/field parity](./p1-03-format-field-parity.md)
4. [plan](./plan.md)
5. [qa](./qa.md)
6. [tasks](./tasks.md)

P1-03과 P1-04를 local PASS로 닫아 BBB 내부 구현 gate를 완료했다. 다음 단계는 구현 티켓이 아니라 별도 human evidence gate인 V1이며, Owner 승인 전 `NOT_STARTED`다. Text Authoring/creator route와 publishing은 계속 별도 범위이고 이 프로그램에 자동 편입하지 않는다.

## 6. BBB 기획·개발 전달 링크

- [Owner 승인 기록](../../content-audit/2026-08-03-p35-fundamental-ux-round2-planning-synthesis/02-p35-round2-owner-decisions-ko.md)
- [상태 계약 개발 handoff](../../content-audit/2026-08-03-p35-fundamental-ux-round2-planning-synthesis/03-state-contract-development-handoff-ko.md)
- [상세 개발 순서와 티켓](../../content-audit/2026-08-03-p35-fundamental-ux-round2-planning-synthesis/04-development-sequence-and-tickets-ko.md)
- [전체 QA matrix](../../content-audit/2026-08-03-p35-fundamental-ux-round2-planning-synthesis/05-acceptance-and-qa-matrix-ko.md)
- [B/B/B 개발 복붙 프롬프트](../../content-audit/2026-08-03-p35-fundamental-ux-round2-planning-synthesis/08-bbb-approved-developer-kickoff-prompt-ko.md)
- [현재·A/B UX 비교 HTML](../../content-audit/2026-08-03-p35-round2-ux-comparison-ko.html)

## 7. Text Authoring v2 별도 개발 결과

Text Authoring v2는 BBB strict sequence와 다른 checkout에서 진행된 별도
로컬 구현이다. 결과를 참고할 수는 있지만 BBB 단계에 자동 편입하거나 함께
stage·commit하지 않는다.

| 문서·산출물 | 절대경로 |
|---|---|
| 구현 목표 프롬프트 | `D:\flowme2605\flow-text-authoring-ta\docs\content-audit\2026-08-04-flowme-text-authoring-grammar-ux-improvement-handoff\codex-implementation-prompt-ko.txt` |
| 구현 완료 보고서 | `D:\flowme2605\flow-text-authoring-ta\docs\content-audit\2026-08-04-flowme-text-authoring-grammar-ux-improvement-results\README.md` |
| 실행 가능한 standalone HTML | `D:\flowme2605\flow-text-authoring-ta\docs\content-audit\2026-08-04-flowme-text-authoring-grammar-ux-improvement-results\flowme-text-authoring-v2-test.html` |
| 35개 simulation 결과 | `D:\flowme2605\flow-text-authoring-ta\docs\content-audit\2026-08-04-flowme-text-authoring-grammar-ux-improvement-results\simulation-matrix-v2-results.json` |
| U01~U08 브라우저 증거 | `D:\flowme2605\flow-text-authoring-ta\docs\content-audit\2026-08-04-flowme-text-authoring-grammar-ux-improvement-results\ui-simulation-evidence.json` |

현재 Text Authoring 기능 증거:

- Text Authoring tests `147 / 147`
- full unit `694 / 694`
- simulation matrix `35 / 35`
- browser UI `8 / 8`
- focused E2E 12개
- production build `18 / 18`
- console/page/failed-request/replacement/external-request `0`
- Text Authoring 소유 TypeScript diagnostics `0`; repo-wide 기존 diagnostics `190`
- dependency audit: transitive High `2`, publish 전 후속 필요

## 8. 개발자 전달 원칙

1. 시작 시 branch, HEAD, upstream, `git status`를 다시 확인한다.
2. 현재 checkout은 이미 dirty하다. 기존 변경을 reset, checkout, clean하거나 전체
   stage하지 않는다.
3. 한 번에 strict sequence의 한 티켓만 소유한다.
4. 결과 계약과 source/personal/execution/export ownership을 UI보다 먼저 지킨다.
5. targeted test부터 실행하고, 변경 위험에 맞춰 unit, build, docs, E2E, browser QA를
   확장한다.
6. local edit, commit, push, PR, CI, merge, Preview, Production을 별도 상태로 기록한다.
7. 자동 QA, 시뮬레이션, 스크린샷을 관찰 사용자 검증으로 표현하지 않는다.

## 9. 절대경로

```text
이 요약 파일
D:\flowme2605\flow-p35-production-mobile-p0\docs\specs\2026-08-04-p35-round2-bounded-ux-correction\00-development-goals-summary-and-links-ko.md

BBB 전체 프로그램
D:\flowme2605\flow-p35-production-mobile-p0\docs\specs\2026-08-04-p35-round2-bounded-ux-correction\full-program.md

BBB 개발 시작 README
D:\flowme2605\flow-p35-production-mobile-p0\docs\specs\2026-08-04-p35-round2-bounded-ux-correction\README.md
```
