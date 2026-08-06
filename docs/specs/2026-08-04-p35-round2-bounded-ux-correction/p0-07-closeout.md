# P0-07 capability 기반 결과 preview와 행동 소유권 UI closeout

**판정:** `PASS`
**시작·종료 ref:** `d5f693776f7cebbce72a247ddb33ca6c5d550900` 기반 local working tree
**branch / upstream:** `codex/p35-production-mobile-p0` / `origin/codex/p35-production-mobile-p0` (`d5f693776f7cebbce72a247ddb33ca6c5d550900`)
**실행일:** 2026-08-04 KST
**변경 경계:** capability/loss view model, 실제 결과 preview, public·saved action ownership, P0-06 conditional editor 연결, Q1 guard와 독립 flag, contract·browser evidence
**Publish:** commit·push·PR·CI·merge·Preview·Production 모두 미실행
**실제 관찰 사용자:** `0명`
**다음 단계:** `P0-08 NOT_STARTED` — 이 closeout은 다음 단계를 자동 시작하지 않음

## 1. 사용자 결과

공개 계획과 저장 계획은 고정된 다섯 탭을 보여 주지 않고, 같은 effective snapshot에서 실제 만들 수 있는 결과를 계산해 보여 준다.

- `주 결과`는 정확히 1개다. 검토 보류처럼 바로 쓸 결과가 없으면 억지 primary를 만들지 않는다.
- 처음 보이는 바로 가능한 대안은 최대 2개다. 나머지는 `다른 형식` 안에 둔다.
- 날짜가 없는 Calendar처럼 추가 입력이 필요한 결과는 성공처럼 보이지 않으며, 필요한 입력과 예상 결과 수를 함께 보여 준다.
- 만들 수 없는 결과는 클릭할 수 없고 이유를 표시한다.
- preview는 placeholder가 아니라 같은 snapshot의 제목·Item ID·순서·날짜·메모·완료 기준을 사용한다.
- 공개 화면의 주요 행동은 `내 Flow에 저장`, 저장 계획의 결과 행동은 `계속 실행`이며 `수정`과 `내 도구로 옮기기`는 별도 보조 행동이다.
- 공개 quick-local 결과는 eligibility guard까지만 연결했고 flag 기본값은 off다. 따라서 P0-09 전에는 quick CTA가 나타나지 않는다.

현재 사용자 문구의 `Flow → 계획` 전환과 `저장 전 미리보기 / 현재 공개 초안 / 먼저 확인할 결과`, `주 결과 / 다른 결과`의 반복 감산은 P1-02 소유다. `/my` 첫 화면과 선택 상세의 정보 구조는 P0-08 소유다.

## 2. 단일 capability·loss 계약

[capability-result-view-model.ts](../../../lib/flow/capability-result-view-model.ts)가 Calendar/ICS, Checklist, Sheet, Memo 네 destination을 같은 manifest 계약으로 분류한다. 내부 실행 projection은 사용자 결과 형식으로 노출하지 않는다.

| 분류 | UI 동작 | 데이터 계약 |
|---|---|---|
| `primary` | 주 결과 1개 | eligible IDs/count와 snapshot hash를 가진 manifest |
| `available` | 바로 선택 가능, 첫 화면 최대 2개 | 같은 snapshot에서 손실 계약을 계산한 실제 rows |
| `conditional` | 현재 결과 수·예상 결과 수·필요 입력·설정 진입 | eligible/held/unavailable IDs를 분리 |
| `unavailable` | 비활성 이유 표시, 선택 action 없음 | 성공 count를 발명하지 않음 |

각 candidate는 다음 값을 공유한다.

- lifecycle과 snapshot kind: 공개 `public_preview / effective_authoring`, 저장 `saved_detail / effective_execution`
- snapshot version과 hash
- requested, canonical, eligible, held, unavailable Item IDs
- 현재 output count와 조건 충족 시 expected output count
- 보존된 title, date, order, memo, completion criterion

dated, undated, mixed, memo, routine, 부분 지원, review hold fixture에서 같은 규칙을 사용한다. 날짜가 없는 Item에 가짜 날짜나 VEVENT를 만들지 않는다.

## 3. 행동 소유권

| Lifecycle | Primary | Secondary | 이 단계에서 생성되는 것 |
|---|---|---|---|
| 공개 preview | `save-to-personal-plan` · public detail | `edit-public-draft` | preview만; artifact·receipt 없음 |
| 저장 detail | `execute-saved-result` · saved plan detail | `edit-saved-plan`, `transfer-to-own-tool` | transfer panel 진입 시 preview만 |

공개 화면의 기존 export 진입은 capability flag 기본 on 경로에서 숨겼다. 저장 계획의 `내 도구로 옮기기`는 저장된 execution snapshot의 capability metadata를 먼저 보여 준다. 실제 파일·클립보드 생성과 영수증의 `preview = confirm = artifact = receipt` 강건화, 실패·중복·재시도는 P0-09 범위다.

## 4. 조건부 편집과 Q1 guard

- Calendar가 0개인 날짜 없는 계획은 `날짜를 정하면 최대 N개`를 표시한다.
- `설정`은 새 편집기를 만들지 않고 P0-06 공통 Plan editor의 일정 context를 연다.
- 날짜 적용 후 같은 공개 session draft에서 Calendar가 실제 count를 가진 primary가 된다.
- Q1 guard는 feature flag, 공개 draft 변경, local-only 여부, remote/provider 필요, persistent receipt 필요, history 필요를 reason code로 판정한다.
- `quickLocalResult` 기본값은 off이고, capability UI와 독립적으로 rollback할 수 있다.
- eligibility가 true인 fixture가 있어도 P0-09 전에는 `create-quick-local-result` CTA를 렌더하지 않는다.

## 5. 무효과 preview 경계

결과 형식 선택과 transfer panel 열기는 생성 행동이 아니다.

| Effect | P0-07 preview/select/open 결과 |
|---|---:|
| localStorage / sessionStorage write | `0` |
| source/base·personal·execution mutation | `0` |
| artifact / receipt 생성 | `0` |
| download / file 생성 | `0` |
| clipboard 변경 | `0` · 권한 가능 환경에서 sentinel 유지 |
| non-GET network request | `0` |
| URL / history state 변경 | `0` |

저장 계획 transfer panel 아래에 남아 있는 실제 generator는 기존 P35 기능이며, 사용자가 그 생성 control을 실행하는 동작까지 P0-07이 제거한 것은 아니다. 이 closeout의 write 0 판정은 capability preview의 선택·조건 확인·panel open 경계에 한정한다.

## 6. 구현 연결

- [capability-result-view-model.ts](../../../lib/flow/capability-result-view-model.ts): destination classification, manifest, action hierarchy, Q1 guard
- [FlowCapabilityResultPreview.tsx](../../../components/flow/FlowCapabilityResultPreview.tsx): preview-only result 선택, conditional/unavailable disclosure, semantic metadata
- [effective-flow-contract.ts](../../../lib/flow/effective-flow-contract.ts): explicit result 기반 manifest 생성
- [flow-experience-projection.ts](../../../lib/flow/flow-experience-projection.ts): completion criterion 보존
- [FlowArtifactDataPreview.tsx](../../../components/flow/FlowArtifactDataPreview.tsx): 실제 preview row의 완료 기준 지원
- [FlowExportPanel.tsx](../../../components/flow/FlowExportPanel.tsx): 저장 결과 panel 안 capability preview slot과 semantic entry role
- [AppClient.tsx](../../../components/flow/AppClient.tsx): 공개·저장 runtime wiring, P0-06 editor 진입, 독립 flag, saved scope identity
- [p35-round2-flags.ts](../../../lib/flow/p35-round2-flags.ts): capability 기본 on, quick 기본 off와 query rollback

## 7. Acceptance 판정

| Criterion | 판정 | 근거 |
|---|---|---|
| primary 정확히 1개, 즉시 available 최대 2개 | PASS | VM golden·component DOM·public E2E |
| 고정 5탭 없이 콘텐츠별 capability 분류 | PASS | four-destination VM·role-rich fixture |
| conditional 입력·예상 count와 P0-06 editor 재사용 | PASS | undated golden·24-Item browser round-trip |
| unavailable 비활성·이유 표시 | PASS | review-hold static render·VM test |
| 실제 title/date/order/memo/completion criterion preview | PASS | manifest row static render·projection tests |
| public/saved lifecycle·scope·action owner 분리 | PASS | root semantic attributes·saved browser evidence |
| snapshot kind/version/hash/IDs/count 노출 | PASS | public·saved DOM assertions |
| Q1 reason code 연결, quick CTA 미노출 | PASS | guard unit test·public/off-path E2E |
| preview 선택·panel open의 persistent side effect 0 | PASS | storage/history/download/clipboard/non-GET monitor |
| capability flag off에서 legacy result panel 복귀 | PASS | `capabilityResult=off` E2E |
| 390/1024/1440에서 overflow·sticky collision 없음 | PASS | browser geometry와 직접 화면 검토 |
| keyboard/screen-reader 기본 관계 | PASS · bounded | native button/details, `aria-pressed`, labelled section/group와 focus-visible 유지; 전체 접근성 gate는 P1-04 |

## 8. 검증

| 명령/검사 | 결과 | 증명 범위 |
|---|---|---|
| effective projection/snapshot/capability targeted | PASS · `41/41` | snapshot·manifest·loss·row parity |
| flag + VM + component targeted | PASS · `15/15` | flags·roles·actions·semantic DOM |
| `npm.cmd run test:p35-p0` | PASS · `254/254` | P0 contract와 현재 capability regression |
| `npm.cmd test` | PASS · pretest `106/106` + P35 P0 `254/254` + remaining `603/603` = `963/963` | 전체 unit/workflow regression |
| `npm.cmd run build` | PASS · Next `15.5.21`, `18` routes | production compile·static route generation |
| capability + public result + shape-honesty Playwright | PASS · `15/15`, workers 1, retries 0 | public/saved lifecycle, no-write, rollback, result shape |
| public result + shape-honesty evidence rerun | PASS · `11/11` | 현재 화면 캡처와 route assertions |
| console/page/request 검사 | PASS · 오류 `0`, 비GET request `0` | P0-07 focused browser paths |
| `npm.cmd run docs:check` | PASS · `14` required files, `4,077` local links | canonical 문서와 로컬 링크 |
| `git diff --check` | PASS | whitespace 오류 없음; Windows LF→CRLF 경고만 존재 |
| `npm.cmd run workflow:closeout` | PASS · report 생성 | HEAD/upstream, dirty ownership, publish 경계 재확인 |

전체 Playwright suite와 실제 Calendar/VTODO import는 이 단계에서 실행했다고 주장하지 않는다.

## 9. 화면 증거와 직접 검토

증거 폴더: [evidence/p0-07/screenshots](./evidence/p0-07/screenshots/)

| 경로/형태 | 증거 |
|---|---|
| public moving · 390 | [p35-02-moving-save-before-390.png](./evidence/p0-07/screenshots/p35-02-moving-save-before-390.png) |
| public routine · 1024 | [p35-02-routine-save-before-1024.png](./evidence/p0-07/screenshots/p35-02-routine-save-before-1024.png) |
| public learning · 1440 | [p35-02-learning-save-before-1440.png](./evidence/p0-07/screenshots/p35-02-learning-save-before-1440.png) |
| public undated · 390 | [p35-02-undated-save-before-390.png](./evidence/p0-07/screenshots/p35-02-undated-save-before-390.png) |
| saved selected detail · 390 | [p35-02-moving-selected-detail-390.png](./evidence/p0-07/screenshots/p35-02-moving-selected-detail-390.png) |
| saved transfer · 390 | [p35-r10-export-one-summary-owner-390.png](./evidence/p0-07/screenshots/p35-r10-export-one-summary-owner-390.png) |

직접 확인 결과:

- 390px 첫 화면에서 주 결과와 대안 최대 2개, 저장·수정 행동이 식별되고 sticky action이 내용을 가리지 않는다.
- 1024/1440에서 결과 선택·실제 row·조건부 입력이 잘리거나 수평 overflow를 만들지 않는다.
- 저장 transfer preview는 24개 Item과 같은 snapshot/scope를 표시하며 panel open만으로 artifact/receipt를 만들지 않는다.
- 반복되는 상태 설명과 `주 결과/다른 결과` 카피는 기능 blocker가 아니며 P1-02 감산 대상으로 남긴다.
- saved selected detail의 기존 탭·목록·상세 계층은 P0-08에서 재구성한다.

## 10. 소유 파일과 dirty 경계

P0-07이 새로 만들거나 주로 소유하는 파일:

- `lib/flow/capability-result-view-model.ts`와 test
- `components/flow/FlowCapabilityResultPreview.tsx`와 test
- `lib/flow/p35-round2-flags.ts`의 P0-07 flag 부분과 test
- `tests/e2e/p35-p0-capability-preview.spec.ts`
- `evidence/p0-07/screenshots/*`
- 이 closeout과 active ledgers

공유 파일에서는 P0-07 연결부만 소유한다.

- `components/flow/AppClient.tsx`
- `components/flow/FlowArtifactDataPreview.tsx`
- `components/flow/FlowExportPanel.tsx`
- `lib/flow/effective-flow-contract.ts`
- `lib/flow/flow-experience-projection.ts`
- `package.json`
- `tests/e2e/p35-public-result-first.spec.ts`
- `tests/e2e/p35-r10-shape-honesty.spec.ts`

worktree에는 P0-01~P0-06과 별도 content-audit 산출물이 함께 있다. 이를 P0-07 소유라고 주장하거나 삭제·정리·전체 stage하지 않는다.

## 11. 제외·rollback·다음 gate

이 단계의 제외:

- 일반 `/my` library IA, 0/1/5/20 상태, save deep-link 복원: P0-08
- 실제 artifact 생성, clipboard/file 실패, 중복·재시도, immutable receipt: P0-09
- P0 통합 hard fail gate: P0-10
- Item/Map/시작일 시각 감산: P1-01
- `Flow → 계획`, CTA, 도움·주의 전체 copy: P1-02
- format별 parser/file field parity: P1-03
- 전체 접근성·극단값·legacy gate: P1-04
- text-to-flow, remote provider, 실제 Calendar/VTODO round-trip
- Claude/Codex 내부 검토를 실제 사용자 관찰로 집계하는 일

rollback은 `capabilityResult=off`에서 기존 public result panel과 export entry로 돌아가며, `quickLocalResult`는 별도 default-off 상태를 유지한다. route, storage key/version, source/base, saved identity를 migration하지 않는다.

| 상태 | 결과 |
|---|---|
| Local edit | 있음 · P0-07 PASS |
| Commit / Push / PR / CI / Merge | 없음 / 안 함 / 미실행 |
| Preview / Production | 안 함 |
| 실제 관찰 사용자 | `0명` |
| 다음 strict-order 단계 | `P0-08 NOT_STARTED` |
