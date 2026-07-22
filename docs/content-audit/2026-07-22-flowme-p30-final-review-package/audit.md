# P30 Evidence Gap Closure Audit

## 전체 판단

P29 독립 검토의 실제 current production/browser 증거와 Claude Design의 heuristic 제안을 대조해, 재설계가 아니라 확인 가능한 중첩 상태 문제만 수정했다. P29의 데이터 계약과 4탭 IA는 유지했다.

local release gate와 canonical production gate가 모두 `pass`다. 최종 판정은 `production_released_owner_observation_pending`이며 실제 관찰 사용자는 `0`명이다.

## P30-01 - Mobile export layer

- `/f/moving-d30-basic`, 390x844: export open 중 fixed save CTA를 숨겼다.
- `/my?demo=ux20&view=flows`, 390x844: export panel primary가 bottom tabs 위로 완전히 올라오며 교차 면적은 0이다.
- export close 후 invoking control로 focus가 복귀한다.
- export scope, format, count, receipt 데이터는 변경하지 않았다.

## P30-02 - Focus order

- mobile persistent tabs를 header component에서 분리해 main workspace 뒤 DOM에 배치했다.
- `/my` focus trace는 header -> data/view/search/list controls -> bottom tabs다.
- `/calendar` focus trace는 header -> scope/month/grid/day actions -> bottom tabs다.
- visible 4탭 순서와 desktop navigation은 유지했다.

## P30-03 - Long Flow adjustment

- save-before first frame의 row-level edit control은 0이다.
- 조정은 `내용`, `날짜`, `항목 선택`, `순서` 중 한 목적만 활성화한다.
- 24개 include/exclude 목록은 `항목 선택` 후 full-list disclosure를 열 때만 나타난다.
- source item, personal overlay, save payload를 새로 만들거나 fork하지 않았다.

## P30-04 - My Flow command hierarchy

- 다음 실행 행동을 visible primary 1개로 유지했다.
- 자주 쓰는 설정/가져가기만 secondary로 두고 source/archive는 accessible details menu로 옮겼다.
- Escape로 닫으면 trigger에 focus가 돌아온다.
- 완료/reopen, export scope, archive handler는 기존 동작을 재사용한다.

## P30-05 - Calendar evidence and scale

### 날짜 없는 일

- 실제 사용자 데이터와 분리된 deterministic fixture로 10개를 준비했다.
- 2개를 선택해 날짜에 놓으면 8개가 남고, undo 후 같은 stable ID로 10개가 복구된다.
- sheet는 page scroll을 움직이지 않고 내부 scroll을 사용한다.

### 50+ Flow scope

- `/calendar?demo=ux50`은 query-only fixture이며 persistence schema를 바꾸지 않는다.
- option 62개에서 inactive group은 기본 접힘이고 검색 시 match가 노출된다.
- picker open 이후 검색, 2개 선택, apply까지 meaningful interaction 5회다.

### compact identity

- month grid는 짧은 label, marker initial, overflow count를 사용한다.
- full Flow title은 `title`, accessible name, selected-day group에 유지한다.
- 같은 날짜 5개 Flow의 full identity를 selected-day에서 확인했다.

## P30-06 - Routine density

- summary closed 상태의 advanced input은 0개이며 다음 3회 preview를 유지한다.
- advanced mode는 기존 field를 `언제`와 `언제 끝` 두 그룹으로 재배치한다.
- time/end mode에 필요한 field만 렌더한다.
- `시간 미정`, `계속 반복`, `미리보기 범위 · 앞으로 4주`로 사용자 문구를 정리했다.
- recurrence generation, series/occurrence ID, ICS UID는 변경하지 않았다.

## P30-07 - Legacy removal gate

- `/f/[slug]`의 항상 true flag와 false branch를 제거하고 artifact-first composition을 직접 사용한다.
- `FlowSaveBeforeFrame` caller가 composition을 명시하도록 타입을 강화했다.
- `/flow-maps/[map]`은 active production consumer라 `legacy`를 명시하고 marker를 남겼다.
- 강제 제거보다 rollback 가능한 경계를 우선했다.

## P30-08 - Responsive and accessibility matrix

- 390: export, focus, long adjust, My Flow commands, undated sheet, scope, routine을 캡처했다.
- 1024: compact Calendar identity, routine advanced, active legacy consumer를 캡처했다.
- 1440: public save-before, My Flow, Calendar를 캡처했다.
- 검토 route의 horizontal overflow, console/page error, 1440 unnamed focusable은 모두 0이다.

## 데이터 경계

| 경계 | P30 영향 |
| --- | --- |
| source/published Flow | 변경 없음 |
| personal overlay | 기존 handler/projection 재사용, schema 변경 없음 |
| execution run | 완료/reopen 계약 변경 없음 |
| recurrence occurrence | P30-06 UI grouping만 변경, identity/engine 변경 없음 |
| export projection/receipt | fixed layer와 command hierarchy만 변경, count/scope/format 변경 없음 |
| Calendar identity | deterministic demo identity만 additive, production stable identity 변경 없음 |

## Evidence 한계

- `current_browser_automation`: DOM, rect, focus, screenshot, console/page error.
- `current_command`: unit/build/docs/E2E 결과.
- `heuristic_review`: hierarchy와 시각 밀도 판단.
- `observed_user`: 0. 자동화 결과를 실제 사용자 검증으로 계산하지 않는다.

## Current command 결과

- `npm.cmd ci`: pass
- `npm.cmd run docs:check`: pass, 14 required files / 2,908 local links
- `npm.cmd test`: 584 / 584 pass
- `npm.cmd run build`: 18 / 18 routes pass
- P30 E2E: 12 / 12 pass
- affected P28/P29 E2E: 20 / 20 pass
- full E2E: 304 / 304 pass with 2 workers
- final review HTML: 390x844 and 1440x900 render inspection pass

## Publish 결과

1. 구현 PR [#148](https://github.com/knhbae/flowme2605/pull/148)이 clean 상태로 merge됐다.
2. merge SHA는 `b3c8500be3b6aa673e2078d02a986f7cae6fe8bf`다.
3. merge 후 `Docs, Unit, Build`, `Playwright E2E`, Vercel production status가 모두 `success`다.
4. GitHub deployment `5557201045`가 <https://flowme2605.vercel.app>에 반영됐다.
5. canonical production 390/1024/1440 smoke는 `13 / 13`이며 HTTP/navigation, alias 이탈, assertion, overflow, unnamed focusable, console/page error 실패는 모두 `0`이다.
6. production 결과는 [results.json](./production-smoke/results.json)과 [screenshots](./production-smoke/screenshots/)에 있다.
7. 실제 사용자 관찰은 수행하지 않았으며 자동화 결과를 사용성 승인으로 표현하지 않는다.
