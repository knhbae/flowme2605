# FlowMe Claude Design P4 final audit

- 작성일: 2026-07-04
- 기준 브랜치: `codex/flowme-uxui-second-loop`
- 기준 커밋: `f1bfcf2`
- 범위: 홈, Flow 찾기, 공개 Flow 상세, Flow Map 상세, My Flow, 캘린더, 특수 workbench
- 원칙: 새 기능 추가 없음. 4탭 IA, 공유용 `/f/[slug]` shell, seed/source-backed 구조, 저장/실행/export 스키마 유지.

## P4-01 제목 Flow 접미 제거

- 일반 사용자 route의 콘텐츠 제목 끝 `Flow` 접미를 표시 레이어에서 제거하는 기준을 유지했다.
- 브랜드/탭 문맥인 `FLOW`, `Flow 찾기`, `내 Flow`, `FlowMe`는 허용한다.
- route evidence의 `flowSuffixLines` 결과: 0건

## P4-02/P4-03 공개 Flow 공유 shell + 저장 CTA

- `/f/[slug]`는 공유 진입 화면으로 유지한다.
- 저장 전에는 하단 4탭을 강제 편입하지 않고 `flow-public-shell`과 `내 Flow에 저장` CTA 중심으로 둔다.
- 저장 후에는 `/my`로 이동해 기존 4탭 app shell과 My Flow 실행 허브로 이어진다.
- 확인한 공개 route 수: 9개

## P4-04 홈 설명형 카드 축소

- 홈은 사용법 설명보다 `콘텐츠 고르러 가기`와 추천 콘텐츠 저장 결과 약속 중심으로 확인했다.
- `시작 경로`식 단계 설명 카드 없이 첫 행동과 대표 저장 결과가 먼저 보인다.

## P4-05 특수 workbench visual polish

- 특수 public workbench route에서 warm background, `#E7E4DD` border, 16px card radius, 12px action radius 기준을 확인했다.
- 대상 route: moving D-30, computer skills, new car, used car, baby food, home workout, fridge cleanout, washer tub clean.
- visual token 세부값은 [route-evidence.json](./route-evidence.json)의 `visualChecks`에 기록했다.

## 저장 후 evidence

- `/flow-maps/moving-d30`에서 이사일 `2026-07-22`를 입력하고 실제 저장 CTA를 눌러 `/my?savedMap=moving-d30`를 캡처했다.
- 같은 브라우저 컨텍스트에서 `/calendar`로 이동해 저장된 agenda를 캡처했다.
- My Flow post-save true empty state: 노출 안 됨
- Calendar after-save true empty state: 노출 안 됨

## Scenario evidence

route별 첫 화면만으로는 저장 전후 흐름을 판단하기 어려워, [scenario-review.html](./scenario-review.html)과 [scenario-guide.md](./scenario-guide.md)를 추가했다.

- 시나리오 수: 6개
- scenario screenshot 수: 24장
- 포함 흐름: 홈 → Flow 찾기, 이사 Flow Map 저장 → My Flow → Calendar, 공개 Flow 저장 → My Flow, 날짜 없는 콘텐츠 저장, 여러 콘텐츠 저장 상태, 특수 workbench/export
- scenario validation: 내부 문구 0건, 콘텐츠 제목 끝 `Flow` 접미 0건, horizontal overflow 0건

## Route evidence

| Route | 상태 | H1 | shell/nav | Screenshot | Overflow |
| --- | --- | --- | --- | --- | --- |
| `/` | clean localStorage | 콘텐츠를 일정과 할 일로 저장 | 홈 | [01-home-mobile.png](./screenshots/01-home-mobile.png) | OK |
| `/flows` | clean localStorage | 무엇을 저장할까요? | Flow 찾기 | [02-flows-mobile.png](./screenshots/02-flows-mobile.png) | OK |
| `/f/vehicle-inspection-prep` | clean localStorage | 자동차검사 D-14 준비 | share shell | [03-public-vehicle-inspection-mobile.png](./screenshots/03-public-vehicle-inspection-mobile.png) | OK |
| `/f/moving-d30-basic` | clean localStorage | 이사 D-30 준비 | share shell | [04-public-moving-basic-mobile.png](./screenshots/04-public-moving-basic-mobile.png) | OK |
| `/f/computer-skills-d30-study` | clean localStorage | 컴퓨터활용능력 D-30 학습 | share shell | [05-public-computer-skills-mobile.png](./screenshots/05-public-computer-skills-mobile.png) | OK |
| `/f/new-car-delivery-check` | clean localStorage | 신차 인수 점검 | share shell | [06-public-new-car-mobile.png](./screenshots/06-public-new-car-mobile.png) | OK |
| `/f/used-car-buying-check` | clean localStorage | 중고차 구매 현장 점검 | share shell | [07-public-used-car-mobile.png](./screenshots/07-public-used-car-mobile.png) | OK |
| `/f/baby-food-menu-recipe` | clean localStorage | 초기 이유식 메뉴·레시피 | share shell | [08-public-baby-food-mobile.png](./screenshots/08-public-baby-food-mobile.png) | OK |
| `/f/real-thankyou-bubu-home-workout-starter` | clean localStorage | ThankyouBUBU 홈트 시작 | share shell | [09-public-home-workout-mobile.png](./screenshots/09-public-home-workout-mobile.png) | OK |
| `/f/fridge-cleanout-weekly-plan` | clean localStorage | 냉장고 파먹기 7일 재고 소진 | share shell | [10-public-fridge-cleanout-mobile.png](./screenshots/10-public-fridge-cleanout-mobile.png) | OK |
| `/f/washer-tub-clean-monthly` | clean localStorage | 세탁기 통세척 월간 관리 | share shell | [11-public-washer-clean-mobile.png](./screenshots/11-public-washer-clean-mobile.png) | OK |
| `/flow-maps/moving-d30` | clean localStorage | 원룸 이사 D-30 일정 지도 | Flow 찾기 | [12-flow-map-moving-mobile.png](./screenshots/12-flow-map-moving-mobile.png) | OK |
| `/flow-maps/middle-school-math-1` | clean localStorage | 중1 수학 목차 진도표 | Flow 찾기 | [13-flow-map-math-mobile.png](./screenshots/13-flow-map-math-mobile.png) | OK |
| `/my?savedMap=moving-d30` | after saving moving-d30 with 2026-07-22 | 내 Flow | 내 Flow | [14-post-save-my-flow-moving-mobile.png](./screenshots/14-post-save-my-flow-moving-mobile.png) | OK |
| `/calendar` | after saving moving-d30 with 2026-07-22 | 캘린더 | 캘린더 | [15-calendar-after-save-mobile.png](./screenshots/15-calendar-after-save-mobile.png) | OK |

## 회귀 스캔

- 내부 검토/계층 문구: 0건
- 콘텐츠 제목 끝 `Flow` 접미: 0건
- horizontal overflow: 0건

## Verification snapshot

이 패키지는 screenshot/evidence 생성과 최종 명령 검증까지 수행한 결과다.

- 모바일 390px evidence 생성: 15개 screenshot, `route-evidence.json` validation passed
- 모바일 390px scenario evidence 생성: 24개 screenshot, `scenario-evidence.json` validation passed
- P4 관련 targeted Playwright E2E: 11 passed
- `npm.cmd test`: 276 passed
- `npm.cmd run docs:check`: passed, 14 required files and 1298 local links
- `npm.cmd run build`: passed
- `git diff --check`: passed

## Claude에게 확인받을 질문

1. P4-01~P4-05를 닫아도 되는지, 다시 열어야 하는 항목이 있는지 판단해 달라.
2. `/f/[slug]` 공유 shell 정책이 저장 전 화면에는 충분히 자연스러운지 판단해 달라.
3. My Flow와 Calendar 저장 후 화면이 실행형 앱처럼 보이는지 다시 평가해 달라.
4. 특수 workbench 화면의 visual polish가 주요 4탭 화면과 같은 제품처럼 보이는지 평가해 달라.
5. 다음 루프가 필요하다면 Blocking/High/Medium/Low로 P5 backlog를 작성해 달라.

## 남은 리스크

| 우선순위 | 항목 | 설명 | 다음 판단 |
| --- | --- | --- | --- |
| Review | P5 후보 | P4 route evidence 기준으로는 회귀가 없지만, Claude Design이 screenshot만 보고 남은 밀도/톤/CTA 문제를 다시 판단해야 한다. | Claude 재검토 결과를 P5 backlog로 전환 |
