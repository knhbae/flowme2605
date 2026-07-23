# Frozen baseline rules v1

## Selection before conversion

1. 구조가 쉬워서가 아니라 실행 가치가 있어야 후보가 된다.
2. 100점 중 80점 이상과 모든 hard gate를 동시에 통과해야 positive다.
3. 원문 링크만 저장해도 같은 결과라면 positive가 아니다.
4. 일정·반복·진도·결정·상태·인계·export 중 유지 상태가 하나 이상 있어야 한다.
5. 형태 다양성은 가치 admission을 통과한 후보 안에서만 조정한다.

## Conversion

1. one original source → one user job → one natural artifact → minimal execution UI.
2. Flow의 최소 실행 단위는 Item이며 title, detail, completion, sourceRowRefs를 가진다.
3. source fact, creator experience, user overlay, caution을 분리한다.
4. source 값은 다시 묻지 않는다. 개인 적용에 필요한 0~2개 값만 묻는다.
5. 날짜 없는 Item에는 Calendar/ICS를 만들지 않는다.
6. primary artifact는 retained state로 정한다. 날짜가 등장한다는 이유만으로 Calendar를 고르지 않는다.
7. 행·최신성·권리·지역·안전 근거가 부족하면 source_import_required, hold, blocked로 멈춘다.
8. 원문에 없는 행동·날짜·반복·완료 기준을 발명하지 않는다.
9. rights basis와 public release를 별도 축으로 기록한다.
10. final holdout 결과를 본 뒤 이 규칙을 수정하지 않는다.

## Natural artifact tie-breaker

- Calendar: 사용자가 확정한 날짜 또는 공식 날짜창이 핵심 상태
- Sheet: 여러 행의 진도·값·비교 상태가 핵심
- Checklist: 한 세션 또는 한 상황의 확인 가능한 여러 행동
- Todo: 다음 한두 행동과 완료 상태가 핵심
- Memo: 실행보다 참고·결정 이유·주의 보존이 핵심

## Boundary stop

- 실제 행이 로그인·유료벽 뒤에만 있음
- 홍보 문구만 있고 lesson/task row 없음
- 실행행 없는 장문 조언
- 한 사용자 일을 만들려면 여러 출처를 섞어야 함
- 한국 적용성이 확인되지 않은 민감 콘텐츠
- 개별 행을 선택하지 않은 갱신형 컬렉션
