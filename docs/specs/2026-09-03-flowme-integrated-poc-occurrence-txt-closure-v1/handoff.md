# Handoff

P2-B는 통합 PoC의 D2-017 반복 회차 투영과 D2-020 배포용 TXT 완결성만 닫는다. 정본은 원본 Item 1개와 파생 occurrence 여러 개를 구분한다. 원 개발2의 회차별 완료 저장은 비범위였으나, 이번 통합 PoC에서는 사용자 요청에 따라 PoC 전용 shadow state 확장으로만 구현한다. 이는 운영 schema나 영구 제품 정책이 아니다.

후속 작업은 최신 requirements trace의 남은 갭을 우선순위대로 선택해야 한다. P2-B에서 속성은 parser·결과에 보존하지만 D2-035·D2-036·D2-039의 속성 picker/editor·재진입 완성으로 판정하지 않는다. D2-023은 31개 실제·검증 콘텐츠 예시 보존 요구다. commit, push, PR, Preview, Production은 별도 승인 전까지 진행하지 않는다.

## 2026-09-03 종료 상태

- D2-017과 D2-020을 E4 충족으로 전환했다. 현재 168개 요구사항은 충족 124, 부분 18, 미충족 4, 의도적 변경 10, 제외 12이며 남은 갭은 22개다.
- 원본 Item과 `sourceItemRef`는 유지하고 반복 회차만 stable `occurrenceId`로 펼친다. 선택 회차의 날짜·완료는 PoC occurrence shadow에만 저장한다.
- Text 화면·clipboard·로컬 `.txt`는 complete TXT v2의 동일 바이트를 사용한다. Todo·Calendar·Sheet·TXT는 동일 occurrence manifest를 공유한다.
- React와 조작형 독립 HTML 모두 반복 3회, 회차 이동·완료·다시 열기·Undo·reload, 취소 무변경, 운영 저장값 불변을 자동화했다.
- 독립 HTML 두 파일은 byte-identical이며 실제 파일 크기와 SHA-256은 verification manifest를 정본으로 삼는다.
- `npm test`의 유일한 실패는 이번 변경과 무관한 `dog-adoption-first-week:review_due:2026-06-04` 콘텐츠 신선도 fixture다. 이를 P2-B 성공으로 숨기거나 임의 수정하지 않았다.

다음 갭 단계에서는 D1-012 개인 소유 구간 제목 편집과 D2-023 검증 콘텐츠 QA surface 중 하나를 명시적으로 선택해야 한다. 실제 Android Chrome·iOS Safari·보조기술 검증과 운영 writer·migration·외부 동기화는 계속 별도 게이트다.
