# FlowMe 세금·생활행정 출처 최신성 evidence

2026-07-12 기준으로 `postal-address-transfer`와 `year-end-tax-submit`의 공식 원문, 실행 날짜, URL-first 진입, 기존 저장 기록을 다시 확인한 패키지다.

## 결론

- `postal-address-transfer`: 현재 인터넷우체국 원문에서 확인되는 **전입신고 다음날 조회**만 일정으로 유지한다. 결제 기한과 서비스 시작일은 토·공휴일을 제외하는 가변 날짜이므로 FlowMe가 D+3/D+7로 계산하지 않는다.
- `year-end-tax-submit`: 연결된 정확 원문이 2025-01-20 등록 영상이고 기존 D-3/D-1/D-Day는 국세청 일정이 아니다. 최신 연도별 재작성 전까지 새 저장, 실행, 파일 받기를 보류한다.
- 기존에 저장한 연말정산 기록은 지우거나 자동 교체하지 않는다. My Flow에서 비해제형 공식 원문 확인 경고와 함께 유지한다.
- 구 국세청 영상 URL과 현재 국세청 안내 URL 모두 URL-first에서 `needs_review`로 멈춘다.

## 파일

- [audit.md](./audit.md): 공식 원문과 기존 구현의 차이, 결정 근거
- [route-evidence.json](./route-evidence.json): 자동 판정 marker
- [review.html](./review.html): 모바일·wide 시각 검토판
- `screenshots/`: 390px/1024px 시나리오 캡처

## 공식 원문

- [인터넷우체국 주거이전서비스 신청/결제/취소](https://service.epost.go.kr/front.RetrieveAddressMoveInfo.postal)
- [국세청 편리한 연말정산 이용방법](https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7706&mi=6646)
- [기존 연결 영상: 근로자 간편제출 이용방법](https://www.nts.go.kr/nts/na/ntt/selectNttInfo.do?mi=6489&nttSn=1330438)

## Screenshot

| 파일 | 시나리오 |
| --- | --- |
| `01-postal-minimal-mobile.png` | 우편 최소 실행, 390px 첫 화면 |
| `02-postal-minimal-wide.png` | 우편 최소 실행, 1024px 전체 |
| `03-tax-review-hold-mobile.png` | 연말정산 review hold, 390px |
| `04-tax-review-hold-wide.png` | 연말정산 review hold, 1024px |
| `05-tax-url-first-blocked-mobile.png` | 현재 국세청 URL lookup 차단, 390px |
| `06-tax-existing-save-warning-mobile.png` | 기존 저장 기록과 비해제형 경고, 390px |
| `07-postal-details-mobile.png` | 우편 공식 확인 항목, 390px |

## 다음 점검 순서

1. `curated-funmom-learning-park`: 원문 범위와 현재 학습 행이 실제로 일치하는지 재검토
2. `aircon-filter-cleaning`: 제품 모델별 차이와 2주 반복 근거 재검토

## 검증 결과

- unit: 424/424
- Playwright E2E: 236/236 (`flow-mvp` 183 + URL-first/public/workbench 53)
- targeted evidence scenarios: 4/4
- `npm.cmd run docs:check`: 통과
- `npm.cmd run build`: 통과
- screenshot: 7개, 390px/1024px horizontal overflow 0
