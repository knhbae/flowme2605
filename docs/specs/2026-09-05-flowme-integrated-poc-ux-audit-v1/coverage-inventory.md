# P3-K 요구사항 전체 목록과 과거 증거 분리

- 작성일: 2026-09-05
- 작업 범위: 생성된 요구 추적 HTML의 전체 목록을 추출해 보존하는 읽기 감사
- 상세 원장: [coverage-inventory.json](./coverage-inventory.json)
- 원본: 요구 추적 HTML (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-ko.html`)의 `script#trace-data`
- 원본 SHA-256: `512fe46dd8f8d39fbeb4eb7987408c504307f4f2139135987d07610bcd35909b`
- 기준 HEAD: `6e4b44fe2f61b7086b8bbc61c30b5aa39dd4390e`
- 새 제품 검사 실행: 0. 이 파일은 목록 추출·개수·ID 참조 검사를 기록한다. 제품 동작이나 UX의 현재 판정을 새로 내리지 않는다.

## 1. 세 원본과 통합 연결을 빠짐없이 보존한다

| 출처 | 부모 요구 | 하위 조건이 있는 부모 | 하위 조건이 없는 부모 | 하위 관찰 조건 |
| --- | ---: | ---: | ---: | ---: |
| v4.1 개인공간 — V41 | 78 | 22 | 56 | 89 |
| 개발1 편집·실행 — D1 | 26 | 11 | 15 | 59 |
| 개발2 Text Authoring — D2 | 64 | 22 | 42 | 121 |
| 세 원본 소계 | 168 | 55 | 113 | 269 |
| 통합 blueprint·연결 계약 — BP | 86 | 29 | 57 | 155 |
| 전체 | 254 | 84 | 170 | 424 |

부모와 하위 조건은 서로 다른 깊이다. `254 + 424 = 678`은 원장의 레코드 수이지, 독립 요구사항 678개 또는 구현 완료율의 분모가 아니다. 하위 조건 424개와 하위 조건이 없는 부모 170개를 합친 594개는 중복 없이 목록을 탐색하기 위한 말단 단위다. 이를 새로 승인된 제품 범위라고 부르지 않는다.

모든 부모 ID와 하위 ID를 JSON에 보존했다. 부모에는 원문 제목·기대 동작·출처·기존 결정·기존 증거·이전 작업 설명이 있고, 하위 조건은 정확한 부모 ID에 연결된다. ID 이름을 다른 의미로 바꾸거나 오래된 판정을 삭제하지 않았다.

## 2. 과거 판정과 이번 UX 감사를 분리한다

### 부모 요구의 기존 판정

| 출처 | 충족 | 부분 | 미충족 | 의도적 변경 | 제외 | 합계 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| V41 | 62 | 1 | 3 | 6 | 6 | 78 |
| D1 | 26 | 0 | 0 | 0 | 0 | 26 |
| D2 | 50 | 3 | 0 | 5 | 6 | 64 |
| BP | 60 | 18 | 2 | 2 | 4 | 86 |
| 전체 | 198 | 22 | 5 | 13 | 16 | 254 |

### 하위 관찰 조건의 기존 판정

| 출처 | 충족 | 부분 | 미충족 | 의도적 변경 | 제외 | 합계 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| V41 | 72 | 0 | 13 | 4 | 0 | 89 |
| D1 | 32 | 21 | 6 | 0 | 0 | 59 |
| D2 | 95 | 11 | 10 | 0 | 5 | 121 |
| BP | 117 | 19 | 12 | 0 | 7 | 155 |
| 전체 | 316 | 51 | 41 | 4 | 12 | 424 |

**이 표만으로 현재 구현의 갭 개수를 확정할 수 없다.** 부모 D1 26개가 모두 충족이어도 하위 조건 27개에는 이전 단계의 부분·미충족 기록이 남아 있다. 반대로 하위 조건의 부분 51개와 미충족 41개를 더한 92개를 곧바로 새 개발 결함 92개로 세면 안 된다. 이후 구현은 존재하는데 설명이 오래되었을 수 있고, 실제 기기·운영 연결처럼 이번 감사 범위 밖의 증거를 요구하는 항목도 있다.

이번 추출에서는 678개 레코드 모두 다음 상태로 시작한다.

| 필드 | 초기값 | 의미 |
| --- | --- | --- |
| `audit.status` | `HISTORICAL_ONLY` | 과거 기록을 추출했으며 현재 적합성은 판정하지 않음 |
| `audit.functional` | `NOT_REVIEWED` | 현재 기능 감사 없음 |
| `audit.ux` | `NOT_REVIEWED` | 현재 흐름·행동 감사 없음 |
| `audit.ui` | `NOT_REVIEWED` | 현재 화면·반응형 감사 없음 |
| `audit.verification` | `NOT_RERUN` | 이 목록 작업에서 테스트를 다시 실행하지 않음 |
| `audit.journeyAssignment` | `UNASSIGNED` | 기존 여정 표기는 보존하되, 새 7개 여정에는 별도 연결 필요 |

후속 감사 결과는 정확한 ID로 별도 현재 계층에 결합한다. 이 역사 snapshot을 고쳐 현재 검토 결과처럼 만들지 않는다. 실제 갭, 오래된 판정, 승인된 변경, 미검사, 범위 밖을 구별해 보여주는 책임은 결합 보고서에 있다.

### 생성 데이터 안의 서로 다른 시점

`verificationManifest.coverage.currentSubcheckVerdicts`에는 P3-G의 충족 313 / 부분 54 / 미충족 41이 남아 있다. 생성된 `requirements`에는 P3-J의 하위 조건 3개 보정이 적용되어 충족 316 / 부분 51 / 미충족 41이다. `p3jExecutionDetail.currentSubcheckVerdicts`도 후자와 같다.

이 원장은 **생성된 실제 요구 행**을 추출하고, 이전 manifest는 `historicalManifestCoverage`에 보존한다. 낡은 원본 JSON이나 manifest만 읽고 현재 생성 HTML과 다른 숫자를 보고하지 않는다.

## 3. 원본 화면·대화·결정은 이렇게 연결되어 있다

| 원본 필드 | 들어 있는 내용 | 이번 감사에서 주의할 점 |
| --- | --- | --- |
| `source` | 명세 파일·절·행 번호 또는 `D1-conversation-...`, `D2-conversation-...` 턴 별칭 | 별칭이 있다는 사실은 현재 감사자가 대화 원문을 모두 재열람했다는 뜻이 아니다 |
| `sourceArtifact` | 원본 HTML·명세 이름 또는 상대 경로 | 통합 worktree에 없고 원본 worktree에만 존재할 수 있다. 실경로 확인 후 열어야 한다 |
| `expected` | 당시 기대 행동·결과 | 현재 코드와 테스트 이름보다 우선하는 요구 근거로 검토한다 |
| `currentEvidence` | 이전 구현 파일·테스트·캡처 근거 | 과거 근거이므로 존재 확인과 현재 실행을 구분한다 |
| `thisRun` | 이전 단계의 수정·검증 설명 | JSON에서는 `historical` 아래에만 보존했다 |
| `histories` | 원문, 대체·보류·관찰 상태, `replacedBy`, 의미 | 전체 19개를 보존했다. 대체 범위를 확인하고 새 결정과 충돌 여부를 검토한다 |
| `decisionRows` | 추적 HTML의 결정 표 overlay | 14개를 보존했다. 최신 A0/P2/P3 결정과 비교하기 전 현재 승인 대기 목록으로 단정하지 않는다 |

예를 들어 `R1 → D1-021`은 첫 결과를 Todo로 제안했다가 사용자가 Flow 문법형 Text를 명시해 대체한 관계다. `D2-H03 → D2-049`는 이전의 rawText 0 + 별도 materialize 계약을 대체한 기록이다. 이 목록은 그런 대체 관계가 인코딩되어 있음을 확인한 것이며, 해당 대화 전체를 이번에 직접 다시 읽었다는 주장은 아니다.

현재 정본·대체 관계의 확정은 보호 경계, 통합 blueprint, 해당 범위의 승인 후속 결정, 원본 명세/UI 순으로 별도 수행한다. 제품 코드를 결정 근거로 올리지 않는다.

## 4. 실제 기기·관찰 사용자 항목을 숨기지 않는다

P3-G가 실제 기기 증거와 연결한 부모 요구 7개와 하위 조건 18개를 그대로 보존했다.

| 부모 | 하위 조건 | 원래 필요한 증거 |
| --- | --- | --- |
| V41-062 | .1–.4 | 실제 Android Chrome |
| V41-063 | .1–.4 | 실제 iOS Safari |
| V41-064 | .1–.5 | 보조기술·OS 글자·실제 확대 등 |
| V41-066 | 새 하위 조건 없음 | 실제 터치 이동과 cleanup; 기존 조건을 재사용 |
| D2-038 | .5 | 실제 가상 키보드에서 속성 메뉴 접근 |
| D2-042 | .5–.6 | 실제 OS viewport·실제 browser 확대 |
| D2-061 | .8, .10 | 실제 키보드·보조기술·확대 접근 |

별도로 `D2-008`, `D2-062`, `BP-083` 등의 자동 QA/관찰 분리 항목도 전체 목록에 남아 있다. 위 표는 P3-G 명시 의존성만 모은 것이므로 기기라는 단어가 있는 모든 문장을 분류한 목록은 아니다.

P3-K 완료를 실제 기기·보조기술·관찰 사용자에게 의존시키지 않는다. 해당 증거는 `NOT_RUN`, 관찰 사용자 0명을 유지한다. 현재 부모 gap 7개가 모두 이 기기 의존성 목록에 있다는 사실도 전체 UX가 충족됐음을 뜻하지 않는다. 하위 요구와 실제 화면 비교는 따로 해야 한다.

기존 제외 판정에는 당시 반복·공개·운영 연결 범위가 섞여 있다. 후속 P2/P3가 한정해서 구현한 recurrence·source update 등을 과거 제외 문구 하나로 다시 제외하지 않는다. 이 작업에서는 당시 판정을 보존하고 대체 관계를 다음 감사에서 판별하도록 남겼다.

## 5. 일곱 여정의 기존 검사 재사용 경로

아래는 **재실행 결과가 아니라**, 현재 저장소에서 확인한 기존 test spec의 시나리오·selector 참고 경로다. 새 P3-K 관찰은 원본/과거 캡처를 덮어쓰지 않는 별도 출력 폴더에서 수행해야 한다.

| 새 여정 | 기존 제품 검사와 핵심 시나리오 | 다섯 화면 관련 경로 |
| --- | --- | --- |
| J1 진입·검색·출처 | [Stage 2](../../../tests/e2e/personal-workspace-stage-2-runtime.spec.ts): 한 입력의 네 origin/URL/memo 분기, Map exact child 선택 | 같은 파일의 지정 화면/reflow 시나리오 |
| J2 빈 원문·작성 틀·예시 | [Stage 2](../../../tests/e2e/personal-workspace-stage-2-runtime.spec.ts): 여섯 틀/native Undo, ghost 불변; [standalone](../../../tests/e2e/personal-workspace-integrated-standalone.spec.ts): blank examples/native Undo; P3-C (로컬 전용 근거: `../../../tests/e2e/personal-workspace-p3c-validation-examples.spec.ts`): 예시/StructureDraft blank-only | P3-C의 5개 viewport 개별 test; standalone blank example 6개 viewport loop |
| J3 속성·해석·교정·결과 | [통합 흐름](../../../tests/e2e/personal-workspace-integration-poc.spec.ts): 16속성·inline·dependent·near-miss, 네 결과; [standalone](../../../tests/e2e/personal-workspace-integrated-standalone.spec.ts): 대응 속성 경로 | 두 spec의 inline/dependent 5개 viewport loop |
| J4 명시 저장·재찾기 | [작성/개인공간 parity](../../../tests/e2e/personal-workspace-authoring-workspace-parity.spec.ts): 정상 원문→저장→상세; [통합 흐름](../../../tests/e2e/personal-workspace-integration-poc.spec.ts): 작성/저장/배치/reload | 통합 흐름의 작성 앱 6개 viewport loop |
| J5 폴더·기간·QuickItem·이동 | [v4.1 PoC](../../../tests/e2e/personal-workspace-poc.spec.ts): S1–S8, pointer/menu/keyboard, trash; [Stage 4](../../../tests/e2e/personal-workspace-stage-4-runtime.spec.ts): folder move parity/cleanup | 두 spec의 필수 5개 viewport; Stage 4는 추가 320 포함 |
| J6 상세·개인 편집·완료·왕복 | [Stage 3](../../../tests/e2e/personal-workspace-stage-3-runtime.spec.ts): Plan→Item/apply→commit, 네 결과, 완료; P3-J React (로컬 전용 근거: `../../../tests/e2e/personal-workspace-p3j-execution-detail.spec.ts`)·P3-J standalone (로컬 전용 근거: `../../../tests/e2e/personal-workspace-p3j-standalone-detail.spec.ts`): source/criteria/memo 분리와 왕복 | P3-J 각 5개 개별 viewport test |
| J7 취소·실패·복구 | [Stage 3](../../../tests/e2e/personal-workspace-stage-3-runtime.spec.ts): cancel/Escape/back/focus/scroll, rollback/retry/Undo, corrupt/reload; [통합 흐름](../../../tests/e2e/personal-workspace-integration-poc.spec.ts): invalid/empty/template/failure | 해당 여정의 실제 overlay를 크기별로 재관찰할 필요; 이전 loop 존재만으로 전체 오류 상태 적합성을 추정하지 않음 |

### 최소 탐색 명령

프로젝트 루트에서 다음 명령은 검사 목록만 읽는다. 이 inventory 작업에서는 제품 검사를 실행하지 않았다.

```powershell
npm.cmd exec -- playwright test tests/e2e/personal-workspace-stage-2-runtime.spec.ts tests/e2e/personal-workspace-stage-3-runtime.spec.ts tests/e2e/personal-workspace-stage-4-runtime.spec.ts --list
npm.cmd exec -- playwright test tests/e2e/personal-workspace-integration-poc.spec.ts tests/e2e/personal-workspace-integrated-standalone.spec.ts --list
npm.cmd exec -- playwright test tests/e2e/personal-workspace-p3j-execution-detail.spec.ts tests/e2e/personal-workspace-p3j-standalone-detail.spec.ts --list
```

원문 상세의 최소 회귀 실행은 아래처럼 기존 두 lifecycle을 고를 수 있다. **실행 전 과거 evidence 쓰기 경로와 runtime 기준을 다시 확인해야 하며**, 아래 명령을 실행한 것으로 기록하지 않는다.

```powershell
npm.cmd exec -- playwright test tests/e2e/personal-workspace-p3j-execution-detail.spec.ts tests/e2e/personal-workspace-p3j-standalone-detail.spec.ts --grep "authoring lineage|authored source properties" --workers=1 --reporter=line
```

- [root Playwright 설정](../../../playwright.config.ts)은 `npm run start`로 기존 production build를 실행한다. 기본 port는 3104이며 `FLOWME_PLAYWRIGHT_PORT`로 바꿀 수 있다. 기존 서버 재사용도 허용하므로 실행자가 기준 checkout/build를 확인해야 한다.
- 기존 `.next`를 재사용했다면 새 build를 했다고 부르지 않는다.
- Windows Chrome executable 설정이 있고, 일반적인 Playwright 새 context를 쓴다. 실제 사용자의 브라우저 프로필 검사가 아니다.
- standalone spec은 직접 열 수 있는 단일 HTML을 대상으로 한다. 파일의 source/runtime 버전을 React와 구별한다.
- 기존 spec 다수는 `docs/content-audit/*assets` 또는 `output/playwright/p3j` PNG를 고정 경로로 저장한다. `--output`만 바꾸면 이 경로는 바뀌지 않는다. 이번 읽기 감사에서 모든 기존 suite를 일괄 실행하면 과거 캡처를 덮어쓸 수 있다.
- 테스트 코드의 viewport assertion을 근거로 화면 전체의 가독성·정보구획·원본 적합성을 대신 판정하지 않는다. P3-J에서도 page overflow 0만으로 내부 잘림을 놓쳤다.
- 이전 접근 거부가 있었던 P3-I 리포트는 이 목록 작업에서 열거나 자동화하지 않았다. 재사용 참고 대상에도 넣지 않았다.

## 6. P3-J 과거 실행과 새 감사 실행을 분리한다

[이전 P3-J QA 기록](../2026-09-05-flowme-integrated-poc-execution-detail-gap-v1/qa.md)과 로그의 마지막 결과를 읽어 확인했다. 다음 수치는 P3-K에서 새로 돌린 수가 아니다.

| 과거 검사 | 기록된 실행 수 | 증거 |
| --- | ---: | --- |
| 상세 helper·read model 등 | 58/58 | focused 로그 (로컬 전용 근거: `../../../output/p3j-focused-wrapfix.log`) |
| standalone model/계약 | 96/96 | standalone 로그 (로컬 전용 근거: `../../../output/p3j-standalone-final.log`) |
| React 11 + standalone 7 + 원본 캡처 1 | 19/19 | browser 로그 (로컬 전용 근거: `../../../output/playwright/p3j-final-wrapfix-v2.log`) |
| 기존 D1·negative browser | 8/8 | 회귀 로그 (로컬 전용 근거: `../../../output/playwright/p3j-final-wrapfix-regression.log`) |
| 위 lifecycle 2개 보강 재실행 | 2/2, 고유 추가 0 | 재실행 로그 (로컬 전용 근거: `../../../output/playwright/p3j-final-result-linkage.log`) |
| 전체 npm test | 2,210/2,210, 15개 그룹 | 전체 로그 (로컬 전용 근거: `../../../output/p3j-npm-test-wrapfix.log`) |
| production build | 18 static pages | build 로그 (로컬 전용 근거: `../../../output/p3j-build-wrapfix.log`) |

과거 제품 브라우저 고유 수는 26개다. `11 + 7 + 8`에 원본 캡처 1개나 보강 재실행 2개를 더하지 않는다. focused·standalone 회귀를 전체 npm 고유 수에 더하지 않는다. 전체 npm과 build는 이 inventory 작업에서 다시 실행하지 않았다.

## 7. 목록 자체의 검사 결과

| 검사 | 결과 |
| --- | --- |
| 부모 254개를 원본 순서·ID·제목으로 추출 | PASS |
| 원본 168개 + bridge 86개 | PASS |
| 복합 부모 84개 / 하위 없는 부모 170개 | PASS |
| 하위 조건 424개 | PASS |
| 고유 ID 678개 / 중복 ID 0개 | PASS |
| 부모가 없거나 부모의 subcheckIds에 없는 하위 조건 | 0개 |
| 원본 제품별 부모·하위 조건 합계 | 254 / 424로 일치 |
| 모든 행의 초기 현재 상태 | HISTORICAL_ONLY / NOT_REVIEWED / NOT_RERUN |
| 생성 요구 행과 P3-J 하위 판정 합계 | 316 / 51 / 41 / 4 / 12로 일치 |
| P3-G manifest의 이전 숫자 | 별도 보존, 덮어쓰기 없음 |

JSON의 `checks`는 위 count·identity 검사 값을 담는다. 이 inventory 자체는 현재 기능 254개 또는 하위 조건 424개에 대한 재검증 완료 보고서가 아니다.

제품 코드·trace HTML·전역 설정·운영 데이터 변경 없음. 생성한 파일은 이 폴더의 `coverage-inventory.json`, `coverage-inventory.md` 두 개뿐이다. commit·push·PR·Preview·Production 모두 미진행.
