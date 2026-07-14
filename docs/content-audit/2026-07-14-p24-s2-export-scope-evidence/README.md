# P24-00S2 Flow 가져가기 범위 Evidence

## 판정

`supported` - My Flow의 개인 초안과 원문 기반 Flow 모두에서 가져갈 범위를 먼저 고른 뒤 캘린더, 체크리스트, 시트, 메모 형식을 선택할 수 있다.

기본 범위는 `전체 Flow`다. 일부만 필요하면 같은 패널에서 `선택한 항목`으로 전환한다. 항목 상세에 남아 있는 기존 단건 기능은 `이 항목 가져가기`로 범위를 명시한다.

## Claude Design `(8)` 반영

- Flow 카드에 가져가기 진입점 1개
- 범위 선택이 형식 선택보다 먼저 나옴
- `전체 Flow`가 기본값
- `선택한 항목`에서 공통 다중 선택 목록 사용
- 범위와 destination별 실제 항목 수 표시
- 상세의 단건 기능은 `이 항목`임을 명시

목업의 `내보내기`는 현재 제품의 사용자 어휘인 `가져가기`로 옮겼다. 목업의 action sheet를 새 modal로 복제하지 않고 기존 My Flow 카드 안의 compact secondary surface로 연결해 IA와 완료 행동을 유지했다.

## 적용 범위

- 개인 초안 Flow 전체/선택 가져가기
- 원문 기반 Flow 전체/선택 가져가기
- 선택 범위 Calendar ICS
- 선택 범위 checklist/sheet/memo 복사
- 상세의 기존 단건 가져가기 범위 명시
- Calendar 날짜 배치와 가져가기에서 동일한 다중 선택 컴포넌트 재사용

## 제외 범위

- 새로운 외부 서비스 직접 연동
- public `/f` 저장 전 export shell 변경
- 계정, cloud sync, OAuth
- 실제 사용자 관찰 결과

## 증거

- [audit.md](./audit.md)
- [route-evidence.json](./route-evidence.json)
- [개인 초안 선택 가져가기, mobile](./screenshots/00-personal-draft-selected-export-mobile.png)
- [원문 기반 Flow 선택 가져가기, mobile](./screenshots/01-source-backed-selected-export-mobile.png)
- [개인 초안 전체 Flow 가져가기, wide](./screenshots/02-personal-draft-whole-export-wide.png)
- [상세 단건 가져가기 범위, mobile](./screenshots/03-source-backed-item-export-mobile.png)
- [선택한 날짜 항목 ICS](./downloads/personal-draft-selected-calendar.ics)

## 검증 성격

스크린샷과 다운로드는 Playwright 자동 시뮬레이션 결과다. 실제 관찰 사용자 세션은 `0`건이며, 사용자가 `가져가기`를 외부 반출 행동으로 즉시 이해하는지와 전체/선택 기본값의 선호는 P24-00B에서 확인해야 한다.

## 현재 실행 결과

- `npm.cmd test`: 508/508 pass
- `npm.cmd run docs:check`: pass, 14 required files / 2136 local links
- `npm.cmd run build`: pass
- P24 execution trust: 13/13 pass
- URL-first user surface: 19/19 pass
- public share + workbench: 44/44 pass
- 기존 My Flow/Calendar/detail export targeted: 4/4 pass
- S2 overflow/console targeted rerun: 2/2 pass
