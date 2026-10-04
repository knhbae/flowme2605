# 날짜·실행 상세 UX 검토

2026-10-04. `flow-ux-review`의 감산·여정·원문 보존·조작성 기준으로 검토했다. 사용자 관찰이나 전체 UX 인증이 아니라 이번 상세창 증분의 코드·합성 UI 검토다. 실제 기기·AT·IME 검증은 미실행이다.

## Findings

1. [High, 수정] 날짜를 바꾸려는 첫 결정에 진행·문서 연결·순서 입력이 경쟁했다. 날짜·시간·적용·기존 shortcut은 상시 두고 진행과 연결은 기본 접었다. 접힘 내부 DOM과 기존 기능은 보존한다.
2. [High, 수정] 진행 저장의 반복 ACK가 같은 성공 문구를 다시 설정하면 ref baseline만 바뀌고 화면이 갱신되지 않을 수 있었다. baseline을 transient React state로 옮겼다. DX14는 자동 committed render에서 연속 성공·동일 과거 기록의 무변경 적용 후 원문 guard 해제를 검사한다.
3. [High, 수정] 날짜·진행 미적용 값을 남긴 원문 이동은 입력을 버릴 수 있었다. 새 원문 버튼과 기존 옮긴 문서 열기에 같은 pending guard를 적용했다. 저장 응답은 같은 dialog·Item의 제출값만 clean 기준으로 받는다.
4. [Medium, 수정] 다시 연 dialog의 이전 scroll 위치와 제목이 날짜 heading을 가릴 수 있었다. 새 task dialog는 scrollTop=0이며 title/close는 sticky로 유지한다.
5. [Medium, 수정·재검사 완료] 펼친 상세의 nearest scroll에서 적용 버튼이 sticky 제목에 가렸다. 중간 실제 앱 QA에서 반복 확인했으며 FAIL을 보존했다. task dialog에 최대 제목 높이를 포함한 116.5px scroll padding을 확보하고 전역 focus margin 중복을 없앴다. DX15는 상한만 검사한다. 최종 실제 앱61/61 PASS와 긴 제목·가로 화면의 nearest hit·219회 Tab/Shift+Tab 입력을 별도 확인했으며 문서 밖 전이3건은 다음1회 같은 방향 입력에서 열린 dialog로 복귀했다. AT·IME 결과로 확대하지 않는다.
6. [Low, 범위 밖] 전체 workspace·월간·모바일 문서 작성의 밀도와 모든 메뉴 발견성은 남아 있다. 이번 상세창 개선을 전체 UX 완성이나 피드백26개 전체 해결로 확대하지 않는다.

## Rubric

아래 점수는 좁은 후보의 검토자 평가다. 제품·콘텐츠의 Public MVP/Validated 등급을 매기지 않으며 앱 최종 실행 상태는 [QA](qa.md)를 따른다.

| 차원 | 평가 | 근거와 한계 |
| --- | --- | --- |
| User Need Fit | 4/5 | 기간에서 실행 날짜를 바꾸고 같은 원문을 이어 쓰는 목적에 한정한다. 사용자 이해도 미관찰 |
| Execution Clarity | 4/5 | 날짜·시간 적용이 첫 조작이며 진행 기록은 별도 결정. 저장 거절·취소 경로 보존 |
| Content Fidelity | 4/5 | 같은 Item·메모·source 구획·진행·owner를 기존 계약으로 보존. 모든 source origin 새 검사 아님 |
| Portability | N/A | 원문 복귀는 기존 편집 경로다. calendar/sheet/export를 이번 변경에서 새로 구현하지 않음 |
| Cognitive Load | 4/5 | 고급 그룹2개를 기본 접고 입력은 유지. 전체 workspace 부하 미평가 |
| Copy Specificity | 4/5 | 적용·원문 열기·시간-only 결과·pending 해소를 구체적으로 표시. 안내 문구 수를 최소화 |
| Source/Safety | 4/5 | 개인 실행과 원문·owner 경계를 보존. 실제 backend 검증이나 새 분류 정책 승인 아님 |
| Accessibility/Operability | 3/5 | native dialog/details·48px controls·focus 복귀·합성 브라우저 검사. AT·IME·물리 touch 미실행이므로5점/전체 접근성 완성 주장 안 함 |

## Subtraction

- Removed: 진행/연결의 초기 강제 노출, 이를 위해 새 카드·탭·별도 저장 메뉴를 추가하는 안.
- Kept because: 날짜 출처·개별 적용 결과는 원문 일정 오해를 막는다. pending 문구는 원문 이동이 막힌 이유와 해결 행동을 설명한다. 오류·저장 feedback·Undo·기존 연결/순서는 회복과 기존 요구 보존에 필요하다.
- 기존 shortcut의 명칭과 동작은 유지한다. 반복 한 회/전체·due·자유 문장 미정 문법을 새 정책으로 정하지 않는다.

## HTML → 앱 fidelity ledger

조작 HTML은 기억장치 없는 설명용 시뮬레이션이고 앱은 기존 실제 command/controller를 사용한다. 시각적 동등성만으로 저장 계약 동등성을 주장하지 않는다.

| 비교 지점 | 의도와 앱 적용 | 차이/판정 |
| --- | --- | --- |
| 첫 날짜 조작 | 날짜·시간·주요 적용을 항상 표시 | 앱은 기존 source/change-hint와 shortcut을 그대로 사용 |
| 진행/연결 | 기본 접힌 native details2개 | 앱은 기존 진행 이력·참조·문서 이동·순서 기능을 삭제하지 않고 그룹 안에 유지 |
| 작은 화면 | 375/390에서 날짜 입력 한 열, 가로/큰 화면 두 열 | 앱은 기존 typography/tokens·dialog 폭을 유지하며 새 디자인 시스템을 만들지 않음 |
| 제목/닫기 | 짧은 가로에서도 닫기 도달 | 앱은 긴 제목 높이 상한과 sticky scroll 여유를 추가. HTML과 동일 CSS 재사용이라는 주장은 안 함 |
| 원문 복귀 | 같은 Item 원문을 명시적으로 열기 | HTML은 그룹 위에, 앱은 기존 상세 흐름 뒤에 배치. 기존 연결·이동 조작 순서를 보존한 의도적 편차 |
| 미적용 입력 | 적용/취소 전 원문 이동 차단 | 앱은 일정뿐 아니라 진행 입력 baseline·dialog generation까지 보호 |
| 실패·복구 | 실패 입력 보존·직접 재시도·Undo | HTML은 메모리 simulation, 앱은 기존 저장 명령·CAS·Undo/Redo. backend 성공으로 등치하지 않음 |

Copy diff: 새 앱 action은 `원문 열기`; 새 pending 안내는 `날짜·시간 또는 진행 입력을 적용하거나, 닫아 취소한 뒤 원문을 열어 주세요.`다. 기존 일정 shortcut·writer·schema 명칭은 바꾸지 않았다. HTML의 예시 문서·오류 주입/초기화 버튼은 설명용이며 제품에 새로 추가하지 않았다.

## Recommended fixes / 다음 판단

이번 구현과 최종 합성 검사가 통과한 뒤에만 선별 게시·정확 게시판 QA·개발계 반영을 별도 목표로 잡는다. 반복/due/폴더 전면 개편을 이 좁은 반영의 필수 선행으로 붙이지 않는다. 실제 기기·IME·AT·관찰 증거는 별도이며, 계속 들어오는 직접 피드백을 원본 맥락과 함께 다음 개선 원장으로 유지한다.
