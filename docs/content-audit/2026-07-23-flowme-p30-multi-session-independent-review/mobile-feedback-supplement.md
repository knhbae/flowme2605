# P30 모바일 사용자 피드백 재검증 및 제안 보강

## 판정

사용자 피드백은 현재 production에서 대부분 재현됐다. 문제는 개별 기능 누락보다 한 모바일 화면에서 서로 다른 역할의 정보와 행동이 같은 깊이로 이어지는 데 있다.

- Architecture: `bounded_revision` 유지
- Mobile interaction: `coordinated_simplification_required` 유지
- 추가 구현 방향: P31-02~04의 composition과 disclosure를 구체화
- 앱 코드 변경: 없음
- 실제 관찰 사용자: 0

이번 보강은 `390x844` production interaction, current screenshot, current source, 공식 제품 문서와 heuristic simulation을 구분해 사용했다. 자동화와 시뮬레이션은 실제 사용자 검증이 아니다.

## 1. 홈과 Flow 찾기의 역할

### 현재 재현

- `/` 첫 화면은 URL·메모 진입과 추천 Flow 2개를 보여준다.
- `/flows`는 같은 진입과 같은 형태의 Flow 카드 9개를 보여준다.
- 홈의 카드와 Flow 찾기의 카드가 같은 탐색 문법이어서 두 탭의 역할 차이가 약하다.
- EvidenceKind: `current_production_interaction`, `current_package_screenshot`, `heuristic_simulation`

### 권장 역할

| 상태 | 홈 | Flow 찾기 |
| --- | --- | --- |
| 처음 온 사용자 | 실제 사용 사례 2~3개: `원문 -> 최소 입력 -> 결과 -> 내 도구` | URL·메모 입력, 검색, 카테고리, Flow 탐색 |
| 저장 후 재방문 | 오늘 이어갈 항목 1~3개, 최근 Flow, 날짜 없는 할 일 요약 | 새 Flow 찾기와 기존 Flow 검색 |
| 추천/인기 | 편집된 사용 사례만 제한적으로 노출 | 최근 등록, 많이 시작한 Flow, 카테고리 탐색 |
| 리뷰/사용 수 | 실제 데이터가 생기기 전 노출하지 않음 | 실제 telemetry와 검증된 리뷰가 생긴 뒤에만 노출 |

홈은 `카탈로그의 축약판`이 아니라 `시작 또는 이어가기`여야 한다. 저장한 Flow가 없는 사용자는 기능 설명 대신 실제 변환 사례를 보고, 저장한 Flow가 있는 사용자는 지금 할 일을 본다. `최근/인기 Flow`는 Flow 찾기가 소유한다.

### 공식 패턴에서 가져올 것

- Todoist Today는 여러 프로젝트에서 오늘 할 일만 모은다. 홈 역할을 실행 초점으로 제한하는 근거다.
- Notion Home은 최근 페이지, 바로가기, 일정, My Tasks를 모으고 전체 탐색은 Search/Library/Marketplace로 분리한다.
- Strava feed는 모든 내부 필드를 보여주지 않고 활동 종류에 맞는 통계와 한 가지 성취만 강조한다.

### 적용하지 않을 것

- 서버·계정·telemetry 없이 가상의 `1.2만 명 사용`, `리뷰 428개`를 production에 표시하지 않는다.
- 목업에서 느낌을 확인할 때만 `시뮬레이션 데이터`라고 화면과 evidence에 명시한다.
- 실제 social proof가 생기기 전에는 `원문`, `최근 업데이트`, `항목 수`, `추천 결과 형태`처럼 검증 가능한 정보만 사용한다.

## 2. Flow 찾기 카드

### 현재 재현

각 카드가 카테고리, 할 일 수, 제목, 원문 문자열, 대표 항목 1·2·3, 조건 chip, 결과 chip, `Flow 열기`를 반복한다. 카드 전체가 링크인데 하단에 같은 의미의 `Flow 열기`가 다시 있다. 원문 문자열은 별도 외부 링크가 아니다.

### 제안 anatomy

1. 제목과 한 줄 결과: `결혼식 날짜를 기준으로 12개 일정을 역산`
2. 원문: 외부 링크 아이콘과 source 이름
3. 실제 범위: `12개 · Calendar 중심`
4. 신뢰 정보: 실제 수집값이 있을 때만 `최근 30일 시작 420 · 리뷰 18`
5. 대표 내용: 번호 없이 1~2개만
6. 카드 전체 탭: 상세로 이동
7. 보조 label: `더보기` 또는 chevron. `Flow 열기` 중복 제거

`이사일`, `D-30 일정`, `생활 일정`, `할 일 5개`를 모두 chip으로 나열하지 않는다. 클릭 전에 결과를 구분하는 정보 한 줄만 남긴다.

## 3. 결혼 Flow 저장 전

### 현재 재현

- `/f/curated-wedding-naver-timeline`과 `/f/wedding-d180-basic`은 Calendar, Checklist, Memo를 동등한 탭으로 보여준다.
- Calendar를 선택해도 저장 destination이 확정되는 것이 아니며 primary action은 계속 `날짜 없이 시작`이다.
- `날짜 정하기`, `날짜 없이`, `예시만 보기`를 눌러도 다음 단계와 저장 결과의 차이가 즉시 명확하지 않다.
- `Flow 가져가기`는 두 번의 disclosure 뒤 format action을 바로 실행하며 실제 output preview가 없다.
- `전체 Flow 구조`는 선택한 artifact preview와 비슷한 항목 목록을 다시 보여준다.

### 제안 흐름

1. 원문과 전체 범위를 먼저 표시한다.
2. 추천 결과 하나를 선택한다: `Calendar 타임라인 · 12개`.
3. 다른 결과는 `다른 방식 2개`에 둔다.
4. Calendar를 선택했으면 결혼식 날짜 input 하나를 바로 붙인다.
5. secondary action은 `날짜 없이 체크리스트로 시작` 하나만 둔다.
6. 전체 Flow는 선택한 artifact 안에서 단계별로 읽는다. 중복된 `전체 구조` 목록은 제거한다.
7. primary action은 결과를 말한다: `캘린더 일정 12개 확인`.
8. 확인 화면에서 날짜 범위, 제외 항목, 예시 event 2개를 보고 저장 또는 ICS를 선택한다.

결혼식 날짜를 입력하지 않은 `예시`는 저장 데이터처럼 보이지 않게 watermark 또는 `예시 일정` 상태로 분리한다.

## 4. 반복 운동 Flow

### 현재 재현

- `/f/curated-allblanc-morning-workout`은 한 개 실행 항목에 Flow 실행, Calendar, Memo 3개 탭과 날짜 모드 3개, 반복 설정, 다음 3회, 전체 Flow 구조, 조정, export를 제공한다.
- 기본 화면은 `scrollHeight=1353`, interactive control 24개다.
- 반복 설정을 열면 `scrollHeight=1703`, interactive control 33개로 늘어난다.
- `Calendar 1`은 하나의 RRULE series와 여러 occurrence 관계를 충분히 설명하지 못한다.

### 제안 흐름

- 기본: 영상/source, `월·수·금 · 5분 · 시간 미정 · 계속`, 다음 3회, primary action 하나
- 일정 미정: `My Flow에서 운동 시작`을 primary로 하고 Calendar는 보조로 숨긴다.
- 요일·시간 설정 후: `반복 일정 1개 · 다음 3회 확인`을 보여준다.
- 반복 설정은 bottom sheet로 열고 요일, 시간, 예상 시간, 종료를 한 compact form으로 묶는다.
- Memo는 기록이 생긴 뒤에만 보조 결과가 된다.
- 실행 항목이 하나면 `전체 Flow 구조 1개`는 노출하지 않는다.

Artifact eligibility는 콘텐츠 타입만이 아니라 현재 설정 상태를 반영해야 한다.

## 5. My Flow

### 현재 재현

Flow 목록 행은 비교적 간결하다. 혼란은 Flow를 누른 뒤 목록 탭 안에 큰 workspace가 인라인으로 펼쳐질 때 발생한다. 결혼 Flow를 연 화면에는 header, 기준일, 다음 할 일, 전체 Flow 12개, 7개 단계, 일괄 조정, 가져가기, 진행률, 관리가 이어진다.

- 열린 화면: `scrollHeight=1702`
- interactive control: 30개
- 첫 viewport interactive control: 19개
- EvidenceKind: `current_production_interaction`, `current_package_screenshot`, `current_source`

### 제안 모바일 IA

- `지금 | Flow 목록 | 완료`는 유지한다.
- Flow 목록은 하나의 compact row anatomy만 사용한다.
- Flow를 탭하면 목록 안에서 확장하지 않고 dedicated mobile Flow workspace로 이동한다.
- workspace header: 뒤로, Flow 제목, 진행률, overflow
- 기본 `실행`: 다음 행동과 가까운 예정 항목
- 내부 mode: `실행 | 전체 계획 | 기록`
- `조정`, `가져가기`, `다시 쓰기`, `관리`는 context menu 또는 sheet에 둔다.
- 항목은 bottom sheet 또는 full-screen item detail로 연다.
- quick action은 완료/reopen, 제목, 날짜, 메모다. 고급 설정은 접는다.

이는 새 글로벌 탭이나 heavy planner가 아니라 기존 My Flow 데이터를 한 번에 한 사용자 질문으로 재구성하는 변경이다.

## 6. Calendar 항목 상세

### 현재 재현

`/calendar?demo=ux20`에서 항목을 열면 선택일 agenda 안에 상세 카드가 인라인으로 삽입된다. 월간 grid, 선택일 목록, 열린 상세, 다음 항목이 같은 세로 흐름에 남는다.

- 열린 상태 `scrollHeight=1644`
- 전체 interactive control 148개, 첫 viewport 47개
- console message 0
- 전체 control 수는 월간 day cell을 포함하므로 직접적인 사용성 점수는 아니지만, 항목 상세가 별도 interaction layer로 분리되지 않았다는 근거다.

### 제안

- 모바일은 항목을 누르면 60% 높이 bottom sheet를 열고 full-screen으로 확장할 수 있게 한다.
- sheet 상단: Flow identity, 항목 제목, 날짜
- quick action: 완료/reopen, 날짜·시간, 메모
- 고급: source, current-item export, 상세 설명
- 닫으면 원래 선택일과 scroll 위치로 복귀한다.
- 날짜 이동과 batch 배치는 별도 placement mode를 유지한다.
- wide는 기존 side inspector를 유지할 수 있다.

Google Calendar는 모바일 event 상세를 열고 위로 밀어 상세 필드를 편집하며, Apple Calendar도 event를 탭한 뒤 별도 detail/edit 문맥에서 수정한다. FlowMe도 월간 탐색과 항목 편집을 같은 인라인 높이 경쟁으로 만들 필요가 없다.

## 7. 조작 문법과 Flow 삭제·복구

### 현재 재현

`/my?demo=ux20&view=flows`의 모바일 Flow lifecycle는 찾기 어렵고 viewport마다 복구 경로가 다르다.

- 활성 Flow를 보관하려면 상세 최하단까지 내려가 `더보기 -> 보관하기`를 눌러야 한다.
- 보관 직후에는 8초짜리 `되돌리기`가 보인다.
- 이후 `보관됨` filter의 행을 눌러도 `390x844`에서는 상세나 복구 action이 열리지 않았다.
- 같은 상태에서 `1024x768`은 오른쪽 상세 canvas와 `더보기 -> 복구하기`를 제공했다.
- `데이터 관리`에는 백업과 불러오기만 있고 Flow 영구 삭제는 없다.
- source의 `removeSavedFlow`는 UI call site가 없다.

또한 `목록에서 빼기`가 source-backed Item 제외, 개인 초안 Item 삭제, subcheck와 resource 제거에 공통으로 사용된다. 사용자는 동사만으로 현재 run, 개인 사본 구조, 원본, 영구 local data 중 무엇이 바뀌는지 예측하기 어렵다.

### 제안

- 실행 상태: `완료 / 다시 열기`
- 일정: `날짜 정하기 / 날짜 없애기`
- source-backed 개인 구성: `Flow에서 제외 / 다시 포함`
- 개인 초안 구조: `항목 삭제 / 항목 복구`
- Flow lifecycle: `보관 / 복구 / 이 기기에서 영구 삭제`
- 모바일 보관 목록의 각 행에 직접 `복구` action을 둔다.
- 영구 삭제는 보관된 Flow의 danger zone에서만 제공한다.
- source-backed Flow 영구 삭제는 공개 원본을 지우지 않고 이 브라우저의 개인 사본과 실행 기록만 지운다는 사실을 확인 dialog에 명시한다.

상세 재현, source line과 삭제 데이터 계약은 [조작 문법과 Flow 삭제·복구 보강](./interaction-data-lifecycle-supplement.md)에 기록했다.

## 8. P31에 반영할 결정

### P31-02 Discovery and save-before

- Home과 Flow 찾기의 역할을 분리한다.
- 카드 source를 실제 외부 링크로 제공한다.
- 카드 전체 tap과 `Flow 열기`를 중복하지 않는다.
- trust metric은 telemetry/review contract 전까지 defer한다.
- content-specific primary artifact 하나를 먼저 보여준다.
- 결혼과 운동의 설정 상태에 따라 destination action과 label을 바꾼다.
- export 전 count, 예시, 손실을 preview한다.

### P31-03 My Flow

- 모바일 Flow 상세를 목록 인라인 확장에서 dedicated workspace로 분리한다.
- default는 다음 행동, 진행률, 전체 계획 진입이다.
- 실행, 전체 계획, 기록만 상위 mode로 두고 조정/export/reuse/manage는 context action으로 이동한다.
- workspace header overflow에 `보관`을 고정하고 보관 목록 row에는 직접 `복구`를 제공한다.
- 완료·일정·제외·삭제·보관 동사를 데이터 상태별로 통일한다.

### P31-04 Calendar

- 모바일 item detail을 bottom sheet/full-screen detail로 분리한다.
- 선택일·scroll·focus를 보존한다.
- wide side inspector와 동일한 item identity 및 action contract를 사용한다.

## 9. Acceptance screenshot과 test marker

| Marker | 기대 화면 |
| --- | --- |
| `P31-02-HOME-ROLE` | 첫 방문은 실제 사용 사례, 재방문은 이어갈 항목. Flow 카탈로그 반복 없음 |
| `P31-02-DISCOVERY-CARD` | source 외부 링크, 중복 CTA 제거, 실제 범위와 primary artifact 한 줄 |
| `P31-02-CONTEXTUAL-ARTIFACT` | 결혼은 Calendar 12개, 운동은 설정 전 My Flow·설정 후 반복 일정으로 action 변화 |
| `P31-02-EXPORT-PREVIEW` | 실행 전 scope, count, 예시, 손실 표시 |
| `P31-03-MOBILE-WORKSPACE` | Flow 목록과 상세가 동시 인라인으로 누적되지 않음 |
| `P31-03-FLOW-LIFECYCLE-GRAMMAR` | 완료·일정·제외·삭제·보관이 서로 다른 사용자 동사와 복구 위치를 사용 |
| `P31-03-ARCHIVE-RESTORE-PARITY` | 390/1024 모두 archive -> reload -> restore 가능 |
| `P31-03-MOBILE-ARCHIVED-DIRECT-RESTORE` | 모바일 보관 행에서 상세 최하단 이동 없이 직접 복구 |
| `P31-05-PERMANENT-DELETE-CONTRACT` | 보관된 Flow만 영구 삭제, 지워질 개인 데이터와 공개 source 보존을 확인 |
| `P31-04-ITEM-SHEET` | Calendar 항목 상세가 bottom sheet로 열리고 닫은 뒤 날짜·focus 유지 |

공통 acceptance:

- 390x844 첫 viewport 경쟁 primary action 1개 이하
- source, personal overlay, run, occurrence, export identity 회귀 0
- 가상 사용자 수·리뷰 수 production 표시 0
- overflow와 fixed navigation overlap 0
- sheet/dialog의 accessible name, Escape, focus return 통과

## 공식 참고 자료

- Todoist Today: https://www.todoist.com/help/articles/plan-your-day-with-the-today-view-UVUXaiSs
- Todoist navigation: https://www.todoist.com/help/articles/customize-the-todoist-navigation-bar-L4qpkI0xj
- Apple Reminders Smart Lists: https://support.apple.com/en-mide/guide/iphone/iphe882772ed/ios
- Notion Home: https://www.notion.com/it/help/home-and-my-tasks
- Notion Marketplace: https://www.notion.com/help/finding-templates-on-marketplace
- Strava feed stats: https://support.strava.com/en-us/articles/15401664-activity-stats-in-the-feed
- Nike Training Club: https://www.nike.com/help/a/ntc-info
- Google Calendar event edit: https://support.google.com/calendar/answer/72143?co=GENIE.Platform%3DAndroid&hl=en
- Apple Calendar event views: https://support.apple.com/en-gb/guide/iphone/iphfd1054569/ios
- Wanderlog itinerary: https://wanderlog.com/blog/faq/
