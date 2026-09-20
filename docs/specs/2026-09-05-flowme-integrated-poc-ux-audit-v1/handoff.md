# P3-K 인계

세 산출물의 요구·후속 결정과 현재 React/단일 HTML을 대조해 감사 원장, 수정 설계, 다음 구현 계획을 만들었다. 이번 목표의 산출물은 감사·설계·계획이며, 발견한 제품 오류를 고친 것은 아니다.

## 먼저 열 파일

- 한국어 비교 보고서 (로컬 전용 근거: `../../content-audit/2026-09-05-flowme-integrated-poc-ux-audit-ko.html`): 일곱 여정의 원본→현재→수정 제안, 254개 부모 요구 검색, 424개 하위 역사 조건.
- [단계별 구현 계획](implementation-plan.md): K1-A부터 시작하는 범위·검증과 복사 가능한 다음 목표.
- [개선 설계](improvement-design.md): 각 화면의 정상·실패·취소·재시도·초점·데이터 소유 영역.
- [QA](qa.md): 이번 진단18개, 모델 비교4개, 과거 시험과 새 검사 구분, 미실행 범위.

## 다음 목표

K1-A에서 원문 도움의 정확한 대상과 저장 실패 복구를 함께 고친다. React 잘못된 Item 적용과 양쪽 draft 저장 실패를 먼저 회귀로 고정한다. IME는 코드 후보이므로 재현 전 실제 오류나 수정 완료로 세지 않는다. 네 범주 재배치·한 편집기·틀 목록은 K3-A이며 K1-A에 한꺼번에 넣지 않는다.

그다음 K2-A 신규 handoff의 원문 체크/개인 완료 분리, K1-B 미저장 변경 닫기, K2-B 기간/날짜별 순서, K2-C 이동 직후 Undo, K3의 원본 UX 동등성 순으로 진행한다. K4의 기준일·포함 제외·WorkingSource 날짜순은 데이터 소유와 버전 계약을 먼저 설계한다. 새 영구 정책이 필요할 때만 선택을 요청한다.

각 묶음에서 기획→UX/UI→개발 설계→개발→모델·저장·브라우저·반응형 검증→요구별 판정 갱신을 완료한다. UX를 마지막 전체 색상 작업으로 미루지 않는다. 이 계획은 제안·후속 구현 범위이며 정책 확정이나 이미 실행한 개발 결과가 아니다.

## 소유와 보호

- 작업 위치: `D:\flowme2605\flow-personal-workspace-v4-1-poc-20260901`
- branch: `agent/personal-workspace-v4-1-poc-20260901`
- 기준 HEAD: `6e4b44fe2f61b7086b8bbc61c30b5aa39dd4390e`
- 시작 수정181개·미추적277개는 미소유로 유지했다. 기존 파일 stage/정리/삭제 없음.
- 새 소유 파일: 이 spec 폴더의 `spec.md`, `plan.md`, `coverage-inventory.json/md`, `v41-audit.json/md`, `d1-audit.json/md`, `d2-audit.json/md`, `bp-audit.json/md`, `improvement-design.md`, `implementation-plan.md`, `qa.md`, `handoff.md`, `protected-files.cjs`, `browser-audit.cjs`, `build-report.cjs`, `verify-report.cjs`.
- 새 보고서: `docs/content-audit/2026-09-05-flowme-integrated-poc-ux-audit-ko.html` 및 같은 날짜 `ux-audit-assets/`의 실제 캡처59개.
- 로컬 증거: `output/p3k/`, `output/playwright/p3k/`. 제품·원본 캡처와 보고서 QA 캡처는 구분한다.
- 기존 제품 코드·현재 standalone·기존 trace·지정 원본551개 SHA 변경0. 정확 범위는 QA와 protected-before 참조.
- 원본 `flow-mvp`와 원본 D1/D2 worktree는 읽기만 했다. 과거 거절된 P3-I 보고서는 열거나 우회하지 않았다.

## 이어서 지킬 경계

새 목표에서 먼저 session-start와 현재 Git/소유 상태를 다시 확인한다. 이번에 제품을 수정하지 않았으므로 다음 목표가 과거 dirty 코드의 소유를 자동 취득하는 것은 아니다. 목적과 겹치는 기존 파일은 변경 내역을 읽고 최소 수정한다.

exact-query, PoC prefix, source/personal/execution 분리, fail-closed, 운영 writer 미호출을 유지한다. sourceChecked 버그를 고칠 때 기존 사용자 `done`을 일괄 초기화하지 않는다. view별 순서가 충돌하면 임의로 한 값을 선택하거나 PoC 전체를 초기화하지 않는다.

역사 trace를 지우거나 이번 원장을 전수 PASS로 바꾸지 않는다. 새로운 실행 근거가 확인된 정확 요구 ID만 현재 계층에서 갱신한다. 원본 스킬의 과거 export-first 안내가 후속 승인된 개인 저장·실행 흐름을 덮지 않게 한다.

commit·push·PR·Preview·Production은 모두 안 했다. 실제 Android/iOS·보조기술 NOT_RUN, 관찰 사용자0명이다. 실제 기기 대기를 다음 목표에 다시 넣지 않는다.
