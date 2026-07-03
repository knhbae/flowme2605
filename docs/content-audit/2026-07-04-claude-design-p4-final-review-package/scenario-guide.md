# Claude Design P4 scenario screenshot guide

이 문서는 route별 정적 screenshot만으로 부족한 흐름 판단을 보강하기 위한 시나리오별 screenshot index다. 각 이미지는 모바일 390 x 844 viewport의 실제 화면이다.

- 생성일: 2026-07-03T21:59:21.618Z
- 브랜치: `codex/flowme-uxui-second-loop`
- 기준 커밋: `3b7c695`
- base URL: `http://127.0.0.1:3104`
- 스크린샷 수: 24
- validation: passed

## Claude에게 보는 방식

1. 먼저 [review.html](./review.html)에서 route별 현재 기준선을 본다.
2. 그 다음 [scenario-review.html](./scenario-review.html)에서 아래 사용자 흐름을 순서대로 본다.
3. 저장 후 My Flow와 Calendar는 실제 저장 루프로 캡처했으므로 빈 상태 evidence가 아니다.
4. 문제가 있으면 route명보다 scenario/step 기준으로 P5 backlog를 작성한다.

## s01. 처음 온 사용자: 홈에서 Flow 찾기로 이동

| Screenshot | 장면 | URL | 확인 포인트 |
| --- | --- | --- | --- |
| [s01-01-home-entry.png](./scenario-screenshots/s01-01-home-entry.png) | 홈 첫 진입 | `/` | 처음 온 사용자가 핵심 행동과 대표 추천 콘텐츠를 보는 화면 |
| [s01-02-flow-finding-top.png](./scenario-screenshots/s01-02-flow-finding-top.png) | Flow 찾기 상단 | `/flows` | 홈 CTA 이후 통합 콘텐츠 목록 상단 |
| [s01-03-first-content-card.png](./scenario-screenshots/s01-03-first-content-card.png) | 첫 콘텐츠 카드 | `/flows` | 카드의 제목, 결과 약속, 먼저 할 일, CTA를 확인 |

## s02. 날짜 있는 Flow Map 저장: 이사 D-30

| Screenshot | 장면 | URL | 확인 포인트 |
| --- | --- | --- | --- |
| [s02-01-moving-map-before-input.png](./scenario-screenshots/s02-01-moving-map-before-input.png) | 이사 Flow Map 저장 전 | `/flow-maps/moving-d30` | 입력, 저장 결과, 먼저 할 일이 한 화면에 보이는지 확인 |
| [s02-02-moving-map-date-entered.png](./scenario-screenshots/s02-02-moving-map-date-entered.png) | 이사일 입력 후 | `/flow-maps/moving-d30` | 날짜 입력 후 저장 CTA와 결과 예측이 유지되는지 확인 |
| [s02-03-post-save-my-flow.png](./scenario-screenshots/s02-03-post-save-my-flow.png) | 저장 후 My Flow | `/my?savedMap=moving-d30` | 저장 완료보다 첫 실행 항목이 먼저 보이는지 확인 |
| [s02-04-first-task-detail.png](./scenario-screenshots/s02-04-first-task-detail.png) | 첫 실행 항목 열기 | `/my?savedMap=moving-d30` | 체크 항목과 상세/메모가 과하게 노출되지 않는지 확인 |
| [s02-05-calendar-first-agenda.png](./scenario-screenshots/s02-05-calendar-first-agenda.png) | 저장 후 캘린더 첫 agenda | `/calendar` | 가장 가까운 일정 agenda가 먼저 보이는지 확인 |
| [s02-06-calendar-move-day-selected.png](./scenario-screenshots/s02-06-calendar-move-day-selected.png) | 이사일 선택 | `/calendar` | 월간 달력에서 다른 저장 일정으로 이동했을 때 agenda가 이해되는지 확인 |

## s03. 공유 링크 공개 Flow 저장: 자동차검사

| Screenshot | 장면 | URL | 확인 포인트 |
| --- | --- | --- | --- |
| [s03-01-public-flow-before-input.png](./scenario-screenshots/s03-01-public-flow-before-input.png) | 공유 Flow 저장 전 | `/f/vehicle-inspection-prep` | 공유 shell과 저장 CTA가 주 행동으로 보이는지 확인 |
| [s03-02-public-flow-date-entered.png](./scenario-screenshots/s03-02-public-flow-date-entered.png) | 공유 Flow 날짜 입력 | `/f/vehicle-inspection-prep` | 입력 UI가 한 곳의 주 입력으로 보이는지 확인 |
| [s03-03-public-flow-after-save.png](./scenario-screenshots/s03-03-public-flow-after-save.png) | 공유 Flow 저장 완료 | `/f/vehicle-inspection-prep` | 저장 후 같은 공유 화면에서 다음 이동이 명확한지 확인 |
| [s03-04-public-flow-my-flow.png](./scenario-screenshots/s03-04-public-flow-my-flow.png) | 공유 Flow 저장 후 My Flow | `/my` | 공유 shell에서 앱 shell 실행 허브로 이어지는지 확인 |

## s04. 날짜 없는 Flow Map 저장: 중1 수학

| Screenshot | 장면 | URL | 확인 포인트 |
| --- | --- | --- | --- |
| [s04-01-math-map-before-save.png](./scenario-screenshots/s04-01-math-map-before-save.png) | 날짜 없는 콘텐츠 저장 전 | `/flow-maps/middle-school-math-1` | 기준일 없이도 저장할 콘텐츠와 첫 행동을 이해할 수 있는지 확인 |
| [s04-02-math-post-save-my-flow.png](./scenario-screenshots/s04-02-math-post-save-my-flow.png) | 날짜 없는 콘텐츠 저장 후 | `/my?savedMap=middle-school-math-1` | 빈 상태 대신 첫 실행 항목이 보이는지 확인 |
| [s04-03-math-first-task-open.png](./scenario-screenshots/s04-03-math-first-task-open.png) | 날짜 없는 콘텐츠 첫 항목 열기 | `/my?savedMap=middle-school-math-1` | 진도/체크 실행 구조가 바로 보이는지 확인 |

## s05. 반복 사용자: 여러 콘텐츠 저장 후 My Flow

| Screenshot | 장면 | URL | 확인 포인트 |
| --- | --- | --- | --- |
| [s05-01-multiple-post-save.png](./scenario-screenshots/s05-01-multiple-post-save.png) | 여러 콘텐츠 저장 후 진입 | `/my?savedMap=middle-school-math-1` | 방금 저장한 콘텐츠의 첫 실행 항목과 기존 저장 항목이 충돌하지 않는지 확인 |
| [s05-02-my-flow-all-content.png](./scenario-screenshots/s05-02-my-flow-all-content.png) | My Flow 전체 보기 | `/my?savedMap=middle-school-math-1` | 반복 사용자가 저장 콘텐츠와 다음 할 일을 빠르게 구분하는지 확인 |

## s06. 특수 workbench/export 화면

| Screenshot | 장면 | URL | 확인 포인트 |
| --- | --- | --- | --- |
| [s06-01-export-first-moving.png](./scenario-screenshots/s06-01-export-first-moving.png) | export-first 공개 화면 | `/f/moving-d30-basic` | 이사일 입력 후 캘린더/시트 결과를 예측할 수 있는지 확인 |
| [s06-02-mobile-export-sheet.png](./scenario-screenshots/s06-02-mobile-export-sheet.png) | 모바일 export 선택지 | `/f/moving-d30-basic` | 캘린더 파일/시트/메모 결과 라벨이 예측 가능한지 확인 |
| [s06-03-baby-food-menu-calendar.png](./scenario-screenshots/s06-03-baby-food-menu-calendar.png) | 이유식 메뉴 캘린더 | `/f/baby-food-menu-recipe` | 시작일 기준 식단표와 원문 기준이 보조 정보로 정리되는지 확인 |
| [s06-04-fridge-sheet-workbench.png](./scenario-screenshots/s06-04-fridge-sheet-workbench.png) | 냉장고 파먹기 시트 | `/f/fridge-cleanout-weekly-plan` | sheet형 실행 화면이 주요 카드 톤과 맞는지 확인 |
| [s06-05-home-workout-source-result.png](./scenario-screenshots/s06-05-home-workout-source-result.png) | 정확한 영상 source/result | `/f/real-thankyou-bubu-home-workout-starter` | 영상 근거와 실행 결과 카드가 조용한 보조 위계인지 확인 |
| [s06-06-washer-maintenance-routine.png](./scenario-screenshots/s06-06-washer-maintenance-routine.png) | 세탁기 통세척 관리 루틴 | `/f/washer-tub-clean-monthly` | 관리 루틴 카드와 source bridge visual polish를 확인 |


## 검증 요약

- 내부 검토/계층 문구 hit: 0건
- 콘텐츠 제목 끝 `Flow` 접미 hit: 0건
- horizontal overflow failure: 0건
