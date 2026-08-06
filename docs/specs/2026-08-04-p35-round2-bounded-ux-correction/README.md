# P35 Round 2 B/B/B 제한 UX 보정

**상태:** `P′ PASS2_REVISE / P′′ CANDIDATE_BOUND_EVIDENCE_VERIFIED / FRESH_P′′_TWO_PASS_NOT_RUN_OWNER_WAIVED_MVP / VERCEL_PRODUCTION_READY / OBSERVED_USERS_0` — P′의 봉인 검토 결과를 P′′ 보정에 반영했고, 새 독립 P′′ review PASS를 주장하지 않는다.

**승인일:** 2026-08-04 KST

**Owner 결정:** `B/B/B`

**검토 기준 P′:** `codex/p35-round2-candidate-20260805` / `29cb03a65dd1037a3b813b7f43a5a095e4669dce`

**보정 기준 P′′:** `D:\flowme2605\flow-p35-round2-correction-pprime2` / `codex/p35-round2-correction-pprime2-20260805` / parent P′

**Production source P′′ SHA:** `f97644abf379c46433847f44aa7bd4da7fadac4a`

**Candidate-evidence identity:** BUILD_ID `T0QkChgscSgPog-0UdvY-` / epoch `p35-r2-4fa6af1728eb5ca5` — Vercel은 별도 원격 rebuild를 수행했고 live runtime BUILD_ID probe는 `NOT_RUN`

**기획 원본 위치:** `D:\flowme2605\flow-p35-production-mobile-p0`

**현재 gate:** P′′의 bounded correction과 final candidate 계약을 production source SHA `f97644abf379c46433847f44aa7bd4da7fadac4a`로 동결했다. Candidate evidence는 S01~S23 `23/23`을 모두 장부화했으며 S01~S21은 capture, S22는 `NOT_ASSESSED`, S23은 `REVIEWER_CHOSEN_NOT_PRECAPTURED`다. Group manifest는 `3/3 PASS`·failure `0`, verifier는 `PASS`·identity `33`·evidence file `285`·raw URL `556`·failure `0`이다. Vercel deployment `dpl_EBDr9CiRuwAUyjMcJwp7g6eBLpNk`가 `READY`이고 canonical alias는 <https://flowme2605.vercel.app>이다. Owner는 MVP에서 반복 검토를 피하기 위해 새 독립 P′′ Pass 1/Pass 2를 `NOT_RUN`으로 면제했다. 따라서 MVP production gate는 닫혔지만 독립 P′′ review `PASS`로 보지 않는다. Production smoke와 live runtime BUILD_ID probe는 `NOT_RUN`, 관찰 사용자는 `0명`이다.

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

G0 Owner 선택부터 P1-04까지의 local internal implementation gate를 닫은 뒤, Codex와 Claude Design이 불변 P′에 내린 Pass 2 `REVISE` finding을 별도 P′′ source에 반영했다. P′′는 overlapping Flow user-data mutation의 공용 lock, lock 획득 뒤 fresh raw 재조회와 CAS, reuse의 planned-key raw rollback transaction, public copy create/overwrite 재검증, exact transported-byte SHA-256/length, schema-v2 saved identity 보존, exact candidate/review branch Vercel guard를 포함한다. Production source identity와 candidate-bound evidence는 위 값으로 고정됐고 Vercel production은 `READY`다. P′ 검토 결과는 correction input이지 P′′ 독립 판정이 아니며, 새 독립 P′′ Pass 1/Pass 2는 Owner의 MVP 면제로 `NOT_RUN`이다. 실제 browser 200% zoom, performance, 외부 Calendar/VTODO round-trip은 `NOT_ASSESSED`; production smoke도 `NOT_RUN`이다. Text-to-flow와 P2 follow-up은 제외했고 관찰 사용자는 `0명`이다.

이 문서는 특정 시점의 working-tree 청결이나 파일 소유권을 보장하지 않는다. 실행 전 session-start와 `git status`로 현재 branch·HEAD·upstream·dirty path를 다시 확인한다. 위 checkout 경로와 branch는 orientation 정보이고, candidate identity는 post-push provenance만 정본으로 사용한다.

## P2 follow-up candidates

URL supply-request queue mutation ordering, legacy-off write/no-write 감사, rapid batch-submit idempotency/CAS, creator/text-authoring mutation ownership은 P2 follow-up이다. Text-to-flow는 별도 미래 workstream이다. 둘 다 현재 P′′ MVP 범위 밖이며, 별도 Owner 결정 없이 자동 시작하거나 production source에 덧붙이지 않는다.

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
| 앱 구현 | P′ Pass 2 `REVISE` finding을 P′′에 반영 · production source `f97644abf379c46433847f44aa7bd4da7fadac4a` |
| P′′ identity | production source SHA `f97644abf379c46433847f44aa7bd4da7fadac4a` · candidate-evidence BUILD_ID `T0QkChgscSgPog-0UdvY-` · epoch `p35-r2-4fa6af1728eb5ca5` |
| candidate-bound evidence | S01~S23 `23/23` accounted · S22 `NOT_ASSESSED` · S23 reviewer-chosen · group manifest `3/3 PASS`·failure `0` · verifier `PASS` (`33` identity / `285` evidence files / `556` raw URL / failure `0`) |
| fresh independent P′′ Pass 1 / Pass 2 | `NOT_RUN` · Owner가 MVP 반복 검토 방지를 위해 면제 · 독립 P′′ `PASS` 주장 없음 |
| PR / merge / Preview | 안 함 |
| Vercel Production | `READY` · `dpl_EBDr9CiRuwAUyjMcJwp7g6eBLpNk` · <https://flowme2605-n6jddq8i9-flowme.vercel.app> · canonical <https://flowme2605.vercel.app> |
| production smoke / live runtime BUILD_ID probe | `NOT_RUN` |
| 이전 hardening 전 로컬 checkpoint | unit/workflow 1,095/1,095; focused browser 7/7; full Playwright 530/530 · workers 4 · retries 0 · 17.6m; build 18/18 · BUILD_ID `O_FcSLodnCeJe3e2F32PC`; high+ audit 0 · historical only |
| P2 follow-up / text-to-flow | 제외 · current queue 아님 |
| actual 200% zoom / performance / external round-trip | `NOT_ASSESSED`; `720×500`은 reflow proxy |
| 실제 사용자 관찰 | `0명`; V1 `OUT_OF_SCOPE_CURRENT_PROGRAM` |
