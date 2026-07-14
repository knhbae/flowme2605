# P24-00F3B Memo Draft Integrity Evidence

기준 커밋 `e6c0f8f`에서 메모 분할 초안의 날짜 없는 항목 누락과 빈 URL 요청의 상태 문구 오염을 수정한 현재 실행 evidence다.

## 판정

- 메모를 3개 할 일로 나누고 첫 항목에만 날짜를 지정해도 My Flow에는 3개가 모두 보인다.
- 새로고침 후에도 3개가 유지되고 Flow 전체 메모 export에도 3개가 모두 포함된다.
- Calendar에는 날짜가 있는 첫 항목만 나타나며 날짜 없는 두 항목은 My Flow와 list export에 남는다.
- Flow 이름과 원하는 결과가 모두 비어 있으면 후보를 저장하지 않는다.
- 원하는 결과만 입력한 경우 사용자 문구에서 제목을 만들며 조회 상태 문장을 제목이나 할 일로 사용하지 않는다.

## 산출물

- `audit.md`: 원인, 수정 계약, UX 후속 범위
- `route-evidence.json`: 현재 실행 marker와 검증 결과
- `screenshots/`: 모바일·wide 브라우저 상태

## 검증 성격

Playwright와 저장소 테스트로 재현한 자동화 시뮬레이션이다. 실제 사용자가 분할 항목과 Flow 전체 export의 차이를 설명 없이 이해하는지는 P24 사용자 관찰에서 별도로 확인해야 한다.
