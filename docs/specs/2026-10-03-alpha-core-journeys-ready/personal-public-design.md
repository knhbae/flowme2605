# 개인 실행·공개 활용 연결부 설계

2026-10-03. [목표 범위](spec.md)와 [단계 계획](plan.md)의 P/F 묶음. 구현 전 소스 대조이며, 아래 보존 판정은 기능 전수 충족·새 브라우저 통과·관찰 사용자 검증이 아니다.

## 원천과 현행 대조

[대표 요구 대조](../2026-10-02-alpha-ux-comparison-gaps/requirements.md)의 C07~C10/C14/C18, [UX 검토](../2026-10-02-alpha-ux-comparison-gaps/ux-review.md), [Dots R03/R05](../2026-10-02-alpha-ux-comparison-gaps/dots-review.md), [UX2 정적 인수](../../content-audit/2026-10-03-flowme-ux2-static-review-followup-ko.md)를 읽고 현행 컴포넌트와 연결했다. 피드백 #2의 누락은 폴더 필터로 정정된 사례이며 다시 결함으로 세지 않는다. Dots의 시간대 원인과 #7의 실제 기대 콘텐츠·공개 상태·원필터는 미확인이다.

세 원천의 요구 의미는 각각 보존한다. [v4.1](../2026-09-05-flowme-integrated-poc-ux-audit-v1/v41-audit.md)의 V41-013/014/025는 소속·날짜·시간 보존, [개발1](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d1-audit.md)의 D1-002/004/006/017/019/021/023은 실행 전이·dirty/원문·사본·선택/출력 경계, [개발2](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d2-audit.md)의 D2-003/004/014/015/039는 같은 Item projection·계층 분리·날짜 입력·원문 재진입이다. 9/5의 과거 audit 판정을 지금의 통과 수로 복사하지 않는다.

| 대상 | 현행 화면·행동과 코드 근거 | 판정 | 후보 |
| --- | --- | --- | --- |
| 문서→기간→원문 | ProgramSpace의 기존 period 전환·taskTitle의 정확 docId/taskId·openDocument의 dirty/lock 검증과 원문 행 focus | 보존 | 새 편집기·원문 저장·자동 커서 영속복원을 추가하지 않음 |
| 날짜 출처·지난 미완료 | execution-presentation의 구획/개별/미정 출처와 지난 미완료/조회 당일 구분. 날짜 bucket과 순서를 바꾸지 않음 | 보존 | Today 포함 규칙·시간대·구획 이동 정책을 바꾸지 않음 |
| 조회 범위·빈 결과 | period/date/folder/query 교집합, 필터 경로·해제, 주/월 범위는 있음. 빈 결과는 조건과 관계없이 새 할 일을 권하는 같은 문구이며 전 기간 조회는 상단 탭에만 있음 | 좁은 갭 P-01 | 조건에 맞는 빈 결과 문구. 제한된 보기의 빈 결과에서 기존 전체 할 일 전환을 사용해 날짜 범위만 넓힘 |
| 날짜 미정의 시간 | dateMove의 날짜-only patch는 시간 보존, applySchedule에서 시간 칸을 비우면 제거. 목록은 날짜 미정과 시간을 함께 표시 | 기능 보존·표현 갭 P-02 | 시간이 있는 상세에만 날짜-only 이동의 시간 보존 결과를 한 문장 표시 |
| 공개 없음·검색 없음 | Discovery는 공개 비보관 Flow만 검색하고 두 빈 상태를 구분. 검색 없음에는 조건 지우기, 공개 없음에는 무의미한 조건 지우기가 없음 | 보존 | 공개 개수·새 자료·가이드·모형 콘텐츠를 채우지 않음 |
| 공개 목록과 내 비공개 | account 목록은 개인 사본·기록·비공개 초안 제외를 설명하지만 그 자리에서 내 문서로 이동할 수 없음 | 좁은 갭 F-01 | 해당 설명 옆에서 기존 space 경로로 이동하는 내 문서 보기 제공. 비공개 제목·개수·존재 여부를 조회하지 않음 |
| 판본→출력/종료 또는 개인 사본 | 정확 selectedVersionId·선택 항목·기준일·반복 범위, 기존 출력-return token, source 링크·선택 개인 사본, archive 읽기 전용 경계가 있음 | 보존 | 새 강제 사본·질문·게시·판본 치환 없이 관련 회귀 실행 |

## 후보의 상태·행동·초점·소유 계약

| ID | 현재 → 후보 | 행동과 상태 보존 | 취소·실패·초점 |
| --- | --- | --- | --- |
| P-01 | `이 보기에 할 일이 없습니다. 날짜나 폴더를 바꾸거나 새 할 일을 적어보세요.` → 필터가 있으면 `현재 조회 조건에 맞는 할 일이 없습니다.`, 없으면 현재 보기의 결과 없음 | `전체 할 일에서 찾기`는 today/week/month/undated의 빈 결과에서만 제공. 기존 changePeriod('all')로 기간만 변경. folderId/query/조회 날짜/Item identity/source/history 보존. 기존 필터 해제는 중복 추가하지 않음 | 기존 input lock·flush/IME/회차 초안 거절을 재사용. 거절 시 보기 유지. 빈 결과 버튼은 전환 후 없어지므로 개인공간 보기의 전체 할 일 탭으로 초점을 옮김. 다음 frame 전에 다른 보기로 이동하면 초점 인계를 하지 않음. 새 저장 intent 없음 |
| P-02 | 시간 있는 날짜 상세에서 날짜 미정 이동의 보존 결과가 불명확 → `날짜만 미정으로 옮기면 시간은 유지됩니다.` | 기존 날짜-only 전이·날짜/시간 폼 그대로. 시간이 없으면 문장 없음. 같은 날짜/시간·원문·기록을 새로 쓰지 않음 | 기존 거절/결과 불명/expected·CAS·입력 보존 경계 유지. 새 확인창·시간 자동 삭제·변경 정책 없음 |
| F-01 | 개인 자료 제외 설명만 있음 → 같은 자리의 `내 문서 보기` | account 목록에서 navigate({ view: 'space' })만 호출. selectedFlow/version/검색 표시와 개인/공개 모델을 변경하지 않음. local PoC의 기존 내 Flow 경로 보존 | host의 기존 이동 guard와 현재 actor 경계를 사용. 별도 actor 선택·private existence 검사·payload 저장·공개 쓰기 없음. host의 기존 화면 초점 처리를 따름 |

화면 요소는 감산 기준으로 검토했다. 새 카드·상시 범위 설명·등록 badge·가이드는 없다. P-01의 복귀 행동은 빈 결과에서만, P-02의 결과 안내는 실제 시간 값이 있을 때만 제공한다. F-01은 기존 제외 설명에 붙이며 같은 안내를 다른 위치에 반복하지 않는다.

## 검증 계획과 경계

- P-01/P-02는 실제 ProgramSpace JSX/기존 callback을 평가하는 좁은 core-journey 테스트로 먼저 실패를 확인한다. 필터 조합, 전 기간 조회 성공/lock/flush 거절, 전환 후 초점 대상, 시간 없는 상세와 날짜 미정의 시간·원문·기록 보존을 확인한다.
- F-01은 실제 ProgramDiscovery 렌더와 이동 callback의 좁은 core-journey 테스트로 먼저 실패를 확인한다. 공개 없음/검색 없음/일반 목록·account/local 경계, 현재 actor와 다른 actor의 private 제목·메타데이터 미노출, 0 writer 이동을 확인한다.
- 기존 ProgramSpace context/date/journey/private-schedule/layout, Discovery와 output-return 회귀를 실행한다. 새 테스트 개수와 기존 회귀 개수는 구분한다. 최종 npm/type/build·5크기 브라우저 검사와 개발계 반영은 전체 담당자가 정확 최종 판본으로 수행한다.
- 본 묶음은 ProgramSpace/Discovery와 좁게 이름 붙인 새 테스트만 소유한다. ProgramTextEditor/AlphaWorkspace/Community·model/parser/writer/schema/운영 key는 수정하지 않는다. 원문 HTML 차단 검사·실Auth/DB·서비스·게시·commit/push/PR은 수행하지 않는다.

## 이번 구현·실행

CP1의 기존 r6 snapshot 보존 확인 뒤 P-01/P-02/F-01만 구현했다. 변경 파일은 ProgramSpace.tsx·ProgramDiscovery.tsx와 새 core-personal/core-public 테스트 2개다. 기존 CSS를 재사용해 CSS 변경은 없다. 구현 전 scoped 테스트 6개가 모두 실패했고, 보완 뒤 6/6 PASS를 확인했다. 초기 한 번의 public fixture owner 누락은 테스트 준비 오류로 수정한 뒤 6개 red를 다시 확인했으며 제품 갭으로 집계하지 않았다.

기존 관련 회귀 12파일의 123/123 PASS: Space context/date-presentation/journey/private-schedule/layout/capabilities/touch-move/busy/document-menu/recurrence-focus와 Discovery/output-return. 같은 Item·구획/개별 날짜·미정 시간·정확 원문·계정 schedule owner/CAS·출력 판본·archive 읽기 전용 경계를 확인했다. scoped diff-check도 통과했다. 이 결과는 실제 화면 geometry/키보드·최종 build 또는 관찰 사용자 증거를 대신하지 않는다.

최종 후보의 npm/type/build·5크기 실제 제품 브라우저·개발계 반영은 전체 담당자의 정확 판본 원장을 따른다. 미결 PC01~06·주제 가이드·전체 Flow/Map 품질·실기기 IME/touch/AT·원환경은 후속으로 남긴다.
