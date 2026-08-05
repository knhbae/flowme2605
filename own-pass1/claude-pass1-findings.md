# Claude Design Pass 1 — findings (FlowMe P35 Round 2)

- reviewer: Claude Design (`CD-###`)
- input scope: coordinator-provided prompt `review/03-claude-pass1-prompt-ko.md` + `review/08-claude-static-evidence-allowlist.md` (index commit B `e0d9a5b8f17f1e30ca8a18a273c873aaff696db0`) and the documents those two link directly (`01`, `04`, `05`, `06`) plus the commit-pinned static evidence at asset commit A `0af680a215d49e648dd10f97eeb7954e5c689297`.
- S17: `NOT_RUN — CODEX_ONLY`. No S17 file or URL was opened, requested, or scored.
- actual browser 200% zoom: `NOT_RUN — ACTUAL_ZOOM_NOT_ASSESSED`. The 720×500 capture is read only as a reflow proxy.
- observed users: `0`.
- contamination: none. No inherited context, no other reviewer output, no Codex allowlist, no runtime URL.

Full-screen captures are page-level captures in which fixed/sticky layers (bottom tab bar, sheets, dialogs) are composited into the scroll flow. Where a claim could depend on that compositing, it is marked in `not proven`.

---

## CD-001 — `주 결과` marks the lossy destination while the previewed destination is marked `다른 결과`

- severity: HIGH
- status: REPRODUCED
- scenario / route / state / viewport: S02 / `/f/moving-d30-basic` (dated+undated mixed) / `03-dated-undated-mixed-public-result` / 390×844
- user task: 공개 계획에서 "내가 받게 될 결과"가 무엇인지 첫 화면에서 판단한다.
- observed fact: 첫 viewport의 결과 chip 행은 `주 결과 / 캘린더 · 일정 23개`를 첫째로 두고, 실제로 선택·미리보기되는 destination은 `다른 결과 / 체크리스트 · 24개`다. capability manifest는 `primaryDestination: "calendar"`, `selectedDestination: "checklist"`, calendar `state: "conditional"`, `outputCount: "23"`, `expectedOutputCount: "24"`이며 `manifestItemIds`에서 `flow-moving-item-5`가 빠져 있다. 같은 화면 아래쪽 `h3 입력이 더 필요한 결과` 블록이 같은 캘린더를 다시 `날짜를 정하면 최대 24개 / 현재 일정 23개 확인 가능 / 설정`으로 제시한다.
- expected invariant: 한 destination은 한 화면에서 하나의 역할만 갖는다. `주(primary)`는 현재 선택되어 미리보기되는 결과, 또는 최소한 손실 없는 결과를 가리켜야 한다.
- evidence IDs: `S02/03-dated-undated-mixed-public-result.png`, `S02/03-dated-undated-mixed-public-result.state.json` (h3 `입력이 더 필요한 결과`; button `주 결과캘린더 · 일정 23개`, testId `flow-capability-result-choice`), `S02/dated-undated-mixed.capability-manifest.json`, `S02/scenario-summary.json`
- hierarchy / interaction consequence: 사용자는 chip의 `주`를 "기본으로 만들어질 결과"로 읽는다. 저장 CTA(`내 계획에 저장`)를 그대로 누르는 경로에서 1개 Item이 결과에서 빠진다는 사실은 두 번째 블록을 읽어야만 알 수 있고, 어떤 Item이 빠지는지는 화면 어디에도 없다.
- counterexample tested: `CTA label만 보고 mutation과 다음 결과를 예측할 수 있다` — 깨졌다. chip label(`주 결과 · 일정 23개`)과 실제 선택(`체크리스트 24개`)이 서로 다른 결과를 예고한다.
- CODEX_VERIFICATION_REQUEST: none
- smallest correction boundary: chip의 역할 token(`주 결과`/`다른 결과`)을 현재 선택 상태에 바인딩하거나, conditional destination에는 `주` token을 부여하지 않는다. 카피/역할 라벨 범위이며 레이아웃 변경은 필요 없다.
- not proven: 저장 후 실제 캘린더 artifact에서 `flow-moving-item-5`가 어떻게 처리되는지는 이 scenario의 정적 evidence로 확인하지 않았다.

---

## CD-002 — public quick lookup 경로의 storage diff가 비어 있지 않다

- severity: HIGH
- status: NEEDS_CODEX_VERIFICATION
- scenario / route / state / viewport: S01 / `/flows` / `lookup-empty`, `lookup-miss`, `lookup-error-failure-injection` / 390×844
- user task: URL·메모로 계획을 찾기만 하고 저장하지 않는다.
- observed fact: allowlist manifest 기준으로 세 variant의 `storage-before`는 35 bytes(`{"local":{},"session":{}}`, sha `09b547ca…`)이고 `storage-after`는 1,080,753 bytes(sha `e8d7f989…`)다. 같은 1,080,753 byte blob은 `lookup-hit`/`lookup-review-hold`에서는 before·after 양쪽에 동일 hash로 나타난다. 저장 행동은 수행되지 않았다.
- expected invariant: `04-neutral-scenario-matrix-ko.md`의 public quick 불변식 — 실행 전후 persistent product storage diff가 비어 있고 persistent write count가 정확히 `0`.
- evidence IDs: `S01/lookup-empty.storage-before.json`, `S01/lookup-empty.storage-after.json`, `S01/lookup-miss.storage-before.json`, `S01/lookup-miss.storage-after.json`, `S01/lookup-error-failure-injection.storage-*.json`, `S01/scenario-summary.json`
- hierarchy / interaction consequence: 저장하지 않은 탐색 경로가 1MB 규모의 지속 저장을 남긴다면, "아직 내 계획에 저장되지 않았다"는 제품 전반의 상태 약속과 충돌한다.
- counterexample tested: `저장 전 public 경로는 아무것도 남기지 않는다` — 정적 metadata 상으로는 깨진다. 다만 blob 내용을 확인하지 못했다.
- CODEX_VERIFICATION_REQUEST: attached

```md
- scenario: S01 (lookup-empty / lookup-miss / lookup-error-failure-injection)
- claim needing runtime verification: 저장 행동 없는 public lookup이 persistent product storage에 write를 남기는가, 아니면 1,080,753 byte blob이 evidence 수집기의 fixture/cache 주입인가
- exact action sequence: fresh profile → `/flows` 진입 → URL·메모 입력 → `계획 찾기` 실행 → empty/miss/error 상태 도달 → 어떤 저장 CTA도 누르지 않음
- expected storage/artifact observation: localStorage/sessionStorage key 단위 diff와 write count. product-owned key(`flow:*`)와 collector-owned key를 분리해 각각 count
- required raw evidence: key-level before/after diff JSON(값 truncate 가능), 각 write의 caller stack 또는 write journal, persistent_write_count 필드
```

- smallest correction boundary: 정정 대상이 UI가 아닐 수 있다. Codex 판정 전까지는 evidence 표기(수집기 cache와 제품 write의 분리 기록) 문제로 좁혀 둔다.
- not proven: 1,080,753 byte blob의 key 구성과 소유자. Claude 입력에서는 해당 파일을 열 수 없었고(용량), byte length와 SHA-256만 대조했다.

---

## CD-003 — 화면이 커질수록 주 콘텐츠가 좁아진다 (/my 계층 역전)

- severity: HIGH
- status: REPRODUCED
- scenario / route / state / viewport: S15 · S06 / `/my?demo=ux20` / `mobile_390x844`, `reflow_proxy_720x500`, `tablet_1024x768`, `desktop_1440x1000`
- user task: 저장한 계획 20개 중 하나를 찾아 연다.
- observed fact: 390·720에서는 목록이 전폭 1열이고 각 행이 3줄(제목 / 다음 할 일 / 날짜·진행)로 완전히 보이며 상태 필터가 4개 chip(`전체 진행 중 마친 계획 보관됨`), 하단에 `12개 더 보기`가 있다. 1024·1440에서는 같은 목록이 약 270px 좌측 rail로 압축되어 3번째 줄이 말줄임(`날짜 없음 · 식사·간식·목욕·산책·예방접종 정보 …`)으로 잘리고, 필터는 native `select` 하나로 축소되며, 화면의 약 2/3가 `계획을 열어 전체 내용 확인` 한 줄만 있는 빈 패널이다. `viewportParity`의 `visiblePlanRows`는 390/720에서 10, 1024/1440에서 22이고 `visibleInteractiveCount`는 25 대 33이다.
- expected invariant: 큰 viewport에서 정보 우선순위와 밀도가 유지되거나 향상된다.
- evidence IDs: `S15/01-my-390x844-full.png`, `S15/02-my-1024x768-full.png`, `S15/03-my-1440x1000-full.png`(= `S06/05-twenty-plans-library.png`), `S15/04-my-720x500-reflow-proxy-full.png`, `S15/state.json`
- hierarchy / interaction consequence: desktop에서 첫 화면의 주 작업(계획 고르기)이 가장 좁고 가장 잘리는 영역에서 일어나고, 가장 큰 영역은 아무 정보도 담지 않는다. 모바일에서 읽히던 요약 줄이 desktop에서 사라진다.
- counterexample tested: `모바일과 데스크톱이 같은 우선순위를 유지한다` — 깨졌다.
- CODEX_VERIFICATION_REQUEST: none
- smallest correction boundary: ≥1024 레이아웃에서 선택 전 상태의 열 배분(빈 detail 패널을 목록에 양보) 또는 rail 최소 폭·행 3줄 유지. 목록 컴포넌트 자체는 그대로 쓸 수 있다.
- not proven: `12개 더 보기`가 desktop에서 사라지는 것이 pagination 제거인지 rail 전용 무한 목록인지.

---

## CD-004 — overdue가 상태로 존재하지 않는다

- severity: HIGH
- status: REPRODUCED
- scenario / route / state / viewport: S19 · S15 · S06 / `/my?demo=ux20` / `current-my-overdue-mixed-state` / 390×844
- user task: 기한이 지난 할 일과 앞으로의 할 일을 구분한다.
- observed fact: fixture 기준 시각은 `2026-08-05T12:00:00+09:00`이다. `오늘 할 일 2개` 영역의 두 행은 `이사 D-30 준비 · 5월 27일부터`로 표시되고, 목록 행의 날짜는 `6월 6일`, `7월 27일`, `6월 10일`처럼 모두 기준 시각 이전인데 미래 날짜 행과 동일한 서체·색·배지 없이 렌더된다. 화면 어디에도 지연·overdue를 명시하는 label이 없다. S19 fixture는 `overdue` bucket을 명시적으로 기대한다(`expectedBucket: "overdue"`).
- expected invariant: 기한이 지난 Item은 저장된 계획 목록과 오늘 영역에서 상태로 식별된다.
- evidence IDs: `S19/dated-undated-overdue-fixture.json`, `S19/timezone-dst-parser-result.json`(`currentUi.textExcerpt`), `S19/current-my-overdue-mixed-state.png`(= `S15/01-my-390x844-full.png`), `S06/05-twenty-plans-library.state.json`(`my-flow-today-summary`, `data-today-count: "2"`)
- hierarchy / interaction consequence: `오늘 할 일`이라는 heading 아래에 70일 지난 항목이 들어가고, 유일한 신호는 `5월 27일부터`라는 접미사다. 사용자는 이것을 "5월 27일에 시작하는 일"로도 "5월 27일부터 밀린 일"로도 읽을 수 있다.
- counterexample tested: `화면 종류와 저장 상태를 label 없이도 구분할 수 있다`의 시간 축 변형 — 깨졌다. 저장 상태는 구분되지만 시간 상태는 구분되지 않는다.
- CODEX_VERIFICATION_REQUEST: none
- smallest correction boundary: 목록 행과 오늘 영역의 날짜 slot에 overdue 상태 token 추가. 레이아웃 변경 불필요.
- not proven: S19 fixture(`dated-future`/`undated`/`overdue`/`mixed-timed`)가 실제로 렌더된 화면은 제공되지 않았다. 이 finding은 `/my?demo=ux20` 20-plan 캡처에서만 재현했다. S19의 UI 하위 판정은 `BLOCKED_BY_MISSING_EVIDENCE`.

---

## CD-005 — 읽을 수 없는 저장 기록이 아무 표시 없이 사라진다

- severity: MEDIUM
- status: REPRODUCED
- scenario / route / state / viewport: S13 / `/my` / `missing-base`, `malformed` / 390×844
- user task: 저장해 둔 계획이 왜 목록에 없는지 확인하고 복구를 시도한다.
- observed fact: `02-missing-base-full.png`와 `03-malformed-full.png`는 동일 SHA의 같은 이미지이며, 두 상태 모두 `저장한 계획 1개`와 정상 행 하나만 보여준다. 손상·기반 누락 기록에 대한 알림, read-only 항목, 복구 동선이 화면에 없다. raw hash는 before/after 동일(`sourceBacked`, `missingBase`, `malformed`, `sentinel` 모두 `unchanged: true`)로 silent rewrite는 없다.
- expected invariant: 복구 불가·판독 불가 기록의 존재는 사용자에게 드러나고, 복구 또는 내보내기 동선이 있다.
- evidence IDs: `S13/01-source-backed-read-full.png`, `S13/02-missing-base-full.png`, `S13/03-malformed-full.png`, `S13/raw/before-after-hashes.json`, `S13/state.json`
- hierarchy / interaction consequence: 데이터는 남아 있는데 UI는 "없음"으로 말한다. 사용자는 손실로 오인하고 같은 계획을 다시 저장해 중복을 만든다.
- counterexample tested: `empty/error/archive/retry 상태에서 복구 행동이 명확하다` — 깨졌다.
- CODEX_VERIFICATION_REQUEST: none
- smallest correction boundary: 목록 하단에 `열 수 없는 기록 N개` 요약 행 1개와 상세/내보내기 링크. 저장 로직 변경 불필요.
- not proven: 두 상태가 실제로 픽셀 동일해서 같은 파일로 게시된 것인지, 같은 캡처가 두 state ID에 재사용된 것인지. manifest는 두 행을 별도로 등재한다.

---

## CD-006 — 사용자 화면에 내부 실패 문자열이 그대로 노출된다

- severity: MEDIUM
- status: REPRODUCED
- scenario / route / state / viewport: S12 / `/my` 결과 이동 confirm sheet / `receipt-storage-failure` / 390×844
- user task: 결과는 만들어졌지만 기록 저장이 실패한 상황을 이해하고 복구한다.
- observed fact: 한국어 문장 `결과는 만들었지만 기록을 남기지 못했어요.` 바로 아래에 영어 원문 `evidence receipt storage failure`가 보조 텍스트로 표시된다.
- expected invariant: 사용자 화면의 오류 사유는 제품이 소유한 언어로 쓰인다. 내부 진단 문자열은 UI 텍스트가 아니다.
- evidence IDs: `S12/04-receipt-storage-failure-full.png`, `S12/state.json`
- hierarchy / interaction consequence: 복구 버튼(`결과 기록만 다시 저장`)은 명확한데, 그 위의 사유 줄이 제품 언어를 벗어나 신뢰를 떨어뜨린다.
- counterexample tested: `오류 사유가 사용자 언어로 제공된다` — 깨졌다.
- CODEX_VERIFICATION_REQUEST: none
- smallest correction boundary: 실패 사유 문자열을 사용자용 카피로 매핑하고, 원문은 진단 로그로만 남긴다.
- not proven: 이 문자열이 failure injection 전용 경로에서만 나타나는지, 실제 저장 실패에서도 같은 문자열이 나오는지.

---

## CD-007 — 최종 확인 단계에서 결과 수가 줄어드는 이유가 가려진다

- severity: MEDIUM
- status: REPRODUCED
- scenario / route / state / viewport: S21 · S09 / `/my` 결과 이동 confirm dialog / `calendar-download-confirmation`, `01-calendar-confirmation` / 1024×768
- user task: 되돌릴 수 없는 결과 생성 직전에 무엇이 만들어지는지 확인한다.
- observed fact: routine 계획에서 confirm dialog는 `항목 3개`와 `만들 결과 1개`를 나란히 보여주지만, 그 차이의 사유(`날짜 없음 2개`, `· 날짜 없는 2개 남음`)는 dialog 뒤 패널에만 있고 dialog가 그 영역을 덮는다. 같은 dialog 구조에서 이사 계획은 `항목 24개 / 만들 결과 24개`로 차이가 없다.
- expected invariant: 되돌릴 수 없는 action 직전 화면에서 손실·제외의 사유를 볼 수 있다.
- evidence IDs: `S21/calendar-download-confirmation.png`, `S21/transport-manifest.json`, `S20/routine-unit-counts.json`, `S09/01-calendar-confirmation-full.png`
- hierarchy / interaction consequence: 두 숫자의 불일치는 보이지만 원인은 보이지 않는다. 사용자는 3개를 옮겼다고 믿고 1개만 받는다.
- counterexample tested: `material risk가 disclosure를 열기 전에도 최소한 존재를 알 수 있다` — 일방향·중복 경고에서는 깨지지 않았다(반증 로그 참조). 그러나 "무엇이 빠지는가"에 대해서는 깨졌다.
- CODEX_VERIFICATION_REQUEST: none
- smallest correction boundary: dialog 안 `만들 결과` 값 옆에 제외 사유 한 줄(`날짜 없는 2개 제외`) 추가.
- not proven: dialog를 스크롤하면 사유가 나타나는지. 제공된 캡처에서는 dialog 본문이 전부 보인다.

---

## CD-008 — 편집기의 `저장` 어휘가 실제 저장과 충돌한다

- severity: MEDIUM
- status: REPRODUCED
- scenario / route / state / viewport: S03 / `/f/moving-d30-basic` 계획 수정 sheet / `01-plan-editor-dirty-before-cancel`, `02-cancel-discard-confirmation` / 390×844
- user task: 공개 계획을 손보고 결과를 확인한 뒤 저장 여부를 결정한다.
- observed fact: 편집기의 확정 버튼은 `변경 반영`이고, 이 동작은 지속 저장이 아니다(`S03/editor-apply.storage-after.json` = 35 bytes). 같은 편집기의 취소 확인 dialog는 `저장하지 않은 변경을 버릴까요?`라고 묻는다. 실제 지속 저장 CTA는 바깥 화면의 `내 계획에 저장`이다.
- expected invariant: 하나의 동사(`저장`)는 하나의 mutation을 가리킨다.
- evidence IDs: `S03/01-plan-editor-dirty-before-cancel.png`, `S03/02-cancel-discard-confirmation.png`, `S03/03-after-cancel.png`, `S03/04-after-plan-apply.png`, `S03/editor-apply.storage-after.json`, `S03/editor-cancel.storage-after.json`
- hierarchy / interaction consequence: `변경 반영`을 누른 사용자는 dialog 문구를 근거로 이미 저장했다고 추론할 수 있고, 그 상태로 이탈하면 편집이 사라진다.
- counterexample tested: `Item과 plan의 편집·완료 범위가 시각적으로 구분된다` — plan/Item 범위는 구분됐으나(현재/조정 후 diff 카드), 저장 범위 어휘는 구분되지 않는다.
- CODEX_VERIFICATION_REQUEST: none
- smallest correction boundary: dialog 문구를 `반영하지 않은 변경을 버릴까요?`로 바꾸고 `저장`은 지속 저장 CTA에만 남긴다.
- not proven: `변경 반영` 이후 이탈 시 실제 데이터 손실 여부(정적 evidence로 확인 불가).

---

## CD-009 — 계획 편집기에 이름 없는 interactive 요소가 1개 있다

- severity: MEDIUM
- status: NEEDS_CODEX_VERIFICATION
- scenario / route / state / viewport: S14 / 저장한 계획 편집기 / `01`, `08`, `24`, `50` items / 390×844
- user task: 스크린 리더로 편집기의 모든 컨트롤을 식별한다.
- observed fact: `S14/state.json`의 네 밀도 상태 모두 `unnamedInteractiveCount: 1`이다. 같은 지표가 `/my`(S15), `/flow-maps`(S16)에서는 `0`이다. 어떤 요소인지는 state trace에 기록되어 있지 않다.
- expected invariant: 모든 interactive 요소는 accessible name을 갖는다.
- evidence IDs: `S14/state.json`, `S14/01-01-items-editor-full.png`, `S14/04-50-items-editor-full.png`, `S15/state.json`, `S16/state.json`
- hierarchy / interaction consequence: 항목 수와 무관하게 항상 1개이므로 반복 요소가 아니라 편집기 shell의 고정 컨트롤일 가능성이 높다(예: 시트 핸들·닫기·정렬 핸들).
- counterexample tested: `accessible name이 핵심 경로 전체에서 채워져 있다` — 편집기에서 깨진다.
- CODEX_VERIFICATION_REQUEST: attached

```md
- scenario: S14 (01/08/24/50 items, 저장한 계획 편집기)
- claim needing runtime verification: `unnamedInteractiveCount: 1`에 해당하는 요소의 selector/testId와 역할
- exact action sequence: 저장한 계획 열기 → `여러 할 일 조정`(계획 수정 sheet) 열기 → sheet 내부 accessibility tree 수집
- expected storage/artifact observation: 없음(읽기 전용)
- required raw evidence: 이름 없는 요소의 testId·tag·role·bounding box, 해당 요소의 키보드 도달 가능 여부
```

- smallest correction boundary: 해당 컨트롤에 `aria-label` 1개 추가.
- not proven: 요소의 정체와 키보드 도달 여부.

---

## CD-010 — 오류 요약은 "표시된 항목"을 가리키지만 필드에는 표시가 없다

- severity: MEDIUM
- status: REPRODUCED
- scenario / route / state / viewport: S03 / `/f/moving-d30-basic` 할 일 수정 sheet / `07-item-validation-error` / 390×844
- user task: 빈 제목으로 저장을 시도한 뒤 무엇을 고쳐야 하는지 찾는다.
- observed fact: 상단 요약은 `h3 확인이 필요한 항목이 있습니다` + `표시된 항목을 확인한 뒤 다시 시도해 주세요.`다. 그러나 대상 입력(`public-flow-item-editor-title-input`)의 `accessibleName`은 빈 문자열이고, 필드 옆·아래에 오류 문구가 없으며 시각적 표시는 포커스 링뿐이다. `validation[0].validationMessage`는 브라우저 기본 문구 `이 입력란을 작성하세요.`다.
- expected invariant: 오류 요약이 지시하는 "표시"가 필드 수준에 실제로 존재하고, 필드는 프로그램적으로 이름과 오류를 갖는다.
- evidence IDs: `S03/07-item-validation-error.png`, `S03/07-item-validation-error.state.json`(`validation`, `focusedTestId`, actions[] 항목의 빈 `accessibleName`)
- hierarchy / interaction consequence: 시각 사용자는 포커스 링을 오류 표시로 해석해야 하고, 스크린 리더 사용자는 이름 없는 입력에 도달한다.
- counterexample tested: `오류 복구가 핵심 경로에서 작동한다` — 도달은 하지만 식별이 깨진다.
- CODEX_VERIFICATION_REQUEST: none
- smallest correction boundary: `할 일` 라벨을 입력에 연결하고 필드 하단 오류 문구 1줄 추가.
- not proven: 실제 스크린 리더 발화(S16 `screenReaderSpeech: NOT_ASSESSED`).

---

## CD-011 — 같은 "다음 할 일" 영역이 화면마다 다른 이름을 갖는다

- severity: MEDIUM
- status: REPRODUCED
- scenario / route / state / viewport: S04 · S05 · S07 · S13 / `/my` 계획 상세 / 여러 상태 / 390×844
- user task: 저장한 계획을 열고 지금 해야 할 일을 찾는다.
- observed fact: 동일 위치·동일 구조의 영역이 `다음 할 일 · 3개 먼저`(S04/01, S05/01), `이어서 할 일 · 3개`(S07/01, S07/07), `다음 날짜 묶음 · 3개`(S13/01)로 나타난다.
- expected invariant: 같은 역할의 영역은 같은 이름을 갖는다.
- evidence IDs: `S04/01-first-save-destination.png`, `S05/01-saved-transfer-confirmation.png`, `S07/01-item-detail-open.png`, `S07/07-after-reload.png`, `S13/01-source-backed-read-full.png`
- hierarchy / interaction consequence: 계획을 옮겨 다닐 때마다 같은 자리의 의미를 다시 배워야 한다.
- counterexample tested: `공유 role이 화면 간 일관된다` — 깨졌다.
- CODEX_VERIFICATION_REQUEST: none
- smallest correction boundary: 세 문자열을 하나로 통일. 상태별 차이가 의도라면 그 차이를 부제로 표기.
- not proven: 세 이름이 날짜 유무·legacy 여부에 따라 의도적으로 갈리는지. S07(날짜 없음)과 S13(날짜 없음)이 서로 다른 이름을 쓰므로 단순한 상태 매핑으로는 설명되지 않는다.

---

## CD-012 — primary action의 색이 route마다 다르다

- severity: MEDIUM
- status: REPRODUCED
- scenario / route / state / viewport: S01 · S02 · S04 · S06 · S10 / `/flows`, `/f/[slug]`, `/my`, `/flow-maps/[map]` / 390×844
- user task: 화면에서 주 행동을 즉시 찾는다.
- observed fact: `/flows`의 `계획 찾기`는 진한 초록, `/f/[slug]`의 `내 계획에 저장`·시트의 `복사하기`·`파일 만들기`·`변경 반영`은 검정, `/my` 빈 상태의 `콘텐츠 고르러 가기`와 `/flow-maps`의 `다시 저장`은 파랑이다. 실패 후 재시도 primary도 S04/04에서는 검정, S10/05에서는 파랑이다.
- expected invariant: 같은 역할(primary)은 같은 시각 token을 쓴다.
- evidence IDs: `S01/01-hit-result.png`, `S02/01-all-dated-public-result.png`, `S04/04-failure-injection-save-error.png`, `S06/01-zero-plans-library.png`, `S10/05-save-all-failure-full.png`
- hierarchy / interaction consequence: 색이 route를 뜻하는지 위험도를 뜻하는지 알 수 없어, primary 식별을 매번 위치로 다시 해야 한다.
- counterexample tested: `primary action은 하나이고 보조 행동과 경쟁하지 않는다` — 개수는 대체로 지켜지나 시각 token이 흔들린다.
- CODEX_VERIFICATION_REQUEST: none
- smallest correction boundary: primary fill을 하나로 고정하고 route별 강조는 다른 축(위치·크기)으로 옮긴다.
- not proven: 색 차이가 브랜드 sub-surface 규칙인지 여부.

---

## CD-013 — 날짜 없는 공개 계획의 하단에 세 개의 다음 단계가 경쟁하고 helper 문장이 깨진다

- severity: MEDIUM
- status: REPRODUCED
- scenario / route / state / viewport: S12 / `/f/moving-d30-basic` (날짜 미설정) / `06-back-closes-editor` / 390×844
- user task: 날짜를 정할지, 저장할지, 그냥 복사할지 고른다.
- observed fact: 하단에 `계획 수정` + `이사일 정하기`(primary), 그 아래 박스 안에 `저장 없이 체크리스트 복사`와 helper `내 계획에 저장되지 않음 · 보관하려면 저장 버튼`이 2줄로 깨져 들어가고, 그 아래 평문 링크처럼 보이는 `날짜 없이 내 계획에 저장`이 있다. helper 문장은 줄바꿈으로 `보관하려면` / `저장 버튼` 조각이 되어 문장으로 읽히지 않으며, 가리키는 "저장 버튼"은 바로 옆에 없다.
- expected invariant: 한 화면의 다음 단계는 우선순위가 구분되고, 보조 설명은 완결된 문장으로 읽힌다.
- evidence IDs: `S12/06-back-closes-editor-full.png`, `S12/state.json`
- hierarchy / interaction consequence: 세 경로가 서로 다른 mutation(날짜 설정 / 저장 없는 일방향 복사 / 날짜 없이 지속 저장)인데 위계가 색·크기만으로 구분되고 설명은 조각난다.
- counterexample tested: `primary action은 하나이고 보조 행동과 경쟁하지 않는다` — 깨졌다.
- CODEX_VERIFICATION_REQUEST: none
- smallest correction boundary: helper를 버튼 아래 전폭 1줄로 내리고 문장을 완결형으로. 세 action의 위계 token 재배치.
- not proven: 390px 밖의 폭에서도 같은 줄바꿈이 나오는지.

---

## CD-014 — `바로 저장`이 즉시 저장을 약속하지만 부제는 추가 선택을 예고한다

- severity: MEDIUM
- status: REPRODUCED
- scenario / route / state / viewport: S01 / `/flows` / `01-hit-result` / 390×844
- user task: 이미 만들어진 계획을 찾은 뒤 다음 행동을 고른다.
- observed fact: 결과 카드의 CTA는 `미리보기에서 편집`(primary)이고, 그 아래 행이 `바로 저장`과 우측 부제 `시작일과 결과 형식 선택`을 같은 행에 둔다. 같은 카드 위쪽 `옮길 수 있는 형태` chip 목록에는 `캘린더 · 메모 문서 · 체크리스트`와 함께 `내 계획`이 나란히 들어 있다.
- expected invariant: label만으로 mutation을 예측할 수 있다. 저장 목적지와 결과 형식은 서로 다른 축이다.
- evidence IDs: `S01/01-hit-result.png`, `S01/01-hit-result.state.json`
- hierarchy / interaction consequence: `바로 저장`은 즉시 지속 저장을 뜻하는 것처럼 읽히지만 부제는 두 개의 선택이 더 남았다고 말한다. `내 계획`이 형식 chip에 섞이면 저장(내부 상태)과 외부 결과 형식이 같은 종류로 보인다.
- counterexample tested: `CTA label만 보고 mutation과 다음 결과를 예측할 수 있다` — 깨졌다.
- CODEX_VERIFICATION_REQUEST: none
- smallest correction boundary: `바로 저장` → 실제 다음 화면을 반영하는 label로 교체, `내 계획` chip을 형식 목록에서 분리.
- not proven: `바로 저장`을 눌렀을 때의 실제 다음 화면(정적 evidence 없음).

---

## CD-015 — 공개 미리보기가 아직 없었던 저장을 단정한다

- severity: LOW
- status: REPRODUCED
- scenario / route / state / viewport: S10 · S16 / `/flow-maps/curated-allblanc-*` / `01-choose-child` / 390×844
- user task: Flow Map에서 어떤 하위 계획을 쓸지 고른다.
- observed fact: 화면 상단 섹션 heading이 `저장될 전체 계획 2개`이고 그 아래에 `계획 선택하기`가 온다. "아직 저장되지 않는다"는 정정은 `?` help dialog 안에만 있다(`이 단계에서는 아직 내 계획에 저장되지 않습니다`).
- expected invariant: 저장 상태에 대한 단정은 화면 표면에서 참이어야 한다.
- evidence IDs: `S10/01-choose-child-full.png`, `S16/state.json`(`ariaSnapshot`), `S10/state.json`, `S10/storage-before.json`(35 bytes)
- hierarchy / interaction consequence: heading은 완료형 사실처럼 읽히고, 정정은 선택형 disclosure 뒤에 있다.
- counterexample tested: `material risk/상태가 disclosure를 열기 전에도 알 수 있다` — 위험 경고는 통과했으나 저장 상태 단정에서는 문구가 반대로 작동한다.
- CODEX_VERIFICATION_REQUEST: none
- smallest correction boundary: heading을 `저장하면 함께 담기는 계획 2개` 류로 조건형 전환.
- not proven: 이 문구가 save-all 단계 전용 heading을 재사용한 것인지.

---

## CD-016 — 같은 영역을 부르는 이름이 viewport와 상태마다 다르다

- severity: LOW
- status: REPRODUCED
- scenario / route / state / viewport: S06 · S15 / `/my` / `zero`, `twenty` / 390×844, 1024×768, 1440×1000
- user task: 저장한 계획이 모인 영역을 인지한다.
- observed fact: 같은 목록 영역의 kicker가 390·720에서는 `저장한 계획 관리`, 1024·1440에서는 `라이브러리`, 빈 상태에서는 `계획 목록`이다. 빈 상태 CTA는 `콘텐츠 고르러 가기`로, `콘텐츠`는 다른 화면의 사용자 문구에 등장하지 않는다.
- expected invariant: 영역 이름과 도메인 어휘가 화면·폭에 따라 바뀌지 않는다.
- evidence IDs: `S06/01-zero-plans-library.png`, `S06/01-zero-plans-library.state.json`, `S06/05-twenty-plans-library.png`, `S15/01-my-390x844-full.png`, `S15/02-my-1024x768-full.png`
- hierarchy / interaction consequence: 같은 화면을 폭만 바꿔 열어도 다른 이름을 만난다.
- counterexample tested: `브랜드·내부 identity와 사용자 행동 어휘가 구분된다` — 부분적으로 깨졌다.
- CODEX_VERIFICATION_REQUEST: none
- smallest correction boundary: 세 문자열 통일, `콘텐츠` 제거.
- not proven: `라이브러리`가 desktop 전용 의도인지.

---

## CD-017 — 새 사본이 같은 이름으로 저장된다

- severity: LOW
- status: NEEDS_CODEX_VERIFICATION
- scenario / route / state / viewport: S04 / `/f/moving-d30-basic` → `/my` / `02-existing-copy-duplicate-choice`, `03-new-copy-destination` / 390×844
- user task: 기존 저장본을 두고 새 사본을 만든 뒤 둘을 구분한다.
- observed fact: `duplicate.saved-records.json`의 두 record는 서로 다른 `personalCopyKey`와 anchor(`2031-10-01`, `2031-11-01`)를 갖지만 `personalTitle`이 둘 다 `이사 D-30 준비`다. 선택 dialog는 `기존 저장본 덮어쓰기`/`새 사본 만들기`를 명확히 설명하고 미선택 시 primary가 비활성(`저장 방식 선택 필요`)이라는 점은 잘 작동한다.
- expected invariant: 같은 목록에 놓이는 두 record는 이름만으로 구분 가능하거나, 구분 축이 목록 행에 표시된다.
- evidence IDs: `S04/02-existing-copy-duplicate-choice.png`, `S04/03-new-copy-destination.png`, `S04/duplicate.saved-records.json`, `S04/save-and-duplicate.storage-after.json`
- hierarchy / interaction consequence: 라이브러리 행은 제목·요약·날짜·진행으로 구성되므로 두 사본은 날짜 줄로만 갈린다.
- counterexample tested: `duplicate 이후에도 identity를 사용자 화면에서 구분할 수 있다` — record 수준에서는 깨진다.
- CODEX_VERIFICATION_REQUEST: attached

```md
- scenario: S04 (save → duplicate)
- claim needing runtime verification: 사본 2개가 존재하는 상태의 `/my` 라이브러리 렌더
- exact action sequence: 공개 계획 저장 → 같은 계획 재저장 → `새 사본 만들기` 선택 → `/my`로 이동 → 목록 캡처
- expected storage/artifact observation: 두 `flow:saved:personal-copy:*` key 유지, 목록 행 2개
- required raw evidence: 목록 전체 화면 캡처와 두 행의 accessible name
```

- smallest correction boundary: 사본 생성 시 제목에 구분자 부여 또는 목록 행에 저장 시각 표기.
- not proven: 두 사본이 실제 목록에서 어떻게 보이는지(해당 캡처 없음).

---

## CD-018 — 사용자가 받는 파일 이름이 UI 어휘와 다르다

- severity: LOW
- status: REPRODUCED
- scenario / route / state / viewport: S21 / `/my` 결과 이동 / `calendar-download-confirmation` / 1024×768
- user task: 내려받은 파일을 나중에 알아본다.
- observed fact: 다운로드 파일명은 `세탁기-통세척-월간-관리-all-calendar.ics`다. `all`과 `calendar`는 화면 어휘(`계획 전체`, `캘린더 파일`)에 없는 토큰이다.
- expected invariant: 산출물 이름이 화면에서 고른 범위·형식 어휘를 따른다.
- evidence IDs: `S21/transport-manifest.json`, `S20/routine-unit-counts.json`, `S21/calendar-download-confirmation.png`
- hierarchy / interaction consequence: 파일 이름이 범위·형식의 기록이라면 UI와 같은 단어여야 추적이 된다.
- counterexample tested: `결과 label과 실제 산출물이 같은 어휘를 쓴다` — 깨졌다.
- CODEX_VERIFICATION_REQUEST: none
- smallest correction boundary: 파일명 토큰을 화면 어휘와 동일한 표기로 매핑.
- not proven: OS 파일 시스템 제약에 따른 의도적 ASCII 토큰인지.

---

## CD-019 — `화면 회차`라는 단위가 이 화면에만 등장한다

- severity: LOW
- status: REPRODUCED
- scenario / route / state / viewport: S21 · S20 / `/my` 결과 이동 패널 (routine 계획) / `calendar-download-confirmation` / 1024×768
- user task: 반복 계획에서 몇 개가 만들어지는지 센다.
- observed fact: 패널이 `캘린더 파일 1개 · 화면 회차 0개`를 함께 표기하고, dialog는 `항목 3개 / 만들 결과 1개`를 쓴다. `회차`는 다른 화면에 정의나 재등장이 없다. manifest는 `itemCount 1 / recurrenceSeriesCount 1 / veventCount 1 / projectionOutputCount 1 / artifactOutputCount 1`로 단위를 분리하고, 현재 런타임 cross-check는 `itemCount "3" / seriesCount "1" / veventCount 1`이다.
- expected invariant: 단위 이름은 정의되고 재사용된다. 단위를 하나의 숫자로 합치지 않는다(합치지는 않았다).
- evidence IDs: `S21/calendar-download-confirmation.png`, `S20/routine-unit-counts.json`, `S21/transport-manifest.json`
- hierarchy / interaction consequence: 사용자는 `0개`를 실패로 읽을 수 있다.
- counterexample tested: `Item 수·series 수·VEVENT 수를 한 숫자로 합치지 않는다` — 깨지지 않았다. 다만 세 번째 단위의 이름이 불투명하다.
- CODEX_VERIFICATION_REQUEST: none
- smallest correction boundary: `화면 회차` 문자열 교체 또는 제거.
- not proven: `회차`가 앱 내 캘린더 화면의 occurrence 수를 뜻하는지.

---

## CD-020 — 긴 계획 이름이 헤더에서 잘리고 전체를 볼 방법이 없다

- severity: LOW
- status: REPRODUCED
- scenario / route / state / viewport: S08 / `/my` 계획 상세 / `05-saved-editor-reload-persisted` / 390×844
- user task: reload 후 지금 보고 있는 계획이 무엇인지 확인한다.
- observed fact: 헤더 제목이 `저장 실패 뒤 다시 저장한 계획 …`으로 잘리고, 같은 화면에 전체 제목을 보여주는 요소가 없다.
- expected invariant: 현재 대상의 identity는 한 화면에서 완전히 확인 가능하다.
- evidence IDs: `S08/05-saved-editor-reload-persisted.png`, `S08/05-saved-editor-reload-persisted.state.json`, `S08/reloaded-saved-record.raw.json`
- hierarchy / interaction consequence: 사본이 여러 개일 때(CD-017) 잘린 제목만으로는 대상을 특정할 수 없다.
- counterexample tested: `reload 후 상태·대상이 예측 가능하다` — 상태는 유지되지만 identity 표시가 잘린다.
- CODEX_VERIFICATION_REQUEST: none
- smallest correction boundary: 헤더 제목 2줄 허용 또는 상세 영역에 전체 제목 노출.
- not proven: 다른 폭에서의 잘림 여부.

---

## 범위 밖 기록

- `OUT_OF_SCOPE_ROUTE_DEBT`: 없음. 제공된 정적 evidence에서 creator·text authoring·publishing·text-to-flow 경로는 노출되지 않았다.
