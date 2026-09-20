# K2-A QA — 원문 체크와 개인 실행 완료의 소유권

작성: 2026-09-05. 상태: `K2A_FUNCTIONAL_VERIFIED_WITH_REMAINING_EVIDENCE`. 현재 원문 체크 분리의 신규 모델 검사와 신규 브라우저 22/22는 통과했다. 전체 npm 2,249/2,249, standalone 119/119, production build도 통과했다. 다만 선정한 기존 브라우저 회귀 7건 중 2건은 낡은 UI 계약으로 실패했고, root가 20장을 직접 평가해 표 줄바꿈·토스트 배치의 잔여 UI 문제를 확인했다. 이 문서는 전체 E2E나 세 산출물 전체의 완료를 선언하지 않는다. 기능 통과, 화면 완성도 부분, 아래 미실행 범위를 분리한다.

기준은 [K2-A 설계](./k2a-design.md), [P3-K 구현 계획 §4](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md), [개선 설계 §4.1](../2026-09-05-flowme-integrated-poc-ux-audit-v1/improvement-design.md)이다. 원본 blueprint의 작성 확인·개인 실행 소유권을 이번 발견 `P3K-BP-03` 및 요구 `BP-039`에 연결한다. 과거 trace의 충족 수를 새로 늘리거나, 이번 하위 검사 수를 요구 수로 세지 않는다.

## 1. 이번 변경과 적용 버전

| 대상 | 수정 전 | 이번 변경 | 보존한 것 |
| --- | --- | --- | --- |
| standalone 새 authored Flow | 주 Item의 `checkedInSource`를 `done`에 복사 | 새 `commit-authoring`에만 버전 1의 `AUTHORING_HANDOFF_EXECUTION_DEFAULTS` 적용: `done: false`, `completedAt: null` | rawText, parser, 하위 source 체크, fingerprint, identity, legacy done, 기존 writer/Undo |
| React 개인 실행 결과 | completion이 없으면 원문 sourceChecked로 완료를 추정 | 비저장 입력 목적 `authoring-preview` / `personal-execution`을 분리. 개인 실행은 명시 완료가 없으면 미완료 | 실제 completion entry, 원문/lineage, 일반·반복 identity, 작성 preview의 원문 체크 |
| React 두 caller | 같은 projection이 작성/실행 목적을 구별하지 않음 | 작성 화면과 개인 결과 화면에서 각 목적을 명시 | 저장 schema, 원문 parser, 효과·전역 UI 정책 |

기존 standalone `done: true`는 timestamp가 있든 null이든 그대로 읽는다. 새 Flow 저장 시 기존 Flow/task/completion의 subtree를 비교하며, 새 Flow가 추가된 전체 PoC envelope가 불변이라고 주장하지 않는다. 원문에는 `[x]`/`[X]`와 하위 확인 표시가 남는다. 결과 TXT의 **주 Item 상태**와 **하위 source 체크**를 따로 검사했다.

현재 생성 후보는 `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html`, **944606 bytes**, SHA-256 `F8AFA3CC0059E41D05CDF29F3C168A32AAF3FF023E5A7DC0FF9A297FB03D1D19`이다. 신규 standalone 브라우저는 현재 assets로 메모리에서 만든 HTML을 사용했고 attachment에 같은 SHA를 기록했다. 이는 파일명에 Android가 있는 후보 HTML을 Chromium에서 검사한 것이며 실제 Android 검사가 아니다. React 브라우저는 이번 production HTTP build를 사용했다.

## 2. 수정 전 재현과 검사 하니스 보정

모든 실행 자료의 공통 경로는 `output/poc-gap-implementation/k2a/`이다. 아래 실패 기록을 최종 PASS로 덮어쓰지 않는다.

| 실행 / 근거 | 실제 결과 | 해석 |
| --- | --- | --- |
| `react-before-reproduction.json` | 11실행: 3 PASS, 8 FAIL | 개인 결과·다시 열기·반복에서 source 체크 fallback 재현. 3/8 통과라는 비율이 아니라 11건 중 3건 통과 |
| `standalone-baseline-2026-09-05T04-16-42-046Z.json` | 3실행: 0 PASS, 3 FAIL | x/X/공백 조합 원문의 체크된 새 주 Item이 개인 완료로 생성됨 |
| `output/playwright/k2a-baseline-confirmed/`의 양쪽 `checked-handoff-observation.json` | React 개인 `[false,false]`, Todo `[true,false]`; standalone 개인·Todo 모두 `[true,false]` | 같은 체크 원문에서 서로 다른 두 제품 원인을 브라우저로 재현한 baseline. 성공 검증으로 합산하지 않음 |
| React 첫 수정 후 검사: `react-validation.json`의 `intermediateHarnessCorrection` | 새 Sheet의 빈 completedAt 기대를 빈 문자열에서 기존 계약인 null로 수정 | 기존 완료 fixture를 없애지 않은 신규 assertion 보정. 별도 제품 결함 수로 세지 않음 |
| `standalone-focused-2026-09-05T04-19-40-827Z.json` | 13실행: 11 PASS, 2 FAIL | Undo가 기존 계약대로 updatedAt을 갱신하는 점과 실제 horizon 옵션 이름을 새 테스트가 잘못 가정. 제품을 바꾸지 않고 기대값/API 사용을 보정 |
| `browser-current.json` | 20실행: 19 PASS, 1 FAIL | React legacy 상세 재열기 helper가 같은 문서 hash 변경만 사용함. 실제 카드 클릭 경로로 수정 |
| `browser-current-22.json` | 22실행: 22 PASS, 0 FAIL/skip/flaky | 위 helper 수정 및 Today 여정 2건 추가 뒤 결과. 앞 20건과 중복 합산하지 않음 |

## 3. 실제 검사 수와 중복 규칙

| 검사 묶음 | 실행 결과 | 로그 / 수의 의미 |
| --- | --- | --- |
| React projection | 26/26 PASS, 그중 K2-A 신규 13 | `react-validation.json`의 projection. 다음 150건에 포함됨 |
| React 선정 모델·component 회귀 | 150/150 PASS | 같은 JSON의 focused. 실제 component test는 코드 계약 검사도 포함하므로 150개 브라우저 조작을 뜻하지 않음 |
| standalone 신규 집중 검사 | 13/13 PASS | `standalone-focused-final-2026-09-05T04-20-24-225Z.json` |
| standalone 기존 집중 회귀 | 8/8 PASS | `standalone-existing-regression-2026-09-05T04-20-52-424Z.json`. 신규 13과 이름은 다르나 전체 119에 포함됨 |
| standalone 전체 모델 suite | 119/119 PASS | `standalone-2026-09-05T04-21-35-017Z.json`. 신규 13을 포함하며 119+13+8로 세지 않음 |
| 전체 `npm test` | 2,249/2,249 PASS, 15그룹, 실패·skip 0 | `npm-test-2026-09-05T04-21-24-806Z.json`. React 150을 다시 더하지 않음. standalone 119는 별도 실행으로 표기 |
| production build | exit 0 | `build-2026-09-05T04-17-48-220Z.json`. build를 테스트 case 수에 더하지 않음 |
| 신규 K2-A browser | 22/22 PASS: React 11 + standalone 11 | `browser-current-22.json`. 공통 11개 테스트 정의를 runtime별 실행. viewport loop 5회를 독립 시나리오 5개로 추가하지 않음 |
| Today 메타데이터 보강 재실행 | 2/2 PASS | `browser-today-metadata.json`. 기존22에 포함된 양쪽 Today 2건을 재실행했으므로 고유24건으로 계산하지 않음 |
| K1-A·기존 Stage2/P3-C·host 회귀 | 67/67 PASS: 38 + 21 + 8 | `k1a-regression.json`, wrapper `k1a-regression-2026-09-05T04-22-53-466Z.json`. 이전 K1-A의 같은 테스트 결과와 중복 합산하지 않음 |
| 추가 기존 boundary 회귀 | 7실행: 5 PASS, 2 FAIL | `existing-boundary-regression.json`, wrapper `existing-boundary-regression-2026-09-05T04-22-43-136Z.json`. 아래 §7의 미현행화 계약을 보존 |

모델 신규 정의는 React 13 + standalone 13 = **26개**다. 전체 npm·집중 실행·재실행의 누적 pass 수를 고유 테스트 수로 부풀리지 않는다. 모델 테스트 안의 5,000-step simulation도 5,000개 독립 test case로 세지 않는다. 신규 22개와 기존 선정 회귀는 각각의 실행 원장을 유지하며, 이 문서에서는 여러 suite를 합친 전역 고유 총수를 산출하지 않는다.

## 4. 모델 16항목 대조

아래 R은 `lib/flow/personal-workspace-poc-result-projection.test.ts`, S는 `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/standalone.test.cjs`이다. 괄호의 문구는 실제 test title의 식별 부분이다. `PASS`는 지정한 검사 범위에 한하며 마지막 열의 한계를 지우지 않는다.

| 설계 ID | 실제 검사 연결 | 수정 후 결과 / 남은 범위 |
| --- | --- | --- |
| M01 원문·parser 보존 | S `new handoff keeps raw` x/X/공백 3건; R `personal execution has no source-check fallback`, `authoring preview retains x and X checks`; 기존 authoring parser 회귀 | PASS. CRLF·한글/이모지·동명·줄/ref·입력 불변·하위 체크 보존. 모든 입력 문법의 신규 전수검사는 아님 |
| M02 새 handoff 초기값 | S `new execution defaults are a versioned PoC constant`; R `omitted purpose defaults safely`; 신규 browser `new checked handoff…` | PASS. 새 실행 미완료·시각 없음, 양쪽 영수증→개인공간 연결. legacy 자동 변환 없음 |
| M03 작성 preview | R `authoring preview retains…`, `preview never borrows…`, `finite recurrence authoring preview…`; S `authoring preview keeps source checks…` | PASS. 작성의 원문 체크와 개인 완료를 양방향으로 분리, preview 읽기 mutation 0 |
| M04 일반 결과 slots | R `personal execution has no source-check fallback in any result slot or download` 및 기존 실제 완료 fixture; S `authoring preview keeps source checks…`; browser 네 결과/TXT | PASS. 주 Item의 Text/Todo/Calendar/Sheet와 TXT/CSV projection 상태. 실제 clipboard 쓰기나 모든 다운로드 형식의 브라우저 조작은 아님 |
| M05 유한 반복 | R `finite checked recurrence starts…`, `one occurrence completion…`; S `checked finite recurrence starts…` | PASS. 3회 미완료 시작, 1회만 완료, 형제와 source 유지 |
| M06 종료 없는 반복 | R `open-ended checked recurrence…`; S `checked open-ended recurrence horizon…`; 기존 occurrence horizon 회귀 | PASS 범위: React 기본 읽기 horizon, standalone 1주→8주 확대와 미리 저장된 completion 0. React의 체크 원문으로 horizon 이동 UI까지 새 실행한 것은 아님 |
| M07 일반 완료·재열기·Undo·reload | R `normal complete, reopen…`; S `personal complete reopen Undo and reload…`; browser lifecycle 및 Today | PASS. 완료 시각·원문·다른 Item 보존. R의 단위 reload는 JSON 왕복이며 실제 page.reload는 신규 browser가 별도 수행. 초기 완료→Undo 미완료 복원은 S와 viewport loop에서 확인 |
| M08 반복 lifecycle | R `one occurrence completion…`; S `checked finite recurrence starts…`; browser `checked recurrence…` | PASS. 해당 회차 완료/다시 열기/Undo/reload, 주 원문·형제 불변 |
| M09 같은 제목 identity | S `new handoff keeps raw`의 같은/다른 Step; R checked fixture의 distinct ref; browser `same title Items within and across Steps…` | PASS. 선택한 동명 Item만 완료되고 reload 뒤 동일. 제목으로 대상을 추정하지 않음 |
| M10 다른 개인 사본 | R `a completed same-title item in another saved copy…`; S `explicit different handoff copy…`; browser legacy/another copy | PASS. 명시적인 다른 handoff fixture로 완료·원문·기존 도메인 subtree 격리. 새 사본 만들기 UI 요구는 추가하지 않음 |
| M11 legacy 읽기 | R `explicit legacy execution states win…`; S `legacy true with null or timestamp and false…`; browser legacy read/reload | PASS. standalone true+timestamp/true+null/false와 Undo snapshot, 읽기만 할 때 정확 bytes/추가 쓰기 0. source 체크만 보고 과거 done을 교정하지 않음 |
| M12 legacy에 새 저장 | S `only new handoff tasks use defaults…`; browser legacy→new checked handoff | PASS. 기존 Flow/task·완료·QuickItem subtree 유지, 새 항목만 미완료. 저장으로 정상 변화하는 전체 envelope의 불변을 요구하지 않음 |
| M13 같은 handoff no-op | S `duplicate handoff is exact no-op even after personal completion`; 기존 React state/AuthoringSurface idempotent retry 회귀 | 모델 PASS. 기존 완료/timestamp와 envelope 보존. 신규 browser의 실패 후 재시도는 성공 1회 확인이며, 성공 후 같은 handoff 재요청 UI 자체를 추가 실행한 것은 아님 |
| M14 handoff Undo·작업 원문 | S 기존 `explicit authoring handoff commits atomically…`, `authoring draft restores raw text…`; R 기존 state handoff Undo; `storage-transaction.test.ts`의 `atomically restores exact draft bytes with an Undo state write` | 기존 모델 회귀 PASS. 신규 22 browser는 개인 완료/회차 Undo이며 **handoff 자체 Undo→작성 draft 복원을 새로 조작한 것은 아님**. 다단계 Undo 정책 추가 없음 |
| M15 commit 실패 | S 신규 `checked handoff commit failure…`와 기존 cleanup failure; R 기존 storage-transaction의 state mismatch/draft removal mismatch/rollback 불완전/reload recovery; browser quota-state/readback-state/draft-remove 각 runtime | 실제 실행한 모델과 6 browser 오류 case PASS. 신규 browser는 복원 가능한 세 오류만 검사. rollback-incomplete/recovery-required UI 전체는 이번 신규 22 범위 밖이며 K1-A helper의 recovery와 혼동하지 않음 |
| M16 fail-closed·운영 경계 | 전체 npm의 gate/read-model/entry/storage-transaction 회귀; S corrupt draft/payload; 기존 boundary PASS5 중 invalid/corrupt·four origins·no-op; 신규22 storage probe | 단위 exact-query/unsupported origin, 선택된 기존 손상·무변경 브라우저와 신규 prefix 경계 PASS. 신규22가 wrong query·unsupported origin을 직접 탐색한 것은 아님. 기존 boundary 2 FAIL 때문에 전체 E2E 완전 통과 표시는 금지 |

M14–M16의 기존 모델 회귀를 찾을 때는 전체 npm 로그의 `atomically restores exact draft bytes with an Undo state write`, `persistent cleanup failure stays recovery-required and can recover on reload`, `incomplete target rollback retains a journal and later reload restores exact bytes`, `accepts only the scalar exact PoC query`, `identity collisions, unsupported origins, and malformed source data fail closed`를 확인한다. 코드에 test가 존재한다는 사실만으로 통과를 추정하지 않고 이번 npm 실행 로그와 연결했다.

## 5. 브라우저 8여정 대조

실행 파일은 `tests/e2e/personal-workspace-k2a-completion-ownership.spec.ts`다. `browser-current-22.json`은 각 runtime의 11개 결과와 storage attachment를 보존한다.

| 설계 ID | 실제 브라우저 연결 | 판정 / 한계 |
| --- | --- | --- |
| B01 작성→저장→개인공간 | `new checked handoff preserves source preview but starts personal execution open` 양쪽 | PASS. 같은 원문의 preview는 체크 유지, 새 개인 실행은 0/2, timestamp 없음, receipt/open/raw 확인 |
| B02 원문·4결과·복사물 | `Text Todo Calendar Sheet and downloaded TXT use execution state without erasing source subchecks` 양쪽 | PASS 범위: 네 결과·실제 TXT download·원문 exact·하위 체크 유지. copyText/CSV는 모델 근거이며 실제 clipboard 붙여넣기/CSV 브라우저 download까지 실행한 것은 아님 |
| B03 Today→기간→Flow lifecycle | `Today completion agrees with week month Flow results reopen Undo and reload` + 일반 lifecycle 양쪽 | PASS. runtime별 기존 Today 날짜 fixture를 사용해 오늘/주간/월간/Flow/결과에서 같은 완료를 확인. React와 standalone의 Today 산정 정책을 새로 통일하거나 두 clock이 같다고 증명한 것은 아님 |
| B04 반복 lifecycle | `checked recurrence starts three open occurrences and reopens only the selected occurrence` 양쪽 | PASS. 3회 중 1회 완료/재열기/Undo/reload, TXT 완료 주 항목 1개, 원문 유지 |
| B05 동명·다른 사본 | `same title Items within and across Steps…` 및 legacy/another copy 양쪽 | PASS. 동일 제목 3개 중 하나만 완료, 서로 다른 handoff 사본의 도메인 상태 유지 |
| B06 기존 완료 보존 | `legacy completion and another copy survive read-only reopen and a new checked handoff` 양쪽 | PASS. 기존 완료 열기/reload 추가 state write 0, 새 저장 뒤 이전 두 사본 subtree 유지, 기존 한 사본 재열기·Undo가 다른 사본에 전파되지 않음 |
| B07 실패·재시도 | `failed handoff quota-state`, `readback-state`, `draft-remove` 양쪽 6개 | PASS 범위: 실패 receipt 0, exact state/draft rollback, 재시도 후 새 Flow 1개·미완료. 성공 후 같은 handoff no-op 및 복구 불능 UI는 모델/기존 경로 근거와 분리 |
| B08 5 viewport 핵심 행동 | `five viewport core-action loop…` 양쪽 2개 loop | 자동 PASS / 시각 완성도 부분. 390×844, 375×812, 844×390, 1024×768, 1440×900에서 receipt opener·완료·결과 전환·원문·Undo 접근, Space 완료, document 가로 넘침 0. root 20장 직접 평가에서 React 표 줄바꿈 등 잔여 확인. 모든 화면/내부 clipping/실기 검증이나 모든 경계의 가림 0을 주장하지 않음 |

캡처는 `output/playwright/k2a-current-22/`의 viewport loop 두 테스트 하위에 `receipt-{width}x{height}.png`, `execution-{width}x{height}.png`로 있다. root가 영수증 10장·실행 10장을 직접 평가했다. 이 QA 작성자는 브라우저를 재실행하거나 이 20장을 직접 평가하지 않았으며 root의 검토 결과를 전달받아 아래에 기록했다. 테스트의 reachable·overflow assertion과 root의 시각 판단을 서로 다른 증거로 유지한다.

| 화면 평가 | 확인 결과 | 남은 처리 |
| --- | --- | --- |
| 양쪽 영수증·실행 5 viewport | 개인 카드 진행률·원문 `[x]` 보존·핵심 버튼 읽기 확인 | 완료 소유권 기능 PASS를 화면 전체 완성도 PASS로 확대하지 않음 |
| React Sheet 5 viewport | status/title이 한 글자 단위로 줄바꿈되어 읽기 어려움. 모바일만의 문제가 아니라 확인한 375–1440 너비에 남음 | 기존 로컬 UI 잔여로 K3-C에서 표 가독성 개선 |
| standalone 844×390 영수증 | root가 실제 로컬 후보 새 context에서 CTA의 5/50/95% 좌표 조합 9점을 검사해 모두 target hit 확인. 캡처에서는 toast가 오른쪽 테두리 약 4px와 겹쳐 보임 | 클릭 불능으로 판정하지 않지만 모든 경계 가림 0도 주장하지 않음. 본문/CSV 등과 겹치는 success toast 배치는 K2-C 피드백 배치에서 개선 |
| 영수증 내용 정합 | React 날짜 표시와 standalone 저장 결과/폴더 표기에 차이가 남음 | 원본 영수증 UX 정합은 K3-B/K3-C에서 비교·개선 |

Today 보강 attachment는 `output/playwright/k2a-today-metadata/`의 `today-period-flow-owner.json`에 injectedClock·standalone TODAY·sourceDate와 공유 Today 계산 미검사 사실을 기록한다. 이는 같은 2개 여정의 메타데이터 보강이며 새 시나리오를 추가한 것이 아니다.

## 6. 운영 불변 증거의 정확한 범위

`browser-current-22.json`의 `storage-boundary.json` attachment **22개를 직접 읽어 집계**했다.

| 항목 | 관측 결과 |
| --- | --- |
| 자동화 context | React 11, standalone 11. 각 fresh context의 테스트용 운영 sentinel 1개 |
| 운영 sentinel | key `flow:k2a:operating-sentinel`, 값 `  K2-A 운영 값\r\n한글 🙂 exact bytes  ` |
| before/after exact key/value 비교 | 22/22 동일 |
| 허용 PoC prefix 밖 호출 | setItem/removeItem/clear 합계 0 |
| 전체 관측된 호출 | setItem 281, removeItem 102, clear 0. 실패 시도·rollback·draft 저장도 포함하므로 성공 mutation 수가 아님 |
| console error + page error | attachment 합계 0 |
| 실제 사용자 profile·운영 실데이터 | 열지 않았음. sentinel 검사를 실사용자의 전체 운영 저장소 검증으로 표현하지 않음 |

관측된 키는 `flow:poc:personal-workspace:v1:` 아래의 `authoring-draft`, `state`, `editor-storage-recovery:v1`, `editor-storage-commit-marker:v1`, `standalone-integrated:draft`, `standalone-integrated` 여섯 개다. sentinel과 legacy fixture 준비는 product audit 시작 전에 이루어지고 reload에서는 재주입하지 않는다. 기존 네 origin의 상세 운영 fixture는 선정 회귀의 S1–S4가 별도로 검사했다. 신규22의 sentinel 한 개를 네 origin 전체 fixture로 설명하지 않는다.

## 7. 남은 결함·증거와 다음 판정

| 항목 | 현재 상태 / 다음 처리 |
| --- | --- |
| 기존 `personal-workspace-authoring-workspace-parity.spec.ts` 2건 | 기존 helper가 React navigation 이름 `작성 화면`과 버튼 2개를 가정하지만 시작 snapshot과 현재 모두 `작성 단계`다. standalone 시작 snapshot도 내 초안을 포함해 이미 3개였다. 이번 완료 mapping 변경의 회귀가 아니라 오래된 테스트 계약이며, 역사 파일은 보존하고 K3-A에서 현행화할 과제로 남긴다. 실행 결과는 여전히 2 FAIL |
| 최종 시각 평가 | root가 receipt/execution 양쪽 5 viewport 총20장 직접 평가 완료. 완료 소유권 확인과 별개로 React Sheet 가독성, toast 배치, 영수증 표기 차이를 위 표와 K2-C/K3 과제로 남김 |
| handoff 자체 Undo→원문 draft 복원 | 기존 모델/저장 회귀는 통과. 이번 신규 checked fixture의 직접 브라우저 여정은 미실행 |
| 복구 불능 저장 경로 | React 기존 journal/rollback/reload 모델 회귀 통과. K2-A 신규 browser에서는 복구 가능한 3오류만 실행. standalone handoff의 불완전 rollback 화면을 새로 검증했다는 주장 금지 |
| exact query·unsupported origin | 기존 모델 근거와 선정 기존 fail-closed 브라우저를 유지. 이번 신규22의 직접 negative route 전수 검사는 아님 |
| 날짜 정책 | standalone 고정 TODAY와 React clock은 기존 각 runtime 계약을 유지. 신규 Today case는 이 범위에서만 판단; 공유 clock/날짜 정책 새 확정 없음 |
| 전체 제품/다른 단계 | K1-B 미저장 편집 닫기, K2의 다른 묶음, K3 catalog·font·중첩 border/시인성·원본 UX 충실도는 이 1개 완료 소유권 수정으로 닫지 않음 |

판정: `BP-039`와 `P3K-BP-03` 중 **새 Flow의 개인 완료 초기값 및 개인 결과의 원문 체크 fallback 결함은 지정한 모델·브라우저 경로에서 해결**되었다. 모든 설계 항목을 24개 독립 실행 PASS로 표현하거나, 세 원본 산출물의 전체 UX/기능을 완성했다고 표현하지 않는다.

## 8. 실기·발행 상태

| 구분 | 상태 |
| --- | --- |
| 실제 Android Chrome | NOT_RUN |
| 실제 iOS Safari | NOT_RUN |
| 실제 OS 한국어 IME | NOT_RUN |
| 실제 보조기술/스크린리더 | NOT_RUN |
| 관찰 사용자 수 | 0명 |
| commit | 하지 않음 |
| push | 하지 않음 |
| PR | 만들지 않음 |
| Preview | 배포하지 않음 |
| Production | 배포하지 않음 |

운영 writer·운영 migration·계정/cloud·외부 동기화·새 제품 정책 확정은 이번 수정 범위 밖이다. 실제 기기 검사를 목표의 완료 대기로 다시 등록하지 않는다.
