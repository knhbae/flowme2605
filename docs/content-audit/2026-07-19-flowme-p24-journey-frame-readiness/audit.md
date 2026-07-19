# P24 Journey Frame Audit

## 전체 판정

`implementation_complete_observation_not_started`

이번 범위의 제품 계약은 구현됐다. 실제 사용자 관찰은 요청하지 않았고 `0 / 15`다. 따라서 “사용자가 이해했다”, “검증됐다”는 결론은 내리지 않는다.

## 원인 판단

기존 화면의 핵심 문제는 기능 부족보다 여정 프레임의 순서였다.

1. 저장 전 긴 설명이 실제 저장 결과보다 먼저 나왔다.
2. 저장하면 전체 Flow를 확인하기 전에 Today/첫 항목으로 축약됐다.
3. `저장`과 `조정`이 하나의 예측 가능한 선택으로 보이지 않았다.
4. My Flow의 Flow 선택이 Calendar의 보기 필터처럼 읽혔다.
5. Calendar가 날짜 없는 할 일을 본문에 길게 펼쳤다.
6. review/held 콘텐츠가 ordinary execution과 경쟁했다.

## 선택한 프레임

### 저장 전

- Flow 제목, 결과 형태, 실제 저장 항목 3~5개를 먼저 보여준다.
- 긴 source/detail/caution은 삭제하지 않고 접힌 정보로 보존한다.
- primary는 `그대로 저장`, secondary는 `조정하고 저장`이다.
- 조정은 개인 제목과 포함 항목 정도의 lightweight panel이며 full editor가 아니다.

### 저장 직후

- 저장된 전체 Flow 제목, 총 항목 수, effective item 목록을 depth 0으로 확인한다.
- 조정으로 제외한 항목은 결과 목록에도 나타나지 않는다.
- 첫 할 일 열기와 전체 Flow 보기/조정으로 이어진다.
- ordinary My Flow workspace는 확인을 끝내기 전 경쟁하지 않는다.

### 재방문 실행

- My Flow는 오늘/다음/지난 할 일을 우선하는 실행 공간으로 돌아간다.
- Flow 선택은 `저장한 Flow`로 명명해 Calendar 범위 필터와 구분한다.
- 완료·완료 취소, 개인 제목/날짜/메모, 구조 편집, 반복, export 계약은 그대로 유지한다.

### Calendar와 held

- dated item은 기존 grid/agenda를 사용한다.
- undated item은 `날짜 없는 할 일` tray에 보존하되 기본 접는다.
- held/review 콘텐츠는 ordinary My Flow/Calendar에서 숨긴다.
- 로컬 저장 record는 삭제하지 않는다.

## 회귀 경계

| 영역 | 판정 |
| --- | --- |
| 4탭 IA | 유지 |
| source-backed 원본 | mutation 없음 |
| personal overlay | 유지 |
| completion/reopen | 기존 stable Item identity 유지 |
| date/time/recurrence | consumer와 schema 변경 없음 |
| whole/selected/current export | 기존 경로 유지 |
| public pre-save/post-save completion 경계 | 유지 |
| Studio | 보조 표면 유지, 5번째 탭 승격 없음 |

## 자동 검증 해석

- 긴 단일 `flow-mvp.spec.ts` 실행은 182개 통과 후 테스트 서버가 종료되어 9개가 connection refused였고, 새 여정 계약과 맞지 않던 3개 테스트가 실패했다.
- 3개 테스트를 현재 계약에 맞게 수정한 뒤 위 12개를 깨끗한 서버에서 `12 / 12` 재실행했다.
- 최종 보고에는 이후 실행하는 clean shard 결과를 정본으로 기록한다.
- 이 결과는 `current_command`와 `current_browser`이며 `observed_user`가 아니다.

### Current branch closeout accounting

- `npm.cmd test`: `518 / 518`
- `npm.cmd run docs:check`: pass before canonical closeout updates; rerun required after these document edits
- `npm.cmd run build`: pass, Next.js 15.5.20, 18 route entries
- full `flow-mvp.spec.ts`: `194 / 194` before the final legacy `savedFlow` held-eligibility hardening
- final P24 journey-frame spec after that hardening: `6 / 6`
- P24 execution/public/workbench affected accounting: `58 / 58`; one test used the previous button name, was corrected, and passed on bounded rerun
- mobile 390px / wide 1024px horizontal overflow: `0 / 0`
- console errors: `0`

The bounded rerun and the earlier full-suite result are reported separately. Neither is promoted to observed-user evidence.

## Production closeout

- PR: `#128`
- merge SHA: `616025bf79e5573f66ff7ef3d25c228075b391cf`
- Vercel deployment: `dpl_HSZz4qJM2MUqqoA9H4Xn5RtmoCx5`, `READY`
- public alias: <https://flowme2605.vercel.app>
- mobile production: moving post-save rows `5`, public vehicle post-save rows `10`, horizontal overflow `0`, console errors `0`
- wide production: My Flow and Calendar rendered, undated tray `aria-expanded=false`, horizontal overflow `0`, console errors `0`
- evidence kind: `current_browser` and `deployment_record`, not `observed_user`

## 잔여 위험

1. artifact preview는 대표 항목만 먼저 보여주므로 사용자가 접힌 전체 구조를 충분히 예측하는지는 실제 관찰이 필요하다.
2. first-save confirmation이 재방문 사용자에게 반복 노출되지 않는지 장기간 localStorage 사용 관찰이 필요하다.
3. held 저장 record를 ordinary surface에서 숨기는 정책은 데이터 보존과 실행 발견성 사이의 제품 선택이며 owner 확인이 필요하다.
4. P24-00B는 제품 준비도 판단 후 별도 목표로만 재개한다.

## 독립 검토

별도 read-only Codex reviewer가 scoped diff와 spec을 검토했다. 첫 검토에서 저장 버튼의 visible/accessibility name 불일치, 0개 선택 후 저장 재활성화, held post-save의 빈 workspace 행동을 발견했다. 수정 후 map과 legacy `savedFlow` 경로까지 다시 검토한 최종 판정은 **Blocking 0, High 0**이다.

남은 Medium은 다음과 같다.

1. 향후 한 map에 실행 가능 Flow와 held Flow를 섞는다면 panel 전체가 아니라 row별 eligibility가 필요하다.
2. held panel에 실행 버튼은 없지만 저장된 항목 내용은 보인다. 이를 실행 가능한 체크리스트로 오해하는지는 실제 관찰이 필요하다.
3. 민감 콘텐츠의 경고를 어디까지 기본 노출할지는 콘텐츠 risk level별 후속 정책이 필요하다.

이 결과는 `independent_agent_review`이며 실제 사용자 의견으로 합산하지 않는다.
