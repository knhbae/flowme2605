# 실행 계획

1. 정본·현재 구현·168개 trace에서 D2-017/D2-020 요구와 충돌을 확정한다.
2. occurrence v1과 TXT v2의 identity, horizon, serialization, 실패 계약을 순수 모델과 테스트로 고정한다.
3. authoring parser가 반복·전용 속성·한 단계 하위 체크를 손실 없이 materialize하도록 확장한다.
4. result projection v3에서 하나의 occurrence manifest로 Text/Todo/Calendar/Sheet/TXT를 만든다.
5. 저장 Flow 결과에서 회차 날짜 이동·완료/다시 열기·원본 Item 수정을 분기하고 Undo/reload를 연결한다.
6. 독립 HTML에 같은 모델·조작·바이트 계약을 구현하고 single-file을 재생성한다.
7. no-op/failure/storage boundary와 전체 회귀·build·6 viewport를 검증한다.
8. trace를 갱신하고 P2-B 결과 보고서와 handoff를 작성한다.

P2-B는 D1-012, D2-023 속성 picker 완성, D2-026 외부 동기화, 전반 시각 리디자인을 다루지 않는다.
