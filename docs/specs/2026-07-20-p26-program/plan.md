# P26 구현 계획

## 진행 원칙

각 slice는 `inventory -> contract/test -> implementation -> mobile/wide browser -> regression -> evidence -> commit` 순서로 닫는다. 단계 종료 후 새 evidence가 전제와 다르면 다음 단계의 범위를 조정한다. 한 번에 전체 UI를 갈아엎지 않는다.

## 단계별 실행

### 0. Clean baseline과 requirement trace

- clean `origin/main` worktree 사용
- P25 production/source/status 기록
- owner/Claude/Codex 요구를 canonical P26 번호에 매핑
- 이전 evidence를 current result로 재사용하지 않음

완료 조건: clean status, SHA 기록, `spec/plan/tasks/qa` 존재.

### 1. P26-00C product object/journey decision

- current Home, catalog, save-before, post-save, My Flow, Calendar 캡처
- unified Flow card와 adaptive whole-Flow prototype 작성
- save-first/adjust-first/dual path 비교
- source-first/promise-first/integrated hierarchy 비교
- Flow Map separate/unified 비교
- wedding independent entries 비교
- Calendar always-on/on-demand tray 비교
- full editor/quick+advanced 비교

완료 조건: app/schema change `0`, 결정 matrix와 390/1024 proposed frame 존재.

### 2. P26-01~05 correctness foundation

#### P26-01 Date intent

- local date와 example date 분리
- setup date가 saved anchor로 오염되지 않게 함
- item override가 My Flow/Calendar/ICS/receipt에 동일 반영
- reuse에서 linked/fixed 정책 고정

#### P26-02 Receipt and route parity

- 모든 save route가 canonical effective item count를 사용
- 저장 즉시 whole Flow가 보이고 reload 후 동일
- public, URL-first, catalog, map route parity

#### P26-03 Recurrence

- series/occurrence identity 분리
- preview/My Flow/Calendar/ICS count parity
- occurrence 완료/reopen/skip/hold

#### P26-04 Memo segmentation

- 명확한 다중 행동을 안정적으로 분할
- 저장·reload·export count parity
- 빈 miss draft 차단

#### P26-05 Projection gate

- Today/My Flow/Calendar/export가 같은 effective identity 사용
- projection diff harness 추가

완료 조건: foundation regression green, data loss/identity mismatch `0`.

### 3. P26-06~07 discovery/save

- unified discovery card component
- unsupported popularity 제거
- wedding variants independent entry로 분리
- save-before whole artifact + one decision surface
- post-save whole-Flow receipt/hub

완료 조건: Flow/Map user-facing card pattern `1`, fake social proof `0`, save receipt count match.

### 4. P26-08~13 My Flow/edit/reuse

- My Flow local IA를 `지금 / 내 Flow / 완료`로 검증·정리
- content-shape adaptive grouping
- quick editor 3 fields, advanced disclosure
- execution/edit/batch mode 분리
- add/delete/restore/reorder and batch date move
- one completion control + immediate undo + persistent reopen
- reuse linked/fixed date policy

완료 조건: task depth와 control count marker green, source mutation `0`.

### 5. P26-14~16 Calendar/export

- on-demand undated tray
- Flow filter and grid/agenda parity
- single/batch date placement, preview, undo
- explicit export scope/count/format/receipt

완료 조건: filter mismatch `0`, date move rollback supported, output count mismatch `0`.

### 6. P26-17~18 visual/responsive integration

- tokens and component variants 정리
- copy budget 적용
- 390 mobile drill-in/sheets
- 1024 task-focused 2-pane/3-pane switching
- focus, target size, error, disabled, loading state

완료 조건: overflow/overlap `0`, keyboard blocker `0`, screenshots approved as internal baseline.

### 7. P26-19~20 integrated gate and release

- six content-shape journeys
- current command/browser evidence
- full unit/build/E2E/docs/security gates
- PR, merge, Vercel deploy, production smoke
- final package and Claude/Codex review prompt

완료 조건: automated Blocking/High `0`, canonical production smoke green, observed-user count truthful.

## 계획 변경 규칙

1. data loss, date error, identity mismatch는 즉시 Blocking으로 올린다.
2. 같은 contract 안의 인접 문제는 현재 slice에서 고친다.
3. 다른 ownership 또는 새 product capability는 다음 slice로 이동한다.
4. visual 변경이 contract 오류를 가리면 contract를 먼저 수정한다.
5. browser evidence가 wireframe 가정을 반박하면 prototype 결정을 다시 연다.
6. 실제 사용자를 모집하거나 관찰한 경우에만 observed evidence를 추가한다.

## 커밋 전략

- P26-00C docs/prototype
- P26-01~05 foundation은 의미 있는 contract별 commit
- discovery/save
- My Flow/edit
- Calendar/export
- visual/responsive
- evidence/release docs

각 commit은 다른 worktree의 변경을 포함하지 않는다.
