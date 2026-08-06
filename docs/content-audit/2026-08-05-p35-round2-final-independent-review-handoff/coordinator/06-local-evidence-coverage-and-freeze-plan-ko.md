# S01~S23 local evidence coverage와 candidate freeze 실행 지도

> 상태: `COVERAGE_MAPPED / CANDIDATE_FREEZE_AUTHORIZED / FINAL_CAPTURE_PENDING / NOT_REVIEWER_VISIBLE`
>
> 현재 pre-freeze working-tree BUILD_ID: `vAb8e5TudUXvxEyowetMU`
>
> product candidate SHA: `TBD`
>
> evidence publication authority: `GRANTED_WITH_SEQUENCE_GATES`

이 문서는 현재 테스트가 무엇을 검증하는지와 독립 검토 계약에서 아직 파일로 남겨야 하는 증거를 연결한다. 기존 P0/P1 캡처는 재캡처 설계도나 내부 참고자료로만 쓴다. 최종 blind evidence는 clean product candidate SHA를 고정한 뒤 같은 candidate epoch에서 새로 만들고, 파일별 byte length·MIME·SHA-256을 manifest에 기록한다.

## 1. 우선순위와 공통 명령

최종 캡처 우선순위는 다음과 같다.

1. S01 lookup의 `hit / review / miss / empty / error`
2. S04 저장 전환과 S05 실제 결과 이동의 storage·artifact chain
3. S03/S08 공통 editor의 apply·cancel·Back·error·reload
4. S09/S18/S19/S20/S21 원시 artifact와 parser 결과
5. S06/S07/S10/S11/S12의 연속 storyboard와 recovery trace
6. S02/S13/S14/S15/S16의 current-build 재캡처와 구조화 trace
7. S17 rollback runtime trace, S22 `NOT_ASSESSED`, S23 reviewer 선택 경로

후보 동결 뒤 공통 실행 형식:

```powershell
$env:FLOWME_PLAYWRIGHT_PORT='3114'
$env:<EVIDENCE_VAR>='<candidate-epoch evidence path>'
npx.cmd playwright test tests/e2e/<spec>.spec.ts --workers=1 --retries=0
```

최종 실행에서는 위 명령 앞뒤로 `git status --short --branch`, HEAD, BUILD_ID, storage journal, console/network trace를 함께 저장한다. dirty tree에서는 rehearsal만 가능하며 최종 evidence로 승격하지 않는다.

## 2. S01~S08

| ID | 현재 자동 검증 owner | 현재 파일형 증거 | candidate freeze 뒤 추가할 것 |
|---|---|---|---|
| S01 | `p35-p1-q3-copy-disclosure.spec.ts`, `flow-mvp.spec.ts`, `url-first-user-surface.spec.ts`, `p24-execution-trust.spec.ts` | lookup 전 discovery 화면만 있음 | hit/review/miss/empty/error 전 상태 full screen, request/result payload, console/network. 실제 lookup error fixture가 없으므로 evidence-only failure injection 필요 |
| S02 | `p35-public-result-first.spec.ts`, `p35-r0-temporal-first-group.spec.ts`, `p35-r1-artifact-preflight-parity.spec.ts` | P0-07 구 build 참고 캡처 | dated/undated/mixed full screen, ordered effective Item IDs, capability manifest JSON |
| S03 | `p35-p0-editor-surface.spec.ts`, `p35-adjust-one-kind.spec.ts` | P0-06 editor open 참고 캡처 | before/open/error/recovery/after storyboard, raw storage before/after, focus sequence |
| S04 | `p35-p0-save-lifecycle.spec.ts`, `p35-r3-receipt-workspace-continuity.spec.ts`, `p35-p0-integration-gate.spec.ts` | P0-04/P0-08 화면 참고 가능 | save write journal, identity/idempotency, duplicate/retry, destination full screen, save receipt JSON |
| S05 | `p35-p0-result-transfer.spec.ts`, `p35-p0-result-transfer-formats.spec.ts`, `p35-p0-result-transfer-evidence.spec.ts` | P0-09 9장, final build 결속 없음 | ordered storyboard, raw ICS/TSV/Memo/clipboard, MIME/newline/bytes/hash, parser result, receipt history |
| S06 | `p35-p0-saved-plan-library.spec.ts`, evidence companion, `p35-p1-final-internal-gate.spec.ts`, `p35-r12-cross-flow-todo-experiment.spec.ts` | 0/1/5/20 일부 viewport; P1-04 20-plan mobile은 current build | 동일 fixture의 0/1/5/20 mobile·desktop pair, Today/Todo owner와 count, 검색·필터·overflow |
| S07 | `p35-p0-my-flow-entry-completion-memo.spec.ts`, `p35-p1-visual-subtraction.spec.ts`, `p35-r8-continuity.spec.ts` | P1-01 Item 화면은 참고용 | detail closed/open → edit → memo → complete → reopen, focus trace, Item-only storage diff |
| S08 | `p35-p0-editor-surface.spec.ts` | P0-06 saved Plan/Item 참고 캡처 | cancel/error/recovery/reload full states, raw record before/after, public/saved 공통 surface 비교 |

## 3. S09~S16

| ID | 현재 자동 검증 owner | 현재 파일형 증거 | candidate freeze 뒤 추가할 것 |
|---|---|---|---|
| S09 | `p35-r1-artifact-preflight-parity.spec.ts`, `p35-p0-result-transfer-formats.spec.ts`, `p35-p0-result-transfer.spec.ts` | P1-03 parity 문서, raw 파일 없음 | 실제 ICS/TSV/Memo/clipboard, parser JSON, IDs/count, held/unavailable reason, receipt JSON |
| S10 | `p35-p0-map-action-contract.spec.ts` | 적용 상태 일부의 구 build PNG | choose-child/save-all/review-hold/conflict/failure/save-complete, storage journal, affected IDs |
| S11 | `p35-p1-q3-copy-disclosure.spec.ts`, `FlowContextDisclosure.test.tsx` | disclosure open 화면 없음 | closed/open full screen, Enter/Space/Escape, activeElement 순서, ARIA name/relation |
| S12 | result-transfer/editor/Map failure·retry specs | P0-09 partial/retry 참고 화면 | before/after journal, request/receipt IDs, console/network, duplicate/retry recovery |
| S13 | `p35-p1-final-internal-gate.spec.ts` legacy matrix | P1-04 `07-legacy-read-only-fail-safe`는 current build | source-backed/missing-base/malformed raw before/after와 SHA-256 |
| S14 | P35 R7 fixture와 P1-04 real 50-Item test | P1-04 `05`, `06`은 current build 50-Item | 1/8/24/50 ordered IDs, long/special-character raw payload와 artifact |
| S15 | P1 visual, P0 editor, P1-04 reflow tests | P1-04 390과 720×500 reflow proxy는 current build | 390/1024/1440 current-build pair. 실제 browser 200% zoom은 `NOT_ASSESSED`로 유지하거나 별도 실브라우저 증거 필요 |
| S16 | P1-04 nested dialog, Q3 disclosure, alert component tests | P1-04 reduced-motion PNG는 current build | ARIA snapshot, focus sequence/return, live-region/alert trace. 실제 screen-reader 음성은 별도 확인 전 주장 금지 |

## 4. S17~S23

| ID | 현재 자동 검증 owner | candidate freeze 뒤 추가할 것 |
|---|---|---|
| S17 | `p35-round2-flags.test.ts`, P1-04 exact-off/uppercase E2E | 각 phase flag의 exact on/off/uppercase runtime route·copy·state trace, raw storage before/after. Claude는 `NOT_RUN — CODEX_ONLY` |
| S18 | `effective-flow-artifact-codec.test.ts`, `effective-flow-transfer-artifact.test.ts`, result-transfer format tests | newline/tab/quote/UTF-8/CRLF/emoji TSV 원문, byte dump, MIME, SHA-256, parser round-trip JSON |
| S19 | effective export/date/recurrence tests와 P1-03 Calendar parity | timezone config, DST fixture, dated/undated/mixed/overdue UI, raw ICS와 parser result. 실제 browser timezone을 쓰지 않았다면 그 사실을 명시 |
| S20 | `recurrence.test.ts`, `effective-routine-projection.test.ts`, format transfer tests | Item/series/VEVENT를 서로 다른 단위로 적은 manifest, raw ICS parse, receipt identity |
| S21 | result-transfer format/evidence tests | 실제 download/clipboard 호출 trace, filename, MIME/charset/newline, byte length, raw SHA-256, preview와 raw 분리 |
| S22 | 전용 owner 없음 | 승인된 budget·trace가 없으므로 `NOT_ASSESSED`; 일반 체감이나 E2E 시간으로 대체 금지 |
| S23 | reviewer free exploration | 사전 결론을 넣지 않는다. reviewer가 선택한 route·seed·action과 새 evidence만 기록 |

## 5. 현재 재사용 가능한 current-build 자료

다음 P1-04 자료는 이전 closeout working-tree BUILD_ID `IHBpJ9XgKzGiPW_C767jU`에서 생성된 보관 자료다. 현재 candidate preflight BUILD_ID는 `vAb8e5TudUXvxEyowetMU`이며, 어느 값도 아직 immutable candidate identity가 아니다.

- 20-plan mobile과 720×500 reflow proxy
- nested editor + reduced motion
- exact-off/uppercase rollback
- real 50-Item editor와 transfer
- legacy read-only fail-safe

하지만 product candidate SHA와 clean proof가 없으므로 이 파일도 최종 blind evidence가 아니다. candidate freeze 뒤 같은 SHA/build 조합으로 다시 만들거나, 동일 파일을 재사용할 경우 생성 chain과 hash equality를 별도 증명해야 한다.

## 6. Freeze·capture·publication 순서

1. Owner가 P35 Round 2 전체 변경의 commit·push 범위를 승인한다.
2. task-owned 파일만 commit하고 clean checkout에서 `product_candidate_sha`를 고정한다.
3. 같은 SHA에서 build를 다시 실행해 새 BUILD_ID와 build log hash를 만든다.
4. S01~S23를 capture하고 각 파일의 bytes·MIME·SHA-256, storage/artifact/parser trace를 채운다.
5. blind-only tree를 informed 파일이 존재하지 않는 별도 publication에 게시한다.
6. Codex·Claude Pass 1을 fresh session에서 각각 실행하고 결과를 동결한다.
7. 두 Pass 1 freeze 뒤 informed-only publication을 게시하고 Pass 2를 새 세션에서 실행한다.
8. coordinator가 runtime fact, visual finding, informed delta, disagreement, Owner 결정을 종합한다.

Owner는 2026-08-05에 1~5번과, 두 Pass 1 결과가 모두 동결된 뒤의 7번 GitHub publication을 승인했다. 6번의 Claude Design 실행·결과 동결은 외부 reviewer 입력이 필요하며, 두 결과가 모두 동결되기 전에는 7번으로 진행하지 않는다. PR, merge, Production/Vercel Preview·Production 배포, 실제 사용자 관찰은 승인 범위가 아니다. 자세한 경계는 [Owner 실행·게시 승인 기록](./07-owner-publication-authorization-ko.md)을 따른다.
