# P26-10 audit

## 문제

기존 progressive editor는 일반 필드와 고급 필드를 데이터 수준에서 구분했지만 모바일에서는 inline detail 안에서 길어졌다. 그 결과 완료, 열기, 수정, 삭제, 이동과 schedule fields가 같은 카드 높이에 누적됐고, 취소 시 미저장 변경을 잃을 수 있었다.

## 구현

### 공통 편집 상태

- 기존 title/date/memo overlay, time/duration/recurrence, intent-specific fields를 그대로 사용한다.
- 저장 schema와 projection builder는 변경하지 않았다.
- 저장은 기존 단일 `saveMyFlowEditingDraft` commit path를 유지한다.
- source item은 변경하지 않고 personal overlay와 execution draft만 갱신한다.

### 모바일 containment

- `data-editor-layout="mobile-full-screen"`
- fixed viewport surface, body scroll lock, safe-area padding
- quick fields만 기본 노출
- advanced disclosure는 매 진입 시 닫힌 상태
- dirty close/tab/month/scope 이동 guard
- Escape, focus trap, focus return

### 와이드 containment

- `data-editor-layout="wide-detail-pane"`
- 기존 `my-flow-workspace-detail-pane`의 grid 폭을 유지
- outline의 row와 detail editor를 동시에 표시
- 저장 actions sticky

### 오류 연결

- timed schedule 오류는 time/duration input에 `aria-invalid`를 설정한다.
- 오류 문구 ID를 `aria-describedby`로 연결한다.
- recurrence interval과 fieldset도 같은 연결을 사용한다.

## 재현과 결과

| route | viewport | 재현 | 결과 | evidenceKind |
| --- | --- | --- | --- | --- |
| `/flow-maps/moving-d30` -> `/my?view=flows` | 390x844 | 개인 사본 저장, 첫 항목 열기, 조정 | quick editor가 viewport 안에 열리고 카드 높이를 늘리지 않음 | `current_browser` |
| `/my?view=flows` | 390x844 | 제목 변경, Escape, 계속 수정, 취소, 버리기 | dirty guard와 focus return 동작 | `current_browser` |
| `/my?view=flows` | 390x844 | 제목/메모 저장 후 reload | 같은 personal overlay 값 유지 | `current_browser` |
| `/my?view=flows` | 1024x768 | 전체 Flow 첫 항목 조정 | 17~20rem detail pane, sticky actions 유지 | `current_browser` |
| `/calendar?demo=ux12` | 390x844 | event 열기, 항목 조정 | My Flow와 같은 quick editor 사용 | `current_browser` |

## 회귀 범위

- 기존 title/date/memo save/reload
- advanced location/repeat save/reload
- decision field는 eligible item에만 노출
- My Flow whole-Flow reading outline 유지
- Calendar agenda detail 유지
- 완료 checkbox와 편집 entry 분리 유지

## 의도적 비범위

- P26-11 구조 편집과 batch adjustment
- P26-12 completion undo/reopen 정리
- P26-14 Calendar 날짜 없음 배치
- timezone, recurrence, export schema 재설계
- 실제 사용자 관찰

## 잔여 위험

1. 모바일 고급 영역은 작은 화면에서 여전히 스크롤이 필요하다. 이번 목표는 한 화면에 모든 설정을 넣는 것이 아니라 기본 경로를 짧게 하는 것이다.
2. browser unload의 native 경고 문구는 브라우저가 소유한다.
3. 반복 occurrence 범위 변경은 P26-12/P26-13 계약과 함께 다시 확인해야 한다.
4. 사용자가 `세부 일정`이라는 이름으로 시간, 장소, 반복을 예측하는지는 실제 관찰 전에는 확정할 수 없다.
