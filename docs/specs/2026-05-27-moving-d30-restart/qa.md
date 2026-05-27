# 이사 D-30 재시작 QA

## 필수 검사

| 검사 | 결과 | 근거 |
| --- | --- | --- |
| `npm run docs:check` | Pass | 14 required files, 311 local links 통과. |
| `npm test` | Pass | 187 tests, 187 pass, 0 fail. |
| `npm run build` | Pass | Next.js production build 통과. `/restart/moving-d30` First Load JS 175 kB. |
| `npm run test:e2e` | Pass | 79 tests, 79 pass, 0 fail. |
| Browser review | Pass | Playwright로 desktop 1440px, mobile 390px 스크린샷 확인. body horizontal overflow 없음. |

## 검토 메모

- 제품 제약 검토: route는 export-first를 유지하고, `내 Flow로 저장`은 로그인 상태 확인 뒤 저장되는 secondary continuation path로 둔다.
- 출처/위험 검토: AJD 체크리스트 링크와 정부24 전입신고 공식 링크를 우측 출처 카드에 분리해서 노출한다.
- 브라우저 또는 screenshot 검토:
  - `output/playwright/moving-d30-desktop.png`
  - `output/playwright/moving-d30-mobile.png`
- 잔여 리스크: 현재 로그인 판정은 MVP 데모용 `localStorage` gate다. 실제 서비스 auth와 연결할 때 저장 API/세션 처리로 교체해야 한다.
- 잔여 리스크: `npm install` 과정에서 audit warning 7건(3 moderate, 4 high)이 보고되었고, 이번 범위에서는 별도 보안 업데이트를 하지 않았다.
