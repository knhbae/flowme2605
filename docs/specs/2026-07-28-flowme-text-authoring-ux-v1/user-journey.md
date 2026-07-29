# User Journey

## 1. 공통 여정

```text
입력 또는 붙여넣기
-> 형식 감지
-> 원문 범위와 구조 확인
-> unresolved만 수정
-> 전체 artifact 확인
-> 필요한 개인 값 입력
-> personal/creator/suggestion 경로 선택
-> 저장 또는 export
-> receipt
```

모든 여정에서 원문은 계속 접근 가능하며, 결과가 원문을 대체하지 않는다.

## 2. 개인 메모 사용자

### Session A

1. 제주 여행 메모를 입력한다.
2. 시스템은 문장과 쉼표를 기준으로 5개 Item 후보를 보여 준다.
3. 사용자는 `숙소 예약번호 정리`와 `렌터카 예약`의 순서를 바꾼다.
4. `출발 전날 온라인 체크인`에 기준일이 필요하다는 issue를 확인한다.
5. 날짜 없이도 Todo preview를 먼저 본다.

### Session B

1. 출발일을 입력한다.
2. 온라인 체크인의 D-1 날짜가 계산된다.
3. 개인 초안으로 저장한다.
4. receipt에서 5 Items, Todo primary, Calendar secondary count를 확인한다.

### Recovery

- reload 시 `작성 중 초안을 복구했습니다`가 표시된다.
- 원문 수정 시 기존 Item ID를 가능한 범위에서 유지하고 달라진 mapping만 표시한다.

## 3. Obsidian/Markdown 사용자

1. 기존 Markdown을 붙여 넣는다.
2. 지원된 heading/checklist/label과 무시하지 못한 syntax를 구분한다.
3. 원문과 interpreted outline을 비교한다.
4. 잘못 묶인 detail을 새 Item으로 분할한다.
5. primary artifact를 확인한다.
6. 개인 Flow 또는 creator draft로 저장한다.
7. Markdown export에서 원문과 FlowMe label의 round-trip 차이를 확인한다.

핵심: Markdown을 FlowMe 전용 문법으로 다시 쓰도록 강요하지 않는다.

## 4. 표·강의계획 사용자

1. TSV 또는 파일을 가져온다.
2. header와 14행/38행 범위를 확인한다.
3. 각 행이 Item인지 resource row인지 지정한다.
4. 현재 주차/현재 장은 source가 아닌 개인 값으로 넣는다.
5. Sheet primary preview를 본다.
6. 필요한 일부 행만 Todo로 보조 projection한다.

긴 자료는 row count, 현재 위치, search를 제공하고 임의로 축약하지 않는다.

## 5. 제작자

1. source URL, 인용 가능한 원문 또는 본인 콘텐츠를 입력한다.
2. 확보 범위와 권리 상태를 확인한다.
3. creator draft를 만든다.
4. Step/Item/detail/completion/sourceTrace를 보완한다.
5. 안전·권리 gate를 통과한다.
6. preview 후 검토 요청으로 보낸다.

`공개`는 authoring prototype의 즉시 행동이 아니다. 승인된 publish pipeline만 canonical
version을 만든다.

## 6. 기존 공개 Flow를 고치는 사용자

1. 공개 Flow를 연다.
2. 개인 사본으로 시작한다.
3. personal title/date/memo/include 상태를 수정한다.
4. 개인 사본을 실행한다.
5. 원본 오류를 발견하면 개인 수정과 분리된 correction suggestion을 만든다.

원본과 개인 사본을 같은 저장 버튼으로 덮어쓰지 않는다.

## 7. 여덟 사례별 journey

### 이사 D-30

- input: source-backed Markdown 또는 frozen fixture
- preview before input: D-30 구간과 상대 날짜
- required user value: 실제 Calendar 저장 시 이사일 1개
- correction: Step/Item mapping, 개인 제외, 날짜 고정
- primary: Calendar
- secondary: Checklist
- receipt: version, 27 또는 24 Item, 날짜 범위

### 차량 점검

- input: D-14, D-10, D-3, D-Day 상대일 timeline
- preview: 상대일이 보존된 10 Item
- required user value: 0
- correction: 기준일 없이 Todo로 저장하거나, 검사일을 넣어 Calendar로 계산
- primary: anchor 전 Todo, anchor 후 Calendar
- secondary: Checklist
- prohibited: 원문 offset 삭제, 검사일·수수료·판정 발명

### Allblanc 7일 순서형

- input: Day 1~7 순서와 각 영상 URL
- preview: 7개 sequence와 resource
- user value: 시작일은 Calendar 사용 시에만
- primary: Calendar
- secondary: Checklist
- prohibited: 영상 URL을 완료 Item으로 만들기, 7일형을 무한 weekly recurrence로 바꾸기

별도 runtime variant인 `curated-allblanc-morning-workout`은 1개 영상에 사용자가 요일,
시간, 종료 조건을 정하는 routine이다. 두 variant는 같은 benchmark나 저장 객체로
합치지 않는다.

### K-MOOC

- input: 14-row table
- preview: 14 rows Sheet
- user value: 현재 완료 주차
- primary: Sheet
- secondary: selected Todo
- prohibited: 행 축약, 날짜 생성

### LibriVox

- input: 38-chapter table
- preview: ordered queue
- user value: current chapter and playback position
- primary: Sheet/Queue
- secondary: Memo
- prohibited: 반복 routine 또는 날짜 생성

### 신차 구매

- input: 8 Step decision/check/record content
- preview: 14 Items grouped by 8 Steps
- user value: 후보와 비교 값
- primary: Checklist
- secondary: Sheet, Memo
- prohibited: 기록 field를 binary completion으로 축소

### 해외여행 안전정보

- input: official guide/source
- preview: guide/caution과 제한된 action
- user value: 개인 여행 note
- primary: Memo/Guide
- secondary: action Checklist
- prohibited: source에 없는 안전 조언

### 제주 여행 메모

- input: one free-text sentence
- preview: 5 Items
- user value: optional trip date/place/note
- primary: Todo
- secondary: Calendar, Memo
- correction: split/merge/reorder/rename/include

## 8. 실제 사용자에게만 확인 가능한 질문

1. 일반 메모 사용자는 원문과 outline을 동시에 보는 것이 신뢰를 높이는가?
2. 자동 감지 후 첫 번째로 고치고 싶은 것은 구조인가, 실제 결과인가?
3. Markdown 사용자는 label을 직접 쓰려 하는가, inspector를 선호하는가?
4. 긴 Sheet에서 search와 현재 위치 중 어느 것이 먼저 필요한가?
5. 개인 초안과 제작자 초안의 차이를 행동 문구만으로 이해하는가?
