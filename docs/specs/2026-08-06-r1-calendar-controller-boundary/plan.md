# R1 구현 계획과 게이트

## 단계

| 단계 | 변경 | 영향 범위 | 검증 게이트 | 롤백 경계 |
| --- | --- | --- | --- | --- |
| R1-00 | 현재 Calendar 상태·효과·라우트·포커스·범위 저장과 액션별 초기화 특성화 | 증거와 테스트만 | 관련 단위 20/20, AppClient lock 59/59, 관련 E2E 35/35 | 새 특성화 테스트 제거 |
| R1-01 | 순수 Calendar 전환·경로·포커스·범위 결정 모듈과 단위 테스트 추가 | 순수 계산만 | 새 테스트와 기존 Calendar 단위 테스트 통과; React/DOM/browser 의존 없음 | 기존 인라인 계산 유지, 새 모듈 제거 |
| R1-02 | Calendar React controller가 상태·ref·선택 Flow 저장 어댑터를 소유하도록 작은 단위로 연결 | Calendar runtime 상태·효과 | 각 이동 단위마다 lock, 단위, 빌드와 관련 브라우저 회귀 통과 | 해당 상태와 효과를 기존 `AppClient` setter로 복귀 |
| R1-03 | FullCalendar·월/범위/날짜/이벤트/더보기·My Flow 열기 동작을 controller action으로 연결 | Calendar 입력과 이동 | 정확한 route/query/Back, 포커스·스크롤, 범위 저장과 액션별 초기화 회귀 통과 | 액션별 기존 callback을 다시 연결 |
| R1-04 | 전체 회귀, 소유권·의존성 감사, 문서화와 다음 단계 재평가 | 증거와 문서 | docs, lock, 전체 단위, build, 관련·전체 E2E, scoped diff 통과 | 문서만 되돌리고 구현 상태는 별도 판정 |

## R1-00 기준선

런타임 변경 전 다음 결과를 확보했다.

| 검사 | 결과 |
| --- | --- |
| Calendar 관련 단위 테스트 | PASS — 20/20 |
| AppClient lock 계약 | PASS — 59/59 |
| Calendar/My Flow 관련 선별 E2E | PASS — 35/35 |

이 수치는 R1 구현 결과가 아니라 변경 전 비교 기준이다.

## 목표 의존 방향

```text
AppClient compatibility facade
  -> useMyFlowCalendarController(React state, refs, browser effects)
       -> my-flow-calendar-controller(pure transitions and decisions)
       -> typed My Flow ports(discard check and reset profile only)
  -> MyFlowCalendarRouteSurface(existing presentation)

My Flow data/storage/result transfer -> unchanged
```

## 상태와 효과 분리

순수 모듈은 다음 상태를 입력받아 다음 상태와 명시적 효과 요청을 돌려준다.

- `visibleMonth`, `selectedDate`, `scope`, `selectedFlowSlugs`
- `mobileDaySheetOpen`, `routineOverflowDate`, `scheduleOverflowDate`
- 폐기 확인 필요 여부
- 공유 상태 초기화 프로필
- 포커스·스크롤·라우트·선호값 저장 요청

React controller는 요청을 실제 ref, history/location, localStorage 및
My Flow 포트에 연결한다. 순수 모듈이 브라우저 효과를 직접 수행하지 않는다.

## 구현 순서

1. 액션별 현재 상태 전환과 부수 효과를 순수 테스트로 고정한다.
2. 전환·범위 정규화·경로 계산을 순수 모듈로 옮긴다.
3. 읽기 전용으로 controller 상태를 연결한 뒤 월과 선택 날짜부터 이동한다.
4. 범위와 선택 Flow 상태 및 기존 localStorage 동기화를 이동한다.
5. 모바일 시트·더보기 상태와 focus/scroll ref를 이동한다.
6. 기존 callback을 월, 범위, 날짜, 이벤트, 더보기, 오늘·첫 일정,
   My Flow 열기 순으로 controller action에 연결한다.
7. My Flow 저장 완료 지점은 `syncToDate(date)`로만 Calendar를 동기화한다.
8. 전체 검증 뒤 소유권을 감사하고 R2 후보를 다시 판단한다.

각 순서의 변경은 따로 검증한다. 중간 단계에서도 기존 surface와
`AppClient` 호환 연결을 유지한다.

## 주요 위험과 방지

| 위험 | 방지 |
| --- | --- |
| 액션마다 다른 초기화가 공통화되어 동작이 달라짐 | 전환별 reset profile과 특성화 테스트 유지 |
| effect 순서 변화로 선택 Flow 저장 또는 포커스가 달라짐 | 현재 effect 위치와 순서를 보존하고 단계별 연결 |
| Calendar가 My Flow 편집 상태를 소유함 | typed port 외 직접 상태 이동 금지 |
| route 방식이 바뀌어 Back이 깨짐 | 정확한 href와 `window.location.assign` 계약 테스트 |
| 저장 형식이 달라짐 | 키·정규화·직렬화의 byte-equivalence 확인 |
| FullCalendar DOM/ARIA가 흔들림 | JSX와 `eventDidMount`는 R1에서 이동하지 않음 |

## 중단 규칙

- 계약 차이를 설명할 수 없거나 복구가 어려우면 해당 단계를 되돌린다.
- 저장 마이그레이션, My Flow controller, 결과 전달 변경이 필요해지면 R1을
  확장하지 않고 별도 사양과 승인을 요청한다.
- R1 통과가 R2 구현, Git 발행 또는 배포를 자동 승인하지 않는다.

## R1 종료 후 재평가

MVP PoC 기준 기본 결정은 **R1에서 구조 리팩토링을 멈추는 것**이다.
현재 회귀 실패나 다음 분리를 요구하는 제품 작업이 없으므로, 추가 분리보다
기능 검토와 실제 사용 시나리오 확인에 우선순위를 둔다.

다음 조건 중 하나가 생길 때만 별도 승인으로 R2를 연다.

- 다음 승인 작업이 My Flow 목록·Plan·Item 이동을 실제로 변경한다.
- 해당 이동 영역에서 route/query/Back/scroll/focus 회귀가 반복된다.

조건부 R2 후보는 **My Flow 저장 라이브러리 탐색 controller 경계**로 제한한다.
첫 변경은 `lib/flow/my-flow-library-controller.ts`의 순수 transition planner와
단위 테스트만 추가하며 React 상태나 `AppClient` 연결은 하지 않는다.

R2 후보가 다루는 것은 목록 필터·query, 목록 → Plan → Item 이동,
direct-entry와 popstate, 문서·rail 스크롤 및 복귀 포커스 결정뿐이다.
편집·완료·메모, 보관·삭제·복구, 저장 형식, 결과 가져가기·receipt,
UI·문구·DOM, Text-to-Flow와 배포는 후보 범위에서도 제외한다.
