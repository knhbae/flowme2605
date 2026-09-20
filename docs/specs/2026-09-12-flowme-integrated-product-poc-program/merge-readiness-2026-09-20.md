# PR #203 머지 준비 — 충돌·요구·회귀 실행 원장

2026-09-20. 상태: 진행 중. [알파 전환](alpha-transition.md)의 M1 전에, [보존 PR #203](https://github.com/knhbae/flowme2605/pull/203)을 머지 가능한 상태로 만든다. 실제 main 머지·배포 완료를 뜻하지 않는다.

## 범위와 기준점

- 보존 head: `160fbf9375b65da54596ecc0a95067ec5edc9939`; 최신 fetch main: `b4a25a4fc85c99de32fb4282a00a9293ee532952`.
- 새 작업 공간: `D:/flowme2605/flow-poc-merge-prep-20260920`, branch `agent/poc-merge-prep-20260920`. 생성 직후 dirty0에서 main을 no-commit으로 통합했다. 원래 main 브랜치와 PoC dirty 폴더는 수정하지 않는다.
- 이전 PoC 폴더의 modified144/untracked876(디렉터리 요약 포함)는 미소유 자료로 보존한다. 직전 목표 등록 때 root가 쓴 alpha 원장 내용은 이 실행 원장으로 명시 연결하며 다른 dirty 파일을 복사하지 않는다.
- commit/push는 검증한 소유 파일만, 기존 PR의 head branch에 fast-forward로 갱신한다. 새 준비 branch를 Vercel에 push하지 않는다. force push, main으로의 merge, Preview/Production, 외부 설정·DB/Auth·유료 설정 변경은 하지 않는다.
- 완료 조건: 세 결과물의 요구 추적 보존, 관련 회귀 해결, 충돌0, 필요한 GitHub CI 통과, 새 checkout 재현, 데이터 경계 및 배포 위험 보고, 실제 머지 승인 요청. 진행 중 부분 PASS를 완료로 승격하지 않는다.

## 단계와 완료 기준

| 단계 | 계획·설계·구현·검증 | 상태 |
| --- | --- | --- |
| 1 | 기준점/소유권/양쪽 변경과 충돌 영향 조사 | clean worktree, 충돌5파일 확인 |
| 2 | v4.1·개발1·개발2 원 요구→현재 UI/owner→회귀 대응 | [독립 요구 감사](merge-readiness-requirements-2026-09-20.md)와 현행14개 신규 회귀로 보완. M4의 원 D2 전체 동등성 등 미결 조건은 유지 |
| 3 | 유효한 main 변경·PoC 계약을 함께 보존하며 충돌/실제 결함 해결 | 파일 충돌0; source·docs·lock 및 native drag·역사 geometry/focus 실제 결함 해결. Linux 검사 도구 의존성 후속 수정 |
| 4 | 현재 production·역사 UI 검증을 분리하되 모두 실행, 전체 unit/type/audit/build/E2E와 새 checkout 검증 | 로컬 분할 검증·새 checkout 완료. 운영 단일run 실패 이력은 유지; Linux CI 실패와 수정판 재검증을 아래에 별도 기록 |
| 5 | 안전한 작업 branch push, 기존 Draft PR 갱신, exact-head CI/충돌/배포 확인과 보고 | 8b32c5b8까지 push, PR203 MERGEABLE·Draft. CI 미완료. main merge·배포0 |

## 충돌 및 자동 병합 영향

| 파일/묶음 | 양쪽 의미와 해결 근거 | 확인 |
| --- | --- | --- |
| docs/PROJECT_CONTROL.md | PoC의9/20 alpha 인덱스와 main의9/7 공개/운영 기록을 함께 보존. 과거 운영 기록을 현재 PoC 승인으로 읽지 않도록 분리 | docs16/6323 PASS |
| docs/ROADMAP.md | 9/7 운영 roadmap 보존 + 현재 alpha 앞의 merge-ready gate 연결 | docs PASS |
| docs/STATUS.md | PoC 최종판정의 당시 npm/audit 실패 기록을 고치지 않고 후속 보존 보고서 연결. main9/7 release 사실 보존 | docs PASS |
| lib/flow/source-fit.ts | dog9/4 mismatch/preview와 seed6/4 보존. main9/7 포괄 검토에는 D+3/D+7/조건부 기한 문제를 해소하는 근거가 없어 실행 재승격 안 함 | source4파일139/139 PASS |
| package-lock.json | main9/7의 browser/security 패치보다 새9/20 호환 패치 버전 유지. 수동 hunk별 검토 후 최종 lock은160fbf93과 동일 | 새 npm ci PASS, audit0 |
| seed-flows.ts 및 관련 tests | main의 실제 dog 제목은 유지하되 seed 검토일을6/4로 보존. kids9/20 preview audit/seed6/10 유지. 나머지 main seed는 그대로 | main 대비 seed 변경은dog검토일1곳 |
| contents-batch-260601-official.ts | main의 EV 공식 기본URL·현황 링크·9/7 검토 근거 보존 | main과 diff0, 공존 회귀 추가 |
| main의 E2E2파일 | 반복 검사 clock 고정 및 source밀도 fixture의 유효한 변경을 보존 | 전체 실행 예정 |
| main의 연구/기록 자료 | PR200/201/202와9/7 wireframe 패키지는 기획/QA 이력이며 새 Program 구현·사용자 증거가 아님 | 합병된 원문 보존 |

## 검증 설계

초기 수집 기준은100 spec/741 tests였다: 운영629, 옛 runtime58, 정적 보고서24, standalone27, 현행 Program3. 현행14개 추가 후105 spec/755 tests이며 기존741개를 제외하지 않았다. 이는 기능 충족률이 아니다. 실제 수집 결과를 기준으로 하며 정적 test 선언 수667과 구분한다.

기존 runtime58은 Surface의 저장 owner/동작을 검사하지만 현행 route는 Program을 연다. 단순 selector 교체나 skip으로 해결하지 않는다. 제품 route·exact-query gate를 바꾸지 않는 CI 전용 별도 Next harness에서 실제 Surface/Authoring을 재사용하고, 정상 production에서는 현행 Program의 원 요구 대응 회귀를 추가한다. 기존 테스트는 그대로 보존하며 파일 집합의 누락·중복0을 기계 검사한다. 역사 harness PASS는 현행 UX PASS로 집계하지 않는다. 9/10 금지된 UX 원본·미러·v11 wrapper는 실행하지 않는다.

추가 현재 검증: 네 origin의 read/identity/상세 왕복, source hold와 원본 보호, 개발2 빈 원문/틀/ghost/명시 적용/native Undo·재진입, 입력/취소/충돌 복구, 폴더·기간·개인 날짜/완료·혼합 순서, 비드래그/키보드,375×812·390×844·844×390·1024×768·1440×900. 관련 운영 경로·console/page error·가로 넘침·가려진 핵심 행동·운영 key/value와 prefix 밖 set/remove/clear를 함께 확인한다.

전체 명령: docs, npm test, 통합 model/component, strict, security audit, production build, 전체 E2E. 깨끗한 별도 checkout과 Linux GitHub CI의 결과를 구별한다. CI 실패는 retained report/trace를 읽은 뒤 수정하며 검사 완화로 우회하지 않는다. 실제 Android/iOS·관찰 사용자 검증은 수행하지 않았다.

## 현재 실행 결과 (중간, 전체 통과 아님)

| 실행 | 실제 결과 | 범위와 한계 |
| --- | --- | --- |
| `npm test` | 최종2255/2255 PASS, 실패·skip0 | 최초2254 뒤 optional intent SSR1개 추가. Plan focus 수정 포함 최종 실행 `output/integrated-product-poc/npm-test-2026-09-20T14-27-51-398Z.json` |
| strict 통합 타입 | entry392/source424, diagnostics0, 실행 중 source 변경0 | 현행 Program 계약 검사 |
| production build | 최종18페이지 PASS | 정상 앱 build, `output/integrated-product-poc/build-2026-09-20T14-29-53-045Z.json`. test 전용 역사 harness와 분리; 배포 아님 |
| 새 origin 회귀 | 2/2 PASS | 네 origin 복합 identity와 상세 왕복/reload, 합성 운영 전체 key/value bytes 동일. 읽기 중 PoC 포함 저장 mutation0. EV는 catalog에 없는 자료이므로 seed URL 계약으로 확인 |
| 새 작성 회귀 | 3/3 PASS | 빈 원문 예시/명시 삽입/native Undo·Redo/ghost/저장·재진입/reload, 모바일 dirty 전환 취소와 성공 저장 후 복구. 실제 IME·기기 검증 아님 |
| 새 저장·외부 변경 복구 | 2/2 PASS | quota 실패의 wire 불변·입력 유지·명시 재시도, 두 번째 탭의 실제 UI 저장 후 첫 탭 입력 보호·TXT 보관·명시 버리기와 최신 wire 복원. 모든 편집기나 무오류 경합의 동등성으로 확대하지 않음 |
| 새 개인공간 회귀 | 해상도5개+순서 parity1개,6/6 PASS | 수정 후 정상 production build. 메뉴·Alt+ArrowUp·실제 마우스 native drag·합성 touch-hold가 같은 전체 private state, 취소/Escape/pointercancel/no-op/quota에서 성공 mutation0. 해상도5개의 폴더·기간·완료/재열기·날짜미정·Undo/reload, 운영 bytes 불변 및 prefix 밖 쓰기/오류0 |
| 새 Flow 경계 회귀 | 1/1 PASS | read-only boot→부모 폴더와 두 Item 상속→Item1만 날짜 변경→완료/재열기→기간·문서 연결→Undo/reload. 운영 key/value 동일, prefix 밖 쓰기/clear 및 console/page error0 |
| 운영 E2E | 78파일629개 실행:626 PASS/3 FAIL/skip0. 표적 재검증3/3 PASS | 초기 실패는 보존한다. source hold 반영 count19→21과 dog/kids 직접 검사를 추가했고, focus·URL 두 실패는 코드/검사 무수정으로 두 번씩 재통과. 부하/timing 가설은 미확정이며 전체 단일 실행 green으로 집계하지 않음 |
| 역사 Surface E2E | 최종58/58 PASS,실패·skip·flaky·retry0,7.2분 | `output/playwright/historical-final2-summary.json`. 초기38/20,중간52/6 및 표적·중단 결과는 그대로 기록. K3A/K3B/K2C 승인 계약 이식과 실제 geometry/focus 수정 포함. 현행 Program 충족률로 집계하지 않음 |
| 보존 보고서·standalone 전체 | 최종51/51 PASS,14파일,실패·skip·flaky·retry0,3.9분 | `output/playwright/artifacts-final-all/results.json`. 초기31/20 JSON 보존, 일부 초기 trace/화면은 표적 실행 outputDir 재사용으로 소실됨을 이식 원장에 기록. 후속 증거는 경로 분리. 원본 HTML 수정0 |
| 현행 신규 회귀 묶음 | 최종14/14 PASS,2.5분 | 최종 production build, `output/playwright/current-merge-final-r2.json`. origin2+작성3+복구2+Flow경계1+개인공간6. 위 개별 재실행과 중복 합산하지 않음 |
| portable 기존 현행 회귀 | 첫 실행2 PASS/1 FAIL → 최종3/3 PASS,1.4분 | 공개 사본 편집의 Tab은 blur가 아닌2칸 들여쓰기 명령. Tab을 유지하고 최종 raw·caret·scroll의 실제 저장 일치 대기로 강화, 제품 변경 없음. `output/playwright/portable-program-final-input` |
| 전체 E2E | 105파일755개 분할 실행 완료, 최종 CI 단일 실행 대기 | 운영629 최초626/3·표적3PASS,Program17PASS(14+3 별도실행),역사58PASS,보고서/standalone51PASS. 중복·skip0. 이를755개 단일 실행 green으로 합쳐 보고하지 않음 |
| 통합 모델·component 전체 | 181파일1749/1749 PASS,실패·skip0,23분57초 | 1worker/256MiB old-space/4MiB semi-space 실행. 실행 중 검사 대상 source 변경0. `output/integrated-product-poc/new-tests-2026-09-20T13-59-58-278Z.json`. 앞선 자원 압박 중단 결과는 PASS로 세지 않음 |
| 현행 개인공간 hit 검사 강화 | 6/6 PASS,1.2분 | 위5개 해상도에서 추가/완료/더보기 버튼 전체 경계·44px·3점 hit와 조작 확인. 순서1개 포함, 신규14개와 중복 집계하지 않음. `output/playwright/workspace-geometry-final` |
| 보존 P2A 보고서 | 2/2 PASS,21.5초 | 옛 HTML의 v3/29runs 전체 내장 JSON SHA256을 고정 검증. 후속 v4 manifest와 판정 집계를 잘못 비교하던 검사 수정. HTML/과거 판정은 변경하지 않음. 현재 기능 QA로 집계하지 않음 |
| PlanDisplay SSR | 별도10/10 PASS | npm test의2255개에 미포함인 검사. CI에 명시 실행을 추가해 로컬만 검사되는 누락을 막음. core의 type/model JSON도 별도 artifact로 수집 |
| standalone 월간28개 빈 날짜 | 1/1 PASS,8.6초 | 검증된 legacy 입력의 실제 v2 boot,30일/28빈날짜/30추가버튼, 날짜별 순서, 취소0, 실패의 명시 복구, 성공·Undo 각각 정확 journal4/target1, reload0/운영 bytes 불변. `output/playwright/standalone-month-r3` |

새 브라우저 검사는 실제 UI 입력으로 상태를 만들며 초기 운영 fixture와 quota 오류만 합성한다. 첫 locator의 label/combobox 차이, React 렌더 완료 전 읽기, 성공 draft 저장 전 reload는 검사 전제 문제로 보정했고 초기 실패 evidence를 로컬에 남겼다. 실제 요구 위반이나 미해결 실패는 PASS로 바꾸지 않는다. 순서 drag와 역사 UI의 실제 결함·승인 계약 이식은 다음 절과 요구 원장에 구분해 기록했다.

### 이번에 발견한 실제 조작 결함

- 현행 Program의 native drag: `dragstart`에서 touch 이동 안내문을 목록 위에 삽입하면서 source/target 행이 움직여 Chromium의 native drag가 시작되지 않았다. 시스템 Chrome/Playwright Chromium 모두 관찰했고, 안내문 레이아웃만 숨긴 진단에서 같은 native drag/순서 상태 비교가 통과했다. 진단은 제품 PASS가 아니다. native drag identity를 render와 분리하고 터치 길게 누르기의 안내·취소는 유지했다. 수정 후 정상 build에서 메뉴/키보드/native drag/합성 touch-hold 전체 state 동등성과 취소·실패 경계를 통과했다. 저장·동일 transition은 바꾸지 않았다.
- 역사 Surface의 844×390 이동 panel: sticky 제목/상태 영역이 이동 대상의 실제 hit point를 덮었다. 실제 header 높이를 반영하는 scroll padding을 추가했다. 844×390 실제 hit, 긴 제목/오류 안내를 합성한844×300 및375×812의 static fallback, resize취소/재진입/가용높이 복귀를 재검증했다. 현행 Program의 같은 결함이라고 확대하지 않는다.
- 역사 Plan 편집기의 stale 오류 focus: failure가 가리키는 `data-personal-plan-error-summary`는 실제 DOM에 없었다. 렌더되는 단일 오류 owner인 `data-editor-error-summary`로 연결했다. stale4종의 firstErrorFocus 단위검사를 강화해14/14 PASS; 실제 브라우저 focus는 표적1개와 최종58/58 실행에서 통과했다. 저장·실패 판정은 변경하지 않았다.

최종 production build 후 현행14개 재실행은 처음13 PASS/1 FAIL이었다. `check()`는 비동기 transaction을 갖는 ARIA checkbox button의 click 직후 완료를 판단했고, 실패 snapshot에는 이미1/2완료가 표시됐다. native input처럼 취급하던 검사를 실제 click1회→정확한 해당 항목의 `aria-checked=true`→persisted completion 확인으로 보강했다. 느슨한 retry click이나 제품 변경은 하지 않았다. 첫 JSON/trace는 `output/playwright/current-merge-final.json`과 해당 디렉터리에 남기고 후속 실행은 `current-merge-final-r2`로 분리한다.

`flow-ux-review`의 감산 기준을 적용했다. 다음 행동이 drop인 native drag에 ‘행을 선택’하라는 안내를 추가하지 않고, 행 선택 방식인 길게 누르기의 안내·취소와 keyboard/Escape·실패 피드백은 보존한다. 두 조작의 Operability가 낮은 문제를 해결하는 국소 수정이며, 전체 제품 UX 점수나 원 D2 정책의 충족 판정을 변경하지 않는다.

React 검토에서는 native drag의 임시 identity만 ref에 두고 화면 상태는 React state로 유지하는지, resize observer/listener를 해제하는지, 추가 Plan 진단 속성이 저장·Undo 권한이나 raw/guard 직렬화에 쓰이지 않는지 확인했다. 이 검토로 새 네트워크/서버/저장 경로를 추가하지 않았다.

## 현재 발행/제약

코드 통합 commit `7dc8064019d17f8bbb87f2e22760b37b4a458d1a` 완료. 부모는 PoC `160fbf93`와 main `b4a25a4f`다. main 브랜치 자체를 머지한 것은 아니다. 이 기록 시점 push0, 기존 Draft PR203 유지, main merge0/Preview0/Production0, DB/Auth/외부 설정 변경0. 자동배포 차단은 기존 PR head branch에 적용되어 있으며 main에는 적용되어 있지 않다. main 머지 전 별도 승인 및 배포 안전 확인이 필요하다. 최종 원격 검사·발행 결과는 [PR203](https://github.com/knhbae/flowme2605/pull/203)의 exact-head 상태와 대조한다.

push 전 Vercel 대시보드 읽기 재확인: 이 저장소 연결 프로젝트 목록은 `flowme2605` 하나, Root Directory 빈 값(저장소 루트), deploy hooks0, Ignored Build Step Automatic, Node24.x다. Production Branch Tracking은 명시적으로 `main`의 모든 commit에 Production Deployment를 생성하며 도메인 자동 연결도 켜져 있다. 설정 변경/Save/Apply/Deploy는 실행하지 않았다. 연결 도구의 project 설정 조회는 schema 불일치로 실패해 이 UI 관찰을 사용했고, deployment 목록에서는 목표 시작 이후0건을 확인했다. 기존 PR branch의 `git.deploymentEnabled=false`는 그대로 유지한다. 향후 main 머지는 자동배포 차단 변경 승인을 먼저 받거나 배포 자체를 별도 승인받은 뒤에만 가능하다.

최종 보존 검토: 추가 코드의 제한된 credential 패턴 검색0, 새 test.skip/fixme0, output/env/trace zip의 stage0. 이번 수정 diff whitespace 검사 PASS. main에서 가져온4개 Markdown 파일의 명시적 줄바꿈 공백11개는 main과 동일하므로 정리하지 않았다. 이전 PoC vendor의 CRLF/기존공백도 이번 범위에서 바꾸지 않는다.

검사에서 생성된 PNG125개(기존 tracked122개·새3개)를 `output/merge-generated-screenshots-20260920/`에 exact path로 복사하고 SHA256을 검증했다. 과거 tracked 이미지는 HEAD 원본으로 복원했고 새3개는 해당 로컬 보관본으로 옮겼다. manifest는 `output/merge-generated-screenshots-20260920.json`이다. 새 검사 화면은 commit하지 않는다. main에서 이미 공개한9/7 wireframe 이미지20개는 main 그대로 병합하며 이 새 증거와 구별한다. 다른 worktree의 dirty/미추적 파일은 처리하지 않았다.

## 공개 파일만 사용한 새 checkout 재현

별도 `D:/flowme2605/flow-poc-merge-repro-20260920`에 tracked 파일만 checkout했다. dirty 자료나 기존 node_modules·output·환경 파일은 복사하지 않았다. `npm ci`로212개 설치·audit0 후 lockfile이 같은 코드 commit7dc80640으로 이동했다. 실행 전후 tracked/untracked dirty0이며 아래 결과를 확인했다.

- docs16필수/6332링크 PASS; owner105spec/755tests 누락·중복0.
- npm test2255/2255, 별도PlanDisplay SSR10/10, strict392entry/424source/진단0.
- 정상 production18페이지와 역사 test-app9페이지 build PASS. 두 build 모두 배포 아님.
- 현행14/14(88.540초)와 portable3/3(34.241초), 실패·skip·flaky0. exact-query/corrupt fallback, 네 origin, 작성·복구·이동·기간·원본/운영 경계 포함.
- 새 checkout에서는 통합1749개 전체와 역사58/보고서51/운영629개를 다시 실행하지 않았다. 이들은 위 작업본 결과와 후속 Linux CI를 구별한다.

새 checkout의 증거는 그 checkout의 `output/integrated-product-poc/` 및 `output/playwright/repro-current-14.json`, `repro-portable-3.json`에 있다. 로컬 전용 근거이며 실제 기기·관찰 사용자·운영 DB 검증으로 확대하지 않는다.

## 원격 첫 검사와 문서 이식성 수정

`9dba2b05`를 기존 PR branch에 정상 fast-forward push했다. pre-push의 docs/npm2255/build는 우회 없이 통과했다. 원격 PR은 `MERGEABLE`로 바뀌었고 main은 `b4a25a4f` 그대로다. push 후 Vercel 목표 시작 이후 배포0건을 재확인했다.

[첫 Linux CI](https://github.com/knhbae/flowme2605/actions/runs/35517963964)의 core는 docs 단계에서 실패했다. `d2-audit.md`의 P2-C와 parity 링크2개가 저장소 내부 정본 대신 이전 `D:/...` worktree를 가리켰다. Windows clean checkout에도 그 외부 폴더가 존재해 옛 검사기가 이를 허용했다. 따라서 앞선 Windows PASS는 Linux 문서 이식성까지 보증하지 못했다.

두 링크만 같은 저장소의 상대경로로 고쳤고 감사 내용·판정은 그대로다. 문서 검사기는 OS와 무관하게 Windows/UNC/절대/file 링크와 저장소 밖 상대경로를 거부하도록 보강했다. 정본 상대경로 통과, 없는 문서 실패, 실제 존재하는 절대·Windows·UNC·file 경로 실패, 실제 존재하는 이웃 파일 실패의4개 회귀를 docs:check에 추가해4/4 PASS, 실제6332링크 PASS다. 최초 실패 로그는 `output/ci-core-35517963964.log`에 보존한다. 이후 원격 결과는 새 head에서 다시 확인한다.

### Linux의 누락 실행 도구 의존성

문서 수정 `8b32c5b8`은 정상 hook을 거쳐 같은 PR branch에 push했다. [두 번째 Linux CI](https://github.com/knhbae/flowme2605/actions/runs/35518329550)에서 docs/npm/build/별도 SSR은 통과했으나 통합 타입 검사는 `spawnSync rg ENOENT`로 시작 전에 실패했다. 로컬에만 설치된 ripgrep을 검사 스크립트의 파일 수집기가 암묵적으로 요구했다. 제품 타입 실패나 검사 PASS로 계산하지 않는다. 첫 실행의 E2E는 새 push로 자동 취소됐으며 전수 통과로 세지 않는다.

타입·통합 테스트 검사기 양쪽이 Node 표준 파일 탐색을 공유하도록 수정했다. 실제 작업본에서 기존 rg 수집과 새 수집의 경로 전체가 정확히 같음(소스424개/테스트 파일181개)을 assert했다. 경로는 정렬된 저장소 상대경로이며 하위 파일·두 route seam을 보존한다. 범위 밖 파일은 수집하지 않고 루트 누락·지원하지 않는 파일 유형은 오류로 중단한다. 이후 추가되는 숨김 파일도 조용히 제외하지 않는다.

새 수집기 회귀4/4(빈 PATH 포함), 통합 strict392entry/424source/진단0/실행 중 변경0, recorder를 통한 docs4/4 및6332링크 PASS다. 이4개는 npm2255 및 제품 모델1749개와 별도의 검사기 테스트다. 전체 모델 재검사와 수정판 Linux CI는 별도로 확인한다. 두 번째 core 실패 로그는 `output/ci-core-35518329550.log`에 보존한다. 검사 skip·CI hook 우회·제품 코드 변경은 없다.
