# 선별 파일 목록 — 승인된 CP1 게시 준비

정본: [목표](spec.md) · [읽기 기준선](baseline.md). 사용자의 “승인이라고!”로 현재 목표의 선별 commit/push/Draft PR·해당 비공개 CI·개발계 앱 교체/복귀 권한을 인수했다. CP1은 아래34파일이며 제품 bytes는 보존된 r6 사본에서만 가져온다. 선행 보안·출처 검증 해결에 필요한 추가 파일은 별도로 고정한다. CP2의 새 소스/설계 문서는 이 목록에 자동 추가하지 않는다. 게시 head·hook build·새 CI·서비스 반영은 각각 실제 실행 근거를 QA에 기록한다.

CP1 전용 repo는 `D:/flowme2605/flow-core-journeys-cp1-20261003`, branch `agent/alpha-core-journeys-cp1-20261003`이다. `D:/flowme2605/flow-core-cp1-r6-snapshot-20261003`의34파일을 Git base d1cc8dd1에 복사해 byte drift0·제품 source654/r6 drift0을 확인했다. 현재 권한·게시 상태를 반영한 문서의 차이는 제품 소스 변경과 별도로 기록한다. 아래 원 후보 기준은 당시 소유 대조 이력이다.

기준 repo: `D:/flowme2605/flow-ux-comparison-gaps-20261002`, HEAD `d1cc8dd1cbc1a220054f458aea369393642f71ed`. 기준선 읽기에서32파일(직전28+새 목표4)을 확인했다. 이 문서와 baseline을 더하면 **34파일**이다. 아래 경로는 repo 기준이며 output/미소유 파일을 포함하지 않는다. 실제 게시 직전에는 목록·hash·소유를 다시 고정한다.

## A — 제품 보완 12파일

runtime5와 연결 제품 검사7의 묶음이다. 첫 개발계 반영의 기능 후보이며 기존 r6 source inventory/build와의 관계는 baseline을 따른다.

1. `components/flow/integrated-poc/AlphaWorkspace.tsx`
2. `components/flow/integrated-poc/ProgramCommunity.tsx`
3. `components/flow/integrated-poc/ProgramTextEditor.tsx`
4. `lib/flow/integrated-poc/alpha-persistence/client.ts`
5. `lib/flow/integrated-poc/alpha-sync/controller.ts`
6. `components/flow/integrated-poc/AlphaWorkspace.test.tsx`
7. `components/flow/integrated-poc/ProgramCommunity.test.tsx`
8. `components/flow/integrated-poc/ProgramTextEditor.test.tsx`
9. `lib/flow/integrated-poc/alpha-sync/social-draft-retry.test.ts`
10. `tests/e2e/ux-comparison-gaps.browser.ts`
11. `tests/e2e/ux-comparison-gaps.config.ts`
12. `tests/e2e/ux-comparison-gaps.fixture.ts`

## B — 직전 보고·모형·근거 요약 12파일

runtime과 별도 문서/보고 묶음으로 제안한다. HTML 모형 검사와 제품 검사를 구분하고, 원본 evidence는 로컬에 남긴다. 로컬 경로·과거 PID·실패 이력은 당시 근거이지 현재 서비스 상태가 아니다.

1. `docs/content-audit/2026-10-02-flowme-ux-comparison-gaps-ko.html`
2. `docs/content-audit/2026-10-02-flowme-ux-comparison-gaps-ko-assets/model.test.cjs`
3. `docs/content-audit/2026-10-03-flowme-ux2-static-review-followup-ko.md`
4. `docs/specs/2026-10-02-alpha-ux-comparison-gaps/spec.md`
5. `docs/specs/2026-10-02-alpha-ux-comparison-gaps/plan.md`
6. `docs/specs/2026-10-02-alpha-ux-comparison-gaps/tasks.md`
7. `docs/specs/2026-10-02-alpha-ux-comparison-gaps/requirements.md`
8. `docs/specs/2026-10-02-alpha-ux-comparison-gaps/ux-review.md`
9. `docs/specs/2026-10-02-alpha-ux-comparison-gaps/qa.md`
10. `docs/specs/2026-10-02-alpha-ux-comparison-gaps/results.md`
11. `docs/specs/2026-10-02-alpha-ux-comparison-gaps/dots-review.md`
12. `docs/specs/2026-10-02-alpha-ux-comparison-gaps/completion-audit.md`

## C — 현재 목표/진입점 10파일

별도 문서 체크포인트로 제안한다. 진입점4파일에는 직전 목표와 새 목표가 함께 있으므로 새 목표6파일 없이 현재 진입점만 게시하면 링크/의미가 누락된다. A/B만 게시하는 경우 C를 무조건 stage하지 않고 문서 포함 범위와 유효 링크를 따로 확인한다.

1. `docs/PROJECT_CONTROL.md`
2. `docs/ROADMAP.md`
3. `docs/STATUS.md`
4. `docs/specs/README.md`
5. `docs/specs/2026-10-03-alpha-core-journeys-ready/spec.md`
6. `docs/specs/2026-10-03-alpha-core-journeys-ready/plan.md`
7. `docs/specs/2026-10-03-alpha-core-journeys-ready/tasks.md`
8. `docs/specs/2026-10-03-alpha-core-journeys-ready/qa.md`
9. `docs/specs/2026-10-03-alpha-core-journeys-ready/baseline.md`
10. `docs/specs/2026-10-03-alpha-core-journeys-ready/manifest.md`

## 제외

승인된 선행 보안·출처 해결의 추가 소유는 [D44/E15/F2/G1/H8/J6/K1 정확 경로·hash](prerequisites-manifest.md)에 따르며 그 정본 문서1파일을 더해 현재 게시 소유는34+44+15+2+1+8+6+1+1=112파일이다. F의 browser 수정은 원 A의 경로에 포함돼 새 파일 수를 더하지 않는다. D의 CSS/기계적 alias, E의 출처 격리·기존 개인사본 보호, J의 기존 M3 품질 보류 연결은 원 r6와 별개의 보안·출처 유지보수 후보다. K는 실제 Community handler 실행에 누락된 테스트 context만 보완한다. 원 r6 전체 source byte 불변이라고 부르지 않는다. current authority/검증을 고친 C 문서는 원 snapshot bytes와 구분한다. output/private pack/새 CP2 기능·설계는 포함하지 않는다.

- `output/`의 원결과·상태 JSON·trace·캡처 전체. r6의 `results.json`·artifacts와 `.public.json` 원본도 별도 게시 승인 없이 포함하지 않는다.
- `.tmp/`, `.next/`, `node_modules/`, 환경/자격정보·실제 계정 자료.
- 미소유 원본 `flow-mvp`의 dirty/untracked 피드백·Dots PDF, UX2 원본/캡처, 다른 작업본의 변경.
- 이전15커밋/기존 PR의 모든 파일을 이번 신규 소유 변경으로 추가하지 않는다.

현재 제품 build/소스 일치는 선별 게시 안전성의 일부다. 외부 게시 권한·hook·새 CI·실제 제공 사본/보호값·교체/복귀의 성공을 증명하지 않는다. 전체 보호 guard의 과거 실패는 유지하며 승인 없이 자동 baseline 갱신이나 예외 PASS를 만들지 않는다.
