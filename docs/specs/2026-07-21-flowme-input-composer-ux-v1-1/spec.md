# FlowMe Input Composer UX v1.1

- Status: planning prototype complete target
- Date: 2026-07-21
- Scope: UX planning, deterministic interactive prototype, contracts, browser QA
- Non-scope: app runtime, database, production LLM/crawler, account, deploy
- Evidence boundary: this package is based on current prototype interaction, frozen source-backed fixtures, repository rules, and heuristic review. It is not observed-user validation.

## 1. Decision

FlowMe Input Composer Lab v1의 시각 언어와 콘텐츠 결과를 폐기하지 않는다. 다음을 유지한다.

1. 출처, 입력, 결과를 동시에 비교할 수 있는 3열 workbench
2. 원문에서 확인한 범위와 누락 범위를 먼저 드러내는 source scope
3. Item을 할 일, 결정, 기록, 자료로 구분하고 설명과 완료 기준을 붙이는 구조
4. 사례마다 Calendar, Todo, Sheet, Memo 중 자연스러운 결과가 달라지는 판정
5. 원문이 부족하거나 안전 검토가 필요한 경우 가짜 실행 결과를 만들지 않는 경계

v1.1에서는 입력 경로를 먼저 선택하게 하는 현재 방식 대신 **통합 composer + 표 가져오기 보조 행동**을 일반 사용자 기본안으로 채택한다.

- URL, 한 줄, 여러 줄은 한 입력창에서 감지한다.
- 감지 결과와 확보한 원문 범위를 결과 위에서 확인하거나 바로잡는다.
- 표와 강의계획은 파일/붙여넣기 구조를 보존해야 하므로 별도 보조 행동으로 둔다.
- 기존 공개 Flow를 발견한 최종 사용자는 제작자 입력 화면을 거치지 않고 첫 사용 미리보기로 이동한다.
- 제작자는 같은 입력 surface에서 시작할 수 있지만 source scope 확인 뒤 별도 제작 검토 lane으로 이동한다.

즉, 하나의 입력창이 하나의 저장 영역을 뜻하지 않는다. 진입은 통합하되 저장과 책임은 분리한다.

## 2. Product contract

### 2.1 Canonical Item

Flow 콘텐츠의 기본 단위는 다음 조합이다.

- intent: 실행, 결정, 기록, 소비/자료
- title: 사용자가 상태를 바꿀 수 있는 구체적 항목명
- detail: 방법, 맥락, 주의, 원문 링크
- completion: 완료 또는 진행 판정 기준
- optional: schedule, location, recurrence, condition, user fields, source references

Calendar, Checklist, Todo, Sheet, Memo는 canonical Item을 사용하는 projection이다. 모든 Flow에 다섯 projection을 만들지 않는다.

### 2.2 Data ownership

| Layer | 소유자 | 예 | 덮어쓰기 규칙 |
|---|---|---|---|
| source snapshot | 원문 | 원문 행, URL, 확보 범위, fingerprint | 새 버전은 별도 저장 |
| creator draft | 제작자 | Item 분리, 설명, 완료 기준, 검토 상태 | 공개 전 수정 가능 |
| published Flow | Flow 버전 | 공개 Item과 projection 정책 | immutable version |
| user overlay | 최종 사용자 | 이사일, 장소, 선택, 현재 장, 개인 메모 | 원문 업데이트가 덮지 않음 |
| execution run | 최종 사용자 | 완료, 진행, 회차, 재개 위치 | overlay와 별도 |
| export receipt | 최종 사용자 | 형식, 범위, 행/event 수, 시각 | source나 Flow를 변경하지 않음 |

### 2.3 Journey contract

```text
입력/기존 Flow 발견
-> 형식 감지
-> 확보한 범위 확인
-> 가능 여부 판정
-> useful preview
-> 필요한 개인 값 0~2개
-> 결과 수정
-> 자기 도구로 옮기기 또는 My Flow 저장
-> 실행/진도 기록
-> source update 비교
```

제작자와 최종 사용자 write path는 `source_scope_confirmed` 이후 분기한다. 제작자는 source/creator draft를 편집하고, 최종 사용자는 user overlay와 execution run만 편집한다.

## 3. Input alternative verdict

| 기준 | A. 네 경로 선선택 | B. 통합 composer | 판정 |
|---|---:|---:|---|
| 입력 방식을 먼저 이해해야 함 | 높음 | 낮음 | B |
| 잘못된 경로 선택 가능성 | 있음 | 감지 후 수정 | B |
| 한 줄/URL 첫 결과 조작 | 2~3 | 1~2 | B |
| 모바일 첫 화면 부담 | 경로 4개가 먼저 보임 | 입력 1개 + 보조 행동 | B |
| 원문 확보 실패 설명 | 경로 안쪽에서 늦게 드러남 | 감지/확보 상태로 즉시 표현 | B |
| 표 구조 보존 | 명확 | 보조 행동 필요 | 동률 |
| 제작자 source review | 경로별 설명이 쉬움 | 감지 후 별도 lane 필요 | hybrid |

최종안은 B를 기본으로 하고, `표·강의계획 가져오기`를 명시적 보조 행동으로 유지한다. 제작자에게는 감지 뒤 source review lane을 제공한다.

## 4. Result selection policy

1. 첫 화면에는 가장 자연스러운 artifact 하나만 완전한 형태로 보여준다.
2. 보조 artifact는 정보 손실이 허용 가능한 경우 최대 2개만 제안한다.
3. `not_applicable`, `blocked`, `rights/safety hold`인 artifact는 빈 탭으로 노출하지 않는다.
4. artifact를 바꾸기 전에 빠지는 필드를 설명한다.
5. CTA는 결과와 범위를 포함한다. `저장`, `실행`, `내보내기`만 단독 사용하지 않는다.

| 사례 | 기본 결과 | 보조 결과 | 제공 금지/보류 | 기본 CTA |
|---|---|---|---|---|
| 이사 D-day | Calendar 24건 | Checklist, Memo | 날짜 없는 Todo/Sheet | `캘린더 일정 24개 확인` |
| K-MOOC 14주 | Sheet 14행 | Todo, Calendar(실제 주차 날짜가 있을 때) | 단일 체크리스트 | `14주 진도표로 시작` |
| LibriVox 38장 | resource queue Sheet 38행 | Todo, Memo | Calendar/반복 루틴 | `38장 듣기표로 시작` |
| 성인 여권 재발급 | Todo 6개 | Checklist, Memo | 일정 없는 ICS | `Todo로 6개 항목 가져가기` |
| 세탁조 알림 관리 | 조건형 Todo 4개 | Checklist, Memo | 월간 Calendar/ICS | `조건형 Todo 4개 가져가기` |
| 에어컨 세척 선택 | 비교 Memo 1건 | 결정 뒤 Todo, 비교 Sheet | Calendar/Checklist | `메모에 비교 결과 복사` |
| 농작업 폭염 대응 | 검토용 condition cards | 없음 | 공개 export/save | `검토가 필요한 범위 확인` |
| Todoist 로그인 원문 | source recovery | 없음 | 모든 가짜 artifact | `권한 있는 원문 가져오기` |

## 5. Progressive disclosure rules

- useful preview를 만들 수 있으면 먼저 보여주고 개인 값은 이후에 묻는다.
- 계산 또는 projection 생성에 반드시 필요한 개인 값만 preview 직전 허용한다.
- 원문 값과 개인 값이 충돌하면 원문을 수정하지 않고 user overlay가 해당 실행에서 우선한다.
- 권리, 안전, 원문 부족 문제를 개인 입력으로 우회하지 않는다.
- 선택으로 새 필드가 필요해질 때만 묻는다. 예: 여권 `방문` 선택 뒤 방문 장소.
- 현재 진도는 장기 Flow를 시작하거나 이어 쓸 때만 묻는다.

세부 필드 계약은 [interaction-spec.md](./interaction-spec.md)에 정의한다.

## 6. v1.1 workbench

### Desktop 1440

- Left: 사례/최근 입력, 감지 상태, source scope 요약
- Center: 통합 composer, scope 확인, 필요한 개인 값, Item 수정
- Right: 추천 artifact, 손실 안내, 구체적 export/save action, receipt
- 한 시점의 primary action은 1개다.

### Mobile 390

- 사례 selector
- 통합 composer와 감지 결과
- 추천 artifact 요약 및 첫 3개 Item
- sticky primary action
- source scope와 전체 Item은 접어서 아래에 둔다.
- 결과가 입력 경로 목록 뒤로 밀리지 않는다.

## 7. Eight-case outcome

8개 사례의 source -> input -> Item -> artifact -> export/save 경로는 [case-journey-matrix-v1-1.json](./case-journey-matrix-v1-1.json)에 동결한다.

핵심 의미 판정은 다음과 같다.

- K-MOOC: 14주 진도 Sheet
- LibriVox: 38장 순서/현재 위치 resource queue
- 세탁조: `40회 또는 알림` 조건형 Todo
- 농작업 폭염: 준비/회복 Item과 중단/119 condition card, 검토 전 export 금지
- Todoist: actual task 원문 확보 전 proposal 0건

## 8. Acceptance criteria

- 8개 사례 모두 end-to-end 경로가 있다.
- 일반 사례 useful preview 전 필수 개인 입력은 0~2개다.
- source-derived 값을 다시 묻지 않는다.
- 첫 화면 primary action은 1개 이하이다.
- creator draft와 user overlay write path가 섞이지 않는다.
- 조건형 행동을 날짜 반복으로 바꾸지 않는다.
- not-applicable projection은 빈 탭으로 노출하지 않는다.
- 18개 상태 모두 이유, 다음 행동, 취소/복구가 있다.
- current/proposed 입력 수, 설명 블록, primary action, 조작 수를 비교한다.
- 1440x900과 390x844에서 document 가로 overflow가 없다.
- 주요 컨트롤은 keyboard와 accessible name으로 조작 가능하다.
- 자동 QA와 에이전트 평가는 observed-user validation으로 표현하지 않는다.

## 9. Open decisions

다음은 backend 구현 전 제품 결정을 더 해야 한다.

1. creator draft와 개인 memo draft가 같은 URL을 사용할 때 목록에서 어떻게 구분할지
2. source update 시 Item mapping confidence가 낮은 개인 overlay의 수동 재연결 방식
3. 외부 Todo/Calendar 직접 연동 전 copy/download receipt를 어디까지 영구 보관할지
4. 안전/권리 검토 주체와 공개 승인 SLA

이 항목들은 v1.1 prototype에서 상태와 경계만 표현하며 구현하지 않는다.
