# 2026-06-08 Diversified Korean Source Queue

목적: 사용자가 지적한 "매번 같은 콘텐츠만 나온다" 문제를 줄이기 위해, 다음 source-to-Flow 검토 배치를 카테고리/사용자 순간/산출물 형태별로 강제 분산한다.

이 문서는 후보 발굴 큐다. `검증됨`이 아니다. 각 후보는 실제 사용자 행동 데이터가 아니라 검색/원문 일부 확인 기반의 source-to-Flow QA 후보로만 취급한다.

## 적용한 배치 규칙

- 한 배치 안에서 같은 좁은 주제는 최대 3개까지만 둔다.
- 같은 artifact shape + 같은 user moment는 최대 2개까지만 둔다.
- 고득점이어도 기존 대표 예시와 똑같은 학습만 주면 `backup`으로 내린다.
- 동점이면 source/creator interaction 또는 새로운 사용자 순간을 더 잘 보여주는 후보를 위에 둔다.
- 입력 복잡도는 캘린더/리마인더/체크리스트 앱 수준을 넘지 않는다.

## 평가 가중치

| 항목 | 가중치 | 판단 기준 |
|---|---:|---|
| 원문 실행 단위 명확성 | 25 | 날짜, 반복, 단계, 체크, 표, 준비물, 제출/예약/결정이 원문에 보이는가 |
| source/creator interaction | 25 | 댓글, 조회, 구독자, 자료 요청, 파일, 후속 글, 작성자 경험이 보이는가 |
| 사용자 욕구/빈도 | 20 | 많은 사용자가 실제로 따라 하고 싶거나 자주 찾을 가능성이 있는가 |
| FlowMe 이식성 | 15 | calendar/sheet/memo/checklist 중 하나로 자연스럽게 옮겨지는가 |
| 입력 단순성 | 10 | 시작일, 대상, 반복 주기 정도로 충분한가 |
| 기존 후보와의 차별 학습 | 5 | 기존 washer/wedding/used-car와 다른 UX 질문을 만드는가 |

## 새 후보 큐

| 우선 | 후보 | 원문/출처 | 새로 배우는 사용자 순간 | 예상 Flow 산출물 | 1차 점수 | 상태 |
|---|---|---|---|---|---:|---|
| P0 | 알뜰폰 SK7 셀프개통 | Naver Blog, SK7 셀프개통 후기: `https://blog.naver.com/PostView.nhn?blogId=saljjak-&logNo=223661947600` | 사용자가 통신사 변경을 직접 실행하는 10분 절차 | `체크리스트`: 개통 가능 시간 확인, 유심 번호 입력, 번호이동 동의, 유심 교체, 재부팅 | 4.6 | 원문 일부 확인 |
| P0 | 치앙마이 혼자 여행 준비물 | Naver Blog: `https://blog.naver.com/PostView.nhn?blogId=mat_zip_diary&logNo=223137520451` | 장기/혼자 여행자가 통신, 결제, 안전 준비물을 체크 | `체크리스트 + 메모`: 유심/eSIM, GLN, 환전, 보험, 샤워기 필터, 비상 연락 | 4.5 | 원문 일부 확인 |
| P0 | 컴활 2급 필기 3일 공부 계획 | Naver Blog: `https://blog.naver.com/PostView.naver?blogId=bunnudy&logNo=222440821485` | 시험 공부를 과목/회차별로 3일에 압축 | `3일 캘린더 + 진행표`: 1과목, 2과목, 월단위 재풀이, PDF/기출 링크 메모 | 4.5 | 검색 결과 확인 |
| P0 | 영유아 건강검진 예약/문진표 준비 | NHIS 건강iN: `https://www.nhis.or.kr/magazin/mobile/201604/c09.html` | 부모가 검진 예약, 문진표/등록번호, 방문 준비를 놓치지 않음 | `캘린더 + 체크`: 검진 예정일, 예약, 문진표/발달선별, 등록번호, 방문 | 4.4 | 원문 일부 확인 |
| P0 | 주택 임대차계약 신고/확정일자 | Naver Blog: `https://blog.naver.com/PostView.naver?blogId=havelaw&logNo=222863332365` | 이사/계약 후 30일 내 신고와 확정일자를 챙김 | `D+타임라인`: 계약일 입력, 30일 신고 마감, 계약서/보증금 조건 메모 | 4.3 | 원문 일부 확인 |
| P1 | 주말농장 6월 작물 선택 | Naver Blog: `https://blog.naver.com/PostView.nhn?blogId=aldus_06&logNo=222737304553` | 텃밭 사용자가 월별 심을 작물과 수확 시기를 고름 | `시트 + 캘린더`: 작물, 파종/정식 시기, 간격, 수확월, 순지르기 메모 | 4.2 | 원문 일부 확인 |
| P1 | 오레오 케이크 1분 영상 레시피 | Recipi'O + YouTube 원본: `https://www.recipio.kr/recipes/0J3Z2neM` | 매우 짧은 제작자 레시피를 당일 체크로 실행 | `체크리스트`: 오레오 부수기, 요거트 층 쌓기, 냉장 숙성, 원본 영상 링크 | 4.2 | 원문 일부 확인 |
| P1 | 인생 초코칩 모카빵 180분 레시피 | Recipi'O + YouTube 원본: `https://www.recipio.kr/recipes/lBgYydJZ` | 긴 홈베이킹 영상을 재료/단계/대기시간으로 쪼갬 | `타임라인 체크`: 재료 계량, 커피우유, 반죽, 폴딩, 발효/굽기 타이머 | 4.1 | 원문 일부 확인 |
| P1 | 주민등록증 재발급 준비 | Naver Blog: `https://blog.naver.com/PostView.nhn?blogId=eejee_&logNo=223139341353` | 사진/수수료/수령기관 같은 행정 준비물을 체크 | `메모 + 체크`: 신청 사유, 사진 파일/실물, 수수료, 수령 방식, 정부24 링크 | 4.0 | 원문 일부 확인 |
| P1 | 운전면허 적성검사/갱신 | 안전운전 통합민원: `https://www.safedriving.or.kr/guide/larGuide011.do?menuCode=MN-PO` | 갱신 기간이 바뀌는 공식 행정 절차를 내 일정으로 변환 | `캘린더 + 공식 메모`: 갱신기간 확인, 사진/신체검사 여부, 신청/방문 일정 | 4.0 | 공식 원문 일부 확인 |
| P1 | 일본/삿포로 eSIM 설정 | Naver Blog: `https://blog.naver.com/PostView.naver?blogId=4223611&logNo=223359962508` | 여행 전 구매/QR/레이블/도착 후 회선 전환 | `출국 D-3~D-Day 체크`: 구매, QR 저장, 레이블, 로밍 ON, 현지 연결 | 3.9 | 이미 public route 있음, backup |
| P1 | 바닐라 익스트랙 만들기 | Naver Blog: `https://blog.naver.com/PostView.naver?blogId=nini-&categoryNo=32&logNo=222236330770&parentCategoryNo=0` | 장기 숙성 DIY 식재료를 날짜 리마인더로 관리 | `캘린더`: 담금일, 8주 확인, 6개월/1년 개봉 후보, 흔들기/차광 메모 | 3.9 | 검색 결과 확인 |
| P1 | 초등 3학년 영어 단어 예습 | Naver Blog: `https://blog.naver.com/PostView.naver?blogId=1514sj&logNo=223788655123` | 파일이 있는 학습 자료를 주간 암기표로 옮김 | `주간 체크 + 파일 메모`: 단어 PDF, 암기표, 하루 분량, 복습일 | 3.8 | 검색 결과 확인 |
| P1 | 레스토랑 예약 티켓팅/빈자리 알림 | Naver Blog, 디핀 옥수 예약 후기: `https://blog.naver.com/PostView.nhn?blogId=bella__gyuri&logNo=223727616507` | 특정 인기 예약을 날짜/오픈시각/알림으로 관리 | `예약 캘린더`: 예약 오픈일, 빈자리 알림 신청, 방문 전 확인 메모 | 3.7 | 원문 일부 확인, 범용성 재검토 |
| P2 | 대학 MT 준비물/일정표 | Naver Blog: `https://blog.naver.com/PostView.naver?blogId=potentdia13001&logNo=223516597153` | 단체 행사 준비물을 개인/공동 체크로 나눔 | `체크리스트 + 역할 메모`: 개인 짐, 상비약, 회비/현금, 일정표, 역할 | 3.6 | 검색 결과 확인, AI-like 가능성 |
| P2 | 자동차 매도용 인감증명서 | Naver Blog: `https://blog.naver.com/PostView.nhn?blogId=yymkkc&logNo=223193412935` | 자동차 판매 전 서류와 대리인 위임 조건 확인 | `행정 체크`: 매수자 정보, 위임장, 신분증, 도장, 주민센터 방문 | 3.6 | 검색 결과 확인, 공식 보강 필요 |
| P2 | 청소년상담사 2급 단기 공부법 | Naver Blog: `https://blog.naver.com/PostView.naver?blogId=doutdel&logNo=221675540556` | 전문시험 후기의 기출/교재/과목 정리를 계획화 | `공부 시트`: 과목별 약점, 기출분석, 교재 회차, 최종 정리 | 3.5 | 검색 결과 확인 |
| P2 | 홈멀티 에어컨 청소/전문가 구분 | Samsung Service: `https://www.samsungsvc.co.kr/solution/39637` | 셀프 청소와 엔지니어 방문 영역을 구분 | `관리 체크 + 보류`: 전원/바람문/필터, 내부세척은 문의 상태 | 3.5 | 기존 가전 클러스터, backup |

## 후보별 Flow화 메모

### 1. 알뜰폰 SK7 셀프개통

Conversion decision:

- User need: 알뜰폰으로 번호이동하려는 사용자가 개통 가능 시간과 유심/본인인증 절차를 놓치지 않고 10분 안에 개통한다.
- Content shape: 개인 후기 + 단계별 개통 경험.
- Primary destination: `internal_check`.
- Structure: `checklist`.
- Action count: 5-6.
- Playbook: source-specific checklist.
- Exceptions: 요금제 추천/절약 주장은 메모로 내리고, 실행판은 개통 절차만 둔다.
- Risk/source handling: 통신사 정책은 공식 링크 확인 필요. 개인 후기는 경험으로 표시.

실제 Flow 예시:

1. 셀프개통 가능 시간 확인하기.
2. 유심 번호와 본인인증 수단 준비하기.
3. 가입유형/요금제/유심 정보를 입력하기.
4. 번호이동 사전동의 ARS 또는 문자 처리하기.
5. 최종 개통 후 유심 교체하고 전원 2회 재시작하기.

### 2. 치앙마이 혼자 여행 준비물

Conversion decision:

- User need: 혼자 장기 여행을 준비하는 사용자가 통신, 결제, 보험, 비상 준비물을 한 번에 챙긴다.
- Content shape: 여행 준비물 체크리스트 + 경험 팁.
- Primary destination: `internal_check`.
- Structure: `checklist`.
- Action count: 6-8.
- Playbook: source-specific checklist.
- Exceptions: 상품 구매 링크는 메모로만 둔다.
- Risk/source handling: 안전/보험/결제 팁은 개인 경험으로 표시하고 공식 여행 안전 정보는 별도 링크로 보강한다.

실제 Flow 예시:

1. 메인폰/비상폰 통신 수단 정하기.
2. 유심/eSIM 구매 링크와 설치 방법 저장하기.
3. GLN/현금/카드 결제 수단 확인하기.
4. 여행자보험 가입 여부 확인하기.
5. 샤워기 필터/상비약/비상 연락 메모 준비하기.
6. 출국 전 체크리스트를 메모 앱으로 복사하기.

### 3. 컴활 2급 필기 3일 공부 계획

Conversion decision:

- User need: 시험이 가까운 사용자가 원문 공부 순서를 3일 캘린더와 기출 진행표로 옮긴다.
- Content shape: 합격 후기 + 3일 학습 계획 + PDF/기출 단서.
- Primary destination: `hybrid`.
- Structure: `timeline`.
- Action count: 3-5.
- Playbook: study/challenge.
- Exceptions: 합격 보장 문구 금지. 기출/강의 링크는 메모.
- Risk/source handling: 개인 합격 경험과 공식 시험 일정은 분리.

실제 Flow 예시:

1. 시험일 입력하기.
2. D-3: 1과목 2020~2018 기출 풀기.
3. D-2: 2과목 2020~2018 기출 풀기.
4. D-1: 월단위로 다시 풀고 요약 PDF 보기.
5. 시험 전: 반복 오답만 메모하기.

### 4. 영유아 건강검진 예약/문진표 준비

Conversion decision:

- User need: 부모가 영유아 검진을 예약하고 문진표/등록번호/방문 준비를 놓치지 않는다.
- Content shape: 공식 건강검진 안내.
- Primary destination: `calendar`.
- Structure: `timeline`.
- Action count: 4-5.
- Playbook: official/admin deadline.
- Exceptions: 검사 결과 기록 앱으로 확장하지 않는다.
- Risk/source handling: 공식 정보와 부모 준비 메모를 분리. 의료 판단 금지.

실제 Flow 예시:

1. 검진 가능 기간과 검진 예정일 입력하기.
2. D-14: 검진기관 예약하기.
3. D-7: 문진표/발달선별 작성 가능 여부 확인하기.
4. D-1: 등록번호, 신분/보험 정보, 아이 컨디션 메모 준비하기.
5. D-Day: 예약 시간에 방문하기.

### 5. 주말농장 6월 작물 선택

Conversion decision:

- User need: 텃밭 사용자가 6월에 심을 작물을 고르고 파종/정식/수확 시기를 관리한다.
- Content shape: 작물 리스트 + 시기/간격/수확월.
- Primary destination: `sheet`.
- Structure: `checklist`.
- Action count: rows-first.
- Playbook: table/plan rows.
- Exceptions: 작물별 세부 재배법은 메모로 둔다.
- Risk/source handling: 개인 재배 경험은 creator experience로 표시.

실제 Flow 예시:

| 작물 | 할 일 | 일정 | 메모 |
|---|---|---|---|
| 서리태 | 심을 공간 정하기 | 6월 | 간격 50cm, 수확 10~11월 |
| 들깨 | 파종/정식 구분 | 5월 말~7월 | 정식 간격 40~60cm |
| 후보 작물 | 다음 주말 구매/심기 | 선택일 | 원문 링크 |

## 이번 큐에서 보류/감점한 이유

- eSIM, 에어컨, 정수기, 세탁기는 여전히 좋지만 이미 대표/backup 학습이 충분하므로 새 배치에서는 최대 1-2개만 둔다.
- 레시피는 많지만 영양/칼로리/식단 기록으로 커지면 FlowMe 목적에서 벗어나므로 `원본 영상 링크 + 당일 체크리스트`로 제한한다.
- 행정/법률성 후보는 유용하지만 공식 링크 재확인이 없으면 public route로 바로 승격하지 않는다.
- 건강/육아 후보는 기록 앱으로 만들지 않고 예약/준비/캘린더 수준에서만 다룬다.

## 다음 작업

1. 이 큐에서 P0 5개만 골라 `/content-flows` 후보 UI에 추가할지 결정한다.
2. 각 P0마다 원문을 다시 열어 source-to-artifact trace를 만든다.
3. 후보 UI에 올릴 때는 `save input <= 3개`, `source URL`, `memo/detail`, `completion`만 보장한다.
4. public `/f/[slug]` 승격은 사용자가 실제 화면을 보고 "이 정도면 판단 가능"하다고 보는 후보부터 한다.

## 2026-06-08 추가 피드백: 여전히 후보가 반복되어 보임

사용자 피드백: "틀린 건 아닌데, 매번 똑같은 콘텐츠라 좋은데도 동일하게 느껴진다."

해석:

- 지금까지 고득점 후보가 `가전 관리`, `여행 준비`, `공부`, `결혼/이사`, `중고차/차량` 쪽에 반복적으로 몰렸다.
- 이 후보들은 FlowMe에 잘 맞지만, 플랫폼 가능성을 확인하기에는 사용자 순간이 좁다.
- 다음 승격 후보는 점수가 조금 낮더라도 기존 public route와 다른 사용 맥락을 보여주는 쪽을 우선한다.

### 당분간 승격 보류할 반복 축

| 축 | 보류 이유 |
|---|---|
| 가전/필터/청소 루틴 | 세탁기, 정수기, 에어컨 후보로 이미 충분히 학습했다. |
| 여행 준비물 일반형 | 일본 eSIM, 치앙마이 준비물로 이미 기본 패턴을 확인했다. |
| 결혼/이사 D-day | 캘린더 타임라인 대표성은 높지만 반복감이 강하다. |
| 컴활/시험 공부 variant | 기존 30일 공부 Flow와 사용자 순간이 겹친다. 당분간 단독 public route보다 variant로만 본다. |
| 차량 구매/점검 | 중고차/신차/차량관리로 이미 decision checklist를 확인했다. |

### 새로 더 봐야 하는 사용자 순간

| 새 축 | 왜 필요한가 | 예상 Flow 형태 | 검색/원문 단서 |
|---|---|---|---|
| 기숙사/자취/새 생활 시작 | 학생/청년의 전환기 준비물은 결혼/이사와 다르다. 비용, 제출서류, 룸메이트, 생활용품이 핵심이다. | 체크리스트 + 입사일 캘린더 | `대학교 기숙사 준비물 체크리스트 무료 배포` Naver Blog: `https://blog.naver.com/PostView.naver?blogId=chan6392&logNo=223350080338` |
| 초등 입학/학기 준비 | 학부모가 실제로 많이 찾고, 시기성/준비물/이름표/학교 공지가 섞인다. | D-30 준비 체크 + 구매/라벨 메모 | `2026년 초등학교 입학 준비물 체크리스트`: `https://hahappa.tistory.com/153` |
| 아이 만들기/도안 놀이 | creator가 PDF 도안을 배포하고 사용자는 인쇄/재료/놀이 시간을 정한다. 기존 육아 기록형과 완전히 다르다. | 당일 만들기 체크리스트 + 도안 링크 메모 | Makeit 겨울 간식꾸러미 스퀴시 도안 Naver Blog: `https://blog.naver.com/PostView.naver?blogId=makeitdiy&logNo=223260911491` |
| 초등 영어/단어 예습 | 공부지만 자격증이 아니라 부모-아이 주간 활동이다. PDF/암기표를 주간 루틴으로 옮길 수 있다. | 주간 루틴 + PDF 링크 메모 | 초등 3학년 영어 단어 파일 Naver Blog: `https://blog.naver.com/PostView.naver?blogId=1514sj&logNo=223788655123` |
| 디지털 도구 설치/설정 | 사용자가 원문을 보고 바로 따라 하는 절차형 콘텐츠다. 캘린더보다 체크리스트 중심 UX를 검증한다. | 순서형 체크리스트 | AnyDesk 설치/원격 방법 Naver Blog: `https://blog.naver.com/PostView.naver?blogId=haruitelectronics&logNo=223780890597` |
| 검색콘솔/블로그 운영 설정 | creator/소상공인이 외부 가이드를 보고 계정/사이트를 설정하는 순간이다. 단, 마케팅 성과 보장은 제외한다. | 설정 체크리스트 + 공식 링크 메모 | 네이버·구글 SEO 가이드: `https://www.vizensoft.com/about/itinsight/read/49` |
| 냉장고 파먹기/식재료 소진 | 식단 관리가 아니라 재고 파악, 이번 주 메뉴, 장보기 보류 판단으로 가볍게 만들 수 있다. | 7일 식단 메모 + 재고 체크 시트 | 냉장고 파먹기 챌린지: `https://blog.kchzz111.com/entry/%EB%AC%B4%EC%A7%80%EC%B6%9C-%EB%8D%B0%EC%9D%B4-%EB%83%89%EC%9E%A5%EA%B3%A0-%ED%8C%8C%EB%A8%B9%EA%B8%B0-%EC%B1%8C%EB%A6%B0%EC%A7%80%F0%9F%92%A1-MZ%EC%84%B8%EB%8C%80-%EC%A0%88%EC%95%BD-%EC%9E%AC%ED%85%8C%ED%81%AC-%EC%8B%A4%EC%B2%9C%EB%B2%95-2025%EB%85%84-%EA%BF%80%ED%8C%81-%EC%B4%9D%EC%A0%95%EB%A6%AC` |
| 조경/마당/수목 계절 관리 | 실내 식물과 다르게 날씨 이벤트, 사전 대비, 피해 후 점검이 있다. | 계절/기상 이벤트 체크리스트 | 폭설 대비 조경 수목 관리 체크리스트 Naver Blog: `https://blog.naver.com/PostView.naver?blogId=savetree_world&logNo=223675556224` |
| 단체행사/MT 준비 | 개인 할 일과 공동 준비물, 회비, 역할 분담을 나누는 UX를 검증할 수 있다. | 역할별 체크리스트 + 일정 메모 | 기존 후보 `대학 MT 준비물/일정표` 재검토 |
| 유럽 장기여행 체크리스트 | 여행이긴 하지만 PDF/엑셀 공유와 사본/전압/국가별 준비물이 뚜렷하다. 치앙마이와 겹치면 backup으로만 둔다. | 준비물 시트 + D-7 확인 캘린더 | 유럽여행 체크리스트 PDF/엑셀 Naver Blog: `https://blog.naver.com/PostView.naver?blogId=sudali01&logNo=223349224177` |

### 다음 배치 선정 룰 수정

다음 10개 후보 배치는 아래 비율로 강제한다.

| 슬롯 | 개수 | 예시 |
|---|---:|---|
| 학생/학부모 생활 전환 | 2 | 기숙사, 초등 입학 |
| 아이 활동/교육 자료 | 2 | 도안 만들기, 영어 단어 예습 |
| 디지털 설정/계정/도구 | 2 | AnyDesk, 검색콘솔 |
| 식재료/집밥/생활비 | 1 | 냉장고 파먹기 |
| 야외/계절/주거 외부 관리 | 1 | 조경 수목 폭설 대비 |
| 단체행사/역할분담 | 1 | MT 준비 |
| 기존 강점축 backup | 1 | 유럽 장기여행처럼 기존 축이지만 source interaction이 강한 것 |

중요: 다음 public route 승격 후보는 `컴활 3일`, `가전 추가`, `여행 준비물 추가`부터 올리지 않는다. 먼저 위 새 축에서 3개 이상을 실제 UI 후보로 만든 뒤, FlowMe가 반복 일정형 서비스가 아니라 "외부 콘텐츠 실행 도구"로 보이는지 다시 판단한다.
