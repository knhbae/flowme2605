# 선별 파일 목록 — CP1 준비 제안

정본: [목표](spec.md) · [읽기 기준선](baseline.md). 최초34파일은 CP1 준비 제안의 당시 목록이다. 이후 사용자의 “승인이라고!”로 이 목표의 소유 후보 선별 게시/CI·개발계 교체를 승인했다. 실제 게시 직전에는 후보별 추가 파일·hash·검증을 다시 고정하며 이 목록만으로 게시/반영 성공을 판정하지 않는다.

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

- `output/`의 원결과·상태 JSON·trace·캡처 전체. r6의 `results.json`·artifacts와 `.public.json` 원본도 별도 게시 승인 없이 포함하지 않는다.
- `.tmp/`, `.next/`, `node_modules/`, 환경/자격정보·실제 계정 자료.
- 미소유 원본 `flow-mvp`의 dirty/untracked 피드백·Dots PDF, UX2 원본/캡처, 다른 작업본의 변경.
- 이전15커밋/기존 PR의 모든 파일을 이번 신규 소유 변경으로 추가하지 않는다.

현재 제품 build/소스 일치는 선별 게시 안전성의 일부다. 외부 게시 권한·hook·새 CI·실제 제공 사본/보호값·교체/복귀의 성공을 증명하지 않는다. 전체 보호 guard의 과거 실패는 유지하며 승인 없이 자동 baseline 갱신이나 예외 PASS를 만들지 않는다.

## CP2 현재 추가 소유 — 보안 선행 병합 전

CP1 r6의34파일은 먼저 `D:/flowme2605/flow-core-cp1-r6-snapshot-20261003`에 byte 동일하게 보존했다. 현재 작업본의 겹친 파일은 CP2 변경이고 CP1의 원본으로 복사하지 않는다. 다음13파일을 추가해 현재47개 소유 경로다. 이후 CP1 의존성/출처 보완을 인수하면 해당 정확 목록을 별도 추가한다. 따라서47은 최종 게시 파일 수가 아니다.

1. `components/flow/integrated-poc/AlphaPreservationPanel.tsx`
2. `components/flow/integrated-poc/AlphaPreservationPanel.test.tsx`
3. `components/flow/integrated-poc/ProgramCommunity.module.css`
4. `components/flow/integrated-poc/ProgramTextEditor.module.css`
5. `components/flow/integrated-poc/ProgramSpace.tsx`
6. `components/flow/integrated-poc/ProgramSpace.core-personal-journey.test.tsx`
7. `components/flow/integrated-poc/ProgramDiscovery.tsx`
8. `components/flow/integrated-poc/ProgramDiscovery.core-public-journey.test.tsx`
9. `docs/specs/2026-10-03-alpha-core-journeys-ready/recovery-design.md`
10. `docs/specs/2026-10-03-alpha-core-journeys-ready/personal-public-design.md`
11. `docs/specs/2026-10-03-alpha-core-journeys-ready/menu-restoration-design.md`
12. `docs/specs/2026-10-03-alpha-core-journeys-ready/requirements-delta.md`
13. `docs/specs/2026-10-03-alpha-core-journeys-ready/trial-preparation.md`

AlphaWorkspace·Community·TextEditor와 연결 검사, E2E scenario의 새 수정은 원34의 같은 경로를 갱신한 것으로 중복 집계하지 않는다. `output/`·private catalog bytes·실제 계정/환경·다른 세션 원본은 여전히 제외한다. r7 브라우저 scenario 준비35건과 실제 실행35건도 구분한다.

## CP2 선행 보안·출처 인수 — 107경로

[선행 소유·해시](prerequisites-manifest.md)의 D44/E15와 이 정본1개를 추가 인수했다. 앞47 + 추가60 = **107 고유 경로**다. 인수할 때 CP1 원파일의 SHA256와 대상의 HEAD 동일 또는 새 경로 부재를 확인했으며 CP2 소유 런타임과 겹친 파일0이다. 정확한 기계적 사본 인수 뒤59개 runtime/test/report 파일의 SHA256가 원표와 일치했다. 공통 spec/qa/STATUS는 CP1 자료로 덮어쓰지 않았다.

D44는 공식 의존성·CSS 호환과36개 TSX의 공식 utility alias다. E15는 실제 출처 검토와 새 공급 보류·기존 사본의 읽기 보호·연결 테스트·보고서다. 운영 catalog 원본·실제 저장소·계정·DB를 추가 소유하지 않는다. 개인사본의 복구는 합성 저장소에서 기존 key/value 불변과0쓰기를 검사하며, 실제 모든 사용자 데이터에 복구를 실행한 것은 아니다.

clean 설치 뒤 CI 검사에서 기존 `yaml` 미선언 의존을 발견했다. 기존 HEAD lock과 version/resolved/integrity가 같은 공식 `yaml2.9.0`을 direct devDependency로 선언한 package/lock 두 파일과 갱신한 해시 표를 인수했다. D44/E15 전체59개 실제 해시가 표와 일치하며 runtime의 YAML import는 없다. 실행 중인 통합 검사를 보호하려고 node_modules는 그 실행 종료 뒤 clean 설치로 갱신한다. 따라서107은 현재 소유 경로 수이고 게시 완료를 뜻하지 않는다. 최종 설치·게시 선행 검사·빌드 근거를 반영한 뒤 게시 여부를 판정한다.

## G1 — 검토일과 봉인 원본의 비교 검사 보완

`lib/flow/integrated-poc/catalog-library.test.ts`를 추가해 현재 **108 고유 소유 경로**다. SHA256은 `e0d213650adf3504c4b540f58e9a30d0162cdae4eb6ff8105f07af39d0a14396`이다. 실제 검토 근거가 있는7개 자료의 `source_checked_at`만 정확한 이전값→2026-10-03 차이로 인정한다. 봉인 pack·validator·runtime 정책·156개 요약은 수정하지 않았다. 다른 날짜·slug·updated_at·제목·원문·항목·정책 변경을 거절하는 검사와 보류7개 원본 보존 검사를 추가했다. 실제 단일 파일 red13/1FAIL→green15/15PASS이며, 나머지 통합34개 실패의 해결 근거로 확대하지 않는다.

## F2/H 인수 — 118 고유 소유 경로

F2의 `tests/e2e/ux-exact-build.ts`와 `tests/e2e/ux-exact-build.test.ts`를 추가했고 기존 r7 browser의 판본 읽기·자산 확인 세 곳만 수정했다. r6 browser 전체를 복사하지 않았다. 정확 build뿐 아니라 실제 QA 실행 루트·HEAD·QA 파일·compile 입력의 import closure·compat CJS·static 자산을 확인한다. 두 추가 파일의 해시는 [F 표](prerequisites-manifest.md)에 있다. root에서 10/10 PASS를 실제 실행했으며 35개 browser 목록 확인은 실행 PASS가 아니다.

H의 기존 테스트8개는 보류 자료를 성공 경로에서 사용하는 낡은 기대값을 수정한 것이다. 대상8개의 HEAD 무변경과 원파일8개 SHA256를 확인한 뒤 같은 bytes로 인수했다. 정확 경로·해시는 [H 표](prerequisites-manifest.md)를 따른다. runtime·품질 보류·봉인 pack은 변경하지 않았고, 실행 가능한 실제 자료를 성공 사례에 사용하며 보류 자료의 보존·거절 음성 검사를 유지한다.

현재 경로 수는108 + F2 신규2 + H8 = **118**이다. CP1의105경로와 CP2의118경로를 혼합 집계하지 않는다. H의 선별207/207 PASS는 CP1 인계 근거이며 root 전체 통합 재실행의 성공을 대신하지 않는다. 출처·보안·판본·테스트 경계의 수정은 승인된 선행 보완이고 제품 정책 확정·운영 migration이 아니다.

## J6 — 합성 자료와 기존 M3 보호 연결: 124경로

[J 해시 표](prerequisites-manifest.md)의 합성 fixture·검사3개와 M3 보호 경계·handler·검사3개를 추가해 **124 고유 소유 경로**다. 원파일6개 SHA256와 대상 HEAD 무변경을 확인한 뒤 같은 bytes로 인수했다. 기존 공용 원본 보존 함수는 그대로 두고, 현재 revision의 `change-private`에서 기존 품질 보류 보호를 RPC 전에 검사한다. 새 제품 정책·schema·실제 계정 자료를 추가하지 않는다.

CP1의 관련9파일 **153/153 PASS**는 인계 근거다. root는 인수한 최종 source656에서 타입581 entry/diagnostics0·실행 중 변경0을 직접 확인했고 전체281파일 통합 검사를 진행 중이다. 이 인수·타입 결과만으로 root 전체 통합·HTTP 화면·게시·개발계 반영을 PASS 처리하지 않는다. 이전 `vUEHEW9a2r5z1mheZ6hog` 빌드는 J6 전 판본이며 최종 빌드로 재사용하지 않는다.

## K1 — 실제 상태 setter를 반영한 검사: 125경로

`components/flow/integrated-poc/ProgramMutationBusy.test.ts` 1개를 추가해 **125 고유 소유 경로**다. SHA256은 `f179cc36d76766fd1fc8061fd069dd27b23987e0a37e315f97a49de3b4bb9f28`이다. 원파일 해시와 대상 HEAD 무변경·기존 해시를 확인한 뒤 정확히 인수했다. 실제 `save`가 사용하는 `setErrorNotice`를 누락한 테스트 context를 React의 direct/functional updater와 같은 형태로 보완했다. 기존 입력/기준선·commit0·명시 재시도 검사는 남겼고 실패 draft/expected의 clone·reason 및 성공 후 실패 origin 소멸도 확인한다. runtime·정책·CAS 변경0이다.

root의 단독10/10 PASS는 새 실제 실행이며 기존 전체281파일/2988실행/2985PASS/3FAIL 기록을 지우지 않는다. 마지막3FAIL이 발생한 파일1개를 보완한 뒤 새 전체 검사를 실행한다. 전체 성공·화면 QA·게시·반영 여부는 각 실행 결과로 별도 판정한다.

## L2 — 실제 게시 이력: 127경로

K1 후 최종 전체 검사는281파일/2988실행/2988PASS였으며 제품125경로를 byte 변경 없이 CP1 위에 쌓았다. CP1은112파일 commit80abc0ad·PR209, CP2는 그 위의30파일 commit527814b6·PR210으로 정상 게시했다. staged 파일 수·합계 경로·각 commit의 diff를 혼합 집계하지 않는다.

다음 실제 이력 문서2개를 추가해 소유 범위는 **127 고유 경로**다.

1. `docs/pr-history/2026-10-03-alpha-core-cp1-maintenance.md`
2. `docs/pr-history/2026-10-03-alpha-core-cp2-journeys.md`

공통 STATUS·이 정본·QA·tasks의 게시 상태 갱신은 기존 소유 경로이며 추가 runtime/test/QA scenario는 없다. 원본 private pack·설정·raw 증거·다른 dirty 경로를 추가하지 않는다. 최초 CP2 정상 hook의 npm2258/2258·build xzyBRR06On2DVYqf11l8W·exact drift0과 후속 문서 commit의 HEAD/build는 별도 증명으로 기록한다. CI·HTTP·개발계 반영은 아직 전체 성공이 아니다.
