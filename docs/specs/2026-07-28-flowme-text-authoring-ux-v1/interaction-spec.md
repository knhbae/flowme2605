# Interaction Spec

## Responsive composition

### 390x844

하나의 surface에서 세 단계로 진행한다.

```text
[Input] [Structure] [Result]
```

- Input: composer와 source/import 상태
- Structure: interpreted outline와 issue
- Result: artifact와 save/export
- Item edit는 full-height bottom sheet
- 단계 이동 시 입력과 selection을 보존
- sticky footer에는 현재 단계의 primary action 하나만 둔다.

### 1024x768

- 왼쪽 38%: input/source
- 오른쪽 62%: structure 또는 result
- contextual inspector는 오른쪽 drawer
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
- example case selector는 평가 prototype에만 있으며 production primary UI가 아니다.

## Structure row

기본 anatomy:

```text
[role icon] title
source line indicator
issue/count summary
[more]
```

직접 노출:

- row 선택
- drag handle 또는 keyboard reorder
- include/exclude 상태

more menu:

- 합치기
- 나누기
- 들여쓰기
- 내어쓰기
- Item/resource/guide 역할
- 원래 해석으로 복구

완료/실행 control은 authoring row에 두지 않는다.

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

- primary artifact를 자동 선택한 이유와 count를 짧게 표시한다.
- secondary는 실제 데이터가 있고 의미 있을 때만 제공한다.
- switching 전에 loss summary를 보여 준다.
- artifact switch는 canonical mapping을 바꾸지 않는다.

예:

```text
Todo · 5개 항목
날짜가 있는 1개만 Calendar에서도 볼 수 있어요.
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
