# FlowMe P29 Implementation Audit

## 1. 전체 판정

`implementation_verified_pending_merge_deploy`

P29은 P28의 데이터 계약을 보존하면서 public save-before, saved receipt, routine, My Flow, Calendar, export를 공통 Flow anatomy로 다시 조립했다. 현재 command/browser evidence에서 Blocking과 High 기능 회귀는 발견되지 않았다. 실제 사용성 판정은 하지 않는다.

## 2. 피드백 합성 결과

Claude Design의 coordinated surface reset 제안과 Codex의 vertical-slice 제안을 다음처럼 결합했다.

- 한 번에 전체를 재작성하지 않고 moving Flow에서 artifact-first frame을 먼저 증명했다.
- proof가 green인 뒤 같은 component를 public/source-backed Flow에 확장했다.
- routine, My Flow, Calendar를 route별 특수 UI가 아니라 공통 summary/row/command 문법으로 정리했다.
- five-shape는 고정 다섯 탭이 아니라 콘텐츠마다 primary 1개와 필요한 secondary 최대 2개로 사용했다.
- persistence와 projection을 fork하지 않고 기존 effective row, save payload, export plan을 소비했다.

## 3. Slice별 판단

### P29-01/02 save-before와 receipt

**해결**

- Flow title/source/count 다음에 실제 primary artifact가 먼저 나온다.
- 전체 outline은 disclosure 한 곳에만 둔다.
- row-level 수정은 기본 frame에서 숨기고 `조정` mode에서만 제공한다.
- 저장 성공 후 save-before form이 사라지고 별도 `SavedFlowReceiptFrame`으로 전환한다.
- receipt는 개인 저장 이름, item 수, artifact, 다음 행동을 보여준다.
- legacy full `ArtifactWorkbench`는 public frame에서 반복 렌더링하지 않고 export-only surface만 재사용한다.

**회귀 확인**

- source URL과 item count 유지
- public sticky save primary 유지
- preview checkbox와 post-save completion 경계 유지
- localStorage/save payload migration 없음

### P29-03 routine

**해결**

- effective cadence를 compact summary로 표시한다.
- 다음 occurrence 3개를 먼저 보여준다.
- weekday/time/duration/end 입력은 `조정` 뒤에서만 보인다.
- resource URL은 completion row가 아니다.
- occurrence completion/reopen은 series definition을 변경하지 않는다.

**잔여**

- 390px에서 sticky command와 routine summary가 함께 보일 때 체감 밀도는 관찰이 필요하다.

### P29-04 My Flow

**해결**

- 모바일 library row는 title, next action, 최소 status와 한 개 open command만 사용한다.
- 처음 8개를 compact하게 보여주고 27개 fixture는 검색과 `더 보기`를 제공한다.
- detail은 next action, whole plan, contextual command 순서다.
- wide는 280px rail, flexible canvas, 320px inspector다.
- 완료된 Flow의 inspector는 `다음 할 일` 대신 완료 상태를 말한다.

**잔여**

- 50개 이상 virtualization은 없다.
- 실제 사용자가 `지금 / Flow 목록 / 완료`를 자연스럽게 구분하는지는 미검증이다.

### P29-05 Calendar

**해결**

- 많은 Flow scope를 닫힌 summary 1개와 searchable picker로 정리했다.
- mobile undated queue는 focus-returning bottom sheet다.
- sheet 내부에서 selection, 날짜 지정, batch move, undo가 이어진다.
- wide는 280px rail, Calendar canvas, 320px selected-day inspector다.
- 같은 날짜 item은 stable identity와 completion control을 유지한다.

**잔여**

- 1024 월간 cell의 긴 제목은 compact label로 잘리며 accessible full name으로 보완한다.
- 실제 사용자가 날짜 없는 queue를 Calendar의 자연스러운 일부로 이해하는지는 미검증이다.

### P29-06 recommendation/export

**해결**

- projection과 export plan에서 `ArtifactRecommendationVM`을 derive한다.
- primary 1개, secondary 최대 2개만 보여준다.
- whole/selected/current scope를 action label에 포함한다.
- 예상 row/event count와 실제 receipt count를 일치시킨다.
- unsupported/disabled artifact를 추천 목록에 노출하지 않는다.

### P29-07 visual/accessibility

**해결**

- public, receipt, My Flow row/detail, Calendar workspace가 공통 anatomy marker를 가진다.
- 390/1024/1440에서 horizontal overflow, unnamed focusable, fixed primary overlap을 검사한다.
- mobile public target 최소 44px, visible focus, content-before-nav focus order를 검사한다.
- reviewed route의 console error와 page error를 직접 수집한다.

## 4. P28 계약 보존

| 계약 | 결과 |
| --- | --- |
| one user-facing Flow object | 유지 |
| source와 personal overlay 분리 | 유지 |
| execution run과 structural membership 분리 | 유지 |
| series와 occurrence 분리 | 유지 |
| complete save-before artifact | 유지, composition만 변경 |
| truthful saved receipt | 유지, 별도 frame으로 강화 |
| reversible completion/reopen | 유지 |
| explicit undated queue | 유지, mobile sheet로 재구성 |
| whole/selected/current export | 유지, preflight 강화 |
| stable item/occurrence/export identity | 유지 |

## 5. E2E migration 판단

기존 `flow-mvp.spec.ts`에는 제거된 public ArtifactWorkbench 카드 순서, 반복 artifact, same-frame receipt를 정답으로 요구하는 테스트가 있었다. 이 테스트를 UI에 맞춰 숨겨진 legacy component를 복구하는 대신 다음 기준으로 정리했다.

- 기능·데이터 계약 assertion은 유지하거나 현재 selector로 이관
- 제거된 composition 자체를 요구하는 assertion `67`개는 퇴역
- 각 퇴역 test title, original line, 이유와 replacement suite를 JSON에 기록
- P29 전용 13개 시나리오를 추가
- 현재 전체 E2E `292/292` 통과

첫 전체 4-worker 실행은 `291/292`였고 post-save hydration과 옛 tab selector 사이의 test helper race 1건이 있었다. helper를 canonical `/my?view=flows` fallback으로 수정하고 3-worker repeat `3/3`을 확인했다. 이후 4-worker 재실행은 Windows worker crash와 dev server 과부하로 폐기했으며, 최종 기준은 안정적인 2-worker 전체 `292/292`다. 실패 실행을 최종 통과로 사용하지 않았다.

## 6. 검증 결과

| 검증 | 결과 |
| --- | --- |
| P29 targeted Playwright | `13/13` |
| flow-mvp Playwright | `129/129` |
| full Playwright, 2 workers | `292/292` |
| unit | `584/584` |
| docs check | pass, `2,880` local links |
| production build | pass, `18/18` routes |
| dependency audit | critical `0`, high `0`, moderate `2`; `sharp 0.35.3` controlled override |
| screenshots | `23` |
| horizontal overflow | `0` |
| unnamed focusable | `0` |
| fixed primary overlap | `0` |
| console/page error | `0` |

첫 CI는 2026-07-21 공개된 [`sharp <0.35.0` advisory](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) high 2건으로 중단됐다. `npm audit fix --force`는 Next `9.3.3` downgrade를 제안하므로 적용하지 않았다. 대신 Next `15.5.20`의 optional dependency를 patched `sharp 0.35.3`으로 고정하고 lockfile을 갱신했다. 설치 트리와 `npm audit --audit-level=high`은 critical/high `0`이며 unit, build, P29 E2E와 CI를 다시 검증한다. Next 내부 `postcss 8.4.31` 때문에 moderate `2`는 남아 있고, 이는 지원되는 비파괴 Next 업데이트가 생길 때 별도 controlled dependency update로 처리한다.

## 7. 실제 사용자에게 남은 질문

1. 저장 전 화면에서 실제 결과, 조정, 저장의 순서가 설명 없이 읽히는가?
2. 저장 receipt에서 `내 Flow에서 시작`과 `Calendar에서 보기` 중 다음 행동을 고를 수 있는가?
3. routine summary만 보고 반복 요일, 시간, 예상 시간, 종료를 정확히 이해하는가?
4. 20개 이상 My Flow에서 검색 전에 어떤 정보로 원하는 Flow를 찾는가?
5. Calendar의 compact Flow scope와 날짜 없는 sheet를 같은 일정 작업으로 이해하는가?
6. primary/secondary artifact와 whole/selected/current scope를 혼동하지 않는가?

## 8. Publish gate

현재 app source와 자동 검증은 green이다. merge 후 canonical production에서 다음을 다시 확인해야 closeout할 수 있다.

- `/f/moving-d30-basic` save-before -> receipt
- `/my?demo=ux20&view=flows` mobile/wide workspace
- `/calendar?demo=ux20` scope/agenda/undated entry
- 390/1024/1440 overflow와 console/page error
- deployed SHA와 Vercel READY 상태
