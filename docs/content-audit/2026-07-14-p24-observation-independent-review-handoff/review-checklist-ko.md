# P24 검토 체크리스트

## 공통 시작 조건

- [ ] 현재 origin/main SHA와 package-lock.json 상태를 기록한다.
- [ ] 기존 dirty worktree가 있으면 별도 clean worktree를 사용한다.
- [ ] <https://flowme2605.vercel.app>의 익명 접근과 최종 URL을 기록한다.
- [ ] prior artifact, 이번 실행, 휴리스틱 추정, 실제 사용자 발화를 구분한다.
- [ ] 자동화 세션을 observed user로 집계하지 않는다.
- [ ] 먼저 검토하고, 요청받지 않은 제품 수정은 같은 작업에 섞지 않는다.

## 정확성·신뢰

- [ ] KST 오전에도 Today와 새 일정 기본 날짜가 local date와 일치한다.
- [ ] 개별 날짜 수정값을 My Flow 요약, 전체 목록, Calendar, ICS가 같이 읽는다.
- [ ] 내가 바꾼 날짜 유지 재사용 정책이 실제 새 실행에 반영된다.
- [ ] 반복 preview, My Flow, Calendar, ICS의 회차 수와 identity가 일치한다.
- [ ] 메모로 나눈 모든 항목이 My Flow와 Flow-level export에 포함된다.
- [ ] 빈 URL·메모 miss는 실행 항목이나 Flow로 저장되지 않는다.
- [ ] /flows 직접 진입·새로고침과 public 저장 후 /my 착지가 안정적이다.

## Claude Design (8) A~G

- [ ] A: 기본 수정과 세부 설정이 단계적으로 공개되고 모바일 편집 밀도가 과하지 않다.
- [ ] B: 완료 직후 같은 자리에서 되돌릴 수 있고 완료 항목 재개 경로가 보인다.
- [ ] C: Calendar에서 날짜 없는 일을 발견하고 날짜를 지정할 수 있다.
- [ ] D: export 범위가 전체 / 선택 / 현재로 먼저 읽히고 결과 개수를 예측할 수 있다.
- [ ] E: 기준일 연동과 개인 고정 날짜, 하나·선택·전체 이동 범위가 구분된다.
- [ ] F: 반복 회차 하나에 실행 가능한 완료 control이 하나만 있다.
- [ ] G: 단계별 개인 메모와 원본 수정 요청이 구분되고 완료 때 자연스럽게 모인다.

## 시각·접근성

- [ ] 390px과 1024px에서 horizontal overflow가 0이다.
- [ ] 완료, 열기, 수정, 삭제, 이동, export가 서로 다른 accessible name을 가진다.
- [ ] 아이콘만 있는 control은 tooltip 또는 명확한 accessible name을 가진다.
- [ ] public /f의 긴 화면에서 첫 저장 판단과 저장 결과가 첫 흐름으로 읽힌다.
- [ ] Calendar 월간 grid와 선택일 agenda가 역할을 나눠 정보가 반복되지 않는다.
- [ ] 모바일 편집 화면에서 제목·날짜·시간·메모가 고급 설정보다 먼저 읽힌다.

## 실제 사용자 관찰

- [ ] P1-S1과 P2-S1은 서로 다른 실제 참가자가 수행한다.
- [ ] 진행자는 버튼 위치나 기능명을 먼저 알려주지 않는다.
- [ ] 첫 행동 시간, 잘못된 경로, 힌트 수, 정확한 발화를 기록한다.
- [ ] 데이터 손실·잘못된 날짜·잘못된 export가 발생하면 즉시 중단한다.
- [ ] 세션 기록지와 evidence 참조가 있을 때만 등록부 숫자를 올린다.
- [ ] 두 세션 후 스크립트 문제와 제품 문제를 분리한다.

## 결과 형식

모든 finding은 다음 필드를 가진다.

- severity: Blocking / High / Medium / Low
- evidenceKind: current_command / current_browser / current_repo / prior_artifact / heuristic / observed_user
- persona와 session
- route와 viewport
- 재현 순서
- 기대 결과와 실제 결과
- 사용자 발화 또는 자동화 근거
- 권장 분류: keep / change / defer / blocking
- 실제 사용자 확인 필요 여부

P24-00C의 최종 분류는 실제 사용자 근거가 들어온 뒤에만 확정한다.
