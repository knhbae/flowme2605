# FlowMe 웹 소스 커뮤니티/제작자 루프 검증 리뷰 (2026-07-05)

기존 웹 소스 scout/demand validation의 상위 30개를 다시 열어, 단순 수요와 변환 적합도에 더해 사용자가 직접 만들고 수정하고 공유할 가능성, 그리고 제작자/브랜드가 자기 Flow를 홍보할 유인을 분리해 평가했다. 이번 산출물은 앱 구현, seed 생성, Flow/Step/Item 작성물이 아니다.

## 요약

- 재평가 후보: demand validation 상위 30개
- 신규 후보 추가: 0개
- 이유: 기존 100개 scout가 이미 이사/결혼/육아/공부/여행/운동/식단/반려/행정/커리어 축을 포함하고 있어, 이번 pass는 후보 확장보다 루프 재분류가 더 중요했다.
- 핵심 변화: 공식/행정/예방접종은 demand와 conversion이 높아도 community/creator 루프에서는 후순위 trust anchor로 분리했다.
- 이번 보강: 각 후보마다 demand, conversion, userCreation, forkRemix, discussion, creatorPromotion, communityLoop, combined 점수 코멘트를 JSON과 모바일 HTML에 추가했다.

## 다음 canary 추천 5~8개

| 순위 | 후보 | 합산 | 조건 | 합산 점수 코멘트 |
| --- | --- | --- | --- | --- |
| 1 | SCOUT-001 아정당 이사 준비 체크리스트 | 92 | canary 후보 | 합산 92: demand 96, conversion 94, community 90, creator 88를 함께 본 값이다. |
| 2 | SCOUT-031 오픽만수르 모의고사 공부 방법 | 83 | canary 후보 | 합산 83: demand 83, conversion 88, community 82, creator 78를 함께 본 값이다. |
| 3 | SCOUT-051 KKday 해외여행 준비물 체크리스트 | 83 | canary 후보 | 합산 83: demand 79, conversion 78, community 86, creator 86를 함께 본 값이다. |
| 4 | SCOUT-011 Planning.wedding 12개월 웨딩 타임라인 | 82 | canary 후보 | 합산 82: demand 72, conversion 78, community 89, creator 82를 함께 본 값이다. |
| 5 | SCOUT-075 오늘의집 일주일 도시락 식단표 | 75 | canary 후보 | 합산 75: demand 73, conversion 65, community 85, creator 72를 함께 본 값이다. |
| 6 | SCOUT-017 겟차 신차 구매 절차 가이드 | 77 | canary 후보 | 합산 77: demand 74, conversion 84, community 66, creator 90를 함께 본 값이다. |
| 7 | SCOUT-025 초기 토핑 이유식 식단표 엑셀 템플릿 | 81 | source import/permission 확인 후 canary | 합산 81: demand 84, conversion 65, community 89, creator 82를 함께 본 값이다. |
| 8 | SCOUT-062 빅씨스 10분 홈트 루틴 플레이리스트 | 79 | source import/permission 확인 후 canary | 합산 79: demand 78, conversion 68, community 80, creator 92를 함께 본 값이다. |

## 사용자들이 직접 만들고 수정할 가능성이 큰 카테고리

| 후보 | user | fork | discussion | community | community 코멘트 |
| --- | --- | --- | --- | --- | --- |
| SCOUT-002 오늘의집 이사 준비 체크리스트 | 92 | 94 | 92 | 94 | 강함: 사용자 생성, fork, 후기/수정 제안이 함께 맞물려 template exchange 후보로 볼 수 있다. |
| SCOUT-026 네이버 이유식 식단표 | 88 | 90 | 92 | 91 | 강함: 사용자 생성, fork, 후기/수정 제안이 함께 맞물려 template exchange 후보로 볼 수 있다. |
| SCOUT-001 아정당 이사 준비 체크리스트 | 90 | 92 | 82 | 90 | 강함: 사용자 생성, fork, 후기/수정 제안이 함께 맞물려 template exchange 후보로 볼 수 있다. |
| SCOUT-025 초기 토핑 이유식 식단표 엑셀 템플릿 | 88 | 86 | 90 | 89 | 강함: 사용자 생성, fork, 후기/수정 제안이 함께 맞물려 template exchange 후보로 볼 수 있다. |
| SCOUT-011 Planning.wedding 12개월 웨딩 타임라인 | 90 | 94 | 82 | 89 | 강함: 사용자 생성, fork, 후기/수정 제안이 함께 맞물려 template exchange 후보로 볼 수 있다. |
| SCOUT-012 Planning.wedding 출력용 결혼 체크리스트 | 88 | 92 | 80 | 87 | 강함: 사용자 생성, fork, 후기/수정 제안이 함께 맞물려 template exchange 후보로 볼 수 있다. |
| SCOUT-007 아정당 자취 준비 리스트 | 88 | 92 | 80 | 87 | 강함: 사용자 생성, fork, 후기/수정 제안이 함께 맞물려 template exchange 후보로 볼 수 있다. |
| SCOUT-051 KKday 해외여행 준비물 체크리스트 | 86 | 90 | 78 | 86 | 강함: 사용자 생성, fork, 후기/수정 제안이 함께 맞물려 template exchange 후보로 볼 수 있다. |
| SCOUT-075 오늘의집 일주일 도시락 식단표 | 84 | 88 | 82 | 85 | 강함: 사용자 생성, fork, 후기/수정 제안이 함께 맞물려 template exchange 후보로 볼 수 있다. |
| SCOUT-031 오픽만수르 모의고사 공부 방법 | 78 | 88 | 76 | 82 | 중간 이상: 반복 실행과 공유 가능성은 있으나 source import 또는 권한 확인 후 키우는 편이 안전하다. |

## 제작자가 홍보할 유인이 큰 카테고리

| 후보 | creatorType | creator | backlink | creator 코멘트 |
| --- | --- | --- | --- | --- |
| SCOUT-062 빅씨스 10분 홈트 루틴 플레이리스트 | individual_creator | 92 | very_high | 강함: Flow가 원문 방문, 영상 재생, 상담/예약/구매로 되돌아가 제작자가 홍보할 유인이 크다. 유인=video_view, subscription, traffic. |
| SCOUT-063 빅씨스 초보 홈트 5일 챌린지 | individual_creator | 90 | very_high | 강함: Flow가 원문 방문, 영상 재생, 상담/예약/구매로 되돌아가 제작자가 홍보할 유인이 크다. 유인=video_view, subscription. |
| SCOUT-017 겟차 신차 구매 절차 가이드 | brand | 90 | very_high | 강함: Flow가 원문 방문, 영상 재생, 상담/예약/구매로 되돌아가 제작자가 홍보할 유인이 크다. 유인=lead, traffic, purchase. |
| SCOUT-001 아정당 이사 준비 체크리스트 | brand | 88 | high | 강함: Flow가 원문 방문, 영상 재생, 상담/예약/구매로 되돌아가 제작자가 홍보할 유인이 크다. 유인=traffic, download, lead, booking. |
| SCOUT-051 KKday 해외여행 준비물 체크리스트 | marketplace | 86 | high | 강함: Flow가 원문 방문, 영상 재생, 상담/예약/구매로 되돌아가 제작자가 홍보할 유인이 크다. 유인=traffic, booking, purchase. |
| SCOUT-100 면접 직전 체크리스트 영상 | individual_creator | 86 | very_high | 강함: Flow가 원문 방문, 영상 재생, 상담/예약/구매로 되돌아가 제작자가 홍보할 유인이 크다. 유인=video_view, subscription, lead. |
| SCOUT-099 토스페이먼츠 통신판매업 신고 방법 | brand | 84 | high | 중간 이상: 원문 유입이나 신뢰/retention 효과는 있으나 Flow가 직접 매출/재생으로 이어지는 정도는 제한적이다. 유인=traffic, lead, trust. |
| SCOUT-007 아정당 자취 준비 리스트 | brand | 84 | high | 중간 이상: 원문 유입이나 신뢰/retention 효과는 있으나 Flow가 직접 매출/재생으로 이어지는 정도는 제한적이다. 유인=traffic, lead, purchase. |
| SCOUT-025 초기 토핑 이유식 식단표 엑셀 템플릿 | individual_creator | 82 | high | 중간 이상: 원문 유입이나 신뢰/retention 효과는 있으나 Flow가 직접 매출/재생으로 이어지는 정도는 제한적이다. 유인=traffic, download, subscription, trust. |
| SCOUT-011 Planning.wedding 12개월 웨딩 타임라인 | platform | 82 | high | 중간 이상: 원문 유입이나 신뢰/retention 효과는 있으나 Flow가 직접 매출/재생으로 이어지는 정도는 제한적이다. 유인=subscription, traffic, retention. |

## 공식 trust anchor 카테고리

| 후보 | demand | conversion | community | 낮은 community 이유 |
| --- | --- | --- | --- | --- |
| SCOUT-021 질병관리청 표준 예방접종 일정표 | 84 | 92 | 22 | 낮음: 서로 만들고 수정하는 카테고리보다 공식 확인/개인 저장/캘린더 알림 역할이 맞다. |
| SCOUT-023 국립재활원 영유아 건강검진 | 82 | 89 | 26 | 낮음: 서로 만들고 수정하는 카테고리보다 공식 확인/개인 저장/캘린더 알림 역할이 맞다. |
| SCOUT-086 삼성 에어컨 필터 청소 방법 | 86 | 88 | 32 | 낮음: 서로 만들고 수정하는 카테고리보다 공식 확인/개인 저장/캘린더 알림 역할이 맞다. |
| SCOUT-045 국세청 연말정산 체크리스트 | 83 | 86 | 24 | 낮음: 서로 만들고 수정하는 카테고리보다 공식 확인/개인 저장/캘린더 알림 역할이 맞다. |
| SCOUT-044 안전운전 통합민원 면허 갱신/적성검사 | 80 | 86 | 28 | 낮음: 서로 만들고 수정하는 카테고리보다 공식 확인/개인 저장/캘린더 알림 역할이 맞다. |
| SCOUT-047 국세청 개인 사업자등록 신청서 작성방법 | 78 | 82 | 31 | 낮음: 서로 만들고 수정하는 카테고리보다 공식 확인/개인 저장/캘린더 알림 역할이 맞다. |
| SCOUT-054 생활법령정보 해외여행 출국절차 | 78 | 82 | 32 | 낮음: 서로 만들고 수정하는 카테고리보다 공식 확인/개인 저장/캘린더 알림 역할이 맞다. |
| SCOUT-003 생활법령정보 이사 체크리스트 | 76 | 82 | 36 | 낮음: 서로 만들고 수정하는 카테고리보다 공식 확인/개인 저장/캘린더 알림 역할이 맞다. |
| SCOUT-055 Visit Japan Web 공식 | 80 | 65 | 44 | 낮음: 서로 만들고 수정하는 카테고리보다 공식 확인/개인 저장/캘린더 알림 역할이 맞다. |
| SCOUT-085 KIPFRI 고양이 입양 체크리스트 | 73 | 65 | 60 | 제한적: 사용자 상황별 수정은 일부 있지만 커뮤니티 성장 루프보다는 개별 utility가 중심이다. |
| SCOUT-022 예방접종도우미 아이 접종일 보기 | 78 | 55 | 18 | 낮음: 서로 만들고 수정하는 카테고리보다 공식 확인/개인 저장/캘린더 알림 역할이 맞다. |

## 후보별 점수 코멘트 샘플

### SCOUT-001 아정당 이사 준비 체크리스트

- Demand 96: 강함: 조회 96,510 / 스크랩 20 / PDF,XLSX,Notion
- Conversion 94: 강함: 본문 표와 첨부파일 row 있음; 엑셀, PDF, 노션 첨부와 D-day 표
- User creation 90: 강함: 날짜, 예산, 가족/상황, 목표에 맞춰 사용자가 자기 버전을 새로 만들 여지가 크다.
- Fork/remix 92: 강함: 기간, 지역, 준비 수준, 목표별로 남의 버전을 가져와 바꾸기 쉽다.
- Discussion 82: 중간 이상: 실행 후기나 대체 버전 공유는 가능하지만 강한 커뮤니티 토론까지는 검증 필요.
- Creator promotion 88: 강함: Flow가 원문 방문, 영상 재생, 상담/예약/구매로 되돌아가 제작자가 홍보할 유인이 크다. 유인=traffic, download, lead, booking.
- Community loop 90: 강함: 사용자 생성, fork, 후기/수정 제안이 함께 맞물려 template exchange 후보로 볼 수 있다.

### SCOUT-031 오픽만수르 모의고사 공부 방법

- Demand 83: 중간 이상: 조회수 unknown / XLSX, 1달 PDF, 2주 PDF
- Conversion 88: 강함: 계획표 파일과 영상 링크 있음; 공부 계획표 엑셀/PDF와 영상자료
- User creation 78: 중간 이상: 시작일, 요일, 기간, 수준 정도는 사용자가 직접 조정할 수 있다.
- Fork/remix 88: 강함: 기간, 지역, 준비 수준, 목표별로 남의 버전을 가져와 바꾸기 쉽다.
- Discussion 76: 중간 이상: 실행 후기나 대체 버전 공유는 가능하지만 강한 커뮤니티 토론까지는 검증 필요.
- Creator promotion 78: 중간 이상: 원문 유입이나 신뢰/retention 효과는 있으나 Flow가 직접 매출/재생으로 이어지는 정도는 제한적이다. 유인=traffic, download, video_view, trust.
- Community loop 82: 중간 이상: 반복 실행과 공유 가능성은 있으나 source import 또는 권한 확인 후 키우는 편이 안전하다.

### SCOUT-051 KKday 해외여행 준비물 체크리스트

- Demand 79: 중간 이상: 글 조회수 unknown / 상품 100K+ 예약 등 상업 수요 신호
- Conversion 78: 중간 이상: 준비물 목록 row 있음; 필수/유용/숙소 확인 준비물 표
- User creation 86: 강함: 날짜, 예산, 가족/상황, 목표에 맞춰 사용자가 자기 버전을 새로 만들 여지가 크다.
- Fork/remix 90: 강함: 기간, 지역, 준비 수준, 목표별로 남의 버전을 가져와 바꾸기 쉽다.
- Discussion 78: 중간 이상: 실행 후기나 대체 버전 공유는 가능하지만 강한 커뮤니티 토론까지는 검증 필요.
- Creator promotion 86: 강함: Flow가 원문 방문, 영상 재생, 상담/예약/구매로 되돌아가 제작자가 홍보할 유인이 크다. 유인=traffic, booking, purchase.
- Community loop 86: 강함: 사용자 생성, fork, 후기/수정 제안이 함께 맞물려 template exchange 후보로 볼 수 있다.

### SCOUT-011 Planning.wedding 12개월 웨딩 타임라인

- Demand 72: 중간 이상: 조회수 unknown / 무료 타임라인 생성 CTA
- Conversion 78: 중간 이상: 월별 row 본문 노출; 12개월 타임라인과 월별 checklist row
- User creation 90: 강함: 날짜, 예산, 가족/상황, 목표에 맞춰 사용자가 자기 버전을 새로 만들 여지가 크다.
- Fork/remix 94: 강함: 기간, 지역, 준비 수준, 목표별로 남의 버전을 가져와 바꾸기 쉽다.
- Discussion 82: 중간 이상: 실행 후기나 대체 버전 공유는 가능하지만 강한 커뮤니티 토론까지는 검증 필요.
- Creator promotion 82: 중간 이상: 원문 유입이나 신뢰/retention 효과는 있으나 Flow가 직접 매출/재생으로 이어지는 정도는 제한적이다. 유인=subscription, traffic, retention.
- Community loop 89: 강함: 사용자 생성, fork, 후기/수정 제안이 함께 맞물려 template exchange 후보로 볼 수 있다.

### SCOUT-075 오늘의집 일주일 도시락 식단표

- Demand 73: 중간 이상: 검색 추출에서 수요일 김치볶음밥/두부봉부침/깍두기, 목요일 짜장잡채밥 등 요일 구조 확인
- Conversion 65: 제한적: weekday lunchbox menu rows; weekday lunchbox menu rows
- User creation 84: 중간 이상: 시작일, 요일, 기간, 수준 정도는 사용자가 직접 조정할 수 있다.
- Fork/remix 88: 강함: 기간, 지역, 준비 수준, 목표별로 남의 버전을 가져와 바꾸기 쉽다.
- Discussion 82: 중간 이상: 실행 후기나 대체 버전 공유는 가능하지만 강한 커뮤니티 토론까지는 검증 필요.
- Creator promotion 72: 중간 이상: 원문 유입이나 신뢰/retention 효과는 있으나 Flow가 직접 매출/재생으로 이어지는 정도는 제한적이다. 유인=traffic, purchase, retention.
- Community loop 85: 강함: 사용자 생성, fork, 후기/수정 제안이 함께 맞물려 template exchange 후보로 볼 수 있다.

### SCOUT-017 겟차 신차 구매 절차 가이드

- Demand 74: 중간 이상: 조회수 unknown / 구매 단계와 최종 checklist
- Conversion 84: 중간 이상: 단계/비용/계약 row 있음; 구매 단계, 비용, 계약 확인 항목
- User creation 62: 제한적: 일부 개인화는 가능하지만 원문 구조나 브랜드/기관 안내가 주도한다.
- Fork/remix 70: 중간 이상: 시작일/요일/대상 정도의 remix는 자연스럽지만 구조 전체를 바꾸는 정도는 아니다.
- Discussion 55: 제한적: 개인 경험 공유는 가능하나 원문 개선 토론으로 반복될 가능성은 중간 이하.
- Creator promotion 90: 강함: Flow가 원문 방문, 영상 재생, 상담/예약/구매로 되돌아가 제작자가 홍보할 유인이 크다. 유인=lead, traffic, purchase.
- Community loop 66: 제한적: 사용자 상황별 수정은 일부 있지만 커뮤니티 성장 루프보다는 개별 utility가 중심이다.

### SCOUT-025 초기 토핑 이유식 식단표 엑셀 템플릿

- Demand 84: 중간 이상: 무료 공유 / 엑셀 템플릿 / 공감·댓글 요청, 수치 unknown
- Conversion 65: 제한적: 파일 row 직접 확인 필요; 초기 이유식 식단표 엑셀 템플릿
- User creation 88: 강함: 날짜, 예산, 가족/상황, 목표에 맞춰 사용자가 자기 버전을 새로 만들 여지가 크다.
- Fork/remix 86: 강함: 기간, 지역, 준비 수준, 목표별로 남의 버전을 가져와 바꾸기 쉽다.
- Discussion 90: 강함: 누락 항목, 더 나은 순서, 내 버전 후기 같은 댓글/수정 제안이 생기기 쉽다.
- Creator promotion 82: 중간 이상: 원문 유입이나 신뢰/retention 효과는 있으나 Flow가 직접 매출/재생으로 이어지는 정도는 제한적이다. 유인=traffic, download, subscription, trust.
- Community loop 89: 강함: 사용자 생성, fork, 후기/수정 제안이 함께 맞물려 template exchange 후보로 볼 수 있다.

### SCOUT-062 빅씨스 10분 홈트 루틴 플레이리스트

- Demand 78: 중간 이상: YouTube playlist / 관련 영상 2.4M views 검색 노출
- Conversion 68: 제한적: playlist 영상 목록 import 필요; 영상 제목/URL 반복 루틴
- User creation 72: 중간 이상: 시작일, 요일, 기간, 수준 정도는 사용자가 직접 조정할 수 있다.
- Fork/remix 84: 중간 이상: 시작일/요일/대상 정도의 remix는 자연스럽지만 구조 전체를 바꾸는 정도는 아니다.
- Discussion 74: 중간 이상: 실행 후기나 대체 버전 공유는 가능하지만 강한 커뮤니티 토론까지는 검증 필요.
- Creator promotion 92: 강함: Flow가 원문 방문, 영상 재생, 상담/예약/구매로 되돌아가 제작자가 홍보할 유인이 크다. 유인=video_view, subscription, traffic.
- Community loop 80: 중간 이상: 반복 실행과 공유 가능성은 있으나 source import 또는 권한 확인 후 키우는 편이 안전하다.


## community loop는 강하지만 source/risk가 큰 후보

| 후보 | community | permission | risk | 다음 |
| --- | --- | --- | --- | --- |
| SCOUT-026 네이버 이유식 식단표 | 91 | high | medical_family_sensitive | 파일/댓글/사용허용 확인이 먼저. 확인되면 community canary 최상위권. |
| SCOUT-025 초기 토핑 이유식 식단표 엑셀 템플릿 | 89 | high | medical_family_sensitive | source_import_required. 파일 row와 공유 허용 범위를 확인하면 canary 후보로 승격한다. |
| SCOUT-062 빅씨스 10분 홈트 루틴 플레이리스트 | 80 | medium | health_sensitive | source_import_required. 영상 title/URL/길이만 가져오는 canary로 설계한다. |
| SCOUT-083 강아지 예방접종 일정표 총정리 | 48 | high | pet_health_sensitive | source/risk high. 반려동물 health trust 보조 후보로 둔다. |
| SCOUT-081 핏펫 강아지 예방접종 일정 | 45 | high | pet_health_sensitive | 반려동물 health 후보는 공식 교차 확인 전 보류. |
| SCOUT-055 Visit Japan Web 공식 | 44 | medium | official | source_import_required. 공식 절차 row를 확보하기 전까지 보류. |
| SCOUT-082 로얄캐닌 반려견 백신 접종 일정 | 42 | high | pet_health_sensitive | 반려 health 후보는 공식/수의사 기준 교차 확인 후 보류. |

## 기존 demand canary와 비교한 우선순위 변화

- 유지: SCOUT-001 이사, SCOUT-031 오픽은 demand/conversion/community/creator가 모두 강해 다음 앱 canary 후보로 유지한다.
- trust anchor로 분리: SCOUT-021 예방접종, SCOUT-045 연말정산, SCOUT-044 면허 갱신, SCOUT-023 건강검진은 앱 신뢰도를 높이지만 커뮤니티/제작자 루프 후보는 아니다.
- 상승: SCOUT-051 여행 준비물, SCOUT-011/012 결혼 체크리스트, SCOUT-075 도시락 식단표, SCOUT-007 자취 준비 리스트는 demand 순위보다 community/fork 관점에서 올라간다.
- 조건부 상승: SCOUT-025/026 이유식 식단표와 SCOUT-062/063 홈트 영상은 커뮤니티/제작자 루프가 강하지만 source import와 권한 확인이 먼저다.
- 보조: SCOUT-002 오늘의집 이사는 visible demand와 community proof가 매우 강하지만 SCOUT-001과 중복되므로 대표 canary보다 비교/보조 source가 낫다.

## 작업 메모

- 원문에 없는 Flow/Step/Item은 만들지 않았다.
- 사용자 입력 필드, 먹은 양, 통증, 이상반응, 견적 세부 등은 새 field로 제안하지 않았다.
- 이번 결과는 카테고리/후보 우선순위 재분류다. 앱 구현, seed JSON, 실제 Flow 콘텐츠 데이터는 만들지 않았다.
- 상세 데이터: [community/creator loop validation JSON](./2026-07-05-web-source-community-creator-loop-validation.json)
- 모바일 검토판: [community/creator loop shortlist HTML](./2026-07-05-web-source-community-creator-loop-shortlist-ko.html)
