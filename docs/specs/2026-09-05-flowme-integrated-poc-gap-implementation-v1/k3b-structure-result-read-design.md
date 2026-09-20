# K3-B B2 — 개인 구간·선형 순서의 결과 읽기 연결

2026-09-05. **읽기 설계다. 이 문서를 작성하면서 M/C/E2/P/PD/app·builder·HTML을 변경하지 않았고 결과 읽기 신규 시험도 등록·실행하지 않았다.** E2 v4의 별도 최종 208/208 결과는 [E2 QA](./k3b-structure-session-v4-qa.md)에 있다. 아래 제안의 검증 수로 합산하지 않는다.

## 1. 기준과 확인한 실제 차이

[reader/UI 설계](./k3b-structure-reader-ui-design.md), [B2 계약 diff](./k3b-section-order-contract-diff.md), [P2-C 원본 계약](../2026-09-03-flowme-integrated-poc-personal-editing-closure-v1/spec.md)을 전문으로 읽었다. 현행 M 결과 함수·P 구조 view·PD 전체·timeline-result-rank 전체·app 결과 caller와 React result의 개인 순서/구간 처리 부분을 대조했다. 과거 대화 전체를 다시 읽었다는 뜻은 아니다.

| 연결점 | 현재 동작 | 최소 제안 |
| --- | --- | --- |
| M `resultProjection:1367–1425` | Step → itemIds 순서로 base rows와 `lines`를 함께 만듦 | 기존 base rows를 먼저 만들고 검증된 full-ref 순열로 결과용 배열만 재배열 |
| `buildUnifiedResultProjection:1238–1364` | base 순서대로 회차 확장, manifest/Todo/Sheet/TXT 공유 | 이 공통 경로에 재배열된 base를 전달. 각 결과를 따로 sort하지 않음 |
| `resultContextRank:989–1022` / calendar `1101–1186` | explicit resolver 우선, 회차·불완전 date group은 Plan fallback | 그대로 유지. 새 Plan 순서는 fallback baseline으로만 전달 |
| P `structureView:293–313`, `readPersonalPlanStructureView:844` | source context에 묶인 frozen sections·full refs, `viewOnly:true` | PD 실제 검증 뒤 같은 자료를 한 Flow씩 옵션으로 전달 |
| app `resultItemSummary:2376`, `renderResultPanel:2433–2454` | Todo/Calendar 요약에 구간 없음. Sheet DTO에는 구간이 있지만 UI 열에는 없음 | 구간 subline·표의 구간 열을 후속 UI 연결에 포함 |
| React result `1123–1248` | overlay full refs 순서로 먼저 Item을 고르고 effective section을 붙여 회차 확장 | 원본 적합성 기준으로 사용. 새 standalone metadata를 React 운영 schema로 옮기지 않음 |

읽기 기준 hash: M `9A3334F49975D9EB9B971F7D0CFBE8508D03B59E526F653FF79AC1E4A7D70F67`, P `AA3D3EA124BC9C7C752D5FF82A359D075F3C1CEEABC933571C11953C0E3493F4`, C `835FF4320FC8278882876BEDE60AA392734341E4C300309FF9A47515818CF600`. root의 이후 C timeline tie 구현은 이 읽기 시점과 분리한다.

## 2. API 제안과 검증 책임

root가 지정한 새 PD entry를 사용한다. 아직 결과 연결 구현이 승인됐다는 뜻은 아니다.

```js
PD.projectPersonalPlanStructureDisplay({
  checkpoint, sourceRead, sourceEpoch, flowRef,
})
// {ok:true, scope:'structure-display-only', structure:<P frozen view>}
// 또는 {ok:false, scope:'structure-display-only', reason, ...}

M.resultProjection(displayState, localFlowId, {
  ...existingResultOptions,
  personalPlanStructureView: structure, // 옵션명 제안
})
```

`displayState`는 같은 read packet에서 얻은 source-before-personal → 개인 core overlay 결과다. raw checkpoint와 display state를 같은 것으로 취급하지 않는다. P 구조 view의 shape를 바꾸거나 `sourceReady:true`·새 editor context·저장 권한을 만들어 넘기지 않는다.

PD는 `inspectPair`의 **current + 실제 C Undo-P** gate와 실제 `strictRead.context → P.readPersonalPlanStructureView`를 소유한다. M은 P/C를 import하지 않는다. 기존 P→M 의존의 반대 방향을 추가하면 순환 참조가 되므로 피한다. 별도 저장소/key/구조 writer·cache payload를 만들 필요도 없다.

### M 옵션의 소비 규칙

1. 옵션 부재는 기존 결과 함수의 동작을 보존한다. `null/undefined`라도 **own property가 존재하는 실패 값**이면 `null` 결과로 차단한다. caller가 PD 실패를 옵션 부재로 바꿔 기존 결과를 표시하면 안 된다.
2. P view는 exact `{ok:true,viewOnly:true,flowRef,sections,orderedItemRefs}`다. descriptor-safe 검사로 getter/toJSON/custom prototype/symbol/holes/unknown keys를 먼저 거절한다. readonly array의 원본을 sort하거나 수정하지 않는다.
3. view.flowRef가 선택 Flow의 full ref와 같아야 한다. base Item의 `sourceItemRef`가 중복 없이 모두 존재하고, orderedItemRefs는 그 **전체 집합의 완전 순열**이어야 한다. local id·같은 제목·다른 saved copy의 ref로 대체하지 않는다. ref가 없는 기존 자료의 fallback은 옵션 부재의 기존 경로에만 남긴다.
4. sections는 raw/display Flow의 Step 위치마다 정확히 한 번 대응한다. `sourceOrder`의 범위·중복·누락을 검사하고 그 위치의 Item ref membership/order를 base rows와 대조한다. `sourceTitle`은 해당 source-composed Step title과 같아야 한다. alias `title`은 별도 표시값이다.
5. non-null sectionId는 해당 Step id와 같고 유일해야 한다. null id는 readonly 그대로 다룬다. 동일한 null id 여러 개나 같은 구간명을 dictionary 한 key로 합치지 않는다. `readonly` title은 sourceTitle과 같아야 하며 M이 이름/id를 발급해 편집 capability를 만들지 않는다.
6. 하나라도 잘못되면 부분 rows나 원래 순서로 대체하지 않고 전체 결과 `null`이다. selected Flow와 무관한 state를 고치거나 normalized metadata를 반환하지 않는다.

이 검사에서 `viewOnly:true` 또는 `Object.freeze` 자체가 P 검증의 증거인 것은 아니다. **실제 P/current-source provenance는 PD와 caller가 보장하고 M은 그 display value의 결합·형태를 재검사한다.** M의 저수준 옵션에 임의로 만든 합법 모양의 alias를 넘기는 것이 genuine source/editor 권한을 만든다고 주장하지 않는다. 실제 사용자 payload는 반드시 PD를 거친다는 caller 회귀가 필요하다.

## 3. 원본 배열을 건드리지 않는 결과 구성

권고 순서는 다음과 같다.

```text
동일 checkpoint/source 관측
  → PD current/실제 Undo 검증 → displayState + P structure view
  → M의 기존 raw Step 순회로 base rows와 legacyLines 생성
  → full-ref join + 각 행에 effective section title/표시 group key
  → orderedItemRefs대로 새 base 배열
  → 기존 occurrence 확장 → items/manifests/Todo/Sheet/TXT/Calendar
```

- 원래 `flow.steps`, `step.itemIds`, `state.tasks` 배열과 모든 요소는 그대로 둔다. base의 `sourceProperties`, sourceLine, subchecks/resources/sources, 완료·날짜·시간·ExecutionPlacement와 occurrence overrides도 바꾸지 않는다.
- 기존 base `planOrder`는 원래 base 위치를 기록한다. 재배열 후에도 이 값은 보존되어 결과 `sourcePlanOrder`가 원래 위치를 뜻하게 한다. 통합 함수가 새 순서대로 발급하는 `planOrder`는 개인 결과의 선형 row/회차 순서다.
- A1/A2가 구간 A, B1이 구간 B일 때 개인 순서가 A1/B1/A2이면 결과도 A1/B1/A2다. 원래 구간 membership은 A/B/A로 남고 구간별 재그룹화로 A1/A2/B1을 만들지 않는다.
- TXT는 기존처럼 **연속한 구간 run**마다 heading을 출력한다. A1/B1/A2는 `[A]…[B]…[A]…`다. 동일 id/title 또는 null id가 다른 원본 Step을 합치지 않도록 결과 전용 `sectionGroupKey`를 제안한다. 이는 full Flow ref + sourceOrder로 만든 일회성 표시 key이며 실제 sectionId/저장 owner를 대체하지 않는다. 기존 `stepId`도 덮어쓰지 않는다.
- `sectionGroupKey`를 추가한다면 TXT serializer는 `sectionGroupKey ?? 기존 stepId/title`로 run만 구분한다. 옵션 부재/authoring preview의 DTO와 직렬화는 기존 fallback을 그대로 사용한다. 결과 전용 optional field이며 운영 schema에 넣지 않는다.
- `textLines`는 새 결과용 선형 base run으로 만들 수 있다. base Item 단위라는 기존 의미는 유지하고, 반복 회차는 현재처럼 TXT/manifest에서 확장한다. 원래 빈 구간·자유 메모는 WorkingSource에 그대로 남긴다. 빈 구간의 순서 편집 기능을 새로 만들지 않으며, 옵션 부재의 기존 textLines 바이트/빈 구간 표시는 유지한다.

### WorkingSource와 authoring preview는 분리

현재 M은 `flow.rawText !== null`이면 원문 그대로, null이면 `lines`로 만든 `projected-source`를 WorkingSource로 준다. 새 결과용 lines를 여기에 재사용하지 않는다.

- `legacyLines`는 기존 Step 순회 단계에서 확보한다. `workingSource.rawText`는 기존과 동일하게 `flow.rawText === null ? legacyLines.join('\n') : flow.rawText`다.
- 같은 display state를 넣었을 때 옵션 유무가 WorkingSource kind/editable/rawText를 바꾸지 않아야 한다. null fallback은 원문 파일이 아니라 기존 읽기 투영임도 유지한다.
- 실제 source update가 rawText를 바꾼 것은 새 원문 관측의 결과다. 이번 개인 구조 옵션 때문에 바뀐 것으로 섞어 보고하지 않는다.
- `authoringResultProjection`은 개인 구조 옵션을 소비하지 않는다. 원문 parser·sourceChecked·source order·rawText·preview fingerprint가 그대로여야 한다. 개인 Plan alias/order를 원문이나 authoring preview로 역반영하지 않는다.

## 4. 결과별 순서와 Calendar 우선순위

| 결과 | 적용/보존 |
| --- | --- |
| `sourceItemRefs` | P의 orderedItemRefs와 exact 같은 선형 base 순서 |
| `items/itemRefs/rowIds/occurrenceIds` | 그 base 순서에서 기존 회차 확장. 회차 identity·날짜·완료는 보존 |
| Todo | items 순서 그대로. summary에 각 행의 effective 구간명을 표시 |
| Sheet/CSV | 같은 items 순서와 `order/planOrder`, effective sectionTitle. CSV 기존 열·인코딩·BOM·개행 규칙은 보존 |
| TXT/복사/다운로드 | 같은 items + 구간 run. 화면 txt와 downloads.txt.payload byte-for-byte 동일 |
| Text lines | 선형 base Item 순서와 effective section, 원문 WorkingSource와 분리 |
| Calendar 전체 manifest | 같은 items를 공유하되 날짜별 보이는 순서는 아래 기존 resolver 계약을 유지 |

`resultContextRank`를 새 order 옵션으로 덮어쓰지 않는다. 현재 explicit `timelineRankResolver`가 있는 날은 그 결과가 우선이며, 다른 시간/수동 TimelineOrder의 우선순위는 root의 C read-only tie gate가 담당한다. 새 full-ref 순열을 resolver 요청의 원본 Item id나 실행 날짜 대신 넣지 않는다.

실제 occurrence는 기존 resolver에서 fallback하고, 같은 context에 미확인/반복 visible row가 있으면 해당 날짜 전체가 **새 개인 Plan 순서**를 fallback으로 쓴다. `timelineOrderFallbacks` 이유와 UI 문구를 유지한다. 명시 resolver가 null/throw/불일치일 때 옛 today/week/month 배열로 다시 떨어지지 않는다. 다른 날짜나 Flow/Quick의 순서를 임의로 합치는 정책을 만들지 않는다.

Calendar의 selectedItems/cells/month refs/undated는 기존 builder가 같은 items에서 생성한다. Calendar가 수동 날짜 순서 때문에 Todo와 달라지는 것을 Plan 순서 실패로 판정하지 말고, 전체 base/manifest 일치와 날짜 context 우선순위를 따로 검사한다.

## 5. app 연결 누락 방지

현재 `resultProjectionOptions()`는 Flow id 없이 rank/date/page만 돌려준다. 구조 옵션은 대상 Flow마다 다르므로 **`personalResultProjection(localFlowId)` 같은 중앙 읽기 함수**를 권고한다. 이 이름은 제안이며 아직 구현하지 않았다.

중앙 함수는 같은 `personalDisplayPacket()`·checkpoint identity/workspaceEpoch/source raw/status/sourceEpoch에서 PD 구조 view를 구한다. source/epoch/Undo/Flow가 바뀌면 캐시를 무효화한다. PD가 막히면 `M.resultProjection`을 옵션 없이 재호출하지 않는다. no-P source read failure는 기존 `personalExecutionOnly()` 안내를 유지한다. 구조가 필요한 current/실제 Undo-P 실패는 빈 정상 결과나 이전 성공 view로 위장하지 않는다.

다음 네 호출 경로를 모두 중앙 함수로 바꿔야 한다.

| 현행 위치 | 사용하는 이유 |
| --- | --- |
| `renderResultPanel:2435` | 화면 TXT/Todo/Calendar/Sheet와 manifest |
| `occurrenceFromControl:4454` | 기존 회차 버튼의 exact sourceItemRef/occurrenceId/originalDate 재검사 |
| `copy-result-txt:5031` | 화면과 같은 TXT 복사 |
| `download-result-txt/csv:5035` | 화면과 같은 파일 payload |

authoring caller `2717/5032/5039`와 `authoringProjectionOptions`에는 연결하지 않는다. 실패 상태는 결과 영역에 원문/개인 계획을 확인할 수 없다는 안내와 재확인 경로를 두고, copy/download를 비활성화한다. 조회 실패 중 stale 회차 버튼이 새 전이를 만들지 않는지 확인한다. 저장/Undo writer를 결과 resolver 안에 넣지 않는다.

현행 UI는 Todo/Calendar의 `resultItemSummary`와 Sheet 열에 구간명을 보여 주지 않는다. 모델에서 sectionTitle만 바뀌었다고 UI 충족으로 보고하면 안 된다. root가 승인한 구간 subline과 Sheet 구간 열을 함께 연결하고, 5 viewport에서 긴 구간·동명 구간·가로 스크롤·키보드 초점을 검사한다.

## 6. 승인 후 실행할 작은 gate

1. **M 읽기 pure RED → GREEN:** actual M handoff + C 구조 저장 + PD/P read fixture로 아래 R01–R10을 새 파일에 등록한다. M 옵션·표시 key의 이름과 fail-closed 규칙은 main이 먼저 검토한다.
2. **PD/C/rank 결합:** 같은 source packet/current+실제 Undo 실패, no-P 동작, root C tie rank·명시 수동 순서·회차 fallback 회귀. 누락된 항목을 추정해 끼워 넣지 않는다.
3. **app 화면/복사/다운로드 단일 caller:** 비드래그 Plan 순서/구간 입력 → staged child → 최종 저장 → 결과4종 → reload/Undo를 실제 브라우저에서 확인한 뒤 사용자 HTML을 생성한다.

| 예정 ID | 최소 assertion |
| --- | --- |
| R01 | 실제 authored A1/B1/A2 + alias가 source refs/rows/Todo/Sheet/TXT/Text에 일치, inputs exact 보존 |
| R02 | 같은 이름 두 구간·null/중복 readonly id를 sourceOrder로 구분. 원래 membership/stepId는 불변 |
| R03 | 같은 local id 다른 copy, foreign/duplicate/missing ref, sourceOrder·section membership·sourceTitle drift는 전체 null |
| R04 | unsafe descriptor/prototype/getter0, own option null/undefined/unknown 실패, 옵션 부재 기존 positive |
| R05 | 실제 PD current/Undo/source corrupt/read-error/epoch 변경: fallback/복사/다운로드·저장0 |
| R06 | 다른 날짜·시간·manual rank·resolver null/throw/불일치에서 기존 Calendar 우선순위, Plan 목록 불변 |
| R07 | 반복 회차 count/ids/dates/done/overrides exact, 같은 날짜 Plan fallback, 다른 날짜 resolver 영향 없음 |
| R08 | source A→B 개인 alias A·명시 inherit·원래 순서 reset·v1/v2 Undo와 이웃 entry 보존 |
| R09 | rawText 있음/없음 모두 WorkingSource exact, authoring preview 옵션 유무 전체 exact, source memo/empty section 보존 |
| R10 | txt/download bytes 동일, CSV 행/sectionTitle/개행/BOM 보존, 실제 UMD/CJS 동일 read-only 결과 |

예정10개이며 현재 등록·실행0이다. 실제 Android/iOS·관찰 사용자 검사는 하지 않았다. 이 결과 연결은 새 영구 정책·운영 writer/schema·계정/cloud·배포를 허용하지 않는다. commit/push/PR/Preview/Production 없음.
