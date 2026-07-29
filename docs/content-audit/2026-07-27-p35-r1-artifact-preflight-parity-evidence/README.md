# P35-R1 Primary artifact preflight parity evidence

- 작성일: 2026-07-27
- 작업 브랜치: `codex/p35-mece-ux-reset`
- 기준 `origin/main`: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- 선행 owner checkpoint: `P35-R0 approved_after_revision`
- 실제 관찰 사용자 수: `0`

## 판정

`P35-R1`의 public 저장 전 결과와 외부 가져가기 preflight가 같은
`FlowExperienceProjection`과 `ArtifactRecommendationVM`을 읽도록 연결했다.

대표 결과는 다음처럼 일치한다.

| Flow | 저장 전 첫 결과 | 가져가기 primary | 수량 |
| --- | --- | --- | ---: |
| 이사 준비 | Calendar | Calendar | 24 |
| 차량 점검 | Checklist | Checklist | 10 |
| 중1 수학 | Sheet | Sheet | 8 |
| 해외 안전 가이드 | Memo | Memo | 4 |

운동 routine은 서로 다른 수량을 한 숫자로 합치지 않는다.

- source 실행 Item: `1개`
- ICS 반복 series: `1개`
- 현재 범위에 표시되는 occurrence: `12개`

날짜를 확정하기 전에는 Calendar를 실행 가능한 결과로 노출하지 않고,
날짜 확정 후에만 반복 series를 받을 수 있다.

## 구현

1. `buildArtifactPreflightVM`이 public preview의 primary 1개와 secondary 최대
   2개를 export destination으로 변환한다.
2. `ArtifactWorkbench`의 public export disclosure가 이 destination 목록,
   primary destination, schedule 상태, 예상 수량을 그대로 받는다.
3. `FlowExportPanel`은 각 결과 버튼에 destination, count, ready/disabled,
   recommendation role을 표시해 preview와 export의 수량 정합성을 검증할 수 있다.
4. 지원되지 않거나 아직 준비되지 않은 결과는 보이는 disabled control로
   남기지 않는다.
5. source, personal overlay, execution run, occurrence, export identity와
   localStorage schema는 변경하지 않았다.

## Screenshot

- [이사 Calendar 24개 preflight, 390px](./screenshots/p35-r1-public-preflight-moving-390.png)
- [운동 series 1개와 표시 회차 12개, 1024px](./screenshots/p35-r1-public-preflight-routine-1024.png)
- [가이드 Memo 4개 preflight, 1024px](./screenshots/p35-r1-public-preflight-shapes-1024.png)

## 검증

- pretest: `81 / 81` 통과
- unit: `590 / 590` 통과
- P35-R1 targeted E2E: `3 / 3` 통과
- 기존 P35 public/export E2E: `8 / 8` 통과
- production build: 통과
- scoped `git diff --check`: 오류 없음
- 390px / 1024px:
  - horizontal overflow `0`
  - unnamed visible interactive control `0`
  - visible disabled export control `0`
  - console/page error `0`

전체 E2E와 독립 final gate는 `P35-R7`에서 다시 실행한다.

## Publish

- commit: 없음
- push: 없음
- PR: 없음
- merge: 없음
- preview 배포: 없음
- production 배포: 없음

자동화와 screenshot 검증은 실제 사용자 관찰이 아니다.
