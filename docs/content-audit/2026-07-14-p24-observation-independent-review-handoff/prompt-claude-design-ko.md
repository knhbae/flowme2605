# Claude Design 복붙용 프롬프트

FlowMe P24 최신 제품을 제품·UX 관점에서 다시 평가해 주세요.

중요:
- 이번 요청은 단순 UI polish 요청이 아닙니다.
- 실제 사용자 관찰은 아직 0/15입니다.
- 자동 QA와 화면 휴리스틱을 실제 사용자 검증처럼 표현하지 마세요.
- 코드를 수정하지 말고 P24-00C에 넣을 판단 가설과 실제 관찰 질문을 만들어 주세요.

공개 서비스:
https://flowme2605.vercel.app

GitHub 검토 패키지:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-14-p24-observation-independent-review-handoff

현재 production screenshot/evidence:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-14-p24-00b2-production-design-readiness

기존 Claude Design 원본:
https://github.com/knhbae/flowme2605/blob/main/FlowMe%20UXUI%20%EC%A0%84%EC%B2%B4%20%EA%B2%80%ED%86%A0%20(8).zip
ZIP 안의 FlowMe UX 개선안 목업 + 코멘트.dc.html을 기준으로 A~G 의도가 현재 제품에 어떻게 반영됐는지 보세요.

평가할 전체 사용자 여정:
1. URL, 메모 또는 public Flow로 필요한 내용을 발견한다.
2. 저장 전에 범위와 결과를 예상한다.
3. My Flow에 저장하고 제목·기준일·항목 날짜·시간·메모·구조를 자기 상황에 맞게 바꾼다.
4. 날짜 없는 일을 Calendar에 배치하고 하나·선택·전체 일정 이동 범위를 선택한다.
5. Today와 Calendar에서 할 일을 실행하고 완료한 뒤 필요하면 완료 취소한다.
6. 반복 Flow에서 현재 회차와 다음 회차를 구분한다.
7. 전체·선택·현재 범위로 Calendar/checklist/sheet/memo 결과를 가져간다.
8. 실행 중 개인 메모와 원본 수정 요청을 남긴다.
9. 완료 후 회고하고 이전 기록을 보존한 채 다시 사용한다.

반드시 볼 페르소나:
- 이사처럼 기준일을 역산하는 사용자
- 차량 점검처럼 날짜 없는 체크리스트 사용자
- 운동·청소처럼 반복 루틴 사용자
- URL miss나 메모로 개인 draft를 만드는 사용자
- public Flow를 저장·수정·재사용하는 사용자

화면:
- /
- /flows
- /f/vehicle-inspection-prep
- /my
- /calendar
- 개인 draft의 편집·내보내기 상태
- 반복 Flow의 Today·Calendar 상태

A~G 평가:
A. progressive editor: 기본 필드와 세부 설정의 단계가 충분한가
B. completion undo: 완료와 취소가 같은 자리에서 이해되는가
C. Calendar unscheduled tray: 날짜 없는 일을 발견·배치할 수 있는가
D. Flow-level export: 전체/선택/현재 범위와 결과 개수가 직관적인가
E. date movement: 기준일 연동, 개인 고정, 하나/선택/전체 이동을 예상할 수 있는가
F. one occurrence/one control: 반복 회차가 중복 실행처럼 보이지 않는가
G. inline notes: 개인 기록과 원본 수정 요청이 안 복잡하면서도 구분되는가

추가 관찰 질문:
- public /f의 390px 긴 설명이 저장 판단을 돕는가, 핵심 행동을 가리는가
- 연필 아이콘, 열기, 완료 체크의 역할이 설명 없이 구분되는가
- 모바일 편집 화면이 Calendar나 일반 todo보다 복잡하게 느껴지는가
- export가 항목 하나가 아니라 사용자가 의도한 Flow 범위를 전달한다는 확신이 드는가
- 완료 취소, 날짜 제거, 삭제 복구, 재사용이 실행 흐름 안에서 발견되는가

결과를 다음 세 층으로 분리해 주세요:
1. 현재 화면에서 직접 확인한 사실
2. 디자인 휴리스틱에 따른 추론
3. 실제 사용자 관찰이 필요한 가설

각 finding에는 다음을 포함해 주세요:
- Blocking / High / Medium / Low
- persona와 journey 단계
- route와 viewport
- 무엇이 왜 혼란스러운지
- A~G 중 연결되는 원칙
- 유지할 부분
- 바꿀 경우 최소 변경과 대안적 큰 변경
- 실제 사용자에게 물어볼 질문
- keep / change / defer / blocking 후보

마지막에는 아래를 작성해 주세요:
- P24-00C 입력용 우선순위 backlog
- 지금 바로 고치면 안 되고 관찰을 기다려야 하는 항목
- P1-S1, P2-S1에서 반드시 관찰할 행동 5개
- 현재 제품이 잘 보존해야 할 UX 원칙 5개

실제 사용자 데이터가 없으므로 P24 완료나 검증 완료를 선언하지 마세요.
