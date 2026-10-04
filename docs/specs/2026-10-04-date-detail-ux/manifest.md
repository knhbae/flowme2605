# 소유 변경 원장

2026-10-04. 시작 시 clean인 격리 작업본의 이번 변경27개다. 이 목록은 stage/게시 승인이 아니며 raw output·node_modules·.next·.tmp는 포함하지 않는다. `flow-mvp`와 제공 작업본의 dirty·미추적 파일을 가져오지 않았다.

## 제품2 / 테스트4

1. `components/flow/integrated-poc/ProgramSpace.tsx`
2. `components/flow/integrated-poc/ProgramSpace.module.css`
3. `components/flow/integrated-poc/ProgramSpace.detail-ux.test.tsx` — 신규DX15개
4. `components/flow/integrated-poc/ProgramSpace.context.test.tsx`
5. `components/flow/integrated-poc/ProgramSpace.date-roundtrip.test.tsx`
6. `components/flow/integrated-poc/ProgramSpace.private-schedule.test.tsx`

기존3개는 새 상세의 progress baseline·날짜 hint에 필요한 실행 인자를 공급하고 실제 초점 복귀 helper가 사용하는 연결된 opener·ownerDocument를 모의하는 harness 보완이다. assertions를 삭제하거나 완화해 제품 FAIL을 지우지 않는다. parser/writer/schema·저장 key·API·DB/Auth·package/lockfile 변경0.

## QA8

7. `scripts/personal-workspace-poc/memo-date-browser-fixture-20261004.ts`
8. `scripts/personal-workspace-poc/date-detail-fixture.test.ts`
9. `scripts/personal-workspace-poc/build-date-detail-browser-fixture-20261004.mjs`
10. `scripts/personal-workspace-poc/qa-date-detail-app-20261004.js`
11. `scripts/personal-workspace-poc/qa-date-detail-prototype-20261004.js`
12. `scripts/personal-workspace-poc/record-date-detail-qa-20261004.mjs`
13. `scripts/personal-workspace-poc/start-date-detail-qa-20261004.mjs`
14. `scripts/content-audit/serve-date-detail-ux-20261004.mjs`

fixture의 optional target은 기존3106/default 또는 새3115만 허용한다. 전용3115는 dummy publishable credential·합성 env,3116은 정확HTML GET만 제공한다. 실제계정/API·운영 포트·DNS/Tunnel 관리 능력을 추가하지 않는다. CLI callbacks/직렬화는 운영 반영 도구가 아니다.

## 산출물2 / spec8 / canonical3

15. `docs/content-audit/2026-10-04-flowme-date-detail-ux-ko.html`
16. `docs/content-audit/2026-10-04-flowme-date-detail-ux-report-ko.html`
17. `docs/specs/2026-10-04-date-detail-ux/spec.md`
18. `docs/specs/2026-10-04-date-detail-ux/plan.md`
19. `docs/specs/2026-10-04-date-detail-ux/tasks.md`
20. `docs/specs/2026-10-04-date-detail-ux/requirements.md`
21. `docs/specs/2026-10-04-date-detail-ux/qa.md`
22. `docs/specs/2026-10-04-date-detail-ux/results.md`
23. `docs/specs/2026-10-04-date-detail-ux/ux-review.md`
24. `docs/specs/2026-10-04-date-detail-ux/manifest.md`
25. `docs/STATUS.md`
26. `docs/SERVICE_STRUCTURE.md`
27. `docs/specs/README.md`

과거 원장의 판정·운영 증거를 고쳐 새 PASS로 만들지 않는다. canonical 앞부분에 이번 후보/반영 상태를 추가하고 기존 날짜별 기록은 이력으로 유지한다. 요구50 ID는 관련 부분의 연결 수다. full424조건·피드백26·관찰사용자 완료 수가 아니다.

## 보존·게시 경계

raw logs/JSON/captures는 로컬 `output/playwright/date-detail`와 `output/integrated-product-poc`에 있다. owned cache는 `.tmp/prepatch-next-cache-20261004`에 회복 가능하게 이동했다. 삭제/운영 초기화는 하지 않았다. commit·push·PR·CI dispatch·DEV 교체·Preview·Production은 미실행이다. 이후 별도 목표에서 최신 feedback·기존 제공 build·승인·검증을 다시 대조하고 선별한다.
