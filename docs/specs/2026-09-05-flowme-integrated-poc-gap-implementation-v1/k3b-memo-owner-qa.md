# K3-B B0-M — 개인 메모 소유권 RED와 최소 수정 QA

## 0. 후속 실제 화면 연결 검사

아래 순수 검사 기록 이후 root가 새 브라우저 3개 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3b-memo-owner.spec.ts`)를 실행해 **3/3 PASS**를 확인했다. 대상은 production `390YwuyeGl-p60RBX-eLr`, 로컬3182, Windows Chrome/390×844다. 실행 JSON (로컬 전용 근거: `../../../output/playwright/k3b-memo-owner-initial-20260905-01.json`), 명령·종료 기록 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/memo-owner-browser-initial-2026-09-05T09-31-19-533Z.json`)을 보존했다.

| 실제 시나리오 | 결과 |
| --- | --- |
| 원문 설명과 같은 문장을 개인 메모로 입력 → Item 반영 → Plan 저장 → reload → 다시 열기 | PASS. Item 반영·reload는0쓰기. source 설명과 별도로 override 유지. 영수증 before는 개인 메모 없음 |
| 이미 저장된 source-equal 메모에서 Flow 제목만 변경 → 저장 → Undo | PASS. 메모를 정규화로 제거하지 않으며 영수증에 가짜 메모 변경이 없음 |
| 기존 메모에서 빈 문자열 override 저장·Undo, inherit 저장·Undo | PASS. 빈 값과 override 부재를 구분하며 각각 이전 메모로 복구 |

격리 context3개, 실제 API35회(setItem21/removeItem14), prefix 밖/clear0, console/page error0이다. 성공 Plan 저장마다 state target1회를 별도 확인했고 journal 쓰기/정리를 합쳐1회로 축소하지 않았다. 세 context 모두 원문 authoredFlows·실행 날짜/시간 placement·완료·TimelineOrder가 전후 동일하며 공백·CRLF·emoji를 포함한 운영 sentinel bytes도 동일하다. fixture는 fresh context에 최초1회만 설치하여 reload 때 성공 상태를 덮어쓰지 않았다. 실제 사용자 저장소를 열어 검사한 것은 아니다.

이는 authored Flow의 메모 연결 범위다. imported-personal baseline은 아래 pure검사에서 확인했으나 UI의 `개인 메모 없음` 고정 문구는 후속 B3에서 고쳐야 한다. 네 origin·다섯 viewport 전체 편집 동등성, 실제 기기·보조기술 검사는 미실행이며 관찰 사용자0이다. 전체 K3-B 완료로 판정하지 않는다.

## 이전 순수 모델 검사 기록

2026-09-05. 범위는 [K3-B 설계 §3 B0-M](./k3b-design.md)의 React 순수 Plan 정규화·변경 요약이다. 최종 focused **62/62 PASS**다. 신규 메모 검사 16개와 기존 회귀 46개이며, 브라우저·전체 빌드·운영 데이터 실측 결과가 아니다. standalone 편집 동등성과 B0-T 원문 시간은 완료하지 않았다.

## 1. 원래 요구와 기대값 검토

개발1 편집 계약 (로컬 전용 근거: `../../../../flow-mvp/docs/specs/2026-08-12-my-plan-edit-lifecycle-unification/spec.md`), [Stage 3](../2026-09-02-flowme-integrated-poc-gap-closure-v1/stage-3-contract.md), [P3-J 원문 상세 계약](../2026-09-05-flowme-integrated-poc-execution-detail-gap-v1/spec.md)을 기준으로 원문 설명·기존 개인 메모·PoC 개인 메모를 구별했다. Item 반영은 부모 초안만 바꾸고, 최종 Plan 저장의 원문·실행 배치는 그대로다. 원본 대화를 이번 B0-M에서 추가 조회했다고 주장하지 않는다.

| 조건 | 유지해야 하는 의미 | 이번 판정 |
|---|---|---|
| 원문 설명만 있고 개인 메모 없음 | 설명을 개인 메모 기본값으로 사용하지 않음 | 충족 |
| 사용자가 원문 설명과 같은 글을 개인 메모로 명시 입력 | 문자열이 같아도 PoC 메모가 생김 | 정규화 결함 수정 |
| 기존 PoC 메모가 원문 설명과 같고 Flow 제목만 변경 | 메모와 개인 소유권 유지 | 정규화 결함 수정 |
| imported-personal 메모가 있고 동일 문자열 입력 | 이미 같은 개인 메모가 남으면 semantic no-op 허용 | 기존 의미 유지 |
| `inherit` | PoC override만 제거하고 실제 imported-personal 메모 또는 메모 없음으로 복귀 | 기존 값 유지·요약 수정 |
| 명시 `''` | 기존 개인 메모를 지우는 값. source 설명을 지우지 않음 | 기존 의미 유지 |
| 빈 문자열·공백·CRLF인 기존 개인 baseline | 원래 값을 정확히 읽음. 표시용 trim을 정규화에 사용하지 않음 | helper 검사 통과 |

M10은 ‘기존 개인 메모와 같은 값도 반드시 새 PoC owner로 저장’이라는 요구를 만들지 않았다. 반대로 M02는 원문 설명과 같다는 이유로 개인 메모를 없애면 안 된다. 이 둘을 구분한 기대값을 main과 상호 검토한 뒤 수정했다.

## 2. 수정 전 실제 실패와 원인

신규 13개를 실제 등록·실행했고 **9 PASS / 4 FAIL**이었다. 두 번째 실행은 같은 기대값에 후보 상태·요약 진단만 추가했다. fixture 초기화·하니스 오류나 skip/xfail은 없었다. 최초 RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/memo-owner-red-first-20260905.tap`), 진단 포함 RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/memo-owner-red-final-20260905.tap`)를 보존했다.

| ID | 실제 RED | 수정 후 같은 검사 |
|---|---|---|
| M02 명시 동일문자 메모 | `kind:no-op`, 후보 memo 없음, effective owner `authoring` | `kind:change`, 정확 memo, `poc-personal` |
| M03 다른 필드만 변경 | 기존 memo가 후보에서 없어짐. owner `poc-personal → authoring` | memo와 `poc-personal` 유지 |
| M06 첫 메모의 before 요약 | 실제 개인 memo는 없는데 `원본 · 안내문을 읽고 접수한다` | `개인 메모 없음` |
| M07 inherit의 after 요약 | 실제 개인 memo는 없는데 같은 원문 설명을 after로 표시 | `개인 메모 없음` |

`normalizePersonalWorkspacePocPlanOverlay`가 `textOverrideValue(draft.memo, source.description)`를 호출한 것이 M02/M03의 원인이다. 요약 함수 역시 상속 메모를 `source.description`으로 표시했다. 개인 메모의 읽기 투영은 이미 원문 설명과 분리되어 있어 정규화·요약과 서로 다른 값을 보여 줬다.

수정 전 기존 Plan·receipt·item-details 23개는 모두 통과했다(기존 baseline (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/memo-owner-existing-baseline-20260905.tap`)). 따라서 기존 green만으로 이 결함을 배제할 수 없었다. 기존 receipt fixture는 ownership이 없는 source-only Item이면서 `원본 메모`라는 설명을 개인 메모처럼 기대했다. 그 두 기대값만 소유권에 맞게 고쳤으며 title/date/section/order 기대는 바꾸지 않았다.

여기서 재현한 것은 **실제 순수 preflight가 만드는 후보의 메모 유실**이다. 이 문서만으로 실제 사용자 저장 데이터가 손실됐거나 브라우저에서 저장·reload까지 검증했다고 말하지 않는다.

## 3. 변경 파일과 경계

| 파일 | 변경 |
|---|---|
| [plan-memo-baseline.ts](../../../lib/flow/personal-workspace-poc-plan-memo-baseline.ts) | 신규 읽기 함수 `getPersonalWorkspacePocInheritedMemo(item)`. 기존 description.existingPersonal의 owner가 `existing-personal`이고 string인 값만 정확히 반환 |
| [plan-editor.ts](../../../lib/flow/personal-workspace-poc-plan-editor.ts) | 메모의 상속 비교값만 공통 함수로 교체. title/date 정규화·commit writer 변경 없음 |
| [editor-receipt.ts](../../../lib/flow/personal-workspace-poc-editor-receipt.ts) | 같은 baseline 사용. 상속 개인 메모 없으면 `개인 메모 없음`, 있으면 `기존 개인 메모 · 값`; 명시 입력은 기존 `내 계획 · 값` 유지 |
| [plan-memo-owner.test.ts](../../../lib/flow/personal-workspace-poc-plan-memo-owner.test.ts) | 신규 16개. 기존 4 RED 유지 후 raw 보존·missing owner·이미 합성된 PoC owner 검사 추가 |
| [editor-receipt.test.ts](../../../lib/flow/personal-workspace-poc-editor-receipt.test.ts) | source-only before/after 기대 2줄 수정 |
| 이 QA 문서 | 실행 기록·기대값 검토·원본 백업·남은 검증 |

기존 memo baseline helper를 검색했으나 없었다. `getPersonalWorkspacePocItemDetails`는 표시용으로 빈값·공백을 생략하므로 저장 정규화에 재사용하지 않았다. 새 owner/schema 모델을 만들지 않고 기존 fieldOwnership의 한 계층을 읽는 함수만 공유한다. 현재 effective PoC memo나 source 설명을 inherited baseline으로 승격하지 않는다. 옛 payload에 ownership이 없으면 알려진 개인 메모 없음으로 읽고, origin 이름이나 문자열에서 과거 개인 소유권을 추정하지 않는다.

React Surface·standalone app/model·writer·schema·기존 저장 key·generated HTML·시간 관련 코드는 수정하지 않았다. 손실 상태를 자동 복구하거나 기존 사용자의 메모를 추정 생성하는 migration도 없다.

## 4. 검사 목록과 실제 실행 수

| 신규 ID | 검사 | 최종 |
|---|---|---|
| M01 | source-only 설명과 개인 memo 부재 분리 | PASS |
| M02 | 원문과 같은 명시 memo 생성 | PASS |
| M03 | 제목만 바꿔도 저장된 동일문자 memo 유지 | PASS |
| M04 | 기존 PoC memo의 명시 빈값 지우기 | PASS |
| M05 | source-only inherit에서 memo만 제거 | PASS |
| M06 | 첫 memo receipt before가 실제 부재와 일치 | PASS |
| M07 | inherit receipt after가 실제 부재와 일치 | PASS |
| M08 | imported memo와 source 설명 분리 | PASS |
| M09 | inherit가 imported memo 복원 | PASS |
| M10 | 같은 imported memo 입력은 no-op 허용 | PASS |
| M11 | 빈 PoC memo가 imported memo만 지움 | PASS |
| M12 | imported와 다른 source-equal memo는 PoC 값으로 유지 | PASS |
| M13 | inherit 요약이 실제 imported memo·owner 표시 | PASS |
| M14 | 빈값·공백·CRLF·원문동일 값의 정확 baseline 읽기 | PASS |
| M15 | ownership 부재/source-only/값 부재에서 추정 안 함 | PASS |
| M16 | PoC effective 값이 합성되어도 imported baseline 그대로 | PASS |

M14의 내부 문자열 fixture 5개는 등록 테스트 5개로 더하지 않는다. 신규 fixture는 실제 authoring materializer가 만든 source-only Flow와 타입·실제 Plan open guard를 통과한 canonical-personal-copy fixture다. 후자는 운영 사용자 데이터를 채집한 사례가 아니다. 별도 기존 read-model 회귀는 네 origin의 실제 adapter와 imported memo 투영을 검사한다.

| 실행 순서 | 등록·실행 수 | PASS / FAIL | 로그 |
|---|---:|---:|---|
| 최초 RED | 13 | 9 / 4 | red-first (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/memo-owner-red-first-20260905.tap`) |
| 진단 추가 RED | 13 | 9 / 4 | red-final (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/memo-owner-red-final-20260905.tap`) |
| 수정 전 기존 baseline | 23 | 23 / 0 | existing-baseline (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/memo-owner-existing-baseline-20260905.tap`) |
| helper만 추가, consumer 미연결 | 16 | 12 / 4 | helper-only (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/memo-owner-helper-only-20260905.tap`) |
| 최소 연결 뒤 신규+기존 | 39 | 39 / 0 | green-first (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/memo-owner-green-first-20260905.tap`) |
| read-model·composition 기존 회귀 | 23 | 23 / 0 | read-projection-regression (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/memo-owner-read-projection-regression-20260905.tap`) |
| owner 문구 정확 비교 강화 뒤 최종 합동 | 62 | 62 / 0 | green-final (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/memo-owner-green-final-20260905.tap`) |

최종 고유 등록 케이스는 **62개**다: 신규16 + Plan14 + receipt6 + item-details3 + read-model18 + composition5. 반복을 포함한 실행 합계는 189회(177 PASS / 12 FAIL)이며, 앞의 12회 실패는 동일한 네 결함을 수정 전에 세 번 실행한 기록이다. 이 누적 수를 고유 검증 범위로 쓰지 않는다. 모든 실행의 skipped/cancelled/todo는 0이다.

실제 실행 명령은 `tsx --test --test-reporter=spec --test-reporter-destination=stdout --test-reporter=tap --test-reporter-destination=<위 TAP 경로>`에 해당 `.test.ts`를 직접 나열했다. 최종 명령은 위 여섯 테스트 파일이다. TAP은 Node reporter가 생성한 실행 출력이며 수작업 결과표로 대체하지 않았다.

Targeted strict TypeScript 검사는 `tsc --noEmit --strict --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck`로 실행했다. 전체 `npm test`와 production build·서버 실행은 main 담당이며 이 하위 작업에서는 실행하지 않았다. 새 테스트 파일은 이 QA 작성 시점 package.json의 명시 npm test 목록에 자동 포함되지 않으므로 main에 별도 focused 실행/등록 필요를 전달했다.

## 5. 불변 증거와 한계

신규 preflight 검사마다 입력 fixture를 JSON 문자열로 전후 비교하고, 후보의 `placements`, `completions`, `authoredFlows`를 원래 state와 대조한다. 설명·완료 기준은 detail projection에서 별도로 확인한다. 이 순수 검사에는 Storage/DOM adapter를 넘기지 않아 새 helper·normalize·summary의 저장 호출은 없다. 기존 Plan 검사는 staged Item의 0쓰기와 최종 Plan의 전용 state revision/Undo를 검사한다. **운영 `flow:*` key/value 전후 실측이나 브라우저 storage 감사가 이번에 실행된 것은 아니다.**

기존 세 파일은 수정 전에 Git clean을 확인하고 before-memo-owner 백업 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-memo-owner/lib/flow/personal-workspace-poc-plan-editor.ts`)에 동일 상대경로로 각각 복사했다. 기존 백업이 있으면 중단하도록 검사했으며 원본/백업 SHA256이 각각 같았다. 병렬 K3-A 변경은 이 작업 소유로 집계하지 않는다.

| 파일 | 수정 전 SHA256 | 수정 후 SHA256 |
|---|---|---|
| plan-editor.ts | `1874CF0F7A8F40D65D10712CF3A42525E887340F72ABC9B9DF0FA499CD3B9417` | `64FFBC4D91469586B7ECFA4253C3AE5A29F64BA6454728E446FA5463841317C5` |
| editor-receipt.ts | `022F324AD26F8DF63DE201DF158130F66B23982ADDD4E75A0C7A8D063FDF488F` | `5FAABE99E4F218B170FD5673B3C3550C324FD95423286A4DEA5ECC529F0AD716` |
| editor-receipt.test.ts | `2E54202FEEB50FB601C8EE99CC0564E42FB294969EBB7B0EA778353C0DCFBF6F` | `AB586FA8BF8FBFB83C2648AA812307CBA8E07874055B386DCE119587CFC07E6B` |
| 새 memo-baseline.ts | 없음 | `7922F7D7D13BA82081E815DA1BEBB1D1A6E2A414F8E78C0E0356E93D514F76F7` |
| 새 memo-owner.test.ts 최종본 | 없음 | `C987262D22187FD36AC417CA873FD04F47ECE3FA8834EEA8D0C3DCC12142D14A` |

HEAD는 `6e4b44fe2f61b7086b8bbc61c30b5aa39dd4390e`다. targeted strict TS는 최초 RED 단계·최소 연결 뒤·최종 기대값 강화 뒤 총 3회 실행해 모두 PASS했다. `npm.cmd run docs:check` PASS(required files 16, local links 5,123). `workflow:closeout -- --scope=<위 여섯 경로>`는 exit0이며 코드/test 5경로를 감지했다. 새 문서는 직접 존재·내용·해시를 확인한다. closeout은 권장 npm test/build를 대신 실행하거나 인증하지 않는다.

## 6. 다음 확인과 B0-T 준비만 남긴 내용

다음 실제 브라우저 검사는 원문 동일 memo 입력→Plan 저장→상세/요약 확인→reload, 제목만 추가 변경 뒤 memo 유지, 명시 빈값·inherit·Undo를 같은 Flow에서 확인해야 한다. imported baseline의 inherit UI 문구는 기존 React 폼에서 아직 일괄 `개인 메모 없음`이므로 실제 baseline이 있는 경로의 표시 개선은 후속 UI 범위다. 이번 core 수정으로 두 runtime Plan 필드 동등성이나 K3-B 전체 완료를 선언하지 않는다.

B0-T는 [기존 원문 시간 RED](./k2c-found-k3b-source-time.md)와 별도 브라우저 테스트 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k2c-react-source-time-gap.spec.ts`)를 읽은 설계 준비만 했다. `resolveResultSource`의 raw fingerprint·정확 tuple·sourceLine map·parsed snapshot 검증을 공유하는 **저장 없는 typed source attribute reader**를 후보로 둔다. 개인 순서/제목을 합성하기 전의 source로 ref map을 만들고 Task/Result가 함께 소비해야 한다. 시간 우선순위는 기존 result의 유효 placement.time → 검증된 source time이며, `sourceTimingLabel`을 파싱하거나 unscheduled를 새 시간 삭제 mode로 정의하지 않는다. 코드·schema·저장·새 시험 실행은 0이다.

이번 브라우저 화면별 평가: NOT_RUN. 실제 Android Chrome·iOS Safari·가상 키보드·보조기술: NOT_RUN. 관찰 사용자 0명. commit, push, PR, Preview, Production 모두 진행하지 않았다. `flow-work-closeout`은 scoped diff/검증·배포 상태 분리에, `flow-report-artifact`는 지정된 Markdown QA에 현재 실행과 과거 근거·미실행을 분리하는 데 적용했다. 새 HTML이나 공용 보고서는 만들거나 교체하지 않았다.
