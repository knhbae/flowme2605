# P28 Feedback Reconciliation

## 1. 입력과 근거 우선순위

| 입력 | 역할 | evidence kind |
| --- | --- | --- |
| 최신 사용자 피드백 | 제품 acceptance와 불만의 정본 | owner_feedback |
| <https://flowme2605.vercel.app> 및 P27 production screenshot | 현재 화면 동작 | current_production_interaction, current_package_screenshot |
| `components/flow/AppClient.tsx`, `ArtifactWorkbench.tsx`, `FlowSaveBeforeFrame.tsx` | 현재 구현과 분기 | current_source |
| Codex P28 implementation alignment package | capability, 회귀, 단계 분리 | current_structured_evidence |
| Claude Design P28-00 board | hierarchy, wireframe, Hybrid 제안 | heuristic_design_review |
| P28 prior usage preview | 콘텐츠와 결과 형태의 사용자 약속 | prior_design_artifact |
| 외부 서비스 공식 문서 | 패턴 비교, 답안 복사 금지 | reference_pattern |

판단 우선순위는 `사용자 acceptance -> current production -> current source -> current structured evidence -> prior design/reference`다. 자동화가 control 존재를 확인했더라도 사용자가 경로와 의미를 이해하지 못했다면 UX는 완료가 아니다.

## 2. 상태 용어

| 상태 | 의미 |
| --- | --- |
| `accepted` | 기능과 화면 문법이 사용자 목적에 맞고 현재 피드백에서 유지 가능 |
| `supported_but_not_accepted` | 기능은 있으나 발견성, 밀도, 경로, 의미가 충분하지 않음 |
| `partial` | 일부 route 또는 일부 projection에만 연결 |
| `missing` | 필요한 UI 또는 정책이 없음 |
| `blocked` | source, rights, safety, data decision이 선행돼야 함 |
| `deferred` | 현재 Stage에서 의도적으로 하지 않음 |

## 3. 최신 사용자 피드백 대조

| 사용자 피드백 | current evidence | 근본 원인 | 판정 | P28 대응 |
| --- | --- | --- | --- | --- |
| `/flows` 조정이 그대로이고 날짜·내용 수정이 자연스럽지 않다 | include/date/title+memo/order mode는 존재하지만 전체 결과와 분리되고 operation picker 중심이다 | capability 단위로 붙였고, 전체 Flow를 보며 고치는 일관된 editor grammar가 없음 | `supported_but_not_accepted` | P28-01, P28-03 |
| 홈트 저장 전 화면이 너무 복잡하다 | routine calendar, horizon, series end, 오늘 결과, 몸 상태 메모, 원문 기준, export가 한 화면에 연속 노출 | schedule definition, occurrence execution, record, source resource를 한 workbench에 결합 | `supported_but_not_accepted` | P28-01, P28-04 |
| 주 몇 회·언제까지 같은 단순한 조정이 필요하다 | weekday selection은 있으나 `4주 반복 운동 캘린더`, `주 3회`가 copy와 helper에 특례로 남음 | 4주 preview horizon과 사용자 series end가 시각적으로 분리되지 않음 | `partial` | P28-04 |
| 홈트만 `오늘 결과`, `강도 낮춤`, `휴식으로 변경`을 쓴다 | `ExactVideoTodayResultCard`가 별도 3상태 selector를 구현 | occurrence run 상태와 운동 메모를 content-specific 상태로 중복 모델링 | `partial` | P28-04 |
| Calendar의 홈트가 다시 다른 UI다 | Calendar routine board와 save-before routine workbench가 다른 component와 정보량을 사용 | route별 표현이 shared occurrence row보다 우선 | `supported_but_not_accepted` | P28-04, P28-06 |
| 운동 영상·공식 안내만 특별 버튼처럼 보인다 | exact-video source bridge에 별도 링크 버튼과 긴 설명이 있음 | resource 역할 계약은 있으나 공통 `자료` surface에 연결되지 않음 | `partial` | P28-04 |
| Calendar에 Flow가 많으면 selector가 가로로 길다 | scope option 전체를 `grid-flow-col auto-cols-max overflow-x-auto`에 배치 | 1~몇 개 fixture에는 맞지만 10~50 Flow cardinality 정책이 없음 | `supported_but_not_accepted` | P28-01, P28-06 |
| 다섯 형태의 저장 예시가 구현되지 않았다 | artifact plan은 제목·설명 surface를 고르지만 actual Calendar/Checklist/Sheet/Memo 데이터 비교가 없음 | projection policy와 preview renderer가 분리 | `missing` | P28-02, P28-03, P28-07 |
| My Flow 전체 구조가 실 서비스 수준이 아니다 | `지금/Flow 목록/완료`, adaptive search, card/detail은 있으나 mobile card, wide select, whole workspace 문법이 다름 | 기능별 누적과 threshold 규칙은 있으나 library와 detail의 우선순위가 불명확 | `supported_but_not_accepted` | P28-01, P28-05 |

## 4. Codex·Claude Design과 최신 피드백의 수렴

세 입력은 다음에 동의한다.

1. P27의 source, personal overlay, execution run, occurrence, export identity는 다시 만들지 않는다.
2. 저장 전에는 추상 설명 카드가 아니라 실제 저장될 전체 Flow와 실제 결과 데이터를 보여줘야 한다.
3. 콘텐츠별 primary artifact가 먼저 보여야 하며 의미 없는 destination은 숨겨야 한다.
4. My Flow는 기능 목록보다 저장한 Flow를 찾고 전체 구조를 읽는 역할이 먼저다.
5. Calendar와 My Flow가 같은 effective item과 occurrence를 읽어야 한다.
6. 긴 설명으로 UI 문제를 덮으면 안 된다.

## 5. 그대로 따르지 않을 제안

### 5.1 기존 P28-01을 바로 구현하지 않는다

Codex handoff는 `저장 전 전체 Flow + primary artifact shell`을 첫 구현으로 권장한다. 이 요구는 맞지만 최신 피드백은 shell보다 큰 공통 문법 문제를 드러냈다. shell부터 구현하면 홈트 special UI, My Flow hierarchy, Calendar filter를 다시 뜯을 가능성이 크다.

따라서 P28-01은 비교 prototype과 cross-surface simulation으로 바꾼다. 기존 shell 요구는 P28-02/03으로 이동한다.

### 5.2 Claude의 고정 3열을 1024px 기본으로 쓰지 않는다

prior artifact는 desktop에서 source/Flow/artifact 3열 비교의 장점이 있다. 그러나 Codex evidence는 prior artifact의 1024px overflow를 `5 / 5`로 기록했다. P28은 다음 breakpoint를 기본으로 검토한다.

- 390px: 단일 흐름, drill-in 또는 full-screen edit
- 1024px: 최대 2개 주요 pane
- 1280~1440px 이상: 세 번째 contextual pane은 fixture로 검증된 경우에만 허용

### 5.3 `4주`를 홈트의 기본 종료로 확정하지 않는다

`미리보기 4주`는 bounded projection window다. series 종료는 source-defined, user until/count, open-ended 중 하나다. UI는 두 값을 분리한다.

### 5.4 운동 고유 실행 상태를 전역 상태로 승격하지 않는다

- `완료`는 공통 occurrence completion이다.
- `휴식으로 변경`은 공통 `건너뜀` 또는 `보류` 범위 안에서 표현한다.
- `강도 낮춤`은 completion state가 아니라 occurrence note 또는 adjustment metadata 후보다.
- 통증·중단 주의는 안전 copy이며 완료 상태가 아니다.

이 정책은 P28-04 contract fixture에서 검증한 뒤 UI에 연결한다.

## 6. 다섯 결과 형태의 정의

최신 피드백의 “다섯 형태”를 영구적인 다섯 카드나 새 5탭 IA로 해석하지 않는다. P28에서는 다음 다섯 projection shape를 대표 계약으로 쓴다.

1. `Flow execution` - FlowMe 안의 단계/할 일 실행 목록
2. `Calendar` - 확정 날짜·시간이 있는 event 또는 series
3. `Checklist/Todo` - 날짜가 필수 아닌 실행·확인 목록
4. `Sheet` - 비교, 속성, 진행, 기록 행
5. `Memo` - 원문 맥락, 개인 메모, 자료 링크

실제 화면 규칙:

- primary 한 개는 실제 데이터로 바로 보여준다.
- 가치 있는 secondary는 최대 두 개만 짧은 전환 control로 제공한다.
- blocked/not-applicable shape는 비활성 카드로 늘어놓지 않는다.
- `다른 결과 보기`를 열면 eligible shape의 실제 count와 정보 손실을 확인한다.
- 다섯 shape 전체는 regression fixture로 모두 검증한다.

## 7. root cause 요약

### R1. capability completion과 experience acceptance를 혼동

P27은 control count, persistence, overflow, a11y를 통과했다. 그러나 task hierarchy와 content density는 자동 gate로 닫히지 않았다.

### R2. route별 special renderer 증가

`ArtifactWorkbench`와 `AppClient`에 slug/tag/category 분기가 누적돼 같은 object가 route마다 다른 UI를 갖는다.

### R3. projection policy와 visual preview 분리

`artifact-plan.ts`는 surface 이름을 선택하지만 save-before는 실제 destination 데이터를 같은 projection으로 렌더하지 않는다.

### R4. low-cardinality 성공을 scale-ready로 해석

Flow filter와 My Flow search는 적은 fixture에서 작동한다. 10, 20, 50 Flow에서의 선택 비용과 시각 밀도는 gate가 아니었다.

### R5. 긴 설명이 interaction 결정을 대신함

홈트의 source bridge와 결과 설명은 유용한 정보까지 포함하지만 일정 정의, 실행, 안전, resource의 시각적 분리를 대신하고 있다.

## 8. P28 planning implication

- P28은 `조금 더 다듬기`가 아니라 공통 interaction grammar 재구성이다.
- 대폭적인 component composition 변경은 허용한다.
- source/personal/run/occurrence/export ownership과 4탭 IA는 유지한다.
- P28-01에서 current/proposed를 비교하고, 통과하지 못한 architecture는 코드로 옮기지 않는다.
- 각 implementation slice 뒤에는 대표 콘텐츠와 보유량 stress simulation을 다시 실행한다.
- P28-08 전에는 실제 사용자 관찰을 요청하지 않는다.

## 9. 근거 한계

- 실제 관찰 사용자는 `0`이다.
- 사용자 피드백은 owner acceptance이며 다수 사용자 행동 데이터는 아니다.
- current screenshot과 source는 구현 상태를 보여주지만 실제 사용자의 이해를 증명하지 않는다.
- 외부 서비스 패턴은 참고만 하며 FlowMe의 제품 답을 대신하지 않는다.
