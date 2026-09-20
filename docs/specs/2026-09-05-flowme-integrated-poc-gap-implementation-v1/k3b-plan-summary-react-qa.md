# B3-A/A2 — React Plan 요약·기존 개인 intent QA

2026-09-06. 최종 선정 자동 검사 **106/106 PASS**. 처음 재현한 요약 6 RED와 후속 planner 2 RED를 해결했다. 이 문서는 React 순수 함수·실제 저장 handler를 격리 메모리 storage에서 실행한 근거다. React 화면·브라우저 성공 안내·실기기 검증 완료를 뜻하지 않는다.

## 1. 수정 범위

- [editor-receipt.ts](../../../lib/flow/personal-workspace-poc-editor-receipt.ts): 저장 의미를 비교한 뒤 표시값을 축약한다. 긴 메모/순서와 짧은 제어문자/빈값의 표시 충돌은 `변경 전/후`를 붙여 구분한다. label은 제어문자를 표시용 공백으로 바꾸고 160자 안에서 필드 suffix와 surrogate pair를 보존한다.
- [plan-editor.ts](../../../lib/flow/personal-workspace-poc-plan-editor.ts): 검증된 열린 overlay의 **같은 필드·같은 exact override**만 보존한다. source가 나중에 같아졌더라도 무수정 title/memo/지원 section intent가 사라지지 않는다. 명시 inherit는 제거한다.
- [plan-text-intent.ts](../../../lib/flow/personal-workspace-poc-plan-text-intent.ts): planner와 summary가 공유하는 작은 무저장 값 계산 함수다. state/token/guard/I/O를 받거나 반환하지 않는다. 기존 memo resolver는 그대로 사용한다.
- 신규 검사 3파일: [원래 8+보강 6](../../../lib/flow/personal-workspace-poc-plan-summary-boundary.test.ts), [기존 title intent RED→GREEN 3](../../../lib/flow/personal-workspace-poc-plan-persisted-title-intent.red.test.ts), [captured intent 보강 7](../../../lib/flow/personal-workspace-poc-plan-captured-intent.test.ts).
- [A2 계약](./k3b-plan-summary-intent-contract.md)을 추가했다. app/Surface/standalone P·C·E2/생성 HTML, source·운영 writer, 저장 schema, 기존 receipt validator와 100-entry cap은 수정하지 않았다.

공개 summary의 `{changes, affectedRefs}` API는 같다. 가짜 guard를 만들지 않는다. summary/captured 값은 저장 권한이 아니다. 기존 실제 preflight의 whole guard·현재 revision/raw/state/source·참조 검사와 저장 handler가 최종 권한을 유지한다.

## 2. 재현과 해결

| 검사 | 수정 전 실제 결과 | 최종 |
| --- | --- | --- |
| R01/R02 원문 동값 Flow/Item 제목 새 override | planner no-op, 저장0인데 summary1; DTO에 그대로 넣으면 `invalid-noop-changes` | summary0, no-op receipt 정상 |
| R03 같은 날짜 fixed pin | target1/support4, schedule 변경1 | 유지 PASS |
| R04 같은 길이의 서로 다른 긴 memo | 저장 성공 뒤 summary0; `invalid-success-write-state` | exact 의미 변경1, 축약 전/후 구분 |
| R05 긴 order-only | 저장 성공 뒤 `219자 → 219자`, `invalid-success-changes` | 순열 변경1, 축약 전/후 구분 |
| R06/R07 CRLF·161자 source title | 저장 성공 뒤 `invalid-change-label` | 원본 유지, 표시 label만 안전하게 제한 |
| R08 100/101개 변경 | 둘 다 저장 성공. 100개 receipt 성공, 101개 `invalid-affected-refs` | 기존 엄격 cap 유지. 101개를 저장 금지 정책으로 바꾸지 않음 |
| R09–R14 | source-equal section, 짧은 표시 충돌, imported memo 부재/빈값/CRLF, source 비상속, explicit inherit, emoji label | 추가 6 PASS |
| I01/I02 원문 A→개인 B→원문도 B, 새 guard로 재오픈 | 무수정/다른 memo 저장에서 기존 Flow/Item title override 제거 | 기존 intent 유지. 무수정0변경, 다른 memo만1변경 |
| I03 같은 상태에서 명시 inherit | 두 title override 제거 | 기존 기대 유지 PASS |
| CI01–CI07 | Flow/Item/memo/지원 section의 보존·제거·새 동값·guard·raw-null | 추가 7 PASS |

R01/R02는 함수/DTO 계약의 재현이며 실제 화면에서 no-op receipt가 같은 방식으로 생성됐다는 주장이 아니다. R04–R07은 **저장 실패가 아니라 저장 뒤 요약/영수증 구성 실패**를 확인했다. 저장 권한을 summary0으로 판단하지 않아야 한다는 후속 UI gate는 유지된다.

## 3. 실행 수와 중간 실패

| 실행 | 결과 | 근거 |
| --- | --- | --- |
| 원래 신규 8, 수정 전 | 2 PASS / 6 RED | first8 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-summary-boundary-first8-20260906-01.log`), 전체 final8-02 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-summary-boundary-final8-20260906-02.log`) |
| 기존 summary·planner·memo-owner·receipt, 수정 전 | 82/82 PASS | before82 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-summary-existing-before-20260906-01.log`) |
| A1 요약 수정 + 원래8 | 90/90 PASS | green90 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-summary-green90-20260906-01.log`) |
| A1 + 추가 보강6 | 96/96 PASS | final96 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-summary-react-final96-20260906-01.log`) |
| 후속 기존 title intent, A2 전 | 1 PASS / 2 RED | intent RED3 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-summary-persisted-intent-final3-20260906-01.log`) |
| A2 첫 구현 | 93 PASS / 6 FAIL | first99 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-summary-intent-first99-20260906-01.log`). canonical JSON의 property 순서가 정상 authored validator와 충돌한 **제품 회귀**였음 |
| 실제 raw/검증된 currentState 보완 | 99/99 PASS | green99 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-summary-intent-green99-20260906-01.log`) |
| captured 보강7 | 7/7 PASS | first7 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-summary-captured-first7-20260906-01.log`) |
| 최종 선정 전체 | **106/106 PASS** | final106 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-summary-intent-final106-20260906-01.log`) |

최종 106은 기존82 + 원래8 + 표시 보강6 + intent3 + captured7이다. 반복 실행 수를 새 coverage로 합산하지 않았다. Node test runner의 중첩 검사도 실제 집계 수에 포함된다.

신규 하니스의 엄격 타입 오류는 최초 assertion narrowing 2곳, 후속 readonly fixture 할당 1곳이었으며 기대값을 바꾸지 않고 수정했다. 최종 `tsc --noEmit --strict --skipLibCheck --esModuleInterop --target ES2022 --module commonjs --moduleResolution node` 대상 6파일은 PASS. 오류 출력이 없는 첫 실행은 Tee-Object가 파일을 만들지 않았으므로, 재실행한 strict exit 기록 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-summary-intent-strict-status-20260906-01.json`)을 근거로 남겼다.

`plan-summary-boundary-final8-20260906-01.log`는 출력 파이프의 `Select-Object -First` 때문에 로그/exit 근거가 잘린 중간 실행이다. 최종 판정에 사용하지 않았다. `-02` 전체 실행의 exit1과 2 PASS/6 RED가 수정 전 최종 근거다.

## 4. 저장·원문 불변 근거

- 최종 R01–R14의 20 fixture: target `setItem` 14 + support `setItem/removeItem` 56 = **70 API 호출**. no-op 6 fixture는 0쓰기다. 원본 model, 열린 state, draft 입력, 운영 namespace sentinel exact 유지. 허용 prefix 밖 호출0, clear0.
- CI01은 실제 handler no-op 0쓰기. CI02는 실제 Plan 저장 + 기존 Undo 저장으로 **2 transaction, target2/support8**. 각 단계 reload 검증과 개인 overlay/ExecutionPlacement/완료 원복을 확인했다. CI07은 authored 초기 raw 부재에서 **target1/support4** 후 원래 source lineage와 원문을 유지했다.
- 위 신규 호출 근거만 합치면 target17/support68 = **85 API 호출**이다. 기존82의 별도 fixture 호출 수까지 포함한 전체 집계라고 주장하지 않는다. I01–I03은 pure preflight이며 저장 API0이다.
- 메모의 exact 빈 문자열·CRLF·공백과 source 설명/기존 개인 baseline/PoC override를 구분한다. 일정 same-date pin과 기존 완료·실행 날짜/시간은 그대로다.
- 실제 사용자 browser profile이나 운영 storage에는 접근하지 않았다. 이는 격리 fixture 기반 불변 증거다.

## 5. 해시·호환 경계

변경 전 정확 사본은 `output/poc-gap-implementation/k3b/before-plan-summary-react-20260906-01/`와 `before-plan-summary-intent-20260906-01/`에 보존했다. 기존 dirty를 지우거나 stage하지 않았다.

| 최종 파일 | SHA256 |
| --- | --- |
| plan-editor.ts | `B7E90EE067A168D1D0B90A2DF944976D8156A42054CFC3CC2099397F511FB8FA` |
| editor-receipt.ts | `7E6C8E70ABD1DB10303FF4E1B2AA3D5B1F69D8F2F9DB1B15B657DB76ADF4121F` |
| plan-text-intent.ts | `687C8E8EE47A26F75B44A83B867401B31E40527A714D067DCBE1C6EAC9FBFF1C` |
| plan-summary-boundary.test.ts | `F680455B0B4C84186380B41B83EBF91B035541D1D1E7A47F9F573486D7B28590` |
| plan-persisted-title-intent.red.test.ts | `DE6E7225CDB61EB4C83BFB080C294494706723DC92D1F8BB204A06BC24AC6528` |
| plan-captured-intent.test.ts | `3707F3C5F4AB379EFF58C79D3631402AE72C1DB4FF43039E30DBB2A3CB4409B9` |

최종106 시작/끝 해시 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-summary-intent-final106-hashes-20260906-01.log`)는 제품7파일이 동일함을 확인한다. source editor/source candidates/memo resolver/receipt validator는 이 작업에서 변경하지 않았다. 새 helper의 TypeScript type-only 의존은 실제 CommonJS transpile에서 제거됐고 runtime `require` 0이었다. planner와 summary가 같은 leaf helper를 읽으며 런타임 순환 의존을 추가하지 않았다.

직접 pure normalizer를 호출할 때 원래 raw가 없는 authored state라면 additive `capturedState`가 필요하다. live preflight/handler는 이를 항상 전달하고 whole state/canonical/raw/revision/source를 다시 대조한다. canonical bytes만으로 원문 객체의 property 순서를 재구성하지 않고 기존 authored validator를 유지한 선택이다.

## 6. 남은 통합 검사·게시 상태

이번 하위 작업의 논리 RED는 해소됐다. B3 Plan 성공 receipt의 same-attempt 연결, 100개 초과의 bounded presenter, source/creator lane과 명시 Undo, live/focus·실제 화면의 안내는 root의 후속 UI gate다. 여기서는 React 성공 handler·브라우저 동작 완료로 확대하지 않는다.

- 전체 `npm test`, production build, 브라우저/5 viewport: 이 하위 작업에서는 미실행. root가 통합 코드 기준으로 실행한다.
- Android Chrome / iOS Safari / 실제 보조기술: **NOT_RUN**. 관찰 사용자0.
- commit 없음 / push 없음 / PR 없음 / Preview 없음 / Production 없음.
- 내부 Markdown QA만 작성했다. Figma·화면 캡처·별도 HTML 보고서를 만들지 않았다. closeout/report 지침에 따라 검사·구현·운영/게시·사용자 증거를 분리했다.
- `docs:check` 최종 PASS: 필수 문서16, 로컬 링크6,069. 첫 실행의 strict 로그 링크1개는 위 실제 exit 기록으로 고쳤다. scoped `workflow:closeout`을 실행했고, 새 폴더가 상위 단위로 집계되는 한계와 별개로 실제 수정 전 사본 대조·신규 파일 경로를 확인했다.
