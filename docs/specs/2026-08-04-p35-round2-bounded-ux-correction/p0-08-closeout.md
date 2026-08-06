# P0-08 저장 계획 library 중심 `/my` closeout

**판정:** `PASS`

**시작·종료 ref:** `d5f693776f7cebbce72a247ddb33ca6c5d550900` 기반 local working tree

**branch / upstream:** `codex/p35-production-mobile-p0` / `origin/codex/p35-production-mobile-p0` (`d5f693776f7cebbce72a247ddb33ca6c5d550900`)

**실행일:** 2026-08-04 KST

**변경 경계:** Q2-B `/my` shell, 파생 Today, 저장 계획 library와 selected detail, route·Back·focus 복구, archive lens, 저장 직후 1회 배너, 독립 rollback flag, read-only legacy hydration

**Publish:** commit·push·PR·CI·merge·Preview·Production 모두 미실행

**실제 관찰 사용자:** `0명`
**다음 단계:** `P0-09 IN_PROGRESS` — 전체 프로그램 완료 요청에 따라 이 closeout 뒤 strict-order의 한 단계만 엶

## 1. 사용자 결과

일반 `/my`는 이제 저장한 계획을 다시 찾는 library가 중심이다.

- 오늘 실행할 항목이 있을 때만 compact Today를 먼저 보여 준다. Today가 없으면 제목·카드·빈 자리도 만들지 않는다.
- Today는 저장 계획과 다른 사본이나 저장소가 아니라 committed authoring snapshot과 execution overlay에서 파생한 lens다.
- 저장 계획이 0개면 발견 행동 하나, 1개면 검색 없는 한 행, 5개면 안정된 목록, 20개면 검색과 상태 필터 하나를 제공한다.
- 실행 완료와 계획 보관 상태를 분리하고 보관 계획은 별도 archive lens에서 다시 열 수 있다.
- 저장 직후에는 방금 저장한 계획 상세와 실제 저장 count를 담은 배너를 한 번만 보여 준다. reload에서는 반복하지 않는다.
- library의 query·status·scroll에서 계획과 Item을 열었다가 돌아오면 같은 계획, 필터, 위치, focus로 복귀한다.
- direct deep-link에는 가짜 앱 내부 Back을 만들지 않으며, rail에서 다른 계획으로 바꾼 경우에는 library로 안전하게 돌아온다.

P1-02 전이므로 `Flow → 계획` 전역 문구 변경은 하지 않았다. Calendar·실행 engine, 고급 필터, project hierarchy, collaboration, text-to-flow도 이 단계 범위가 아니다.

## 2. IA와 identity 계약

```text
compact Today — 오늘 항목이 있을 때만 파생 요약
→ saved plan library — 최근/활성은 같은 identity의 정렬·lens
→ selected saved plan detail
```

| 상태 | P0-08 결과 |
|---|---|
| 0 plans | 발견 행동 정확히 1개; Today placeholder 없음 |
| 1 dated plan | 계획 행 1개, 검색 없음, Today는 같은 saved identity 사용 |
| 1 undated plan | 계획 행 1개, Today heading·wrapper 없음 |
| 5 plans | stable ordering, 검색·상태 control 없음 |
| 20 plans | query와 상태 filter 정확히 1개씩 |
| completed Items | 실행 overlay로만 반영; 계획 archive와 혼합하지 않음 |
| archived plan | archive lens에 남고, 마지막 보관 계획을 복구하면 URL·reload도 active 상태와 일치 |

library selector는 `lastVisitedAt 내림차순 → title → stableId` 순서를 사용하며 Today·library·selected detail은 같은 저장 identity를 재사용한다.

## 3. navigation·save handoff

- library → plan → Item → Back은 query, status, document/rail scroll, owning plan과 opener focus를 복구한다.
- mobile에서 detail이 다시 mount되어도 stable slug로 plan row focus를 복구한다.
- direct plan 또는 Item deep-link에는 존재하지 않는 library history를 발명하지 않는다.
- direct A → rail B처럼 실제 내부 parent가 없는 계획 전환은 browser 외부 history로 빠지지 않고 library route로 정규화한다.
- selected plan은 query/status 결과에서 잠시 제외되거나 마지막 open Item이 완료되어도 detail을 유지한다.
- 공개 저장 성공은 selected detail을 열고 `저장됨 · 24개` 배너를 한 번만 보인다. reload 후 배너는 사라진다.

## 4. read-only·rollback 경계

Q2 flag는 기본 on이며 정확히 `savedPlanLibrary=off`일 때만 기존 P35 `/my`로 돌아간다. 다른 P35 Round 2 flag와 독립적이다.

| 검사 | 결과 |
|---|---|
| flag on/off raw localStorage bytes | 변경 `0` |
| `/my` mount 중 storage write | `0` |
| legacy lifecycle·identity·bundle read | read-only, write-on-read `0` |
| malformed legacy/current bundle row | 안전하게 제외, throw·rewrite `0` |
| Calendar selected-flow persistence | `/my` surface에서는 write `0` |
| source/base·stable identity·key/version | migration·rename·rewrite `0` |

`useBundles({ readOnly: true })`와 각 read-only adapter는 기존 저장 데이터를 읽기만 한다. 명시적인 사용자 저장은 기존 writer를 계속 사용한다.

## 5. Acceptance 판정

| Criterion | 판정 | 근거 |
|---|---|---|
| saved library가 canonical 회수 surface | PASS | focused E2E와 0/1/5/20 화면 증거 |
| Today는 필요할 때만 보이는 파생 결과 | PASS | dated/undated 1-plan 분리 시나리오 |
| Today·library·detail identity 단일성 | PASS | selector unit와 DOM identity assertion |
| 0/1/5/20 control 규칙 | PASS | focused E2E 4개 viewport/fixture |
| save deep-link·실제 count 24·1회 배너 | PASS | real public save → detail → reload 시나리오 |
| library→plan→Item→Back 상태·focus 복구 | PASS | query/status/scroll/focus E2E |
| direct deep-link에 가짜 Back 없음 | PASS | A→B 전환과 screen Back 시나리오 |
| 완료 후 selected detail 유지 | PASS | 마지막 open Item 완료 E2E |
| archive 상태·URL·reload 일치 | PASS | 마지막 archived plan 복구 시나리오 |
| exact flag off legacy·bytes 불변 | PASS | `savedPlanLibrary=off` raw byte와 write log 검사 |
| legacy read-only·malformed storage 안전 | PASS | storage targeted `62/62` |
| 390×844, 1024×768, 1440×1000 화면 | PASS | evidence spec `7/7`, PNG 7장 |
| overflow·unnamed control·console/page error | PASS | 각 `0` |

## 6. 검증

| 명령/검사 | 결과 | 증명 범위 |
|---|---|---|
| `npm.cmd exec tsc -- --noEmit -p tsconfig.next.json` | PASS | current TypeScript diagnostics |
| read-only storage targeted | PASS · `62/62` | byte identity, write spy, malformed legacy/current input |
| `npm.cmd run test:p35-p0` | PASS · `286/286` | P35 Round 2 contract regression |
| `npm.cmd test` | PASS · pretest `112/112` + P35 P0 `286/286` + remaining `608/608` = `1006/1006` | 전체 unit/workflow regression |
| `npm.cmd run build` | PASS · `18/18` routes | production compile·static route generation |
| focused saved-library Playwright | PASS · `11/11`, fresh port `3114`, workers `1`, retries `0` | 0/1/5/20, no-Today, Back/focus, archive, save handoff, rollback |
| 영향 5-file Playwright 회귀 | PASS · `15/15` | cross-Flow Todo, library workspace, safe split, literal routes, R13 gate |
| evidence capture spec | PASS · `7/7` | 7 PNG, 390×844·1024×768·1440×1000 |
| browser diagnostics | PASS · overflow `0`, unnamed control `0`, console error `0`, page error `0` | P0-08 focused browser paths |
| exact rollback storage audit | PASS · raw bytes unchanged, writes `0` | `savedPlanLibrary=off`와 legacy read-only |

Playwright와 화면 캡처는 fresh local production build의 내부 검증이다. 실제 참여자의 이해·선호·장기 사용성을 증명하지 않으며 observed-user 수는 `0`이다.

## 7. 화면 증거

정본 인덱스: [evidence/p0-08/README.md](./evidence/p0-08/README.md)

| 화면 | 증거 |
|---|---|
| empty library · 390×844 | [01-empty-library-390x844.png](./evidence/p0-08/screenshots/01-empty-library-390x844.png) |
| compact Today + one plan · 390×844 | [02-compact-today-one-plan-390x844.png](./evidence/p0-08/screenshots/02-compact-today-one-plan-390x844.png) |
| five-plan library · 1024×768 | [03-five-plan-library-1024x768.png](./evidence/p0-08/screenshots/03-five-plan-library-1024x768.png) |
| twenty-plan searchable library · 1440×1000 | [04-searchable-twenty-plan-library-1440x1000.png](./evidence/p0-08/screenshots/04-searchable-twenty-plan-library-1440x1000.png) |
| selected plan detail · 1024×768 | [05-selected-plan-detail-1024x768.png](./evidence/p0-08/screenshots/05-selected-plan-detail-1024x768.png) |
| exact flag-off legacy · 390×844 | [06-exact-flag-off-legacy-390x844.png](./evidence/p0-08/screenshots/06-exact-flag-off-legacy-390x844.png) |
| real save detail/banner · 390×844 | [07-real-save-detail-banner-390x844.png](./evidence/p0-08/screenshots/07-real-save-detail-banner-390x844.png) |

## 8. 소유 파일과 dirty 경계

P0-08의 주 소유 범위:

- `lib/flow/p35-round2-flags.ts`와 test
- `lib/flow/my-flow-local-ia.ts`와 test
- `lib/flow/storage.ts`와 targeted storage test의 read-only 경계
- `components/flow/AppClient.tsx`의 `/my` Q2 shell 연결
- `playwright.config.ts`의 명시적 port override
- `tests/e2e/p35-p0-saved-plan-library.spec.ts`
- `tests/e2e/p35-p0-saved-plan-library-evidence.spec.ts`
- `evidence/p0-08/screenshots/*`
- 이 closeout과 active ledgers

worktree에는 P0-01~P0-07과 별도 content-audit 산출물이 함께 있다. 이를 P0-08 단독 소유라고 주장하거나 삭제·정리·전체 stage하지 않는다.

## 9. 제외·publish·다음 gate

이 단계에서 제외한 항목:

- 실제 artifact 생성, clipboard/file 실패, 중복·재시도, immutable receipt: P0-09
- P0 통합 hard fail gate: P0-10
- Item/Map/시작일 시각 감산: P1-01
- `Flow → 계획`, CTA, 도움·주의 전체 copy: P1-02
- format별 parser/file field parity: P1-03
- 전체 접근성·극단값·legacy gate: P1-04
- Calendar/execution engine 재작성, advanced filter, hierarchy, collaboration, text-to-flow, remote provider
- Claude/Codex 내부 검토나 자동화를 실제 사용자 관찰로 집계하는 일

| 상태 | 결과 |
|---|---|
| Local edit | 있음 · P0-08 PASS |
| Commit | 없음 |
| Push | 안 함 |
| PR | 안 함 |
| CI | 미실행 |
| Merge | 안 함 |
| Preview | 안 함 |
| Production | 안 함 · released P35가 계속 production baseline |
| 실제 관찰 사용자 | `0명` |
| 다음 strict-order 단계 | `P0-09 IN_PROGRESS`; P0-10 이후는 닫힘 |
