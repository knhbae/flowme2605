# P1-02 도움·조건·주의 disclosure 계약

**상태:** `IMPLEMENTED_LOCAL · INTERNAL QA PASS`

## 1. 네 등급

| 등급 | 기본 처리 | 예시 | 인수 기준 |
|---|---|---|---|
| 삭제 | 행동 결정에 필요 없고 화면 문구를 되풀이하면 제거 | 카드 제목을 다시 설명하는 helper, 선택 직후 같은 값을 반복하는 echo | 제거 후 action·count·warning·source 손실 0 |
| 개념 도움 | 드물게 필요한 배경 설명은 `?` 버튼의 dialog/sheet로 이동 | Map에서 어떤 계획을 선택하는지에 대한 보조 설명 | 44×44 target, 고유 accessible name, keyboard open, Escape close, focus return |
| 조건 disclosure | 결과를 만들기 위해 입력이 필요한 경우 조건·예상 결과 수·편집 진입을 결과 근처에 표시 | 날짜 없는 Calendar, 기준일 필요 | unavailable을 성공처럼 보이지 않게 하고 필요한 입력을 먼저 제시 |
| 안전 경고 | 중복·비가역·외부 전송·데이터 손실 가능성은 행동 옆 inline 유지 | 일방향 파일/clipboard 결과, 민감 source risk | 아이콘 안으로 숨기지 않음. `!`는 inline 경고의 보충 설명만 열 수 있음 |

## 2. 공통 component 계약

- `FlowContextDisclosure`는 `help`와 `caution` 두 종류만 받는다.
- trigger는 실제 `<button type="button">`, 최소 44×44, `aria-label`, `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`를 제공한다.
- 열린 내용은 공통 `FlowBottomSheet`의 dialog semantics를 재사용한다.
- Enter/Space로 열고 Escape로 닫으며, 닫은 뒤 정확한 opener로 focus를 돌린다.
- critical safety 문구는 caller가 inline으로 소유한다. disclosure content는 supplemental detail임을 명시한다.
- Q3 rollback에서는 새 optional icon만 제거되며 기존 inline 경고와 저장 데이터는 그대로 남는다.

## 3. 실행 결과

| 검사 | 결과 |
|---|---|
| `?` accessible name | `계획 선택 도움말` 확인 |
| `!` accessible name | `일방향 결과 상세 보기` 확인 |
| keyboard | Enter·Space open, Escape close PASS |
| focus | help/caution 모두 opener return PASS |
| 안전 정보 | `일방향 결과예요` inline 유지 PASS |
| screen-reader proxy | 4개 핵심 화면의 accessibility snapshot과 unnamed visible control `0` |
| viewport | 390×844, 1024×768, 1440×1000 overflow `0` |
| browser diagnostics | 원인 미확인 console/page/request error `0` |

실제 screen-reader 사용자가 수행한 세션은 없으며 실제 관찰 사용자도 `0명`이다. 따라서 이 결과는 semantics·keyboard·snapshot 내부 QA이지 사용성 검증이 아니다.
