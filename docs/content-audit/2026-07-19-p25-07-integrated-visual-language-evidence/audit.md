# P25-07 audit

## 이전 문제

My Flow의 완료, 열기, 실행 메모는 32~36px 조작과 서로 다른 button 스타일을 사용했다. 행은 Flow/date metadata를 먼저 보여 제목이 약했고, Calendar wide는 화면 설명, 색상 count badge, scope filter, routine legend를 동시에 노출했다. `언제든`은 날짜 없는 할 일을 어떻게 써야 하는지 설명하지 못했다. 반복 회차 `보류`는 상태 칩만 붙인 채 Today와 Calendar에 계속 남아 ordinary execution과 recovery가 섞였다.

## 시각 언어 계약

| 영역 | 계약 |
| --- | --- |
| 표면 | 최대 `8px` radius, 얕은 border/shadow, nested card 최소화 |
| primary | ink 배경 한 종류, Flow 색을 command 색으로 사용하지 않음 |
| 실행 행 | 제목 우선, 공통 meta 아래, 완료 왼쪽, 열기·메모 오른쪽 |
| touch target | 완료·메모 `44x44px` 이상 |
| Calendar | grid는 compact, agenda는 full detail, 설명/별도 legend 제거 |
| 날짜 없음 | `날짜 없는 할 일`이 실행 목록, `날짜 정하기`가 Calendar 배치入口 |
| 보류 | ordinary execution 0건, 접힌 recovery entry에서 stable occurrence 복구 |

## 보류 상태 판단

`held`는 삭제나 완료가 아니다. projection source와 execution record를 보존한 채 일반 실행 목록에서만 숨긴다. My Flow `내 Flow` 화면에 `보류한 일정 · N개`를 제공하고, 행을 열면 기존 `다시 진행` action으로 `reopened` 전환한다. 전환 후 같은 occurrence ID가 Calendar에 다시 나타난다.

source/risk review 때문에 실행이 막힌 전체 Flow는 기존 정책대로 workspace 자체에서 제외한다. 이번 변경은 개인 반복 occurrence의 `held` 상태에만 적용한다.

## 브라우저 확인

- My Flow mobile/wide: 할 일 제목이 meta보다 먼저 보인다.
- 완료 label shell과 실행 메모 button의 측정 크기는 각각 최소 `44px`다.
- 모바일 행은 제목이 길 때 줄바꿈되며 조작과 겹치지 않는다.
- Calendar mobile/wide: 설명 문장과 routine legend가 없고 scope/month control은 같은 segmented/compact 스타일을 사용한다.
- 날짜 없는 개인 draft는 My Flow에 남고 Calendar `날짜 정하기` tray에서 날짜 지정, undo, reload가 유지된다.
- mobile/wide 캡처에서 horizontal overflow는 0이다.

## 검증 경계

자동 검증은 DOM 순서, 터치 영역, 상태 projection, keyboard 전환, persistence, overflow, console error를 확인한다. 사용자가 `날짜 없는 할 일`을 별도 설명 없이 이해하는지, 새 neutral visual language가 충분히 정돈되어 보이는지, 보류 복구 위치를 실제로 찾는지는 관찰 전에는 확정하지 않는다.

첫 통합 Playwright 실행은 빌드 전에 남은 3104 포트의 stale production process를 재사용해 실패했다. 포트 소유 프로세스를 종료하고 현재 build로 다시 실행한 결과 `36 / 36`이 통과했다. 실패 실행을 제품 회귀로 계산하지 않는다.

최종 현재 실행 결과는 unit `526 / 526`, docs graph, production build, P25 whole-Flow/public `36 / 36`, P24 frame 및 변경된 My Flow 회귀 `8 / 8`, recurrence hold/reopen `1 / 1`, date-free placement `1 / 1`이다.
