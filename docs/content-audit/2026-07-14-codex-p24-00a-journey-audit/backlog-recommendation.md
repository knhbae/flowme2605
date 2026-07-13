# P24 권장 백로그

## Gate

P24-00B 사용자 관찰 전에 아래 Blocking/High를 닫는다. 기존 기능 확장이나 대규모 redesign보다 실행 정확성과 한 행동 한 표현을 우선한다.

## Blocking

### P24-00A-FIX1 Local calendar date correctness

- `formatDate(new Date())`의 UTC 날짜 사용을 local date와 분리한다.
- KST 00:00, 08:59, 09:00, DST timezone의 today/default date fixture를 만든다.
- My Flow Today, Calendar selected date, 개인 draft 기본 날짜를 함께 검증한다.
- 완료 조건: KST 오전 전날 offset 0, 기존 ICS UTC/zone serialization 회귀 0.

### P24-00A-OPS1 Public observation preview

- Vercel SSO 보호를 제거한 관찰 전용 preview 또는 명시적 관찰자 인증을 준비한다.
- 익명 390px smoke와 주요 route 접근을 확인한다.
- 완료 조건: 관찰자에게 전달한 URL이 로그인 redirect 없이 열림.

## High

### P24-00A-FIX2 Recurring Today single representation

- 반복 occurrence는 Today 실행 행 한 곳에만 completion control을 둔다.
- `다음 항목`이 필요하면 checkbox 없는 예고로 낮춘다.
- source-backed 상세의 중복 completion checkbox도 함께 제거한다.
- 완료 조건: 동일 stable item/occurrence의 visible completion control 1개.

### P24-00A-FIX3 Miss draft validation and title provenance

- 제목과 원하는 결과 중 최소 하나를 요구한다.
- 빈 입력에서는 draft/candidate record를 만들지 않는다.
- fallback 상태 문장을 item title로 사용하지 않는다.
- Flow 제목 변경 시 자동 생성 항목의 제목 동기화/독립 정책을 테스트로 고정한다.

### P25-02 Controlled dependency upgrade

- Next 15.5.20 이상 호환 버전, Playwright 1.61.1, PostCSS 8.5.10 이상을 별도 branch에서 검토한다.
- exceljs/uuid는 `npm audit fix --force` downgrade를 사용하지 않는다.
- 완료 조건: critical/high 0을 목표로 하며 476 unit, 259 E2E, build pass.

## Medium

### P24-03A Edit and reopen discovery

- 관찰에서 실제 실패가 확인된 경우에만 기준일, 날짜, 완료 취소入口를 1단계 줄인다.
- 새 설명 카드를 추가하지 않고 현재 row/detail hierarchy를 정리한다.

### P24-03B Dense personal draft editor

- 실제 모바일 관찰에서 입력 실수가 확인되면 schedule/recurrence를 progressive disclosure로 정리한다.
- 기능 삭제나 full editor 신설 없이 섹션 상태와 focus 이동을 개선한다.

### P24-OPS2 Dirty and branch cleanup

- main dirty 파일을 repo docs, skills, CI/tooling, package/runtime, content audit, imports, temporary outputs로 분류한다.
- `codex/creator-channel-200-preview` worktree는 merged 상태 확인 후 정리한다.
- `codex/flow-20-content-ux`의 18개 고유 commit은 archive/selective cherry-pick 여부를 결정한다. blind merge는 금지한다.
- outdated `STATUS/ROADMAP/DECISIONS`는 기존 dirty ownership을 확인한 뒤 별도 commit으로 동기화한다.

## 이후 순서

1. P24-00A-FIX1/FIX2/FIX3.
2. P24-00A-OPS1과 dependency upgrade.
3. Claude Code 독립 회귀 감사.
4. P24-00B 실제 사용자 관찰 15 sessions.
5. P24-00C keep/change/defer 결정.
6. P24-01A source v2 three-way merge contract.
7. P24-01B source update review UI.

## 보류

- Studio 5번째 탭 승격
- 실제 AI 자동 생성
- direct Calendar/Notion/Todo OAuth
- source-backed add/delete/reorder UI
- UI 전면 개편
- 계정/DB/cloud sync는 관찰과 migration 정책 후 P25에서 진행
