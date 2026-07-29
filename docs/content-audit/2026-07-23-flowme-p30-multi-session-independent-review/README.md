# FlowMe P30 멀티세션 독립 검토

## Overall verdict

Architecture verdict: `bounded_revision`

Interaction complexity verdict: `coordinated_simplification_required`

P30의 data contract, 4탭 IA, surface composition은 유지할 수 있다. 그러나 `supported`는 수행 가능하다는 뜻이지 쉽다는 뜻이 아니다. 24개 journey cell 중 11개는 설명 없이 이해하기 어려웠고, 시나리오가 요구한 interaction depth는 합계 191회, cell당 약 8회였다. 모바일 save-before에서는 핵심 저장 행동까지 keyboard Tab 16회가 필요했고, 펼쳐진 My Flow는 74~90개의 focusable control을 노출했다.

따라서 현재 UX를 단순 polish나 다섯 개 오류 수정만으로 마감해서는 안 된다. 저장 전, My Flow, Calendar의 기본 노출량과 command 우선순위를 함께 줄이는 coordinated simplification이 필요하다. 긴 설명을 추가하지 않고, 각 frame이 답해야 할 사용자 질문과 primary action을 하나로 제한한다.

다만 P31 전에 반드시 막아야 할 correctness 결함이 하나 있다. 저장 전 조정에서 정한 item 날짜가 item draft에 남으면, 저장 후 My Flow에서 바꾼 최신 날짜보다 우선한다. 실제 시뮬레이션에서 My Flow는 `2026-08-03`을 저장했지만 Calendar와 whole ICS는 오래된 `2026-08-01`을 사용했다. 사용자가 보는 실행 날짜와 외부로 가져가는 날짜가 달라지는 문제이므로 `Blocking`이다.

이번 판정은 실제 사용자 검증이 아니다. `observedUserCount=0`이며 production interaction, browser automation, current source, fixture와 heuristic evidence를 구분했다. interaction depth는 지정된 시나리오의 자동화 단계 합계이며 실제 사용자의 최적 경로나 체감 난이도를 직접 측정한 값은 아니다.

## 모바일 피드백 재검증

추가로 홈, Flow 찾기, 결혼 저장 전, 반복 홈트, My Flow, Calendar를 `390x844`에서 다시 조작했다. 사용자가 지적한 중복과 복잡도는 대부분 재현됐다.

- 홈은 `/flows`와 같은 URL·메모 진입과 같은 카드 문법을 축약해 보여 역할이 겹친다.
- Flow 찾기 카드는 source가 별도 링크가 아니며 대표 항목·chip·`Flow 열기`가 반복된다.
- 결혼 Flow는 세 artifact와 세 date mode를 보여주지만 선택한 결과와 다음 저장/export 행동이 곧바로 이어지지 않는다.
- 한 항목짜리 홈트도 세 artifact, 세 date mode, 반복 설정, 전체 구조, export가 같은 층에 있다.
- My Flow 목록은 간결하지만 Flow를 열면 큰 workspace가 목록 탭 안에 인라인으로 누적된다.
- Calendar item detail도 선택일 agenda 안에 인라인으로 삽입돼 달력 탐색과 편집이 같은 세로 흐름에서 경쟁한다.
- Flow-level 삭제는 제공되지 않고, `보관하기`는 상세 최하단 `더보기`에 숨어 있다.
- 보관 후 모바일 `보관됨` 행에서는 복구 action에 도달하지 못하지만 와이드는 상세 최하단에서 복구할 수 있다.
- `목록에서 빼기`가 source-backed Item 제외, 개인 초안 Item 삭제, subcheck와 resource에 함께 쓰여 데이터 영향이 예측되지 않는다.

따라서 P31-02~04는 단순 copy 축약이 아니라 역할과 interaction layer를 나누는 작업이어야 한다. 자세한 근거와 current/proposed 구조는 [모바일 피드백 보강](./mobile-feedback-supplement.md)에 기록했다.

Flow 삭제에 대한 현재 답은 명확하다. 사용자가 접근할 수 있는 것은 영구 삭제가 아니라 `보관`뿐이다. source에 남은 `removeSavedFlow` 함수는 UI에 연결되지 않았고 `데이터 관리`도 백업/불러오기만 제공한다. 조작 이름, 모바일 복구 단절, 영구 삭제 계약은 [조작 문법과 Flow 삭제·복구 보강](./interaction-data-lifecycle-supplement.md)에 별도로 정리했다.

## 복잡도 판정

| 지표 | 현재 | 의미 | P31 목표 |
| --- | ---: | --- | --- |
| 설명 없이 이해 가능한 cell | 13/24 | 기능 지원과 직관성이 다름 | 20/24 이상 |
| 설명이 필요한 cell | 11/24 | 화면 위계보다 copy에 의존 | 4/24 이하 |
| 시나리오 interaction depth | 191, 평균 7.96 | 여러 surface와 고급 action이 연속 노출 | 일반 행동 2 tap 이내 |
| 모바일 save primary 도달 | keyboard Tab 16회 | 저장 전 control 경쟁 | 8 Tab 이내 |
| 펼친 My Flow focusable | 74~90개 | 실행과 관리·회고·export가 같은 층 | next action 우선, 고급 기능 접힘 |

## 가장 중요한 단절

| 우선순위 | 단절 | 현재 evidence | 결정 |
| --- | --- | --- | --- |
| Blocking | 저장 후 날짜 수정이 Calendar와 ICS에 반영되지 않음 | My Flow override `2026-08-03`, Calendar/ICS `2026-08-01` | P31-01 선행 수정 |
| High | 공통 surface가 수행 가능하지만 설명 없이 쉽지 않음 | 11/24 explanation-dependent, depth 191 | P31-02~05 coordinated simplification |
| High | `/f`에서 조정 저장한 Flow의 전체 기준일을 실행 중 다시 바꿀 진입점이 없음 | My Flow anchor/settings control 0개 | P31-03에 통합 |
| High | 날짜 없이 시작한 Flow도 새 실행에서 날짜를 강제함 | 차량 점검 reuse에서 날짜 미입력 검증 오류 | P31-03에 통합 |
| High | `/flows`의 이사 결과와 검토한 public `/f`가 다른 Flow 객체임 | 5-item map vs 24-item public Flow | P31-02에 통합 |
| High | 홈과 Flow 찾기가 모바일에서 같은 탐색 역할을 반복함 | 같은 URL·메모 진입과 같은 카드 anatomy | P31-02에서 first/returning Home 역할 분리 |
| High | 결혼·운동이 같은 artifact/date/control 묶음에 눌림 | 결혼 3 artifact/3 date mode, 운동 1 item에 24~33 controls | P31-02 contextual artifact |
| High | Flow 상세가 My Flow 목록 안에 인라인으로 누적됨 | 열린 결혼 Flow 1702px, 30 controls | P31-03 dedicated mobile workspace |
| High | Flow lifecycle가 숨겨지고 모바일 보관 복구가 끊김 | 상세 최하단 `더보기`, 8초 undo 후 모바일 restore 진입 없음 | P31-03 archive/restore parity |
| High | 실행·일정·구성·삭제 조작의 동사와 데이터 의미가 섞임 | 네 객체에 `목록에서 빼기`, 영구 Flow 삭제 UI 없음 | P31-03 grammar + P31-05 delete contract |
| Medium | Calendar item detail이 agenda 안에 인라인 삽입됨 | 열린 상태 1644px, 다음 row 밀림 | P31-04 mobile item sheet |
| Medium | save-before 조정 취소 후 키보드 focus가 호출 버튼으로 복귀하지 않음 | explicit cancel 성공, focus return 실패 | P31-05 final gate |

## P30에서 유지할 것

- Public save-before의 실제 artifact 우선 구조와 별도 saved receipt
- My Flow의 rail, execution canvas, inspector 구분
- Calendar의 Flow scope, selected-day agenda, 날짜 없는 tray
- whole, selected, current export scope와 실행 전 count
- 날짜 없는 항목의 저장, 배치, 날짜 제거, tray 복귀
- routine series 설정과 occurrence 완료/reopen 분리
- 개인 회고와 source correction draft 분리
- 4탭 IA, public `/f` shell, source fidelity와 현재 persistence 경계

## 검토 범위

- 기준 commit: `4c5bbb34f5c8633d4b4b48fb8070e523ec5def6b`
- reviewer role: `codex_independent`
- 8 personas x 3 sessions = 24 cells
- viewport: `390x844`, `1024x768`, 핵심 화면 `1440x900`
- 같은 persona는 S1의 localStorage를 S2, S3로 이어서 reload와 revisit를 확인
- P4와 P8의 일부 scale/keyboard 상태는 `fixture_only`로 표시
- app source, migration, dependency는 변경하지 않음

## 결과 파일

- [상세 HTML 보고서](./review.html)
- [Severity findings](./audit.md)
- [24-cell scorecard](./persona-journey-scorecard.json)
- [세션 전환 단절 matrix](./journey-discontinuity-matrix.json)
- [Route evidence](./route-evidence.json)
- [추가 production evidence](./supplemental-route-evidence.json)
- [모바일 피드백 보강](./mobile-feedback-supplement.md)
- [모바일 피드백 구조화 evidence](./mobile-feedback-evidence.json)
- [조작 문법과 Flow 삭제·복구 보강](./interaction-data-lifecycle-supplement.md)
- [조작·lifecycle 구조화 evidence](./interaction-data-lifecycle-evidence.json)
- [서비스·플랫폼 평가](./service-platform-assessment.md)
- [P31 후보](./p31-candidates.md)
- [검증 결과](./verification-results.json)
- [스크린샷](./screenshots/)

## 검증 상태

- `npm.cmd test`: 584/584 통과
- `npm.cmd run build`: 통과
- P30 targeted E2E: 12/12 통과
- 관련 E2E: 41/41 통과
- production journey: 24/24 실행, console/page error 0
- `npm.cmd run security:audit`: 실패, 1 high + 1 moderate dependency advisory
- full E2E는 이번 독립 검토에서 실행하지 않았고 이전 수치를 현재 결과로 재사용하지 않음
- commit, push, PR, deploy 없음

## 다음 결정

P30의 data contract와 IA를 구조적으로 다시 열지 않는다. 그러나 interaction surface는 그대로 유지하지 않는다. P31은 `effective date precedence`를 먼저 고친 뒤 다음 다섯 slice로 진행한다.

1. 날짜·identity correctness
2. discovery와 save-before의 최소 입력·단일 primary action
3. My Flow의 next-action 우선 progressive disclosure와 archive/restore/delete 조작 문법
4. Calendar의 일정 보기와 날짜 배치 mode 분리
5. export·고급 기능·접근성·복잡도 final gate

의존성 advisory는 UX backlog와 분리된 release engineering gate로 처리한다.
