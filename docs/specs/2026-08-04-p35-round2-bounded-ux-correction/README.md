# P35 Round 2 B/B/B 제한 UX 보정

**상태:** `P′ PASS2_REVISE / P′′ CANDIDATE_SOURCE_READY / FINAL_CANDIDATE_EVIDENCE_PENDING / FRESH_TWO_PASS_REVIEW_AUTHORIZED` — P′는 불변이며 P′′는 source-ready일 뿐 candidate-bound evidence나 fresh review 완료가 아님

**승인일:** 2026-08-04 KST

**Owner 결정:** `B/B/B`

**검토 기준 P′:** `codex/p35-round2-candidate-20260805` / `29cb03a65dd1037a3b813b7f43a5a095e4669dce`

**보정 기준 P′′:** `D:\flowme2605\flow-p35-round2-correction-pprime2` / `codex/p35-round2-correction-pprime2-20260805` / parent P′

**기획 원본 위치:** `D:\flowme2605\flow-p35-production-mobile-p0`

**현재 gate:** P′′의 승인 범위 source에는 bounded correction과 final candidate-source 계약이 반영됐고, final local scoped run은 pretest `114/114`, P35 P0 `415/415`, main unit/workflow `615/615`, shared-lock contract `59/59`, full Playwright `533/533`, build/audit/docs/diff PASS다. Owner는 2026-08-06에 clean commit/push와 fresh candidate/evidence/Pass 1/Pass 2를 승인했다. 다음 단계는 candidate freeze와 blind-only publication이며, exact SHA·BUILD_ID·epoch·candidate-bound count는 이 문서가 아니라 post-push provenance에서만 확정한다.

**최신 기록:** [Pass 2 교차 종합과 P′′ 로컬 보정 closeout](./pass2-cross-synthesis-and-pprime2-closeout.md)
**직전 완료:** [P1-04 최종 내부 gate closeout](./p1-04-closeout.md)
**이전 완료:** [P1-03 closeout](./p1-03-closeout.md), [P1-03 format/field parity](./p1-03-format-field-parity.md), [P1-02](./p1-02-closeout.md), [P1-01](./p1-01-closeout.md), [P0-10](./p0-10-closeout.md), [P0-01](./p0-01-closeout.md), [P0-02](./p0-02-closeout.md), [P0-03](./p0-03-closeout.md), [P0-04](./p0-04-closeout.md), [P0-05](./p0-05-closeout.md), [P0-06](./p0-06-closeout.md), [P0-07](./p0-07-closeout.md), [P0-08](./p0-08-closeout.md)

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

G0 Owner 선택부터 P1-04까지의 local internal implementation gate를 닫고 P′를 동결했지만, Codex와 Claude Design Pass 2는 모두 `REVISE`를 판정했다. P′는 그대로 보존한다. 별도 P′′ source는 overlapping Flow user-data mutation의 공용 lock, lock 획득 뒤 fresh raw 재조회와 CAS, reuse의 planned-key raw rollback transaction, public copy create/overwrite 재검증, exact transported-byte SHA-256/length, schema-v2 saved identity 보존, exact candidate/review branch Vercel guard를 포함한다. 이것은 `CANDIDATE_SOURCE_READY`이며 final candidate-bound verification이나 fresh review 완료를 뜻하지 않는다. P′ 검토는 P′′에 승계할 수 없고 전체 프로그램은 아직 `COMPLETE`가 아니다. 실제 browser zoom과 performance는 `NOT_ASSESSED`이며 `720×500`은 reflow proxy일 뿐 zoom 증거가 아니다. V1은 현재 프로그램에서 제외됐고 관찰 사용자는 `0명`이다.

이 문서는 특정 시점의 working-tree 청결이나 파일 소유권을 보장하지 않는다. 실행 전 session-start와 `git status`로 현재 branch·HEAD·upstream·dirty path를 다시 확인한다. 위 checkout 경로와 branch는 orientation 정보이고, candidate identity는 post-push provenance만 정본으로 사용한다.

## P2 follow-up candidates

URL supply-request queue mutation ordering, legacy-off write/no-write 감사, rapid batch-submit idempotency/CAS, creator/text-authoring mutation ownership은 현재 P′′ 범위 밖이다. Fresh review가 각 항목을 유지·폐기·승격할 수 있지만, 이 문서만으로 자동 시작하거나 현재 candidate에 덧붙이지 않는다.

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
- [Pass 2 교차 종합과 P′′ 로컬 보정 closeout](./pass2-cross-synthesis-and-pprime2-closeout.md)
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
| 앱 구현 | P′ Pass 2 `REVISE`; P′′ `CANDIDATE_SOURCE_READY` · final run pending |
| P′′ commit / push | 2026-08-06 승인됨 · 아직 미실행 · exact SHA는 post-push provenance 소유 |
| candidate-bound build / S01~S23 | `NOT_RUN` · exact BUILD_ID·epoch·최종 count는 post-push provenance 소유 |
| fresh review publication | blind-only 우선, 두 Pass 1 동결 뒤 informed-only 게시 승인 |
| PR / merge / Preview / Production | 승인되지 않음 · 실행 금지 |
| 이전 hardening 전 로컬 checkpoint | unit/workflow 1,095/1,095; focused browser 7/7; full Playwright 530/530 · workers 4 · retries 0 · 17.6m; build 18/18 · BUILD_ID `O_FcSLodnCeJe3e2F32PC`; high+ audit 0 · historical only |
| P2 follow-up | URL queue / legacy-off / rapid batch submit / creator·text-authoring · current queue 아님 |
| actual zoom / performance | `NOT_ASSESSED`; `720×500`은 reflow proxy |
| 실제 사용자 관찰 | `0명`; V1 `OUT_OF_SCOPE_CURRENT_PROGRAM` |
