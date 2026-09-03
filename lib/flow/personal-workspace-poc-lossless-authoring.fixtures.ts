export type PersonalWorkspacePocLosslessAuthoringCorpusCase = Readonly<{
  caseId: string;
  provenance: string;
  sourceShape: string;
  rawText: string;
  expectedOriginalItemCount: number;
  upstreamBoundary: string;
  expectedPreservation: 'byte-exact';
  expectedMode: 'raw-preserved' | 'safe-table';
  expectedFallback: false;
}>;

/**
 * Frozen v5 QA catalog: one basic syntax example plus the 30 validated
 * grammar/real-content/condition/compatibility/exception cases. Raw sources
 * are copied from the named canonical evidence; no rows are knowledge-filled.
 */
export const PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_CORPUS = Object.freeze(
[
  {
    "caseId": "basic-authoring-syntax",
    "sourceShape": "기본 Flow Markdown · 2 Step · 3 Item",
    "rawText": "# 제목입니다.\n- 기준일: 2026-08-10\n\n## 첫 번째 단계입니다.\n- [ ] 첫 번째 항목입니다.\n  - 설명: 설명입니다.\n  - 날짜: 2026-08-03\n  - 시간: 09:00\n  - 시간대: Asia/Seoul\n  - 소요 시간: 30분\n  - 반복: 매주 월요일\n  - 반복 종료: 3회\n  - 장소: 장소입니다.\n  - 실행 조건: 사용 중인 경우에 실행합니다.\n  - [ ] 첫 번째 확인입니다.\n  - [ ] 두 번째 확인입니다.\n  - 자료: [참고 자료](https://example.com/resource)\n  - 안내: 안내입니다.\n  - 주의: 주의입니다.\n  - 출처: [원문](https://example.com/source)\n  - 완료 기준: 완료 기준입니다.\n\n## 두 번째 단계입니다.\n- [ ] 두 번째 항목입니다.\n  - 설명: 기준일보다 3일 전에 실행합니다.\n  - 상대 날짜: D-3\n- [ ] 날짜 없는 항목입니다.\n  - 설명: 날짜가 없으면 할 일에는 남고 캘린더에서는 빠집니다.",
    "expectedOriginalItemCount": 3,
    "upstreamBoundary": "기본 예시는 명시한 Flow 문법만 재생하며 속성이나 행동을 추가로 합성하지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/components/flow/text-authoring/examples.ts#SIMPLE_TEXT_AUTHORING_EXAMPLE",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "content-moving-d30",
    "sourceShape": "D-day 준비 타임라인 · 6 Step · 27 Item",
    "rawText": "# 이사 D-30 체크리스트\n- 기준일: 2026-08-31\n## D-30 · 큰 결정과 예약\n- [ ] 이사 방식과 이사업체 정하기\n  - 설명: 포장이사·반포장이사·일반이사 중 방식 선택 · 이사업체 견적 비교와 예약 · 입주청소 업체 견적 비교와 예약\n  - 상대 날짜: D-30\n- [ ] 새집 상태 확인하고 필요한 수리 잡기\n  - 설명: 새집 현장 점검 · 도배·장판·수리 필요 항목 확인과 일정 잡기\n  - 상대 날짜: D-30\n- [ ] 가져가지 않을 물건 처분 시작하기\n  - 설명: 대형폐기물·중고판매·기부 등 처분 대상 정리\n  - 상대 날짜: D-30\n- [ ] 학교 전학과 돌봄 계획 세우기\n  - 설명: 자녀 학교 전학 절차 확인 · 이사 당일 아이·어르신·반려동물 돌봄 계획\n  - 상대 날짜: D-30\n## D-10 · 주소·서비스·짐 줄이기\n- [ ] 우편·배송·전출 주소 변경하기\n  - 설명: 우편물 주소 이전 신청 · 정기배송 주소 변경 또는 중지 · 관리사무소에 퇴거 일정 알리기\n  - 상대 날짜: D-10\n- [ ] 엘리베이터·사다리차·주차 예약하기\n  - 설명: 출발지와 도착지 엘리베이터 예약 · 사다리차 사용 여부와 주차 공간 확인\n  - 상대 날짜: D-10\n- [ ] 폐기물과 남은 짐 처리하기\n  - 설명: 종량제 봉투와 폐기물 스티커 준비 · 대형폐기물 수거 신청 · 열쇠·리모컨·설명서 한곳에 모으기\n  - 상대 날짜: D-10\n- [ ] 냉장고 비우고 새집 물품 배치 정하기\n  - 설명: 냉장고 식재료 소진 시작 · 새집에 필요한 물품 주문 · 가구·가전 배치도 정리\n  - 상대 날짜: D-10\n- [ ] 인터넷·정수기 등 이전 신청하기\n  - 설명: 인터넷·TV 이전 설치 신청 · 정수기 등 렌탈 기기 이전 신청\n  - 상대 날짜: D-10\n## D-3 · 해지와 당일 준비\n- [ ] 도시가스 철거·설치 예약하기\n  - 설명: 출발지 도시가스 철거 예약 · 도착지 도시가스 설치 예약\n  - 상대 날짜: D-3\n- [ ] 기존 집 자동이체 해지하기\n  - 설명: 전기·수도·가스·관리비 자동이체 해지 또는 변경\n  - 상대 날짜: D-3\n- [ ] 세탁기 배수하고 운반 상태 만들기\n  - 설명: 세탁기 물 빼기와 운반 준비\n  - 상대 날짜: D-3\n- [ ] 임대차 권리 서류 확인하기\n  - 설명: 필요한 경우 임차권·보증금 관련 서류 확인\n  - 상대 날짜: D-3\n- [ ] 당일 바로 쓸 짐을 따로 싸기\n  - 설명: 신분증·충전기·세면도구·약·옷 등 당일 물품 분리\n  - 상대 날짜: D-3\n## D-1 · 돈·귀중품·인계 확인\n- [ ] 당일 일정·송금 한도·잔금 확인하기\n  - 설명: 이사업체와 최종 시간 확인 · 은행 이체 한도 확인 · 보증금·잔금 지급 계획 확인\n  - 상대 날짜: D-1\n- [ ] 출발지·도착지 주차 다시 확인하기\n  - 설명: 이삿짐 차량 주차 위치 최종 확인\n  - 상대 날짜: D-1\n- [ ] 귀중품과 중요서류 직접 보관하기\n  - 설명: 현금·귀중품·중요서류 별도 보관\n  - 상대 날짜: D-1\n- [ ] 열쇠·리모컨·비밀번호 인계 준비하기\n  - 설명: 출발지 열쇠·리모컨 모으기 · 도착지 공동현관·도어락 정보 확인\n  - 상대 날짜: D-1\n- [ ] 가전·가구 상태 사진 남기기\n  - 설명: 운반 전 가전·가구 외관 사진 촬영 · 어항이 있으면 이동 준비\n  - 상대 날짜: D-1\n## 이사 당일 · 출발지 마감\n- [ ] 전기·수도·가스·관리비 정산하기\n  - 설명: 출발지 전기·수도·가스 사용량 확인과 정산 · 관리비 정산\n  - 상대 날짜: D-Day\n- [ ] 장기수선충당금 환급 확인하기\n  - 설명: 세입자인 경우 장기수선충당금 반환 요청\n  - 상대 날짜: D-Day\n- [ ] 남은 물건 확인하고 열쇠 반납하기\n  - 설명: 방·수납장·계량기 주변 남은 물건 확인 · 집주인 또는 관리실에 열쇠 반납\n  - 상대 날짜: D-Day\n## 이사 당일 · 도착지 시작\n- [ ] 분실·파손 확인하고 이사업체 정산하기\n  - 설명: 짐 분실·파손 여부 확인 · 이사업체 잔금 정산\n  - 상대 날짜: D-Day\n- [ ] 인터넷·TV와 도어락 확인하기\n  - 설명: 인터넷·TV 연결 확인 · 도어락 비밀번호 변경\n  - 상대 날짜: D-Day\n- [ ] 잔금·관리비·열쇠 인수 마치기\n  - 설명: 주택 잔금 또는 보증금 정산 · 관리비 확인 · 열쇠·리모컨 인수\n  - 상대 날짜: D-Day\n- [ ] 전기·수도 명의와 가스 개통하기\n  - 설명: 전기·수도 명의 변경 · 도착지 도시가스 개통\n  - 상대 날짜: D-Day\n- [ ] 전입신고와 확정일자 처리하기\n  - 설명: 전입신고 · 필요한 경우 확정일자 받기\n  - 상대 날짜: D-Day",
    "expectedOriginalItemCount": 27,
    "upstreamBoundary": "기준일이 없으면 상대 날짜를 실제 날짜로 추정하지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#content-moving-d30",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "content-vehicle-inspection",
    "sourceShape": "공식 점검 체크리스트 · 3 Step · 10 Item",
    "rawText": "# 자동차검사 D-14 준비 Flow\n- 기준일: 2026-08-15\n## D-14 검사 기간 확인\n- [ ] 자동차검사 기간과 예약 가능일 확인하기\n  - 상대 날짜: D-14\n- [ ] 차량번호와 예약 정보 확인하기\n  - 상대 날짜: D-14\n- [ ] 가까운 검사소와 수수료 확인하기\n  - 상대 날짜: D-10\n\n## D-3 차량 상태 점검\n- [ ] 번호판과 차대번호 식별 상태 확인하기\n  - 상대 날짜: D-3\n- [ ] 등화장치와 경음기 작동 확인하기\n  - 상대 날짜: D-3\n- [ ] 타이어 마모와 공기압 확인하기\n  - 상대 날짜: D-3\n- [ ] 오일 누유와 경고등 여부 기록하기\n  - 상대 날짜: D-3\n\n## D-Day 검사 당일\n- [ ] 예약 시간보다 여유 있게 검사소 도착하기\n  - 상대 날짜: D-Day\n- [ ] 접수와 수수료 결제 진행하기\n  - 상대 날짜: D-Day\n- [ ] 검사 결과와 재검사 필요 항목 기록하기\n  - 상대 날짜: D-Day",
    "expectedOriginalItemCount": 10,
    "upstreamBoundary": "점검 절차나 안전 판단을 새 Item으로 발명하지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#content-vehicle-inspection",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "content-allblanc-7day",
    "sourceShape": "영상 시퀀스 · 7 Step · 7 Item",
    "rawText": "# Allblanc 7일 복근 챌린지\n- 기준일: 2026-08-03\n## 영상 따라 하기\n- [ ] 코어 + 복근 한방에! 20분 복근 운동\n  - 설명: 영상 길이 21:25 · 확인 조회수 150,000\n  - 상대 날짜: D+0\n  - 자료: [코어 + 복근 한방에! 20분 복근 운동](https://www.youtube.com/watch?v=XwUKn-52ykk)\n## 영상 따라 하기\n- [ ] 허리 통증 없이 20분 복근 운동\n  - 설명: 영상 길이 20:41 · 확인 조회수 78,000\n  - 상대 날짜: D+1\n  - 자료: [허리 통증 없이 20분 복근 운동](https://www.youtube.com/watch?v=KzH8TcfyKFA)\n## 영상 따라 하기\n- [ ] 아랫 뱃살 집중 타격 20분 운동\n  - 설명: 영상 길이 21:01 · 확인 조회수 73,000\n  - 상대 날짜: D+2\n  - 자료: [아랫 뱃살 집중 타격 20분 운동](https://www.youtube.com/watch?v=Ft5gNO-2Je4)\n## 영상 따라 하기\n- [ ] 서서하는 20분 복근 운동\n  - 설명: 영상 길이 20:49 · 확인 조회수 88,000\n  - 상대 날짜: D+3\n  - 자료: [서서하는 20분 복근 운동](https://www.youtube.com/watch?v=8RzHWcq6eq0)\n## 영상 따라 하기\n- [ ] 집에서 옆구리살 빼기 20분 운동\n  - 설명: 영상 길이 20:40 · 확인 조회수 45,000\n  - 상대 날짜: D+4\n  - 자료: [집에서 옆구리살 빼기 20분 운동](https://www.youtube.com/watch?v=peQuipmDIuc)\n## 영상 따라 하기\n- [ ] 허리 군살 제거 20분 복근 홈트\n  - 설명: 영상 길이 20:36 · 확인 조회수 42,000\n  - 상대 날짜: D+5\n  - 자료: [허리 군살 제거 20분 복근 홈트](https://www.youtube.com/watch?v=K3yO9oHgaIs)\n## 영상 따라 하기\n- [ ] 헤어질 결심: 복부지방 20분 운동\n  - 설명: 영상 길이 20:49 · 확인 조회수 63,000\n  - 상대 날짜: D+6\n  - 자료: [헤어질 결심: 복부지방 20분 운동](https://www.youtube.com/watch?v=W2fS4TqeWCc)",
    "expectedOriginalItemCount": 7,
    "upstreamBoundary": "영상에 없는 동작·세트·반복 횟수는 만들지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#content-allblanc-7day",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "content-kmooc-14",
    "sourceShape": "14개 주차 Item · 주차·주차 활동 속성",
    "rawText": "# Introduction to Data Analysis\n## 14주 강의계획\n- [ ] 데이터 리터러시\n  - 주차: 1주차\n  - 주차 활동: 퀴즈\n- [ ] 생성형 AI 활용 데이터 분석\n  - 주차: 2주차\n  - 주차 활동: 과제\n- [ ] 데이터 분석\n  - 주차: 3주차\n  - 주차 활동: 토론\n- [ ] 데이터 수집\n  - 주차: 4주차\n  - 주차 활동: 퀴즈\n- [ ] 파일 다루기\n  - 주차: 5주차\n  - 주차 활동: 퀴즈\n- [ ] 탐색적 데이터 분석\n  - 주차: 6주차\n  - 주차 활동: 토론\n- [ ] 수치 데이터 분석을 위한 NumPy\n  - 주차: 7주차\n  - 주차 활동: 과제\n- [ ] Pandas 활용 데이터 분석\n  - 주차: 8주차\n  - 주차 활동: 퀴즈\n- [ ] 데이터 시각화\n  - 주차: 9주차\n  - 주차 활동: 토론\n- [ ] 통계분석\n  - 주차: 10주차\n  - 주차 활동: 토론\n- [ ] 데이터 기반 문제 해결 전략\n  - 주차: 11주차\n  - 주차 활동: 토론\n- [ ] 텍스트 데이터 분석\n  - 주차: 12주차\n  - 주차 활동: 토론\n- [ ] 감성 분석\n  - 주차: 13주차\n  - 주차 활동: 토론\n- [ ] 데이터 분석 보고서 작성법\n  - 주차: 14주차\n  - 주차 활동: 없음",
    "expectedOriginalItemCount": 14,
    "upstreamBoundary": "주차 번호만 보고 실제 날짜를 추정하지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#content-kmooc-14",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "content-librivox-38",
    "sourceShape": "38개 장 Item · 순서·재생시간 속성",
    "rawText": "# Anne of Green Gables, Version 5\n## 장 목록\n- [ ] Mrs. Rachel Lynde Is Surprised\n  - 순서: 1\n  - 재생시간: 00:14:35\n- [ ] Matthew Cuthbert Is Surprised\n  - 순서: 2\n  - 재생시간: 00:26:09\n- [ ] Marilla Cuthbert Is Surprised\n  - 순서: 3\n  - 재생시간: 00:12:47\n- [ ] Morning at Green Gables\n  - 순서: 4\n  - 재생시간: 00:12:03\n- [ ] Anne's History\n  - 순서: 5\n  - 재생시간: 00:11:23\n- [ ] Marilla Makes Up Her Mind\n  - 순서: 6\n  - 재생시간: 00:10:18\n- [ ] Anne Says Her Prayers\n  - 순서: 7\n  - 재생시간: 00:06:54\n- [ ] Anne's Bringing-Up Is Begun\n  - 순서: 8\n  - 재생시간: 00:23:23\n- [ ] Mrs. Rachel Lynde Is Properly Horrified\n  - 순서: 9\n  - 재생시간: 00:13:01\n- [ ] Anne's Apology\n  - 순서: 10\n  - 재생시간: 00:19:34\n- [ ] Anne's Impressions of Sunday School\n  - 순서: 11\n  - 재생시간: 00:09:16\n- [ ] A Solemn Vow and Promise\n  - 순서: 12\n  - 재생시간: 00:11:08\n- [ ] The Delights of Anticipation\n  - 순서: 13\n  - 재생시간: 00:08:57\n- [ ] Anne's Confession\n  - 순서: 14\n  - 재생시간: 00:16:07\n- [ ] A Tempest in the School Teapot\n  - 순서: 15\n  - 재생시간: 00:26:34\n- [ ] Diana Is Invited to Tea with Tragic Results\n  - 순서: 16\n  - 재생시간: 00:21:11\n- [ ] A New Interest in Life\n  - 순서: 17\n  - 재생시간: 00:10:39\n- [ ] Anne to the Rescue\n  - 순서: 18\n  - 재생시간: 00:16:59\n- [ ] A Concert a Catastrophe and a Confession\n  - 순서: 19\n  - 재생시간: 00:19:47\n- [ ] A Good Imagination Gone Wrong\n  - 순서: 20\n  - 재생시간: 00:11:50\n- [ ] A New Departure in Flavorings\n  - 순서: 21\n  - 재생시간: 00:18:14\n- [ ] Anne Is Invited Out to Tea\n  - 순서: 22\n  - 재생시간: 00:07:55\n- [ ] Anne Comes to Grief in an Affair of Honor\n  - 순서: 23\n  - 재생시간: 00:11:46\n- [ ] Miss Stacy and Her Pupils Get Up a Concert\n  - 순서: 24\n  - 재생시간: 00:10:34\n- [ ] Matthew Insists on Puffed Sleeves\n  - 순서: 25\n  - 재생시간: 00:23:29\n- [ ] The Story Club Is Formed\n  - 순서: 26\n  - 재생시간: 00:18:47\n- [ ] Vanity and Vexation of Spirit\n  - 순서: 27\n  - 재생시간: 00:17:46\n- [ ] An Unfortunate Lily Maid\n  - 순서: 28\n  - 재생시간: 00:15:19\n- [ ] An Epoch in Anne's Life\n  - 순서: 29\n  - 재생시간: 00:15:38\n- [ ] The Queens Class Is Organized\n  - 순서: 30\n  - 재생시간: 00:21:04\n- [ ] Where the Brook and River Meet\n  - 순서: 31\n  - 재생시간: 00:11:24\n- [ ] The Pass List Is Out\n  - 순서: 32\n  - 재생시간: 00:16:08\n- [ ] The Hotel Concert\n  - 순서: 33\n  - 재생시간: 00:18:13\n- [ ] A Queen's Girl\n  - 순서: 34\n  - 재생시간: 00:13:36\n- [ ] The Winter at Queen's\n  - 순서: 35\n  - 재생시간: 00:10:14\n- [ ] The Glory and the Dream\n  - 순서: 36\n  - 재생시간: 00:11:29\n- [ ] The Reaper Whose Name Is Death\n  - 순서: 37\n  - 재생시간: 00:12:23\n- [ ] The Bend in the Road\n  - 순서: 38\n  - 재생시간: 00:15:02",
    "expectedOriginalItemCount": 38,
    "upstreamBoundary": "목록 순서를 임의의 일일 일정으로 바꾸지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#content-librivox-38",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "content-new-car-14",
    "sourceShape": "구매·비교 절차 · 8 Step · 14 Item",
    "rawText": "# 신차 구매 8단계\n## 1. 예산과 차량 선택\n- [ ] 총예산과 월 납입 가능액 정하기\n  - 설명: 차량 가격 외 취등록세·보험·유지비를 포함한 총예산 확인 · 현금·할부 시 월 납입 가능액 확인\n- [ ] 차종·트림·옵션 후보 좁히기\n  - 설명: 용도와 탑승 인원에 맞는 차종 선택 · 트림과 필수 옵션 후보 정리\n## 2. 구매 방식 선택\n- [ ] 현금·할부·리스·장기렌트 비교하기\n  - 설명: 소유권·월 납입액·세금·만기 조건 비교 · 본인 상황에 맞는 구매 방식 선택\n## 3. 견적과 할인 협상\n- [ ] 여러 판매처 견적 비교하기\n  - 설명: 동일 트림·옵션 기준으로 견적 받기 · 차량 가격·탁송료·등록비·서비스 품목 비교\n- [ ] 할인과 서비스 조건 확정하기\n  - 설명: 제조사 할인과 딜러 할인 확인 · 현금 지원·용품 등 서비스 조건 기록\n## 4. 계약\n- [ ] 계약서 차량 사양과 금액 확인하기\n  - 설명: 차종·트림·색상·옵션 확인 · 총액과 계약금 확인 · 출고 예정일과 취소·환불 조건 확인\n- [ ] 계약금 납부하고 서류 보관하기\n  - 설명: 계약금 납부 · 계약서와 영수증 보관\n## 5. 출고와 검수\n- [ ] 차대번호와 출고 정보 확인하기\n  - 설명: 차대번호·생산연월·출고 일정 확인\n- [ ] 외관·내장·기능 검수하기\n  - 설명: 도장·유리·타이어·휠 외관 확인 · 시트·내장재 확인 · 등화·전자장비·옵션 작동 확인\n## 6. 등록\n- [ ] 등록 서류와 비용 확인하기\n  - 설명: 신분증·계약서·보험가입증명 등 필요 서류 확인 · 취득세·공채·번호판 등 등록 비용 확인\n- [ ] 차량 등록과 번호판 발급 마치기\n  - 설명: 직접 등록 또는 등록 대행 선택 · 자동차등록증과 번호판 수령\n## 7. 보험\n- [ ] 자동차보험 조건 비교하고 가입하기\n  - 설명: 운전자 범위·보장 한도·자기부담금 비교 · 차량 인수 전에 보험 효력 시작 확인\n## 8. 출고 후 관리\n- [ ] 차량 문서와 보증 조건 보관하기\n  - 설명: 등록증·보험증권·보증서 보관 · 보증 기간과 정기점검 조건 확인\n- [ ] 초기 점검과 소모품 일정 확인하기\n  - 설명: 제조사 초기 점검 안내 확인 · 소모품 교환 주기 확인",
    "expectedOriginalItemCount": 14,
    "upstreamBoundary": "기록 맥락을 별도의 15번째 행동으로 부풀리지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#content-new-car-14",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "content-official-safety-4",
    "sourceShape": "공식 안전 안내 · 2 Step · 4 Item",
    "rawText": "# 해외여행 안전정보·영사조력 준비 Flow\n## 1. 위험 정보\n- [ ] 방문국 여행경보 단계 확인하기\n  - 설명: 경보 단계(여행유의·여행자제·여행제한·여행금지 4단계)에 따라 여행 자제·철수 권고가 달라집니다.\n  - 설명: 외교부 해외안전여행(0404.go.kr)에서 국가별 여행경보와 안전공지를 봅니다.\n  - 완료 기준: 방문국 경보 단계와 주의사항을 메모했다.\n  - 자료: [외교부 해외안전여행 여행경보](https://0404.go.kr/app/main/mainPage)\n\n## 2. 비상 대비\n- [ ] 현지 대사관·영사관 연락처와 영사콜센터(02-3210-0404, 24시간) 저장하기\n- [ ] 동행등록(해외여행자 인터넷등록제) 신청 검토하기\n  - 설명: 0404.go.kr에서 여행 정보를 등록하면 외교부·공관이 안전정보를 이메일로 제공합니다.\n- [ ] 여권 사본·비상연락·보험증서 따로 보관하기\n  - 완료 기준: 비상 정보 메모를 만들었다.\n  - 주의: 영사콜센터는 연중무휴 24시간 운영되며 해외 사건·사고 접수, 신속해외송금 지원 등을 돕습니다. 다만 영사조력 범위에는 한계가 있으니 여행자보험을 함께 준비하세요.",
    "expectedOriginalItemCount": 4,
    "upstreamBoundary": "공식 사실과 주의 문구를 체크 가능한 행동으로 오인하지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#content-official-safety-4",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "content-jeju-memo-5",
    "sourceShape": "v2 Markdown · 1 Step · 5 Item",
    "rawText": "# 제주 여행 준비\n## 할 일\n- [ ] 항공권 확인\n- [ ] 숙소 예약번호 정리\n- [ ] 렌터카 예약\n- [ ] 준비물 체크\n- [ ] 출발 전날 온라인 체크인",
    "expectedOriginalItemCount": 5,
    "upstreamBoundary": "“8월”만 보고 연도나 날짜를 만들지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#content-jeju-memo-5",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "change-relative-no-anchor",
    "sourceShape": "D-3·D-Day 2개",
    "rawText": "# 행사 준비\n## 준비\n- [ ] 장소 확인\n  - 상대 날짜: D-3\n- [ ] 최종 확인\n  - 상대 날짜: D-Day",
    "expectedOriginalItemCount": 2,
    "upstreamBoundary": "“행사일”이라는 이름만으로 날짜를 계산하지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#change-relative-no-anchor",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "change-relative-anchor-aug",
    "sourceShape": "D-3·D-Day 2개",
    "rawText": "# 행사 준비\n- 기준일: 2026-08-10\n## 준비\n- [ ] 장소 확인\n  - 상대 날짜: D-3\n- [ ] 최종 확인\n  - 상대 날짜: D-Day",
    "expectedOriginalItemCount": 2,
    "upstreamBoundary": "원문 Item과 상대 오프셋은 그대로 두고 projection 날짜만 계산한다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#change-relative-anchor-aug",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "change-relative-anchor-sep",
    "sourceShape": "D-3·D-Day 2개",
    "rawText": "# 행사 준비\n- 기준일: 2026-09-10\n## 준비\n- [ ] 장소 확인\n  - 상대 날짜: D-3\n- [ ] 최종 확인\n  - 상대 날짜: D-Day",
    "expectedOriginalItemCount": 2,
    "upstreamBoundary": "기준일 변경으로 제목·Item 수·원문을 바꾸지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#change-relative-anchor-sep",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "change-relative-to-absolute",
    "sourceShape": "절대 날짜 2개",
    "rawText": "# 행사 준비\n## 준비\n- [ ] 장소 확인\n  - 날짜: 2026-08-07\n- [ ] 최종 확인\n  - 날짜: 2026-08-10",
    "expectedOriginalItemCount": 2,
    "upstreamBoundary": "ISO 날짜가 명시된 경우에만 기준일 없이 캘린더를 만든다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#change-relative-to-absolute",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "change-mixed-dated-undated",
    "sourceShape": "날짜 1개 · 미정 1개",
    "rawText": "# 혼합 일정\n## 실행\n- [ ] 예약 확인\n  - 날짜: 2026-08-03\n- [ ] 메모 정리",
    "expectedOriginalItemCount": 2,
    "upstreamBoundary": "날짜 없는 Item을 VEVENT로 만들지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#change-mixed-dated-undated",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "change-time-timezone-duration",
    "sourceShape": "시간 지정 일정 1개",
    "rawText": "# 시간 지정\n## 실행\n- [ ] 인터뷰 진행\n  - 날짜: 2026-08-03\n  - 시간: 09:00\n  - 시간대: Asia/Seoul\n  - 소요 시간: 30분",
    "expectedOriginalItemCount": 1,
    "upstreamBoundary": "시간과 지속시간은 날짜가 있는 Item에만 실행 일정으로 적용한다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#change-time-timezone-duration",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "change-daily-repeat-until-date",
    "sourceShape": "일일 루틴 Item 1개 · 종료일 포함",
    "rawText": "# 5일 아침 스트레칭\n## 실행\n- [ ] 스트레칭 영상 따라하기\n  - 날짜: 2026-08-11\n  - 시간: 07:30\n  - 반복: 매일\n  - 반복 종료: 2026-08-15\n  - 자료: [스트레칭 영상](https://example.com/stretch)\n  - 완료 기준: 영상을 끝까지 한 번 따라했습니다.",
    "expectedOriginalItemCount": 1,
    "upstreamBoundary": "원본 Item은 하나로 유지하고 종료일을 포함한 5개 회차만 파생한다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#change-daily-repeat-until-date",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "change-same-day-timed-agenda",
    "sourceShape": "하루 일정 4개 · 종일 1개 + 시간 지정 3개",
    "rawText": "# 세미나 하루 일정\n## 실행\n- [ ] 네트워킹 메모 정리\n  - 날짜: 2026-08-20\n  - 시간: 16:30\n  - 소요 시간: 30분\n  - 장소: 라운지\n- [ ] 참가 등록\n  - 날짜: 2026-08-20\n  - 시간: 09:00\n  - 소요 시간: 30분\n  - 장소: 등록 데스크\n- [ ] 행사 안내 확인\n  - 날짜: 2026-08-20\n- [ ] 발표 세션 참여\n  - 날짜: 2026-08-20\n  - 시간: 10:00\n  - 소요 시간: 60분\n  - 장소: 세미나실",
    "expectedOriginalItemCount": 4,
    "upstreamBoundary": "Calendar만 종일·시간순으로 표시하고 Todo·Sheet·TXT와 원문은 작성 순서를 유지한다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#change-same-day-timed-agenda",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "change-repeat-condition-weekly",
    "sourceShape": "반복 문구가 있는 일정 1개",
    "rawText": "# 정기 점검\n## 실행\n- [ ] 필터 확인\n  - 날짜: 2026-08-03\n  - 반복: 매주 월요일\n  - 실행 조건: 사용 중인 경우",
    "expectedOriginalItemCount": 1,
    "upstreamBoundary": "원본 Item은 하나로 유지하고 보이는 회차만 파생하며 RRULE은 만들지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#change-repeat-condition-weekly",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "change-latest-grammar-showcase",
    "sourceShape": "유한 반복 Item 1개 · 하위 체크 2개 · 링크 2개",
    "rawText": "# 최신 문법 한눈에\n## 실행\n- [ ] 정기 자료 확인\n  - 설명: 세 번의 실행에서 같은 자료를 확인합니다.\n  - 날짜: 2026-08-03\n  - 반복: 매주 월요일\n  - 반복 종료: 3회\n  - 실행 조건: 자료가 공개된 경우\n  - [ ] 참고 자료 열기\n  - [ ] 확인 메모 남기기\n  - 자료: [참고 자료](https://example.com/resource)\n  - 출처: [원문](https://example.com/source)\n  - 담당 메모: 담당자와 확인 범위를 적습니다.",
    "expectedOriginalItemCount": 1,
    "upstreamBoundary": "추가 메모는 설명에 보존하고 날짜·반복·링크를 설명에 다시 넣지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#change-latest-grammar-showcase",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "change-repeat-condition-monthly",
    "sourceShape": "반복 문구가 있는 일정 1개",
    "rawText": "# 정기 점검\n## 실행\n- [ ] 필터 확인\n  - 날짜: 2026-08-15\n  - 반복: 매월 15일\n  - 실행 조건: 경고등이 꺼져 있는 경우",
    "expectedOriginalItemCount": 1,
    "upstreamBoundary": "조건은 필터나 자동 분기 규칙으로 해석하지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#change-repeat-condition-monthly",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "compat-legacy-aliases",
    "sourceShape": "Legacy Markdown 1 Item",
    "rawText": "# 이전 초안\n## 실행\n- [ ] 첫 번째 항목\n  자세히: 이전 설명입니다.\n  날짜: 2026-08-03\n  예상 시간: 45분\n  link: 이전 자료 | https://example.com/legacy",
    "expectedOriginalItemCount": 1,
    "upstreamBoundary": "새로 내보낼 때는 공식 표기 설명·소요 시간·자료를 사용한다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#compat-legacy-aliases",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "compat-title-h1-wins",
    "sourceShape": "H1 + 1 Item",
    "rawText": "# 원문에 적힌 제목\n## 단계\n- [ ] 제목 확인",
    "expectedOriginalItemCount": 1,
    "upstreamBoundary": "두 제목을 별도 Flow로 만들거나 조용히 섞지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#compat-title-h1-wins",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "compat-resource-links",
    "sourceShape": "링크 표현 2종 · 2 Item",
    "rawText": "# 링크 형식\n## 실행\n- [ ] 공식 형식 확인\n  자료: [참고 자료](https://example.com/resource)\n  출처: [원문](https://example.com/source)\n- [ ] 이전 형식 확인\n  자료: 이전 자료 | https://example.com/legacy",
    "expectedOriginalItemCount": 2,
    "upstreamBoundary": "링크 이름을 행동 제목으로 승격하지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#compat-resource-links",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "error-unknown-property",
    "sourceShape": "알 수 없는 속성 1개",
    "rawText": "# 속성 오류\n## 실행\n- [ ] 항목 확인\n  - 담당자: 홍길동",
    "expectedOriginalItemCount": 1,
    "upstreamBoundary": "구조 필드로 승격하거나 값을 버리지 않고 원문 설명으로만 보존한다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#error-unknown-property",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "error-ambiguous-date",
    "sourceShape": "모호한 날짜 1개",
    "rawText": "# 날짜 오류\n## 실행\n- [ ] 항공권 확인\n  - 날짜: 8월 3일",
    "expectedOriginalItemCount": 1,
    "upstreamBoundary": "예외 처리 방침은 확정됐지만 YYYY-MM-DD로 고칠 때까지 Calendar는 만들지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#error-ambiguous-date",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "error-invalid-relative-date",
    "sourceShape": "모호한 상대 날짜 1개",
    "rawText": "# 상대 날짜 오류\n## 실행\n- [ ] 장소 확인\n  - 상대 날짜: 내일",
    "expectedOriginalItemCount": 1,
    "upstreamBoundary": "예외 처리 방침은 확정됐지만 D-숫자·D-Day·D+숫자로 고칠 때까지 날짜를 계산하지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#error-invalid-relative-date",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "error-url-only",
    "sourceShape": "URL 1개",
    "rawText": "https://example.com/source",
    "expectedOriginalItemCount": 0,
    "upstreamBoundary": "예외 처리 방침은 확정됐지만 원문 본문을 직접 넣기 전에는 URL 내용을 발명하지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#error-url-only",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "error-explanatory-prose",
    "sourceShape": "설명 문장 1개",
    "rawText": "제주 여행은 여름에 사람이 많습니다.",
    "expectedOriginalItemCount": 0,
    "upstreamBoundary": "표식 없는 문장은 Item으로 추론하지 않고 TXT 원문 메모로 자동 보존하며 검토 경고를 만들지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#error-explanatory-prose",
    "expectedPreservation": "byte-exact",
    "expectedMode": "raw-preserved",
    "expectedFallback": false
  },
  {
    "caseId": "compat-tab-table",
    "sourceShape": "TSV · 3 SourceRow",
    "rawText": "순서\t주제\t활동\n1\t첫 번째\t강의 듣기\n2\t두 번째\t실습하기\n3\t세 번째\t복습하기",
    "expectedOriginalItemCount": 3,
    "upstreamBoundary": "표 행 수를 카드 수에 맞춰 합치거나 나누지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#compat-tab-table",
    "expectedPreservation": "byte-exact",
    "expectedMode": "safe-table",
    "expectedFallback": false
  },
  {
    "caseId": "compat-csv-table",
    "sourceShape": "CSV · 2 SourceRow",
    "rawText": "순서,작품,자료\n1,\"어린 왕자, 낭독본\",https://example.com/1\n2,오만과 편견,https://example.com/2",
    "expectedOriginalItemCount": 2,
    "upstreamBoundary": "쉼표 한 개만으로 일반 한 줄 메모를 표로 오인하지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#compat-csv-table",
    "expectedPreservation": "byte-exact",
    "expectedMode": "safe-table",
    "expectedFallback": false
  },
  {
    "caseId": "compat-markdown-table",
    "sourceShape": "Markdown table · 2 SourceRow",
    "rawText": "| 순서 | 주제 | 활동 |\n| --- | --- | --- |\n| 1 | 첫 번째 | 강의 듣기 |\n| 2 | 두 번째 | 실습하기 |",
    "expectedOriginalItemCount": 2,
    "upstreamBoundary": "표 안의 설명 셀을 별도 Item으로 확장하지 않는다.",
    "provenance": "<workspace>/flow-text-authoring-review/lib/flow/text-authoring/grammar-simulation-cases.ts#compat-markdown-table",
    "expectedPreservation": "byte-exact",
    "expectedMode": "safe-table",
    "expectedFallback": false
  }
] as const satisfies readonly PersonalWorkspacePocLosslessAuthoringCorpusCase[],
);
