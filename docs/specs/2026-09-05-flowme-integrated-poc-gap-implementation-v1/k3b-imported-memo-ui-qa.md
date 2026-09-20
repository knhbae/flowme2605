# K3-B B0-M — 가져온 개인 메모의 읽기·편집 화면 연결 QA

2026-09-05. **이 묶음은 충족**이다. 신규 UI/읽기 검사16개를 포함한 focused69/69와 실제 브라우저9/9가 통과했다. 가져온 메모의 표시·직접 입력 초기값·상속 복귀를 고쳤으며, 준비 과정에서 발견한 PoC 읽기 모델의 공백·빈값 손실도 같은 소유권 범위에서 수정했다. 전체 K3-B나 세 산출물의 모든 요구가 완료됐다는 판정은 아니다.

## 1. 요구와 수정 범위

정본은 [K3-B 필드표·B0-M](./k3b-design.md), [선행 메모 owner QA §0·§6](./k3b-memo-owner-qa.md)다. 원문 설명, 기존 개인 메모, PoC 메모는 문자열이 같아도 다른 소유권이다. 기존 대화 전체를 새로 읽었다고 주장하지 않는다.

| 조건 | 실제 구현·확인 |
| --- | --- |
| imported-personal 메모 있음 | `기존 개인 메모 유지`와 실제 값 표시. 직접 입력으로 바꿀 때 그 값을 초기값으로 사용 |
| 기존 메모가 `''`, 공백, CRLF | 부재와 구분. `''`는 화면에 `(빈 메모)`, 나머지는 줄바꿈·공백 유지. 저장용 값을 trim하지 않음 |
| source 설명만 있고 개인 메모 부재 | 기존 `개인 메모 없음` 유지. 원문 설명을 초기 메모로 넣지 않음 |
| 현재 PoC override 있음 | 기존 메모로 덮어쓰지 않음. 명시 inherit는 PoC override만 제거하고 실제 기존 메모를 다시 표시 |
| Item → Plan | Item 반영은 journal까지0쓰기. Plan 저장은 target1회이며 journal/marker API는 별도 집계 |
| source·실행 owner | 원문 설명·완료 기준은 읽기 전용. 실행 날짜/시간·완료·TimelineOrder와 다른 저장 사본은 변경하지 않음 |

`PersonalWorkspacePocEditorSourceSummary.inheritedPersonalMemo?: string`은 **표시 prop**이다. 운영 schema나 저장 필드가 아니다. Surface가 원래 source Item의 `getPersonalWorkspacePocInheritedMemo()`만 전달하며, 유효 PoC 메모나 source 설명으로 baseline을 추정하지 않는다. React 검토 기준에 따라 새 effect·state·listener·writer를 만들지 않았다.

## 2. 수정 전 실패와 fixture 오류를 구별한 기록

| 실제 실행 | PASS / FAIL | 해석 |
| --- | ---: | --- |
| UI 신규8 RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/imported-memo-ui-red-20260905.tap`) | 1 / 7 | imported 표시·초기값·inherit·producer 누락. source-only 부재 경로는 통과 |
| UI 연결 후 focused38 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/imported-memo-ui-green-20260905.tap`) | 38 / 0 | 새 표시8 + 기존 Editor8 + 선행 memo16 + receipt6 |
| 읽기 fixture 첫5 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/imported-memo-read-red-20260905.tap`) | 0 / 5 | **하니스**: Map `userMemo:''`는 기존 strict 계약상 잘못된 입력. 제품 손실 근거로 사용하지 않음 |
| fixture 정정5 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/imported-memo-read-red-valid-fixture-20260905.tap`) | 0 / 5 | 네 origin에서 실제 memo 손실. strict Map 1개는 `userLabel` 누락 하니스 |
| strict label 정정5 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/imported-memo-read-red-final-20260905.tap`) | 0 / 5 | 네 origin 실제 손실. strict Map은 padded userMemo의 기존 snapshot/persistence pair 불일치 차단 |
| 유효한5 RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/imported-memo-read-red-valid5-20260905.tap`) | 0 / 5 | 네 origin + strict Map 모두 정상 파싱 후 빈값 owner 소실·공백 제거를 실제 재현 |
| 확장8 첫 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/imported-memo-read-red-extended8-20260905.tap`) | 1 / 7 | 실제 손실6 + structural fixture의 source title eligibility 오류1. 잘못된 Map 형식 차단1 PASS |
| 확장8 유효 RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/imported-memo-read-red-final8-20260905.tap`) | 1 / 7 | 네 origin·strict Map·user-created 구조메모·date-scoped 빈 메모의 실제 손실7 |
| 첫 읽기 수정 합동69 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/imported-memo-read-green-20260905.tap`) | 68 / 1 | Map snapshot 파서 이전의 양끝공백 손실1이 남아 exact raw 회수 보완 |
| 읽기 보완 합동69 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/imported-memo-read-green-final-20260905.tap`) | 69 / 0 | 제품 수정 후 통과 |
| 최종 타입 정정 포함 합동69 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/imported-memo-focused-final-20260905.tap`) | 69 / 0 | 현재 파일 기준 재실행. 앞선69에 더해 고유138개로 세지 않음 |

신규 고유 등록은 **UI8 + raw 읽기8 =16개**, 마지막 합동은 기존53개를 포함한69개다. 내부 문자열 배열/반복 실행/fixture 정정은 별도 고유 케이스로 더하지 않는다. 순수 검사는 source/입력 전후 JSON과 read-only storage를 검사했으며 브라우저 운영 저장소 실측을 대신하지 않는다.

targeted strict TS 최초 실행은 테스트 저장소 객체의 excess-property 타입2건과 `resolveJsonModule` 옵션 누락으로 실패했다. 객체를 별도 변수로 두어 감사 메서드를 유지하고 옵션을 명시한 최종 strict 명령 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/imported-memo-read-typecheck-final-20260905.log`)은 exit0이다. 제품 기능 오류나 assertion 완화로 처리하지 않았다.

### 읽기 보완의 경계

- regular 경로는 검증된 Map userMemo → item draft memo 순서를 유지하면서 string의 존재와 정확 값을 읽는다. 빈 개인 값 때문에 원문 설명으로 되돌아가지 않는다.
- personal-draft 경로는 운영 projection의 표시용 trim 결과 대신 검증된 원래 item draft/structural user memo를 읽는다. user-created Item의 exact ID로만 연결한다.
- Map snapshot·structural payload의 원래 메모는 **기존 strict 검증 후에만** 회수한다. raw 객체나 저장소를 고치지 않는다. Map snapshot/persistence pair 검사는 회수 전에 그대로 실행한다.
- Map 자체 `userMemo`의 빈값/공백은 기존 strict parser가 거부한다. 이를 새 허용 schema로 바꾸지 않았다. 해당 origin에서 빈 개인 메모는 기존에 허용되는 item-draft memo owner로 검사했다. strict Map의 padded CRLF도 유효 item-draft 경로를 사용했다. 기존 pair 불일치가 있으면 UI를 열지 않고 fail-closed하는 계약은 유지한다.

## 3. 실제 브라우저 9개

새 spec (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3b-imported-memo-ui.spec.ts`)의 첫 실제 실행이 **9/9 PASS**다. JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/imported-memo-ui-browser-first-20260905.json`), 명령 출력 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/imported-memo-ui-browser-first-20260905.log`). 실행 시작 `2026-09-05T10:24:46.783Z`, 64.1초, skipped/flaky/unexpected0. `--list`9는 실행 수에 더하지 않았다.

환경은 Windows Chrome 자동화, 로컬 production3182, BUILD_ID `9e2zGbmnw8GAfNPQqXXl1`이다. 단일 HTML/모바일 실제 기기 검사가 아니다.

| 등록 시나리오 | 결과 |
| --- | --- |
| source-backed-map lifecycle | PASS |
| personal-draft lifecycle | PASS |
| canonical-personal-copy lifecycle | PASS |
| legacy-saved-plan lifecycle | PASS |
| 390×844 개인 메모 읽기·키보드·행동 | PASS |
| 375×812 개인 메모 읽기·키보드·행동 | PASS |
| 844×390 개인 메모 읽기·키보드·행동 | PASS |
| 1024×768 개인 메모 읽기·키보드·행동 | PASS |
| 1440×900 개인 메모 읽기·키보드·행동 | PASS |

각 origin lifecycle은 CRLF·빈값·공백·원문과 같은 값·부재의5개 Item을 읽고 직접 입력 초기값/취소0쓰기를 확인한다. 첫 Item에 source 설명과 같은 **별도 개인 메모**를 입력하여 child 반영0 → Plan 저장 target1 → reload0 → inherit → child0 → Plan 저장 target1 → Undo → reload0을 검사한다. inherited label·source 설명/기준·정확 ref·receipt before/after owner도 확인한다. user-created structural Item과 strict persistence Map의 직접 UI lifecycle은 이9개에 포함하지 않으며 순수8개 근거와 분리한다.

브라우저 `textarea.value`는 CRLF를 LF로 정규화한다. 해당 DOM 기대값은 이 표준 동작을 명시하고, controlled prop/원래 운영 raw/기존 개인 baseline의 CRLF는 별도의 정확 비교로 검증했다. DOM 값이 CRLF bytes를 그대로 가진다고 보고하지 않는다.

## 4. 저장·운영 데이터 불변 증거

9개의 `imported-memo-boundary` 첨부를 JSON에서 집계했다. **API60 = setItem36 + removeItem24**, clear0이다. state target set12는 네 origin 각각 Plan 저장2회+Undo1회다. recovery/commit-marker API48은 준비·확정·정리 비용이며 target12에 숨겨 합산하지 않는다. viewport5 context는 각각 API0이다.

관측 key는 정확히 `flow:poc:personal-workspace:v1:state`, `…:editor-storage-recovery:v1`, `…:editor-storage-commit-marker:v1` 세 개다. prefix 밖 호출0, console/page error0. 한 context당 bundle registry·saved 기록·Map·item-draft·sentinel8개, 총72개 key/value 전후 직접 비교 및 SHA256 불일치0이다. 최초 격리 fixture 설치는 감사 시작 전에 한 번만 수행하며 reload에서 재주입하지 않는다. 실행 날짜/시간 placements·completion·TimelineOrder·authoredFlows 전후 불변도 검사했다.

이 증거는 자동화가 만든 독립 context의 fixture다. 실제 사용자의 Chrome profile이나 운영 서버 데이터를 열어 확인한 결과가 아니다. `flow:*` 외 bundle registry도 비교했으나 기존 기본 `/my`의 전체 동작이나 다른 운영 route까지 새로 통과했다고 확대하지 않는다.

## 5. 다섯 화면 평가

아래 PNG10개를 모두 직접 확인했다. 긴 공백 없는 token은 baseline 안에서 줄바꿈되고 가로 잘림이 없었다. textarea·반영·돌아가기의 전체 사각형과 각각9점 hit, 문서 overflow0을 실제 검사했다. 캡처는 `fullPage:false`이며 전후 source/state/mode가 유지된다. 각 컨트롤로 스크롤하여 검사했으므로 모든 정보가 동시에 보인다는 뜻은 아니다.

| 크기 | 실제 관찰 | 새 캡처 |
| --- | --- | --- |
| 390×844 | baseline 마지막 줄 확인. textarea는 내부 스크롤, 고정 반영 버튼 접근 가능 | 상속 (로컬 전용 근거: `../../../output/playwright/k3b-imported-memo-ui-first-20260905/personal-workspace-k3b-imp-f9072--edit-and-unclipped-actions/imported-baseline-390x844.png`) · 입력 (로컬 전용 근거: `../../../output/playwright/k3b-imported-memo-ui-first-20260905/personal-workspace-k3b-imp-f9072--edit-and-unclipped-actions/imported-input-390x844.png`) |
| 375×812 | 긴 토큰이 좁은 폭 안에서 감김. 입력·반영 버튼 전체 접근 | 상속 (로컬 전용 근거: `../../../output/playwright/k3b-imported-memo-ui-first-20260905/personal-workspace-k3b-imp-508d8--edit-and-unclipped-actions/imported-baseline-375x812.png`) · 입력 (로컬 전용 근거: `../../../output/playwright/k3b-imported-memo-ui-first-20260905/personal-workspace-k3b-imp-508d8--edit-and-unclipped-actions/imported-input-375x812.png`) |
| 844×390 | 본문 내부 스크롤이 짧음. mode·메모·CTA는 접근하나 스크롤 위치에 따라 필드 제목은 위로 이동. 전문 동시 노출은 아님 | 상속 (로컬 전용 근거: `../../../output/playwright/k3b-imported-memo-ui-first-20260905/personal-workspace-k3b-imp-ea87c--edit-and-unclipped-actions/imported-baseline-844x390.png`) · 입력 (로컬 전용 근거: `../../../output/playwright/k3b-imported-memo-ui-first-20260905/personal-workspace-k3b-imp-ea87c--edit-and-unclipped-actions/imported-input-844x390.png`) |
| 1024×768 | 우측 편집 sheet 안에 baseline·계획 날짜·입력 표시. 주변 배경과 writer 분리 | 상속 (로컬 전용 근거: `../../../output/playwright/k3b-imported-memo-ui-first-20260905/personal-workspace-k3b-imp-0922c--edit-and-unclipped-actions/imported-baseline-1024x768.png`) · 입력 (로컬 전용 근거: `../../../output/playwright/k3b-imported-memo-ui-first-20260905/personal-workspace-k3b-imp-0922c--edit-and-unclipped-actions/imported-input-1024x768.png`) |
| 1440×900 | source 설명/완료 기준 영역과 개인 메모 영역 분리 확인. 긴 textarea는 내부 스크롤 | 상속 (로컬 전용 근거: `../../../output/playwright/k3b-imported-memo-ui-first-20260905/personal-workspace-k3b-imp-9451d--edit-and-unclipped-actions/imported-baseline-1440x900.png`) · 입력 (로컬 전용 근거: `../../../output/playwright/k3b-imported-memo-ui-first-20260905/personal-workspace-k3b-imp-9451d--edit-and-unclipped-actions/imported-input-1440x900.png`) |

기존 cobalt 색·일반 편집 화면의 밀도·모든 정보의 최적 배치까지 이번에 개선했다고 주장하지 않는다. 실패/retry/가상 키보드/보조기술의 메모 viewport 여정은 이9개에서 미실행이다.

## 6. 변경 파일·검증 버전

| 파일 | 수정 전 → 현재 SHA256 |
| --- | --- |
| [EditorSurface](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocEditorSurface.tsx) | `D1CEC4616C238DB00C58E6714EDB8DD8662A167A423FD41BAAB5130FA45CF4A8` → `09B66424195EEF63CD83277B449229DA9F7E5FEC1E0563B8D5ABBE0330D1306F` |
| [Surface](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx) — helper import/producer2줄만 | `953991F1F0A5D6F29DC0E9B1FB2BD96BE674DB48A427432CFB01B6F06EC108A0` → `CD1CAAB49C21A46C5C3FA43243FAFC28924E98D9BA59140725100634641E74DF` |
| [PoC read-model](../../../lib/flow/personal-workspace-poc-read-model.ts) | `CFFF8D9EFED49E5F41FDC6CADF3120E0F7746E99EE6BC531C9409451C6CC3F34` → `FDEADF37B9FED784A7214ED389DAF442724459EB14190ECF9F99C3339A8D6FCD` |

세 파일은 수정 직전 before-imported-memo-ui (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-imported-memo-ui/lib/flow/personal-workspace-poc-read-model.ts`)의 같은 상대경로에 exact 복사했다. 기존 dirty 전체를 소유로 돌리지 않았다. 새 파일은 [UI test8](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocEditorMemoPresentation.test.tsx), [raw 읽기 test8](../../../lib/flow/personal-workspace-poc-imported-memo-read.test.ts), [공유 fixture](../../../tests/fixtures/personal-workspace-k3b-imported-memo.ts), browser9 spec (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3b-imported-memo-ui.spec.ts`), 이 문서다. 기존 EditorSurface test는 수정하지 않았다.

main이 실행한 같은 후보의 npm test (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/npm-test-imported-memo-2026-09-05T10-21-12-954Z.json`)는 15그룹2250/2250, production build (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/production-build-imported-memo-2026-09-05T10-21-01-979Z.json`)는 exit0이다. 이 하위 작업이 별도로 실행한 것처럼 중복 기록하지 않는다. 신규16개는 package.json의 명시 npm test 목록에 아직 없으므로 위 focused69 실행을 별도로 유지해야 한다. npm2250+focused69를 중복 없는2319개로 합산하지 않는다.

## 7. 남은 범위와 공개 상태

남은 범위는 standalone의 전체 Plan 필드 동등성, K3-B 나머지 영수증/순서/모드 구현, strict Map·user-created 구조의 직접 UI lifecycle, 메모 저장 fault와 실제 보조기술 검사다. read-model 손상 검사와 기존 회귀가 있다는 이유로 이 미실행 여정을 통과 처리하지 않는다. 과거 데이터 추정 복구·운영 migration·source 역수정은 하지 않았다.

실제 Android Chrome/iOS Safari, 실제 OS IME·가상 키보드·보조기술: NOT_RUN. 관찰 사용자0명. commit/push/PR/Preview/Production 모두 진행하지 않았다. Flow 보고서 스킬은 현재 근거·과거 RED·미실행을 구분하는 데 사용했고, 승인된 Markdown QA만 만들었다. docs:check 최종 PASS(required16, local links5330). 최초에는 출력 없는 strict TS 성공 명령의 로그 파일이 생성되지 않아 링크1개가 실패했으며, strict 명령을 실제 재실행해 exit0 기록을 남긴 뒤 다시 검사했다. 최종 로그는 output/poc-gap-implementation/k3b/imported-memo-ui-docs-check-final-20260905.log다.
