# FlowMe P6 final audit

- 작성일: 2026-07-04
- 기준 branch: `codex/flowme-uxui-second-loop`
- 기준 commit: `05a951a`
- 범위: 홈, Flow 찾기, 공유 `/f/[slug]`, Flow Map 상세, My Flow, Calendar, 특수 workbench, `/restart/moving-d30`
- 원칙: 새 기능 없음. 4탭 IA 유지. `/f/[slug]` 공유 shell 유지. seed/source-backed 데이터와 저장/export 스키마 변경 없음.

## P6 기준선 감사

| 항목 | 판정 | evidence |
| --- | --- | --- |
| P6-01 My Flow 첫 할 일 제목/상태 라벨 반복 제거 | 유지 확인 | `s02-03`, `s02-04`, `s03-02`, `s06-01` |
| P6-02 `/f`와 `/flow-maps` 하단 sticky clearance | 유지 확인 | `s07-01`~`s07-05` |
| P6-03 `/flow-maps` 저장 CTA + 4탭 하단 조작 영역 통합감 | 유지 확인 | `s02-01`, `s07-03`, `s07-04` |
| P6-04 `열어보기` CTA 문구 통일 | 유지 확인 | `s01-02`, `s01-03`, `s02-01` |
| P6-05 `확인할 항목`/`확인 항목` 중복 라벨 정리 | 유지 확인 | `s02-04`, `s03-03` |
| P6-06 홈 보조 링크 중복 완화 | 유지 확인 | `01-home-mobile`, `s01-01` |
| P6-07 workbench 중복 시작 CTA 제거 | 유지 확인 | `s05-01`~`s05-10` |
| P6-08 source brand/slug 표시 정리 | 유지 확인 | `AJD`, `Mathbang` prefix scan 0건 |

## 시나리오 구성

| Scenario | 목적 | Screenshot |
| --- | --- | --- |
| s01 | 첫 진입과 Flow 찾기 스캔 | 3장 |
| s02 | 이사 Flow Map 저장 후 My Flow/Calendar | 6장 |
| s03 | 날짜 없는 중1 수학 저장 후 첫 실행 | 3장 |
| s04 | 공유 /f 저장 전/후와 My Flow 전환 | 6장 |
| s05 | 특수 workbench와 restart 하단 접근성 | 10장 |
| s06 | 여러 Flow 저장 후 반복 사용자 실행 허브 | 3장 |
| s07 | 하단 sticky/fixed layer 최하단 확인 | 5장 |

## 자동 스캔 요약

- Horizontal overflow failures: 0
- Internal term hits: 0
- 콘텐츠 제목 끝 `Flow` 접미 hits: 0
- P6 표시어(`저장 전 보기`, `일정 지도`, `AJD ...`, `Mathbang ...`) hits: 0
- Raw ISO visible text hits outside `/restart`: 0
- `/restart/moving-d30` prototype raw ISO residual hits: 16
- Post-save repeated first-task title failures: 0

## Evidence table

| Kind | Scenario | URL | Label | Screenshot | Overflow | P6 term hits | ISO hits | Moving/Math first-title counts |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| route | - | `/` | 홈 첫 진입 | [01-home-mobile.png](./screenshots/01-home-mobile.png) | OK | 0 | 0 | 0/0 |
| route | - | `/flows` | Flow 찾기 목록 | [02-flows-mobile.png](./screenshots/02-flows-mobile.png) | OK | 0 | 0 | 1/1 |
| route | - | `/flow-maps/moving-d30` | 이사 Flow Map 저장 전 | [03-flow-map-moving-mobile.png](./screenshots/03-flow-map-moving-mobile.png) | OK | 0 | 0 | 2/0 |
| route | - | `/flow-maps/middle-school-math-1` | 중1 수학 Flow Map 저장 전 | [04-flow-map-math-mobile.png](./screenshots/04-flow-map-math-mobile.png) | OK | 0 | 0 | 0/2 |
| route | - | `/f/vehicle-inspection-prep` | 공유 자동차검사 | [05-public-vehicle-mobile.png](./screenshots/05-public-vehicle-mobile.png) | OK | 0 | 0 | 0/0 |
| route | - | `/f/jeonse-contract-precheck-docs` | 공유 전세계약 서류 | [06-public-jeonse-mobile.png](./screenshots/06-public-jeonse-mobile.png) | OK | 0 | 0 | 0/0 |
| route | - | `/f/moving-d30-basic` | 공유 이사 D-30 | [07-public-moving-mobile.png](./screenshots/07-public-moving-mobile.png) | OK | 0 | 0 | 0/0 |
| route | - | `/f/fridge-cleanout-weekly-plan` | 냉장고 workbench | [08-public-fridge-mobile.png](./screenshots/08-public-fridge-mobile.png) | OK | 0 | 0 | 0/0 |
| route | - | `/f/washer-tub-clean-monthly` | 세탁기 workbench | [09-public-washer-mobile.png](./screenshots/09-public-washer-mobile.png) | OK | 0 | 0 | 0/0 |
| route | - | `/f/new-car-delivery-check` | 신차 인수 workbench | [10-public-new-car-mobile.png](./screenshots/10-public-new-car-mobile.png) | OK | 0 | 0 | 0/0 |
| route | - | `/f/used-car-buying-check` | 중고차 구매 workbench | [11-public-used-car-mobile.png](./screenshots/11-public-used-car-mobile.png) | OK | 0 | 0 | 0/0 |
| route | - | `/restart/moving-d30` | 이사 restart prototype | [12-restart-moving-mobile.png](./screenshots/12-restart-moving-mobile.png) | OK | 0 | 4 | 0/0 |
| route | - | `/my` | My Flow 빈 상태 | [13-my-empty-mobile.png](./screenshots/13-my-empty-mobile.png) | OK | 0 | 0 | 0/0 |
| route | - | `/calendar` | 캘린더 빈 상태 | [14-calendar-empty-mobile.png](./screenshots/14-calendar-empty-mobile.png) | OK | 0 | 0 | 0/0 |
| scenario | s01 | `/` | 홈 첫 화면 | [s01-01-home-entry.png](./screenshots/s01-01-home-entry.png) | OK | 0 | 0 | 0/0 |
| scenario | s01 | `/flows` | Flow 찾기 상단 | [s01-02-flows-top.png](./screenshots/s01-02-flows-top.png) | OK | 0 | 0 | 1/1 |
| scenario | s01 | `/flows` | 첫 콘텐츠 카드 | [s01-03-first-card.png](./screenshots/s01-03-first-card.png) | OK | 0 | 0 | 1/1 |
| scenario | s02 | `/flow-maps/moving-d30` | 이사 Flow Map 저장 전 | [s02-01-moving-map-before-input.png](./screenshots/s02-01-moving-map-before-input.png) | OK | 0 | 0 | 2/0 |
| scenario | s02 | `/flow-maps/moving-d30` | 이사일 입력 후 | [s02-02-moving-map-date-entered.png](./screenshots/s02-02-moving-map-date-entered.png) | OK | 0 | 0 | 2/0 |
| scenario | s02 | `/my?savedMap=moving-d30` | 저장 직후 My Flow | [s02-03-post-save-my-flow.png](./screenshots/s02-03-post-save-my-flow.png) | OK | 0 | 0 | 1/0 |
| scenario | s02 | `/my?savedMap=moving-d30` | 첫 할 일 상세 | [s02-04-first-task-detail.png](./screenshots/s02-04-first-task-detail.png) | OK | 0 | 0 | 1/0 |
| scenario | s02 | `/calendar` | 저장 후 Calendar agenda | [s02-05-calendar-agenda.png](./screenshots/s02-05-calendar-agenda.png) | OK | 0 | 0 | 0/0 |
| scenario | s02 | `/calendar` | Calendar 하단 | [s02-06-calendar-bottom.png](./screenshots/s02-06-calendar-bottom.png) | OK | 0 | 0 | 0/0 |
| scenario | s03 | `/flow-maps/middle-school-math-1` | 중1 수학 저장 전 | [s03-01-math-map-before-save.png](./screenshots/s03-01-math-map-before-save.png) | OK | 0 | 0 | 0/2 |
| scenario | s03 | `/my?savedMap=middle-school-math-1` | 날짜 없는 콘텐츠 저장 후 | [s03-02-math-post-save.png](./screenshots/s03-02-math-post-save.png) | OK | 0 | 0 | 0/1 |
| scenario | s03 | `/my?savedMap=middle-school-math-1` | 날짜 없는 첫 할 일 상세 | [s03-03-math-first-task.png](./screenshots/s03-03-math-first-task.png) | OK | 0 | 0 | 0/1 |
| scenario | s04 | `/f/vehicle-inspection-prep` | 공유 자동차검사 저장 전 | [s04-01-vehicle-before-input.png](./screenshots/s04-01-vehicle-before-input.png) | OK | 0 | 0 | 0/0 |
| scenario | s04 | `/f/vehicle-inspection-prep` | 공유 자동차검사 날짜 입력 후 | [s04-02-vehicle-date-entered.png](./screenshots/s04-02-vehicle-date-entered.png) | OK | 0 | 0 | 0/0 |
| scenario | s04 | `/f/vehicle-inspection-prep` | 공유 자동차검사 저장 완료 | [s04-03-vehicle-after-save.png](./screenshots/s04-03-vehicle-after-save.png) | OK | 0 | 0 | 0/0 |
| scenario | s04 | `/my` | 공유 저장 후 My Flow | [s04-04-vehicle-my-flow.png](./screenshots/s04-04-vehicle-my-flow.png) | OK | 0 | 0 | 0/0 |
| scenario | s04 | `/f/jeonse-contract-precheck-docs` | 공유 전세계약 서류 | [s04-05-jeonse-before-save.png](./screenshots/s04-05-jeonse-before-save.png) | OK | 0 | 0 | 0/0 |
| scenario | s04 | `/f/moving-d30-basic` | 공유 이사 D-30 | [s04-06-public-moving.png](./screenshots/s04-06-public-moving.png) | OK | 0 | 0 | 0/0 |
| scenario | s05 | `/f/fridge-cleanout-weekly-plan` | 냉장고 workbench 첫 화면 | [s05-01-fridge-top.png](./screenshots/s05-01-fridge-top.png) | OK | 0 | 0 | 0/0 |
| scenario | s05 | `/f/fridge-cleanout-weekly-plan` | 냉장고 시트 영역 | [s05-02-fridge-sheet.png](./screenshots/s05-02-fridge-sheet.png) | OK | 0 | 0 | 0/0 |
| scenario | s05 | `/f/fridge-cleanout-weekly-plan` | 냉장고 하단 | [s05-03-fridge-bottom.png](./screenshots/s05-03-fridge-bottom.png) | OK | 0 | 0 | 0/0 |
| scenario | s05 | `/f/washer-tub-clean-monthly` | 세탁기 관리 카드 | [s05-04-washer-next-card.png](./screenshots/s05-04-washer-next-card.png) | OK | 0 | 0 | 0/0 |
| scenario | s05 | `/f/washer-tub-clean-monthly` | 세탁기 하단 | [s05-05-washer-bottom.png](./screenshots/s05-05-washer-bottom.png) | OK | 0 | 0 | 0/0 |
| scenario | s05 | `/f/new-car-delivery-check` | 신차 인수 workbench | [s05-06-new-car-top.png](./screenshots/s05-06-new-car-top.png) | OK | 0 | 0 | 0/0 |
| scenario | s05 | `/f/used-car-buying-check` | 중고차 구매 workbench | [s05-07-used-car-top.png](./screenshots/s05-07-used-car-top.png) | OK | 0 | 0 | 0/0 |
| scenario | s05 | `/restart/moving-d30` | 이사 restart 첫 화면 | [s05-08-restart-top.png](./screenshots/s05-08-restart-top.png) | OK | 0 | 4 | 0/0 |
| scenario | s05 | `/restart/moving-d30` | 이사 restart 출처 영역 | [s05-09-restart-source.png](./screenshots/s05-09-restart-source.png) | OK | 0 | 4 | 0/0 |
| scenario | s05 | `/restart/moving-d30` | 이사 restart 하단 | [s05-10-restart-bottom.png](./screenshots/s05-10-restart-bottom.png) | OK | 0 | 4 | 0/0 |
| scenario | s06 | `/my?savedMap=middle-school-math-1` | 여러 콘텐츠 저장 직후 | [s06-01-multiple-post-save.png](./screenshots/s06-01-multiple-post-save.png) | OK | 0 | 0 | 0/1 |
| scenario | s06 | `/my?savedMap=middle-school-math-1` | My Flow 저장 목록 | [s06-02-my-flow-saved-list.png](./screenshots/s06-02-my-flow-saved-list.png) | OK | 0 | 0 | 1/1 |
| scenario | s06 | `/my?savedMap=middle-school-math-1` | My Flow 하단 | [s06-03-my-flow-bottom.png](./screenshots/s06-03-my-flow-bottom.png) | OK | 0 | 0 | 1/1 |
| scenario | s07 | `/f/vehicle-inspection-prep` | 공유 자동차검사 최하단 | [s07-01-public-vehicle-bottom.png](./screenshots/s07-01-public-vehicle-bottom.png) | OK | 0 | 0 | 0/0 |
| scenario | s07 | `/f/moving-d30-basic` | 공유 이사 D-30 최하단 | [s07-02-public-moving-bottom.png](./screenshots/s07-02-public-moving-bottom.png) | OK | 0 | 0 | 0/0 |
| scenario | s07 | `/flow-maps/moving-d30` | 이사 Flow Map 최하단 | [s07-03-flow-map-moving-bottom.png](./screenshots/s07-03-flow-map-moving-bottom.png) | OK | 0 | 0 | 2/0 |
| scenario | s07 | `/flow-maps/middle-school-math-1` | 중1 수학 Flow Map 최하단 | [s07-04-flow-map-math-bottom.png](./screenshots/s07-04-flow-map-math-bottom.png) | OK | 0 | 0 | 0/2 |
| scenario | s07 | `/calendar` | 캘린더 빈 상태 최하단 | [s07-05-calendar-bottom-clean.png](./screenshots/s07-05-calendar-bottom-clean.png) | OK | 0 | 0 | 0/0 |

## Claude에게 확인받을 질문

1. P6-01~P6-08을 닫힌 기준선으로 봐도 되는가?
2. 저장 후 My Flow와 Calendar evidence가 충분히 실행형 앱처럼 보이는가?
3. `/flow-maps/[map]` 하단 CTA와 4탭 nav가 아직 2단 fixed UI처럼 보이는가?
4. 공유 `/f/[slug]` shell은 계속 공유 진입 예외로 유지해도 되는가?
5. 다음 루프가 필요하다면 P7 backlog를 Blocking/High/Medium/Low로 작성해 달라.

## 남은 리스크

- 이 패키지는 screenshot/DOM evidence입니다. 실제 사용자 행동 검증은 아닙니다.
- Claude Design은 Vercel을 보지 못한다는 전제로 GitHub 파일과 screenshot만 검토해야 합니다.
- `/restart/moving-d30`는 prototype route라 raw ISO residual을 별도 기록했습니다. 일반 사용자 route의 P6 blocker와 분리해서 P7 후보 여부만 판단해 주세요.
