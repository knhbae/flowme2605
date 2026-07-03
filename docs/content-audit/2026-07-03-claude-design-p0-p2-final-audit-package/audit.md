# FlowMe Claude Design P0~P2 final audit

- 작성일: 2026-07-03
- 기준 브랜치: `codex/flowme-uxui-second-loop`
- 범위: 홈, Flow 찾기, 공개 Flow 상세, Flow Map 상세, My Flow, 캘린더, export UX
- 원칙: 새 기능 추가 없음. 4탭 IA, seed/source-backed 구조, 저장/실행/export 스키마 유지.

## 적용 요약

| 영역 | 상태 | 감사 판단 |
| --- | --- | --- |
| P0 | 완료 | 저장 직후 첫 실행 항목, 날짜 copy, 내부 제작 문구 노출 방지, 필수 입력 feedback이 기준선에 들어왔다. |
| P1 | 완료 | `/flows`, `/flow-maps/[map]`, `/f/[slug]`, `/my`, `/calendar`의 첫 화면을 행동/결과 중심으로 압축했다. |
| P2 | 완료 | export 라벨, true empty state, fixed layer, 진행 표시, 디자인 토큰 마감을 정리했다. |

## P3-01 재검증 결론

- 결론: 앱 저장/복원 버그가 아니라 final audit evidence 생성 오류였다.
- 원인: 이전 `07-post-save-my-flow-mobile.png`, `08-calendar-after-save-mobile.png` 캡처는 실제 저장 후 브라우저 localStorage 상태를 유지하지 못한 상태에서 생성된 것으로 보인다.
- 재현 결과: 모바일 390px에서 `/flow-maps/moving-d30`에 이사일 `2026-07-22`를 입력하고 저장하면 `flow:saved:source-backed-moving-d30`, `flow:map:saved:moving-d30` 등 저장 키가 기록된다.
- 현재 evidence: `/my?savedMap=moving-d30`는 `이사 방식과 견적 후보 정하기` 첫 실행 항목을 보여주고, `/calendar`는 `7월 8일 (수)` 선택일 agenda와 `입주청소와 대형폐기물 일정 확인`을 보여준다.
- 고정 장치: `tests/e2e/flow-mvp.spec.ts`에 저장 후 My Flow/Calendar가 true empty state로 회귀하지 않는 assertion을 추가했고, `scripts/content-audit/capture-claude-p0-p2-final-evidence.mjs`로 같은 브라우저 컨텍스트에서 저장 후 증거를 재생성한다.

## P3-02 화면 밀도 정리

- 저장 후 My Flow 배너는 확인/라우터 역할로 낮췄다. 이제 `저장됨`, 콘텐츠명, 첫 실행 항목, `먼저 열기`, `전체 보기`만 먼저 보인다.
- 배너의 반복 설명과 중복 카운트인 `먼저 할 일부터 열어보세요`, `5개 할 일`, `지난 일정 ...`은 제거했다.
- My Flow Today 첫 카드의 모바일 도움말 문장은 숨기고, 항목 제목과 `열기` 행동을 더 먼저 읽히게 했다.
- Calendar 선택일 카드에서는 모바일 기준 `선택한 날짜`, `0개 루틴`, 단일 일정의 `1개 · 1개 남음` 카운트를 숨겼다.
- `route-evidence.json`에는 `hasCompactPostSavePanel: true`, `hasCompactAgendaHeader: true`가 기록된다.

## P3-03 공개 Flow 상세 shell 정리

- 결론: `/f/[slug]` 공개 Flow 상세는 공유 링크로 직접 들어올 수 있지만, 일반 앱 구조에서는 `Flow 찾기` 아래의 D2 상세 화면이다.
- 적용: `/f/[slug]`의 전용 public shell을 제거하고 공통 `PlatformNav`를 렌더한다.
- 모바일 390px: 하단 4탭이 보이며 `Flow 찾기`가 active 상태로 표시된다.
- fixed layer: public detail의 mobile export bar는 하단 4탭 위로 올라와 16px 이상 간격을 둔다.
- `route-evidence.json`에는 `/f/vehicle-inspection-prep`의 `navVisible: true`, `activeMobileTab: "Flow 찾기"`가 기록된다.

## P3-04 특수 workbench visual polish

- 결론: 특수 public Flow workbench는 기능/데이터 구조를 바꾸지 않고 공통 FlowMe visual rhythm에 맞췄다.
- `ArtifactWorkbench`의 보조 카드, source bridge, table/card wrapper는 `#FAFAF8` 배경, `#E7E4DD` border, 16px card radius를 기준으로 정리했다.
- 공개 detail의 mobile export sheet/bar와 export-first hero는 `#3654FF` primary, 12px action radius, 조용한 secondary button 톤으로 맞췄다.
- source-fit 안내는 일반 사용자 화면에서 `대표 노출`, 점수, `보강 기준`을 보여주지 않고 `원문 확인 중`/`근거 확인 중` 같은 사용자용 안내로 낮췄다.
- seed conversion note에서 visible surface로 올라올 수 있는 `audit`, `대표 노출`, 구조형 `묶음` 표현을 사용자 언어로 바꿨다.

## Route evidence

모바일 390 x 844 viewport에서 route sanity check를 수행했다. 저장 후 route는 `/flow-maps/moving-d30`에서 실제 저장을 수행한 같은 브라우저 컨텍스트로 캡처했다. 모든 route에서 horizontal overflow는 0건이고, 내부 검토/운영어 스캔 결과는 0건이다. P3-02 이후 `07-post-save-my-flow-mobile.png`와 `08-calendar-after-save-mobile.png`는 compact 화면 기준으로 재생성했고, P3-03 이후 `05-public-vehicle-inspection-mobile.png`는 app shell 기준으로 재생성했다. P3-04 이후 `09`~`12` screenshot은 특수 public workbench visual polish 기준으로 추가했다.

| Route | 상태 | H1 | Screenshot | 비고 |
| --- | --- | --- | --- | --- |
| `/` | clean localStorage | 콘텐츠를 일정과 할 일로 저장 | [01-home-mobile.png](./screenshots/01-home-mobile.png) | 하단 4탭 표시 |
| `/flows` | clean localStorage | 무엇을 저장할까요? | [02-flows-mobile.png](./screenshots/02-flows-mobile.png) | 통합 카드 목록 유지 |
| `/flow-maps/moving-d30` | clean localStorage | 원룸 이사 D-30 일정 지도 | [03-flow-map-moving-mobile.png](./screenshots/03-flow-map-moving-mobile.png) | 저장 전 hero 압축 유지 |
| `/flow-maps/middle-school-math-1` | clean localStorage | 중1 수학 목차 진도표 | [04-flow-map-math-mobile.png](./screenshots/04-flow-map-math-mobile.png) | 날짜 없는 콘텐츠 fallback 유지 |
| `/f/vehicle-inspection-prep` | clean localStorage | 자동차검사 D-14 준비 Flow | [05-public-vehicle-inspection-mobile.png](./screenshots/05-public-vehicle-inspection-mobile.png) | 공통 app shell 사용, `Flow 찾기` active |
| `/my` | clean localStorage | 내 Flow | [06-my-empty-mobile.png](./screenshots/06-my-empty-mobile.png) | true empty CTA 단일화 |
| `/my?savedMap=moving-d30` | after saving moving-d30 with 2026-07-22 | 내 Flow | [07-post-save-my-flow-mobile.png](./screenshots/07-post-save-my-flow-mobile.png) | post-save 첫 실행 항목 유지 |
| `/calendar` | after saving moving-d30 with 2026-07-22 | 캘린더 | [08-calendar-after-save-mobile.png](./screenshots/08-calendar-after-save-mobile.png) | schedule-first agenda 유지 |
| `/f/moving-d30-basic` | clean localStorage | 원룸 이사 D-30 Flow | [09-public-moving-basic-mobile.png](./screenshots/09-public-moving-basic-mobile.png) | export-first hero, mobile export bar 토큰 확인 |
| `/f/computer-skills-d30-study` | clean localStorage | 컴퓨터활용능력 D-30 학습 Flow | [10-public-computer-skills-mobile.png](./screenshots/10-public-computer-skills-mobile.png) | study workbench 카드 토큰 확인 |
| `/f/new-car-delivery-check` | clean localStorage | 신차 인수 점검 Flow | [11-public-new-car-mobile.png](./screenshots/11-public-new-car-mobile.png) | hold/source/status 카드 톤 정리 |
| `/f/used-car-buying-check` | clean localStorage | 중고차 구매 점검 Flow | [12-public-used-car-mobile.png](./screenshots/12-public-used-car-mobile.png) | decision/source bridge 카드 톤 정리 |

자세한 수치는 [route-evidence.json](./route-evidence.json)에 있다.

## Verification snapshot

- 모바일 390px route evidence: 생성 완료
- P3-01 저장 루프 evidence: 앱 버그 아님, evidence 생성 오류로 판별
- P3-01 targeted Playwright subset: 2 passed
- P3-02 density targeted Playwright subset: 2 passed
- P3-02 source-backed post-save regression subset: 6 passed
- P3-03 public detail shell/save/export targeted Playwright subset: 8 passed
- P3-04 special public workbench visual rhythm: 1 passed
- P0/P2 regression targeted Playwright subset: 7 passed
- P0~P2 final targeted Playwright subset: 9 passed
  - design token rhythm
  - internal operation labels
  - fixed layers
  - true empty states
  - nearest saved schedule
  - source-backed My Flow demo baseline
  - mobile workbench destination CTAs
- full verification:
  - `npm.cmd test`: 274 passed
  - `npm.cmd run docs:check`: passed, 14 required files and 1271 local links
  - `npm.cmd run build`: passed
  - `git diff --check`: passed

## 남은 리스크

| 우선순위 | 항목 | 설명 | 다음 판단 |
| --- | --- | --- | --- |
| Closed | 특수 workbench visual polish | 지정된 public workbench route의 카드/버튼/chip 톤과 내부 운영 문구 노출을 P3-04 evidence로 닫았다. 범위 밖 creator/content-lab 실험 화면의 내부 class는 유지한다. | 추가 Claude Design 리뷰에서 새 이슈가 나오면 P4로 분리 |

## Claude 재검토 요청

[prompt-ko.md](./prompt-ko.md)를 그대로 전달해도 된다. Claude에게는 평가만 요청하지 말고, 남은 리스크의 우선순위, 다음 루프 구현 범위, 화면별 수정 지시까지 산출하게 요청한다.
