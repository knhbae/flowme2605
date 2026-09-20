# P3-A 실행 계획

## 1. 기준선 고정

- 최신 `origin/main`, 격리 worktree, P2-C checkpoint와 미소유 파일 경계를 확인한다.
- v4.1 6건·개발2 11건의 primary gap 17건을 정본·현재 코드·실행 근거에 다시 대조한다.
- 제품·운영 결정 없이 처리할 수 있는 `V41-036`, `D2-058`만 이번 묶음으로 고정한다.

## 2. UX·판정 계약

- A0의 전역 navigation 1회 원칙과 v4.1의 접근 가능한 이름 요구를 현재 action에 mapping한다.
- 항목 검토 열기·닫기·Escape·opener focus 복귀·zero-write를 한 접근성 흐름으로 정의한다.
- `D2-058`의 expected를 여덟 원자성 하위 조건과 비교하고 `D2-021` 역편집 경계를 분리한다.

## 3. 개발 설계·구현

- React와 독립 HTML의 탐색·개인공간 보기·항목 검토 control에 같은 역할과 명명을 연결한다.
- 검토 surface가 닫힐 때 opener ref로 focus를 복귀시키고 닫기 전이에서 mutation을 만들지 않는다.
- 원자성 모델은 새 저장 경로를 추가하지 않고 기존 transaction·rollback·Undo 계약을 유지한다.
- exact-query gate와 PoC prefix 경계를 건드리지 않는다.

## 4. 집중 검증

- 접근성 이름·키보드·focus·zero-write를 React와 독립 HTML 브라우저 시나리오로 실행한다.
- 여덟 원자성 하위 조건을 순수 모델·저장·standalone 회귀에 다시 연결한다.
- 기존 이동·완료·Undo·reload·다중 origin 회귀와 production build를 실행한다.
- 필수 5개 viewport에서 overflow·console·page error·핵심 action 가림을 검사한다.
- 운영 `flow:*` sentinel의 전후 bytes와 writer allowlist를 확인한다.

## 5. 보고·handoff

- 실제 실행 수치만 `qa.md`와 `report-data.json`에 채운다.
- 실제 기기·보조기술 결과는 `device-accessibility-protocol.md`에 자동화와 분리해 기록한다.
- 두 요구가 모두 통과한 뒤에만 목표 snapshot `130 충족 / 15 gap`을 현재 판정으로 승격한다.
- 실기 7건과 제품·운영 결정 8건을 다음 gate로 유지한다.
- 실제 Android/iOS, screen reader, 실제 200% 확대, 장시간 사용, 관찰 사용자, 게시 상태를 별도 행으로 남긴다.

각 단계는 앞 단계의 경계나 검증이 실패하면 다음 판정으로 승격하지 않는다. 현재 이 문서는 실행 전 초안이며, 최종 실행 후 수치와 상태를 갱신해야 한다.
