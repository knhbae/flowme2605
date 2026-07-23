# P24 clean 독립 회귀 감사 — 상세 판정

- **실행자:** Claude Code (자동 브라우저·명령 기반, 실제 사용자 아님)
- **증거 등급:** `automated_simulated`
- **실제 사용자 관찰:** 0 / 15 (변동 없음)
- **제품 기준선:** origin/main `1f0361209fac3cdd85c67cf64496ff5d5dd9fb9d` ("Merge P24 independent review handoff")
- **실행 시각 기준일:** 2026-07-15 (KST)

이 감사는 이전 dirty dev 환경에서 나온 finding을 현재 clean production과 섞지 않고, 논쟁 항목을 clean origin/main + tracked lockfile에서 재현 중심으로 다시 판정한다. 앱 코드는 수정하지 않았다.

## 1. 환경 분리와 근본 원인 정정

| 항목 | 값 |
| --- | --- |
| origin/main SHA | `1f03612` |
| 로컬 체크아웃 | 브랜치 `wip/worktree-consolidation-20260714` (`1aba5da`), untracked 다수 |
| 감사 worktree | `D:/flowme2605/.tmp/flowme-p24-clean-1f03612` (detached, clean) |
| 설치 | `npm ci` (tracked `package-lock.json`) |
| node | v24.17.0 |
| next | 15.5.20 |
| @playwright/test | 1.61.1 |
| postcss | 8.5.16 |
| react / tailwindcss / typescript | 19.0.0 / 3.4.17 / 5.8.3 |
| production alias | <https://flowme2605.vercel.app> — 익명 HTTP 200 (대표 route 6/6, SSO 없음) |

**디스크 관련 정정.** 최초 clean worktree를 `C:` 임시 볼륨에 만들자 `npm ci`가 진전 없이 멈췄다. 원인은 제품/lockfile이 아니라 **`C:` 볼륨의 잔여 공간 0 GB**였다("No space left on device"). worktree를 `D:`(187 GB 여유)로 옮기자 `npm ci`가 정상 완료됐다. 이 사실은 이전 세션의 build 논쟁과 무관한 순수 인프라 조건이므로 별도로 기록한다.

**의존성 커밋 상태 정정.** 이전 dirty 세션에서 "커밋 안 된 업그레이드"로 봤던 next 15.5.20 / postcss 8.5.16 / playwright 1.61.1은 이제 origin/main에 정식 tracked로 커밋돼 있다. 단, dirty 트리에만 있던 `overrides`(tmp/uuid)와 `engines` node:24.x는 커밋되지 않았다. 즉 커밋된 업그레이드는 dirty 트리보다 좁다.

## 2. 검증 명령 결과 (clean, 이번 실행)

| 명령 | 결과 |
| --- | --- |
| `npm run docs:check` | pass (14 required files, 2,214 local links) |
| `npm test` | pass **514 / 514** |
| `npm run build` | pass, Compiled successfully in 43s, **Generating static pages (18/18)** |
| targeted E2E `p24-execution-trust.spec.ts` | pass **14 / 14** (single worker, 58.7s) |
| 전체 E2E (single worker) | **272 passed, 2 failed / 274 distinct** (11.9m) — 두 실패는 ENV-DATE-01 |
| `git diff --check` | clean (whitespace 오류 없음) |
| 앱 코드(app/components/lib/package.json/playwright.config) | clean worktree에서 무변경 |
| production screenshot | 12장 (6 route × 2 viewport), horizontal overflow 0px, console error 0 |
| production export | ICS(5 VEVENT, stable UID), checklist/sheet/memo 실제 캡처 |

명령을 실행하지 못한 것은 없다. 전체 E2E는 단일 worker로 완주했고 distinct 수는 274다.

## 3. 논쟁 항목 판정

모든 항목이 clean에서 판정됐다. 핵심 결론: **이전 dirty 세션에서 Blocking으로 올렸던 항목은 clean origin/main에서 재현되지 않는다.** 각 항목마다 대응하는 fix 커밋과 자동 assertion이 존재한다.

| ID | 논쟁 | 이전 주장 | Clean 판정 | 근거 |
| --- | --- | --- | --- | --- |
| BUILD-01 | build가 Collecting page data에서 실패 | dirty B1 Blocking | **not_reproduced_current** | `npm run build` exit 0, 18/18 pages. dirty 실패는 미커밋 `overrides`+`engines` 때문(environment_specific) |
| ENTRY-01 | /flows 직접 진입·새로고침 무한 로딩 | dirty H1 | **not_reproduced_current** | E2E `:717` pass, production /flows 200 |
| ENTRY-02 | 저장 직후 /my 빈 화면 | dirty H2 | **not_reproduced_current** | E2E `:758` pass, production 저장이 reload 없이 /my에 표시 |
| DATE-01 | KST 오전 하루 전 날짜 | codex Blocking | **not_reproduced_current** | E2E `:59` pass (Asia/Seoul), fix `b9fcc06` |
| DATE-02 | summary가 항목 날짜 override 무시 | dirty B4 Blocking | **not_reproduced_current** | E2E `:113` pass, `resolveMyFlowEffectiveDate` 단일 resolver, fix `1ec51d2` |
| DATE-03 | 재사용 날짜 유지가 리셋됨 | dirty B5 Blocking | **not_reproduced_current** | E2E `:199` pass, fix `6e376bc` |
| REC-01 | 반복 첫 회차만 남음 | dirty B2 Blocking | **not_reproduced_current** | E2E Allblanc 4주 회차 pass, unit `recurrence.test`, fix `e6c0f8f` + `saved-routine-occurrence.ts` |
| DRAFT-01 | 메모 split todo 항목 누락 | dirty B3 Blocking | **not_reproduced_current** | E2E `:324` pass, fix `b0f7744` |
| DRAFT-02 | 빈 miss가 상태 문장을 제목으로 저장 | codex High | **not_reproduced_current** | E2E `:532` pass, `url-first-supply-queue` title 필수화 |
| EXPORT-01 | 캘린더 export가 Flow-level처럼 보이나 1개만 | dirty/user High(M3) | **not_reproduced_current** | E2E `:464` pass, production 가져가기 시트 scope-우선, whole ICS 5 VEVENT |
| EDIT-01 | 편집 폼에 무관한 범용 필드 노출 | dirty/user Medium(M1) | **not_reproduced_current** | E2E `:806`·`:905` pass, fix `f4ba196` |
| LOCK-01 | source-backed vs 개인 draft 편집 경계 | dirty Medium(M2) | **boundary_maintained** | source-backed는 add/delete/reorder 컨트롤 없음(정책 gate 유지), 개인 draft는 전체 CRUD 유지 |

### 3.1 대표 항목 재현 근거

- **DATE-02 (override 정합).** `lib/flow/my-flow-personal-state.ts`의 `resolveMyFlowEffectiveDate`가 draft > execution_override > personal_copy > source 순으로 단일 해석한다. production에서 이사일 2026-08-13로 저장 후 whole-flow ICS의 DTSTART가 20260714/20260730/20260806/20260812/20260813로 항목 override와 정확히 일치했다. 이전 dirty 세션에서 summary만 override를 무시하던 증상은 재현되지 않았다.
- **REC-01 (반복 materialization).** `saved-routine-occurrence.ts`(357줄)가 `resolveSavedRoutineRecurrence` / `expandSavedRoutineOccurrenceRows`로 회차를 실체화한다. E2E "saved Allblanc routine keeps all four-week occurrences ... RRULE export aligned"와 unit "saved source routine expands the selected four-week cadence"가 모두 통과했다. 이전 "첫 회차만 남음"은 재현되지 않았다.
- **EXPORT-01 / D (export scope).** production 가져가기 시트가 **형식보다 먼저 범위**를 노출한다: `전체 Flow · 5개` / `선택한 항목 · 0개` → 형식별 예상 개수(`캘린더 파일 · 날짜 있는 항목 · 5개` 등). whole ICS는 1개가 아니라 5개 VEVENT를 담았다.

## 4. Claude Design (8) A~G 구조 회귀

| 키 | 구조 | 판정 | 근거 |
| --- | --- | --- | --- |
| A | progressive editor | present | E2E `:806`·`:905`, fix `f4ba196` |
| B | inline completion undo | present | E2E `:583` (Today 제자리 되돌리기, 항목당 control 1개), fix `74a78eb` |
| C | Calendar unscheduled tray | present | E2E `:959` (날짜 없는 draft를 Calendar에서 preview·undo·reload 지속), fix `1d9717d` |
| D | whole/selected/current export scope | present | E2E `:464` + production 가져가기 scope-우선·개수 표시, fix `69c572d` |
| E | linked/fixed date movement | present | `date-movement.ts` + `date-movement.test`, fix `fc34e39`, E2E ux12 한 회차만 이동 |
| F | one occurrence / one executable control | present | E2E `:658` (미래 큐 항목은 control 없는 preview) |
| G | inline private/correction notes + aggregation | present | E2E `:1054` (실행 메모 1탭, 완료 시 별도 집계), fix `8f87a38` |

A~G 전부 clean 빌드에서 자동 assertion 또는 production 관찰로 확인됐다.

## 5. 새 finding

### ENV-DATE-01 (Low, environment_specific) — 전체 E2E 2건 실패

전체 E2E에서 2건이 실패했다.

- `flow-mvp.spec.ts:1539` product IA v2 keeps discovery simple and saved execution clear
- `flow-mvp.spec.ts:3893` source-backed moving map saves one dated timeline into My Flow calendar

두 실패의 근본 원인은 **날짜 고정 fixture**다. origin/main의 이 두 테스트는 이사일을 리터럴 `2026-07-22`로 채운다. 실행일이 2026-07-15이면 이사 timeline의 "지금" 항목이 D-7(7/15, 관리사무소 공유)로 이동하므로, 첫 항목(D-30) 또는 `지난 할 일` 버킷을 기대한 assertion이 어긋난다. 렌더된 앱은 해당 날짜 기준으로 정확하다.

**이미 브랜치에 수정 존재.** 커밋 `1aba5da "test: make moving E2E fixtures date-independent"`(브랜치 `wip/worktree-consolidation-20260714`, origin/main 미포함)가 정확히 이 두 테스트의 리터럴 anchor를 `createMovingDateFixture()`(= today + 10일)로 교체한다. 이 커밋을 merge하면 두 실패가 사라진다.

→ 제품 회귀 아님. test-harness의 wall-clock 취약성이며, 수정이 이미 별도 브랜치에 존재한다. origin/main 전체 E2E를 날짜 무관하게 만들려면 `1aba5da`를 반영하면 된다.

## 6. 자동 검증 vs 실제 사용자 관찰 필요

- **자동이 증명한 것:** clean build 성공, 514 unit, 274 distinct E2E(272 pass), production 6 route × 2 viewport의 overflow 0·console 0, ICS/checklist/sheet/memo 실제 산출물, 항목 날짜·반복 회차·export 범위·완료 되돌리기의 assertion.
- **실제 사용자만 답할 수 있는 것 (여전히 미해결):**
  1. LOCK-01: source-backed 구조 편집 컨트롤 부재를 사용자가 버그로 느끼는지 vs 자연스러운 경계로 읽는지.
  2. My Flow의 연필(✎)·열기·완료 체크를 설명 없이 서로 다른 행동으로 구분하는지.
  3. 가져가기 범위(전체/선택)와 예상 개수를 사용자가 실제로 예측하는지.
  4. 반복 회차의 "지금 실행 vs 다음 미리보기" 구분을 사용자가 이해하는지.
  5. public /f 긴 화면에서 첫 저장 판단이 먼저 읽히는지.

## 7. P24-01A 착수 판단

이전 dirty 세션이 P24-01A(source v2 merge contract) 보류의 근거로 든 실행 계약 파손(반복·날짜·draft)은 **clean에서 재현되지 않는다.** 해당 계약은 fix 커밋과 자동 회귀로 닫혀 있다. 따라서 **코드 정합성 측면에서는 P24-01A source v2 merge contract 착수를 막을 blocking 회귀가 없다.**

단, handoff 자체 기준(P24-00C는 실제 관찰 이후 확정)과 LOCK-01의 사용자 확인 필요는 유지된다. 순수 데이터 계약 작업(three-way resolver, orphan 정책, migration fixture, UI 무변경)은 관찰과 병행 착수 가능하지만, source-backed 구조 편집 **UI** 노출은 관찰 결과 전까지 보류가 타당하다.
