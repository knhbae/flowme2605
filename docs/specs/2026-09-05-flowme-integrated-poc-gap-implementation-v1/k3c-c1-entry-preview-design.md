# K3-C C1 — 출처를 확인하고 같은 사본으로 돌아오는 입구

- 작성: 2026-09-06 KST
- 상태: **사전 설계 · 제품 구현 승인 전**. C1 신규 모델·브라우저 시험은 아직 만들거나 실행하지 않았다.
- 범위: `K-D1-04`, `K-D1-10`, J1의 검색 → 선택 → 읽기 미리보기 → 개인공간 → 돌아오기. C2 합성 후보 진입, C3 전역/로컬 화면 정비, K4 기준일·포함 정책은 별도다.
- 이번 소유 파일은 이 문서 하나다. B3의 새 브라우저 15개 통과를 K3-B 전체 완료나 C1 완료로 환산하지 않는다.

## 1. 읽은 근거와 우선순위

[전체 실행 계획](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md)과 [개선 설계](../2026-09-05-flowme-integrated-poc-ux-audit-v1/improvement-design.md)를 전문 읽었다. C1의 직접 계약은 실행 계획 §10 C1과 개선 설계 §7.1이다. 아래 원본은 해당 화면·문장·코드 구간을 직접 읽었으며, 세 개발 세션 대화 전체를 다시 조회하지는 않았다.

| 근거 | 이번에 읽은 구간 | 적용 방법 |
|---|---|---|
| 개발1 원본 화면 (로컬 전용 근거: `../../../../flow-mvp/docs/content-audit/2026-08-19-flowme-after-end-to-end-ui-scenarios-ko.html`) | `FIND`/`UNDERSTAND`/`ADJUST ITEM`, 원본 파일 809·829·876·881행 부근 | 선택 전 출처, 공유 원문/개인 초안 구별, 원문 기준·완료 기준을 직접 근거로 사용. 당시 예시 URL·완료 기준을 현재 데이터에 복사하지 않는다. |
| 현재 생성 추적표 (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-ko.html`) | `script#trace-data`의 D1-009/017/019/021/022/023/024 및 D1-017.1~.7 | 원본 JSON 대신 생성 HTML의 현재 내장 데이터를 읽음. 부모 `충족`과 남아 있는 세부 조건·P3-K finding을 구분한다. |
| [P3-K 개발1 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d1-audit.md) | K-D1-04·10 및 묶음 B | 입구에 source/criteria가 빠지고 결과 owner가 섞인 문제. 과거 행 번호를 현재 코드 위치로 재확인했다. |
| [Stage 2 계약](../2026-09-02-flowme-integrated-poc-gap-closure-v1/stage-2-contract.md) | §5~6 | 한 입력의 URL/query/memo 분기, 네 origin, full identity, child 변경 Text 초기화·상세 닫기·0쓰기. |
| [Stage 3 계약](../2026-09-02-flowme-integrated-poc-gap-closure-v1/stage-3-contract.md) | §8 | 개인 effective 결과와 날짜 탐색 상태. 초기 Sheet/내보내기 제외는 현재 후속 계약을 취소하는 근거가 아니다. |
| [A0 결정](../2026-09-02-flowme-integrated-poc-gap-closure-v1/a0-decision-record.md) | A0-6 | React 제품 정본, standalone은 로컬 fixture 동반물. 데이터 공급 차이는 허용하지만 핵심 UX 축약은 허용하지 않는다. |
| v4.1 원본 spec (로컬 전용 근거: `../../../../flow-mvp/docs/specs/2026-09-01-personal-workspace-v4-1-prototype/spec.md`)·원본 HTML (로컬 전용 근거: `../../../../flow-mvp/docs/content-audit/2026-09-01-flowme-personal-workspace-v4-1-ui-ko.html`) | spec 전문, HTML 진입·의존 자산·탐색 구조 | 개인공간의 폴더/기간/실행·이동 구조와 모바일 본문 공간 보호. 이 원본에는 통합 검색·공유 원문 preview 요구가 없다. |
| 개발2 원본 문법 (로컬 전용 근거: `../../../../flow-text-authoring-review/docs/specs/2026-07-28-flowme-text-authoring-ux-v1/authoring-grammar-logic.md`) | §1~5, §10~11 | 원문에 없는 날짜·완료 기준·자료·출처 생성 금지, 같은 Item의 결과, source 순서와 표시 순서 분리. |
| [개발2 data handoff](../2026-07-28-flowme-text-authoring-ux-v1/data-handoff.md) | §3~4 | source·개인 overlay·execution owner 구분, 개인 lane에서 개인 override 우선. |
| 개발2 최종 원본 HTML (로컬 전용 근거: `../../../../flow-text-authoring-structure-template-inline-baseline-20260830/docs/content-audit/2026-08-30-flowme-text-authoring-unified-editor-guidance-poc-results/flowme-text-authoring-unified-editor-guidance-poc.html`) | 파일 존재·문서 wrapper 및 연결된 구현 식별 | 한 작성기 산출물 위치를 확인했다. 거대한 번들 전체를 재검토하거나 새 화면 검증을 했다는 뜻은 아니다. C1 검색 정본으로 사용하지 않는다. |
| 통합 blueprint (로컬 전용 근거: `../../../../flow-mvp/docs/specs/2026-09-01-flowme-integration-blueprint-v0/spec.md`) | §1~4 | v4.1은 실행 surface, 개발1은 저장 사본, 개발2는 명시 handoff 입구. 운영 writer 재사용안은 이후 PoC shadow 결정으로 제한된다. |

위 `../../../../flow-mvp` 등 형제 작업 공간 링크는 문서 위치 기준으로 아래 §10의 경로 검증 때 확인한다. 원본 worktree는 읽기 전용이다.

원본 UI의 “콘텐츠에 자연스러운 결과를 기본으로”는 D1-021의 후속 Text 기본 결정에 의해 해당 범위가 대체됐다. C1에서 과거 캘린더 기본을 복원하지 않는다. `flow-ux-review`의 source/안전·중복 안내 축소 기준을 적용했다. `ui-ux-pro-max`의 `navigation back state preservation` 검색은 Back 예측 가능성·현재 위치 표시를 보조 근거로만 사용했다. Figma는 사용하지 않았다. 일반 Stage 0 안내로 이미 승인된 개인공간·저장 여정을 대체하지 않는다.

## 2. 세 산출물 요구를 누락 없이 이 단계에 배치

| 산출물·요구 | C1 배치 | 이번에 닫을 조건 / 유지할 조건 |
|---|---|---|
| 개발1 D1-017.1/.2, K-D1-04 | 직접 개선 | 선택 전 실제 출처명과 허용 원문 링크. 누락·안전하지 않은 링크를 출처 창작으로 채우지 않음. |
| 개발1 D1-017.7, K-D1-04·10 | 직접 개선 | `내 사본 미리보기`와 `원문 기준 보기`의 owner를 명시. 같은 사본의 개인 메모를 원문 설명으로 표시하지 않음. |
| 개발1 D1-017.3/.4/.5/.6 | 유지 + 입구 연결 검사 | P3-J의 원문 설명·완료 기준·개인 메모 분리를 입구에서도 확인. 기존 상세 충족을 새 갭 네 건으로 세지 않음. |
| 개발1 D1-021.1~.5, K-D1-10 | 직접 연결 개선 | 기존 개인 제목·구간·전체 순서·계획일·실행값의 결과 presenter 재사용. Text 기본과 raw 원문 분리 유지. |
| 개발1 D1-019 | 기존 분기 유지 | query/URL hit·miss·invalid/memo의 정확 입력 보존과 명시 작성. 검색만으로 draft·Flow 생성 0. |
| 개발1 D1-009/024 | 기존 React 유지, standalone 대응 범위 명시 | single-child 평탄화, 실제 multi-child의 exact 선택·Text reset·열린 상세 닫기·0쓰기. 평탄 seed만으로 multi-child 완료 주장 금지. |
| 개발1 D1-022/023 | 유지 | 전체 refs, 미정 목록, 날짜 탐색/계획 날짜 분리. 새 anchor 계산은 K4이며 이번에 충족했다고 하지 않음. |
| 개발1 D1-016 | 연결 일부만 | J1 → 개인공간 왕복을 보강한다. 모든 생성·편집·복구 여정 전체를 다시 닫는 단계가 아님. |
| v4.1 개인공간 탐색·Flow 소속·기간 표시 | 유지 | 검색 입구 때문에 기본 `/my`, 폴더/오늘/주간/월간/미정, Flow 폴더 상속·실행 날짜·TimelineOrder를 바꾸지 않음. |
| v4.1 V41-053/054 및 모바일 검증 계약 | 적용 범위 유지 | 새 입구가 상단 chrome을 늘려 첫 목록/행동을 가리지 않게 검사. 기존 이동 48px·safe area·키보드 동작 유지. |
| v4.1의 공개 출처 검색·공유 preview | 해당 없음 | 원본 v4.1 자체의 미구현으로 세지 않음. 통합 C1/개발1에서 온 요구임. |
| 개발2 D2-001/003/004/006/011/014/015 | 직접 보호 조건 | 일반 글·원문 exact, source/개인/실행 구분, 잘못된 URL·기준일 부재를 추정으로 해결하지 않음. 네 결과는 같은 Item owner. |
| 개발2 D2-009 | 유지 | standalone은 서버 없이 조작 가능한 동반물. 로컬 fixture 검색을 외부 실제 검색으로 표시하지 않음. |
| 개발2 D2-035 출처/자료·완료 기준 | 보유 정보 읽기만 | authored의 exact Item source 속성은 표시 가능. `자료` 링크를 대표 출처로 승격하지 않음. 속성 편집·문법 재분류는 변경 0. |
| 개발2 작성 틀·ghost·제작자 초안 검색 | 이번 기능 변경 해당 없음 | K3-A와 별도 CreatorDraft lane 유지. 기존 초안 검색을 “기존 개인 Flow 찾기”로 재사용/개명하지 않음. |

## 3. 현재 코드에서 확인한 차이

이 절은 코드 확인이다. 현재 C1 브라우저를 실행하거나 새 RED를 얻은 결과가 아니다. app 기준 SHA는 `DF4E08A960A97D59926F7E17B195B1B65A376BC96186AE54E6D9E6B4C0869CF7`다.

| 위치 | 현재 동작 | 설계에 미치는 영향 |
|---|---|---|
| [AuthoringSurface](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx) 475~570, [composition](../../../lib/flow/personal-workspace-poc-composition.ts) 21~141·161~215 | `composePersonalWorkspacePocReadModel(initialModel,state)`가 이미 personalPlanOverlays의 제목·구간·순서·계획 날짜·메모를 합성한다. entry는 그 model을 검색한다. | “개인 수정 전체 누락”이나 “순수 원문 preview”로 진단하면 틀림. 메모가 합성된 `item.description`을 직접 원문처럼 보여 주는 혼합 owner가 핵심이다. |
| AuthoringSurface 2505~2590 | 한 입력, source label/link 없는 버튼형 결과 행. Map이면 child 수만 있음. | 링크를 버튼 안에 중첩하지 않고 행 내부의 별도 링크로 제공할 구조 필요. |
| AuthoringSurface 2834~2915, `visibleFlowItems` 379 | 세 탭 모두 직접 item 목록. 날짜는 `sourceDate` 있는 행만, detail은 `description` 또는 “개인 변경은 아직 기록하지 않았어요” 문구. | 개인 메모가 원문 설명으로 보일 수 있고 문구도 실제 overlay와 충돌. 기존 result의 실행 날짜·완료·Calendar/미정·criteria 계약을 대체하지 못함. |
| [AuthoringRoute](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringRoute.tsx) 53~126 | state/draft/library는 로드하지만 sourceCandidateStore/read index를 입구에 전달하지 않음. | P3-D 적용 원문을 무시한 preview가 생기지 않도록 검증된 source read packet 연결이 필요. 합성 후보 생성 함수는 호출하지 않음. |
| [entry resolver](../../../lib/flow/personal-workspace-poc-entry.ts) 12~23, 99~158 | 네 saved origin만 검색 대상. authored는 known이지만 eligible 아님. malformed URL/identity는 fail-closed. | authored를 검색 결과에 자동 추가하지 않는다. authored 출처 회귀는 기존 명시 handoff·개인공간 경로에서 검사. 검색 대상 확대는 C1 구현 전 별도 범위 확인 사항. |
| [read model](../../../lib/flow/personal-workspace-poc-read-model.ts) 1487~1511 | 실제 bundle/source-backed child/map의 source title·URL을 discovery metadata에 이미 보존. | metadata가 전혀 없다는 이유로 운영 schema를 추가할 필요 없음. 보유한 정보만 입구에 전달. |
| [ResultPresenter](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocResultPresenter.tsx), [source attributes](../../../lib/flow/personal-workspace-poc-source-attributes.ts) 338~410, [Surface](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx) 1163~1201·4861 | 개인 결과는 pre-personal source model + genuine source index + state + `personal-execution` 목적을 소비. | entry의 이미 합성된 Flow를 여기에 다시 넣지 않는다. 검증된 동일 입력을 공유하고 개인 적용은 한 번만 한다. |
| [Item details](../../../lib/flow/personal-workspace-poc-item-details.ts), Surface의 TaskReadOnlyDetails, [EditorSurface](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocEditorSurface.tsx) 205~275 | 원문 설명·완료 기준·개인 메모 및 HTTP(S) 원문 링크를 분리하는 기존 읽기 표현이 있음. | owner-aware 값 읽기와 readonly 표현을 재사용. 빈/공백 메모 존재성은 최근 B0-M 계약을 유지하며 trim된 표시 결과를 저장값으로 쓰지 않음. |
| [standalone app](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js) 1755·3748·5301~5304 | 기존 Flow 검색/입구 preview는 없음. 검색은 검증 예시·제작자 초안 전용. 폴더 Flow 행은 originLabel만, 상세 열기마다 TXT/기준월/선택일 초기화. | standalone에 검색이 이미 있다는 전제는 폐기. C1의 로컬 read-only entry adapter는 신규 연결 과업이며 초안 검색과 별개다. |
| standalone app 247~316·2704, [model](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/model.js) 816~845·1468 | PD의 source/개인 strict 표시 gate, M.itemDetails, personalResultProjection가 source + 개인 계획 구조/실행값을 읽음. | 새 preview는 PD gate를 우회하거나 M을 raw state로 바로 호출하지 않음. source read 실패를 정상 원문/개인 preview로 fallback하지 않음. |

## 4. 최소 화면·owner 계약

### 4.1 첫 진입은 현재 저장 사본 찾기

현재 React 검색 대상은 공개 catalog가 아니라 이 기기의 저장 사본이다. 기본 선택 결과는 **`내 사본 미리보기`**로 표시한다. “공유 계획”이라는 상태를 origin명이나 URL 유무로 추정하지 않는다. 보조 행동 `원문 기준 보기`는 같은 exact 사본에 연결된 원문 정보를 읽을 때만 제공한다. 원본 전체를 안전하게 읽을 수 없으면 그 상태를 알리고, source 제목·설명·criteria 등 입증된 필드만 보여 준다.

검색 행은 `실제 사본 제목 → 출처 정보 → 내용 보기` 순서다. 대표 출처가 명시적으로 있는 경우에만 대표명/링크를 사용한다. 여러 Item 출처를 임의의 Flow 대표 출처 하나로 정하지 않는다. 이런 경우에는 “항목별 출처”로 구분해 선택한 Item에서 읽는다. originLabel은 가져온 경로이며 출처명과 별도다. 누락은 `원문 링크 없음`, 안전하지 않은 값은 `원문 링크를 열 수 없어요`처럼 사실만 표시한다.

원문 링크는 선택 버튼과 독립적인 `<a>`다. 링크를 눌러도 Flow 선택·작성·저장·외부 fetch를 자동 실행하지 않는다. 긴 URL은 표시 폭을 제한할 수 있지만 href를 제목이나 canonical lookup 문자열로 재생성하지 않는다. URL canonicalizer는 검색 비교 전용이며, 실제 링크는 기존 HTTP(S) 검증과 escaping을 거친 보유 원문 값이다. `_blank`를 쓸 때 opener/referrer 보호를 유지한다. `javascript:`, `data:`, 상대/손상 URL의 anchor는 0개다. malformed persisted input의 기존 fail-closed를 “링크만 숨김”으로 약화하지 않는다.

### 4.2 서로 다른 값의 화면 책임

| 값 | 원문 기준 보기 | 내 사본 미리보기 |
|---|---|---|
| Flow/Item 제목·구간·순서 | 검증된 source owner 값 | 현재 승인된 개인 overlay/구조를 반영한 기존 결과 |
| 날짜/시간 | 실제 source 일정만. 기준일 없으면 추정 없음 | 기존 결과의 계획/실행 우선순위와 날짜 탐색 계약 |
| 원문 설명·완료 기준 | exact source 필드, 없으면 사실대로 빈 상태 | 같은 exact source 정보 별도 구획. 개인 메모 대입 금지 |
| 내 메모 | 개인 정보를 끌어오지 않음 | existing-personal/PoC-personal owner 값. empty/공백/CRLF의 저장 의미 보존 |
| 체크 | sourceChecked가 실제 있으면 원문 표식으로 표시 | ExecutionRun/기존 개인 완료로 표시. 원문 표식을 실행 완료로 변환 금지 |
| source URL | 실제 Flow/Item 소속 링크만 | 같은 source 정보. 개인 사본 제목을 제작자명으로 쓰지 않음 |

기본 개인 미리보기는 기존 네 결과 presenter를 재사용한다. 원문 보기는 먼저 기존 source readonly block·전체 source Item 목록을 재사용하는 최소안이다. 원문 전체 결과용 신규 planner나 모든 상태를 비운 가짜 state는 만들지 않는다. 특히 현재 `purpose:'authoring-preview'`는 완료 owner를 구분하는 옵션이지 기존 사본 전체를 원문으로 되돌리는 기능이 아니다.

미리보기는 편집/완료/날짜 이동 버튼을 활성화하지 않는다. 읽기 Item opener와 보기·월·선택일 이동만 허용한다. 개인공간에서 조작하려면 기존 exact ref 링크 `개인공간에서 보기`를 사용한다. 읽기 모드 presenter에 비활성처럼 보이는 no-op writer callback을 달지 않는다. 필요하면 선택적인 presentation capability prop으로 행동을 숨기되 기본 prop 미지정 출력과 기존 실행 화면을 보존한다. 새 copy/export 기능을 C1의 필수 목표로 추가하지 않는다.

### 4.3 상태와 복귀

| 상태·행동 | 값/선택·초점 | 쓰기 |
|---|---|---|
| 빈 입력 | 한 입력과 기존 명시 작성 행동. 예시를 검색 결과처럼 삽입하지 않음 | 0 |
| hit/miss/invalid URL | exact 입력 보존. miss는 검색 수정·돌아가기·기존 명시 작성 경로 | 0 |
| 결과 선택 | exact group/Flow ref 선택, Text 초기화. 결과 heading으로 키보드 초점 | 0 |
| child A→B | 기존 reducer의 full membership/fingerprint 검증, Text reset, 열린 A Item 닫기. B source/개인 owner 동시 전환 | 0 |
| 같은/foreign/stale child | 기존 선택·날짜·열린 상세 보존. stale 결과를 이전 성공으로 재포장하지 않음 | 0 |
| 원문↔내 사본 | 같은 Flow ref 유지, 열린 Item은 owner 변경 전 닫음. 각 owner의 임시 보기 상태는 혼용하지 않음 | 0 |
| 목록으로/브라우저 Back | exact 검색어, 선택 child, 결과 mode/월/선택일, 목록 스크롤·opener 복원. 유효하지 않은 ref는 결과 없음/재선택으로 처리 | 0 |
| 개인공간 방문 후 복귀 | 살아 있는 같은 navigation ticket에 한해 검색 상태 복원. 현재 source/target bytes·membership은 다시 읽고 확인 | 0 |
| source/target 관측 변경·ABA | 화면 캐시/읽기 ticket 폐기, ref가 유효하면 다시 읽기. 오래된 owner가 되살아나지 않음 | 0 |
| 손상/읽기 실패·pending recovery | 기존 gate 우선. source/개인 미리보기 우회 금지, 자동 복구/초기화 버튼 신설 없음 | 0 |

복귀 정보는 storage key나 Undo가 아니라 메모리 presentation state다. 브라우저 history를 사용할 때는 문서 내 opaque navigation ID만 연결하고 raw query·원문·개인 메모를 URL/hash에 넣지 않는다. React의 서로 다른 route 사이 BFCache가 없더라도 살아 있는 공유 메모리 ticket으로 복귀할 최소 경로를 먼저 검증한다. 필요하면 PoC 전용 navigation boundary를 추출한다. local/session storage를 추가하여 복귀를 맞추지 않는다. hard reload 이후 과거 검색 복구까지 새 영구 계약으로 확대하지 않는다.

standalone의 ordinary `go-authoring`가 복구된 작성 초안을 여는 계약은 유지한다. 새 검색은 그 초안 값을 덮지 않는 별도 읽기 진입이며, 새 Flow 작성을 명시하기 전 K1-A source ticket/native Undo/draft writer를 호출하지 않는다. 실행 중 Plan/Item/recovery가 있으면 기존 close/authority guard가 우선한다.

## 5. 개발 범위를 작은 세 부분으로 나누기

### C1-a 읽기 DTO·React 입구

1. `entry.ts`의 기존 판정 순서를 보존하고, match의 exact ref로 검증된 source metadata와 개인 결과를 읽는 presentation adapter를 둔다. title/URL/index로 identity를 만들지 않는다.
2. AuthoringRoute/Surface가 workspace와 같은 sourceCandidateStore의 읽기 결과·source index를 소비하도록 최소 연결한다. 정상 source read 없이 old snapshot을 현재 원문처럼 표시하지 않는다. 읽기 연결에서 후보 생성·저장 함수 0회.
3. 기존 ResultProjection에 pre-personal model + genuine source index + actual state를 전달하고 개인 결과 presenter를 읽기 모드로 연결한다. source와 개인 결과를 같은 이미 합성된 DTO로 재합성하지 않는다.
4. 실제 metadata 없는 origin은 source 빈 상태로 남긴다. 네 origin 전체에 새 운영 URL 필드를 강제하지 않는다.

후보 파일: `PersonalWorkspacePocAuthoringRoute.tsx`, `PersonalWorkspacePocAuthoringSurface.tsx`, 새 PoC entry/source presentation helper·시험. readonly block 분리가 필요하면 `PersonalWorkspacePocEditorSurface.tsx`/`PersonalWorkspacePocResultPresenter.tsx`의 선택적 presentation 부분만 별도 승인·baseline 후 수정한다. shared 기본 출력 무변경 SSR 회귀를 필수로 둔다. 운영 reader/writer·global Shell 수정은 없다.

### C1-b standalone 동반물의 읽기 입구

현재 없는 개인 Flow 검색을 기존 초안 검색으로 가장하지 않는다. C1-a와 동일한 query/URL/memo 의미를 갖는 **로컬 fixture 전용** read adapter를 제안한다. 기본 workspace/작성 버튼의 의미는 보존하고, 작성 초안과 별개로 “기존 Flow 찾기” 읽기 경로를 연결한다. 실제 배치는 구현 전 root가 검토할 UI 결정이며 상시 세 번째 pane/새 wizard는 만들지 않는다.

`app.js`의 기존 PD 표시 packet과 `personalResultProjection`/`renderItemSourceDetails`를 재사용한다. source/read failure에서 raw fallback하지 않는다. 실제 authored field `sourceSources`/`sourceProperties`는 검증된 exact Item 소속으로만 노출한다. seed에 없는 URL을 추가하지 않는다. multi-child를 검증하려면 read-only catalog용 deterministic fixture를 별도로 준비하고, 저장된 seed Flow/Step에 가짜 Map membership을 삽입하지 않는다.

후보 파일: 새 standalone entry/source presentation adapter·단위 시험, `app.js`의 입구/복귀 렌더, 해당 scoped CSS. builder의 신규 adapter 포함과 사용자 HTML 재생성은 root의 통합 검증 gate 이후 작업이다. P/C/E2/S/PD 저장 계약, M seed, 운영 key를 바꾸는 안은 포함하지 않는다.

### C1-c 양쪽 왕복·source 경계 검증과 마감

React와 standalone의 데이터 공급 차이를 명시하고 같은 사용자 intent의 owner/full refs/date/0쓰기를 비교한다. 기존에 없던 standalone 검색을 새 연결 건으로, 기존 React child 선택을 유지 회귀로 구분한다. C2 연습 진입·합성 배너와 C3 token 전수 정리는 이 단계 완료 항목에 더하지 않는다.

## 6. 먼저 남길 RED와 최소 시험 계획

다음은 **미실행 계획**이다. 첫 제품 변경 전 해당 후보 source SHA·정확 before HTML/route build를 고정한다. 최초 RED가 실제 제품 결함인지 fixture 오류인지 나눠 보존한다. 아래 행은 검사 묶음이며 아직 등록 테스트 수가 아니다.

| 계획 ID | 실제 fixture/행동 | 판정 기준 |
|---|---|---|
| C1-R01 | source title/URL/criteria 있는 saved Flow를 검색하고 선택 | 카드 safe 링크·source명, Item criteria 표시. 기존 입구 누락 RED 확인 |
| C1-R02 | 개인 메모가 원문 설명과 다르고 source criteria도 별도인 exact Item | entry 원문 구획에 개인 메모가 나타나지 않음. 혼합 owner RED 확인 |
| C1-R03 | title/구간/global order/계획일/실행일/완료가 서로 다른 사본 | 개인 preview와 workspace 결과 동일 refs/값, 원문 mode는 source 값. 기존 직접 목록과 비교 |
| C1-R04 | source 없음·invalid persisted source·unsafe URL | 누락 표시/기존 fail-closed 구분. javascript/data/상대 URL anchor 0, 창작 source/criteria 0 |
| C1-R05 | URL canonical hit/miss/invalid·query hit/miss·동명 다른 사본 | exact 입력/사본 유지, 대표 URL을 다른 child에서 가져오지 않음. 선택/조회 API 0 |
| C1-R06 | single Map·multi child·review_hold, exact hit B→A→B | 기존 Text reset/상세 닫기/포커스, 같은·foreign·stale 0변경. standalone fixture 공급 차이 명시 |
| C1-R07 | 검색→preview 날짜 탐색→workspace→Back, 키보드/Escape | query/선택 child/owner/view/날짜/스크롤·초점 복원. storage/Undo 0, source값 변경 0 |
| C1-R08 | source 적용 전후·read error·target/source 관측 ABA | sourceIndex/PD gate와 현재 owner 일치. old callback/URL/상세 재활성화 0, 후보생성 0 |
| C1-R09 | authored handoff·imported 개인 메모 empty/space/CRLF | 검색 eligibility 확대 없이 기존 개인공간에서 exact source/개인 분리. title/메모로 criteria 생성 0 |
| C1-R10 | standalone 처음 찾기/빈 결과/초안 존재 중 검색 | 새 검색 연결 기능 실증, CreatorDraft/authoring raw/native Undo 무변경. 초안 검색과 혼합 0 |
| C1-R11 | 4개 이상·미정·반복의 네 결과 | 임의 3개 truncation 0, 같은 owner의 full refs/occurrences. WorkingSource·Calendar 기간 순서 정책 무변경 |
| C1-R12 | 긴 제목/emoji/공백 없는 URL/긴 기준·오류·빈 화면, 다섯 viewport | 아래 화면 기준, silent clipping/숨은 핵심 행동 0 |

순수 시험은 source DTO의 presence/exact값/실제 URL 검증, full tuple·foreign/collision·read failure, no IO를 고정한다. SSR은 기본 no-prop presenter와 기존 editor 출력·역할을 보존하는지 비교한다. 이후 등록 inventory를 고정한 다음 실제 브라우저를 실행한다. 4origin/5viewport loop·assertion 개수를 등록 테스트 수로 합산하지 않는다.

선정 회귀 후보는 `personal-workspace-stage-2-runtime.spec.ts`의 query/URL/child, `personal-workspace-stage-3-runtime.spec.ts`의 결과 왕복·원문 보호, P3-J detail, 최신 K3-B 필드/구조/receipt UI와 source CAS다. 기존 파일은 변경 전 root 승인과 exact backup이 필요하다. 요구가 바뀌지 않은 assertion을 새 selector에 맞춘다는 이유로 삭제하지 않는다. 전체 `npm test`/production build는 root가 최종 조합에서 별도로 실행한다.

## 7. 다섯 화면·초점 검증 기준

- 390×844, 375×812: 검색 입력·첫 결과·내용 보기 접근, 긴 출처 링크와 카드 버튼 분리, owner 문구 읽기, 결과/뒤로 도달. 검색 중 가상 키보드 실측은 별도 NOT_RUN.
- 844×390: own header/tab/본문 스크롤이 링크·첫/마지막 Item·뒤로를 가리지 않음. 폰트/내용을 줄여 맞추지 않음. source/개인 owner와 필요한 행동을 같은 스크롤 맥락에서 확인.
- 1024×768, 1440×900: 기존 두 영역 위계 유지, 불필요한 세 번째 pane 없음. 선택/현재 child·owner가 명확하며 모든 결과 접근 가능.
- 모든 폭에서 document뿐 아니라 card/preview/readonly dd의 `scrollWidth/clientWidth`와 내용 bounds 확인. 긴 URL·emoji가 잘리거나 한글 버튼이 세로 한 글자씩 감기지 않음.
- 핵심 control은 full rectangle과 9점 hit test로 검사하고, 포커스는 키보드와 pointer를 구분한다. 브라우저 Back은 실제 history로 검사하며 DOM 클릭만으로 대체하지 않음.
- 선택 변경 발표 live owner는 하나. source 설명/criteria 목록을 별도 live로 중복 낭독하지 않음. 실제 TalkBack/VoiceOver는 실행하지 않으면 NOT_RUN.
- 캡처는 exact viewport로 찍고 캡처 전후 source/target bytes·owner/ref·view/선택 상태 동일을 확인한다. 스크롤해 각각 확인한 요소를 “모두 동시에 첫 화면에 보임”이라고 쓰지 않는다.

## 8. 보호 경계·완료 기준

조회·선택·탐색·복귀에서 **PoC까지 포함한 setItem/removeItem/clear 0**, source/target/journal/draft/library 전후 exact bytes 유지, 운영 writer·합성 후보 generator 0회. 준비 fixture는 audit 시작 전에 seed하고, 외부 변경 주입은 product API 계수와 분리한다. 운영 sentinel은 격리 브라우저의 fixture 증거이며 실사용자 profile 검증이 아니다.

기존 exact query/손상 payload fail-closed, source read 실패와 recovery gate, four-origin identity·다른 사본·기간/폴더/완료·Undo 보존을 모두 유지한다. 통상적인 선택이 기존 recovery 정리 write를 실행한다면 선택 0쓰기 PASS로 포장하지 않고 bootstrap recovery 범위와 분리해야 한다.

종료는 R01~R12 중 실제 등록된 범위의 RED→GREEN/유지 회귀, 양쪽 다섯 viewport, 전체 시험/build와 새 source mapping 근거가 갖춰졌을 때다. D1-017.1/.2/.7과 K-D1-04/10의 확인한 범위만 갱신한다. 실제 기기·보조기술·관찰 사용자 검사는 대기 blocker로 넣지 않고 미실행 여부를 적는다. commit/push/PR/Preview/Production은 별도 승인 전 모두 미실행이다.

## 9. 구현 전 root가 확인할 좁은 쟁점

1. standalone의 신규 로컬 읽기 입구 배치와 multi-child fixture 공급 adapter를 C1-b에서 승인할지 확인한다. 운영/live 검색 또는 seed schema 확장이 아니라 기존 C1의 동반물 UX 범위를 구체화하는 기술·화면 결정이다.
2. authored를 React 검색 eligible에 넣는 것은 현재 계약을 넓힌다. 이 문서는 이를 택하지 않았다. 네 origin 검색 + authored 기존 handoff/개인공간 source 표시로 검증 범위를 나눈다.
3. exact route 왕복의 메모리/history 복귀가 지원되지 않는 기존 구조라면 작은 PoC navigation adapter를 먼저 RED로 검증한다. 검색어를 저장하거나 새 운영 라우트를 만들도록 우회하지 않는다.
4. source snapshot 자체가 없는 legacy 사본에는 가짜 전체 원문을 만들지 않는다. readonly source block의 보유 정보와 명시된 미지원 상태로 제한하고, 해당 경우 전체 원문 preview 완료라고 쓰지 않는다.

위 네 항목 외의 영구 정책을 새로 결정하지 않는다. C1 제품 수정은 root가 이 문서와 근거를 읽고 소유 파일/첫 RED 범위를 승인한 다음 시작한다.

## 10. 이 사전 설계의 실제 수행 범위

- session-start read-only 보고: HEAD `6e4b44fe`, ahead/behind 0/0, 당시 modified 188·untracked 394. 전체 경로는 미소유로 취급하고 새 문서 한 개만 작성했다.
- 이 문서 작성 시 제품/app/테스트/builder/generated HTML 변경 0. C1 신규 실행 테스트 0, C1 브라우저·캡처 0, 관찰 사용자 0명.
- B3는 root의 기존 회귀·전체 시험/build·HTML 마감이 별도로 진행 중이다. 이 문서는 그 전체 완료 보고가 아니다.
- 문서의 링크 26개를 실제 경로로 해석해 모두 존재함을 확인했다. `npm.cmd run docs:check`는 필수 문서 16개·로컬 링크 6,137개 PASS였다. 모델/제품/브라우저 시험 결과가 아닌 문서 검사다.
