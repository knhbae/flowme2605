# UX·개발 설계

[목표](spec.md)·[요구 대조](requirements.md)를 따른다. 이번 선택은 기존 의미 보존 UX이며 새 메모 문법/날짜 이동 정책을 확정하는 것이 아니다.

## 좁은 제품 변경

1. 기존 ProgramTextEditor의 날짜 form에서 ProgramSpace와 같은 날짜 출처를 읽는다. 현재 구획/개별/미정 정보는 local dialog 안에서만 나타낸다. 바뀐 날짜가 현재와 다를 때만 ‘개별 날짜로 변경되며 원문 위치는 그대로’라는 결과를 표시한다.
2. 선택된 `- 메모:` 속성의 메뉴는 그 줄이 어느 Item에 속하는지 읽어 ‘메모 · 항목 제목’을 보여준다. Enter가 새 할 일을 만들지 않고 같은 메모를 이어 쓴다는 결과를 짧게 표시한다. 전체 문서에 상시 배지/안내를 추가하지 않는다.
3. 새 순수 `text-context-presentation` helper는 현재 parse 결과만 읽는다. property owner는 유효한 direct nearest Item인 경우에만 반환하며 orphan/reference/잘못된 date에는 오해할 정보를 만들지 않는다. title/raw는 React text로 출력하고 HTML로 삽입하지 않는다.

독립 리뷰에서 날짜가 같아도 시간만 바꾸면 기존 handler가 날짜를 함께 patch하여 상속 날짜를 개별 고정하는 경로를 확인했다. 표시 helper가 유효한 시간 변경인 경우에도 이 결과를 설명하도록 보완했다. 이미 개별 날짜·같은 시간·잘못된 시간은 추가 안내를 숨긴다. 기존 patch 동작을 바꾸지 않았으며 시간만 변경할 때 상속을 유지할지는 [미결 기록](../../IDEAS.md)의 후속이다.

date/progress handler·privateTaskSchedule·expected workspace·input locks·IME·native selection·Undo·원래 Item 소속·writer/schema는 그대로다. 새 ‘구획 따르기’ 명령·필드·API는 만들지 않는다.

## HTML 비교안

한 문서에 두 날짜 구획, 상속 항목·개별 날짜 항목·미정 항목·두 줄 메모·시간·진행 기록을 넣는다. 처음부터 예시가 표시되고 편집할 수 있다. 같은 vendor model과 input plan의 정확한 복사본을 build 시 inline하여 HTML 한 파일로 연다. 외부 CDN·계정·network·localStorage·앱 writer를 사용하지 않는다. 새 parser를 만들어 현행과 다르게 설명하지 않는다.

- ‘현재 방식’은 실제 M.editText/M.moveSubtree/M.updateTask와 planMemoEnter를 사용한다.
- ‘비교안’은 정책 후보 결과를 검토용 임시 상태에서만 보여준다. 새 구획 날짜 따르기는 기존 restoreTaskDate로 결과를 비교하되 제품에 연결하지 않는다. 자연 본문·빈줄 종료는 정책 카드/예시 비교만 제공하고 작동하는 제품 문법처럼 시뮬레이션하지 않는다.
- 원문 이동과 실행 날짜 변경은 다른 조작이다. apply 전 목표와 예상 결과를 보여주며 취소/Escape는 변경0이다. Undo는 원문뿐 아니라 identity/등록/기록이 포함된 전체 시안 상태 snapshot을 되돌린다.
- 파일 내 새로고침은 초기 합성 예시로 돌아온다. 앱의 reload 복구를 증명하는 기능이 아니다. 실제 앱 저장/reload는 별도 합성 브라우저 검사를 한다.

## 감산·반응형

기존 코드 UI의 토큰·컴포넌트와 작은 표시 수정이므로 새 Image Gen 전체 재디자인은 하지 않는다. 기존 디자인 기준 화면과 최종 화면을 직접 비교한다. 검토용 current/proposal 선택은 제품 메뉴로 오해하지 않도록 분리한다. 모바일은 한 열, 원문 입력과 선택 결과만 먼저 보여주고 비교/고급 쟁점은 접는다. 필수 핵심 행동은 44px 이상이며 가로 넘침·가림을 확인한다.

제거: 모든 줄의 출처 배지, Enter마다 선택창, 반복/due 상시 메뉴, 같은 결과를 반복하는 설명 카드/토스트. 유지: 실제 owner·변경 결과·원문/실행 날짜 구분, 취소·Undo·반영 실패와 입력 보존.

## 검증 연결

순수 helper의 owner/invalid/reference·날짜 출처·불변성 검사, 기존 memo Enter/날짜 이동/source tests, component static/state regression, 실제 HTML·제품 브라우저 synthetic scenario를 분리한다. HTML은 실제 production engine 의미의 비교 도구이고, 앱/서버/계정 저장 성공을 주장하지 않는다. 보호 운영 sentinel과 허용 prefix 밖 쓰기·network0을 각 시안 검사에서 확인한다.
