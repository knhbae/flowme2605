# FlowMe My Flow / 콘텐츠 Flow 전환 논의 인수인계

Date: 2026-05-30
Status: Handoff note for next chat session

## 현재 작업 맥락

FlowMe의 `/my?demo=ux12` 화면을 기준으로, 사용자가 여러 Flow를 실제로 실행/관리하는 `My Flow 실행 허브` UX/UI를 잡고 있다.

초기에는 moving Flow 모바일 캘린더 UX 문제에서 시작했다.

문제:

- 모바일에서 현재 몇년 몇월인지 잘 안 보임.
- 월 변경이 불편함.
- 캘린더가 좁고 카드 여백이 커서 내용이 안 보임.
- 캘린더 안에 `D-30` 같은 정보가 들어가니 이상함.
- 수정 카드가 화면 맨 아래에 있어 모바일 사용성이 나쁨.
- 오늘 탭/캘린더/flow별 화면에서 item 클릭 동작이 일관되지 않음.
- item 박스를 누르면 완료 처리되는 것보다 상세 팝업이 뜨고, 완료는 별도 버튼/텍스트로 처리하는 게 낫다는 방향.

## 이미 반영한 주요 UX 방향

- My Flow UX12 데모 기준으로 진행.
- 기존 `/my?demo=ux12` 화면을 계속 발전시키는 방향.
- FullCalendar 라이브러리 사용 유지.
- 캘린더 내 완료 item은 취소선 처리.
- 캘린더 item 클릭 시 상세 열림.
- 체크/완료는 별도 버튼에서 처리.
- 모바일에서는 상세가 아래 inline 영역이 아니라 bottom sheet/popup처럼 떠야 함.
- 상세 내용은 수정 가능해야 함.
- 오늘 탭에서도 item 클릭 시 같은 상세 편집 경험이 나와야 함.
- 캘린더 안에서는 `D-x` 표기를 빼는 게 낫다.
- item이 하나뿐인 날짜는 제목이 두 줄까지 보여도 괜찮고, 여러 개면 한 줄로 줄이는 방향이 좋다.
- 루틴은 캘린더에 점 1개/2개 같은 가벼운 표시로 존재감을 보여주는 방향.
- 루틴 점 색상은 루틴/카테고리 색과 맞추는 방향.

## UX 구조 논의

한 페이지에 모든 것을 길게 쌓기보다, 사용자가 보는 관점별로 나누는 것이 낫다는 흐름이었다.

현재 논의된 주요 화면 관점:

- 오늘
- 캘린더
- Flow별
- 체크리스트/루틴/기록 등 실행 타입별
- 상세 편집 bottom sheet

특히 `flow별 화면`은 다음 문제가 있었다:

- 전체 Flow를 선택했는데 Flow별 화면에서 한 Flow만 나오는 문제.
- Flow가 많을 때/적을 때 UX가 달라져야 함.
- 카테고리가 많을 때 필터/선택 위치가 더 중요해짐.
- Flow 필터 위치가 이상하다는 피드백이 있었음.
- 사용자가 전체 여정을 볼 때, Flow별 화면은 단순 목록이 아니라 "내가 지금 어떤 Flow들을 어떤 상태로 관리 중인지" 보여줘야 함.

## My Flow에서 다루는 item 타입 정리

단기적으로 사용자에게 노출할 상위 타입은 3개 정도가 적합하다고 봤다.

사용자 노출 타입:

- 일정
- 루틴
- 체크

내부적으로는 더 세분화:

- `scheduled_task`: 일정
- `routine_session`: 루틴
- `check_task`: 체크
- `log_entry`: 기록
- `memo_evidence`: 메모/증빙
- `decision_hold`: 결정/보류
- `reference_caution`: 참고/주의

단기 UX 방향:

- 기록/증빙/결정/주의를 별도 상위 탭으로 너무 많이 노출하면 복잡해질 수 있음.
- 대신 상세 화면 안의 필드, badge, 상태, 보류 사유, 증빙 파일명, 주의 문구로 다루는 게 낫다.
- Apple/Galaxy 기본 앱처럼 보려면, 처음부터 많은 타입을 보여주기보다 일정/루틴/체크를 중심으로 단순하게 시작하고, 상세에서 맥락을 확장하는 방식이 좋다.

관련 문서:

- `docs/specs/2026-05-28-my-flow-execution-hub/item-type-matrix.md`

## 이미 코드에 반영된 item type 로직

`components/flow/AppClient.tsx`에 lightweight item type derivation 추가됨.

대략 로직:

- Flow가 routine이거나 반복 규칙이 있으면 `routine_session`
- 날짜가 있으면 `scheduled_task`
- 별도 조건이 없으면 `check_task`
- 보류/결정 단어가 있으면 `decision_hold`
- 사진/증빙/제출/영수증/계약서/파일명 등이 있으면 `memo_evidence`
- 기록/관찰/점수/컨디션/수면/식사/운동 시간 등이 있으면 `log_entry`
- caution/risk가 있으면 `reference_caution`

E2E에서 UX12 selected-day row와 detail editor가 `data-item-type="scheduled_task"`인지 확인하도록 테스트도 추가됨.

검증:

- `npm run build` 통과
- My Flow 관련 Playwright targeted E2E 통과
- `npm run docs:check` 통과

## 배포 상태

이전 UX12 반영 preview:

- https://flowme2605-eg5x176v1-flowme.vercel.app/my?demo=ux12

주의:

- 이후 문서 정리 작업은 preview 배포 대상 아님.
- 최신 코드 변경 후 전체 E2E는 일부 targeted만 돌린 상태일 수 있음.
- 배포 전 필요하면 build/test/e2e 확인 필요.

## 온라인 콘텐츠를 Flow로 만들 기준 논의

사용자가 "실존하는 온라인 콘텐츠를 검색/분석해서 Flow 콘텐츠 후보 기준을 세워보자"고 요청했다.

Flow로 만들기 좋은 콘텐츠 기준:

- 실제 날짜, 마감, 순서, 반복, 방문, 제출, 결정 지점이 있다.
- 자연스럽게 캘린더/시트/메모/체크리스트로 옮길 수 있다.
- 완료 기준이 명확하다. 예: 제출함, 예약함, 비교함, 기록함, 보류함.
- 공식 정보/경험담/주의사항을 분리할 수 있다.

약한 후보:

- 다음 행동 없는 팁 모음
- exact source가 없는 넓은 카테고리 페이지
- 의료/법률/재무/안전 확정 조언처럼 보이는 콘텐츠
- 모든 항목이 같은 중요도인 긴 리스트

## 온라인 콘텐츠 후보와 Flow 예시

상세 문서:

- `docs/content-audit/2026-05-29-online-content-flow-examples.md`

검토한 후보 6개:

### 1. 이사 D-60~D+7

출처:

- Greechii 이사 준비 체크리스트
- https://greechii.com/tips/home/moving-checklist/

Flow 방향:

- `structure_type`: `timeline`
- `anchor_type`: `move_date`
- `primary_destination`: `hybrid`
- 캘린더 + 체크리스트 + 이사 당일 증빙 메모

핵심 item:

- 현재 집 해지 통보와 새 집 조건 정리
- 이사업체 3곳 견적 비교
- 입주청소/가전 배송일 확정
- 인터넷/TV/도시가스 이전 예약
- 하자 사진과 계량기 수치 기록
- 전입신고와 주소 변경 상태 확인

UX 포인트:

- 캘린더에서는 D-60 같은 표기 제거.
- 날짜는 캘린더가 담당하고, item은 행동 제목 중심.
- 이사업체 비교/하자 사진은 증빙/보류 타입과 연결.

### 2. 중고차 구매 점검

출처:

- TrendMetricLab 중고차 구매 체크리스트
- https://trendmetriclab.com/guides/used-car-buying-checklist/

Flow 방향:

- `structure_type`: `checklist`
- `primary_destination`: `sheet`
- 비교표 + 증빙 메모 + 구매/보류/거절 결정

핵심 item:

- 후보 차량 기본 정보 입력
- 성능점검기록부와 실차 상태 대조
- 외관/타이어/누유/실내 상태 촬영
- 계약 전 구매/보류/거절 결정

UX 포인트:

- "완료"보다 "구매/보류/거절"이 핵심 결과.
- Hold는 실패가 아니라 정상 outcome.
- FlowMe가 일반 todo 앱과 차별화될 수 있는 좋은 후보.

### 3. 초기 이유식/반응 기록

출처:

- childcare.go.kr 이유식 식단 PDF
- 육아플러스 이유식 가이드

Flow 방향:

- `structure_type`: `phase`
- `anchor_type`: `baby_age_month`
- `primary_destination`: `hybrid`
- 메뉴 캘린더 + 반응 기록 시트 + 주의 메모

핵심 item:

- 오늘 새 재료는 한 가지인지 확인
- 피부/구토/설사/호흡 이상 여부 기록
- 이번 주 반복 메뉴와 새 재료 구분

UX 포인트:

- 의료 판단처럼 보이면 안 됨.
- 알레르기/이상 반응은 source/risk 분리 필요.
- 캘린더에는 메뉴/점 표시 정도, 상세에서 반응 기록.

### 4. 운전면허 갱신/적성검사

출처:

- 안전운전 통합민원
- https://www.safedriving.or.kr/diGuide/selectDiGuide01.do

Flow 방향:

- `structure_type`: `timeline`
- `anchor_type`: `renewal_deadline`
- `primary_destination`: `calendar`

핵심 item:

- 공식 사이트에서 갱신 기간 확인
- 적성검사 또는 면허갱신 대상 구분
- 방문 또는 온라인 처리 방식 선택

UX 포인트:

- 공식 정보 우선.
- 첫 화면은 긴 안내보다 "내 기간 확인"이 먼저.
- 법적 기간은 반드시 공식 확인 링크와 함께.

### 5. 해외여행 안전 카드

출처:

- 외교부 해외안전여행 안내
- https://www.mofa.go.kr/www/brd/m_4080/view.do?seq=375155

Flow 방향:

- `structure_type`: `checklist`
- `anchor_type`: `departure_date`
- `primary_destination`: `memo`

핵심 item:

- 여행 국가 안전정보 공식 페이지 확인
- 현지 긴급 연락처 카드 작성
- 자주 발생하는 사고 대응 메모 확인

UX 포인트:

- 여행 추천 서비스가 아니라 안전정보를 개인 비상 카드로 변환하는 Flow.
- 출국 전 메모/오프라인 카드가 핵심 artifact.

### 6. 컴활 공부 트래커

출처:

- 시나공 자료실
- https://www.sinagong.co.kr/pds/003001001/past-exams

Flow 방향:

- `structure_type`: `timeline`
- `anchor_type`: `exam_date`
- `primary_destination`: `hybrid`
- 공부 캘린더 + 진도/오답 시트

핵심 item:

- 선택한 기출 파일과 시험일 입력
- 1회차 기출 풀이와 틀린 영역 표시
- 약한 과목만 다시 풀기

UX 포인트:

- generic "공부하기" 체크리스트는 약함.
- source row는 고정, 사용자 입력 필드만 수정 가능해야 함.
- 점수, 오답 유형, 재시도일이 핵심.

## 다음 논의 추천

먼저 3개를 비교하는 게 좋음.

1. 이사
   - 현재 moving UX와 연결되어 바로 적용 가능.
   - 캘린더 UX 검증에 좋음.

2. 중고차
   - 보류/증빙/결정 UX를 검증하기 좋음.
   - 일반 todo 앱과 FlowMe 차별점이 강함.

3. 이유식
   - 루틴/기록/주의 UX를 검증하기 좋음.
   - 다만 건강/육아 민감 영역이라 source/risk 분리가 중요.

## 다음 세션에서 바로 할 수 있는 작업 순서

1. 위 3개 중 하나를 선택한다.
2. 선택한 콘텐츠를 실제 Flow seed/demo 데이터 형태로 만든다.
3. `/my?demo=ux12` 또는 별도 demo route에 가상 데이터로 넣는다.
4. 캘린더/오늘/Flow별/상세 편집에서 어떻게 보이는지 확인한다.
5. 모바일 기준으로 다음을 검토한다:
   - 캘린더에 너무 많은 텍스트가 들어가는가
   - item 클릭이 상세로 자연스럽게 이어지는가
   - 완료/보류/기록/증빙 액션이 분리되어 보이는가
   - Flow가 많아졌을 때 필터와 그룹이 견디는가
6. 괜찮으면 Vercel preview 배포한다.

## 추천 시작점

다음은 `중고차 구매 점검`으로 시작하는 것을 추천.

이유:

- 단순 일정형이 아니라 FlowMe의 차별점인 `증빙`, `보류`, `결정`이 잘 드러남.
- My Flow 상세 sheet UX를 검증하기 좋음.
- 캘린더 중심이 아닌 sheet/memo 중심 Flow도 My Flow에서 잘 다뤄지는지 확인 가능.
- "일정/루틴/체크" 3타입만으로 충분한지, 아니면 내부 secondary type이 필요한지 보기 좋음.

다만 기존 moving UX 연속성을 우선하면 `이사 D-60~D+7`부터 진행해도 된다.

