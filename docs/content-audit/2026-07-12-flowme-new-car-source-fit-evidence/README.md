# FlowMe 신차 구매 source-fit evidence

2026-07-12 기준 `curated-new-car-purchase-guide`와 `/f/curated-new-car-basic`을 민간 구매 가이드, 현재 법령 안내, 실제 사용자 화면으로 다시 대조한 결과입니다.

## 결론

- 7단계 구매 순서는 계속 실행 가능하게 유지합니다.
- Getcha 글은 구매 여정의 순서와 기록 항목을 참고하는 용도로만 사용합니다.
- `신규등록 확인`과 `의무보험 확인`은 찾기쉬운 생활법령정보의 현재 안내를 행별 공식 근거로 연결합니다.
- 고정 가격·비율·기한, 보편 서류 목록, 금융·보험 상품 추천은 사용자 화면과 export에 넣지 않습니다.
- `구매 방식 결정`은 자동 판단처럼 읽히지 않도록 `구매 방식 비교 메모`로 낮췄습니다.
- `/flow-maps/curated-new-car-purchase-guide`와 `/f/curated-new-car-basic`은 실행 가능 상태를 유지합니다.
- 출처 카드의 `확인 · 업데이트` 표현은 `원문 확인 기록 · Flow 정리`로 바꿨습니다. 오늘 링크를 열어본 사실을 원문 최신 업데이트처럼 표시하지 않습니다.

## 수치

- 표준 freshness: published 157, 정상 사용자 route 141, `current` 141
- 수동 source-fit: 133개, 승인 47, 재구성 73, 미리보기 12, 숨김 1
- source-backed 공개 실행 child Flow: 14개
- 수동 감사 없는 공개 실행 child Flow: 13개
- 수동 감사 없는 금융 민감 공개 실행 Flow: 0개
- 수동 감사 없는 의료 민감 공개 실행 Flow: 3개
- 수동 감사 없는 중간 위험 공개 실행 Flow: 5개
- 신차 공식 행별 링크: 2개
- 신차 고정 금액·비율·기한 노출: 0개
- 정상 사용자 내부 제작어·raw ISO hit: 0개
- screenshot: 모바일 3장 + wide 1장
- 관찰 사용자 세션: 0

`current 141`은 `source_checked_at` 경과일 기준입니다. 원문 게시일, 링크가 가리키는 실제 화면, 현재 지침과의 의미 일치까지 자동 보증하지 않습니다.

## 현재 근거

- [신차 구매 절차 참고 글](https://web.getcha.kr/blog/complete-guide-new-car-purchase-procedure-for-beginners)
- [찾기쉬운 생활법령정보 신규등록 안내](https://www.easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=1&cciNo=2&cnpClsNo=1&csmSeq=675&popMenu=ov)
- [찾기쉬운 생활법령정보 의무보험 안내](https://www.easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=1&cciNo=1&cnpClsNo=3&csmSeq=675)

정부24 신규등록 URL은 감사 시점에 과거 시스템 점검 안내로 리디렉션되어 사용자 링크로 채택하지 않았습니다. 공식 도메인이라는 이유만으로 현재 목적 페이지라고 가정하지 않았습니다.

## 파일

- [review.html](./review.html): 모바일/wide 화면과 판정 수치를 한 화면에서 확인
- [audit.md](./audit.md): 원인, 적용 정책, 다음 감사 큐
- [route-evidence.json](./route-evidence.json): source-fit, 공식 근거, route marker
- [screenshots](./screenshots/): 실제 브라우저 캡처 4장

## 재현

```powershell
npx.cmd tsx --test lib/flow/source-backed-my-flow.test.ts lib/flow/source-fit.test.ts
$env:FLOWME_NEW_CAR_EVIDENCE_DIR='docs/content-audit/2026-07-12-flowme-new-car-source-fit-evidence/screenshots'
npx.cmd playwright test tests/e2e/flow-mvp.spec.ts --grep "current new-car source fit" --workers=1
npx.cmd tsx scripts/content-audit/audit-flow-source-freshness.ts
npm.cmd test
npm.cmd run docs:check
npm.cmd run build
```

자동 테스트와 screenshot은 실제 구매자, 등록관청, 보험 계약 검토를 대체하지 않습니다.
