# Cross-entry Independent Review Checklist

## 1. Baseline

- [ ] production URL과 final response URL이 canonical domain인지 기록
- [ ] `git fetch` 후 current `origin/main` SHA 기록
- [ ] production app release SHA와 docs closeout SHA 구분
- [ ] clean worktree 사용
- [ ] package-lock 유지
- [ ] 기존 audit를 current result로 복사하지 않음
- [ ] observed-user count `0` 유지

## 2. Audit hypothesis 재검증

- [ ] same AJD source user-facing route 수
- [ ] route별 title
- [ ] route별 item count
- [ ] route별 primary/secondary artifact
- [ ] route별 adjustment capability
- [ ] route별 save object와 storage key
- [ ] route별 receipt와 post-save destination
- [ ] 두 alias 저장 후 My Flow object count
- [ ] Calendar/export duplicate count
- [ ] 각 hypothesis를 confirmed/reframed/rejected/inaccessible로 판정

## 3. Home and Find role

- [ ] Home이 continuation 또는 usage example 역할인지
- [ ] Find가 Home example의 상위 inventory인지
- [ ] 같은 Flow card anatomy가 유지되는지
- [ ] role은 달라도 canonical object와 save result는 같은지
- [ ] server fallback과 hydrated catalog가 같은 inventory인지
- [ ] source link가 실제 URL로 이동하는지
- [ ] fake usage/review/rating 없이도 신뢰를 전달하는지

## 4. Save-before and artifact choice

- [ ] first viewport에서 source/title/count/result/primary action이 읽히는지
- [ ] visible artifact choice가 실제 selected projection을 바꾸는지
- [ ] choice 변경이 preview, CTA, save record, receipt에 반영되는지
- [ ] example/custom/undated intent를 설명 없이 구분하는지
- [ ] adjust mode가 default execution flow를 덮지 않는지
- [ ] 24-item adjustment가 mobile에서 과밀하지 않은지
- [ ] content shape 차이와 implementation generation 차이를 구분하는지

## 5. Post-save continuity

- [ ] receipt title/count/range/source 일치
- [ ] My Flow title/count/next action 일치
- [ ] Calendar title/date/count 일치
- [ ] export title/count/scope 일치
- [ ] completion/reopen이 같은 stable item에 적용
- [ ] Home/Find/URL/direct alias 재진입 시 같은 saved state
- [ ] reload 후 persistence
- [ ] duplicate save idempotency

## 6. Existing duplicate data

- [ ] 24-item와 5-item record가 동시에 있을 때 실제 상태
- [ ] personal title/date/memo preservation
- [ ] completion/run history preservation
- [ ] archive/restore behavior
- [ ] export receipt/history 영향
- [ ] 자동 merge 위험
- [ ] 사용자 선택 merge 위험
- [ ] alias-only reconciliation 위험
- [ ] backup/rollback requirement

## 7. Positive controls

- [ ] wedding independent cards
- [ ] wedding artifact choice
- [ ] workout recurrence occurrence generation
- [ ] P32 focused My Flow workspace
- [ ] Calendar scope/detail baseline

Positive control이 작동한다는 이유로 moving/vehicle failure를 content difference로 오해하지 않는다.

## 8. Responsive and accessibility

- [ ] 390x844
- [ ] 1024x768
- [ ] 1440x900
- [ ] horizontal overflow
- [ ] fixed/sticky overlap
- [ ] unnamed focusable
- [ ] visible label/accessibility purpose mismatch
- [ ] keyboard-only artifact choice
- [ ] focus order
- [ ] dialog/sheet/menu Escape and return
- [ ] console/page error

## 9. Claude Design additional

- [ ] current/proposed mobile comparison
- [ ] current/proposed wide comparison
- [ ] A/B/C alternatives
- [ ] same object, role-specific entry pattern
- [ ] canonical save-before wireframe
- [ ] existing duplicate reconciliation UX 필요 여부
- [ ] reference product source/link/evidence
- [ ] long-copy solution 금지
- [ ] full planner expansion 금지

## 10. Codex additional

- [ ] alias/source graph from current source
- [ ] current localStorage keys and ownership
- [ ] test coverage gap
- [ ] no schema rewrite path
- [ ] additive reconciliation and rollback
- [ ] exact affected files
- [ ] unit/E2E acceptance markers
- [ ] current command result
- [ ] app code unchanged

## 11. Final output

- [ ] overall verdict
- [ ] severity findings
- [ ] 24 journey cells
- [ ] cross-entry invariant matrix
- [ ] alias/storage impact
- [ ] A/B/C decision matrix
- [ ] recommended P33 sequence
- [ ] non-goals
- [ ] actual-user-only questions
- [ ] commit/push/merge/deploy state
