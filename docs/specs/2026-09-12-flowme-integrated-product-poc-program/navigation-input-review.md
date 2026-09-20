# 입력과 재진입 연결 검토

2026-09-12 · 신규 Program React 표면 한정. 제품 정책의 영구 확정이나 실기기 검증이 아니다.

## 확인한 문제와 이번 선택

- 저장 flush와 실제 transaction 사이에 새 입력이 끼어들 수 있었다. 해당 변경이 끝날 때까지 동기적인 입력 잠금을 유지하되 이미 입력한 초안을 저장하는 통로는 막지 않는다. 저장 실패는 전환을 거절하고 입력을 유지한다.
- 한글 등 조합 중에는 DOM과 저장 모델이 잠시 다를 수 있다. 조합 시작도 미저장 입력으로 취급하고 조합이 끝나기 전 문맥 전환을 거절한다. readOnly로 조합을 강제 종료하지 않는다. 합성 composition 이벤트 검사는 실제 OS IME 검사가 아니다.
- 본문과 진행은 Program 저장소에 둔다. 검색·조회 날짜·폴더·선택·포커스·스크롤은 버전 있는 browser history checkpoint로 복구한다. 콘텐츠 저장기를 하나 더 만들지 않고 actor와 URL이 일치하는 표시 상태만 받는다. 브라우저 기록을 지우거나 새 탭에서 주소만 붙여넣는 경우까지 같은 위치를 보장하지 않는다.
- 공개 글의 원본 연결은 flowId만이 아니라 versionId/itemId를, 답글은 postId/replyId를 전달한다. 없는 대상은 임의 최신 판본이나 첫 답글로 바꾸지 않는다. 이 상태는 `#flowme/...` fragment 내부에만 두어 `/my?personalWorkspacePoc=v1` gate를 넓히지 않는다.
- 새 History 위치 복귀가 성공해도 계정 인증, 다른 사람과의 동기화 또는 외부 도구 왕복을 증명하지 않는다.
- 앱 메뉴로 다시 여는 동작과 브라우저 뒤로 가기는 구분한다. 앱 메뉴는 목적지의 스크롤·포커스를 복원하면서 다른 화면에서 더 최근에 고른 항목·기준일·출력 형식을 유지한다. 이전 개인공간 checkpoint의 빈 선택으로 새 탐색 선택을 덮지 않는다. 브라우저 뒤로 가기와 reload는 해당 history entry의 검증된 표시 상태를 복원한다. 원문·임시 URL·출력 초안은 계속 history에서 제외한다.

## 공식 문서 확인과 적용

확인일 2026-09-12. 아래 자료는 브라우저 API 동작 근거이며 FlowMe의 UX 성과 근거가 아니다.

- [MDN beforeinput](https://developer.mozilla.org/en-US/docs/Web/API/Element/beforeinput_event): 입력 방식에 따라 이벤트가 없거나 취소되지 않을 수 있다. 따라서 beforeinput만을 안전장치로 삼지 않고 실제 입력/조합 상태와 저장 시점을 함께 보호한다.
- [MDN compositionend](https://developer.mozilla.org/en-US/docs/Web/API/Element/compositionend_event): 조합 완료·취소 경계를 확인했다. 조합 완료 전 controller가 clean이어도 전환 가능으로 판단하지 않는다.
- [MDN History 사용](https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API): 초기 history entry에도 상태를 기록하고 popstate 때 해당 entry의 표시 상태를 복원하는 방식을 사용한다.
- [MDN scrollRestoration](https://developer.mozilla.org/en-US/docs/Web/API/History/scrollRestoration): 브라우저 자동 스크롤 복원과 앱 복원이 경합할 수 있으므로 현재 앱에서만 manual로 관리하고 unmount 때 이전 설정을 복구한다.

## 검증 구분

순수 navigation codec/잘못된 조합/actor 소유 테스트, draft/lock 단위 테스트, 신규 build 뒤 실제 브라우저의 뒤로 가기·새로고침·저장 지연·합성 composition을 각각 확인한다. 문서에서 테스트를 언급하는 것만으로 통과 처리하지 않고 실행 결과 JSON에 연결한다. 실제 Android/iOS/OS IME/보조기술/관찰 사용자는 미실행 상태다.
