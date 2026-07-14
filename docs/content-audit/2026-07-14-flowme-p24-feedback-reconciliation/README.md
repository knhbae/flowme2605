# FlowMe P24 Feedback Reconciliation

## Verdict

P23의 기능 연결은 충분히 넓지만, 외부 관찰 전에 실행 정확성과 상태 신뢰를 다시 닫아야 한다. 다음 작업은 대규모 redesign이나 source v2 merge가 아니다. **깨끗한 기준선과 현재 dependency 변경 환경을 분리해 재현 결과를 고정하는 `P24-00R`**이다.

그 뒤 다음 순서로 진행한다.

1. local/effective date와 reuse override
2. recurrence occurrence와 draft Item inclusion
3. hard navigation과 post-save hydration
4. 완료/완료 취소와 Today 중복 제거
5. 날짜 이동 contract
6. progressive editor와 Calendar 날짜 없음 tray
7. 전체/선택/현재 export 범위
8. 실행 중 메모와 최종 회고
9. 공개 preview와 실제 사용자 15 session

## Why Reconciliation Comes First

- Codex는 clean `69768a1`, Next 15.3.8에서 build와 259 E2E가 통과했다고 기록했다.
- Claude Code는 미커밋 Next 15.5.20 환경에서 build가 두 번 실패해 E2E를 실행하지 못했다.
- 두 결과는 모순처럼 보이지만 서로 다른 runtime과 lockfile을 측정했다.
- 현재 `main`은 `a9ae10e`로 `origin/main`과 같지만 package/runtime/docs에 큰 미커밋 변경이 남아 있다.

따라서 dirty 환경 finding은 무시하지도, production defect로 바로 확정하지도 않는다. 같은 commit과 lockfile을 사용한 격리 재현으로 분류한다.

## Inputs

1. 사용자가 직접 남긴 8개 UX 피드백
2. [Claude Design `(8)` ZIP](https://github.com/knhbae/flowme2605/blob/main/FlowMe%20UXUI%20%EC%A0%84%EC%B2%B4%20%EA%B2%80%ED%86%A0%20%288%29.zip)의 `FlowMe UX 개선안 목업 + 코멘트.dc.html`
3. [Codex P24-00A audit](../2026-07-14-codex-p24-00a-journey-audit/README.md)
4. `docs/content-audit/2026-07-14-claude-code-p24-observation-audit/`의 독립 자동 QA
5. Todoist, Apple Reminders, Google Calendar, Notion, Carbon 공식 문서

ZIP 루트의 `README.md`와 `audit.md`는 과거 P9 자료였다. 현재 제안으로 사용한 파일은 `FlowMe UX 개선안 목업 + 코멘트.dc.html`이다.

## Files

1. [audit.md](./audit.md) - 사용자/자동 QA/디자인 제안을 증거 등급별로 통합
2. [backlog.md](./backlog.md) - 단계별 P24 실행 순서와 완료 조건
3. [findings-matrix.json](./findings-matrix.json) - finding별 source, confidence, next action
4. [reference-notes.md](./reference-notes.md) - 공식 제품 패턴과 FlowMe 적용 판단
5. [next-goal.md](./next-goal.md) - 바로 실행할 P24-00R 복붙용 목표
6. [workboard.html](./workboard.html) - 한 화면에서 보는 한국어 실행 보드
7. [durable spec](../../specs/2026-07-14-p24-execution-trust-ux-simplification/spec.md) - 장기 계약과 non-goal

## Settled for Planning

- Today는 실행, All은 구조/기록 관리 역할을 유지한다. 탭 제거는 아직 결정하지 않는다.
- 완료 취소는 현재 실행 문맥에서 가능해야 한다.
- 날짜 없는 할 일은 1급 상태로 다룬다.
- 날짜 이동과 export는 범위를 먼저 선택한다.
- 편집은 progressive disclosure와 Item intent 기반 field를 사용한다.
- 실행 중 메모는 선택 사항이고 최종 회고에 모일 수 있다.
- arbitrary URL production fetch와 real AI는 이번 P24 UX 수정에 끼워 넣지 않는다.

## Human Actions

1. Vercel 관찰용 deployment protection을 해제하거나 익명 관찰 URL을 새로 만든다.
2. 현재 package/runtime dirty 변경의 소유자와 의도를 확인한다. planning commit은 이를 stage하지 않는다.
3. P24-00R과 correctness slice가 끝난 뒤 실제 사용자 5명 이상을 모집한다.

## Evidence Limitation

실제 사용자 발화는 이번에 제공된 8개 피드백뿐이다. 두 QA package는 자동화/관찰자 시뮬레이션이며 usability validation이 아니다. Claude Design 목업도 방향 제안이지 채택된 상세 UI spec이 아니다.
