# 현재 데모 UX 감사 화면

실행일: 2026-08-04  
성격: 실제 Chromium을 사용한 내부 브라우저 시뮬레이션. 사용자 검증 아님.

- `current-hyphen-properties-misparsed-1440x900.png`
  - `  - 설명:`과 `  - 날짜:`가 속성이 아니라 새 Item으로 처리되는 현재 화면
- `current-sheet-identity-1440x900.png`
  - K-MOOC의 실제 열이 사라지고 `순서/항목/날짜`로 보이는 Sheet 화면
- `current-relative-date-no-anchor-1440x900.png`
  - 기준 날짜가 없을 때 Calendar 해결 경로가 보이지 않는 화면
- `current-mobile-structure-toolbar-390x600.png`
  - 짧은 모바일에서 구조 도구가 Item 영역을 크게 차지하는 화면
- `current-mobile-result-390x600.png`
  - 짧은 모바일 결과 화면과 하단 행동 밀도

원본 자동화 출력은 `output/playwright/2026-08-04-text-authoring-ux-audit/`에 있다.

## 전달 보고서 자체의 화면 QA

- `report-top-desktop-1440.png`
- `report-top-mobile-390x844.png`
- `report-top-mobile-360x640.png`
- `report-handoff-desktop-1440.png`
- `report-handoff-mobile-390.png`
- `report-handoff-mobile-390-bottom.png`

위 화면은 전달 보고서의 상단과 handoff/하단 상태를 확인하기 위한 근거다. 자동 수치 결과는 상위 폴더의 `report-qa-evidence.json`에 있다.
