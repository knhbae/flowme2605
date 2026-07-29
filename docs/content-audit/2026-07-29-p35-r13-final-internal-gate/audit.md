# P35-R13 audit

## 1. 사용자 결정 반영

### B안 유지

My Flow는 기본적으로 cross-Flow 실행 목록을 보여준다. 사용자가 날짜에 맞춰 해야 할 일을 먼저 보고 완료할 수 있으며, 저장 Flow 자체를 찾고 관리할 때는 같은 화면의 `Flow` 보기로 이동한다.

### A안에서 채택한 요소

- 정확한 날짜별 rail
- 같은 날짜 항목의 한 묶음
- 행 전체를 여는 넓은 조작 대상
- 오른쪽 완료 checkbox 한 개
- 기본 행의 텍스트 명령 제거

### 첫 진입만 펼침

public 저장 영수증의 primary action으로 처음 들어오면 저장 결과를 확인할 수 있도록 전체 계획을 펼친다. 같은 URL을 reload하거나 Flow 목록으로 돌아갔다 다시 열면 전체 계획은 접힌다. 이 상태는 session-only handoff이며 product storage schema에는 추가하지 않았다.

## 2. 데이터 경계

변경하지 않은 계약:

- source content
- personal overlay
- execution run과 완료/reopen
- recurrence series/occurrence
- export identity와 destination projection
- 기존 localStorage key와 snapshot schema

새로운 cross-Flow 화면은 기존 effective row와 stable Item identity를 읽는다. 완료 후 `completed` 그룹으로 이동하고 reopen하면 같은 identity로 원래 날짜 그룹에 돌아온다.

## 3. 화면 검증

### 390x844

- 날짜 rail과 행 제목이 겹치지 않음
- 행의 visible command는 완료 checkbox 한 개
- 별도 수정/메모/open 텍스트 명령 없음
- public 저장 직후 전체 계획 open
- reload와 목록 재진입 후 전체 계획 closed
- horizontal overflow 0
- viewport 밖 fixed layer 0
- console/page error 0

### 1024x768 / 1440x900

- 날짜별 실행 목록과 contextual inspector 분리
- 행을 열면 오른쪽 inspector에서 상세 확인
- 날짜 rail, 제목, checkbox가 같은 행에서 충돌하지 않음
- horizontal overflow 0
- viewport 밖 fixed layer 0
- console/page error 0

## 4. 회귀 대응

전체 E2E 첫 실행은 `344/405`였다. 61개 실패는 평소 `/my`가 기존 Flow library로 바로 열린다는 과거 테스트 전제와, 재진입에서도 전체 계획이 항상 펼쳐진다는 과거 전제에 집중됐다.

제품 계약을 되돌리지 않고 다음처럼 테스트 의도를 명시했다.

- Flow library/detail 검증은 `Flow` 보기를 먼저 선택
- 전체 계획 검증은 disclosure를 명시적으로 펼침
- 개인 초안 구조 편집은 Flow 보기와 계획 펼침 후 실행

검증 중 두 가지 안정성 결함도 함께 닫았다.

1. 편집기가 열린 직후 예약된 제목 focus가 사용자의 빠른 메모 입력 focus를 가로챌 수 있었다.
   편집기 안에 이미 활성 요소가 있으면 예약 focus를 취소하도록 수정했고, 메모 입력과 제목
   불변 회귀를 `10/10` 반복 검증했다.
2. `demo=ux50/ux60`의 scale fixture가 demo 전용 bundle보다 먼저 초기화되어 50개가 아닌
   기본 12개만 주입될 수 있었다. URL의 demo mode에 맞는 bundle로 첫 초기화를 수행하도록
   보정했고 P30 scale/Calendar 파일을 `12/12` 재검증했다.

장시간 로컬 실행에서 남아 있던 Playwright process가 다음 실행의 server와 충돌한 기록은
제품 실패와 분리했다. 관련 process를 범위 확인 후 종료하고 `workers=1`의 4개 shard를
순차 실행한 최종 결과는 `405/405`다.

## 5. 잔여 위험

1. 실제 관찰 사용자 수는 0이다.
2. 기본 cross-Flow 화면의 1/5/20/60 Flow 실사용 밀도는 자동 fixture로만 확인했다.
3. 완료 그룹의 장기 누적 밀도와 사용자가 `Flow` 보기 전환을 발견하는지는 실제 관찰이 필요하다.
4. rollback query는 내부 안전장치이며 사용자 기능으로 노출하지 않는다.
5. 이번 판정은 internal review 준비 완료이며 commit, PR, preview, production publish는 별도 단계다.
