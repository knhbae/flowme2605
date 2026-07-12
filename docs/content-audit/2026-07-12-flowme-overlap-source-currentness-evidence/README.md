# FlowMe 겉보기 중복·원문 현재성 감사

반려동물 등록과 삼성 가전 Flow를 제목 유사도만으로 합치지 않고, 원문 접속 여부·게시 시점·현재 안내 적합성·사용자 과업 중복을 따로 판정한 패키지입니다.

## 결론

- `pet-registration-basic`은 URL은 열리지만 구형 `등록인식표` 문구가 현재 국가동물보호정보시스템 안내와 맞지 않고, 같은 과업의 최신 공식 Flow가 있어 신규 공개 실행을 닫았습니다.
- `real-pet-registration-check`는 `반려견 동물등록 준비` 정본으로 유지하며, 2개월 이상 반려견과 내장형·외장형 등록 범위를 명시합니다.
- 에어컨은 중복이 아닙니다. `samsung-aircon-seasonal-check`는 2026 자가 사전점검 5항목, `real-samsung-aircon-seasonal-care`는 전문 세척 상담·예약 준비입니다.
- 세탁기 역시 중복이 아닙니다. `real-samsung-washer-filter-care`는 비스포크 AI 콤보 배수필터 주 1회 관리, `samsung-washer-filter-cleaning`은 미세플라스틱 저감장치 LED 신호 기반 청소입니다.
- 오래된 게시일만으로 숨기지 않았습니다. 2023 미세플라스틱 저감장치 안내는 현재도 열리고 실행 내용과 정확히 맞아 유지했습니다.

## 파일

- [상세 감사](./audit.md)
- [시각 리뷰](./review.html)
- [기계 판정 근거](./route-evidence.json)
- [스크린샷](./screenshots/)

## 검증 경계

- 외부 원문은 2026-07-12에 다시 열어 현재 본문과 Flow 행을 대조했습니다.
- 390px public route 6개와 1024px 삼성 채널을 자동·수동으로 확인했습니다.
- 실제 반려인 또는 가전 사용자의 관찰 세션은 진행하지 않았습니다.
