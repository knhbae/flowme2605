# P27-R 작업 체크리스트

상태 표기: `[ ]` 미착수, `[-]` 진행 중, `[x]` 완료, `[!]` blocked.

## P27-R00A 비교 prototype gate

- [ ] clean `origin/main` SHA와 production release 차이 기록
- [ ] existing P27 review와 Claude `(10)` finding의 current/stale 구분
- [ ] Input Composer v1.1에서 재사용할 interaction 추출
- [ ] save-before current 390/1024 캡처
- [ ] My Flow 1/3/5/12 fixture current 캡처
- [ ] workout save-before/My Flow/Calendar current 캡처
- [ ] Flow archive/item exclusion storyboard
- [ ] proposed save-before prototype
- [ ] proposed My Flow prototype
- [ ] proposed workout prototype
- [ ] current/proposed decision matrix
- [ ] owner approval 기록

## P27-R00F foundation

- [ ] `/flows` raw server HTML fixture
- [ ] `/my` raw server HTML fixture
- [ ] server document smoke 테스트
- [ ] `/flows` meaningful SSR shell/card 구현
- [ ] `/my` 4-tab shell 회귀 보호
- [ ] routine Calendar accessible tree inventory
- [ ] shared overlay focus policy
- [ ] hydration/no-JS/keyboard 검증

## P27-R01A lifecycle contract

- [ ] current `clearFlowLocalProgress` 영향 inventory
- [ ] archive record type/version
- [ ] active/archive/restore resolver
- [ ] legacy active fallback
- [ ] source Item personal exclusion rule
- [ ] user Item tombstone rule 재사용
- [ ] completion/history/export receipt preservation
- [ ] malformed record defense
- [ ] permanent delete policy 문서화
- [ ] golden fixture unit tests

## P27-R01B lifecycle UI

- [ ] Flow detail command menu
- [ ] `보관하기`
- [ ] immediate undo
- [ ] reload 후 `보관됨` 복구
- [ ] source Item `내 Flow에서 빼기`
- [ ] user Item `삭제`
- [ ] removed Item disclosure/restore
- [ ] empty Flow state
- [ ] keyboard/focus/live feedback
- [ ] mobile/wide screenshot evidence

## P27-R02A recurrence/resource contract

- [ ] 4주 source provenance inventory
- [ ] preview horizon vs series end model
- [ ] source-defined count/until mapping
- [ ] occurrence edit scope
- [ ] resource type contract
- [ ] confirmation subcheck contract
- [ ] nested personal overlay type/resolver
- [ ] source collision/malformed defense
- [ ] fixture tests

## P27-R02B workout vertical slice

- [ ] truthful 4주 label
- [ ] start/weekdays/time/end adjustment
- [ ] bounded preview label
- [ ] source video resource block
- [ ] confirmation checklist 분리
- [ ] My Flow series/next occurrence hierarchy
- [ ] mobile weekly strip/agenda
- [ ] wide grid/detail
- [ ] complete/reopen one occurrence
- [ ] Calendar/ICS parity

## P27-R03A/B save-before workspace

- [ ] moving current/proposed
- [ ] vehicle current/proposed
- [ ] workout current/proposed
- [ ] shared Flow outline
- [ ] operation picker
- [ ] schedule operation
- [ ] include/exclude operation
- [ ] content operation
- [ ] order operation
- [ ] resource operation
- [ ] single sticky save decision
- [ ] Composer existing/proposal handoff
- [ ] post-save same outline

## P27-R04A/B My Flow

- [ ] 1 Flow fixture
- [ ] 3 Flow fixture
- [ ] 5 Flow fixture
- [ ] 12 Flow fixture
- [ ] adaptive search decision
- [ ] `지금` date grouping
- [ ] `Flow` active/recent/archive
- [ ] same-date multi-Flow group
- [ ] single-Flow wide collapse
- [ ] multi-Flow wide rail/list/detail
- [ ] saved/returning parity
- [ ] completed/reopened visibility

## P27-R05 confirmation/resource editing

- [ ] source subcheck rendering
- [ ] personal subcheck add/edit/remove/reorder
- [ ] source resource rendering
- [ ] personal resource add/edit/remove
- [ ] source ownership preservation
- [ ] compact item edit sheet
- [ ] keyboard reorder fallback
- [ ] projection/export policy tests

## P27-R06 Calendar

- [ ] routine mobile composition
- [ ] routine wide composition
- [ ] undated queue
- [ ] Flow scope filter
- [ ] same-date grouping
- [ ] date move/remove/undo
- [ ] archive/exclusion projection
- [ ] series/current edit scope

## P27-R07 export/post-save

- [ ] compact scope preflight
- [ ] eligible destination/count
- [ ] resource/subcheck loss notice
- [ ] Flow/selected/item outputs
- [ ] result receipt
- [ ] compact post-save band
- [ ] duplicate item list removal

## P27-R08 regression/final

- [ ] docs:check
- [ ] unit tests
- [ ] production build
- [ ] targeted E2E per slice
- [ ] full E2E accounting
- [ ] raw server document smoke
- [ ] 390x844 browser QA
- [ ] 1024x768 browser QA
- [ ] keyboard/accessibility accounting
- [ ] output file parsing
- [ ] identity/projection matrix
- [ ] final review package
- [ ] observed-user count 정확히 기록

## 상태 문서 반영 대기

현재 `docs/STATUS.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`, `docs/specs/README.md`에는 기존 미정리 변경이 있어 이번 planning scope에서 수정하지 않는다.

- [ ] clean ownership가 확보된 후 본 spec 링크를 `docs/specs/README.md`에 추가
- [ ] owner 승인 후 P27-R 실행 순서를 `docs/ROADMAP.md`에 반영
- [ ] archive/resource/preview-horizon 결정이 확정되면 `docs/DECISIONS.md`에 durable decision 기록
- [ ] 첫 implementation slice 착수 시 `docs/STATUS.md` current focus 갱신
