# FlowMe P33 publish 안정화 및 P34 이관 계획

- 작성일: 2026-07-25 KST
- 문서 상태: 실행 전 통합 계획
- 작업 대상: `D:\flowme2605\flow-p33-program-planning`
- 기준 branch: `codex/p33-integrated-program-plan`
- 기준 HEAD: `b4ba62ea5f8aa2a87b27558aafbba49ed9d4dc28`
- 기준 origin/main: `e491d99ca61ecae4fd0dd009f785e737b6a59516`
- Draft PR: [#156](https://github.com/knhbae/flowme2605/pull/156)
- Preview: [P33 Vercel preview](https://flowme2605-git-codex-p33-integrated-program-plan-flowme.vercel.app)
- 현재 판정: `bounded_fix_before_publish`
- 실제 관찰 사용자: 0명

> 이 문서는 Claude Design의 `FlowMe P31 구조 검토 요청3.zip`과 P33 독립 코드 검토 결과를 결합한 다음 실행 계획이다. 설계 시뮬레이션, 자동 테스트, screenshot은 실제 사용자 관찰로 계산하지 않는다.

## 1. 목표

P33을 바로 확장하거나 P34 UX를 섞지 않고 아래 순서로 마감한다.

1. 개인 메모 손실 가능성과 canonical ID 이중 규칙을 먼저 제거한다.
2. Home, Flow 찾기, URL lookup, alias가 같은 canonical 결과를 약속하도록 남은 cross-entry 불일치를 닫는다.
3. 기존 5항목 사본과 새 24항목 사본을 자동 병합하거나 삭제하지 않고 사용자가 안전하게 선택하도록 한다.
4. memo segmentation, build artifact, 전체 E2E의 간헐 실패를 원인 기준으로 안정화한다.
5. 독립 preview 재검증을 통과한 뒤에만 P34의 24항목 모바일 UX와 시각 구조 개선으로 넘어간다.

이번 계획의 성공은 기능 수가 아니라 다음 불변식으로 판단한다.

```text
같은 source + 같은 user job + 같은 editorial variant
→ 하나의 canonical identity
→ entry가 달라도 같은 title/count/artifact
→ 개인 메모·완료·run·occurrence·export identity 보존
```

## 2. 입력 자료와 증거 우선순위

### 2.1 입력 자료

- Claude Design 검토:
  - `D:\flowme2605\flow-mvp\claude_work\FlowMe P31 구조 검토 요청3.zip`
  - 판정: `bounded_fix_before_publish`
- Codex 검토:
  - P33 제외 상태와 개인 메모 충돌
  - canonical ID factory와 registry constant 불일치
  - memo segmentation, build artifact, whitespace 안정성 문제
- 현재 P33 구현:
  - `lib/flow/canonical-flow-registry.ts`
  - `lib/flow/canonical-flow-storage.ts`
  - `components/flow/AppClient.tsx`
  - `lib/flow/types.ts`
  - `tests/e2e/p33-cross-entry-canonical.spec.ts`
- 기존 P33 spec/evidence:
  - `docs/specs/2026-07-24-p33-cross-entry-canonical-alignment/`
  - `docs/content-audit/2026-07-24-p33-cross-entry-canonical-alignment-evidence/`

### 2.2 판단 우선순위

1. 현재 source와 재현 가능한 저장 데이터
2. 현재 branch의 unit/E2E 결과
3. 현재 preview interaction
4. 구조화된 P33 evidence
5. Claude Design 시뮬레이션과 제안
6. 과거 P31/P32 자료

검토 제안이 데이터 보존 원칙과 충돌하면 데이터 보존을 우선한다.

## 3. 통합 판정

### 3.1 잘 된 부분

- AJD moving alias가 canonical `/f/moving-d30-basic`으로 연결된다.
- canonical 24항목 결과가 My Flow, Calendar, export까지 이어지는 기본 경로가 생겼다.
- 5항목과 24항목 사본을 자동 병합하거나 삭제하지 않는다.
- artifact 선택이 일부 대표 Flow에서 실제 결과를 바꾼다.
- raw RRULE을 사용자 문구로 바꾸는 경로가 추가됐다.
- source, personal overlay, execution run, occurrence, export identity를 분리하는 기존 계약은 유지됐다.

### 3.2 publish 전에 반드시 닫을 문제

| 우선순위 | 문제 | 근거 | 이번 계획의 처리 |
| --- | --- | --- | --- |
| Blocking | 항목 제외 시 `note`가 `excluded_on_start`로 덮여 개인 메모가 손실될 수 있음 | current source + Codex 검토 | P33-HF01 |
| Release blocking | registry ID와 factory ID가 달라 동일 identity triple이 두 ID를 만들 수 있음 | current source + Codex 검토 | P33-HF02 |
| High | URL lookup preview와 복사 결과가 legacy 5항목인데 저장 결과는 canonical 24항목임 | Claude 검토 | P33-HF03 |
| High | 기존 5항목/24항목 사본 선택에 영구적인 `따로 유지` 상태가 없음 | Claude 검토 | P33-HF04 |
| High | `/flows` server fallback, query가 붙은 source URL, restart origin metadata가 canonical 계약과 어긋남 | Claude 검토 | P33-HF03, HF05 |
| High | memo segmentation 저장 직후 목록 반영, build artifact 생성이 간헐적으로 불안정함 | Codex 검토 | P33-HF06 |
| Merge gate | GitHub dependency audit가 현재 red 상태임 | current PR checks | 별도 P33-OPS01 |

### 3.3 P34로 넘길 문제

- 24항목 모바일 detail이 지나치게 길고 row와 outline이 반복되는 문제
- canonical save-before에서 전체 결과, 조정, 저장 명령의 시각 위계
- My Flow에서 canonical 사본 관리와 실행 workspace의 정보 밀도
- reconciliation 화면의 문장·버튼 위계와 이해 가능성
- Home과 Flow 찾기의 역할 차이를 유지하면서 같은 Flow임을 인지시키는 시각 문법

이 항목들은 중요하지만 데이터 손실과 identity 불일치를 고치는 hotfix에 섞지 않는다.

## 4. 유지할 제품·데이터 계약

### 4.1 반드시 유지

- 4탭 IA
- Home은 사용 예시, Flow 찾기는 탐색, URL lookup은 source 해석이라는 역할
- public `/f` shell
- P32 focused My Flow workspace
- 날짜 없는 Item 모델
- 완료와 다시 열기
- whole / selected / current export scope
- source / personal overlay / execution run / occurrence / export identity 분리
- 기존 5항목 개인 사본과 완료·메모·run 기록

### 4.2 금지

- 5항목과 24항목을 배열 순서나 제목 유사도로 자동 병합
- 기존 localStorage key 삭제
- 최신 `savedAt` 사본만 남기기
- source URL 하나만으로 canonical identity 결정
- 개인 메모를 내부 상태 sentinel로 재사용
- recurrence series와 occurrence identity 재생성
- P34 시각 개편을 P33 hotfix에 포함
- dependency 일괄 업그레이드를 P33 기능 commit에 포함
- 자동 QA를 실제 사용자 검증으로 표현

## 5. 실행 프로그램

## P33-HF00. 기준선·재현 fixture 고정

### 목적

수정 전에 현재 실패를 테스트와 fixture로 재현해 false green을 막는다.

### 작업

1. branch, HEAD, origin/main, dirty 상태를 다시 기록한다.
2. 다음 실패 fixture를 먼저 만든다.
   - 개인 메모가 있는 Item 제외·복구
   - batch 제외·복구
   - registry canonical ID와 factory ID 비교
   - arbitrary query가 붙은 AJD URL lookup
   - URL lookup preview 5항목과 저장 24항목 차이
   - 5항목/24항목 사본 `따로 유지`
   - memo draft 분할 저장 직후 My Flow 반영
3. 기존 preview storage와 새 fixture storage를 구분한다.
4. 이전 screenshot이나 isolated retry 성공을 현재 통과 결과로 사용하지 않는다.

### 완료 기준

- 각 문제에 red test 또는 구조화 diagnostic이 있다.
- 데이터 손실 fixture는 수정 전 실제 실패를 증명한다.
- app UI를 아직 바꾸지 않는다.

## P33-HF01. 개인 제외 상태와 메모 소유권 분리

### 목적

`FlowItemState.note`를 사용자 메모 전용으로 되돌리고, Flow 제외 상태를 별도 필드로 관리한다.

### 권장 계약

최소 additive 필드:

```ts
type FlowItemState = {
  skipped?: boolean;
  note?: string;
  personalOrder?: number;
  personalExcluded?: boolean;
};
```

의미:

- `note`: 사용자 개인 메모
- `personalExcluded`: 개인 Flow 구성에서 제외됨
- `skipped`: 실행 회차를 건너뜀
- tombstone/delete: 개인 구조 overlay가 별도로 관리

`skipped`, `personalExcluded`, delete를 서로 대체해서 사용하지 않는다.

### 공통 adapter

직접 문자열 비교를 consumer마다 반복하지 않고 아래 역할의 공통 helper를 둔다.

- `isFlowItemPersonallyExcluded`
- `setFlowItemPersonalExclusion`
- `normalizeLegacyFlowItemState`
- `getUserFacingFlowItemNote`

정확한 이름은 저장소 관례에 맞추되 계약은 하나만 둔다.

### legacy 처리

- 기존 `{ skipped: true, note: "excluded_on_start" }`는 제외 상태로 읽는다.
- sentinel은 Calendar, checklist, sheet, memo, ICS에 사용자 메모로 노출하지 않는다.
- legacy record를 읽는 즉시 파괴적으로 다시 쓰지 않는다.
- 사용자가 다음 제외·복구 변경을 저장할 때 새 필드를 쓰는 lazy normalization을 우선한다.
- 일반 사용자 메모는 제외·복구 중 변경하거나 삭제하지 않는다.

### 교체할 consumer

- public save-before 조정
- My Flow 단건 `Flow에서 제외`
- batch 제외·복구
- 설정 재조정
- included Item 재선택
- Calendar membership
- checklist/sheet/memo/ICS export eligibility
- backup/restore

### 필수 테스트

- 메모 작성 → 제외 → reload → 복구 후 메모 동일
- batch 제외 → reload → 복구 후 메모 동일
- 제외 중에도 raw 사용자 메모 보존
- 제외 Item의 Calendar/export membership 0
- 복구 후 Calendar/export 재포함
- sentinel 사용자 export hit 0
- `skipped` occurrence가 Flow 구성에서 사라지지 않음
- malformed legacy state가 Item 자체를 삭제하지 않음

### acceptance marker

- `P33-EXCLUSION-NOTE-SEPARATION`
- `P33-LEGACY-SENTINEL-SAFE-READ`
- `P33-EXCLUSION-PROJECTION-PARITY`

## P33-HF02. canonical ID 직렬화 단일화

### 목적

같은 `canonicalSourceId + userJobId + editorialVariantId`가 언제나 같은 `canonicalFlowId`를 만들도록 한다.

### 결정

- `createCanonicalFlowId()`를 유일한 직렬화 정본으로 사용한다.
- registry의 `canonicalFlowId` constant도 factory 결과에서 파생한다.
- alias, origin metadata, reconciliation, backup/restore가 같은 ID를 사용한다.
- source URL 문자열 자체를 ID로 쓰지 않는다.

### branch-only compatibility

P33은 production에 아직 없으므로 production migration은 만들지 않는다. 다만 기존 preview나 로컬 P33 metadata가 수동 ID를 저장했을 수 있으므로 다음 bounded compatibility를 제공한다.

1. 이전 P33 ID를 legacy canonical ID alias로 읽는다.
2. 새 write는 factory ID만 사용한다.
3. old/new record가 동시에 있으면 자동 덮어쓰지 않고 diagnostic을 남긴다.
4. backup에는 원래 key와 resolved canonical ID를 모두 보존한다.
5. production 기존 Flow 저장 key는 변경하지 않는다.

### 필수 테스트

- `createCanonicalFlowId(AJD triple) === registry.identity.canonicalFlowId`
- 모든 alias가 같은 factory ID로 resolve
- origin metadata와 reconciliation key가 같은 ID 사용
- backup → restore 후 canonical ID 유지
- old preview metadata dual-read
- 다른 user job은 다른 canonical ID
- malformed ID가 기존 saved Flow를 삭제하지 않음

### acceptance marker

- `P33-CANONICAL-ID-FACTORY-ONLY`
- `P33-CANONICAL-ID-COMPAT-READ`
- `P33-NO-PRODUCTION-MIGRATION`

## P33-HF03. URL lookup·fallback·canonical preview 정합

### 목적

URL lookup에서 보여준 결과와 실제 저장되는 canonical 결과가 같게 한다.

### 작업

1. AJD canonical alias hit 시 preview, count, artifact, 복사 결과를 canonical 24항목 projection에서 읽는다.
2. URL lookup이 legacy 5항목 request/copy builder를 사용하지 않게 한다.
3. source URL canonicalization을 registry matcher 한 곳에 둔다.
4. hash와 tracking query는 제거한다.
5. source identity에 필요한 allowlisted query만 보존한다.
6. 임의 query가 붙어도 등록 source를 안전하게 재발견한다.
7. `/flows` SSR fallback inventory와 hydrated inventory의 title, route, promise를 맞춘다.
8. Home 차량 Flow의 약속과 detail 기본 artifact도 별도 fixture로 확인한다.
9. fake Item이나 추정 count를 만들지 않는다.

### 필수 테스트

- canonical URL, query URL, alias URL이 같은 detail route
- lookup preview count 24
- lookup copy/export count 24
- save receipt count 24
- SSR fallback과 hydrated inventory parity
- unknown URL은 기존 miss 흐름 유지
- 다른 user job source를 잘못 합치지 않음

### acceptance marker

- `P33-URL-LOOKUP-CANONICAL-PARITY`
- `P33-SOURCE-URL-NORMALIZATION`
- `P33-FALLBACK-INVENTORY-PARITY`

## P33-HF04. 5항목·24항목 사본 reconciliation 완성

### 목적

기존 사용자 데이터를 보존하면서 사본 관계를 사용자가 예측 가능하게 결정하게 한다.

### 허용할 선택

1. `전체 24개 사본으로 계속`
2. `기존 간단판 5개로 계속`
3. `두 사본 따로 유지`

이번 단계에서는 `하나로 합치기`를 제공하지 않는다. 5항목과 24항목 사이의 안전한 per-Item mapping 계약이 없으므로 완료·메모·날짜·run 기록을 무손실 병합한다고 보장할 수 없기 때문이다.

### 상태 계약

- `needs_choice`
- `canonical_active`
- `legacy_active`
- `kept_separate`

`kept_separate`는 reload 후 유지한다.

### 복구 정책

- canonical 또는 legacy 한쪽을 선택하면 다른 사본은 archived legacy로 보존한다.
- archived copy를 복구할 때 전체 choice modal을 무조건 다시 띄우지 않는다.
- 복구 action에서 결과를 먼저 설명하고, 복구가 완료되면 `kept_separate`로 전환한다.
- 사용자는 관리 화면에서 active copy 결정을 다시 열 수 있다.

### 추가 보강

- copy label과 count는 registry/저장 record에서 계산한다.
- AJD 전용 하드코딩 문장을 generic presentation adapter로 옮긴다.
- `flow:saved:*` 외에 Flow Map 기반 legacy record가 실제로 존재하면 진단에 포함한다.
- 숨겨진 사본, archived 사본, active 사본을 같은 말로 표현하지 않는다.

### 필수 테스트

- canonical 선택 후 legacy 데이터 보존
- legacy 선택 후 canonical 데이터 보존
- `따로 유지` 후 reload에서도 chooser 재등장 0
- archived copy 복구 후 두 사본 모두 접근 가능
- restore 후 ghost row 0
- 개인 메모·완료·run·occurrence·export identity 보존
- map-only legacy fixture detection
- generic second canonical group fixture

### acceptance marker

- `P33-RECONCILIATION-KEEP-SEPARATE`
- `P33-RESTORE-WITHOUT-CHOOSER-LOOP`
- `P33-LEGACY-COPY-NONDESTRUCTIVE`

## P33-HF05. 남은 계약 누수와 접근성 보강

### 범위

- restart/reuse 경로에 canonical origin metadata 유지
- reconciliation bottom sheet/dialog의 focus trap, Escape, cancel, focus return
- title/count가 다른 copy의 accessible name 명확화
- alias redirect status가 SEO/rollback 정책과 맞는지 결정

### redirect 결정 gate

- alias를 장기 public URL로 유지할 계획이면 permanent redirect를 검토한다.
- preview rollback이 아직 필요한 stage라면 temporary redirect를 유지하고 이유를 문서화한다.
- redirect code만 보고 무조건 308로 바꾸지 않는다.

### acceptance marker

- `P33-RESTART-CANONICAL-ORIGIN`
- `P33-RECONCILIATION-FOCUS-RETURN`
- `P33-ALIAS-REDIRECT-POLICY-RECORDED`

## P33-HF06. 저장·build·E2E 안정화

### memo segmentation

저장 직후 My Flow 목록이 간헐적으로 갱신되지 않는 원인을 다음 순서로 조사한다.

1. localStorage write 완료 시점
2. React state invalidation
3. route transition과 hydration 순서
4. draft 분할 Item count와 effective projection 생성 시점
5. reload 후에만 보이는지 여부

단순 timeout 증가나 반복 click으로 덮지 않는다.

### build

- standard `npm.cmd run build`를 사용한다.
- 성공 직후 `.next/BUILD_ID` 존재를 확인한다.
- production server를 실제로 시작하고 대표 route 응답을 확인한다.
- 한 번 성공한 로그만으로 안정성을 선언하지 않는다.

### 문서와 diff

- 기존 P33 `spec.md`, `plan.md`의 trailing whitespace를 정리한다.
- `git diff --check`가 실제 오류 0으로 끝나야 한다.

### E2E 안정성

- targeted P33과 lifecycle/backup/URL/My Flow를 먼저 실행한다.
- full E2E는 `--workers=1`로 연속 2회 실행한다.
- 첫 run과 둘째 run의 정확한 pass/fail/flaky 수를 따로 기록한다.
- server 종료나 worker resource failure는 제품 assertion failure와 구분한다.

### acceptance marker

- `P33-MEMO-SEGMENTATION-IMMEDIATE-HYDRATION`
- `P33-STANDARD-BUILD-ARTIFACT`
- `P33-FULL-E2E-TWO-RUN-STABILITY`
- `P33-DIFF-CHECK-CLEAN`

## P33-OPS01. dependency audit merge gate

현재 PR의 dependency audit red는 P33 기능 변경과 별개지만 main merge를 막을 수 있다.

### 원칙

- P33 hotfix commit에 dependency 일괄 업그레이드를 섞지 않는다.
- `npm audit fix --force`를 사용하지 않는다.
- advisory ID, 영향 package, runtime/dev dependency, 실제 도달 가능성, 최소 안전 버전을 별도 기록한다.
- 통제된 dependency update 또는 CI policy 조정은 별도 branch/PR과 명시적 승인으로 처리한다.
- red check를 조용히 무시하거나 P33이 만든 문제로 오인하지 않는다.

### gate

- preview 기능 검증과 main merge readiness를 분리한다.
- P33 기능 검증이 끝나도 mandatory CI가 red면 production merge는 보류한다.

## P33-HF07. 독립 preview 재검증 및 publish 판단

### 시작 조건

- HF01~HF06 acceptance marker 통과
- P33 관련 commit만 branch에 포함
- preview가 anonymous reviewer에게 접근 가능
- PR diff에 P34 UX나 dependency 변경 없음

### persona simulation

| Persona | 시작점 | 핵심 검증 |
| --- | --- | --- |
| Home 신규 사용자 | Home moving card | canonical 24항목 약속과 저장 결과 일치 |
| Flow 찾기 사용자 | moving 검색 | Home과 같은 identity/detail/count |
| URL 사용자 | canonical URL + query | 같은 preview, 같은 저장 identity |
| 오래된 북마크 사용자 | legacy alias | canonical detail로 안전하게 연결 |
| 기존 5항목 사용자 | legacy saved copy | 메모·완료·run 보존 |
| 5+24 중복 사용자 | My Flow | 세 선택, archive/restore, chooser loop 없음 |
| 메모 중심 사용자 | Item memo → 제외 | reload/복구 후 메모 보존 |
| 반복 Flow 사용자 | workout/routine | series/occurrence와 raw rule 회귀 없음 |

### viewport

- 390×844
- 1024×768
- 1440×900

### 확인

- horizontal overflow 0
- fixed overlap 0
- console/page error 0
- 이름 없는 focusable element 0
- keyboard focus 순서와 dialog focus return
- title/count/artifact/save identity parity
- 개인 메모·완료·run·occurrence·export identity 보존

### 최종 판정

아래 셋 중 하나만 사용한다.

- `publish_ready_for_preview`
- `bounded_fix_remaining`
- `block_publish`

`publish_ready_for_preview`는 실제 사용자 검증 완료를 뜻하지 않는다. main merge와 production deploy는 별도 승인 및 CI green이 필요하다.

## 6. 실행 순서와 의존성

```text
HF00 재현 고정
  ├─ HF01 제외/메모 분리
  └─ HF02 canonical ID 단일화
        ↓
HF03 URL/fallback parity
        ↓
HF04 reconciliation 상태
        ↓
HF05 접근성·restart·redirect
        ↓
HF06 build/E2E 안정화
        ↓
HF07 독립 preview 재검증
        ↓
P34 UX 구조 개선 gate
```

HF01과 HF02는 논리적으로 독립이지만 `AppClient.tsx`, storage, backup test가 겹칠 수 있으므로 같은 worktree에서 동시에 수정하지 않는다. 작은 commit 단위로 순차 진행한다.

권장 commit 경계:

1. `fix: preserve item notes across personal exclusion`
2. `fix: derive canonical identity from one factory`
3. `fix: align canonical lookup and saved-copy reconciliation`
4. `test: stabilize p33 hydration and publish gates`

실제 commit/push는 별도 요청을 받은 뒤 수행한다.

## 7. 필수 검증 명령

```powershell
npm.cmd ci
npm.cmd run docs:check
npm.cmd test
npm.cmd run build
Test-Path .next/BUILD_ID
npm.cmd run start
npx.cmd playwright test tests/e2e/p33-cross-entry-canonical.spec.ts --workers=1
npx.cmd playwright test --workers=1
git diff --check
```

추가로 lifecycle, backup/restore, URL lookup, public save-before, My Flow, Calendar, export targeted spec을 현재 저장소 이름에 맞춰 실행한다.

full E2E 2회 조건:

- 두 실행 모두 assertion failure 0
- flaky retry는 별도 수치로 기록
- 메모 segmentation isolated rerun만 통과한 경우 완료로 보지 않음

## 8. 생성할 evidence package

P33 수정 실행 시 아래 패키지를 만든다.

`docs/content-audit/2026-07-25-p33-publish-stabilization-evidence/`

- `README.md`
- `audit.md`
- `route-evidence.json`
- `storage-contract-fixtures.json`
- `canonical-id-fixtures.json`
- `verification.json`
- `screenshots/`
- `downloads/`

필수 screenshot:

- canonical URL preview 390
- query URL preview 390
- canonical/legacy/keep-separate chooser 390
- archived copy restore 390
- canonical My Flow detail 1024
- canonical Calendar 1024
- wide reconciliation 1440

각 evidence는 아래 종류를 명시한다.

- `current_source`
- `current_local_browser`
- `current_preview_interaction`
- `automated_test`
- `prior_design_artifact`
- `heuristic_simulation`
- `observed_user`

`observed_user`는 실제 관찰 세션이 없으면 0으로 유지한다.

## 9. P34 이관 계획

P33이 `publish_ready_for_preview`이고 데이터 무결성 gate가 green일 때만 시작한다.

### P34-00. canonical 24항목 UX 독립 재검토

- current preview의 24항목 save-before, receipt, My Flow, Calendar를 다시 캡처한다.
- 390/1024/1440에서 첫 viewport와 조정 depth를 측정한다.
- 5항목/24항목이 아니라 canonical 24항목 하나를 기준으로 정보 구조를 평가한다.
- Claude Design의 proposed screenshot은 참고안이지 구현 정답으로 간주하지 않는다.

### P34-01. 24항목 progressive disclosure

- 첫 화면: title, source, 저장 결과, 날짜 범위, primary artifact
- 전체 outline: 한 번만 disclosure
- row 수정: contextual adjust mode에서만 노출
- mobile long-scroll과 중복 row를 줄임

### P34-02. canonical saved-copy management

- active, archived, kept-separate 상태를 짧은 사용자 문구로 표현
- 복구·전환·관리 명령을 focused My Flow workspace에 배치
- 데이터 병합 기능은 별도 mapping contract 없이는 추가하지 않음

### P34-03. cross-entry visual grammar

- Home, Find, URL lookup은 역할별 shell을 유지
- 같은 Flow임을 title/source/result anatomy로 인지 가능하게 함
- social proof는 실제 데이터가 없으면 만들지 않음
- Home/Find를 다시 합치거나 4탭 IA를 바꾸지 않음

### P34-04. final UX gate

- canonical Flow의 발견 → 미리보기 → 저장 → receipt → My Flow → Calendar 연속성
- 24항목 모바일 조정과 export 범위 예측
- keyboard, screen reader name, focus return
- 실제 사용자 관찰 전 readiness만 판정

## 10. 이번 계획에서 하지 않을 것

- 앱 코드 수정
- 기존 P33 branch commit/push
- PR merge
- production deploy
- 5항목/24항목 자동 병합
- P34 UI 구현
- 계정, DB, cloud sync
- AI/crawler
- OAuth
- dependency 강제 업그레이드
- source-backed 원본 수정

## 11. 완료 보고 형식

각 실행 slice의 마지막 보고는 아래 순서로 작성한다.

1. 작업 기준 SHA와 dirty 상태
2. 수정한 문제와 변경 파일
3. source/personal/run/occurrence/export 영향
4. legacy localStorage 처리
5. 데이터 삭제·자동 병합 없음의 근거
6. unit/targeted/full E2E/build/docs/diff 정확한 결과
7. 390/1024/1440 evidence
8. 남은 blocker와 다음 dependency
9. local edit / commit / push / PR / merge / deploy 상태
10. observed-user count

## 12. 바로 실행할 다음 목표

다음 구현은 `P33-HF00 + P33-HF01`만 수행한다.

핵심 완료 조건:

- 현재 메모 손실을 red fixture로 재현
- 제외 상태를 별도 필드로 분리
- legacy sentinel 안전 read
- 단건/batch/public 조정/복구/Calendar/export가 같은 helper 사용
- 메모 → 제외 → reload → 복구 후 메모 동일
- app의 canonical route나 P34 UI는 변경하지 않음

HF01 evidence가 통과한 뒤에만 HF02 canonical ID 단일화로 넘어간다.
