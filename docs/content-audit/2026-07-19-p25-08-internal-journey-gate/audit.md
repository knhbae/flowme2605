# P25-08 Integrated Journey Audit

## Findings

### Blocking

없음.

### High

최종 상태에는 없음.

통합 캡처 첫 실행에서 1024px Calendar agenda의 반복 항목 제목이 약 50px 폭에 갇혀 한 글자씩 세로로 꺾였다. 완료 체크, 제목/열기, 메모, 반복 상태가 한 행의 독립 열로 경쟁한 것이 원인이었다. 반복 상태를 제목 아래 메타로 이동하고 제목 실측 폭 `>= 100px` 회귀 assertion을 추가했다. 수정 후 monthly routine과 personal recurrence mobile/wide 시나리오가 다시 통과했다.

### Medium

1. **Public routine copy density**: 다음 관리일 preview는 실행 조작을 제거해 정직해졌지만, `시작일을 기준으로...` 설명은 여전히 두 줄 이상이다. 정보 손실 없이 더 줄일 수 있는지 owner/Claude Design 판단이 필요하다.
2. **Calendar wide density**: 1024px queue/grid/agenda는 overflow 없이 유지된다. 다만 긴 제목은 2~3줄이므로, queue 상시 노출과 agenda 폭의 tradeoff는 실제 디자인 검토 대상으로 남는다.
3. **Advanced personal draft depth**: 반복·시간·소요 시간·회차 상태까지 기능적으로 이어지지만, 고급 설정을 끝까지 수정하는 경로는 길다. progressive disclosure가 과밀을 낮추지만 이해 가능성은 자동화로 증명할 수 없다.

### Low

1. 일부 locator screenshot은 fixed platform chrome을 함께 포함해 문서용 이미지로는 덜 깔끔하다. review board는 chrome을 제거했거나 full-page 맥락이 명확한 캡처를 우선 사용한다.

## Test Debt Corrected

제품 회귀와 구분해 아래 오래된 E2E 기대값을 현재 계약으로 갱신했다.

- public routine preview: 저장 전 checkbox `4개` 기대를 read-only checkbox `0개`로 변경
- source-backed wide item open: 제거된 `다음 할 일` CTA 대신 whole-Flow outline의 실제 행 `열기` 사용
- personal draft completion: 상세 내부 중복 checkbox 대신 행 왼쪽 checkbox 사용

이 변경은 기능을 완화한 것이 아니라 P25의 정해진 계약을 테스트가 다시 따르도록 한 것이다.

## Method

### Evidence lanes

| Lane | 이번 패키지 사용 | 한계 |
| --- | --- | --- |
| current_command | unit/docs/build/git checks | 시각 이해도 증명 불가 |
| current_browser | Playwright production-mode route/interaction/download | 실제 사람의 망설임·오해 증명 불가 |
| prior_artifact | P25-01~P25-07 계약 비교 | 이번 실행 결과로 계산하지 않음 |
| heuristic | 36 screenshots 직접 시각 검사 | 관찰 사용자 증거 아님 |
| observed_user | 없음 | `0 / 15` 유지 |

### Viewports

- mobile: `390 x 844`
- wide: `1024 x 768`

### Interaction count rule

tap depth는 각 테스트가 명시한 checkpoint 이후 button/checkbox activation만 센다. text/date input과 route fixture 주입은 세지 않는다. 자동화 행동 수이며 실제 사람이 느끼는 난이도와 동일하다고 주장하지 않는다.

## Journey 1 - Anchor Inverse Timeline

**Fixture:** `/flow-maps/moving-d30`, anchor `2030-08-15`

**Path**

1. 이사일 입력
2. 전체 저장
3. 저장 직후 5개 전체 Flow 확인
4. `내 Flow 열기`
5. 한 행 완료
6. reload 후 `완료`에서 같은 행 완료 취소
7. wide에서 같은 outline과 detail pane 확인

**Evidence**

- 저장 직후 전체 outline: `5개`
- returning outline: `5개`
- completion/reopen: same task, persistent after reload
- mobile completion/note target: `44px` 이상
- wide selected Flow width: `700px` 이상
- overflow/console: `0 / 0`

**Representative captures**

- [post-save mobile](./screenshots/01-moving/01-moving-01-post-save-whole-flow-mobile.png)
- [returning wide](./screenshots/01-moving/01-moving-04-returning-whole-flow-wide.png)

**Verdict:** supported. Reuse and date-override preservation are additionally covered by the full P24 trust regression.

## Journey 2 - Undated Checklist

**Fixtures:** `travel-packing-list`, personal draft `충전기 챙기기`

**Path**

1. undated row를 My Flow `날짜 없는 할 일`에서 확인
2. 완료 후 즉시 되돌리기
3. Calendar `날짜 정하기`로 이동
4. selection-only checkbox로 선택
5. 오늘/직접 날짜 배치와 undo
6. detail에서 날짜 제거
7. source-backed undated item은 날짜 지정·제거 후 Calendar/ICS/list export 비교

**Evidence**

- My Flow undated execution row: `1`
- Calendar queue completion control: `0`
- scheduled Calendar event: `1`
- date removed Calendar event: `0`
- checklist/sheet/memo membership after date removal: retained
- overflow/console: `0 / 0`

**Representative captures**

- [My Flow mobile](./screenshots/02-undated/02-undated-placement-00-my-flow-anytime-mobile.png)
- [Calendar wide placement](./screenshots/02-undated/02-undated-placement-04-calendar-placement-wide.png)

**Verdict:** supported. Calendar is a placement surface, not a second undated execution list.

## Journey 3 - Recurring Routine

**Fixture:** `/f/washer-tub-clean-monthly`, first date `2026-07-20`

**Path**

1. read-only four-occurrence preview 확인
2. Flow 저장
3. My Flow에서 series definition 확인
4. Calendar occurrence 완료·취소
5. next month occurrence 확인
6. ICS RRULE 비교

**Evidence**

- public preview occurrences: `4`
- public preview completion controls: `0`
- series definition completion controls: `0`
- occurrence completion controls: `1`
- recurrence: monthly, `BYMONTHDAY=20`
- stable occurrence identity after reopen: true
- wide title one-character wrap: `0`
- overflow/console: `0 / 0`

**Representative captures**

- [public preview mobile](./screenshots/03-routine/03-routine-01-washer-monthly-preview-mobile.png)
- [Calendar wide](./screenshots/03-routine/03-routine-03-washer-monthly-calendar-wide.png)

**Verdict:** supported.

## Journey 4 - Mixed Sequence And Date

**Fixture:** memo draft `여행 출발 준비`, three tasks

**Path**

1. whole Flow selection mode 진입
2. 두 항목 선택
3. 날짜 영향 preview 확인
4. 날짜 일괄 적용·undo
5. 선택 범위 export 열기
6. 날짜 없애기
7. Flow에서 빼기·복구
8. wide select-all 확인

**Evidence**

- selection mode completion controls: `0`
- selected count / affected count parity: true
- date override and explicit date removal persisted: true
- remove permitted only with recovery: true
- source-backed remove control: `0`
- recurring batch scope guard: present
- overflow/console: `0 / 0`

**Representative captures**

- [batch date preview mobile](./screenshots/04-mixed/04-mixed-00-batch-date-preview-mobile.png)
- [batch selection wide](./screenshots/04-mixed/04-mixed-01-batch-selection-wide.png)

**Verdict:** supported within the bounded selection model.

## Journey 5 - Record And Memo

**Fixture:** `이사 견적을 비교한다. 관리사무소에 연락한다. 주소 변경 대상을 확인한다.`

**Path**

1. 3개 split preview
2. 1개 제외, 1개 title 수정
3. first task date 지정
4. exactly 2개 저장
5. whole/selected export count 비교
6. Calendar 1개 + undated queue 1개 확인
7. reload 후 stable IDs 확인

**Evidence**

- parsed: `3`
- accepted/saved/reloaded: `2 / 2 / 2`
- generic filler: `0`
- Calendar eligible: `1`
- checklist/sheet/memo eligible: `2`
- selected ICS events: `1`
- overflow/console: `0 / 0`

**Representative captures**

- [acceptance mobile](./screenshots/05-record/05-record-export-00-memo-split-acceptance-mobile.png)
- [whole Flow wide](./screenshots/05-record/05-record-01-memo-split-items-wide.png)

**Verdict:** supported.

## Journey 6 - Personal Draft And Occurrence

**Fixture:** URL miss recurrence draft `반복 일정 확인`

**Path**

1. URL miss candidate 생성·저장
2. user item 추가
3. 날짜와 daily count 3 반복 설정
4. Calendar에서 첫 회차 완료·reload·재개
5. 둘째 회차 건너뜀
6. 보류 후 ordinary Calendar/My Flow에서 숨김
7. My Flow `보류한 일정`에서 같은 occurrence 재개
8. series ICS before/after UID 비교

**Evidence**

- series definition control: `0`
- each occurrence completion control: `1`
- calendar occurrences: `3`
- done/reopened/skipped/held/resumed states distinct: true
- held ordinary execution row: `0`
- recovery occurrence stable ID: true
- RRULE event count: `1`
- ICS UID stable: true
- overflow/console: `0 / 0`

**Representative captures**

- [occurrence done mobile](./screenshots/06-personal-draft/06-personal-recurrence-01-personal-draft-occurrence-done-mobile.png)
- [occurrence Calendar wide](./screenshots/06-personal-draft/06-personal-recurrence-03-personal-draft-occurrence-calendar-wide.png)

**Verdict:** supported. Advanced edit comprehension remains a human-review question.

## Tap Depth Checkpoints

| Checkpoint | Browser action count | Start state |
| --- | ---: | --- |
| moving save -> whole artifact visible | 1 | anchor entered |
| post-save -> returning whole Flow | 1 | post-save panel visible |
| completed view -> reopen task | 2 | My Flow workspace, after reload |
| Anytime -> Calendar queue | 1 | Anytime section visible |
| selected undated item -> apply chosen date | 2 | queue open, date already entered |
| batch select two -> apply date | 4 | batch mode entry visible, date input excluded |
| public routine save | 1 | anchor entered |
| occurrence complete -> reopen | 2 | selected-day row visible |
| memo split review -> save accepted rows | 2 | split preview visible, input edits excluded |

These counts describe scripted controls only. They do not measure hesitation, comprehension, or perceived complexity.

## Accessibility And Operability

- task completion accessible name includes effective task title and complete/reopen context
- `열기` accessible name includes title, Flow context, and date where available
- batch selection uses separate selection checkboxes and removes completion controls
- Calendar queue selection checkbox does not use completion wording
- structural add/reorder/restore paths include keyboard Enter/Space tests
- mobile completion and note controls meet `44px` target in the moving representative path
- no horizontal overflow at `390x844` and `1024x768`

## Current Command Results

- `npm.cmd exec -- playwright ... six representative journeys`: final `9 / 9`
- `npm.cmd exec -- playwright ... relevant full regression`: `81 / 81`
- `npm.cmd exec -- playwright tests/e2e/flow-mvp.spec.ts --grep ...`: eight current-contract paths pass (`7` in the combined run plus the corrected completion-summary assertion in an isolated rerun)
- `npm.cmd test`: `526 / 526`
- `npm.cmd run docs:check`: pass, `14` required files and `2516` local links
- `npm.cmd run build`: pass, 18 static/dynamic route entries
- `git diff --check`: pass; line-ending warnings only

## Readiness

- internal automated gate: pass after one High visual correction
- owner/Claude Design review package: ready
- external observed-user gate: closed
- observed-user sessions: `0 / 15`
- production deployment: unchanged; `https://flowme2605.vercel.app` remains the P24/main baseline until this branch is merged and deployed
