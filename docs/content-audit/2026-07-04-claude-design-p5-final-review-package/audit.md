# FlowMe P5 final audit

- 작성일: 2026-07-04
- 기준 branch: `codex/flowme-uxui-second-loop`
- 기준 commit: `7bf3bec`
- 범위: 홈, Flow 찾기, 공유 `/f/[slug]`, Flow Map 상세, My Flow, Calendar, 특수 workbench
- 원칙: 새 기능 없음. 4탭 IA 유지. `/f/[slug]` 공유 shell 유지. seed/source-backed 데이터와 저장/export 스키마 변경 없음.

## P5 기준선 감사

| 항목 | 판정 | evidence |
| --- | --- | --- |
| P5-01 공유 `/f/[slug]` 입력/저장 CTA hierarchy | 유지 확인 | `s04-01`~`s04-06` |
| P5-02 sticky bottom clearance | 유지 확인 | `s02-06`, `s05-03`, `s05-05`, `s06-03` |
| P5-03 My Flow 상태 라벨 반복 제거 | 유지 확인 | `s02-03`, `s03-02`, `s06-01` |
| P5-04 `/flows` 카드 CTA 경량화 | 유지 확인 | `02-flows-mobile`, `s01-03` |
| P5-05 날짜 입력 선택지/사용자용 날짜 포맷 | 유지 확인 | `s04-02`, `s04-03`, `s05-04` |
| P5-06 내부어 표시 제거 | 유지 확인 | `Mathbang`, `일정 지도`, `저장한 지도` scan 0건 |
| P5-07 냉장고 placeholder 정리 | 유지 확인 | `s05-01`, `s05-02`, `s05-03` |

## 시나리오 구성

| Scenario | 목적 | Screenshot |
| --- | --- | --- |
| s01 | 첫 진입에서 Flow 찾기까지 | 3장 |
| s02 | Flow 찾기에서 이사 Flow Map 저장 후 My Flow/Calendar | 6장 |
| s03 | 날짜 없는 중1 수학 Flow Map 저장 후 첫 실행 | 3장 |
| s04 | 공유 /f 저장 전/후와 My Flow 전환 | 6장 |
| s05 | 특수 workbench와 export 접근 | 7장 |
| s06 | 여러 Flow 저장 후 실행 허브 | 3장 |

## 자동 스캔 요약

- Horizontal overflow failures: 0
- Internal term hits: 0
- 콘텐츠 제목 끝 `Flow` 접미 hits: 0
- P5 표시어(`Mathbang`, `일정 지도`, `저장한 지도`) hits: 0
- Raw ISO visible text hits: 0

## Evidence table

| Kind | Scenario | URL | Label | Screenshot | Overflow | P5 term hits | ISO hits |
| --- | --- | --- | --- | --- | --- | --- | --- |
| route | - | `/` | 홈 첫 진입 | [01-home-mobile.png](./screenshots/01-home-mobile.png) | OK | 0 | 0 |
| route | - | `/flows` | Flow 찾기 목록 | [02-flows-mobile.png](./screenshots/02-flows-mobile.png) | OK | 0 | 0 |
| route | - | `/flow-maps/moving-d30` | Flow Map 이사 저장 전 | [03-flow-map-moving-mobile.png](./screenshots/03-flow-map-moving-mobile.png) | OK | 0 | 0 |
| route | - | `/flow-maps/middle-school-math-1` | Flow Map 수학 저장 전 | [04-flow-map-math-mobile.png](./screenshots/04-flow-map-math-mobile.png) | OK | 0 | 0 |
| route | - | `/f/vehicle-inspection-prep` | 공유 자동차검사 | [05-public-vehicle-mobile.png](./screenshots/05-public-vehicle-mobile.png) | OK | 0 | 0 |
| route | - | `/f/jeonse-contract-precheck-docs` | 공유 전세계약 서류 | [06-public-jeonse-mobile.png](./screenshots/06-public-jeonse-mobile.png) | OK | 0 | 0 |
| route | - | `/f/moving-d30-basic` | 공유 이사 D-30 | [07-public-moving-mobile.png](./screenshots/07-public-moving-mobile.png) | OK | 0 | 0 |
| route | - | `/f/fridge-cleanout-weekly-plan` | 냉장고 workbench | [08-public-fridge-mobile.png](./screenshots/08-public-fridge-mobile.png) | OK | 0 | 0 |
| route | - | `/f/washer-tub-clean-monthly` | 세탁기 workbench | [09-public-washer-mobile.png](./screenshots/09-public-washer-mobile.png) | OK | 0 | 0 |
| route | - | `/f/new-car-delivery-check` | 신차 인수 workbench | [10-public-new-car-mobile.png](./screenshots/10-public-new-car-mobile.png) | OK | 0 | 0 |
| route | - | `/f/used-car-buying-check` | 중고차 구매 workbench | [11-public-used-car-mobile.png](./screenshots/11-public-used-car-mobile.png) | OK | 0 | 0 |
| route | - | `/my` | My Flow 빈 상태 | [12-my-empty-mobile.png](./screenshots/12-my-empty-mobile.png) | OK | 0 | 0 |
| route | - | `/calendar` | 캘린더 빈 상태 | [13-calendar-empty-mobile.png](./screenshots/13-calendar-empty-mobile.png) | OK | 0 | 0 |
| scenario | s01 | `/` | 홈 첫 화면 | [s01-01-home-entry.png](./screenshots/s01-01-home-entry.png) | OK | 0 | 0 |
| scenario | s01 | `/flows` | Flow 찾기 상단 | [s01-02-flows-top.png](./screenshots/s01-02-flows-top.png) | OK | 0 | 0 |
| scenario | s01 | `/flows` | 첫 콘텐츠 카드 | [s01-03-first-card.png](./screenshots/s01-03-first-card.png) | OK | 0 | 0 |
| scenario | s02 | `/flow-maps/moving-d30` | 이사 Flow Map 저장 전 | [s02-01-moving-map-before-input.png](./screenshots/s02-01-moving-map-before-input.png) | OK | 0 | 0 |
| scenario | s02 | `/flow-maps/moving-d30` | 이사일 입력 후 | [s02-02-moving-map-date-entered.png](./screenshots/s02-02-moving-map-date-entered.png) | OK | 0 | 0 |
| scenario | s02 | `/my?savedMap=moving-d30` | 저장 직후 My Flow | [s02-03-post-save-my-flow.png](./screenshots/s02-03-post-save-my-flow.png) | OK | 0 | 0 |
| scenario | s02 | `/my?savedMap=moving-d30` | 첫 할 일 상세 | [s02-04-first-task-detail.png](./screenshots/s02-04-first-task-detail.png) | OK | 0 | 0 |
| scenario | s02 | `/calendar` | 저장 후 Calendar agenda | [s02-05-calendar-agenda.png](./screenshots/s02-05-calendar-agenda.png) | OK | 0 | 0 |
| scenario | s02 | `/calendar` | Calendar 하단 | [s02-06-calendar-bottom.png](./screenshots/s02-06-calendar-bottom.png) | OK | 0 | 0 |
| scenario | s03 | `/flow-maps/middle-school-math-1` | 중1 수학 저장 전 | [s03-01-math-map-before-save.png](./screenshots/s03-01-math-map-before-save.png) | OK | 0 | 0 |
| scenario | s03 | `/my?savedMap=middle-school-math-1` | 날짜 없는 콘텐츠 저장 후 | [s03-02-math-post-save.png](./screenshots/s03-02-math-post-save.png) | OK | 0 | 0 |
| scenario | s03 | `/my?savedMap=middle-school-math-1` | 날짜 없는 첫 할 일 상세 | [s03-03-math-first-task.png](./screenshots/s03-03-math-first-task.png) | OK | 0 | 0 |
| scenario | s04 | `/f/vehicle-inspection-prep` | 공유 자동차검사 저장 전 | [s04-01-vehicle-before-input.png](./screenshots/s04-01-vehicle-before-input.png) | OK | 0 | 0 |
| scenario | s04 | `/f/vehicle-inspection-prep` | 공유 자동차검사 날짜 입력 후 | [s04-02-vehicle-date-entered.png](./screenshots/s04-02-vehicle-date-entered.png) | OK | 0 | 0 |
| scenario | s04 | `/f/vehicle-inspection-prep` | 공유 자동차검사 저장 완료 | [s04-03-vehicle-after-save.png](./screenshots/s04-03-vehicle-after-save.png) | OK | 0 | 0 |
| scenario | s04 | `/my` | 공유 저장 후 My Flow | [s04-04-vehicle-my-flow.png](./screenshots/s04-04-vehicle-my-flow.png) | OK | 0 | 0 |
| scenario | s04 | `/f/jeonse-contract-precheck-docs` | 공유 전세계약 서류 | [s04-05-jeonse-before-save.png](./screenshots/s04-05-jeonse-before-save.png) | OK | 0 | 0 |
| scenario | s04 | `/f/moving-d30-basic` | 공유 이사 D-30 | [s04-06-public-moving.png](./screenshots/s04-06-public-moving.png) | OK | 0 | 0 |
| scenario | s05 | `/f/fridge-cleanout-weekly-plan` | 냉장고 workbench 첫 화면 | [s05-01-fridge-top.png](./screenshots/s05-01-fridge-top.png) | OK | 0 | 0 |
| scenario | s05 | `/f/fridge-cleanout-weekly-plan` | 냉장고 시트 영역 | [s05-02-fridge-sheet.png](./screenshots/s05-02-fridge-sheet.png) | OK | 0 | 0 |
| scenario | s05 | `/f/fridge-cleanout-weekly-plan` | 냉장고 하단 | [s05-03-fridge-bottom.png](./screenshots/s05-03-fridge-bottom.png) | OK | 0 | 0 |
| scenario | s05 | `/f/washer-tub-clean-monthly` | 세탁기 관리 카드 | [s05-04-washer-next-card.png](./screenshots/s05-04-washer-next-card.png) | OK | 0 | 0 |
| scenario | s05 | `/f/washer-tub-clean-monthly` | 세탁기 하단 | [s05-05-washer-bottom.png](./screenshots/s05-05-washer-bottom.png) | OK | 0 | 0 |
| scenario | s05 | `/f/new-car-delivery-check` | 신차 인수 workbench | [s05-06-new-car-top.png](./screenshots/s05-06-new-car-top.png) | OK | 0 | 0 |
| scenario | s05 | `/f/used-car-buying-check` | 중고차 구매 workbench | [s05-07-used-car-top.png](./screenshots/s05-07-used-car-top.png) | OK | 0 | 0 |
| scenario | s06 | `/my?savedMap=middle-school-math-1` | 여러 콘텐츠 저장 직후 | [s06-01-multiple-post-save.png](./screenshots/s06-01-multiple-post-save.png) | OK | 0 | 0 |
| scenario | s06 | `/my?savedMap=middle-school-math-1` | My Flow 저장 목록 | [s06-02-my-flow-saved-list.png](./screenshots/s06-02-my-flow-saved-list.png) | OK | 0 | 0 |
| scenario | s06 | `/my?savedMap=middle-school-math-1` | My Flow 하단 | [s06-03-my-flow-bottom.png](./screenshots/s06-03-my-flow-bottom.png) | OK | 0 | 0 |

## Claude에게 확인받을 질문

1. P5-01~P5-07을 닫힌 기준선으로 봐도 되는가?
2. 저장 후 My Flow와 Calendar evidence가 충분히 실행형 앱처럼 보이는가?
3. 공유 `/f/[slug]` shell은 계속 공유 진입 예외로 유지해도 되는가?
4. 특수 workbench들이 하나의 FlowMe 앱 톤으로 보이는가?
5. 다음 루프가 필요하다면 P6 backlog를 Blocking/High/Medium/Low로 작성해 달라.

## 남은 리스크

- 이 패키지는 screenshot/DOM evidence입니다. 실제 사용자 행동 검증은 아닙니다.
- Claude Design은 Vercel을 보지 못한다는 전제로 GitHub 파일과 screenshot만 검토해야 합니다.
