# P33 Cross-entry Canonical Alignment Evidence

## 판정

`draft_pr_awaiting_independent_review`

P33은 같은 AJD 이사 원문과 같은 사용자 목적이 Home, Flow 찾기, URL lookup,
legacy Flow Map, direct public alias에서 서로 다른 24개/5개 Flow로 열리고 저장되던
문제를 닫는다. 신규 진입은 모두 24개 canonical snapshot인
`/f/moving-d30-basic`으로 연결한다.

기존 5개 저장 사본은 삭제하거나 24개 항목에 자동 병합하지 않는다. 같은 브라우저에
24개와 5개 사본이 모두 있으면 My Flow에서 사용자가 계속 사용할 사본을 고르고,
다른 사본은 복구 가능한 보관 상태로 남긴다.

## 확정 계약

- Canonical identity는 `source + user job + editorial variant`로 만든다.
- AJD canonical Flow ID는
  `canonical:source:ajd:moving-checklist:23363|job:prepare-move-by-dday|variant:ajd-moving:comprehensive-calendar-v1`이다.
- 이전 P33 preview ID `flow:ajd-moving:prepare-by-dday:comprehensive-calendar-v1`은
  compatibility read alias로만 유지한다.
- 신규 canonical 저장 slug는 `moving-d30-basic`, 전체 항목 수는 `24`다.
- legacy 5개 사본은 `source-backed-moving-d30` 및
  `curated-ajd-moving-d30` origin으로 계속 읽을 수 있다.
- 기존 `flow:saved:*` key는 삭제하거나 다시 쓰지 않는다.
- 신규 canonical origin/reconciliation metadata만 additive하게 저장한다.
- 사용자 제목, 기준일, 메모, 완료, occurrence, export 기록은 자동 병합하지 않는다.

## 사용자 결과

1. Home, Flow 찾기, AJD URL lookup, legacy alias가 같은 24개 상세로 연결된다.
2. moving과 vehicle에서 선택한 Calendar/Checklist 결과가 실제 preview와 저장
   receipt에 반영된다.
3. 24개/5개 사본 충돌 시 자동 병합 대신 명시적인 active-copy 선택이 보인다.
4. 저장 receipt, My Flow 전체 범위, Calendar 날짜별 합계, export 범위가 모두
   canonical 24개 결과를 읽는다.
5. raw `RRULE`은 My Flow 사용자 화면에서 `2주마다` 같은 문구로 표시된다.
6. canonical public 저장본에서도 `Flow에서 제외 / 다시 포함`이 source 원본을
   바꾸지 않고 개인 상태로 저장되며, 즉시 undo와 새로고침 후 복구가 동작한다.
7. 모바일 Item bottom sheet를 닫을 때 focus return 주체를 하나로 정리해,
   닫힌 sheet로 focus가 늦게 되돌아가는 경합을 제거했다.

## Current verification

- Contract/pretest: `64 / 64`
- Unit: `588 / 588`
- P33 targeted Playwright: `6 / 6`
- My Flow memo reload repeat: `30 / 30`
- Full Playwright: `320 / 320` 직렬 실행을 연속 두 번 검증
- Production build: `18 / 18`
- Viewport: `390x844`, `1024x768`, `1440x900`
- Horizontal overflow / console-page error: `0 / 0`
- Observed-user sessions: `0`

## Evidence

- 상세 분석: [audit.md](./audit.md)
- Route marker: [route-evidence.json](./route-evidence.json)
- 저장 충돌 fixture: [reconciliation-fixtures.json](./reconciliation-fixtures.json)
- 구현 spec: [P33 Cross-entry Canonical Alignment](../../specs/2026-07-24-p33-cross-entry-canonical-alignment/spec.md)
- Publish 안정화: [P33 Publish Stabilization](../2026-07-25-p33-publish-stabilization-evidence/README.md)

## 검증 경계

이 패키지는 current source, unit/invariant test, Playwright browser automation,
390/1024/1440 screenshot을 근거로 한다. 실제 관찰 사용자 수는 `0`이며 자동화
결과를 사용자 검증으로 표현하지 않는다.

## Publish 상태

이번 작업은 별도 clean worktree에서 수행했다. Branch
`codex/p33-integrated-program-plan`은 push됐고 Draft PR
[#156](https://github.com/knhbae/flowme2605/pull/156)이 열려 있다. Main merge와
production deploy는 하지 않았으므로 current production은 아직 P32 release다.
