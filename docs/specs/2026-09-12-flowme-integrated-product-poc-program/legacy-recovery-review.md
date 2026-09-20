# 개발2 임시 작업 복구 구현·검증 원장

2026-09-20 기준. 이번 원장은 개발2 임시 작업 복구 단위만 다룬다. 통합 PoC 전체 목표나 B 구조·D 나머지 작업의 완료 판정이 아니다.

## 구현 범위

[읽기 codec](../../../lib/flow/integrated-poc/legacy-creator-recovery-codec.ts), [recovery 출처](../../../lib/flow/integrated-poc/native-creator-recovery-source.ts), [순수 인계](../../../lib/flow/integrated-poc/legacy-creator-recovery-handoff.ts), [부모 입력 보호](../../../lib/flow/integrated-poc/legacy-creator-recovery-controller.ts), [복구 UI](../../../components/flow/integrated-poc/ProgramLegacyCreatorRecovery.tsx)를 연결했다. 기존 saved-version reader/restore는 saved-only로 유지한다. recoveryId를 versionId로 위장하지 않는다.

새 미저장 working(base null), 오래되거나 같은 시각 자료의 읽기 전용 처리, root/관계 손상 차단과 독립 entry 오류 표시, 동일 결과 0쓰기 재열기, Undo 후 자동 부활 금지는 이번 PoC의 교체 가능한 계약이다. 운영 schema나 영구 제품 정책을 확정한 것이 아니다. 원래 key는 읽기만 하며 기존 writer를 호출하지 않는다.

## 실제 실행 판정

정본 증거: 브라우저 QA 상세 원장 (로컬 전용 근거: `../../../output/playwright/legacy-recovery-2026-09-20T05-25-48-359Z-c698ca1c/QA-SUMMARY.md`), 원래 helper 생성 자료·ID·SHA manifest (로컬 전용 근거: `../../../output/playwright/legacy-recovery-2026-09-20T05-25-48-359Z-c698ca1c/manifest.json`), 10거래 detached 교차검사 (로컬 전용 근거: `../../../output/playwright/legacy-recovery-2026-09-20T05-25-48-359Z-c698ca1c/detached-2026-09-20T05-50-25-852Z.json`).

| 시나리오 | 판정 | 실제 근거·한계 |
| --- | --- | --- |
| 일반 첫 저장 전 → 제작 작업 | 충족 | 새 프로필 first, 인계·reload·명시 저장·Undo·reload. 없는 저장 판본을 만들지 않음. 마지막 revision 3. |
| coherent canonical / 미반영 CRLF 입력 | 충족 | 새 프로필 pending, 두 원문 분리 비교·quota 실패·같은 선택 재시도·인계·reload·비교 취소·명시 sync·Undo·reload. 마지막 revision 3. |
| 실제 명시 저장 이후 recovery | 충족 | 새 프로필 newer, 이전 저장 원문 비교·인계·명시 저장·Undo·reload. 마지막 revision 4. |
| 같은 복구 재진입 / 인계 Undo 후 재시도 | 충족 | 기존 결과 0쓰기 열기, 인계 Undo 후 working 제거·reload·재인계 차단. 원본은 그대로 남음. |
| source/운영 경계 | 충족(검사 범위 내) | 앱 성공 거래 10, 주입 quota 실패 1, 원본과 sentinel 정확 불변, 허용 밖 앱 writer 0. reload unload 순간은 observer 공백이 있어 wire 비교로 보완. |
| 작은 화면·가로 화면·키보드 | 충족(검사 범위 내) | 제작 화면 3종×5해상도 15상태, 모달 5해상도의 스크롤 후 hit-test·focus. 가로 넘침·page/console error 0. 전 제품 접근성 감사는 아님. |
| 빈 pending·손상·오래된 자료·관계 모호성·dirty/CAS | 모델/부모 회귀 | 실제 원래 helper 기반 fixtures와 strict 모델 회귀. 이번 브라우저 패키지에서 모든 부정 입력을 재합성하지 않음. 다른 후보를 dirty 작업에 교차 인계하는 UI 검사는 미실행. |
| Android Chrome / iOS Safari / 실제 IME | 미실행 | 데스크톱 Chromium viewport 검사를 실제 기기 검사로 세지 않음. 관찰 사용자 0명. |

브라우저 검사는 원래 D2 helper가 메모리에서 만든 JSON 3종을 새 전용 프로필에만 넣는 별도 승인 QA 준비로 수행했다. 빈 storage 확인 후 source·sentinel setup 각 2회, 총 6회를 앱 거래와 분리했다. 기존 누적 B/일반 프로필이나 사용자 자료를 쓰지 않았다. 세 신규 프로필은 보존하고 브라우저만 닫았다.

## 교차검사와 동결

production build `I0QgDqDV0FBDjrnqn_lci`, route chunk `static/chunks/app/my/page-36dca8f5a25cbfe1.js`. 실제 Flight buildId와 resource load를 확인했다. 검사 후 build source hash 417개를 비교했고 변경 0건이었다. 제품 코드·테스트는 브라우저/보고 중 수정하지 않았다.

실제 캡처한 성공 거래 10개의 before/after wire를 strict `loadProgramStore(validateProgramEnvelope)`로 읽었다. 인계 3개는 원래 exact source, 실제 requestId/targetId/시각으로 순수 handoff를 다시 계산해 일치시켰다. 명시 저장 2개와 sync 1개는 실제 forward delta/Undo snapshot과 `makeProgramEnvelope`를 비교했다. Undo 4개는 `planProgramUndo` 결과와 정확히 같았다. 10개 모두 실제 `commitProgramEnvelope`를 detached 메모리 포트에서 실행한 wire가 브라우저 after wire와 byte-for-byte 일치했고 원래 source/sentinel은 변하지 않았다. 이것은 추가 브라우저 거래 10회가 아니라 이미 실행한 거래의 오프라인 교차검사다.

초기 detached 검사는 앱이 사용하는 catalog 포함 `prepareProgramInitialData()` 대신 빈 `createProgramData()`를 predecessor로 둔 검증 스크립트 오류로 중단했다. 앱과 같은 실제 초기화 경로로 바로잡은 뒤 10거래가 통과했다. 제품이나 브라우저 데이터는 수정하지 않았다. 브라우저 QA 도구 실패 4건과 같은 revision에서 이어간 근거는 상세 원장에 모두 남겼다.

이 단위에서 별도 실행한 9개 테스트 파일은 110/110 PASS, skip 0, 해당 TS graph 진단 0이었다. 전체 검증은 부모 세션이 실행·집계하며 이번 브라우저 체크 수를 자동 테스트 수에 더하지 않는다.

commit·push·PR·Preview·Production 배포: 수행하지 않음. 관찰 사용자: 0명.
