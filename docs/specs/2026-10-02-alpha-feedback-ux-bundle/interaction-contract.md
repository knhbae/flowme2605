# 상호작용 설계와 현재 계약

## 폴더 연결

`＋ 추가`·줄 메뉴는 같은 `openFolderPanel → preview → attachFolder → linkProgramFolder` 경로를 사용한다. 입력 이름 제안은 기존 `programFolderInputSuggestion`의 정확 이름/childless/unbound 조건을 유지하며 저장 flush 전후에도 입력·selection·권한·baseline을 확인한다.

미리보기는 현재 문서 ID, 원문 기준 줄, 실제 삽입 index/depth, 앞뒤 줄, 부모/소속, 생성 위치를 읽는다. 같은 줄 전환·하위 묶음 뒤·scope 안·문서 끝을 구별한다. 준비 blank·ID·폴더를 미리 만들지 않는다. 확정 직전 document ID/전체 현재 문서 줄·관련 bindings·scope catalog의 snapshot이 다르면 transition/writer를 호출하지 않는다. Escape·닫기는 확정하지 않는다. 실패 입력 보존과 재시도는 기존 controller를 재사용한다.

‘항상 바로 아래’·위치 선택기·하위 전체 목록을 폴더로 전환·새 @/# 문법을 추가하지 않았다. 위치 기본값은 원래 #26 사용 환경의 원인 확정과 별개다. same-line은 같은 ID에 선택 폴더 제목을 연결하는 명시 변경이고, 삽입은 실제 줄을 추가한다. 모든 원문 byte가 변하지 않는다고 주장하지 않는다.

## 작성

shipped vendor callback → 실제 parser → 지역 guard/controller를 연결한다. 내용 끝 Enter의 다음 형제, 빈 checkbox 탈출, ShiftEnter/selection, 메모·시간·손자 뒤 위치, 반복 속성 메모, 즉시 Tab 역연산, input/selection/composition lease 소멸, 비연속 두 scope의 숨은 원문/ID/기록과 저장/Undo를 확인한다.

제목 중간 Enter가 여러 checkbox를 만들고 기존 항목 대응이 모호하면 `identity-ambiguous`로 저장을 거절하고 입력과 저장본을 보존한다. 이 케이스를 ‘새 항목 저장 성공’으로 판정하지 않는다. 새 ID 자동 추측이나 새 메모 문법은 이번 계약이 아니다. 원래 모바일 IME/키보드의 전체 사례도 미실행이다.

실행 목록의 `M.tasks`는 canonical 항목만 읽는다. 중첩 자식의 원문 Item·부모 ID·메모는 `parseDocument(...).items`에서 같은 ID로 대조하며 자식을 목록에 강제로 승격하지 않는다.

현재 Alpha 서버의 Undo는 마지막으로 저장한 거래1개이며 Undo 후에는 Redo가 열린다. 문서 모델의 다단계 `M.undo`와 같은 기능으로 합쳐 쓰지 않는다. 비연속 두 지역의 거래를 각각 Undo→Redo로 검사하고 앞뒤 원문·숨은 줄·ID·진행 기록을 보호한다. 서버 다단계 Undo나 영구 이력 확장은 이번 변경이 아니다.

저장 거절 입력은 기존 `alpha-ui-recovery:v1:` 계정/탭 전용 키에 보관될 수 있다. ‘저장본으로 되돌리기’는 편집 화면을 원상으로 돌리지만 안전 보관본을 자동 삭제하지 않는다. ‘보관 입력 버리기’라는 별도 명시 동작이 해당 키를 제거한다. 이 허용된 복구 저장과 서버 account mutation0·prefix 밖 writer0·운영 key/value 불변을 구별해 검사한다. 폴더 읽기/취소의 기존0쓰기 검사를 완화하지 않는다.

실제 Tab 입력 직후 즉시 역연산하는 경우에도 첫 입력의 중간 원문은 기존 `AlphaWorkspace.onInput → captureInput`에서 같은 sessionStorage 복구 키로 보관될 수 있다. 순수 모델의 원문/선택/Item 복귀와 서버 command·CAS·mutation0을 확인하되, 중간 입력의 정확한 문서/제목/원문을 담은 복구 기록1회와 다른 모든 저장값의 불변을 따로 검사한다. 이는 새 writer 허용이나 자동 삭제 정책이 아니다. 읽기·폴더 취소에는 이 예외를 적용하지 않으며 명시 ‘보관 입력 버리기’로 해당 합성 기록만 제거한다.

## 날짜 표시

기존 flat execution rows를 filter/sort 하지 않는다. 연속된 구간의 첫 실제 li 안에 `오늘`/`지난 미완료` 제목을 넣는다. 추가 li·가짜 항목 ID가 없고 이동/drag key·회차 paging·원래 날짜·writer가 유지된다. 조회 날짜가 오늘이 아니면 `조회 날짜`로 표시한다. past completed/future/undated를 지난 미완료로 부르지 않는다.

상세의 날짜 출처는 canonical parser의 실제 구획·개별 재정의를 읽는다. reference·invalid·missing에서 임의 출처를 만들지 않는다. `[날짜]`·`[미정]` 구획과 개별 `- 날짜:`는 기존 지원 사실이다. native authoring의 상대 일정·반복은 별도 모델이므로 이 표현 보완으로 전수 통합됐다고 주장하지 않는다.

## 독립 시안과 정책

HTML은 합성 자료, exact namespace 한 키, versioned 저장/Undo와 손상 잠금을 갖는다. 네 초기 폴더 위치는 실제 helper와 대조한다. 다만 고정 예시 원문+별도 links 모델이며 실제 serializer·줄 삽입 후 index·권한·DB·동기화와 동등하지 않다.

구획 이동/개별/미정, 같은 ID 이동 vs 새 ID 복제, 공통/회차 메모, 실행 날짜와 별도 마감일은 교체 가능한 제안이다. 별도 `due`는 검토한 Alpha TextTask/공개 일정/반복 계약에 없다. 일반 FlowItem date_window를 due로 바꾸지 않는다. 공통·회차 메모 비교는 두 고정 예시 날짜만 보여주며 새 반복 writer가 없다. 마감만 있는 미정 항목·기한 지남·실행이 마감보다 늦은 표시 역시 제안이다.

## UX 평가 범위

기존 녹색 강조/연한 배경/48px 버튼/닫힌 보조 도구를 유지한다. 주요 작업의 확인 정보는 짧은 기준 줄과 위치에 집중하고 반복 행 설명은 줄인다. 원본 내용은 줄이거나 임의 가공하지 않는다. 화면 검사는 가로 넘침·핵심 버튼 hit/키보드·dialog 취소·console/page error로 평가한다. 전체 시인성·접근성 인증·실기기·관찰 사용자 근거로 확대하지 않는다.
