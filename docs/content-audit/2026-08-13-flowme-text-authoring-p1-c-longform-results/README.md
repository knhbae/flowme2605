# FlowMe Text Authoring P1-C 장문·표 보존 결과

- 승인 ID: `TA-P1-C-LONGFORM-20260813-01`
- track/status: `P1-C-LONGFORM / APPROVED_FOR_LOCAL_IMPLEMENTATION`
- target checkout: `D:\flowme2605\flow-text-authoring-p1-c-longform-20260813`
- branch: `codex/text-authoring-p1-c-longform-20260813`
- baseline/QA-time HEAD: `5ef186d40128f265854ce1141c94f1b80141707e`
- upstream: `NONE`
- 현재 상태: `LOCAL_INTERNAL_QA_PASS / LOCAL_COMMIT_INCLUDED`
- 게시 경계: `LOCAL_ONLY`
- 관찰 사용자 세션: `0`

> 이 문서는 [개발 목표](../../specs/2026-08-13-flowme-text-authoring-p1-c-longform/00-development-goal-ko.md)의 구현·검증 ledger다. 현재 target tree는 로컬 구현과 fresh 내부 QA를 통과했고, 이 문서와 exact scoped tree를 승인된 target local commit 하나에 함께 고정한다. 이 결과는 출시·배포·실제 사용자 검증을 뜻하지 않는다.

## 1. 결론

P1-C는 긴 평문·blockquote·code fence·HTML/comment와
CSV·TSV·Markdown 표를 exact source locator와 함께 분석하고, 안전한 표만
Sheet에 투영하며 손실 위험·잘못된 표·처리 한도 초과는 영향받는
결과만 fail-close하도록 구현됐다. 원문 TXT·복사·다운로드·명시 저장은
유지되며, mixed exact raw와 bounded recurrence가 같이 있는 TXT는 raw prefix를
한 번만 두고 `[반복 회차]`에 occurrence를 나열한다. 각 표의 authoritative
loss manifest도 stable ID·exact range·row/cell count를 독립적으로 보존한다.
최종 focused `74/74`, Text Authoring `273/273`, 기존 5개 spec과 P1-C를 합친
6-file E2E `66/66`, build과 full test가 통과했다.

## 2. 승인·Git 대조

### 2.1 사용자 승인

- approved by: FlowMe repository owner / current user
- approved at: `2026-08-13 10:20 KST`
- 승인 문구:

  > TA-P1-C-LONGFORM-20260813-01 승인. 직전 답변의 APPROVAL_MANIFEST 전체를 그대로 승인하며, 승인 정본 기록, 새 worktree/branch 생성, P1-C 구현, fresh QA와 target local commit까지 허용한다. 명시된 제외 범위와 LOCAL_ONLY 경계는 유지한다.

### 2.2 archived canonical provenance

| 항목    | exact value                                                                                                                |
| ------- | -------------------------------------------------------------------------------------------------------------------------- |
| ref     | `refs/archive/main-uncommitted-20260813^3`                                                                                 |
| commit  | `8d5e3bf6c4ae192c142198211c64330a013c7a6d`                                                                                 |
| path    | `docs/content-audit/2026-08-13-flowme-text-authoring-development-handoff/01-track-disposition-and-approval-manifest-ko.md` |
| blob    | `ab0acc33fdfae4a97ed61b4fa121c1563c0e0eba`                                                                                 |
| SHA-256 | `A0A0380865D24C7014700970C0E2941615C506C81E9CB8598DF2716FA7FD6B3E`                                                         |

현재 `flow-mvp/main` working copy에는 이 정본 파일이 없다. 아카이브 exact
blob과 현재 사용자의 명시 승인이 이 target의 provenance며, 정본 파일을
현재 `main`에 복원하는 작업은 별도 scope다.

### 2.3 실제 Git 상태

| 항목             | 승인값                                        | 실제 결과                                          |
| ---------------- | --------------------------------------------- | -------------------------------------------------- |
| target branch    | `codex/text-authoring-p1-c-longform-20260813` | `MATCH`                                            |
| baseline/HEAD    | `5ef186d40128f265854ce1141c94f1b80141707e`    | `MATCH`                                            |
| upstream         | 없음                                          | `NONE`                                             |
| start tree       | clean P0 commit                               | 별도 worktree에서 시작                             |
| current tree     | P1-C 승인 경로만 소유                         | tracked modified `15`, untracked status entry `10` |
| scope audit      | P1-C 밖 변경 `0`                              | implementation closeout scope drift `0`            |
| publish boundary | `LOCAL_ONLY`                                  | 유지                                               |

QA는 위 baseline HEAD에 현재 P1-C diff를 올린 target tree에서 수행했고,
이 결과 문서를 포함한 exact tree를 하나의 local commit으로 고정한다.

## 3. current → target 결과

| 영역             | P0 current              | P1-C local result                                                                | 상태   |
| ---------------- | ----------------------- | -------------------------------------------------------------------------------- | ------ |
| raw block        | 행 중심 보존            | prose·quote·fence·HTML/comment·blank의 exact block/range                         | `PASS` |
| safe table       | 단순 표                 | quoted comma/tab, multiline, escaped quote/pipe, empty cell, URL·통화 shape 보존 | `PASS` |
| loss state       | generic issue           | table별 stable ID·exact range·count를 소유한 authoritative result loss           | `PASS` |
| budget           | 명시 한도 없음          | UTF-8 `1 MiB`, `20,000` lines, `50,000` logical cells 초과를 TXT-only            | `PASS` |
| false action     | 표는 Sheet/TXT          | action marker 없는 사실·가격·재료·metadata의 Todo·Calendar `0`                   | `PASS` |
| locator          | Item/issue 행 이동      | block/table/row/cell/loss exact locator·복귀·stale fallback                      | `PASS` |
| raw fallback     | 원문 접근               | exact TXT preview·복사·다운로드·저장/재진입                                      | `PASS` |
| result isolation | 일부 generic block      | malformed/loss table은 Sheet만, budget/locator 불신은 구조 결과만 fail-close     | `PASS` |
| P0 recurrence    | bounded 반복 projection | mixed raw prefix 1회 + `[반복 회차]` occurrence, 일반 구조화 회차 유지           | `PASS` |

P1-C의 공개 계약은 `parseResult.longDocument`, source locator, loss manifest,
Sheet long-table projection과 product gate로 한정했다. Routine 모델·저장 schema·공개
route·외부 provider는 변경하지 않았다.

## 4. 변경 파일과 소유 경계

| 분류                        | 실제 파일                                                                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| pure analysis·fixture·gate  | `lib/flow/text-authoring/long-document-table.ts`, `long-document-table-fixtures.ts`, `text-authoring-feature-flags.ts`                                                                                                   |
| parser·types·validation     | `lib/flow/text-authoring/parser.ts`, `types.ts`, `validation.ts`, `index.ts`                                                                                                                                             |
| projection·export·operation | `lib/flow/text-authoring/artifact-projection.ts`, `file-export.ts`, `operations.ts`                                                                                                                                      |
| UI·view state               | `components/flow/text-authoring/LongDocumentNavigator.tsx`, `InputPane.tsx`, `ResultPane.tsx`, `TextAuthoringWorkspace.tsx`, `authoring-ui-types.ts`, `view-model.ts`                                                    |
| unit·contract               | `lib/flow/text-authoring/long-document-table.test.ts`, `text-authoring-feature-flags.test.ts`, `operations.test.ts`, `components/flow/text-authoring/LongDocumentNavigator.test.tsx`, `product-result-surfaces.test.tsx` |
| browser                     | `tests/e2e/text-authoring-p1-long-document-table.spec.ts`                                                                                                                                                                |
| spec·evidence               | `docs/specs/2026-08-13-flowme-text-authoring-p1-c-longform/00-development-goal-ko.md`, 이 `README.md`, `docs/specs/README.md`                                                                                            |

별도 route, `package.json`, dependency, P1-A/B/D/E/F/G, P2, publication, P35,
external adapter 파일 변경은 `0`이다.

## 5. 실콘텐츠 fixture 추적성·권리 경계

| fixture                 | source shape                                    | 검증                                             | 권리 상태      |
| ----------------------- | ----------------------------------------------- | ------------------------------------------------ | -------------- |
| mixed raw synthetic     | blank·blockquote·fence·HTML/comment             | exact raw block·locator·save/re-entry            | 새 합성 원문   |
| safe CSV/TSV synthetic  | quoted delimiter·quote·multiline·empty·URL·통화 | exact row/cell + Sheet, false action `0`         | 새 합성 표     |
| safe Markdown synthetic | escaped pipe·empty·URL query                    | exact cell + Sheet                               | 새 합성 표     |
| malformed synthetic     | unclosed quoted multiline cell                  | Sheet fail-close + exact raw                     | 새 합성 입력   |
| oversized synthetic     | `1 MiB` 초과                                    | structured block + raw save/copy/download/reload | 자동 생성 입력 |

서울시 계약 표·공식 가격 통계·실제 레시피는 shape 판단 근거로만 사용했고,
외부 raw PDF나 원문 전체를 test fixture에 복제하지 않았다.

## 6. failure·recovery·rollback

| 시나리오                     | fresh result | 근거                                                                          |
| ---------------------------- | ------------ | ----------------------------------------------------------------------------- |
| malformed/loss table         | `PASS`       | Sheet blocked, Calendar·Todo·TXT 격리, exact source jump·raw copy/download    |
| processing budget            | `PASS`       | DOM/state에 full source 반영, raw save·localStorage·download·reload byte 동일 |
| preview/navigator write-zero | `PASS`       | 열기·검색·이동 전후 source/canonical/revision snapshot 동일                   |
| source 이동·복귀             | `PASS`       | result-origin locator identity, result selection, focus origin 복원           |
| stale locator                | `PASS`       | 가장 가까운 보존 block/row로 이동하고 fallback 안내                           |
| feature gate off             | `PASS`       | product route/store/schema mutation 없이 TXT-only runtime fallback            |
| mixed raw + P0 recurrence    | `PASS`       | exact raw prefix는 1회, `[반복 회차]`에 bounded occurrence 나열               |
| per-table loss authority     | `PASS`       | stable table/loss ID, exact source range, row/cell count 독립 보존            |

독립 rollback seam은
`NEXT_PUBLIC_FLOWME_TEXT_AUTHORING_P1_LONG_DOCUMENT_TABLE=off`다. gate off는 장문·표 구조
결과를 TXT-only로 낮추지만 WorkingSource·원문 접근·저장된 bytes를 삭제하지
않는다. 이 rollback은 배포 실행이 아닌 로컬 계약·test 검증이다.

## 7. fresh QA ledger

모든 실행은 `2026-08-13 KST`, target branch, HEAD
`5ef186d40128f265854ce1141c94f1b80141707e` + 현재 P1-C local diff에서 실행했다.
인계 evidence에 명령별 exact 시작·종료 wall clock이 없는 항목은 시각을 생성하지
않았고, 보존된 duration만 기록했다.

| 순서 | 명령·lane                                                | fresh result                                                                       |
| ---: | -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
|    1 | P1-C focused domain·gate·operation·UI contract final set | `74/74 PASS`                                                                       |
|    2 | `npm.cmd run test:text-authoring`                        | `273/273 PASS`                                                                     |
|    3 | Next TypeScript no-emit check                            | `PASS`, exit `0`                                                                   |
|    4 | `npm.cmd test`                                           | pretest와 호출된 suites exit `0`; terminal final approved-plan execution `182/182` |
|    5 | `npm.cmd run build`                                      | Next.js `15.5.21` `PASS`; static pages `19`, route table 변경 `0`                  |
|    6 | P1-C standalone diagnostic                               | `8/8 PASS`, `44.9s`; 후속 raw+recurrence/manifest 수정 전 진단                     |
|    7 | P1-C + 기존 Text Authoring 5-file 최종 회귀, workers `4` | `66/66 PASS`, `4.6m`; P1-C `8/8` 포함                                              |
|    8 | responsive·a11y instrumentation                          | `320/360/390/899/900/1024/1280/1440`, 200% text, reduced motion, focus return 검증 |
|    9 | `npm.cmd run docs:check`                                 | `PASS`, exit `0`; required files `16`, local links `4,557`                         |
|   10 | owned docs Prettier + scoped diff check                  | 새 goal/result `PASS`; tracked README + 새 goal/result/E2E whitespace `PASS`       |

`npm.cmd test`의 단일 aggregate test total은 terminal evidence에 명확히 합산되지 않아
새 총계를 만들지 않았다. 대신 exit `0`과 최종에 표시된 `182/182`만
기록했다.

`docs/specs/README.md` 전체 Prettier check는 이 작업 전부터 있던 한 행의
`S01~S23`, `S01~S21`을 `~~`로 escape하려는 baseline warning으로 exit `1`이다.
이 작업의 Active Gate 한 행과는 관계없음을 in-memory formatted comparison으로
확인했고, 역사 문구를 바꾸지 않기 위해 전체 `--write`는 수행하지 않았다.

6-file browser 회귀의 exact spec은 다음과 같다.

1. `tests/e2e/text-authoring-p1-long-document-table.spec.ts`
2. `tests/e2e/text-authoring-service-p0.spec.ts`
3. `tests/e2e/text-authoring-service-p0-product-evidence.spec.ts`
4. `tests/e2e/text-authoring-unsaved-guard.spec.ts`
5. `tests/e2e/text-authoring-service.spec.ts`
6. `tests/e2e/text-authoring.spec.ts`

## 8. subtraction·범위 감사

| 판정                                     |             결과 | 처리                                                                                             |
| ---------------------------------------- | ---------------: | ------------------------------------------------------------------------------------------------ |
| prior independent `BLOCK`                |              `3` | mixed exact raw, bounded recurrence composition, per-table manifest 권위 문제를 구현·test로 해결 |
| implementation closeout/contract `BLOCK` |              `0` | 최종 focused·shared·full E2E에서 해결 경로 통과                                                  |
| ledger consistency `BLOCK`               |          `1 → 0` | `74/74`, `273/273`, `4.6m`으로 최종 evidence 불일치 해소                                         |
| post-fix independent re-audit            | `PASS / BLOCK 0` | ledger 교정 후 기능 차단 항목 `0`                                                                |
| post-fix independent `NICE`              |              `1` | `원문 보존 TXT` copy nuance를 비차단 후보로 유지                                                 |
| post-fix independent scope drift         |              `0` | 승인되지 않은 P1/P2·provider·publication 혼입 없음                                               |

상시 outline/minimap·세 번째 pane·spreadsheet ribbon·formula/cell editor·안전한
표의 추가 성공 banner는 도입하지 않았다. 사용자가 오류 해결·원문
이동·복구에 필요한 결과 slot, 문서 찾기, raw fallback만 남겼다.

## 9. 상태 분리

| 상태                     | 현재값                              |
| ------------------------ | ----------------------------------- |
| local edits              | `COMPLETE / LOCAL_INTERNAL_QA_PASS` |
| local commit             | `INCLUDED_IN_THIS_COMMIT`           |
| push                     | `0 / NOT_AUTHORIZED`                |
| PR                       | `0 / NOT_AUTHORIZED`                |
| merge                    | `0 / NOT_AUTHORIZED`                |
| deploy                   | `0 / NOT_AUTHORIZED`                |
| P35/external side effect | `0`                                 |
| observed-user sessions   | `0`                                 |

## 10. 남은 HOLD와 다음 owner 결정

1. `flow-mvp/main`에서 사라진 승인 정본 working copy의 복원 여부는
   별도 scope로 판단한다.
2. push·PR·merge·deploy나 다른 P1/P2 track을 열려면 별도 owner 승인과
   단일-track manifest가 필요하다.

P1-A/B/D/E/F/G와 P2 전체는 이 작업에서 구현하지 않았다.
`LOCAL_INTERNAL_QA_PASS`는 로컬 자동·browser QA 결과일 뿐이며 실제
사용성, release, production 상태가 아니다.
