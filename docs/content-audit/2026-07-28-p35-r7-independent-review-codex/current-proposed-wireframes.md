# P35-R7 current / proposed anatomy

이 문서는 새 화면 체계를 제안하지 않는다. 현재 P35-R7의 안정된 구조를 유지하면서
중복 control과 의미 불일치를 제거하는 bounded composition을 정의한다.

## 390px public Flow

### Current

```text
┌────────────────────────────────┐
│ source · title                 │
│ primary artifact · 24개        │
├────────────────────────────────┤
│ □ Item 1                 수정  │  <- preview 장식이 checkbox처럼 보임
│ □ Item 2                 수정  │
│ □ Item 3                 수정  │
│ 나머지 21개 보기               │
├────────────────────────────────┤
│ 기준일                         │
│ [Flow 조정] [캘린더로 시작]    │
└────────────────────────────────┘
```

### Proposed

```text
┌────────────────────────────────┐
│ source · title                 │
│ Calendar · 24개 · 7/02~8/01   │
├────────────────────────────────┤
│ 1  Item 1                수정  │  <- neutral ordinal
│ 2  Item 2                수정  │
│ 3  Item 3                수정  │
│ 나머지 21개 보기               │
├────────────────────────────────┤
│ 기준일                         │
│ [Flow 조정] [캘린더 24개 시작] │
└────────────────────────────────┘
```

- 첫 시선: 실제 artifact와 수량
- primary action: 콘텐츠별 시작 또는 가져가기
- secondary action: Flow 조정
- 접힘 정보: source detail, 포함·순서, secondary artifact
- 제거: completion으로 보이는 preview 사각형

## 390px saved Calendar workspace

### Current

```text
┌────────────────────────────────┐
│ Flow title · 0/24              │
├─ 다음 할 일 · 4개 ─────────────┤
│ Item A                       □ │
│ Item B                       □ │
│ Item C                       □ │
│ Item D                       □ │
├─ 전체 계획 ────────────────────┤
│ 7/02 · 4개                     │
│ Item A                       □ │  <- 같은 행/checkbox 반복
│ Item B                       □ │
│ Item C                       □ │
│ Item D                       □ │
│ ...                            │
└────────────────────────────────┘
```

### Proposed

```text
┌────────────────────────────────┐
│ Flow title · 0/24              │
├─ 다음 할 일 · 7/02 · 4개 ─────┤
│ Item A                       □ │
│ Item B                       □ │
│ Item C                       □ │
│ Item D                       □ │
├─ 전체 계획 ────────────────────┤
│ 7/02 · 현재 실행 중 4개   [>]  │  <- context only
│ 7/18 · 3개                [>]  │
│ 7/25 · 5개                [>]  │
│ ...                            │
├────────────────────────────────┤
│ [여러 할 일 조정] [가져가기]   │
└────────────────────────────────┘
```

- 완료 owner: 현재 실행 묶음 하나
- 전체 계획 owner: 구조와 나머지 범위
- 현재 날짜 그룹을 펼쳐도 duplicate completion control은 만들지 않는다.

## 390px Routine workspace

### Current

```text
반복 계획 · 월·수·금 · 07:30 · 계속
이번 회차
8/03 홈트  □

완료 후:
남은 회차가 없습니다.
```

### Proposed

```text
반복 계획 · 월·수·금 · 07:30 · 계속
이번 회차
8/03 홈트  □
다음 8/05

완료 후:
이번 회차 완료
다음 회차
8/05 홈트  □
```

- series summary, current occurrence, history를 다른 수준으로 표시한다.
- 종료 조건에 도달했을 때만 `반복이 끝났어요`를 표시한다.
- receipt: `반복 계획 1개 저장 · 다음 회차 8/03`
- export: `반복 일정 1개 · 파일에 포함될 회차 12개`

## 390px Memo workspace

### Current

```text
메모 · 4개
전체 0/4 완료
□ 여행경보 확인
□ 영사콜센터 확인
□ 동행서비스 확인
□ 재외공관 연락처
```

### Proposed decision gate

```text
Option A: 실제 행동이면
Checklist · 4개
□ 여행경보 확인
□ 영사콜센터 저장
...
보조 결과: 메모 복사

Option B: 읽기·기록 자료면
메모 · 4개 섹션
여행경보 / 영사조력 / 비상연락 / 출처
[내 메모 추가] [메모 복사]
완료율 없음
```

두 option을 한 화면에 제공하지 않는다. 콘텐츠 계약에서 하나를 선택한 뒤 public,
receipt, workspace, export가 동일한 문법을 사용한다.

## 390px Item detail

### Proposed anatomy

```text
┌────────────────────────── [x] ┐
│ Item title                    │
│ date · time · location        │
├───────────────────────────────┤
│ 상세 설명                     │
│ 완료 기준                     │
│ source/resource               │
├───────────────────────────────┤
│ [할 일 수정] [메모]           │
└───────────────────────────────┘
```

- visible close는 header 하나
- Escape, backdrop, focus return 유지
- archive/delete/export는 Item 기본 detail에 상시 배치하지 않는다.

## 1024px public Flow

### Current strengths to keep

```text
┌──────────── artifact canvas ───────────┬─ contextual inspector ─┐
│ source + title                         │ selected Item only      │
│ actual rows                            │ title/detail/date       │
│ remainder disclosure                   │ [cancel] [apply]        │
│ artifact count                         │                         │
└────────────────────────────────────────┴────────────────────────┘
                       [조정] [primary action]
```

### Proposed change

- inspector는 Item을 열었을 때만 오른쪽 column을 점유한다.
- inspector가 닫히면 artifact canvas가 남은 폭을 사용한다.
- wide에서 mobile section card를 반복하지 않는다.
- public preview marker와 saved completion control을 명확히 구분한다.

## 1024px My Flow

```text
┌─ library rail ───────┬─ focused Flow canvas ──────┬─ item inspector ─┐
│ search               │ next execution owner       │ selected Item     │
│ lifecycle filter     │ whole-plan structure       │ edit/memo/source  │
│ Flow rows            │ export + Flow management   │                   │
└──────────────────────┴────────────────────────────┴───────────────────┘
```

- Item inspector는 선택할 때만 열린다.
- focused canvas는 current rows를 두 번 렌더하지 않는다.
- Routine은 series/current/history를 canvas 내부 수직 hierarchy로 구분한다.

## 1440px / 60 Flow

### Current

```text
Search
상태: 전체 / 진행 중 / 루틴 / 완료 / 보관됨
60-row rail | selected Flow canvas
```

### Proposed

```text
Search
상태: 전체 / 진행 중 / 완료 / 보관됨
60-row rail | selected Flow canvas | optional inspector
```

- `루틴`은 상태에서 제거한다.
- 별도 kind filter는 실제 탐색 실패 증거가 생기기 전에는 추가하지 않는다.
- virtualization은 현재 단계에서 비범위다.

## Command ownership summary

| Command | Owner |
| --- | --- |
| Flow save | public Flow |
| Item completion/reopen | current execution unit |
| Item edit | shared Item detail |
| Flow structural adjustment | focused Flow workspace |
| Calendar date change | shared Item detail or day sheet |
| whole/selected/current export | public preflight or focused workspace |
| archive/restore/delete | Flow management |
| occurrence completion | routine current occurrence |
| run history | actual past run section |
