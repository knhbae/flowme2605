# K3-B 읽기 상태 알림 — 본문 가림 수정 범위

2026-09-05. [원문 시간 브라우저 QA](./k3b-source-time-browser-qa.md)의 최종1024 PNG에서 `.global-feedback .save-status`가 이웃 `11시 회의 참석` 제목 일부를 가렸다. root도 PNG를 직접 확인했다. 이 알림은 `pointer-events:none`이므로 버튼 hit-test만으로는 시각 가림을 찾을 수 없다. v4.1의 핵심 행동·정보 노출과 [단계별 계획](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md)의 각 묶음 화면 검사 범위에서 수정한다.

## UX·연결 계약

- 개인공간 목록·Flow 상세·Item 상세의 읽기 상태는 본문 첫 영역에 둔다. 화면 위를 따라다니며 제목을 덮지 않는다. 스크롤하면 다른 본문 정보와 함께 이동한다.
- 기존 `#save-status`와 그 부모 wrapper를 재사용한다. 상태 text·role·aria-live·hidden을 새 presenter가 성공/오류로 재해석하지 않는다. contextual result가 맡아서 숨긴 상태는 다시 보이지 않게 한다.
- 작성기·Plan/Item 편집·저장 결과·복구 gate는 기존 위치와 기존 소유 규칙을 유지한다. 이 작업으로 해당 화면의 전반적인 알림 체계를 교체하지 않는다.
- 같은 노드를 배치하되 같은 위치에서 반복 DOM 이동하지 않는다. native drag 시작·재드래그, 메뉴·키보드 이동, 완료/Undo의 기존 동작을 회귀로 확인한다. 배치 변화로 항목이 움직이면 이 검사도 통과해야 마감한다.
- 원문·개인 계획·실행 상태·저장 schema/writer·운영 데이터에는 변경이 없다. 조회·화면 전환·스크롤은 저장0이다. 실패·복구 정보를 숨기거나 타이머로 없애서 가림을 해결하지 않는다.

## 검증 방법

별도 신규 브라우저 spec에서 먼저 실제 가림 RED를 재현한다. 필수5viewport와 상하 스크롤에서 완전히 보이는 제목은 Text Range rect, 핵심 버튼은 전체 rect를 측정한다. 보이는 상태 알림과의 교차 면적0, 문서 가로 넘침0을 확인한다. viewport 경계의 일부 행은 별도로 기록한다. 모든 행이 한 화면에 있다는 뜻으로 확대하지 않는다.

동일 live 노드의 목록/상세↔작성/편집 위치 복귀, 상태를 숨긴 contextual result의 재활성0, 오류·취소·비드래그·native drag·Undo 회귀를 분리한다. 읽기0쓰기와 실제 완료/Undo의 target/journal API 수를 구분하고 운영 sentinel bytes·console/page error를 기록한다. PNG는 정확 viewport 크기로 새 output에 보존한다.

이 문서는 수정 전 설계이며 제품 PASS가 아니다. 새 시각 테마·추가 기능·영구 정책을 정하지 않는다. 실제 기기/보조기술 NOT_RUN, 관찰 사용자0명, commit/push/PR/Preview/Production 없음.
