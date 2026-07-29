# Accessibility Review

- 검토일: 2026-07-28
- 대상: standalone interactive prototype과 wireflow
- 관찰 사용자 수: 0
- evidenceKind: `current_browser_automation`, `heuristic_simulation`

## 결과

| 항목 | 결과 | 근거 |
|---|---|---|
| Keyboard main journey | pass | case 선택, 입력, 구조 확인, Item 선택·수정, 결과, 저장, receipt까지 실행 |
| Accessible name | pass | 주요 입력과 버튼에 visible label 또는 accessible name 존재 |
| Focus visibility | pass | keyboard 이동에서 focus indicator 확인 |
| Focus transition | pass | Item 편집 적용 후 작업면, receipt 닫기 후 원래 맥락으로 복귀 |
| Status feedback | pass | parse, save, export, recovery feedback를 status/toast로 제공 |
| Horizontal overflow 390 | pass | `scrollWidth <= innerWidth` |
| Horizontal overflow 1024 | pass | `scrollWidth <= innerWidth` |
| Fixed overlap | pass | 1024에서 toast 외 고정 UI 없음, 핵심 CTA 가림 없음 |
| Color-only state | pass | source/user, selected, blocked 상태에 text label 병행 |
| Blocked recovery | pass | 이유, 보존 내용, 다음 행동, 원문으로 돌아가기 제공 |

## Keyboard 재현 경로

1. 콘텐츠 사례를 선택한다.
2. composer에 focus하고 입력한다.
3. `구조 확인`을 실행한다.
4. outline row를 선택한다.
5. contextual editor에서 제목을 변경한다.
6. `변경 적용`을 실행한다.
7. `전체 결과 보기`로 이동한다.
8. 저장 action을 실행한다.
9. receipt의 첫 action과 닫기 control을 확인한다.

## 남은 구현 요구

prototype pass는 production component pass를 의미하지 않는다. 구현 시 다음을 E2E로
고정한다.

- mobile sheet/dialog의 focus trap과 `Escape`
- reorder control의 keyboard 대체 동작과 위치 공지
- merge/split 이후 screen reader status
- 긴 38행 Sheet에서 현재 위치와 검색 결과 공지
- validation error와 unresolved issue의 field association
- toast가 사라진 뒤에도 복구 가능한 영속 feedback

## 제한

실제 screen reader 사용자와 저시력 사용자를 관찰하지 않았다. browser automation과
heuristic review를 observed-user accessibility validation으로 표현하지 않는다.
