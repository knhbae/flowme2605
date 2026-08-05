# P0-10 P0 통합 회귀·내부 gate closeout

**판정:** `PASS — LOCAL INTERNAL GATE`

**판정 경계:** P0-02~09를 현재 local working tree에서 통합 재검증해 P0 계약을 닫았다. 새 기능, P1 감산·copy·형식 parity, commit·push·PR·CI·merge·Preview·Production, 실제 사용자 관찰은 포함하지 않는다.

**기준 ref:** `d5f693776f7cebbce72a247ddb33ca6c5d550900` 기반 local working tree

**branch / upstream:** `codex/p35-production-mobile-p0` / `origin/codex/p35-production-mobile-p0`

**실행일:** 2026-08-05 KST

**Publish 권한:** `none`

**실제 관찰 사용자:** `0명`

## 1. P0 acceptance ledger

| Owner 단계 | 현재 재검증 대상 | 선행 closeout | P0-10 상태 |
|---|---|---|---|
| P0-02 | Map IDs·title·count·save·legacy read-only | [P0-02](./p0-02-closeout.md) | `PASS` · integration Map 3 viewports·legacy checksum + full E2E |
| P0-03 | 완료 기준 UI·portable payload parity | [P0-03](./p0-03-closeout.md) | `PASS` · Item→Checklist artifact/receipt lifecycle + full E2E |
| P0-04 | atomic save·direct selected detail·failure recovery | [P0-04](./p0-04-closeout.md) | `PASS` · public edit→save→selected personal copy + full E2E |
| P0-05 | common editor transaction·close/error matrix | [P0-05](./p0-05-closeout.md) | `PASS` · public Plan+Item Apply chain + full E2E |
| P0-06 | public/saved Plan·Item editor surface·Back/focus | [P0-06](./p0-06-closeout.md) | `PASS` · integrated keyboard/focus·diagnostics + full E2E |
| P0-07 | capability preview·loss·primary owner | [P0-07](./p0-07-closeout.md) | `PASS` · lifecycle chain·quick/saved owner 분리 + full E2E |
| P0-08 | saved-plan library·Today lens·0/1/5/20·rollback | [P0-08](./p0-08-closeout.md) | `PASS` · `/my` 3 viewports·Q2 raw-byte rollback + full E2E |
| P0-09 | public quick·saved transfer·artifact·receipt·lifetime | [P0-09](./p0-09-closeout.md) | `PASS` · saved persistent·public session-only 통합 + full E2E |

## 2. Hard-fail 재검사

| ID | 계약 | 현재 상태 | 완료 근거 |
|---|---|---|---|
| HF-01 | Map selected = applied = preview = saved IDs/title/count | `PASS` | P0-02 current unit/browser + P0-10 Map 390/1024/1440·legacy checksum + full E2E |
| HF-02 | 완료 기준 UI = checklist preview/payload, memo·warning·completion과 분리 | `PASS` | current unit payload + full Item→saved Checklist artifact/receipt chain + full E2E |
| HF-03 | capability × lifecycle × scope별 primary owner 1개 | `PASS` | P0 owner matrix unit + public save/quick·saved transfer lifecycle chain + full E2E |

## 3. S01~S13 실행표

P0-10은 각 시나리오의 P0 계약만 PASS/FAIL로 판정한다. P1에서 의도적으로 다룰 시각 감산·용어·전체 형식 round-trip·최종 접근성은 `TBD · P1`로 남긴다.

| ID | P0 실행 범위 | 현재 | P1 또는 사람 검토 경계 |
|---|---|---|---|
| S01 | 첫 viewport의 결과·개수·primary 1개·오류/overflow | `PASS · P0` | 5초 이해·copy hierarchy는 `TBD · P1-02/Claude` |
| S02 | date intent와 preview/save/artifact/receipt 일치 | `PASS · P0` | 중복 echo 감산은 `TBD · P1-01` |
| S03 | public Plan/Item transaction·Apply/Cancel/Back/error | `PASS · P0` | 50 Item 실제 의미 검토는 `TBD · P1-04` |
| S04 | eligibility/loss와 Calendar/Checklist/Sheet/Memo 실제 결과 | `PASS · P0` | 전체 parser round-trip은 `TBD · P1-03` |
| S05 | atomic save·duplicate choice·selected detail·1회 banner | `PASS · P0` | 독립 시각 위계는 final review package에서 검토 |
| S06 | saved persistent transfer와 public session-only quick | `PASS · P0` | 외부 provider round-trip은 범위 밖 |
| S07 | `/my` 0/1/5/20·Today lens·query/filter/Back/archive | `PASS · P0` | 실제 사용자 회수 가능성은 observed-user 제외 |
| S08 | saved Plan/Item common editor·dirty/error/Back/focus | `PASS · P0` | 50 Item 전체 의미·최종 접근성은 `TBD · P1-04` |
| S09 | Item detail·memo·completion/reopen·single-item result | `PASS · P0` | blue surface·heading 감산은 `TBD · P1-01` |
| S10 | Map 3 mode·7/8 parity·failure/recovery·legacy | `PASS · P0` | 3칸 요약 감산은 `TBD · P1-01` |
| S11 | P0 accessible name·focus·Escape·error announcement | `PASS · P0` | disclosure taxonomy·screen reader final은 `TBD · P1-02/P1-04` |
| S12 | P0 commit label이 execution 완료와 충돌하지 않음 | `PASS · P0` | route-wide `계획`·CTA copy는 `TBD · P1-02` |
| S13 | P0 mixed/legacy/malformed·20 plans·50 Item layout·full regression | `PASS · P0` | final extreme semantic/accessibility gate는 `TBD · P1-04` |

## 4. 통합 경로와 diff 계약

| 경로 | payload/storage/artifact/receipt 기대 | 현재 |
|---|---|---|
| public → editor → Apply → save → selected detail → Item → saved transfer → reload receipt | Apply 전 persistent write 0; save identity/count 1회; saved effective IDs/count/version/hash = confirm = artifact = receipt | PASS · targeted integration |
| clean public → quick confirm → local artifact → session result | saved plan·persistent receipt·history·non-GET write 0; same effective IDs/count | PASS · targeted integration |
| Map save_all / choose_child / review_hold | 각 mode의 allowed action만 보이고 preview·applied·saved IDs/count/title 일치 | PASS · current owner tests + 3-viewport diagnostics |
| library query/filter → plan → Item → Back | query/filter/scroll/owner/focus 복원; completion과 archive 별도 | PASS · P0-08 focused + P0-10 `/my` diagnostics |
| legacy/malformed read-only open·reload | identity·personal·execution bytes 불변, 읽기 중 rewrite 0 | PASS · six-row rollback matrix·SHA-256 checksum·mutation 0 + full unit storage tests |

## 5. 독립 rollback 표

| Slice | exact-off flag | 기대 | 현재 |
|---|---|---|---|
| Q1 public quick | `quickLocalResult=off` | quick만 숨김; saved transfer/library 유지; storage mutation 0 | unit + browser strict-off/uppercase matrix PASS |
| Q1 saved transfer | `savedTransfer=off` | legacy saved export surface; quick/library 유지; migration 0 | unit + browser strict-off/uppercase matrix PASS |
| Q2 saved library | `savedPlanLibrary=off` | released P35 `/my` surface와 raw bytes 복원; Q1 flags 유지 | unit + browser strict-off/uppercase matrix PASS |
| Q3 copy | 아직 없음 | P1-02에서 이름·계약 승인 후 추가 | `TBD · P1-02`; P0-10 PASS 주장에 포함하지 않음 |

## 6. route·viewport·fixture matrix

| Surface | 390×844 | 1024×768 | 1440×1000 | 대표 fixture |
|---|---|---|---|---|
| public result/editor/quick | 기존 focused 증거 있음 | 기존 focused 증거 있음 | 기존 focused 증거 있음 | dated, undated, mixed, routine, memo, partial |
| saved library/detail/editor/transfer | 기존 focused 증거 있음 | 기존 focused 증거 있음 | 기존 focused 증거 있음 | 0/1/5/20 plans, 1/8/24/50 Item layout |
| Flow Map | PASS | PASS · 신규 보강 | PASS | save_all, choose_child, review_hold, 7-of-8 |

각 viewport는 horizontal overflow, sticky collision, focus return, keyboard/Escape, unnamed interactive control, console/page/unexpected request failure를 가능한 surface에서 검사한다. 서로 다른 증거 수준은 합쳐서 `모두 검증`이라고 쓰지 않는다.

## 7. 검증 ledger

| 명령/검사 | 결과 | 범위 |
|---|---|---|
| `npm.cmd exec tsx -- --test lib/flow/p35-round2-flags.test.ts` | PASS · `7/7` | Q1 quick/saved와 Q2 library exact-off·uppercase·cross-independence |
| `npm.cmd run test:p35-p0` | PASS · `322/322` | P0 current contract suite |
| `npm.cmd test` | PASS · pretest `113/113` + P35 P0 `322/322` + remaining `608/608` = `1,043/1,043` | 전체 unit/workflow current tree |
| `npm.cmd run build` | PASS · Next `15.5.21`, pages `18/18`, build ID `55R2pZ1uMR8ZGi9ToYp5K` | production compile·Next app typecheck |
| `npm.cmd run test:e2e -- --workers=4 --retries=0` | PASS · `504/504`, `18.8m` | 전체 Playwright current-ref integration |
| `tests/e2e/p35-p0-integration-gate.spec.ts` | PASS · `12/12`, workers `1`, retries `0`, `29.7s` | 두 lifecycle, six-row Q1/Q2 rollback, public/my/Map × 3 viewports·diagnostics |
| `npm.cmd run docs:check` | PASS · required `14`, local links `4,156` | required docs·local links |
| `git diff --check` | PASS · whitespace error `0` | whitespace hygiene; 기존 LF→CRLF warning만 있음 |

### Full E2E 수렴 기록

모든 실행은 재시도 없이 수행했다. 아래 비-green 실행을 삭제하지 않고 원인과 함께 남긴다.

1. `468 passed / 36 failed` (`28.8m`): 현재 P0 UX와 맞지 않는 과거 테스트 계약 및 실제 조건부 편집 포커스 복귀 결함을 발견했다.
2. `503 passed / 1 timed out` (`20.6m`): 9~10개 route를 순회하는 P7 guardrail의 30초 예산 부족이었다.
3. `501 passed / 3 timed out` (`18.8m`): main multi-route 30초 예산과 archive 빈 상태 버튼의 hydration TOCTOU였다.
4. `503 passed / 1 failed` (`20.0m`): URL-first personal draft route가 hydration 전에 selector를 한 번만 분기한 race였다.
5. 수정 후 최종 실행: `504 passed / 0 failed` (`18.8m`).

겹쳐 실행돼 오염된 run과 shell의 20분 제한으로 종료된 clean run은 제품 판정 근거에서 제외했다. multi-route timeout 예산, archive helper, URL-first wait만 안정화했으며 제품 주장을 줄이거나 assertion을 삭제하지 않았다.

## 8. 독립 검토·known limitations

- Codex runtime/data/state 감사에서 P0 근거가 stage별로만 흩어져 있음을 찾아 P0-10 전용 integration spec을 추가했고 `12/12`로 통과했다.
- 전체 회귀에서 실제 제품 결함 두 건을 찾아 수정했다. 조건부 capability `설정`을 닫은 뒤 정확한 트리거로 포커스를 돌려주고, saved flow-scope Checklist/Sheet/Memo 전송이 개인 시간·소요시간을 잃지 않도록 manifest ID 집합을 fail-closed로 대조한다.
- Q3 copy flag와 route-wide copy guard는 P1-02 소유이며 P0-10에서 완료로 주장하지 않는다.
- 일부 50 Item 증거는 실제 50 Item semantic route가 아니라 editor layout stress다. 최종 extreme gate는 P1-04에서 닫는다.
- P0-09 영구 삭제 cleanup journal은 탭 `sessionStorage` 범위다. reload는 복구하지만 탭 session 폐기 후 marker는 남지 않는다.
- direct full-project `tsc --noEmit`은 기존 test fixture diagnostics가 있으나, P0-10 필수 생산 경로인 Next build와 `tsconfig.next.json` typecheck는 green이다.
- Claude Design은 로컬 앱에 접근할 수 없다. 현재 구현 연속 캡처·상태 설명·scorecard가 있는 별도 전달 패키지를 만든 뒤 정적 검토를 받아야 하며, 그 전에는 Claude 검토 완료로 표기하지 않는다.

## 9. Publish·validation ledger

| 상태 | 결과 |
|---|---|
| Local implementation | P0-01~10 완료; 다음 단계 `P1-01 IN_PROGRESS` |
| Commit / Push / PR / CI / Merge | 없음 / 안 함 / 안 함 / 미실행 / 안 함 |
| Preview / Production | 안 함 / 안 함 |
| Production baseline | released P35 유지 |
| Observed-user sessions | `0` |

## 10. 종료 체크리스트

- [x] 전용 P0-10 integration spec PASS · `12/12`
- [x] full Playwright exact manifest·result 기록 · `504/504`
- [x] HF-01~03 current-ref PASS 판정
- [x] S01~S13의 P0 PASS와 P1 `TBD` 경계 확정
- [x] final unit/build 재실행
- [x] final docs/diff 재실행 후 결과 반영
- [x] P0-10 `PASS — LOCAL INTERNAL GATE` 판정 후 P1-01 열기

상세 실행 인덱스는 [evidence/p0-10/README.md](./evidence/p0-10/README.md)에 기록한다.
