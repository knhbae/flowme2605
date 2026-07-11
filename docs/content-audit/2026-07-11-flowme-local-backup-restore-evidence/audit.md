# FlowMe 로컬 백업·복원 Audit

## 원인 판단

P22 기준선은 한 브라우저 localStorage에 개인 수정과 실행 기록을 저장합니다. 기존 public 안내는 `시트 파일을 받아두세요`라고 했지만, 시트 파일은 한 Flow의 실행 산출물이고 My Flow 전체 상태를 앱으로 되돌릴 수 없습니다. 따라서 이는 계정 동기화보다 먼저 닫을 수 있는 데이터 손실·수동 이동 공백이었습니다.

## 구현 경계

- 포맷: `flowme-local-backup`, schema version 1
- 최대 파일: UTF-8 8MB, 최대 1,000개 storage entry
- 포함: 저장 Flow, saved Map/persistence, 기준일, 완료/항목 상태, 개인 수정, 완료 run, 회고, URL 요청, local draft bundle
- 제외: 데모 인증, 내부 검토, creator publish marker, 업데이트 dismiss, 저장 안내 dismiss
- 복원: 현재 허용 키를 백업 시점으로 replace
- 실패: 복원 전 허용 키 snapshot으로 rollback 시도
- 비대상: 계정, 서버 저장, 자동 sync, 충돌 병합, 공개 공유

## UX 판단

- 빈 My Flow에서도 복원해야 하므로 `데이터 관리`는 저장 유무와 관계없이 My Flow 헤더에 둡니다.
- 다운로드와 불러오기를 같은 dialog에서 제공하되, 복원은 파일 선택 즉시 실행하지 않습니다.
- 백업 날짜·저장 기록·완료 실행·요청 기록을 먼저 확인한 뒤 `이 백업으로 바꾸기`를 눌러야 합니다.
- 개인 메모와 원문 링크가 포함될 수 있음을 알리고, 자동 동기화가 아님을 첫 설명에 명시합니다.

## 자동 검증

- pure storage test: 허용 키 포함, 내부 키 제외, 변조 키 거부, replace, rollback
- Playwright: 실제 JSON download, 빈 My Flow import/restore, unrelated key 보존, 모바일/wide overflow 0
- `flow-mvp.spec.ts`: 현재 제품 계약 기준 179/179 통과
- 백업·URL-first·public share·workbench 통합 E2E: 218/218 통과
- 단위 테스트 392/392, 문서 링크 1,873개, production build 17개 route 통과
- 상세 기록: [자동 회귀 기준선 복구 감사](../2026-07-11-flowme-automated-regression-recovery-audit-ko.md)
- 현재 실제 사용자 관찰 수: 0
- 실제 다른 물리 기기 복원: 미실행

## 남은 gate

1. 실제 참가자가 도움 없이 백업·복원을 찾고 이해하는지 확인
2. 다른 브라우저 또는 기기에서 실제 파일 이동 1건
3. 사용자가 자동 sync로 오해하는지 기록
4. account-backed persistence 필요성을 P22-00 결과로 결정
