# FlowMe 웹 소스 스카우트 카테고리 리뷰 (2026-07-04)

이 문서는 앱 seed나 Flow 콘텐츠가 아니라, 웹에서 FlowMe로 가져올 수 있는 원문 후보의 1차 스카우트 결과다. 후보 100개를 카테고리별로 모으고, source shape, 수요 흔적, FlowMe 적합도를 판정했다.

## 전체 요약

- 바로 seed 후보: 32개
- 단순화 후 사용: 34개
- 원문/파일 import 필요: 16개
- 보조 후보: 17개
- 제외: 1개

## 판정 기준

- seed_candidate: 일정, 회차, 표, 파일, 영상 목록처럼 Step/Item 원천이 명확한 후보.
- usable_after_simplification: 원문 구조는 있으나 광고, 경험담, 설명 문장을 걷어내야 하는 후보.
- source_import_required: 첨부파일, PDF, 영상 설명, 로그인/계산형 페이지 등 원문 row를 추가로 열어야 하는 후보.
- backup: 방향성 참고 또는 중복 보강용 후보.
- reject: Flow 콘텐츠 원문으로 쓰기에는 부적합한 후보.

## 카테고리별 리뷰

## 이사/주거

- 후보 수: 10
- 상태 분포: 바로 seed 후보 5, 단순화 후 사용 2, 원문/파일 import 필요 0, 보조 후보 3, 제외 0
- 판정 메모: D-day, 입주 전후, 방 보기, 행정 처리처럼 목적지가 뚜렷하다. 이미 앱 canary로 쓰기 좋은 후보가 많다.

상위 후보:
- SCOUT-001 아정당 이사 준비 체크리스트: 바로 seed 후보 / D-30/D-10/D-day checklist + XLS/PDF/Notion attachment
- SCOUT-002 오늘의집 이사 준비 체크리스트: 바로 seed 후보 / D-30/D-7/checklist sections
- SCOUT-003 생활법령정보 이사 체크리스트: 바로 seed 후보 / official checklist by timing

## 결혼/구매

- 후보 수: 10
- 상태 분포: 바로 seed 후보 4, 단순화 후 사용 4, 원문/파일 import 필요 1, 보조 후보 1, 제외 0
- 판정 메모: 장기 타임라인과 구매 체크리스트가 모두 존재한다. 결혼은 국내 관습 보강이 필요하고, 차량/혼수는 구매 결정 Flow로 분리하는 편이 좋다.

상위 후보:
- SCOUT-011 Planning.wedding 12개월 웨딩 타임라인: 바로 seed 후보 / 12-month checklist timeline
- SCOUT-012 Planning.wedding 출력용 결혼 체크리스트: 바로 seed 후보 / 12-month printable checklist
- SCOUT-017 겟차 신차 구매 절차 가이드: 바로 seed 후보 / new car purchase procedure

## 육아/교육

- 후보 수: 10
- 상태 분포: 바로 seed 후보 2, 단순화 후 사용 3, 원문/파일 import 필요 5, 보조 후보 0, 제외 0
- 판정 메모: 공식 일정형 소스는 강하고, 블로그/첨부파일형 이유식과 펀맘은 source import가 핵심 병목이다. 파일 row 없이 Item을 만들면 다시 기획서가 된다.

상위 후보:
- SCOUT-021 질병관리청 표준 예방접종 일정표: 바로 seed 후보 / child vaccination schedule + PDF
- SCOUT-023 국립재활원 영유아 건강검진: 바로 seed 후보 / infant checkup rounds by age
- SCOUT-025 초기 토핑 이유식 식단표 엑셀 템플릿: 원문/파일 import 필요 / 3-4 day allergy test schedule + XLS

## 공부/시험

- 후보 수: 10
- 상태 분포: 바로 seed 후보 1, 단순화 후 사용 4, 원문/파일 import 필요 2, 보조 후보 3, 제외 0
- 판정 메모: 시험일, 2주/4주, 회차, 영상 링크가 있으면 강하다. 후기형 글은 루틴 row가 부족하면 backup으로 둔다.

상위 후보:
- SCOUT-031 오픽만수르 모의고사 공부 방법: 바로 seed 후보 / method sections + XLS/PDF 2-week/1-month plan
- SCOUT-033 소로롤 오픽 2주 독학 계획: 단순화 후 사용 / 2-week study plan summary
- SCOUT-038 한능검 1개월 100점 공부법: 단순화 후 사용 / date-based exam prep narrative

## 정부/행정

- 후보 수: 10
- 상태 분포: 바로 seed 후보 5, 단순화 후 사용 4, 원문/파일 import 필요 1, 보조 후보 0, 제외 0
- 판정 메모: 공식 페이지는 신뢰도와 destination이 강하지만, 인터랙티브/점검/로그인 페이지가 많아 보조 가이드와 교차 확인이 필요하다.

상위 후보:
- SCOUT-044 안전운전 통합민원 면허 갱신/적성검사: 바로 seed 후보 / license renewal requirements by type
- SCOUT-045 국세청 연말정산 체크리스트: 바로 seed 후보 / deduction checklist categories
- SCOUT-047 국세청 개인 사업자등록 신청서 작성방법: 바로 seed 후보 / required documents + application fields

## 여행/캠핑

- 후보 수: 10
- 상태 분포: 바로 seed 후보 3, 단순화 후 사용 5, 원문/파일 import 필요 2, 보조 후보 0, 제외 0
- 판정 메모: packing checklist는 많지만 중복이 심하다. 공식 출국 절차와 여행 준비물 Flow를 분리해야 과밀해지지 않는다.

상위 후보:
- SCOUT-055 Visit Japan Web 공식: 바로 seed 후보 / entry/customs web service
- SCOUT-054 생활법령정보 해외여행 출국절차: 바로 seed 후보 / departure procedure steps
- SCOUT-051 KKday 해외여행 준비물 체크리스트: 바로 seed 후보 / packing checklist categories

## 운동/건강

- 후보 수: 10
- 상태 분포: 바로 seed 후보 3, 단순화 후 사용 3, 원문/파일 import 필요 2, 보조 후보 2, 제외 0
- 판정 메모: 영상 1개=루틴 1개가 단순하고 앱 구조에 잘 맞는다. 동작을 지어내지 않고 제목/URL/반복 요일 중심으로 가져가야 한다.

상위 후보:
- SCOUT-065 5km 달리기 8주 프로그램: 바로 seed 후보 / 8-week running schedule
- SCOUT-062 빅씨스 10분 홈트 루틴 플레이리스트: 바로 seed 후보 / playlist of 10-minute routines
- SCOUT-063 빅씨스 초보 홈트 5일 챌린지: 바로 seed 후보 / single 5-day beginner routine video

## 식단/요리

- 후보 수: 10
- 상태 분포: 바로 seed 후보 2, 단순화 후 사용 2, 원문/파일 import 필요 2, 보조 후보 3, 제외 1
- 판정 메모: 요일별 식단과 장보기 리스트가 있으면 좋지만, 레시피 본문은 저작권/분량 문제가 커서 source link 중심으로 다뤄야 한다.

상위 후보:
- SCOUT-071 일주일 다이어트 식단과 장보기 리스트: 바로 seed 후보 / weekly meals + grocery list
- SCOUT-075 오늘의집 일주일 도시락 식단표: 바로 seed 후보 / weekday lunchbox menu rows
- SCOUT-076 2만원 일주일 반찬 13가지: 원문/파일 import 필요 / batch cooking recipes

## 반려/식물/관리

- 후보 수: 10
- 상태 분포: 바로 seed 후보 5, 단순화 후 사용 4, 원문/파일 import 필요 0, 보조 후보 1, 제외 0
- 판정 메모: 접종/필터청소/물주기처럼 반복 주기가 있는 후보가 좋다. 건강 판단은 메모/detail에만 두고 별도 입력 필드를 늘리지 않는다.

상위 후보:
- SCOUT-086 삼성 에어컨 필터 청소 방법: 바로 seed 후보 / filter cleaning cycle + steps
- SCOUT-082 로얄캐닌 반려견 백신 접종 일정: 바로 seed 후보 / age-based dog vaccination schedule
- SCOUT-081 핏펫 강아지 예방접종 일정: 바로 seed 후보 / puppy vaccination schedule

## 커리어/사업

- 후보 수: 10
- 상태 분포: 바로 seed 후보 2, 단순화 후 사용 3, 원문/파일 import 필요 1, 보조 후보 4, 제외 0
- 판정 메모: 면접 D-1, 이직 준비, 사업자/통신판매업처럼 목적지가 분명한 업무형 Flow가 가능하다. 자기성찰 문항은 memo로 제한해야 한다.

상위 후보:
- SCOUT-091 캔디데이트 면접 전날 체크리스트: 바로 seed 후보 / 7 pre-interview checklist sections
- SCOUT-099 헬프미 개인사업자등록 절차 총정리: 바로 seed 후보 / personal business registration documents + procedure
- SCOUT-095 카페24 사업자 등록 안내: 단순화 후 사용 / business registration documents

## 다음 앱 canary 후보 5~8개

1. SCOUT-001 아정당 이사 준비 체크리스트
   - URL: https://www.ajd.co.kr/contents/basic-tip/detail/%EC%9D%B4%EC%82%AC_%EC%A4%80%EB%B9%84_%EC%B2%B4%ED%81%AC%EB%A6%AC%EC%8A%A4%ED%8A%B8_2024_%EC%99%84%EB%B2%BD%EC%A0%95%EB%A6%AC%21-23363
   - 이유: D-day 구조와 첨부파일이 있어 기존 이사 Flow와 바로 비교 가능
2. SCOUT-021 질병관리청 표준 예방접종 일정표
   - URL: https://nip.kdca.go.kr/irhp/infm/goVcntInfo.do?menuCd=115&menuLv=1
   - 이유: 공식 월령 일정표라 setupField 기반 캘린더/체크리스트 검증에 좋음
3. SCOUT-031 오픽만수르 모의고사 공부 방법
   - URL: https://mansour.tistory.com/entry/%EC%98%A4%ED%94%BD-%EB%AA%A8%EC%9D%98%EA%B3%A0%EC%82%AC-%EA%B3%B5%EB%B6%80-%EB%B0%A9%EB%B2%95
   - 이유: 기존 9개 중 전환성이 높고 첨부 계획표가 있어 sourceTrace 검증에 좋음
4. SCOUT-044 안전운전 통합민원 면허 갱신/적성검사
   - URL: https://www.safedriving.or.kr/guide/larGuide011.do?menuCode=MN-PO-1211
   - 이유: 공식 준비물/수수료/면허종류 분기가 명확해 행정 Flow canary로 적합
5. SCOUT-065 5km 달리기 8주 프로그램
   - URL: https://holmez.tistory.com/entry/5km-%EB%8B%AC%EB%A6%AC%EA%B8%B0-8%EC%A3%BC-%ED%94%84%EB%A1%9C%EA%B7%B8%EB%9E%A8
   - 이유: 8주 러닝 프로그램의 주차/요일 row가 뚜렷해 루틴형 Flow 검증에 좋음
6. SCOUT-071 일주일 다이어트 식단과 장보기 리스트
   - URL: https://shala8383.tistory.com/entry/%F0%9F%A5%97-%EB%8B%A4%EC%9D%B4%EC%96%B4%ED%8A%B8-%EC%8B%9D%EB%8B%A8-%EC%9D%BC%EA%B8%B0-%E2%80%93-%EC%9D%BC%EC%A3%BC%EC%9D%BC-%EC%8B%9D%EB%8B%A8-%EC%9E%A5%EB%B3%B4%EA%B8%B0-%EB%A6%AC%EC%8A%A4%ED%8A%B8-%EA%B3%B5%EA%B0%9C
   - 이유: 주간 식단과 장보기 리스트 구조가 있어 식단 카테고리 확장 가능성을 확인할 수 있음
7. SCOUT-086 삼성 에어컨 필터 청소 방법
   - URL: https://www.samsungsvc.co.kr/solution/121273
   - 이유: 제조사 공식 반복 관리 주기가 있어 가전 관리 루틴 canary로 적합
8. SCOUT-091 캔디데이트 면접 전날 체크리스트
   - URL: https://www.candidate.im/contents/blog4
   - 이유: 면접 하루 전이라는 선명한 목적지와 체크 항목이 있어 커리어 카테고리 검증에 좋음

## 운영 메모

- 이번 산출물은 콘텐츠 확장 탐색물이다. 앱 구현, seed 생성, 실제 Flow item 작성은 하지 않았다.
- seed_candidate는 "바로 앱에 넣는다"가 아니라 "다음 세션에서 원문 row를 확정하면 seed로 갈 수 있다"는 의미다.
- 기존 9개에서 문제가 되었던 과잉 Item, generic memoHint, 원문에 없는 기록 필드는 이번 스카우트 기준에서 제외했다.
