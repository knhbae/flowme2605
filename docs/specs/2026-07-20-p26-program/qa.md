# P26 QA 계약

## Evidence Kind

각 판정은 다음 중 하나를 기록한다.

- `current_command`
- `current_browser`
- `current_source`
- `owner_feedback`
- `prior_design_artifact`
- `reference_pattern`
- `heuristic_simulation`
- `observed_user`
- `inaccessible`

자동화와 heuristic은 observed user가 아니다.

## 대표 Flow

1. 이사 기준일 역산형
2. 차량 날짜 없는 체크형
3. 운동/청소 반복형
4. 여행/프로젝트 혼합형
5. 기록/메모형
6. URL/memo 개인 draft형

## 핵심 여정

```text
발견
-> save-before whole artifact 확인
-> 그대로 시작 또는 조정
-> post-save whole Flow receipt
-> title/date/memo/structure 조정
-> Today 또는 Calendar 실행
-> 완료/취소/skip/hold
-> whole/selected/current export
-> 회고
-> 다시 쓰기
```

## Correctness assertions

- local date가 UTC boundary에서 하루 밀리지 않는다.
- example date가 anchor로 저장되지 않는다.
- item override가 summary/list/Calendar/ICS에 동일하다.
- save preview count와 saved/reloaded count가 같다.
- series definition과 occurrence가 중복 실행 control을 만들지 않는다.
- memo split accepted/saved/reloaded/export count가 같다.
- effective stable item ID가 surface마다 같다.
- source mutation count `0`.

### P26-01 Date Intent

- public date intent option count `3`.
- example preview persisted anchor count `0`.
- saved date intent invalid value count `0`.
- custom blank save is blocked.
- undated My Flow dated row and Calendar/ICS event count `0`.
- custom date My Flow/Calendar projection count is non-zero and duplicate count `0`.
- explicit undated selection survives reload.
- legacy example anchor remains recoverable as migration metadata.
- public save CTA text matches the effective saved intent.

### P26-02 Save Receipt And Route Parity

- public, source-backed map, URL-first hit, memo/URL draft save가 canonical `savedFlow | savedMap` handoff를 사용한다.
- bare `/my` 신규 저장 handoff count `0`.
- receipt total과 rendered whole-Flow effective row 합의 mismatch count `0`.
- dated + undated와 total의 mismatch count `0`.
- malformed date와 duplicate identity가 정상 행을 삭제하는 count `0`.
- 저장 직후 empty hydration count `0`.
- reload 후 handoff, receipt title, total/dated/undated count가 유지된다.
- public/Flow Map/URL-first/memo draft의 390/1024 horizontal overflow와 console/page error count `0`.

### P26-03 Recurrence Series And Occurrence

- My Flow whole-Flow series definition label은 `반복 설정`이고 completion control count는 `0`이다.
- Today/Calendar occurrence completion control count는 회차당 `1`이다.
- series definition의 Calendar undated-tray visible count는 `0`이다.
- 같은 source routine의 public/My Flow UID mismatch와 RRULE mismatch는 `0`이다.
- My Flow whole-Flow Calendar export count는 canonical series 수이고 visible occurrence count와 별도로 표시한다.
- occurrence done -> reopened -> reload 후 occurrence ID와 state mismatch count는 `0`이다.
- skipped, held, deleted, tombstoned는 서로 다른 상태로 남는다.
- exact-video 4주 preview의 Calendar/ICS end-boundary mismatch count는 `0`이다.
- recurrence duplicate occurrence count와 source mutation count는 `0`이다.

### P26-04 Memo Segmentation And Review

- 제주 대표 메모는 topic 중복 없이 action candidate `5`개로 분리된다.
- `여권, 지갑, 우산 챙기기` object list false split count는 `0`이다.
- source fragment ID와 suggestion ID는 같은 입력에서 재실행해도 같다.
- 같은 source fragment의 visible source copy는 review group당 `1`회다.
- 저장 전 split, merge, exclude, reorder, keyboard reorder가 동작한다.
- accepted/saved/receipt/reloaded/list-export count mismatch는 `0`이다.
- saved item source-fragment mapping missing과 duplicate ID count는 `0`이다.
- generic filler와 user-facing internal-term hit count는 `0`이다.
- 390/1024 horizontal overflow와 console/page error count는 `0`이다.

## UX assertions

- Flow/Flow Map user-facing card pattern count `1`.
- verified source가 있을 때만 source authority를 표시한다.
- unverified social proof count `0`.
- save-before primary decision surface count `1`.
- post-save whole Flow visible without extra navigation.
- quick editor default field count `<= 3`.
- advanced field pre-disclosure count `0`.
- task/occurrence completion control count `1`.
- structural controls in execution mode `0`.
- Calendar filter grid/agenda/count mismatch `0`.
- export preview/output count mismatch `0`.

## Accessibility And Responsive

- viewports: 390x844, 1024x768
- horizontal overflow `0`
- fixed/sticky overlap `0`
- interactive target under 44px `0` unless native text link exception is documented
- unlabeled icon button `0`
- keyboard unreachable action `0`
- focus invisible blocker `0`
- form label/error association present
- mobile input font at least 16px
- console/page error `0`

## Regression Gates

```powershell
npm.cmd run docs:check
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run security:audit
git diff --check
```

Risk-based targeted E2E can run during a slice. P26-20 requires the complete bounded suite or an exact shard accounting that covers every test once.

## Release Gate

- clean intended diff
- PR checks green
- merge SHA recorded
- canonical Vercel deployment READY
- anonymous production route accessible
- Home, Flows, My Flow, Calendar, representative public Flow mobile/wide smoke
- HTTP failure, off-canonical redirect, overflow, console/page error all `0`
- observed users accurately reported
