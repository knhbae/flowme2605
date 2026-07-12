# 겉보기 중복과 원문 현재성 감사 기록

검사일: 2026-07-12

## 판정 원칙

1. HTTP 200은 원문이 현재 실행 기준이라는 뜻이 아니다.
2. 오래 게시된 원문이라는 이유만으로 숨기지 않는다.
3. 제목이 비슷해도 대상 장치나 사용자 과업이 다르면 별도 Flow로 유지한다.
4. 같은 과업의 구형 사본은 원문과 기존 기록을 보존하되 신규 public 실행에서는 정본으로 연결한다.

## 반려동물 등록

### 구형 정부24 사본

- route: `/f/pet-registration-basic`
- source: <https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=15410000003&HighCtgCD=A09006>
- 접속: HTTP 200, EUC-KR 문서
- 문제: 민원 본문이 `등록인식표`를 등록 방식·수수료 항목으로 남긴다.
- 현재 비교: 국가동물보호정보시스템은 2개월 이상 반려견과 내장형·외장형 무선식별장치를 안내한다.
- 결정: `catalog_preview_only` + `superseded_duplicate`; 신규 public route 404, 대체 route `real-pet-registration-check`.

### 현재 정본

- route: `/f/real-pet-registration-check`
- source: <https://www.animal.go.kr/front/community/show.do?boardId=contents&menuNo=2000000016&seq=+66>
- 접속: HTTP 200
- 확인일: 2026-07-12
- 범위: 등록 대상, 내장형·외장형, 대행기관, 소유자 정보, 등록번호 보관, 변경신고 확인.
- 사용자 표면: `반려견 동물등록 준비`, 구형 `인식표 방식` 문구 0.

## 삼성 에어컨

### 자가 사전점검

- route: `/f/samsung-aircon-seasonal-check`
- source: <https://www.samsungsvc.co.kr/solution/2002378?assess=N>
- 원문 게시: 2026-02-27
- 확인일: 2026-07-12
- 범위: 전원·차단기, 리모컨, 실외기 통풍, 모델별 필터, 18도 냉방 10분 시험 가동.
- 교정: Samsung Care+ 전문 서비스 페이지를 가리키던 source를 현재 자가점검 원문으로 바꿨다.
- 실행 모델: 잘못된 4주 12회차 루틴을 제거하고 날짜 없는 5항목 체크리스트로 바꿨다.

### 전문 세척 예약

- route: `/f/real-samsung-aircon-seasonal-care`
- source: <https://www.samsungsvc.co.kr/info/maintenance>
- 접속: HTTP 200
- 확인일: 2026-07-12
- 범위: 모델·설치 위치, 전문 세척 필요 신호, 서비스 범위·비용, 방문 후보, 세척 후 작동 확인.
- 사용자 표면: `삼성 에어컨 전문 세척 예약 준비`로 자가점검과 구분한다.

두 route는 `자가 점검`과 `유료 전문 서비스 준비`라는 다른 과업이므로 합치지 않는다.

## 삼성 세탁기

### 비스포크 AI 콤보 배수필터

- route: `/f/real-samsung-washer-filter-care`
- source: <https://www.samsungsvc.co.kr/solution/1978102>
- 원문 게시: 2024-03-22
- 확인일: 2026-07-12
- 대상: 비스포크 AI 콤보의 배수필터와 잔수 제거.
- 교정: 범용 `삼성 세탁기` 제목을 모델 특정 제목으로 바꾸고, 원문과 다른 `흐르는 물` 문구를 `부드러운 솔`로 교정했다.
- 실행 모델: 잘못된 주 3회·12회차 UI 대신 주 1회 관리일과 당일 5항목 체크리스트를 사용한다.

### 미세플라스틱 저감장치 필터

- route: `/f/samsung-washer-filter-cleaning`
- source: <https://www.samsungsvc.co.kr/solution/1477182>
- 원문 게시: 2023-06-14
- 확인일: 2026-07-12
- 대상: 별도 미세플라스틱 저감장치의 필터 LED, 물세척 금지, 재조립, 3초 리셋.
- 결정: 게시 시점은 오래됐지만 URL과 현재 행이 정확히 맞으므로 유지한다.
- 실행 모델: 고정 4주 루틴을 제거하고 LED 신호가 있을 때 바로 실행하는 날짜 없는 10항목 체크리스트로 바꿨다.

## 자동·시각 검증

- 정본·source-fit·자연 산출물 단위 테스트 106/106 통과.
- currentness 및 기존 관련 Playwright 5/5 통과.
- 390px에서 폐기 안내, 현재 반려견 등록, 에어컨 2과업, 세탁기 2장치를 확인했다.
- 1024px 삼성 채널에서 전문 세척과 AI 콤보 배수필터가 서로 다른 카드로 보이며 horizontal overflow가 없었다.
- 실제 사용자 관찰 세션 수: 0.
