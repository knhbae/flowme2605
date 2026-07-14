# FlowMe 콘텐츠 포트폴리오 확장 Round 2 검토

- 작성일: 2026-07-11
- 범위: 원문 탐색·Content Bundle 준비·앱 handoff 전 단계
- 앱 코드/seed 변경: 없음
- 실제 URL 열기 시도: 48개, 식별 후보: 46개
- 승격: 10개 Bundle / 14 Flow / 53 Step / 133 Item / 167 source row

## 결론

첫 canary는 K-MOOC 제자백가 15주 학습, 가족 생일 행사 준비, 30일 사진 찍기, 3일 반찬 만들기, 고용24 취업지원 시작 5개다. 가족 행사·공개 강좌·취미·meal prep·career를 한 번에 확인한다.

second wave는 개인 사업자등록 준비, 법인 통신판매업 신고, 여권 재발급 준비, 30일 콘텐츠 발행, 자동차 정기검사 일정 5개다. 행정 분기, 권리, 날짜 창 adapter를 먼저 점검한다.

## 기존 커버리지와 새로 채운 영역

| 생활 영역 | 기존 | Round 2 | 합계 |
|---|---:|---:|---:|
| 집·생활 | 2 | 0 | 2 |
| 가족·육아 | 3 | 1 | 4 |
| 공부·독서 | 2 | 1 | 3 |
| 돈·행정·구매 | 2 | 4 | 6 |
| 건강·운동 | 2 | 0 | 2 |
| 여행·외출 | 2 | 0 | 2 |
| 식사·장보기 | 2 | 1 | 3 |
| 일·커리어 | 1 | 2 | 3 |
| 취미·반려 | 1 | 1 | 2 |

새로 채운 사용자 순간:
- 아이 생일과 돌잔치의 source-owned 행사 타임라인
- 공개 강좌의 15주 source table 학습
- 사진과 제작자 콘텐츠의 30일 resource queue
- 장보기에서 3일 조리로 이어지는 meal prep
- 구직 등록에서 지원 결과까지의 공식 career procedure
- 개인 사업 시작과 법인 온라인 판매 행정
- 차량 정기검사라는 단일 의무 lifecycle

## 1차 내부 적용

### K-MOOC 제자백가 15주 학습

- 판정: 1차 내부 적용
- 구성: 1 Flow / 15 Step / 15 Item / 15 source row
- 목적지: calendar
- 추천: 완전한 15주 source table을 대표 학습 canary로 먼저 적용한다.
- 점수: demandScore 76 · conversionFitScore 98 · portfolioCoverageGain 96 · creatorCommunityFit 64 · preAppReadiness 96
- 원문:
  - [K-MOOC 제자백가의 사상 강좌 운영 계획](https://www.kmooc.kr/view/course/detail/6661)
- 묶음·삭제:
  - 각 주차의 두 강의와 퀴즈를 세 Item으로 쪼개지 않고 주차 완료 Item 하나로 묶음
  - 총점 80% 수료 기준은 체크 Item이 아니라 강좌 메모로 유지
  - 수강 가능 기간과 시험 응답 기간은 고정 생성하지 않고 실제 강좌 화면 우선

### 가족 생일 행사 준비

- 판정: 1차 내부 적용
- 구성: 2 Flow / 8 Step / 11 Item / 14 source row
- 목적지: calendar, hybrid
- 추천: 매년 반복 생일과 일회성 돌잔치를 source-owned child Flow로 나눠 첫 canary에 포함한다.
- 점수: demandScore 81 · conversionFitScore 94 · portfolioCoverageGain 100 · creatorCommunityFit 90 · preAppReadiness 93
- 원문:
  - [아이 생일파티 준비 체크리스트](https://baby.tali.kr/kids-birthday-party-planning-guide)
  - [돌잔치 준비 체크리스트](https://hophop1.tistory.com/26)
- 묶음·삭제:
  - 장소·연령별 활동표는 선택 정보라 별도 Item이 아니라 해당 Step 메모로 이동
  - 돌잔치 메이크업·돌상·의상·답례품에 원문에 없는 D-day를 만들지 않음
  - 견적·업체·계약금·보류 사유는 공통 메모에 기록

### 30일 사진 찍기

- 판정: 1차 내부 적용
- 구성: 1 Flow / 5 Step / 30 Item / 30 source row
- 목적지: calendar
- 추천: 30개 prompt가 완전하고 remix·공유성이 높아 취미 canary로 적용한다.
- 점수: demandScore 79 · conversionFitScore 99 · portfolioCoverageGain 100 · creatorCommunityFit 96 · preAppReadiness 94
- 원문:
  - [Canon 30-Day Photo Challenge](https://www.usa.canon.com/learning/training-articles/training-articles-list/30-day-photo-challenge)
- 묶음·삭제:
  - 촬영 장비·장소·감상·파일 링크를 별도 Field로 만들지 않고 메모로 통합
  - 각 prompt에 확인하기·기록하기 Item을 덧붙이지 않음
  - 원문 해설 문단은 복제하지 않고 영어 prompt 제목만 sourceTitle로 보존

### 3일 반찬 만들기

- 판정: 1차 내부 적용
- 구성: 2 Flow / 4 Step / 4 Item / 14 source row
- 목적지: hybrid
- 추천: 장보기 1회와 세 번의 조리 세션으로 묶어 식사·장보기 canary에 적용한다.
- 점수: demandScore 83 · conversionFitScore 96 · portfolioCoverageGain 94 · creatorCommunityFit 88 · preAppReadiness 92
- 원문:
  - [욜로리아 첫째 날 장보기와 반찬 만들기](https://164regina.tistory.com/918)
  - [욜로리아 둘째·셋째 날 반찬 만들기](https://164regina.tistory.com/entry/2%EB%A7%8C%EC%9B%90%EC%9C%BC%EB%A1%9C-%EC%9E%A5%EB%B3%B4%EA%B8%B0-%EC%9D%BC%EC%A3%BC%EC%9D%BC-%EB%B0%98%EC%B0%AC-13%EA%B0%80%EC%A7%80-%EB%A7%8C%EB%93%A4%EA%B8%B0-%EB%91%90%EB%B2%88%EC%A7%B8-%EC%84%B8%EB%B2%88%EC%A7%B8%EB%82%A0)
- 묶음·삭제:
  - 장보기 11종을 11개 Item이 아니라 한 장보기 Item의 detail로 묶음
  - 요리 13개를 날짜별 조리 세션 3개로 묶음
  - 2021년 21,270원 가격은 사용자 Item에서 제외
  - 재료 수량·대체·보관 상태는 메모에 기록

### 고용24 취업지원 시작

- 판정: 1차 내부 적용
- 구성: 2 Flow / 4 Step / 19 Item / 19 source row
- 목적지: checklist
- 추천: 일반 구직과 40세 이상 전직지원을 분리한 공식 career Map으로 먼저 적용한다.
- 점수: demandScore 80 · conversionFitScore 93 · portfolioCoverageGain 100 · creatorCommunityFit 58 · preAppReadiness 94
- 원문:
  - [고용24 구직자 취업지원 서비스](https://www.work24.go.kr/cm/c/f/1100/selecSystInfo.do?systClId=SC00000205&systId=SI00000447)
  - [고용24 중장년 전직지원 서비스](https://www.work24.go.kr/wk/u/b/1000/seniorChgJobSptSvc.do)
- 묶음·삭제:
  - 희망직종·임금·경력 등 이력서 필드를 FlowMe 별도 입력으로 복제하지 않고 고용24에서 작성
  - 국민취업지원제도 자격·수당은 별도 제도라 이 Map에서 제외
  - 상담 일정·담당자·지원 회사·결과는 메모에 기록

## 2차 적용

### 개인 사업자등록 준비

- 판정: 2차 적용
- 구성: 1 Flow / 2 Step / 5 Item / 12 source row
- 추천: 공식 준비서류와 신청서 작성 Flow는 완성했다. 과세유형·인허가 분기 QA 뒤 2차 적용한다.
- 점수: demandScore 94 · conversionFitScore 90 · portfolioCoverageGain 88 · creatorCommunityFit 55 · preAppReadiness 87
- 원문:
  - [국세청 개인 사업자등록 신청서 작성방법](https://www.nts.go.kr/taxpayer_advocate/na/ntt/selectNttInfo.do?mi=&nttSn=1302746)
- 감점·보류 요소:
  - 서류 6개를 6개 Item으로 늘리지 않고 공통·사업장·인허가 세 묶음으로 합침
  - 업태·업종 예시 전체는 Item이 아니라 신청서 메모로 유지
  - 과세유형 기준과 매출 계산은 선택을 대신하지 않고 공식 원문 확인으로 남김

### 법인 통신판매업 신고

- 판정: 2차 적용
- 구성: 1 Flow / 4 Step / 10 Item / 15 source row
- 추천: 법인 대상임을 제목과 메모에 고정하고 정부24 최신성 확인 후 2차 적용한다.
- 점수: demandScore 78 · conversionFitScore 91 · portfolioCoverageGain 84 · creatorCommunityFit 72 · preAppReadiness 85
- 원문:
  - [ZUZU 통신판매업 신고 가이드](https://zuzu.network/resource/guide/mail-order-sales-registration/)
- 감점·보류 요소:
  - 등록면허세와 면제 기준은 별도 판단 Field가 아니라 확인 Item과 메모로 유지
  - 사업자등록증·도메인·에스크로 확인증은 하나의 준비 Item으로 묶음
  - 공동대표 입력 예외와 2~3일 처리 안내는 상세 메모로 이동

### 여권 재발급 준비

- 판정: 2차 적용
- 구성: 2 Flow / 4 Step / 7 Item / 12 source row
- 추천: 성인·미성년자 분리를 유지하고 대리신청 세부 분기 QA 후 2차 적용한다.
- 점수: demandScore 82 · conversionFitScore 90 · portfolioCoverageGain 76 · creatorCommunityFit 48 · preAppReadiness 86
- 원문:
  - [외교부 여권 유효기간 만료 재발급](https://www.passport.go.kr/home/kor/contents.do?menuPos=7)
- 감점·보류 요소:
  - 수수료표는 변동 가능성이 있어 Item으로 만들지 않고 원문 확인 정보로 유지
  - 미성년자 대리인의 모든 조합을 별도 Flow로 만들지 않음
  - 사진 규격 세부는 별도 확인 Item 대신 외교부 사진 안내 링크에서 확인

### 30일 콘텐츠 발행

- 판정: 2차 적용
- 구성: 1 Flow / 5 Step / 30 Item / 30 source row
- 추천: 완전한 CSV row set은 통과시키되 영어 상업 template 권리 검토 후 2차 적용한다.
- 점수: demandScore 84 · conversionFitScore 99 · portfolioCoverageGain 90 · creatorCommunityFit 98 · preAppReadiness 88
- 원문:
  - [SocialKit 30-Day Social Media Content Challenge](https://socialk.it/en/resources/30-day-content-challenge-calendar-template)
- 감점·보류 요소:
  - 게시 채널·URL·반응을 별도 분석 Field로 만들지 않고 메모로 유지
  - 주간 recap도 원문 Day row이므로 유지하되 추가 회고 질문은 만들지 않음
  - 고객·팔로워 spotlight는 당사자 허락 조건을 메모에 명시

### 자동차 정기검사 일정

- 판정: 2차 적용
- 구성: 1 Flow / 2 Step / 2 Item / 6 source row
- 추천: 한 개 핵심 의무를 억지로 늘리지 않는 일정 Flow로 유지하고 date_window adapter QA 후 2차 적용한다.
- 점수: demandScore 86 · conversionFitScore 82 · portfolioCoverageGain 92 · creatorCommunityFit 35 · preAppReadiness 84
- 원문:
  - [TS 자동차검사 소개](https://main.kotsa.or.kr/portal/contents.do?menuCode=01010000)
  - [TS 자동차 정기검사](https://main.kotsa.or.kr/portal/contents.do?menuCode=01010200)
  - [TS 자동차검사 절차](https://main.kotsa.or.kr/portal/contents.do?menuCode=01010104)
- 감점·보류 요소:
  - 관능·ABS·하체·전조등·배출가스·결과 설명은 검사기관 절차라 사용자 Item에서 제외
  - 차종별 유효기간을 하나의 repeat rule로 강제하지 않음
  - 검사소 위치는 지역별 고정 Item이 아니라 공식 찾기 링크로 유지

## 주요 보류·제외

- 출산 가방: StemCyte는 55개 row가 있으나 미국 병원·보험·제대혈 판매 맥락이다. 이랜드 한국어 글의 이미지 체크리스트를 import한 뒤 재판정한다.
- 강아지 예방접종: 상업 출처마다 주령이 충돌한다. 국내 공식 수의학 row가 확보되기 전에는 승격하지 않는다.
- 오픽 2주 글: 주차 요약만 있고 일자별 row가 없어 기존 XLSX 기반 오픽 Flow보다 약하다.
- 자취방·자취 준비: 수요와 row는 있지만 기존 이사·전월세 포트폴리오와 중복이 크다.

## 남은 커버리지 공백

- 공과금·보험·구독·임대차처럼 여러 계약 만료를 한곳에서 다루는 한국어 공식/원문 row
- 한국 병원·조리원 기준의 출산 가방 이미지 또는 파일 row import
- 공식 국내 수의학 출처로 합의된 반려동물 접종 일정
- 준비-제작-정리까지 닫히는 사진 외 만들기·악기 취미 프로젝트
- 실제 채용공고를 기준으로 한 지원 일정·과제·면접·입사 준비 source row

## 검토 방법

전체 Flow / Step / Item, sourceTrace, 13개 점수 코멘트는 [모바일 검토판](./2026-07-11-content-portfolio-expansion-round2-board-ko.html)에서 확인한다. 개발 적용 순서는 [handoff](./2026-07-11-content-portfolio-expansion-round2-handoff-ko.md)를 따른다.
