# PR 203 병합 준비: 원래 요구와 현재 회귀의 연결

2026-09-20 독립 읽기 감사. 기준은 보존판 `160fbf93`와 `origin/main` 병합 작업본이다. 이 문서만 신규 작성했으며 기존 판정·제품·테스트는 수정하지 않았다. 감사 도중 충돌 해결이 진행될 수 있으므로 아래 충돌 관찰은 최초 읽기 시점의 내용이다. 이 감사에서 제품 테스트·브라우저 실행은 0건이다.

## 판정 단위와 정본

- [원래 요구 목록](../2026-09-05-flowme-integrated-poc-ux-audit-v1/coverage-inventory.md): V41 78부모/89하위, D1 26/59, D2 64/121, BP 86/155. 부모·자식은 중복 깊이이며 더해서 완료율을 만들지 않는다.
- [V41 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/v41-audit.md), [D1 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d1-audit.md), [D2 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d2-audit.md)는 9월 5일 당시 코드·차이·증거 한계를 보존한다. 당시 결함을 현재 미구현으로 자동 승계하지 않는다.
- [최종 평가](final-evaluation-2026-09-20.md), [coverage 원장](coverage-ledger.md), [최종 상황 원장](final-scenario-ledger-2026-09-20.md)은 이후 P01–P08 대표 경로·두 루프의 결과다. 모든 원문 문법·조합의 동등성이나 출시 완료를 선언하지 않는다.
- [알파 라우팅](alpha-requirement-routing.json)은 254부모와 그 424하위 조건의 재검토 위치를 연결한다. 파일 자체의 `isVerdict:false`, `isImplementationApproval:false`, `isCompletionPercentage:false`를 유지한다. M1 이후 인증·서버 구현 여부를 현재 로컬 PoC 판정에 섞지 않는다.

## 옛 UI 검사와 실제 미충족을 나누는 기준

| 분류 | 필요한 증거 | 처리 |
| --- | --- | --- |
| 현재 요구의 실제 회귀 | 원래 ID/행동·보존값·상태 전이 계약이 여전히 유효하고 현재 Program에서 같은 전제가 충족되는데 실제 결과가 다름 | 제품 결함으로 유지; selector만 바꾸어 PASS 처리하지 않음 |
| 이전 화면 전용 검사 | 옛 route·버튼 문자열·HTML 구조만 다르고 승인된 후속 화면에서 같은 대상·상태·복구 의미가 유지됨 | 현재 공개 행동으로 locator/시작 경로를 이식; 이전 입력·assertion 의미 보존 |
| 승인된 제품 변화 | 해당 요구를 대체한 결정과 범위가 명시됨 | 옛 기대와 대체 계약을 함께 기록. 구현 주석이나 구현되어 있다는 사실만으로 승인 추정 금지 |
| 증거 미실행 | 모델/코드 경로는 있으나 현재 route 조작·쓰기·복귀·reload 증거 없음 | 미검증으로 남김. 모델 test 개수로 UX 충족 승격 금지 |
| 원래부터 별도 검증 대상 | 실제 IME·기기·보조기술·관찰 사용자·서버 권한 | 미실행/범위 밖을 명시. 데스크톱 자동화를 실제 기기 검사로 표현 금지 |

예: dirty Escape 후 저장 mutation 0은 필요하지만 충분하지 않다. 확인 없이 입력이 사라지면 D1-004 UX 결함이다. 옛 `PersonalWorkspacePocSurface` testid를 찾지 못한다는 사실만으로 현재 `ProgramSpace`가 미구현이라고 판정할 수도 없다. 날짜 이동은 원본 일정·Flow 소속·다른 기록까지 비교해야 한다.

## 요구 → 현재 Program → 실행 회귀 연결

아래의 현재 경로는 코드 존재 확인이다. ‘추가 필요’는 요구 미구현 판정이 아니라 이번 병합판의 재현 가능한 현재 E2E 부족을 뜻한다.

| 요구군 | 현재 Program 소유 경로 | 기존 실행 가능한 회귀 | 병합 준비에서 보완할 관찰 |
| --- | --- | --- | --- |
| V41-012~017, BP-009~014, BP-024/026: 폴더·날짜·순서 owner | `ProgramSpace`, text workspace, legacy projection | portable private journey는 task 날짜·완료·Undo·reload 검사 | Flow 폴더 상속, 같은 날짜 Today/Week/Month 순서, 날짜 변경 시 원본/소속 불변, 메뉴·키보드 동일 결과 |
| V41-042/046/050, BP-062/063: 즉시 복구·무효 동작·키보드 | `ProgramApp` controller/store/receipt, `ProgramSpace` | portable private journey의 완료 Undo | 이동으로 행이 사라진 뒤 모바일 Undo 접근, no-op/cancel/Escape/stale/quota에서 정확한 wire와 복구 입력 보존 |
| D1-001/007/008/009/024, BP-041/052: 네 origin·Map·운영 경계 | `ProgramLegacyWorkspace`, legacy snapshot/projection/hydrate, `ProgramApp` | legacy 모델 회귀; portable gate의 잘못된 query/손상 payload | 네 origin synthetic 운영 fixture를 실제 읽고 선택→상세→개인공간 복귀. identity 중복 없음, Map child/review hold 명시, 운영 key/value byte 동일 |
| D1-017/019/021/023, P03/P04: 발견·출처·기준일·개인 사본 | `ProgramDiscovery`, 공개 사용/출력, legacy source review | portable discovery의 사본 생성·개인 note·공개값 불변 | 검색/필터 복귀, 기준일 후 일부 사용, 출처 hold의 실행 차단, TXT/CSV/ICS 복귀 링크의 정확 판본·항목 |
| D1-003/004/011/018: staged 저장·dirty 취소·충돌 | creator/legacy editor, `ProgramApp` navigation 및 external recovery | 관련 component/model 회귀; portable에는 직접 조작 없음 | dirty Escape→계속 편집→입력/초점 보존, 명시 버리기, 다른 탭 갱신 후 조용한 overwrite 금지 |
| D2-029~040/044/055: 동일 원문·문맥형 편집·IME 안전 | `ProgramCreatorWorkspace`, native creator vendor, `ProgramTextEditor` | native/context/interaction 회귀 | 현재 creator route에서 실제 source를 사용하여 원문/Flow 왕복, 부분 입력과 문맥 메뉴의 동일 행·caret. synthetic composition은 실제 IME로 세지 않음 |
| D2-045~054/056/057/058: 틀·ghost·native Undo·저장본 | native template/source owner, creator library/pending/recovery | 해당 pure/component 회귀; portable에는 없음 | 빈 source 틀 삽입, ghost 보기/숨기기의 원문 무변경, 한 번 Undo/Redo, 명시 저장과 pending/recovery 분리, reload |
| D2-003/020/026, P06/P07: 결과와 원문·공개 판본 경계 | template result, publisher, source update/proposal | 출력/수용/복구 모델 회귀, 과거 두 루프 | 개인 메모 공개 제외, 고정 판본 출력, 부분 수용·Undo의 기존 실행 기록 불변 |

현재 공개 portable suite는 [통합 E2E](../../../tests/e2e/integrated-product-poc-portable.spec.ts)의 세 시나리오다. 다섯 viewport에서 반복해도 세 결과물의 모든 요구를 독립 검증한 것으로 계산하지 않는다. 첫 시나리오는 wrong/extra/duplicate query와 corrupt Program payload, 둘째는 개인 문서/task date/complete/Undo/reload, 셋째는 공개 사본과 private edit 경계를 담당한다.

## 충돌 다섯 파일과 자동 병합의 의미

| 대상 | 관찰된 변경·위험 | 연결 요구와 보존 조건 |
| --- | --- | --- |
| `docs/PROJECT_CONTROL.md`, `docs/ROADMAP.md`, `docs/STATUS.md` | main의 과거 정리·보존 상태와 branch의 최신 통합/알파 상태가 충돌 | D1-026/D2-008/063. 최신 상태 owner와 과거 실행 결과를 별도로 보존. 기존 PoC 완료를 실사용/Auth 완료로 승격하지 않음 |
| `lib/flow/source-fit.ts` | dog 감사 metadata의 9/4 vs 9/7 및 source title 충돌. ours의 mismatch/preview hold와 main 출처 재검토 metadata를 혼합할 위험 | D1-007/017, BP-032/052. 새 날짜가 기존 부정확한 실행 일정의 적합성을 증명하지 않음. dog/kids hold는 별도 원문·공식 근거로 재판정하기 전 유지 |
| `package-lock.json` | main의 보안 갱신과 보존판 patch 버전 해결의 lock 충돌 | P08 및 알파 A23. lock 재생성 후 package와 해상도 일치, npm ci/audit/test/build를 같은 병합판에서 검증. 버전 숫자만으로 안전 판정 금지 |
| 자동 병합 `seed-flows.ts` | dog source title·checked_at가 main 9/7로 바뀜. source-fit 파일 충돌만 해결해도 seed metadata는 이미 바뀌어 있음 | seed 보존 회귀와 감사 provenance를 함께 확인. 출처 확인일과 변환 적합성·실행 노출은 서로 다른 계약 |
| 자동 병합 `contents-batch-260601-official.ts` | EV 출처 URL/제목/검토일 및 첫 Item의 공식 보조금 현황 링크 변경 | D1-017, BP-032. 상세와 Item에 정확한 새 공식 URL 표시, 원래 개인 저장 사본 자동 재작성 금지 |
| 자동 병합 `seed-flows.test.ts`, `source-fit.test.ts` | 날짜/hold 및 source 재검토 기대값이 합쳐짐 | 충돌 없는 test diff도 읽어야 함. 특히 dog seed와 audit 9/4 보존 기대, kids preview hold 기대가 남아 있는지 확인 |
| 자동 병합 기존 E2E 두 파일 | skipped recurrence 사례의 clock 고정 추가, EV 기대 URL 갱신 | clock 추가는 결정적 기준일 재현 보완. 완료/Undo/sibling untouched assertion은 줄이지 않음. URL expectation은 원문 감사와 일치해야 함 |

9월 7일 core-journey wireframe 묶음은 설계·연구 산출물로 병합되는 것이며 현재 Program runtime 구현이나 현재 브라우저 PASS가 아니다. 기존 9월 20일 평가 문서의 npm 실패/취약점 수는 당시 사실로 남기고 새 해결 결과는 새 merge 검증 원장에 기록한다.

## 이번 병합 준비의 필수 추가 현재 E2E

1. **출처 경계 회귀:** dog/kids를 실제 카탈로그/상세로 열어 review hold와 직접 실행 불가를 확인. EV source/Item 링크를 새 값과 대조. 읽기 과정 저장 0, 운영 bytes 동일.
2. **네 origin 실제 진입:** 서로 같은 표시 제목·itemId가 있는 네 origin fixture를 각각 주입. read/open/back/reload와 복합 identity, source/개인 메모 경계, Map child/hold를 검사. synthetic fixture임을 명시.
3. **개발2 빈 원문 틀:** 실제 creator route에서 scaffold→ghost toggle→native Undo/Redo→명시 저장→reload. ghost/source/clipboard 경계와 pending/saved owner를 따로 비교. 일반 private textarea 검사로 대체 금지.
4. **개발1 dirty·stale 복구:** 실제 편집기의 Escape/계속 편집/버리기, 저장 실패 또는 다른 탭 변경 뒤 복구 UI가 활성 모달 안에서 조작되는지 확인. wire·draft·focus를 함께 검사.
5. **v4.1 이동·기간 parity:** 같은 항목을 날짜/폴더/순서 이동하고 Today/Week/Month/문서에서 확인한 뒤 Undo/reload. Flow Item 폴더 상속과 원본 일정 불변 포함. 최소 390×844와 844×390에서 메뉴·키보드 비드래그 경로를 실행.

공개 사본→제작→선택 공개→제안/부분 수용→파일 복귀의 과거 두 루프는 보존된 역사 근거다. 이번 merge판에서 전부 재실행하지 않으면 그 한계를 남긴다. 이것을 다섯 필수 회귀의 성공으로 대체해 ‘전 요구 검토 완료’라고 쓰지 않는다.

## 이 문서의 실행·발행 상태

제품·브라우저 테스트 실행 0. 코드 경로와 기존 테스트 정의·문서·merge diff를 읽었다. 실제 기기/IME/보조기술 미실행, 관찰 사용자 0. 이 독립 감사의 stage/commit/push/PR 변경/merge/deploy는 0이다. 최종 병합 승인은 root의 실제 검증 결과와 사용자 권한 경계를 따른다.

## 후속: 개발2 현재 Program 브라우저 회귀

위 감사 이후 별도 요청으로 [authoring merge E2E](../../../tests/e2e/integrated-product-poc-authoring-merge.spec.ts)를 추가했다. 공통 production 서버 3104와 [merge config](../../../tests/e2e/integrated-product-poc-merge.config.ts)에서 최종 **3/3 PASS, 56.5초**다. 제품 코드는 수정하지 않았다.

- 1440×900: 빈 제작 초안에서 실제 예시를 열어 빈 원문 유지·취소, 빈 틀 명시 삽입, textarea native Ctrl+Z/Ctrl+Shift+Z, 빈칸 힌트 토글의 source 불변, 명시 저장·같은 draft 재진입·reload를 검사했다.
- 390×844: dirty 원문에서 다른 빈 초안을 선택하면 확인을 거치고, ‘계속 편집’으로 같은 원문·draft를 유지한다. 마지막 성공한 입력 복구 저장을 확인한 뒤 reload하여 값을 보존했다.
- 1440×900: 구조 작성 틀의 읽기 전용 예시가 실제 보이고, 폼 입력만으로 rawText를 materialize하지 않는다. 예시에서 Escape를 누르면 예시만 닫고 폼 입력과 빈 원문은 유지한다.
- 세 시나리오 모두 synthetic 운영 sentinel byte 동일, PoC prefix 밖 localStorage setItem/removeItem 및 clear 0, console/page error 0을 assert했다. 테스트가 완료 상태를 storage로 주입하지 않았고 사용자 입력 경로로 만들었다.

첫 실행은 1 PASS/2 FAIL이었다. 모바일 검사는 600ms 복구 저장이 성공하기 전에 즉시 reload한 전제 오류를 마지막 성공 상태 확인으로 보정했다. 이는 저장 전 즉시 reload까지 보호됨을 입증하지 않는다. 폼 선택은 실제 snapshot에 있는 combobox의 accessible role로 locator를 수정했다. 실패 trace는 로컬 전용 근거 `output/playwright/authoring-merge/`, 최종 실행은 `output/playwright/authoring-merge-r2/`다. 재시도를 더해 독립 시나리오 6개로 세지 않는다.

한계: 이 신규 검사는 새 빈 초안 경로다. 기존 D2 native 저장본 전체 context 재사용, stale 두 탭 복구, quota 실패, 실제 IME·Android/iOS, clipboard 내용까지 이번 세 검사로 충족 판정하지 않는다. ghost 토글의 source 불변과 native Undo/Redo를 확인한 것이며 모든 편집 조합의 동등성은 아니다.

## 후속: 현재 dirty·저장 오류·다른 탭 복구

[recovery merge E2E](../../../tests/e2e/integrated-product-poc-recovery-merge.spec.ts) 2개를 같은 production 3104에서 실행해 **2/2 PASS, 1.9분**을 확인했다. 제품 코드 변경 없이 사용자가 UI로 제작 초안을 만들고 저장했으며, A 페이지의 Program key setItem에만 `QuotaExceededError`를 주입했다. 최종 상태를 storage에 주입하거나 원격 저장을 가짜 event로 대신하지 않았다.

1. 390×844 quota: 정상 저장한 raw wire를 보관하고 새 입력의 실제 저장 실패를 확인했다. committed wire는 byte 동일하고 textarea 입력·초점 접근은 유지됐다. 오류 주입을 해제하고 ‘입력 보관 다시 시도’를 실제 눌러 성공한 뒤 reload 복원을 확인했다.
2. 390×844 A와 별도 B 탭: A의 실패한 dirty 입력을 남긴 상태에서 B가 정상 제작 UI로 다른 원문을 명시 저장했다. A의 ‘다른 탭 변경과 입력 보호’ 표시와 원문 보존, ‘입력 유지’, 원문 초점 접근, 실제 TXT 다운로드의 미저장 입력 포함을 확인했다. 이후 ‘버리고 불러오기’를 명시 선택하면 B의 원문이 표시되고, 복구 및 reload 전후 B가 성공 저장한 전체 wire는 byte 동일했다.

두 검사 모두 운영 synthetic sentinel bytes 동일, prefix 밖 localStorage 쓰기/clear 0, console/page error 0을 assert했다. 다운로드 파일은 실제 browser download 결과를 읽었다. 로컬 증거 경로는 `output/playwright/recovery-merge/`다.

이로써 바로 위 개발2 회귀의 quota/두 탭 미실행 한계 중 **현재 제작 원문의 위 두 상황**만 새 증거로 보완했다. 순수 무오류 저장 경합, 모든 편집기와 모달, 기존 native context 전 필드, 실제 기기·IME까지 닫은 것이 아니다. ‘원문 초점’은 유지된 원문을 실제 focus할 수 있음을 검사했으며 자동 caret·selection 복귀를 주장하지 않는다.

## 후속: v4.1 기존 Flow와 Item 실행 위치 경계

[Flow boundary merge E2E](../../../tests/e2e/integrated-product-poc-flow-boundary-merge.spec.ts)는 production 3104, Chromium 390×844에서 최종 **1/1 PASS, 1.2분**이다. canonical-personal-copy origin의 합성 운영 Flow 1개와 날짜가 같은 Item 2개만 초기 입력했다. 완료된 Program state는 주입하지 않았으며, 첫 진입 read-only projection에서 Program 저장 key가 없는 것도 확인했다.

실제 폴더 생성 후 기존 제작·실행 도구에서 부모 Flow의 폴더를 바꿨다. 현재 canonical folder projection에서 부모와 두 Item의 같은 폴더 상속을 확인했다. Item1의 실행 날짜만 다음 날로 옮긴 뒤 Item2의 날짜, 두 Item의 Flow 소속, saved binding identity가 유지됨을 검사했다. legacy 화면에서 완료하고 연결한 개인 문서를 실제 열었다. 오늘에는 Item2만, 월간에는 완료한 Item1과 Item2가 보였으며, 전체 할 일에서 다시 열기→Undo→reload 후 날짜·폴더·완료 상태와 마지막 성공 wire가 유지됐다.

마지막 비교는 fixture에 넣은 모든 비-PoC localStorage key/value 전체를 대상으로 byte 동일을 확인했다. 원본 bundle과 saved record도 이 비교에 포함된다. PoC prefix 밖 setItem/removeItem, clear, console/page error는 모두 0이다. 날짜·완료 검사는 원본 snapshot을 변형해 읽지 않고 제품의 현재 canonical legacy projection reader와 현재 문서 task projection 양쪽을 비교했다.

초기 네 실행은 테스트 전제 오류로 중단했다. 자동 연결된 Flow에 별도 연결 버튼이 있을 것으로 예상한 점, Flow를 일반 documents 배열에서 찾은 점, 실제 link/checkbox 역할을 button으로 찾은 점, 도움말까지 포함하는 날짜 label을 exact text로 찾은 점을 실제 코드·snapshot 근거로 보정했다. 제품 소스 변경은 없다. 원래 실행 증거는 로컬 전용 `output/playwright/flow-boundary-merge/` 및 `flow-boundary-merge-r2/`부터 `flow-boundary-merge-r4/`에 보존했고, 최종은 `output/playwright/flow-boundary-merge-r5/`다. 재실행을 독립 시나리오 수에 합산하지 않는다.

이 검사는 canonical Flow 한 사례의 비드래그 경계다. 네 origin 전체의 이동 조합, drag/long-press 동등성, 실제 Android/iOS 기기, 관찰 사용자 검증까지 뜻하지 않는다. 위 감사의 전체 요구사항 충족률이나 과거 판정을 바꾸지 않는다.

## 역사 Surface Stage 3 계약 이식 원장

역사 Surface의 수정 전 38 PASS/20 FAIL은 별도 실행 기준선으로 보존한다. JSON 원본은 로컬 전용 `tests/e2e/output/playwright/historical-surface-summary.json`, trace·화면은 `output/playwright/historical-surface/`다. 아래 Stage 3 수정으로 과거 실패를 소급해 지우지 않는다.

근거는 [K3B owner 검토](../2026-09-05-flowme-integrated-poc-gap-implementation-v1/k3b-react-plan-display-owner-audit.md)와 [큰 Plan 표시 계약](../2026-09-05-flowme-integrated-poc-gap-implementation-v1/k3b-react-large-plan-receipt-design.md)다. Plan은 memory-only PlanDisplay로 이식됐으며 활성 편집 실패는 editor의 단일 local alert가 맡는다. Quick은 기존 v1 Receipt를 유지한다.

| 기존 Stage 3 검사와 차이 | 의미를 보존한 현재 검사 |
| --- | --- |
| 네 origin·작성 handoff의 schema signature에 개인 구간 제목이 없음 | 승인된 `personal-section-title`을 exact signature에 추가. source read-only, 같은 편집 문법, clean close 쓰기 0, focus 검사는 유지 |
| 성공 Plan 결과의 operation, Undo의 intentId가 renderer DOM에 없음 | 이미 발급된 display의 `operation`/`intentId`만 읽기 전용 진단 속성으로 렌더. 기존 target 1/support 4, ref/date/completion, Undo actual write assertion 유지 |
| stale Plan에서 실패 Receipt를 기대함 | Receipt DOM 0, recoverable-error editor의 단일 alert·focus, 준비 입력 유지, 외부 raw 정확 보존과 실제 mutation 0을 검사 |
| quota Plan에서 실패 Receipt의 intentId를 읽음 | active Plan에 optional `diagnosticIntentId`만 전달해 실패 editor와 retry 성공 display의 동일 intent를 직접 비교. exact rollback, failed target 호출 1/성공 target 0, retry 성공 target 1, Undo 성공 target 1은 그대로 검사 |

진단 prop과 data 속성은 저장·재시도·Undo 권한으로 읽지 않는다. raw/state/draft/guard/retry descriptor를 추가로 DOM에 직렬화하지 않는다. root 승인으로 Surface 호출부 1줄, EditorSurface optional prop, PlanResultSurface 표시 속성만 확장했다. 다른 작업자의 이동 패널 geometry 수정은 이 작업 소유가 아니다.

두 presenter SSR 파일은 **19/19 PASS**이며, 새 intent 전달과 optional 부재, private guard/descriptor 미노출, 단일 alert를 포함한다. SSR은 실제 storage attempt 성공 증거가 아니므로 같은 intent retry는 아래 브라우저 재실행 결과로 별도 판정한다. 브라우저 재실행은 아직 진행 전이며 이 시점에는 Stage 3 다섯 실패의 해소를 선언하지 않는다.

## 현재 Program portable 저장 판독 시점 보정

초기 portable 실행 **2 PASS/1 FAIL**은 로컬 전용 `output/playwright/portable-program/`에 보존한다. discovery 사본에 메모를 입력하고 Tab을 누른 뒤 reload 비교에서 마지막 줄의 두 공백과 caret +2 차이가 발생했다.

native editor의 Tab은 blur가 아니라 두 칸 들여쓰기 명령이다(`vendor/text-editor.cjs`의 `indent` 및 Tab handler). `ProgramTextEditor`는 변경을 450ms 뒤 저장하고 이미 저장 중인 첫 입력 뒤의 새 입력을 이어 저장한다. 기존 검사의 `includes(note)`는 들여쓰기 전 fill 저장만으로도 통과하므로, 두 번째 명령의 저장이 끝나기 전에 비교 기준을 읽을 수 있었다. 실제 reload 정규화 결함으로 판정하지 않았다.

[portable E2E](../../../tests/e2e/integrated-product-poc-portable.spec.ts)는 Tab 명령을 유지하며 실제 textarea 끝줄 `  Portable private note only`를 exact 검사한다. 이어 전체 raw·문서 ID·selection start/end·scrollTop이 실제 저장 상태와 같아진 뒤 비교 기준을 잡도록 강화했다. 공개 원본·이웃 actor 불변, reload 후 전체 data equality, 운영 저장 경계 검사는 그대로다. 제품 소스 변경 없이 수정판 전체 **3/3 PASS, 1.4분**이며 새 로컬 증거는 `output/playwright/portable-program-final-input/`다. 재실행은 독립 시나리오 세 개를 더 만든 것으로 세지 않는다.

## frozen standalone checkpoint 읽기 계약 이식

standalone 포함 artifact 기준선 31 PASS/20 FAIL의 원본은 로컬 전용 `output/playwright/artifacts-merge/results.json`이다. 이 절에서 golden HTML이나 runtime asset을 수정하지 않았다. 실제 frozen HTML은 workspace checkpoint v2와 별도 journal을 쓰는데, 과거 검사가 구 key의 `.state`를 읽거나 전체 localStorage 호출 수를 target write 수와 동일시했다.

[standalone E2E](../../../tests/e2e/personal-workspace-integrated-standalone.spec.ts)에 현재 정확한 v2 key와 `validateCheckpoint`를 통과해야만 데이터를 반환하는 read-only helper를 추가했다. missing/invalid를 seed로 바꾸거나 복구하지 않는다. 구 key bytes는 별도로 보존 검사한다.

- scoped order: top/bottom/Undo 각각 journal prepared set → workspace target set → journal confirmed set → journal remove의 정확한 네 호출과 target 1, 정리된 journal null을 확인한다. 같은 경계·닫기는 추가 호출 0, 원래 운영 bytes 동일이다.
- recurring: 원본 Item bytes, 세 회차 identity, 특정 회차 날짜/완료, 취소 0쓰기, Undo/reload 비교는 유지하며 실제 v2 checkpoint를 읽는다. 허용 key는 v2 target·v2 journal·authoring draft 세 개로 exact 지정한다.
- same-source retry: 첫 이식 실행은 2 PASS/1 FAIL이었다. v2 key를 바로잡자 중복 저장 후 draft 보존과 옛 제거 기대가 충돌했다. [K2B caller switch](../2026-09-05-flowme-integrated-poc-gap-implementation-v1/k2b-caller-switch-design.md) §7 및 C3-08은 같은 checkpoint·draft 보존·기존 사본 읽기로 명시 정정하며, [action journal](../2026-09-05-flowme-integrated-poc-gap-implementation-v1/k2b-action-journal-addendum.md) §2는 draft 제거만을 위한 동일 handoff 재실행을 금지한다. [C3 UI QA](../2026-09-05-flowme-integrated-poc-gap-implementation-v1/k2b-c3-ui-qa.md)의 UI12가 후속 검증 근거다. 코드 의도만으로 정책을 새로 정한 것이 아니다. 두 번째 저장 직전 draft exact bytes, checkpoint bytes, Flow 중복 0, target/journal/draft 호출 0을 검사하도록 이식했다.

이 세 검사 최종은 **3/3 PASS, 21.8초**다. 첫 이식 `output/playwright/artifacts-checkpoint-recheck/`의 2 PASS/1 FAIL과 최종 `output/playwright/artifacts-checkpoint-recheck-r2/`를 구별해 보존했다. 월간 fixture와 다른 standalone 시나리오는 이 세 검사 결과로 대신 충족 판정하지 않는다.

Stage 3 공동 후속 실행에서는 13개 중 11 PASS/2 FAIL을 확인했다. 같은 intent quota retry·Undo·Quick 기존 Receipt는 통과했다. 남은 두 검사는 옛 별도 `txt` 탭을 현재 `text` TXT 탭의 실제 다운로드 exact bytes 검사로 이식했고, 원래 stale 테스트에 없던 자동 focus assertion은 당시 제거하되 단일 visible local alert·입력·raw·0쓰기 검사는 유지했다. 그 당시 stale 자동 focus는 PASS로 보고하지 않았다. 코드상 stale 실패 target `[data-personal-plan-error-summary]`와 공통 오류 DOM `[data-editor-error-summary]`가 다르다는 잠재 불일치를 남겼다. 이 두 검사는 별도 합동 표적 실행에서 **2/2 PASS(각 7.5초·3.1초)**를 확인했다. 앞선 11개와 합산해 같은 실행에서 13/13 통과했다고 쓰지 않는다.

후속 root 조사에서 실제 DOM에 과거 focus target이 없음을 확인했다. Plan failure의 기본 focus를 실제 공통 오류 owner로 연결하고 stale4종 단위 assertion과 브라우저 `toBeFocused()`를 추가했다. 단위14/14, 최신 harness의 stale 브라우저1/1 PASS다. 이는 assertion 제거로 덮은 완료가 아니라 실제 접근성 결함의 후속 수정이다. 같은 최종판의 전체 역사 Surface 재실행 결과는 실행 담당 원장의 최종 전수 결과를 따른다.
