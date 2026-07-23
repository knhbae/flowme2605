# P32 My Flow Focused Workspace 제품·UX 계약

## 1. 목적

P32는 P31에서 만든 compact library와 dedicated workspace를 버리지 않는다. 저장한 Flow를 찾는 과정은 현재 1/5/20/60개 fixture에서 2단계로 유지되고 있다. 다시 열어야 하는 범위는 **선택한 Flow 안의 command hierarchy와 화면 연속성**이다.

사용자는 한 Flow를 연 뒤 다음 질문에 설명 없이 답할 수 있어야 한다.

1. 지금 무엇을 해야 하는가?
2. 전체 계획은 어떻게 생겼는가?
3. 이 항목의 제목·날짜·메모를 어디서 바꾸는가?
4. Flow 전체 기준일은 어디서 다시 조정하는가?
5. 전체/선택/현재 항목 중 무엇을 가져가는가?
6. Flow를 보관·복구·영구 삭제하면 무엇이 달라지는가?
7. Calendar를 다녀와도 어느 Flow와 항목을 보고 있었는가?

## 2. Evidence 우선순위

주요 판단은 다음 순서로 한다.

1. 최신 `origin/main` 기반 current production interaction
2. 최신 current source와 deterministic fixture
3. Codex P31 독립 검토의 current browser measurement
4. Claude Design의 current screenshot/source 기반 제안
5. 공식 서비스의 reference pattern
6. heuristic simulation

낮은 단계의 자료가 높은 단계와 충돌하면 높은 단계를 우선한다. 충돌 자체는 숨기지 않고 P32-01 재현 항목으로 남긴다.

## 3. 확정된 현재 문제

### 3.1 명령 분산

최신 current browser measurement에서 다음 행동은 각각 6단계다.

- 항목 제목·날짜·개인 메모 수정
- whole Flow export
- archive -> reload -> archived filter -> restore

목록 검색 자체보다 Flow를 연 뒤 `실행`, `전체 계획`, `기록`, advanced disclosure, export panel, management menu 사이를 이동해야 하는 것이 문제다.

### 3.2 기준일 재조정의 route 차이

이사 Flow의 public 저장본은 개인 fixed date와 메모를 보존하지만, 저장 후 전체 이사일을 다시 조정하는 입구가 route에 따라 다르거나 없다. 기준일 재조정은 Item quick edit와 다른 Flow-level command여야 한다.

### 3.3 export 예측성

whole/selected/current 범위와 destination별 row/event 수는 이미 canonical plan에서 계산된다. 그러나 My Flow에서 사용자가 해당 정보를 보기 위해 깊은 disclosure를 지나야 한다. 새 export format이 아니라 기존 preflight를 focused workspace에서 발견 가능하게 해야 한다.

### 3.4 lifecycle 위치

`보관 / 복구 / 이 기기에서 영구 삭제` 의미는 P31에서 정리됐다. 남은 문제는 위치다.

- 활성 Flow: workspace 관리 메뉴에서 `보관`
- 보관된 Flow: 목록에서 직접 `복구`
- 보관된 Flow의 danger zone: `이 기기에서 영구 삭제`

이 의미를 합치거나 `삭제` 하나로 줄이지 않는다.

### 3.5 context continuity

Flow 목록 filter/scroll, 선택한 Flow, 열린 Item, Calendar 선택 날짜·scope가 화면 왕복에서 일부 끊긴다. 서버 동기화가 아니라 현재 browser session과 URL/history 수준에서 복구해야 한다.

## 4. 아직 확정하지 않은 문제

다음은 두 검토가 달라 P32-01에서 재측정한다.

- global `지금`과 local `실행`이 실제로 같은 역할로 읽히는가
- 같은 stable Item의 primary completion control이 동시에 2개 이상 보이는가
- 20/60 Flow에서 search-first 구조가 필요한가
- 1024px rail/canvas/inspector가 실제로 잘리거나 빈 공간을 과도하게 만드는가
- Claude 제안의 `지금` 제거가 기존 cross-Flow queue를 약화하는가

재현되지 않은 heuristic finding을 구현 근거로 승격하지 않는다.

## 5. 고정할 P31 계약

### 5.1 제품과 IA

- global 4탭: 홈 / Flow 찾기 / 캘린더 / 내 Flow
- public `/f` save-before와 saved receipt shell
- FlowMe는 기존 Calendar/Todo/Sheet/Memo 사용을 돕는 portable execution layer
- My Flow는 범용 database나 heavy planner가 아님

### 5.2 데이터 소유권

| 소유권 | 책임 |
| --- | --- |
| source/published Flow | 원문, canonical Item, 공개 version |
| personal overlay | 개인 제목·메모·날짜·포함/제외·구조 |
| execution run | 완료·다시 열기·건너뜀·보류·회고 |
| occurrence | 반복 series의 특정 회차 |
| export receipt | 범위·destination·항목 수·생성 결과 |

P32 UI는 이 projection을 소비하며 별도 count, 임시 Item ID, completion state를 만들지 않는다.

### 5.3 lifecycle

- `Flow에서 제외`와 `항목 삭제`를 구분
- `보관`은 되돌릴 수 있는 lifecycle 이동
- `복구`는 같은 개인 Flow를 활성 목록으로 되돌림
- `이 기기에서 영구 삭제`는 개인 local data만 삭제
- source-backed public Flow는 삭제 후에도 다시 발견 가능

## 6. 선택 구조: B, 단 P32-01 승인형

공통 방향은 `library -> focused workspace`다. 다만 global `지금` 처리에는 두 변형을 비교한다.

### B1. Cross-Flow Queue 유지

권장 기본안이다.

- library 상태에서 `지금 / Flow 목록 / 완료` 질문을 유지
- Flow를 열면 global local-tabs를 숨기고 object workspace만 표시
- Home/지금/Calendar의 항목은 focused workspace 또는 Item sheet로 deep-link
- deep-link 표면에서 completion control을 복제하지 않음
- mobile back은 library filter와 scroll을 복구

장점:

- 현재 검증된 cross-Flow 실행 queue를 보존
- Todoist/Things/Reminders의 time view와 context view 분리를 FlowMe에 맞게 유지
- P31 대비 변경 범위가 작고 rollback이 명확함

위험:

- `지금`과 Flow workspace `다음 행동`의 이름과 역할이 여전히 겹칠 수 있음

### B2. Continue Strip

Claude Design 대안이다.

- `/my` 첫 화면을 `이어서 하기` strip + compact library로 구성
- global `지금` 탭을 제거
- 완료는 cross-Flow filter 또는 기록入口로 유지
- Flow open은 동일한 focused workspace 사용

장점:

- 첫 화면 질문과 command 수를 크게 줄일 수 있음

위험:

- 날짜·Flow를 가로지르는 실행 queue를 약화할 수 있음
- current production의 안정된 `지금` projection을 근거 없이 제거할 수 있음

P32-01에서 동일 fixture와 동일 task로 두 안을 비교하고 한 안만 P32-02로 넘긴다.

## 7. Focused Workspace 정보 구조

### 7.1 Mobile 390

```text
Flow object header
  뒤로 / 개인 Flow 이름 / 상태·진행 / 관리

다음 행동
  실행 가능한 Item 1개
  완료 또는 다시 열기
  짧은 날짜·회차 맥락

전체 계획
  날짜·단계·콘텐츠 형태에 맞는 grouped body
  Item 열기

기록
  완료 run, 회고, 수정 흔적

contextual commands
  빠른 수정
  기준일
  가져가기
  관리
```

동시에 펼쳐지는 primary action은 1개 이하다. export, archive, delete를 실행 row 옆에 늘어놓지 않는다.

### 7.2 Wide 1024/1440

```text
library rail | focused plan canvas | selected Item inspector
```

- rail: 검색, 상태, 개인 Flow 이름, 다음 날짜
- canvas: object header, 다음 행동, 전체 계획, 기록 요약
- inspector: 선택 Item quick edit 또는 contextual command
- 같은 command를 canvas와 inspector에 중복 노출하지 않음
- 1024에서 inspector가 canvas를 침범하면 overlay/contained sheet fallback 사용

## 8. Content-shape 원칙

공통 shell은 유지하고 body만 콘텐츠 의미에 맞춘다.

| Shape | body 원칙 | 금지 |
| --- | --- | --- |
| anchor timeline | 날짜/단계 그룹, 기준일 연결과 개인 fixed date 구분 | 모든 행을 평면 checklist로 표시 |
| undated checklist | 날짜 압박 없는 실행 목록, 선택적 날짜入口 | 날짜 없음 상태를 오류처럼 표현 |
| recurrence routine | series definition, 다음 occurrence, current run, 기록 분리 | Flow 전체 완료와 회차 완료 혼합 |
| artifact choice | primary 1 + secondary 최대 2, scope/count preflight | 5개 결과를 상시 카드로 노출 |
| mixed date/check/resource | 날짜·check·resource 역할 분리 | 닫힌 route를 검토 편의로 재공개 |
| personal draft | 빠른 값 수정과 별도 구조 편집 | source-backed 원본 구조 편집 노출 |

여섯 개의 완전히 다른 renderer를 먼저 만들지 않는다. 공통 block으로 의미가 보존되지 않는 shape만 bounded body block을 추가한다.

## 9. Reference pattern 적용

- Todoist: Today는 cross-project 실행 질문, project는 context
- Things: Today/Anytime/Logbook과 project context 분리
- Apple Reminders: 같은 stable reminder를 목적별 projection으로 표시
- Google Calendar: 날짜 배치와 Item detail에 집중, Flow lifecycle은 My Flow로 위임
- Notion: mobile drill-in, wide rail/canvas/inspector
- Wanderlog: 날짜/단계가 핵심인 Flow의 day/phase grouping
- Hevy: routine definition과 current run 분리
- Strava: 완료 기록은 현재 계획과 분리

차용하지 않는 것:

- 범용 property database
- habit/통계/협업/예약
- 운동 전용 set·weight analytics
- social feed와 가짜 사용자 수
- 외부 서비스의 기능 전체

## 10. 성공 지표

### 확정 목표

- `flowOpenDepth@1/5/20/60 <= 2` 유지
- `itemEditDepth <= 3`
- `wholeExportDepth <= 3`
- 활성 Flow에서 archive 도달 `<= 3`
- archive -> reload -> restore `<= 4`
- `actionableDuplicateCount = 0`
- `contextLossCount = 0`
- first viewport competing primary `<= 1`
- Calendar/My Flow/export projection mismatch `0`
- 개인 fixed date와 memo 손실 `0`
- 390/1024/1440 horizontal overflow, fixed overlap, unnamed focusable `0`

### 비교 목표

- 첫 viewport command 수는 P32-01 current baseline보다 감소
- distinct card type과 heading 수는 current보다 증가하지 않음
- B1/B2 모두 같은 stable projection과 completion state를 사용

## 11. 구현 중단 조건

다음이 발생하면 해당 slice를 멈추고 계획을 수정한다.

1. focused workspace가 별도 Item ID나 count를 필요로 함
2. 기준일 재계산이 personal fixed date 또는 과거 run을 덮어씀
3. quick edit가 recurrence/source 구조까지 범용 편집기로 확장됨
4. 한 shape의 예외가 공통 block보다 많아짐
5. 1024 layout을 위해 persistent schema 변경이 필요해짐
6. current production에서 재현되지 않은 finding을 근거 없이 구현하게 됨

## 12. 비범위와 별도 lane

### 제품 비범위

- global 4탭 재설계
- Home, Flow 찾기, Calendar 전면 개편
- account/cloud sync/telemetry personalization
- AI/crawler/OAuth
- 새 export format
- creator publish 시스템

### P32-OPS

`postcss` high 1건과 moderate 1건은 dependency remediation lane으로 분리한다.

- `npm audit fix --force` 금지
- Next downgrade 금지
- patched compatible chain이 확인될 때 별도 PR
- UX acceptance와 security acceptance를 서로 대신하지 않음

## 13. Evidence 경계

- prototype, fixture, Playwright, screenshot, agent simulation은 observed-user evidence가 아님
- 실제 관찰 사용자 수는 P32 planning 시작 시 `0`
- P32 final gate가 green이어도 usability가 검증됐다고 표현하지 않음
- 사용자 관찰 재개는 owner가 별도로 판단
