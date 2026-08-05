# P35 Round 2 B/B/B 제한 UX 보정

**상태:** `INTERNAL_IMPLEMENTATION_GATE_COMPLETE_LOCAL / CANDIDATE_FREEZE_AUTHORIZED` — P0-01~P1-04 PASS, V1은 현재 프로그램에서 제외, candidate commit·push는 승인됐으나 PR·merge·Preview·Production은 제외

**승인일:** 2026-08-04 KST

**Owner 결정:** `B/B/B`

**현재 구현 기준:** `codex/p35-production-mobile-p0` / upstream `d5f693776f7cebbce72a247ddb33ca6c5d550900` 기반 local working tree

**기획 원본 위치:** `D:\flowme2605\flow-p35-production-mobile-p0`

**현재 구현 티켓:** 없음 — P1-04까지 local internal PASS. 현재 작업은 같은 SHA의 candidate freeze·evidence·blind Pass 1이며 V1은 완료 조건이 아니다.

**최신 완료:** [P1-04 최종 내부 gate closeout](./p1-04-closeout.md)
**직전 완료:** [P1-03 closeout](./p1-03-closeout.md), [P1-03 format/field parity](./p1-03-format-field-parity.md)
**이전 완료:** [P1-02](./p1-02-closeout.md), [P1-01](./p1-01-closeout.md), [P0-10](./p0-10-closeout.md), [P0-01](./p0-01-closeout.md), [P0-02](./p0-02-closeout.md), [P0-03](./p0-03-closeout.md), [P0-04](./p0-04-closeout.md), [P0-05](./p0-05-closeout.md), [P0-06](./p0-06-closeout.md), [P0-07](./p0-07-closeout.md), [P0-08](./p0-08-closeout.md)

**관찰 사용자:** `0명` — Owner 결정으로 V1은 현재 프로그램 범위 밖이며 내부 QA는 사용자 검증이 아니다.

## 승인된 세 결정

| ID | 승인값 | 구현 의미 |
|---|---|---|
| Q1 | **B** | 공개 화면에서는 미수정·eligible·local-only 결과만 저장 없이 한 번 사용할 수 있다. 범위 선택·재생성·중복 관리·이력·원격 전송은 저장한 계획이 소유한다. |
| Q2 | **B** | 일반 `/my`는 저장 계획 library shell을 중심으로 재구성한다. Today는 같은 실행 상태에서 파생한 compact 요약이며 별도 저장소가 아니다. |
| Q3 | **B** | 핵심 사용자 화면은 `계획 찾기 / 내 계획 / 계획 수정`처럼 `계획`을 우선한다. FLOW 브랜드·URL·내부 타입·storage key는 유지한다. |

## 함께 승인된 공통 계약

- 공개와 저장본은 같은 editor family와 transaction 문법을 쓰되 `변경 반영`과 `저장`의 효과를 구분한다.
- 저장 성공 후 별도 save-only 결과 화면을 거치지 않고 방금 저장한 계획 상세로 이동하며, `저장됨 · N개 · 되돌리기` 배너는 한 번만 보인다.
- 결과는 `주 결과 1개 + 바로 가능한 보조 최대 2개 + 조건부 + 불가 이유`로 계산하며 고정 5형식을 만들지 않는다.
- Item 실행 완료, 계획 저장, 공개 초안 반영, 결과 생성은 서로 다른 상태와 동사를 가진다.
- Flow Map parity 수정과 legacy migration은 분리한다.
- 안전·중복·비가역 영향은 도움 아이콘 안에만 숨기지 않는다.

## 현재 gate

G0 Owner 선택부터 P1-04까지 완료해 local internal implementation gate를 닫았다. P1-03은 [closeout](./p1-03-closeout.md)과 [format/field parity](./p1-03-format-field-parity.md), P1-04는 [final gate closeout](./p1-04-closeout.md)을 근거로 `PASS`다. Candidate preflight에서 공개 화면의 초기 storage write를 `0`으로 고정하는 보정과 직접 회귀 1건을 추가했다. 실제 browser zoom과 performance는 `NOT_ASSESSED`이며 `720×500`은 reflow proxy일 뿐 zoom 증거가 아니다. Text Authoring/creator 경로의 별도 editor·publishing은 이 프로그램 범위 밖이다. V1은 현재 프로그램에서 제외됐고 관찰 사용자는 `0명`이다.

현재 checkout에는 기획·검토 산출물이 미추적 상태로 존재한다. 개발자는 이를 임의로 삭제·정리·stage하지 않는다. 다른 worktree에서 구현하더라도 이 폴더와 승인 프롬프트는 위 절대경로에서 읽는다.

## 문서

- [제품·UX 계약](./spec.md)
- [전체 프로그램 단계별 개발 목표](./full-program.md)
- [구현 순서와 PR 경계](./plan.md)
- [실행 체크리스트](./tasks.md)
- [QA와 인수 기준](./qa.md)
- [구현 준비 상태와 중지 조건](./implementation-readiness.md)
- [P0-08 closeout과 내부 browser evidence](./p0-08-closeout.md)
- [P1-03 format/field parity closeout](./p1-03-closeout.md)
- [P1-03 format/field parity matrix](./p1-03-format-field-parity.md)
- [P1-04 최종 내부 gate closeout](./p1-04-closeout.md)
- [Owner 승인 기록](../../content-audit/2026-08-03-p35-fundamental-ux-round2-planning-synthesis/02-p35-round2-owner-decisions-ko.md)
- [상태 계약](../../content-audit/2026-08-03-p35-fundamental-ux-round2-planning-synthesis/03-state-contract-development-handoff-ko.md)
- [상세 티켓](../../content-audit/2026-08-03-p35-fundamental-ux-round2-planning-synthesis/04-development-sequence-and-tickets-ko.md)
- [전체 QA 매트릭스](../../content-audit/2026-08-03-p35-fundamental-ux-round2-planning-synthesis/05-acceptance-and-qa-matrix-ko.md)
- [B/B/B 개발 복붙 프롬프트](../../content-audit/2026-08-03-p35-fundamental-ux-round2-planning-synthesis/08-bbb-approved-developer-kickoff-prompt-ko.md)
- [현재·A/B UX 비교](../../content-audit/2026-08-03-p35-round2-ux-comparison-ko.html)

## 게시 상태

| 상태 | 값 |
|---|---|
| 로컬 문서 준비 | 완료 |
| 앱 구현 | P0-01~P1-04 local PASS · internal implementation gate complete |
| candidate commit / push | Owner 승인됨; exact SHA·clean proof는 이 commit 뒤 외부 freeze record에 기록 |
| PR / merge / Preview / Production | 승인되지 않음 · 실행 금지 |
| Preview / Production | 안 함 / 안 함; released P35가 production baseline |
| 자동·브라우저 QA | final full E2E 529/529 · workers 4 · retries 0 · 26.0m; direct 6/6; unit 1,086/1,086; build 18/18 · pre-freeze BUILD_ID `vAb8e5TudUXvxEyowetMU` |
| actual zoom / performance | `NOT_ASSESSED`; `720×500`은 reflow proxy |
| 실제 사용자 관찰 | `0명`; V1 `OUT_OF_SCOPE_CURRENT_PROGRAM` |
