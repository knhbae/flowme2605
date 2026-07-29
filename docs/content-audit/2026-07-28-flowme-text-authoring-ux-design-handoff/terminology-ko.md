# Text Authoring UX Terminology

| User-facing concept | Meaning | Avoid exposing |
|---|---|---|
| Flow | 하나의 실행 가능한 계획 | bundle registry, canonical key |
| 구간 | 관련 할 일을 묶는 순서·시기·주제 | Step enum |
| 할 일 | 독립적으로 완료·결정·기록할 단위 | Item state internals |
| 자세히 | 방법, 맥락, 주의, 완료 기준 | raw detail field |
| 자료 | URL, 영상, 문서, 참고 정보 | resource subtype enum |
| 출처 | 원문과 근거 위치 | sourceTrace internals |
| 내 입력 | 사용자가 추가하거나 바꾼 값 | personal overlay |
| 해석 확인 | FlowMe가 나눈 구조를 확인 | parse reconciliation |
| 결과 미리보기 | Calendar, Todo, Sheet, Memo 중 실제 결과 | projection engine |
| 개인 초안 | 사용자만 수정하는 Flow | draft storage schema |
| 공개용 초안 | 검토·승인 전 제작자 초안 | creator draft status enum |
| 수정 제안 | 공개 기준본을 덮어쓰지 않는 제안 | canonical mutation |

## Command Copy Principles

- `저장`, `실행`, `내보내기`만 단독으로 쓰지 않는다.
- 결과와 범위를 포함한다: `개인 Flow 14개 항목으로 저장`.
- blocked 상태에는 이유와 다음 행동을 함께 둔다.
- source-derived 값과 내 입력을 색상만으로 구분하지 않는다.
- 사용자에게 `Flow/Step/Item` 용어 학습을 첫 화면에서 강요하지 않는다.
