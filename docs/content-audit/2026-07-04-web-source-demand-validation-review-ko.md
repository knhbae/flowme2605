# FlowMe 웹 소스 수요 검증 리뷰 (2026-07-04)

기존 scout 후보 100개를 대상으로 demand validation pass를 수행했다. 상위 30개 URL은 실제로 다시 열었고, 나머지 70개는 scout-only 판정으로 남겼다. 이번 산출물은 앱 seed가 아니며 Flow/Step/Item 데이터도 아니다.

## 전체 요약

- 전체 후보: 100개
- 실제 재열람 후보: 30개
- 보이는 수요 강함: 4개
- 높은 의도 추론: 18개
- 구조만 좋음: 42개
- 수요 확인 필요: 18개
- canary 추천: 7개

## Demand 기준 canary 추천

1. SCOUT-001 아정당 이사 준비 체크리스트
   - 점수: demand 96, conversion 94
   - 이유: 보이는 수요 강함 + canary 후보: 수요 신호, 최신성, copy intent, source row가 모두 강함
   - 다음: 첨부 XLSX/PDF row를 import해 광고/견적 CTA를 제외한다
2. SCOUT-086 삼성 에어컨 필터 청소 방법
   - 점수: demand 86, conversion 88
   - 이유: 보이는 수요 강함 + canary 후보: 가전 관리 루틴의 대표 후보
   - 다음: 모델별 분기 없이 기본 필터 청소 루틴으로 작게 canary
3. SCOUT-021 질병관리청 표준 예방접종 일정표
   - 점수: demand 84, conversion 92
   - 이유: 높은 의도 추론 + canary 후보: 보이는 조회수는 없지만 공식성, PDF row, 부모의 날짜 민감도가 강함
   - 다음: 공식 PDF row를 추출해 월령/차수/백신명만 정규화
4. SCOUT-031 오픽만수르 모의고사 공부 방법
   - 점수: demand 83, conversion 88
   - 이유: 높은 의도 추론 + canary 후보: 파일 다운로드와 시험 계획표 copy intent가 강함
   - 다음: XLSX/PDF row와 영상 링크를 확인해 회차 단위만 추출
5. SCOUT-045 국세청 연말정산 체크리스트
   - 점수: demand 83, conversion 86
   - 이유: 높은 의도 추론 + canary 후보: 공식성과 시즌 반복성이 강하지만 세무 판단은 원문 링크 중심
   - 다음: 공제 항목 row만 가져오고 세무 해석은 공식 링크로 남긴다
6. SCOUT-023 국립재활원 영유아 건강검진
   - 점수: demand 82, conversion 89
   - 이유: 높은 의도 추론 + canary 후보: 공식 일정성과 부모 반복 일정 수요가 강함
   - 다음: 국민건강보험 공식 최신 페이지와 교차 확인
7. SCOUT-044 안전운전 통합민원 면허 갱신/적성검사
   - 점수: demand 80, conversion 86
   - 이유: 높은 의도 추론 + canary 후보: 공식 페이지이고 사용자가 그대로 준비물을 옮겨 적을 이유가 명확함
   - 다음: 면허 종류별 variant를 나눌지 setupField로 처리할지 결정

## 보이는 수요가 강한 후보

- SCOUT-002 오늘의집 이사 준비 체크리스트: demand 97, fit 87, 보이는 수요 강함 / canary 후보 — 보이는 수요는 가장 강하지만 AJD와 중복이라 canary 대표에서는 제외
- SCOUT-001 아정당 이사 준비 체크리스트: demand 96, fit 94, 보이는 수요 강함 / canary 후보 — 수요 신호, 최신성, copy intent, source row가 모두 강함
- SCOUT-086 삼성 에어컨 필터 청소 방법: demand 86, fit 88, 보이는 수요 강함 / canary 후보 — 가전 관리 루틴의 대표 후보
- SCOUT-007 아정당 자취 준비 리스트: demand 72, fit 80, 보이는 수요 강함 / row 확인 후 seed 후보 — 보이는 수요는 있으나 스크랩 낮고 urgency는 중간

## 수요는 있어 보이나 source gate가 막힌 후보

- SCOUT-025 초기 토핑 이유식 식단표 엑셀 템플릿: demand 84, fit 65, 높은 의도 추론 / source import 필요 — 수요와 copy intent는 강하지만 파일 row 확인 전 seed 불가
- SCOUT-055 Visit Japan Web 공식: demand 80, fit 65, 수요 확인 필요 / source import 필요 — 수요는 높아 보이나 공식 URL에서 row 추출 실패
- SCOUT-022 예방접종도우미 아이 접종일 보기: demand 78, fit 55, 수요 확인 필요 / source import 필요 — 상위 30개가 아니므로 이번 패스에서는 실제 URL 재열람 없이 scout 근거만 유지했다.
- SCOUT-062 빅씨스 10분 홈트 루틴 플레이리스트: demand 78, fit 68, 높은 의도 추론 / source import 필요 — YouTube 수요는 높아 보이나 영상 목록 import 전 seed 금지
- SCOUT-063 빅씨스 초보 홈트 5일 챌린지: demand 76, fit 65, 높은 의도 추론 / source import 필요 — YouTube 수요는 있어 보이나 직접 본문이 열리지 않음
- SCOUT-026 네이버 이유식 식단표: demand 75, fit 45, 수요 확인 필요 / source import 필요 — 사용자 제보상 수요가 강하지만 이번 자동 열람으로 확인되지 않아 unknown
- SCOUT-100 면접 직전 체크리스트 영상: demand 73, fit 55, 수요 확인 필요 / source import 필요 — 상위 30개가 아니므로 이번 패스에서는 실제 URL 재열람 없이 scout 근거만 유지했다.
- SCOUT-024 홍성의료원 영유아검진 문진표: demand 70, fit 55, 수요 확인 필요 / source import 필요 — 상위 30개가 아니므로 이번 패스에서는 실제 URL 재열람 없이 scout 근거만 유지했다.
- SCOUT-041 정부24 전입신고: demand 70, fit 50, 수요 확인 필요 / 보류 — 수요는 높을 가능성이 크지만 현재 URL에서 row 확인 실패
- SCOUT-061 올블랑 유튜브 채널: demand 70, fit 55, 수요 확인 필요 / source import 필요 — 상위 30개가 아니므로 이번 패스에서는 실제 URL 재열람 없이 scout 근거만 유지했다.
- SCOUT-048 정부24 통신판매업 신고: demand 68, fit 50, 수요 확인 필요 / 보류 — 행정 수요는 있지만 공식 원문이 열리지 않아 gate 미통과
- SCOUT-029 펀맘 학습지 사이트: demand 65, fit 55, 수요 확인 필요 / source import 필요 — 상위 30개가 아니므로 이번 패스에서는 실제 URL 재열람 없이 scout 근거만 유지했다.

## 구조는 좋지만 수요 신호가 약한 후보

- SCOUT-003 생활법령정보 이사 체크리스트: demand 76, fit 82, 구조만 좋음 / 구조 보류 — 공식성은 좋지만 AJD/오늘의집보다 copy intent 약함
- SCOUT-065 5km 달리기 8주 프로그램: demand 72, fit 82, 구조만 좋음 / row 확인 후 seed 후보 — Flow 구조는 좋지만 공개 수요 수치는 보이지 않음
- SCOUT-081 핏펫 강아지 예방접종 일정: demand 72, fit 80, 구조만 좋음 / row 확인 후 seed 후보 — 구조는 좋지만 건강성 source라 교차 확인 필요
- SCOUT-009 고방 자취방 현장 방문 체크사항: demand 69, fit 79, 구조만 좋음 / row 확인 후 seed 후보 — FlowMe 실행성은 좋지만 visible demand가 없음
- SCOUT-011 Planning.wedding 12개월 웨딩 타임라인: demand 72, fit 78, 구조만 좋음 / 구조 보류 — 구조는 강하지만 보이는 수요 수치가 없고 해외 기준 항목이 섞임
- SCOUT-091 캔디데이트 면접 전날 체크리스트: demand 70, fit 78, 구조만 좋음 / row 확인 후 seed 후보 — 실행성은 좋지만 공개 수요 신호가 보이지 않음
- SCOUT-099 토스페이먼츠 통신판매업 신고 방법: demand 75, fit 78, 구조만 좋음 / row 확인 후 seed 후보 — 공식이 아닌 법률 블로그라 국세청 보조로만 사용
- SCOUT-082 로얄캐닌 반려견 백신 접종 일정: demand 73, fit 77, 구조만 좋음 / row 확인 후 seed 후보 — 구조는 좋지만 국내 동물병원 기준 교차 확인 필요
- SCOUT-008 오늘의집 자취 필수품 리스트: demand 52, fit 65, 구조만 좋음 / 구조 보류 — 상위 30개가 아니므로 이번 패스에서는 실제 URL 재열람 없이 scout 근거만 유지했다.
- SCOUT-013 피치 결혼식 준비 타임라인: demand 52, fit 65, 구조만 좋음 / 구조 보류 — 상위 30개가 아니므로 이번 패스에서는 실제 URL 재열람 없이 scout 근거만 유지했다.

## 판단 메모

- 조회수보다 copy/export/check 가능성을 우선한다는 FlowMe 기준을 유지했다.
- 조회수/스크랩이 강한 후보라도 원문 row 또는 첨부 파일을 확인할 수 없으면 canary로 올리지 않았다.
- 정부24, Naver, 일부 YouTube URL은 열었지만 본문 추출이 제한되어 hold/source_import_required로 두었다.
- 의료/행정/세무/건강성 후보는 공식 source와 creator/commercial source를 분리해야 한다.
