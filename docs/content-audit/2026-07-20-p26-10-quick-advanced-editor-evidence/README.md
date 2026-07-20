# P26-10 Quick / advanced item editor evidence

## 판정

- 상태: `complete_internal_evidence`
- 기준 커밋: `05e0f22`
- 실제 관찰 사용자: `0`
- evidence: `current_source`, `current_command`, `current_browser`, `reference_pattern`

My Flow와 Calendar의 항목 수정 화면을 `빠른 조정`과 `세부 일정`으로 분리했다. 제목, 날짜, 메모는 첫 프레임에 남기고 시간, 장소, 반복, 항목 유형별 추가 필드는 사용자가 펼쳤을 때만 보인다.

`2026-07-19-flow-content-usage-preview-ko.html`에서 확인한 제목, 시점, 개수, 결과 중심의 compact hierarchy를 참고했다. 해당 artifact의 긴 설명이나 내부 용어는 복제하지 않았다.

## 화면 계약

### 모바일 390px

- 수정 화면은 Flow 카드 안에서 늘어나지 않고 viewport를 채우는 별도 편집 화면으로 열린다.
- 제목, 날짜, 메모와 `세부 일정` 진입점이 첫 화면에 보인다.
- 시간, 장소, 반복은 기본 상태에서 보이지 않는다.
- 취소, Escape, 다른 My Flow 탭 이동은 수정값이 있을 때 버리기 확인을 거친다.
- 편집 중 body scroll을 잠그고 safe-area와 sticky 저장 영역을 유지한다.
- 저장 또는 취소 후 원래 `열기` 버튼으로 focus가 돌아간다.

### 와이드 1024px

- 전체 Flow outline 오른쪽의 기존 17~20rem detail pane 안에서 편집한다.
- outline과 편집기를 함께 볼 수 있으며 새 페이지나 modal layer를 만들지 않는다.
- 저장 actions는 pane 하단에서 sticky로 유지된다.

### Calendar

- Calendar agenda도 My Flow와 같은 항목 편집 component를 사용한다.
- 모바일에서는 동일한 full-screen quick editor가 열린다.

## 접근성

- 편집 surface: `role="dialog"`, 제목 연결
- 모바일: `aria-modal="true"`, focus trap, Escape discard guard
- validation: 시간, 소요 시간, 반복 입력에 `aria-invalid`와 연결된 오류 설명
- focus: 편집 진입 후 제목 input, 종료 후 원래 `열기` command

## 현재 검증

- P26-10 dedicated Playwright: `3 / 3` pass
- progressive/intent-field, explicit edit, whole-Flow workspace/reading 회귀: `10 / 10` pass
- production build: pass, `18` routes
- mobile/wide horizontal overflow: `0`
- console/page error: `0`

자동 브라우저 결과이며 실제 사용자가 빠른 조정과 세부 일정의 차이를 설명 없이 이해하는지는 아직 검증하지 않았다.

## 화면

- [모바일 빠른 조정](./screenshots/01-mobile-quick-editor.png)
- [모바일 세부 일정](./screenshots/02-mobile-advanced-editor.png)
- [와이드 outline/detail pane](./screenshots/03-wide-advanced-detail-pane.png)
- [Calendar 모바일 빠른 조정](./screenshots/04-mobile-calendar-quick-editor.png)

## 다음 범위

P26-11은 이 편집기 안에 구조 변경을 더 넣지 않는다. 전체 Flow outline에서 개인 draft의 add/delete/restore/reorder와 여러 항목 조정을 명시적인 structural/batch mode로 분리한다.
