# P35-R8~R12 decision log

## D-01 - 기술 gate는 사용자 승인 gate가 아니다

- 결정: R8A~R12는 각 acceptance를 통과하면 연속 진행한다.
- 사용자 확인: R12 A/B/C 비교 package가 준비된 P35-H1에서 처음 요청한다.

## D-02 - Routine 다음 회차와 Calendar 범위를 분리한다

- 결정: Calendar 월 범위와 실행용 다음 occurrence selector를 분리한다.
- 이유: 월/주 화면 범위는 presentation concern이고 series의 다음 실행 가능 여부는
  execution correctness concern이다.
- 보존: series ID, revision ID, occurrence ID, 완료 기록, ICS UID.

## D-03 - 반복 count는 series와 occurrence를 구분한다

- open-ended receipt: `반복 계획 1개 · 계속 반복`
- 화면 preview: 다음 occurrence 최대 3개
- export: 실제 builder가 생성하는 event 수와 범위를 표시
- 임의 4주를 전체 반복 수처럼 표현하지 않는다.

## D-04 - Memo/Checklist 판정 기본값

`overseas-safety-register`의 source Item이 독립 실행 행동과 완료 기준을 가지면
Checklist primary, Memo secondary로 통일한다. 읽기·기록 중심이라는 source
근거가 확인될 때만 Memo primary와 completion 제거를 선택한다.

## D-05 - 해외여행 안전 Flow는 Checklist primary다

- 확인 결과 네 행은 여행경보 확인, 비상 연락처 저장, 동행등록 검토처럼 독립 실행
  행동이다.
- 결정: Checklist primary, Memo secondary.
- resource와 warning은 화면에 남기되 completion denominator에서 제외한다.

## D-06 - 완료 undo는 행이 현재 surface에서 사라질 때만 제공한다

- 현재 실행에서 완료한 행이 전체 계획의 같은 stable Item checkbox로 남으면
  snackbar undo를 만들지 않는다.
- 접힌 전체 계획 안으로 이동해 현재 화면에서 보이지 않게 되면 snackbar undo를
  제공한다.
- Calendar처럼 완료 후에도 같은 행과 checkbox가 보이는 surface에서는 완료
  snackbar undo를 만들지 않는다.
- 다시 열기 결과는 되돌리기가 아니라 같은 항목으로 돌아가는 짧은 feedback과
  `항목 보기`를 제공한다.
- 다시 열기는 동일 stable Item/occurrence identity를 사용한다.

## D-07 - Preview와 saved row는 시각 문법을 공유하고 기능 상태는 분리한다

- 저장 전 preview 행은 실제 결과의 제목·메타·resource 구분을 보여준다.
- 저장 전 preview에는 완료 checkbox를 만들지 않는다.
- 저장 후 실행 행만 trailing completion control을 소유한다.
- 동일한 모양을 이유로 preview를 실행 가능한 행처럼 과장하지 않는다.

## D-08 - My Flow library filter는 lifecycle 한 축만 사용한다

- library filter는 `전체 / 진행 중 / 완료 / 보관됨`만 제공한다.
- routine, checklist, memo 같은 콘텐츠 shape는 검색 결과와 object metadata로만 보조한다.
- routine 범위 선택은 Calendar lens에서 유지하며 library lifecycle filter와 섞지 않는다.

## D-09 - Shape가 지원하지 않는 상태는 숨기고 가짜 진행률을 만들지 않는다

- Memo는 completion unit이 아니므로 완료 checkbox와 progress bar를 제공하지 않는다.
- 한 routine series를 한 Item처럼 `0/1`로 표현하지 않고 series와 occurrence를 분리한다.
- 같은 날짜의 여러 행은 group header가 날짜를 소유하고 각 row는 날짜를 반복하지 않는다.
- export scope/count는 preflight summary 한 곳이 사용자에게 보이는 정본이다.

## D-10 - Wide My Flow는 library, execution, inspector 역할을 분리한다

- 1024/1440에서 왼쪽은 Flow 선택, 가운데는 현재 실행과 전체 계획, 오른쪽은
  선택 맥락과 명령을 소유한다.
- 모바일은 실행 묶음 다음에 전체 계획을 두고 별도 inspector를 만들지 않는다.
- 레이아웃 변경은 presentation layer에 한정하며 저장 구조와 identity를 바꾸지
  않는다.

## D-11 - 교차 Flow Todo는 전역 IA가 아닌 opt-in 실험으로 검증한다

- 기본 `/my`와 `My Flow` 전역 탭은 유지한다.
- `experiment=todo`에서만 `할 일 / Flow` 로컬 전환을 제공한다.
- Todo는 실행 가능한 Item만 모으며 Memo 기록, resource, routine series 정의는
  제외한다.
- Todo와 Calendar는 같은 stable Item과 완료 상태를 읽는다.
- 실험을 닫으면 저장 데이터 변경 없이 기존 My Flow로 돌아간다.

## D-12 - H1 추천은 B안이지만 전역 변경은 사용자 결정 뒤로 미룬다

- A: 현재 My Flow 유지
- B: My Flow 안에 교차 Flow 할 일 보기 추가
- C: 전역 My Flow를 할 일로 변경하고 Flow library를 재배치
- 자동 검증 기준 추천은 B다. C는 정적 proposal만 만들고 앱에는 적용하지 않는다.
