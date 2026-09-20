# K3-A 설계 — 같은 편집기에서 쓰기·정보 추가·작성 틀 선택

작성일: 2026-09-05. 상태: **문서·기존 캡처·현재 코드 대조와 최소 설계 완료. 이 하위 작업의 제품 변경·새 모델 시험·새 브라우저 실행은 0이다.**

K1-A 원문 도움 안전성과 K1-B 마감 뒤 진행할 독립 사전 설계다. K2-B 모델 작업과 병행해 문서만 작성했다. 구현을 시작할 때 현재 파일·기준 해시·소유 범위를 다시 고정한다.

## 1. 목표와 이번 판정 단위

J2 빈 문서 시작과 J3 작성·교정에서 `P3K-D2-02`, `P3K-D2-05`, `P3K-D2-06`을 다룬다. 같은 원문 편집기를 유지하면서 현재 위치의 도움, 네 그룹→속성→값, 빈 틀·완성 예시·기술 정보의 구분을 두 runtime에 맞춘다.

| finding | 연결 요구 | 이번 닫을 범위 | 함께 완료로 올리지 않을 것 |
|---|---|---|---|
| P3K-D2-02 | D2-035/036/040/043 | 첫 속성 chooser에 네 그룹만, 선택 그룹만 다음 단계 노출, 값 입력·의존 입력·한 단계 Escape | 16개 catalog를 새로 구현한 것처럼 계수하지 않음. parser/반복 지원 범위 확장 아님 |
| P3K-D2-05 | D2-029~034/037/044/055 | standalone의 한 textarea owner를 유지한 표현 전환·현재 행 raw·문맥 도움·계층 표시·값 재진입 | CodeMirror나 block editor로의 전면 교체, 모든 원본 픽셀 복원, 양방향 source reverse edit |
| P3K-D2-06 | D2-043/045/049/053/056 | 빈 틀을 우선하는 picker, 완성 예시 적용의 별도 맥락, 기술 disclosure | 6 scaffold/31 corpus/6 compiled fixture 제거·교체, 새 compiler 또는 template 정책 |

정본은 [실행 계획 §8](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md#8-k3-a--authoring-한-편집기네-그룹틀), [개선 설계 §6](../2026-09-05-flowme-integrated-poc-ux-audit-v1/improvement-design.md#6-authoring-원본-ux-맞추기), [D2 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d2-audit.json)다. 이 문서의 비교 행은 위 finding을 더 구체화하는 구현 계약이며 새 영구 제품 taxonomy나 운영 schema가 아니다.

## 2. 실제 읽은 근거와 우선순위

| 근거 | 이번 직접 확인 범위 | 적용·한계 |
|---|---|---|
| 원본 `flow-text-authoring-flow-view-poc-20260824/docs/specs/2026-08-26-flowme-text-authoring-contextual-item-palette/spec.md` | 전문: Goal·Scope·Design Decisions·Source Transaction·Acceptance | 네 그룹의 원래 의미, 시간/시간대·반복/종료 결합, source transaction 근거 |
| 원본 `flow-text-authoring-flow-view-hybrid-ux-poc-20260828/docs/specs/2026-08-29-flowme-text-authoring-keyboard-property-tray-reliability-poc/spec.md` | 전문: owner·busy/stale·키보드·접근성 | exact owner, 보호 구문, 명시 적용 0/1의 의미. 원본 CodeMirror 전용 aria-activedescendant 구현을 현재 native 버튼에 그대로 복사하지 않음 |
| 원본 `flow-text-authoring-structure-template-inline-baseline-20260830/docs/specs/2026-08-30-flowme-text-authoring-unified-editor-guidance-poc/spec.md` | 전문: 같은 편집기·6개 구조 틀·후속 source 계약·ghost·native Tab | 별도 틀 편집기 금지, raw/presentation 분리, non-modal·native Tab의 더 뒤 계약 |
| 같은 checkout의 `docs/content-audit/2026-08-30-flowme-text-authoring-unified-editor-guidance-poc-results/flowme-text-authoring-unified-editor-guidance-poc.html` | title·문맥/속성 메뉴 소스 anchor 탐색. 전체 bundle을 모두 감사한 것은 아님 | 원본 HTML 존재·구조 연결 확인. 새 브라우저 검사는 하지 않음 |
| 기존 P3-K 캡처 `original-d2-template-settled-390x844.png`, `original-d2-contextual-blank-390x844.png`, `react-property-chooser-390x844.png` | 3장을 직접 열어 확인 | 원본 빈 틀 ghost/현재 위치 메뉴와 React 속성 목록 과다 노출의 **과거 캡처 비교**. 현재 후보의 새 시각 QA가 아님 |
| [A0 결정](../2026-09-02-flowme-integrated-poc-gap-closure-v1/a0-decision-record.md) §6 A0-4 | 같은 source/editor + 파생 결과, 강제 wizard/별도 template editor 제외 | 운영 정책보다 isolated PoC 계약을 우선 |
| [작성→개인공간 P0 요구](../2026-09-03-flowme-integrated-poc-authoring-workspace-parity-v1/requirements.md) | 전문, 특히 우선순위·UI-01/UI-05·§8·후속 상태 정합화 | standalone mode toggle 생략과 문맥 helper P1 보류가 당시 명시되어 있음 |
| [P2-C spec](../2026-09-03-flowme-integrated-poc-personal-editing-closure-v1/spec.md) | 전문 | 16 catalog와 inline/dependent·값 선택은 이미 구현 범위. 최초 네 그룹은 계속 요구됨 |
| [P3-C spec](../2026-09-03-flowme-integrated-poc-validation-examples-structure-draft-v1/spec.md) | 전문 | 완성 예시·StructureDraft·sidecar·6/31/6 자산은 후속 승인 범위. 제거 대상 아님 |
| [제품 UX design contract](../2026-09-03-flowme-integrated-poc-product-ux-pass-v1/design-contract.md) | §1–5 | 기술어 기본 노출 제거, 로컬 흰색/회색/청록, 두 pane와 현재 주 행동 |
| [K1-A 설계](./k1a-design.md) | 전문 | ticket·persist-first·native Undo·exact rollback·stale 재선택은 K3-A가 약화할 수 없는 선행 안전 계약 |
| 현재 React/standalone 소스와 관련 테스트 정의 | 아래 §3/§7의 정확 파일·함수 | 코드 확인이며 새 PASS 판정이 아님. K1-A/K1-B·다른 묶음의 과거 실행 횟수를 여기서 반복 계산하지 않음 |

원본 checkout 경로는 모두 `D:/flowme2605/` 아래다. **이 하위 작업은 원본 개발2 대화를 직접 새로 읽지 않았다.** `d2-audit.json`에 기록된 개발2 세션 `019fab7b-e562-71a1-a6bf-9de5c8837e75`의 최신 5턴 열람은 이전 감사 담당의 근거다. 이를 ‘이번에 전체 대화를 읽었다’고 표현하지 않는다. 미확인 승인 충돌이 생기면 해당 결정 구간만 추가 열람한다.

### 원본 복원으로 오판하지 않을 후속 변경

- 원본 CodeMirror는 **현재 엔진 선택의 의무가 아니다**. 현재 React도 textarea + presentation overlay다. A0는 한 source/editor owner를 고정했으며 block editor 도입을 선택하지 않았다.
- 원본에서 구조 틀 선택이 곧 삽입이었던 경로는 현재 P3-C에서 **목록 선택→preview, 별도 명시 적용**으로 구분됐다. 클릭 즉시 삽입으로 되돌리지 않는다.
- 원본의 ‘별도 초안 보관 없음’을 이유로 현재 `내 초안`과 CreatorDraft lane을 없애지 않는다. K3-A는 현재 입력/결과/내 초안 navigation과 해당 후속 owner를 보존한다.
- `검증 예시`, 완성 원문 적용, StructureDraft materialize/sidecar는 P3-C의 승인 기능이다. 기본 노출과 우선순위만 바꾼다.
- standalone의 mode toggle·현재 행 helper 축약은 P0 당시 의도적인 범위 유보였다. K3-A가 이제 이를 구현하는 것이지 과거 변경 전부를 미승인 퇴행이라고 부르지 않는다.
- 일반 source→result 즉시 투영과 **저장 뒤 개인 편집→source 역쓰기 금지**를 유지한다. 원본의 양방향 편집 문구로 최신 owner 경계를 뒤집지 않는다.

## 3. 현재 차이 — 기능 부재와 노출 차이를 분리

행 번호는 2026-09-05 설계 시점 코드 기준이며 함수·testid를 함께 찾는다.

| 요구 | React 현재 | standalone 현재 | 최소 수정 |
|---|---|---|---|
| 원문 편집 owner 하나 | `PersonalWorkspacePocLiveEditor.tsx:396,416–625,794`의 textareaRef·native input/history | `app.js`의 `#flow-editor`, K1-A `applyAuthoringSourcePlan` | 둘 다 기존 textarea node·document identity 유지. 두 번째 editable mirror 생성 금지 |
| 순수 텍스트/Flow 편집 | LiveEditor `:709–739` 토글과 `buildPersonalWorkspacePocLiveEditorPresentation` 존재 | `mountAuthoringGhostEditor:1786`은 ghost 토글만. 모드·현재 행 문서형 표현 없음 | React pure presenter/line guide 의미를 standalone adapter로 재사용 |
| 현재 행 raw, 나머지 안전한 행 문서형 | LiveEditor `:280–322`: 선택 범위 행은 raw, 안전한 같은 길이 single-line 표현만 사용 | `renderAuthoringGhosts:1754`는 raw geometry + ghost뿐 | 변환 가능한 행만 present, 선택/unsupported/protected는 raw. 원문 줄 수·문자 위치를 유지하는 mirror |
| 현재 위치의 `+`, Item owner 고정 | LiveEditor `:653–680,817`와 authoring guide target resolver | 속성 진입은 결과→항목 검토→속성 편집(`renderAuthoringReviewItem:2589`) | 입력 pane에 같은 owner helper entry 추가. 기존 결과 검토·값 선택 경로도 같은 coordinator로 유지 |
| 최초 네 그룹만 | AuthoringSurface `:3154–3171`은 네 제목 + 전체 16 속성을 한 번에 렌더 | `renderAuthoringPropertyTray:2572`는 group가 없으면 schedule로 fallback하여 **네 버튼 + 일정 목록을 처음부터 표시** | 양쪽 모두 명시 `groups → properties → value` 상태. standalone을 이미 완전 충족이라고 쓰지 않음 |
| 한 단계 Escape | React `onEscape:768`는 overlay를 한 번에 닫는 분기 우선 | `app.js:4304`는 값→tray, 다음 Escape→tray 닫기. group-only 단계 없음 | 현재 활성 단계만 pop. 값/목록/그룹/구조 메뉴의 복귀점을 구분 |
| 빈 틀 우선·기술 정보 접기 | AuthoringSurface `:2540–2627`: compiler/version·완성 raw preview·두 CTA 동시 | `renderAuthoring`의 template preview도 동일 정보와 두 CTA | 빈 틀 preview를 기본, 완성 예시는 별도 보조 맥락, 기술 정보는 disclosure |
| ghost source 무영향 | LiveEditor overlay aria-hidden/select-none/pointer-events-none; source textarea만 복사 | 기존 ghost overlay와 scroll sync 존재 | 기존 동작 보존. 모드·도움 UI 개선 때문에 ghost를 textarea.value로 옮기지 않음 |
| 순수 텍스트의 힌트 제어 | LiveEditor `:724`의 ghost 버튼은 현재 flowViewVisible 조건 없이 렌더 | 모드가 없어 별도 구분 없음 | 순수 텍스트에서는 ghost·관련 토글을 숨기고 tab order에서 제외. Flow 편집 복귀 시 앞서 고른 표시값 유지 |
| source 안전 | K1-A exact ticket·draft CAS·persist-first·native 검증 | K1-A 동일 계약과 guarded retry/stale/recovery | 새 entry가 기존 coordinator를 거치도록 연결. 화면 분기마다 새 writer를 만들지 않음 |

현재 경로의 보존 성공 여부는 구현 뒤 새 시험으로 확인한다. 위 표에 있는 코드만으로 긴 줄의 정렬·키보드 가림·모든 접근성을 PASS라고 판정하지 않는다.

## 4. 네 그룹의 정확한 mapping

16개 canonical key·source label·alias·valueKind·singleton/append·dependency·handoff 규칙은 그대로 둔다. 원본 8월 26일 계약과 현재 P2-C의 네 그룹 요구를 따라 **UI 선택용 versioned mapping**을 별도로 둔다. `catalog.group`을 parser의 의미나 저장 schema로 해석하지 않는다.

| 첫 그룹 | UI에 속하는 기존 key | 현재와의 차이 |
|---|---|---|
| 일정 | date, relativeDate, time, timezone, place, duration | 현재 schedule의 repeat/repeatEnd는 더 보기로 이동. timezone은 시간과 함께 입력하는 기존 dependent 경로 유지 |
| 실행 | completion, condition, subcheck | 현재와 같음. 하위 체크는 child action이며 새 root Item이 아님 |
| 내용 | detail, resource | 현재 content의 guide/caution은 더 보기로 이동 |
| 더 보기 | repeat, repeatEnd, guide, caution, source | 원본의 반복/종료·안내/주의·출처 의미 복원. source와 resource는 계속 분리 |

현재 stable group key `schedule/execution/content/provenance`는 연결점 호환을 위해 유지할 수 있다. `provenance`는 내부 key이며 화면은 `더 보기`다. 설명을 ‘출처와 근거’로만 제한하지 않는다. 중복 key 0·누락 key 0·총 key 집합 동일성을 순수 시험으로 고정한다.

읽은 원본·P2-C·P3-C 문서에는 반복/종료→일정, 안내/주의→내용 재분류를 승인한 scoped 근거가 없었다. 따라서 승인된 원래 의미로 돌아가는 것이 최소안이다. 이는 **읽은 범위 내 판단**이다. 구현 직전 다른 승인 근거가 발견되면 해당 mapping만 재검토하고 source 의미를 임의 변경하지 않는다.

시간대와 반복 종료를 독립 top-level 폼으로 새로 만들지 않는다. 기존 결합 입력 진입과 ‘기존 값 선택’으로 16 key 전부에 도달해야 한다. 화면에 16 버튼을 동시에 보여야 16 기능을 지원하는 것은 아니다. 날짜·반복 dependency의 활성/차단은 기존 planner의 실제 결과를 사용하고 UI mapping으로 지원 범위를 늘리지 않는다.

## 5. UX 상태와 행동

### 5.1 현재 행과 항목 정보

```text
같은 원문 편집기
  → 현재 위치 + : 구조 메뉴(다음 할 일 / 하위 확인·항목 정보 / 새 단계)
  → 항목 정보 : exact Item 제목 + 네 그룹
  → 선택 그룹 : 그 그룹의 속성과 뒤로
  → 값 입력 : exact Item 제목 + 속성명 + 입력 + 취소/적용
  → K1-A transaction 성공 : 같은 편집기 값 범위·결과로 복귀
```

‘최초 네 그룹’은 **항목 정보 chooser의 최초 상태**를 뜻한다. 문맥 구조 메뉴의 다음 할 일·하위 확인·새 단계까지 삭제하거나 네 그룹과 한 화면에 모두 펼치지 않는다. 기존 검토에서 속성을 여는 경우는 네 그룹으로 직접 들어갈 수 있고, 입력의 `+`는 같은 구조 메뉴/owner를 사용한다.

| 상태 | 표시·다음 행동 | source/저장·복귀 |
|---|---|---|
| prose/unsupported/선택 범위 | 일반 타이핑은 유지. 안전한 target이 없으면 쓰기 helper를 만들지 않음 | source 불변, 자동 Item 추정 금지 |
| 문맥 구조 메뉴 | 현재 위치·실제 문법과 관계·닫기 | 열기/둘러보기 0쓰기. Escape→원래 `+`/caret |
| groups | exact Item 제목, 일정/실행/내용/더 보기, 뒤로/닫기 | 속성 카드 0개. Escape→이전 구조 메뉴 또는 실제 opener |
| properties | 선택 그룹 이름과 해당 속성만, 뒤로 | 다른 그룹 목록은 숨김. Escape→groups |
| value | 대상·속성·필드·필요한 dependency/오류·취소/적용 | Escape→직전 속성 목록. 적용 전 source 0쓰기 |
| existing value | 기존 exact raw 값 선택 | 쓰지 않고 같은 textarea selection으로 복귀. 빈 값은 prefix 뒤 collapsed caret |
| stale/busy | K1-A 원문 변경·재선택 이유, 입력값 보존 | 그룹 이동으로 ticket을 자동 갱신하지 않음. 명시 재선택만 새 owner 확인 |
| failed | 입력값·해당 오류·retry를 같은 스크롤에 유지 | exact before 확인, 같은 intent retry. 화면 감산 때문에 실패를 숨기지 않음 |
| applying/recovery-required | 기존 K1-A 잠금·회복 안내 | 중복·닫기·source 수정 우회 차단. 현재 guard를 presentation state로 대체하지 않음 |

값 입력에서 위 단계로 돌아가더라도 같은 helper owner의 임시 값·실패 정보는 재진입 가능한 메모리에 남긴다. 도움 전체를 명시 취소/닫는 기존 계약은 유지한다. 다른 문서·다른 Item으로 임시 값이 이동하지 않으며, stale 상태를 단순 메뉴 이동으로 ready로 바꾸지 않는다.

Tab/Shift+Tab은 native 문서 순서를 따른다. 원본 successor에서 picker를 떠나는 Tab은 picker만 닫고 정상 문서 순서를 계속 따랐으므로, 닫은 뒤 opener로 강제 focus해 순환시키지 않는다. native 버튼 그룹을 `menu`라고 선언한 뒤 필요한 키보드 모델을 생략하지 않는다. 현재 계약상 non-modal chooser를 위해 가짜 focus trap·aria-activedescendant를 새로 만들 필요는 없다. 기존 bounded dependent sheet/popover만 유지하고 menu→form에서 overlay를 중첩하지 않는다. Enter는 열린 폼/현재 command만 처리하고 IME Enter·229는 명령 적용으로 사용하지 않는다.

### 5.2 빈 틀·완성 예시·기술 정보

| 표면 | 기본 내용·주 행동 | 보존/0쓰기 조건 |
|---|---|---|
| 빈 원문 | 바로 입력, 보조 `작성 틀` / `검증 예시` | 완성 예시 자동 입력 0. 일반문장 그대로 |
| 작성 틀 목록 | 여섯 구조명·용도·짧은 예시 | hover/focus/선택은 preview만. browse/cancel source·draft·workspace 0쓰기 |
| 선택한 틀 preview | 미완성 scaffold가 무엇을 넣는지 보여 줌. 주 행동 `빈 틀 넣기` | 적용 직전 empty/editor/document/source/epoch/IME guard. 한 native Undo/Redo |
| 완성 예시 보조 맥락 | `완성 예시 보기`를 명시적으로 열면 완성 raw preview와 `이 예시로 시작` 또는 기존 materialize 의미의 행동 | 같은 pane의 하위 상태/접기. 31 corpus와 6 compiled fixture의 provenance·action owner는 구별해 보존 |
| 검증 정보 disclosure | compiler/catalog/template version, fingerprint·rule/contract 등 내부 정보 | 기본 접힘. 읽기/펴기/닫기 0쓰기. data 속성·검증 기능은 삭제하지 않음 |
| 오류·loss·보관 실패 | 일반 사용자 언어의 경계·재시도는 계속 즉시 보임 | compiler 정보와 함께 접어 오류를 감추지 않음 |

기본 틀 picker의 두 동등한 적용 행동을 하나로 합쳐 의미를 흐리지 않는다. 첫 상태는 빈 틀에 집중하고, 완성 예시로 이동했을 때만 그 맥락의 적용이 주 행동이다. 현재 검증 예시 검색·필터·preview·명시 materialization을 유지한다. 기존 sidecar version/key·6 positive fixture·19-rule/negative corpus는 표면 정리의 수정 대상이 아니다.

## 6. 개발 설계 — 엔진을 바꾸지 않는 최소 경로

### 6.1 선택한 안과 선택하지 않은 안

**권고: 기존 textarea + 비편집 mirror + 공유 pure guide adapter.** 현재 React도 이 방식을 사용하므로 standalone만 CodeMirror로 교체할 이유가 없다.

| 안 | 효과 | 판단 |
|---|---|---|
| 기존 textarea 보존, React와 같은 pure presentation/guide를 재사용 | 같은 source/native Undo/selection owner를 유지하며 모드·현재 행·문맥 + 연결 가능 | 선택. 작은 viewport와 긴 줄의 geometry가 gate |
| CodeMirror를 standalone에 새 도입 | 원본 엔진과 같아지지만 현재 native history·K1-A ticket·번들/접근성 경계를 모두 다시 다룸 | K3-A에서 하지 않음. 필요하면 별도 목표·설계·증거 |
| 별도 contenteditable/block editor·두 번째 편집 미리보기 | raw/selection/history owner가 둘로 갈라짐 | 제외 |
| textarea만 둔 채 라벨만 ‘Flow 편집’으로 변경 | 기능 표시와 실제 current-line 표현이 다름 | 완료 조건을 충족하지 못함 |

### 6.2 구현 단위와 파일 후보

1. **공유 표시 계약:** `lib/flow/personal-workspace-poc-authoring-properties.ts`의 parser/catalog를 재작성하지 않고 별도 chooser mapping을 추가한다. `lib/flow/personal-workspace-poc-authoring-guide.ts`의 `resolvePersonalWorkspacePocAuthoringGuideTarget`와 기존 action planner를 재사용한다. `PersonalWorkspacePocLiveEditor.tsx`의 pure `buildPersonalWorkspacePocLiveEditorPresentation`만 독립 모듈로 추출할 경우 기존 export/API와 exact 출력 회귀를 유지한다.
2. **React chooser:** `PersonalWorkspacePocAuthoringSurface.tsx`의 overlay 안에 `structure/groups/properties/value` view state를 둔다. 값 입력의 source ticket/commit 함수는 그대로다. `onEscape`·outside·opener 복귀는 현재 활성 단계 기준으로 정리한다. 별도 문서/editor remount를 하지 않는다.
3. **standalone 공유 bridge:** 기존 `lossless-authoring-runtime.cjs`의 esbuild `write:false`/IIFE/CJS 패턴처럼 pure guide·presentation만 번들한다. React TSX 전체를 single-file에 싣거나 model parser를 복제하지 않는다. builder는 이 작은 bridge를 포함하며 생성 HTML/Android 동기화와 pin 갱신은 해당 구현 소유자가 마지막에 한다.
4. **standalone editor adapter:** `mountAuthoringGhostEditor`/`renderAuthoringGhosts`를 기존 `#flow-editor` node를 감싼 단일 frame으로 확장한다. `value`를 다시 대입하거나 innerHTML로 textarea를 재생성하지 않고 selection/scroll/input/composition 이벤트에서 mirror만 갱신한다. 현재 `setAuthoringPaneWithoutRemount`의 입력↔결과 전환도 보존한다.
5. **정확한 위치:** selectionStart/End, same document/source epoch와 parser manifest가 일치할 때만 helper target을 만든다. Item property/child 줄에서는 가장 가까운 추정 제목이 아니라 shared resolver의 root owner line/ref를 사용한다. active selection·table·HTML/comment/fence·stale model에는 쓰기 affordance를 허용하지 않는다.
6. **원문 명령 연결:** 구조 도움·속성의 명시 action은 해당 pure planner의 replacement를 기존 `applyAuthoringSourcePlan`/React K1-A coordinator로 보낸다. opener ticket의 exact draftSerialized/CAS를 적용 시점 값으로 바꿔치기하지 않는다. 값 재선택은 기존 exact locator만 사용한다.
7. **틀 presentation:** 두 runtime picker의 정보와 CTA hierarchy만 재배치한다. scaffold/corpus/compiler/sidecar planner와 native 삽입 함수를 유지한다. 과거 snapshot 기대가 가시 기술어에 의존하면 내부 data/evidence 또는 disclosure를 열고 검사하도록 정당하게 갱신한다.

mirror는 raw 줄/문자 수와 같은 길이로 표현할 수 있는 안전한 행만 바꾼다. 선택 범위가 걸친 모든 행은 raw다. CRLF·tab·한글·emoji·wrap·200% 등가 reflow에서 두 레이어의 줄 위치가 어긋나면, 원문을 가리거나 다른 행의 caret처럼 보이게 한 채 PASS 처리하지 않는다. 이 경우 안전한 raw 표현을 유지하고 해당 presentation 조건은 미충족으로 기록한다.

### 6.3 바뀌면 안 되는 모델·저장 계약

- 원문 bytes·line ending·공백·trailing newline·문서 identity·source epoch를 presentation 토글로 바꾸지 않는다.
- selected range, scroll, clipboard는 textarea owner다. overlay/ghost/계층 선은 aria-hidden·pointer-events:none·user-select:none이며 복사/selection/undo stack에 들어가지 않는다. 순수 텍스트 모드에서는 ghost 제어를 숨기고 Flow 편집으로 돌아올 때 이전 표시값만 복구한다. 이를 위해 새 운영 설정 key를 만들거나 처음 모드의 영구 기본값을 확정하지 않는다.
- K1-A ticket은 문서·editor·source epoch/ABA·target·opening exact draft bytes를 보존한다. UI 단계를 오간다고 재취득해 stale를 지우지 않는다.
- helper persist-first→exact readback→native one transaction→실패 시 owned bytes rollback/readback을 유지한다. rejected native Redo 방지와 recovery-required 잠금도 유지한다.
- 일반 타이핑 autosave, 성공 handoff·CreatorDraft·sidecar·Plan/Quick journal의 각 owner를 합치거나 새 범용 writer로 교체하지 않는다.
- 일반 문장·빈 scaffold의 canonical 생성 0, 값이 있는 잘못된 문법의 loss gate, 원문 sourceChecked와 개인 실행 완료 분리는 그대로다.
- 원문에 없는 날짜·완료 기준·링크·예시를 추정해 넣지 않는다. UI 선택/토글/닫기/같은 값/invalid/stale/composition에서는 관련 source·draft·workspace mutation 0이다.
- exact query gate와 `flow:poc:personal-workspace:v1:*`만 허용하는 경계, 운영 `/my`·key/schema/writer 불변, clear 금지를 유지한다.

## 7. 구현 순서와 gate

| 순서 | 기획·UX/설계→개발 단위 | 닫기 위한 증거 |
|---|---|---|
| K3A-1 | 현재 후보 snapshot/소유 범위 고정, 원본→후속 결정 mapping, chooser/presentation pure 계약 | 16 key 집합·원본 그룹 mapping·상태 전이 테스트. 기존 planner 출력 exact |
| K3A-2 | 양쪽 groups→properties→value/뒤로·Escape, 대상 제목·오류·재선택 | 모든 그룹/값/의존 입력의 키보드·0쓰기·K1-A38 회귀 |
| K3A-3 | standalone same textarea mirror·모드·현재 owner `+`·구조/값 재진입 | 같은 DOM/editor/document, raw/current-line·ghost·source history parity, 긴 줄 geometry |
| K3A-4 | 빈 틀/완성 예시/기술 disclosure 재배치 | 6 scaffold·31 corpus·6 compiled exact bytes, preview0/explicit1/nativeUndo/Redo |
| K3A-5 | 입력→결과→검토→같은 원문→명시 저장→개인공간 회귀, 다섯 viewport·문서 갱신 | 관련 기존 시험·전체 npm/build·브라우저·시각 평가·운영 sentinel evidence를 분리 보고 |

각 단계 전에 해당 파일 담당을 정하고 기존 미소유 변경을 보존한다. K2-B 또는 다른 묶음이 같은 app/model/생성물을 소유 중이면 읽기·pure 설계만 진행하고 제품 쓰기 시점을 겹치지 않는다. 이 문서가 새로운 구현 권한이나 배포 승인이 되지는 않는다.

## 8. 검증 계획 — 아직 실행하지 않은 목록

### 순수·component 최소 행렬

| 구분 | 확인할 조건 |
|---|---|
| UI mapping | 4그룹 label/order, 16 key 누락·중복0, 시간대/반복 종료의 결합 진입, 원본 labels/aliases/planner bytes 불변 |
| state reducer | structure→groups→properties→value와 한 단계 back/Escape, native Tab 비차단, 닫힌/다른 owner에 낡은 action 적용0 |
| presentation | same-length 안전 표현, 선택 행 전체 raw, hierarchy/ghost 장식, blank/prose/unsupported fallback, CRLF/tab/emoji/긴 token·wrap |
| locator | same exact manifest/source, root/child/property/blank target, duplicate 제목·중간 행 삽입·ABA·문서 교체, 보호 구문·selection 차단 |
| source safety | K1-A persist-first/CAS/readback/rollback/rejectedRedo/failed값/reselect/IME·double/noop 유지 |
| 자산 | 6 scaffold/31 corpus/6 compiled manifest exact, sidecar/version·19-rule/negative fixture·loss gate 회귀 |

### 새 브라우저 시나리오 묶음

| ID | React와 standalone에서 같은 fixture로 확인할 행동 |
|---|---|
| KA-B01 | 원문 CRLF/tab/한글/emoji/긴 줄을 입력하고 모드·ghost를 반복 전환. editable textarea/node/document 1개, source·selection·scroll·clipboard·native Undo 이력 불변 |
| KA-B02 | 현재 행/복수 선택 행은 raw, 다른 안전한 행은 Flow 표현. owner root의 `+`는 property/child 이동에서도 정확히 같은 Item을 가리킴 |
| KA-B03 | 현재 `+`→항목 정보→처음 4그룹만→선택 그룹만. 모든 16 key의 입력/기존 값·빈 값 재진입. 장소와 출처/자료가 바뀌지 않음 |
| KA-B04 | 값→속성→그룹→구조/실제 opener Escape. Tab/Shift+Tab 정상 순서, 닫기/밖 클릭0쓰기, 입력·오류·포커스 보존 |
| KA-B05 | 시간/시간대와 반복/종료 dependency·invalid·duplicate, 합성 composing Enter와 빠른 중복. source partial write0, 성공1/nativeUndo1 |
| KA-B06 | 도움을 연 뒤 행 삽입·ABA·동일raw 새문서·외부 draft bytes 변경. 자동 retarget0, 임시 값 유지 후 명시 재선택만 성공 |
| KA-B07 | quota/read throw/readback mismatch/native reject/rollback 불확실. 오류가 기술 disclosure에 숨지 않으며 기존 K1-A retry/recovery 계약 유지 |
| KA-B08 | 빈 틀 browse/cancel0, 6개 scaffold explicit insert1, first blank caret, 부분 해석, native Undo/Redo exact. non-empty/stale/composing/double0 |
| KA-B09 | 완성 예시와 빈 틀의 preview/CTA·source 결과가 구별됨. 31 검색/필터/원문과 6 compiled materialize·sidecar exact, disclosure만 열 때0쓰기 |
| KA-B10 | 입력↔결과↔선택형 검토를 같은 editor로 왕복, 기존 CreatorDraft 열기·저장과 personal handoff·reload·운영 sentinel 회귀 |
| KA-B11 | 5 viewport의 빈/긴/오류 helper, 빈 틀/완성 예시/기술 정보, 마지막 행/caret·취소/적용 도달 및 직접 캡처 비교 |

위 ID는 설계상의 여정 묶음이지 실제 등록 test 개수가 아니다. 실행 단계에서 runtime별·parameter별 실제 `test()` 수와 assertion 순회 수를 별도로 보고한다. 현재 검사 결과는 **NOT_RUN**이다.

기존 회귀는 [Stage 2 runtime](../../../tests/e2e/personal-workspace-stage-2-runtime.spec.ts)의 현재 행 표현·여섯 틀·ghost·문맥 도움·Tab·viewport, P3-C React (로컬 전용 근거: `../../../tests/e2e/personal-workspace-p3c-validation-examples.spec.ts`)와 P3-C standalone (로컬 전용 근거: `../../../tests/e2e/personal-workspace-p3c-validation-examples-standalone.spec.ts`), K1-A helper safety (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k1a-helper-safety.spec.ts`), 관련 `authoring-guide`/`authoring-properties`/LiveEditor/standalone 모델을 사용한다.

과거 parity E2E가 `작성 화면` label/2개 nav만 기대했던 낡은 조건은 현재 `작성 단계` 및 승인된 `내 초안` lane을 읽은 뒤 현행화한다. 제품에 맞게 assertion을 무조건 낮추지 않고, 달라진 승인 근거와 새 기대를 시험 이름·QA에 남긴다. 기존 테스트 전체를 지우거나 실패 시나리오를 제외하지 않는다.

### viewport·시각 검사 기준

- 390×844, 375×812: 입력/결과 compact 전환을 유지하고 도움의 제목·값·오류·취소·적용이 같은 스크롤에서 보인다. 44px 이상 target, 모바일 주요 행동 48px 기준을 유지한다.
- 844×390: textarea caret/현재 행/최소 한 완전한 option과 핵심 행동이 도달 가능해야 한다. CTA만 남고 owner/input이 눌려 사라지는 K1-A 이전 형태를 허용하지 않는다.
- 1024×768, 1440×900: 기존 40~44/56~60 입력/결과 두 pane를 보존한다. 도구를 상시 세 번째 pane로 추가하지 않는다.
- document overflow뿐 아니라 editor/mirror/chooser/form 내부 scrollWidth, 줄 좌표, wrap·clipping, scroll 후 CTA 전체 rect와 center/여러 지점 hit를 검사한다. 자동 수치와 실제 캡처 읽기를 함께 남긴다.
- 코드/기술 disclosure 밖 기본 표면에서 compiler/version/WorkingSource/shadow 같은 내부 설명을 감산한다. loss·원문 출처·보관 실패·복구 안내·접근성 label은 유지한다.
- 실제 Android/iOS 가상키보드·IME·screen reader는 실행하지 않았다면 NOT_RUN, Chromium visualViewport/200% 등가 시뮬레이션과 별도로 기록한다. 관찰 사용자 수는 실제 관찰 근거가 없으면 0이다.

## 9. 감산·보존과 완료 판정

설계 감산 대상은 전체 속성 동시 목록, 반복되는 원문/기술 설명, 모든 값을 카드로 감싼 테두리, 기본 picker의 compiler 배지와 동등한 두 primary다. 보존 대상은 실제 입력값·owner·출처/자료 구분·오류/실패/재선택/복구·키보드 이름·명시 적용과 Undo다. **이번 문서 작업에서 실제 UI 요소를 삭제한 것은 없다.**

UX review의 낮은 평가 축은 기존 증거상 Cognitive Load, 현재 행 도움의 Execution Clarity, 텍스트/mirror의 Operability다. 새 화면을 만들거나 시험하지 않았으므로 숫자 점수나 PASS를 부여하지 않았다. `ui-ux-pro-max`의 targeted disclosure 검색은 적합한 일치가 없었고 재검색은 0건이었다. 이 문서의 감산·label·오류 보존 기준은 그 검색 결과가 아니라 원본 요구, Flow UX copy/quality 규칙과 현재 승인 설계에 근거한다.

완료는 세 finding별 원본/후속결정→현재구현→새 모델·브라우저·화면 증거가 연결되고, K1-A 안전 회귀와 source/native Undo/ghost/6·31·6 exact bytes·운영 경계가 유지될 때만 판정한다. 엔진 교체 없이 충족하지 못한 presentation 조건은 제한으로 남기고 별도 목표로 제안한다. 보고서는 기능/UX/UI/증거의 판정을 나눠, 전체 D2나 통합 제품 완료로 확대하지 않는다.

Figma는 사용하지 않았다. 제품·저장소 schema·운영 데이터·생성 HTML 변경 0, commit/push/PR/Preview/Production 0, 새 브라우저/실기기 검사 0, 새 관찰 사용자 0이다.
