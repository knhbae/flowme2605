# P25-07 Integrated visual language evidence

P25-07은 My Flow, Calendar, 날짜 없는 할 일 배치, 실행 메모, export, 공통 내비게이션이 같은 행·표면·조작 언어를 쓰도록 정리한다. Flow 색은 식별에만 남기고 primary action은 중립적인 ink 색으로 통일했다. 실행 행은 할 일 제목을 먼저 보여주며 완료, 열기, 메모의 역할을 분리한다.

`보류`한 반복 회차는 Today와 Calendar의 일반 실행에서 제거한다. 데이터와 stable occurrence ID는 유지하고 My Flow `내 Flow` 화면의 접힌 `보류한 일정` 목록에서 열어 다시 진행할 수 있다.

이 패키지는 현재 코드, 자동 테스트, 로컬 production browser 결과다. 실제 사용자 관찰은 아니며 관찰 세션 수는 `0`이다.

## 구현 결과

- 공통 surface, inset, toolbar, action, segmented control, input, row, sheet 토큰을 추가했다.
- My Flow 행은 제목, 날짜/Flow 맥락, 완료·열기·메모 순서로 정리했다.
- 완료와 메모 조작의 최소 터치 영역을 `44px`로 맞췄다.
- `언제든`을 `날짜 없는 할 일`, `날짜 없음`, `날짜 정하기`, `날짜 없애기`로 명확히 했다.
- Calendar wide의 반복 설명 문장, 색상 count badge, 별도 routine legend를 제거했다.
- 모바일/wide의 탭, scope filter, month toolbar, bottom sheet에 공통 상태를 적용했다.
- `held` occurrence는 일반 Calendar/Today projection에서 제외하고 접힌 복구 목록에 보존했다.

## Evidence

- [Audit](./audit.md)
- [Route evidence](./route-evidence.json)
- [Screenshots](./screenshots/)

## 현재 검증

- Production build: 통과
- Unit tests: `526 / 526` 통과
- Documentation graph: 통과 (`14` required files, `2496` local links)
- P25 whole-Flow + public share 회귀: `36 / 36` 통과
- 반복 회차 보류·복구·재개 회귀: `1 / 1` 통과
- 날짜 없는 개인 draft 배치·undo·reload 회귀: `1 / 1` 통과
- P24 frame + changed My Flow regressions: `8 / 8` 통과
- 모바일 `390x844`, wide `1024x768`: 가로 overflow `0`, 반복 회차 E2E console error `0`
- 실제 사용자 관찰: 실행하지 않음
