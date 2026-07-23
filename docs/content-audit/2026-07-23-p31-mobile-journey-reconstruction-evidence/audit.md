# P31 Mobile Journey Reconstruction Audit

## 1. 감사 경계

- 기준: clean `origin/main`의 `91ff789637ad9d46f8d646f1f21bd18baa3bfb15`
- 대상: 별도 worktree `codex/p31-mobile-journey-reconstruction`
- viewport: `390x844`, `1024x768`
- evidence: current source, current command, current package screenshot, heuristic simulation
- 실제 사용자 관찰: `0`

기존 dirty worktree `D:\flowme2605\flow-mvp`는 읽기만 했고 수정, revert, stage하지 않았다.

## 2. P31-01 Effective Date Correctness

### 원인

My Flow 일부 요약과 Calendar/ICS consumer가 개인 실행 중 날짜 override보다 draft/source schedule을 먼저 읽었다. 명시적 `날짜 없음`도 일부 fallback에서 source 날짜로 다시 살아날 수 있었다.

### 수정

effective date precedence를 아래 순서로 고정했다.

1. execution-scoped explicit override
2. personal draft structural schedule
3. personal copy schedule override
4. source schedule

명시적 날짜 제거는 lower-priority 날짜로 fallback하지 않는다. 같은 stable Item identity를 My Flow, Calendar, ICS consumer가 공유한다.

### 결과

- 개별 날짜 변경 뒤 My Flow, Calendar, ICS 날짜가 같다.
- 날짜 제거 뒤 Calendar/ICS membership은 `0`이고 My Flow/list export membership은 유지된다.
- completion/reopen은 schedule membership을 바꾸지 않는다.
- malformed override가 Item을 삭제하지 않는다.

## 3. P31-02 Home, Find, Save-Before

### Home과 Flow 찾기

Home은 catalog 복사본이 아니라 실제 활용 예시와 저장한 Flow로 다시 이어지는 표면이다. Flow 찾기는 검색, catalog, source 확인, 상세 진입을 담당한다.

Flow 찾기 카드 anatomy:

1. concrete job/title
2. 원문 링크
3. 대표 결과와 범위
4. 대표 항목 1~2개
5. `더보기`

이사일, D-30, 생활 일정 같은 chip을 카드마다 중복하지 않는다. 실제 집계 계약이 없는 사용자 수·리뷰 수는 표시하지 않는다.

### 콘텐츠 shape

- 이사: Calendar 결과와 필요한 이사일을 먼저 보여준다.
- 결혼: 여러 artifact를 세로로 동시에 펼치지 않고 하나를 선택해 실제 결과를 본다.
- 운동: compact routine summary와 다음 occurrence를 먼저 보여주고 weekday, time, duration, end mode는 설정을 열었을 때만 보여준다.
- resource URL은 실행 completion row가 아닌 자료 역할로 유지한다.

### 결과

- Home/Find 첫 heading, 첫 행동, 성공 상태가 다르다.
- mobile save-before 첫 viewport에서 결과와 primary action을 먼저 읽을 수 있다.
- fake social proof count는 `0`이다.

## 4. P31-03 My Flow Workspace와 Lifecycle

### 모바일 composition

기존 inline expansion 대신 아래 순서를 사용한다.

```text
compact Flow library
-> dedicated Flow workspace
-> 실행 | 전체 계획 | 기록
-> Item detail 또는 contextual command
```

library row는 개인 저장 이름, 다음 행동, 날짜/진행 맥락을 우선한다. export, archive, delete는 row에 늘어놓지 않고 workspace의 해당 문맥에 둔다.

### 저장 이름

source title보다 사용자가 저장하며 정한 personal-copy title을 My Flow library와 workspace 주 제목으로 사용한다. source title은 원본 맥락으로 남는다.

### Lifecycle grammar

| 소유권/상태 | 사용자 동사 |
| --- | --- |
| 실행 상태 | 완료 / 다시 열기 |
| 일정 | 날짜 정하기 / 날짜 없애기 |
| source-backed 구성 | Flow에서 제외 / 다시 포함 |
| 개인 draft 구조 | 항목 삭제 / 항목 복구 |
| 자료 | 자료 숨기기 / 다시 보이기 |
| Flow lifecycle | 보관 / 복구 / 이 기기에서 영구 삭제 |

모바일 보관 목록의 각 행은 직접 `복구` action을 제공한다. archive -> reload -> archived filter -> restore가 390과 1024에서 같은 capability를 가진다.

## 5. P31-04 Calendar

모바일 Calendar는 날짜 선택, agenda, Item detail, 날짜 없는 항목 배치를 한 긴 문서로 동시에 펼치지 않는다.

- 날짜 선택과 agenda는 현재 화면에 남는다.
- agenda Item은 bottom sheet에서 연다.
- sheet는 Escape, 닫기, focus return을 지원한다.
- 날짜 없는 항목은 별도 placement tray에서 선택·배치한다.
- Calendar에서는 Flow lifecycle를 중복하지 않고 My Flow workspace로 연결한다.
- wide는 기존 inspector 역할을 유지한다.

같은 날짜의 marker/agenda는 stable Item identity를 사용하며 completion/reopen이 구조 membership을 바꾸지 않는다.

## 6. P31-05 Permanent Delete

### 진입 조건

영구 삭제는 active Flow에서 바로 노출하지 않는다. 먼저 보관한 Flow의 danger zone에서만 `이 기기에서 영구 삭제`를 제공한다.

### 삭제 범위

source-backed Flow:

- 제거: 개인 저장 관계, completion/run, 개인 제목·날짜·메모, archive state, Flow-scoped local state
- 보존: public source와 published Flow

personal draft:

- 제거: 개인 Flow bundle, user-created Item 구조, personal values, run/reflection, archive state
- 보존: 다른 Flow와 전역 앱 설정

삭제 확인 dialog는 Flow 제목, 삭제되는 데이터, 복구 불가, 공개 원본 보존 여부를 표시한다. `백업 먼저 받기`는 보조 행동이다. cancel/Escape 뒤 trigger로 focus가 돌아간다.

### 결과

- delete -> reload 뒤 ghost archived row `0`
- source-backed Flow는 public route에서 다시 발견하고 저장할 수 있다.
- `removeSavedFlow`를 호출하기 전 contract unit이 삭제/보존 범위를 고정한다.

## 7. Mobile/Wide QA

| Surface | 390 | 1024 | 판정 |
| --- | --- | --- | --- |
| Home | 활용 예시 중심 | 넓은 예시/이어가기 | 역할 분리 |
| Flow 찾기 | source + preview + 더보기 | catalog density | 통과 |
| Wedding | artifact switch | context/result | 통과 |
| Workout | summary-first | summary + settings | 통과 |
| My Flow | compact library -> workspace | rail/canvas | 통과 |
| Calendar | agenda + sheet/tray | calendar + inspector | 통과 |
| Lifecycle | direct restore/delete dialog | 같은 capability | 통과 |

P31 browser gate에서 horizontal overflow, fixed overlap, console error, page error는 재현되지 않았다. icon/command accessible name은 대상 Flow 또는 Item 제목과 action을 함께 가진다.

## 8. 24-Cell 결과

- supported `21`
- partial `3`
- blocked `0`
- explanation-free `21 / 24`
- interaction depth `115`, 평균 `4.79`

P30의 explanation-free `13 / 24` 대비 목표 `>=20 / 24`를 자동·휴리스틱 gate에서 통과했다. 이것은 실제 사용성 증명이 아니다.

## 9. 남은 위험

### 실제 사용자에게 확인

1. 재방문 Home에서 활용 예시와 최근 실행의 우선순위가 맞는가.
2. 결혼/프로젝트 Flow 저장 후 고급 export scope를 찾을 수 있는가.
3. 50개 이상 Flow Calendar filter를 설명 없이 사용할 수 있는가.
4. `보관`과 `이 기기에서 영구 삭제`의 차이를 confirmation copy만으로 이해하는가.

### 기술 잔여

- localStorage 기반이므로 브라우저/기기 간 복구는 지원하지 않는다.
- 영구 삭제 전에 자동 cloud backup은 없다.
- 실제 popularity/review telemetry가 없으므로 social proof는 의도적으로 비어 있다.
- Home returning hierarchy는 telemetry 또는 관찰 전까지 가설이다.

## 10. 판정

현재 자동 integration gate 기준으로 P31 implementation은 keep이다. source/personal/run/occurrence/export schema를 대대적으로 다시 설계할 근거는 발생하지 않았다. 위 네 질문은 observed-user gate가 열릴 때 검증한다.

## 11. Current Command Verification

| Command | Result |
| --- | --- |
| `npm.cmd ci` | pass |
| `npm.cmd test` | `586 / 586` |
| P31 targeted Playwright | `5 / 5` |
| full Playwright, workers 2 | `310 / 310` |
| `npm.cmd run docs:check` | `14` required files, `2938` local links |
| `npm.cmd run build` | Next `15.5.21`, `18 / 18` routes |
| `npm.cmd audit --omit=dev` | critical `0`, high `0`, moderate `2` |

첫 full Playwright 4-worker 실행은 테스트 서버 종료로 `ERR_CONNECTION_REFUSED`가 연쇄 발생했다. P30과 같은 2-worker 조건에서 앱 assertion 1건이 아니라 구형 responsive selector 1건만 확인됐고, 공통 library helper로 갱신한 뒤 targeted `1/1` 및 full `310/310`이 통과했다.

Next `15.5.20`의 high advisory는 `15.5.21` patch로 제거했다. 남은 moderate advisory는 Next 내부 PostCSS에 대한 것으로, audit의 자동 수정이 Next `9.3.3` breaking downgrade를 요구하므로 승인 예외로 기록한다.
