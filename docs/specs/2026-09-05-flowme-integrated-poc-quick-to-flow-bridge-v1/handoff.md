# FlowMe 통합 PoC 빠른 할 일→Flow 연결 v1 Handoff

**작성일:** 2026-09-05  
**상태:** React·standalone 구현 / 자동 E4 검증 완료

## 1. 이번 slice의 결론

통합 PoC의 `BP-017` QuickItem→Flow 연결을 임시 PoC v1 계약으로 열었다. 원본
QuickItem은 그대로 보존하고, 전환 시점의 제목·메모·폴더·실행 날짜를 receipt로 남기며,
새 authored Flow 하나와 열린 Item 하나를 만든다. completion은 복사하지 않는다.

기존 단계 5 문서의 `후속 보류`는 계약 부재를 이유로 한 안전 경계였다. 이번 사용자
승인으로 그 네 계약을 정했으므로 **BP-017에 한해** 임시 PoC 구현을 진행한다. 이 변경은
운영 정책이나 migration 승인이 아니며 recurrence, 공개 후보, table/source update의
보류 상태를 바꾸지 않는다.

## 2. 구현 owner

현재 React 구현은 다음 책임으로 나뉜다.

- `lib/flow/personal-workspace-poc-quick-conversion.ts`: 입력 검증, deterministic identity,
  one-Item Flow materialization
- `lib/flow/personal-workspace-poc-contract.ts`: 임시 기본값과 versioned conversion receipt
- `lib/flow/personal-workspace-poc-state.ts`: atomic transition, Undo snapshot, reload validation
- `components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx`: 확인, 성공, 기존
  결과 열기, 실패, retry, Undo 뒤 선택 정리
- `tests/e2e/personal-workspace-quick-conversion.spec.ts`: React browser 핵심 시나리오

standalone에도 같은 계약을 구현했다. React가 제품 구현 정본이고 standalone은 오프라인에서
직접 조작 가능한 핵심 parity fixture라는 기존 owner 경계를 유지한다.

## 3. 현재 검증 스냅샷

| 항목 | 결과 |
| --- | --- |
| React 모델·state·storage·component focused | 104/104 PASS |
| React Quick→Flow E2E | 1/1 PASS |
| React viewport matrix | 5/5 PASS |
| standalone model/UI 계약 | 92/92 PASS |
| standalone Chromium smoke | 2/2 PASS |
| 전체 `npm test` | 2,201/2,201 PASS |
| production build | 18/18 page PASS |
| traceability | 60/60 PASS · `BP-017` 충족/E4 |
| docs check | 16개 필수 문서·4,651개 로컬 링크 PASS |
| actual Android/iOS | 미실행 |
| 보조기술·200% 확대 | 미실행 |
| 관찰 사용자 | 0명 |

위 PASS는 구현과 자동 QA 증거다. 실제 기기나 관찰 사용자 증거가 아니다.

## 4. 이어서 할 일

1. 다음 안전한 제품 갭으로 개발1 실행 상세의 완료 기준 renderer·anchor/preselection을
   기존 UX 문법에 맞춘다.
2. 개발2 작성 화면의 내부 용어 노출과 subcheck helper 차이를 정리한다.
3. 실제 `/calendar` owner 연결과 공개 Flow 저장은 운영 경계 승인을 받은 별도 목표로
   다룬다.
4. 실제 Android/iOS·보조기술 검사는 자동 E4와 별도 증거 목표로 남긴다.
5. 결과 보고서에서 실제 기기·관찰 사용자·게시 상태를 계속 별도 항목으로 유지한다.

## 5. 반드시 유지할 경계

- exact gate: `/my?personalWorkspacePoc=v1`
- write namespace: `flow:poc:personal-workspace:v1:*`
- 기존 `flow:*`: 읽기·투영만 허용
- 원본 QuickItem: 삭제·변형 금지
- completion: 새 Item으로 복사 금지
- 기존 운영 writer와 `localStorage.clear()`: 호출 금지
- 잘못된 query/origin/payload/receipt: fail-closed
- 기본 `/my`, 운영 schema, backend: 변경 금지
- 기존 Flow에 합치기, 여러 Item 자동 생성, 공개·AI·cloud: 범위 밖

## 6. 최종 보고 형식

완료 시 다음 항목을 서로 분리한다.

- 구현한 기능
- 변경한 파일
- Quick→Flow 시나리오별 결과
- 자동 테스트 결과와 실제 실행 개수
- viewport별 브라우저 평가
- 실제 Android/iOS·보조기술 검사 여부
- 기존 운영 데이터 불변 증거와 그 증거 범위
- 남은 결함과 후속 제품 결정
- commit, push, PR, Preview, Production
- 관찰 사용자 수

## 7. 게시 상태

- commit: 미진행
- push: 미진행
- PR: 미진행
- Preview: 미진행
- Production: 미진행
- 관찰 사용자: 0명

사용자가 별도로 승인하기 전까지 이 상태를 바꾸지 않는다.
