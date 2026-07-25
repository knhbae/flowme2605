# P33 Cross-entry Canonical Alignment Audit

## 1. 시작 상태

독립 검토에서 같은 AJD 원문과 같은 D-day 준비 목적이 네 경로에서 두 snapshot으로
갈라진 것이 확인됐다.

| Entry | 이전 route | 이전 항목 | 이전 저장 identity |
| --- | --- | ---: | --- |
| Home | `/f/moving-d30-basic` | 24 | `flow:saved:moving-d30-basic` |
| Flow 찾기 | `/flow-maps/moving-d30` | 5 | `flow:saved:source-backed-moving-d30` |
| AJD URL lookup | `/flow-maps/curated-ajd-moving-d30` | 5 | `flow:saved:curated-ajd-moving-d30` |
| direct alias | `/f/source-backed-moving-d30` | 5 | `flow:saved:source-backed-moving-d30` |

5개 snapshot은 24개 항목의 안정적인 부분집합이 아니라 여러 행동을 합친 aggregate다.
따라서 배열 순서, 제목 유사도, 최신 저장 시각으로 개인 상태를 자동 병합할 수 없다.

## 2. Editorial 결정

24개 `moving-d30-basic`을 canonical public snapshot으로 선택했다.

- canonical source: `source:ajd:moving-checklist:23363`
- user job: `job:prepare-move-by-dday`
- editorial variant: `variant:ajd-moving:comprehensive-calendar-v1`
- canonical Flow:
  `canonical:source:ajd:moving-checklist:23363|job:prepare-move-by-dday|variant:ajd-moving:comprehensive-calendar-v1`
- compatibility read ID: `flow:ajd-moving:prepare-by-dday:comprehensive-calendar-v1`
- canonical route: `/f/moving-d30-basic`
- canonical item count: `24`

5개 snapshot은 `variant:ajd-moving:legacy-compact-v1`로만 보존한다.

## 3. Cross-entry 동작

- `/flow-maps/moving-d30`
- `/flow-maps/curated-ajd-moving-d30`
- `/f/source-backed-moving-d30`
- `/f/curated-ajd-moving-d30`

위 alias는 모두 `/f/moving-d30-basic`으로 redirect된다. `/flows`에는 AJD 이사
canonical card가 한 번만 나타나며 24개를 표시한다. AJD URL hit도 같은 public
route와 24개 결과를 반환한다.

같은 source URL을 쓰더라도 user job이나 intentional editorial variant가 다르면
자동 중복으로 취급하지 않는다.

## 4. Storage와 rollback

신규 metadata:

- `flow:canonical:origin:v1`
- `flow:canonical:reconciliation:v1`

기존 `flow:saved:*`, completion, personal overlay, run, occurrence, export key는
그대로 둔다. canonical route의 신규 저장만 origin metadata를 기록한다.
백업 대상에는 `flow:canonical:*`이 포함된다.

동일 canonical group의 saved copy가 두 개 이상이면 My Flow에서 다음을 수행한다.

1. 각 origin과 24개/5개 범위를 보여준다.
2. 자동 병합하지 않는다고 명시한다.
3. 사용자가 active copy를 선택한다.
4. active copy는 복구하고 나머지는 lifecycle archive에 둔다.
5. 원래 saved key와 개인 상태 key는 모두 보존한다.

Rollback은 canonical metadata read를 제거하거나 alias opt-in을 되돌려 기존 saved
record read path로 복귀할 수 있다. 데이터 삭제가 없으므로 역변환 migration이
필요하지 않다.

## 5. Artifact와 downstream parity

moving과 vehicle은 Calendar/Checklist 선택을 실제 preview와 save payload에
반영한다. Home vehicle promise는 실제 기본 결과인 Calendar와 맞췄다.

Canonical moving을 이사일 `2030-08-15`로 저장한 browser fixture 결과:

- saved receipt total: 24
- My Flow progress: `전체 0/24 완료`
- whole export scope: `Flow 전체 · 24개`
- Calendar 날짜별 합계:
  - 2030-07-16: 4
  - 2030-08-05: 5
  - 2030-08-12: 4
  - 2030-08-14: 4
  - 2030-08-15: 5
  - 2030-08-16: 2
  - total: 24

Calendar는 canonical 표시명 `이사 D-30 준비`를 사용한다. 좁은 월간 cell에서는
visible label만 compact하게 줄이고 `title`과 accessible identity에는 전체 이름을
유지한다. Group identity는 `data-flow-slug="moving-d30-basic"`으로 유지한다.

Canonical public 저장본의 source Item 제외도 같은 개인 상태 경계를 사용한다.
`Flow에서 제외`는 source Item을 지우지 않고 saved Item state를
`excluded_on_start`로 저장한다. `다시 포함`, immediate undo, reload 후 restore는
같은 stable Item ID를 사용하며 completion/run state를 구조 변경에 섞지 않는다.

모바일 Item detail close는 `FlowBottomSheet` 하나가 focus return을 소유한다.
wide inline detail은 기존 AppClient return path를 유지한다. 이 분리로 viewport
전환과 sheet close 뒤의 이중 지연 focus 경합을 제거했다.

## 6. Recurrence copy

사용자 화면의 raw RRULE은 공통 formatter를 거친다.

- `FREQ=DAILY` -> `매일`
- `FREQ=WEEKLY;INTERVAL=2` -> `2주마다`
- `FREQ=MONTHLY` -> `매월`
- malformed rule -> `반복 실행`

Source schedule과 occurrence identity는 변경하지 않는다.

## 7. Verification 분류

| Evidence | Kind | Observed-user 여부 |
| --- | --- | --- |
| registry/storage unit | current command | 아니오 |
| cross-entry Playwright | current browser automation | 아니오 |
| 390/1024/1440 screenshot | current package screenshot | 아니오 |
| source diff | current source | 아니오 |
| 독립 P33 검토 | prior review artifact | 아니오 |

Observed-user count: `0`.

Current command 결과:

- pretest `64 / 64`
- unit `588 / 588`
- P33 Playwright `6 / 6`
- memo reload repeat `30 / 30`
- full Playwright `320 / 320` serial run twice
- production build `18 / 18`
- docs check pass

## 8. 남은 위험

- 5개 legacy 사본의 개인 값을 24개 항목으로 자동 이전하지 않는다. 사용자가 active
  copy를 선택해야 한다.
- Canonical registry는 현재 AJD moving group부터 시작한다. 다른 source/job group은
  invariant evidence와 editorial 결정 후 추가해야 한다.
- Production 반영은 commit/push/PR/merge/deploy 승인 및 production smoke 이후다.
- 현재 branch는 push됐고 Draft PR #156이 열려 있으나 main merge와 production
  deploy는 하지 않았다.
