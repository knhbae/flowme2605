# Interaction Spec

> 2026-08-04 v2가 이 문서의 이전 가변 결과·inline 구조 편집 설명보다 우선한다.
> 제품은 대표 예시 5개를 하나의 select로 보여 주고, 27개 fixture는
> `?authoringQa=1`에만 둔다. 결과는 네 고정 슬롯이며 구조 편집은 별도 dialog다.

## Responsive composition

### 390x844

하나의 surface에서 세 단계로 진행한다.

```text
[Input] [Structure] [Result]
```

- Input: composer와 source/import 상태
- Structure: interpreted outline와 issue
- Result: artifact와 save/export
- Item edit와 구조 수정은 별도 dialog/sheet
- 단계 이동 시 입력과 selection을 보존
- sticky footer에는 현재 단계의 primary action 하나만 둔다.
- 단계 navigation 아래의 단일 예시 select는 현재 단계를 바꾸지 않는다.

### 1024x768

- 왼쪽 38%: input/source
- 오른쪽 62%: structure 또는 result
- contextual inspector와 구조 수정은 별도 drawer/dialog
- phase switch는 compact segmented control
- source detail은 접힘

### 1440x900

- left 34%: source/text
- center 31%: interpreted outline
- right 35%: artifact/inspector
- 세 열을 항상 고정하지 않고 focus mode로 2열 전환
- toolbar는 row height를 바꾸지 않는 안정된 크기

## Composer

- multiline textarea
- paste와 typing을 구분하되 사용자에게 경로를 먼저 고르게 하지 않는다.
- URL, Markdown, table 감지 결과를 작은 status row로 표시한다.
- `표 가져오기`는 보조 icon+text action
- 제목은 즉시 반영하고, 보호되지 않은 원문은 짧은 debounce 뒤 현재 단계의
  Structure와 Result에 자동 반영한다.
- 상단 example select는 production의 보조 학습 UI다. 대표 예시 5개가 문법,
  일반 메모, 상대 날짜, 표, source-backed 영상 목록의 실제 입력과 자연 artifact를
  연결한다. QA 27개는 제품 화면에서 숨긴다.
- example을 둘러보는 것만으로 draft/recovery를 만들지 않는다. 작성 중인 값을
  바꾸려면 discard 확인을 거친다.
- 저장했거나 구조를 직접 고친 document의 source 변경은 자동으로 덮어쓰지 않고
  incoming compare state를 만든다.

## Structure row

기본 anatomy:

```text
[ - [ ] ] title
          indented property summary
[exception role] source line / issue summary
[more]
```

기본 화면은 Step/Item 순서와 property summary를 읽기 전용으로 보여 준다.
`구조 수정` dialog를 연 뒤에만 다음 control을 노출한다.

- keyboard move up/down
- 합치기
- 나누기
- Item/resource/guide 역할과 결과 포함 여부
- 원래 해석으로 복구

완료/실행 control은 authoring row에 두지 않는다.
Item끼리의 그룹은 `## Step`으로 표현한다. 공백 두 칸 들여쓰기는 Item 아래
설명·날짜·반복 같은 property의 소속을 나타낸다.

## Contextual editor

첫 화면:

- 제목
- 상세
- 완료 기준

`일정과 속성` 펼침:

- absolute/relative date mode
- date/time/timezone
- place
- estimated duration
- recurrence
- condition

`근거와 자료` 펼침:

- source fragment
- source URL
- resource
- source/user conflict

한 번에 하나의 Item만 수정한다.

## Artifact preview

- `캘린더 | 체크/할 일 | 표/엑셀 | 텍스트`를 같은 순서와 geometry로 항상
  표시한다.
- 사용할 수 없는 슬롯은 제거하지 않고 disabled reason을 도움말로 제공한다.
- 표/엑셀은 원본 표 또는 반복되는 의미 필드가 있을 때 실제 열·셀·URL을 보인다.
- 텍스트는 원문 그대로와 정리된 TXT/Markdown을 구분한다.
- switching 전에 loss summary를 보여 준다.
- artifact switch는 canonical mapping을 바꾸지 않는다.

예:

```text
체크/할 일 · 5개 항목
캘린더 · 1개 / 표·엑셀 · 사용 불가 / 텍스트 · 5개
```

## Save paths

### Personal

CTA:

```text
개인 Flow 5개 항목으로 저장
```

저장:

- raw text snapshot
- mapping
- personal structural edit
- personal values
- source reference

### Creator

CTA:

```text
제작자 초안으로 저장
```

검토 gate:

- source scope
- sourceTrace
- rights
- safety
- unresolved

### Correction

CTA:

```text
원본 수정 제안 보내기
```

개인 사본 변경과 분리한다.

## Export

1. scope: whole/selected/current
2. eligible artifact
3. count/loss
4. execute
5. receipt

format보다 scope를 먼저 고른다.

## Keyboard

- `Ctrl/Cmd+Enter`: 현재 단계 primary action
- `Alt+Up/Down`: selected row reorder
- `Tab/Shift+Tab`: normal focus order
- `Escape`: dialog/sheet cancel and focus return
- shortcuts는 도움말 없이도 필수 경로가 가능해야 하며 accelerator일 뿐이다.

## Feedback

- parse start: inline progress, layout 유지
- correction: status + undo
- save/export: receipt로 전환
- recovery: polite `aria-live`
- destructive remove: source 삭제가 아니라 draft mapping 제외임을 명시

## Anti-patterns

- 5개 artifact 고정 tab
- 한 화면에서 source, 모든 Items, 모든 properties 동시 편집
- 가짜 AI thinking animation
- source URL만 있는 상태에서 본문을 가져온 척하기
- 중첩 card
- 선택 상태를 색상만으로 표현
- mobile bottom nav와 sticky CTA overlap
