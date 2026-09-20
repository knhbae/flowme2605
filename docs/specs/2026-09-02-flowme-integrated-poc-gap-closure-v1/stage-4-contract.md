# 단계 4 계약 — v4.1 실행 조작·반응형 완성

- 상태: `IMPLEMENTED_AND_CHROMIUM_VERIFIED` — 실제 기기·screen reader·실제 200% text zoom은 미실행
- 작성일: 2026-09-02
- 대상: `A8`, `A9`
- 제품 권위: React `/my?personalWorkspacePoc=v1`
- 저장 권위: `flow:poc:personal-workspace:v1:*` 안의 shadow transition만 허용

## 1. 단계 목표와 완료 기준

개인공간 v4.1의 날짜·폴더·같은 목록 순서 이동을 포인터, 길게 누르기, 메뉴,
키보드에서 실제로 조작하게 한다. 입력 방식은 달라도 마지막에는 같은 순수 transition과
같은 저장 결과를 사용한다. 모바일·짧은 가로·태블릿·데스크톱에서 핵심 행동을 가리지
않고, 취소·현재 위치·잘못된 위치는 저장하지 않는다.

단계 완료는 다음을 모두 만족할 때만 선언한다.

1. 같은 의도의 drag·long press·menu·keyboard가 같은 transition payload를 만든다.
2. 성공은 정확히 한 state target mutation, 현재 위치·취소·잘못된 위치는 0건이다.
3. 저장 실패는 이전 bytes로 복구되며 성공으로 표시되지 않는다.
4. 이동 뒤 원래 의미상 opener로 focus가 돌아온다.
5. 320×700과 필수 다섯 viewport에서 가로 넘침, console/page error, 가려진 핵심
   행동이 없다.
6. 실제 기기와 자동 Chromium 증거를 서로 대신하지 않는다.

## 2. 세 결과물에서 유지할 요구

| 출처 | 유지하는 핵심 | 통합 PoC 적용 |
| --- | --- | --- |
| v4.1 | 왼쪽 목적지, 오른쪽 원 목록 재정렬 통로, 48px 손잡이, 폴더·기간 IA | React 화면의 이동 패널과 행 손잡이에 적용 |
| 개발 1 | 같은 Item identity, opener 복귀, 실행 위치와 계획 정보 분리 | stable ref와 execution transition, 의미상 focus selector로 적용 |
| 개발 2 | 공통 shell, 명시적 결과·Undo, 원본과 개인 값의 소유권 분리 | receipt와 editor storage coordinator에 적용 |

Flow Item의 폴더는 부모 Flow를 상속한다. Item 날짜 이동은 execution placement만
바꾸며 source 일정, 개인 계획일, Flow 소속을 바꾸지 않는다.

## 3. 이동 문법

| 입력 | 시작 | 목적지·순서 선택 | 종료 transition |
| --- | --- | --- | --- |
| 마우스 drag | 전용 손잡이 pointer | 왼쪽 날짜·폴더 또는 오른쪽 corridor | `move-date`, `move-folder`, `reorder` |
| touch long press | 350ms, 8px 미만 이동 | 같은 패널과 corridor | 같은 transition |
| 짧은 누르기·`…` | 이동 패널 열기 | 버튼으로 날짜·폴더·순서 선택 | 같은 transition |
| 키보드 | 손잡이 Enter/Space | 패널, 또는 ArrowUp/ArrowDown | 같은 transition |
| 경계 버튼 | 맨 위·위·아래·맨 아래 | 순수 position resolver | `reorder` |

본문 swipe는 scroll이며 이동을 시작하지 않는다. pointer capture를 잃거나 Escape,
pointer cancel, blur, resize, 목록 밖 drop이 발생하면 session만 정리하고 저장하지 않는다.

## 4. 공간·피드백 계약

- 목적지는 화면 왼쪽의 non-modal 이동 패널에 둔다.
- 같은 목록 순서는 원 행 오른쪽 corridor와 3px before/after 삽입선으로 표시한다.
- drop 상태는 `idle`, `current`, `valid`, `invalid` 네 값으로 DOM과 시각 피드백에
  동시에 노출한다.
- 폴더 목적지는 좁은 화면에서 한 열로 유지한다.
- 순서가 하나뿐이면 순서 영역을 숨긴다. 수동 순서가 있을 때만 `시간순으로 되돌리기`를
  제공한다.
- 저장 중·성공·같은 위치·실패·취소는 한 live-status owner와 구조화 receipt로 알린다.
- 성공 뒤 focus는 일반 heading이 아니라 실제 opener 행·상세·결과 행으로 돌아간다.

## 5. 반응형 shell 계약

| 화면 | 핵심 규칙 |
| --- | --- |
| 320×700, 375×812, 390×844 | 한 줄 local context, 본문 Quick/Plan을 primary action으로 유지, 전역 Undo는 관리 메뉴에 제공 |
| 844×390 | header와 panel을 압축하고 panel 내부가 독립 scroll되며 sticky action을 유지 |
| 1024×768 | 목록과 실행 영역을 동시에 읽되 Item 상세는 sheet 경계를 유지 |
| 1440×900 | 넓은 화면 밀도를 사용하되 핵심 action과 의미 순서를 바꾸지 않음 |

모든 입력·textarea·select는 모바일에서 계산된 글자 크기 16px 이상이어야 한다. 네 방향
safe-area 변수를 shell·sheet·move panel에 적용하고, main skip link와 48px target을
유지한다. 이동 패널은 viewport와 safe-area 안에서 폭을 계산하고 가로 overflow를
숨긴다.

## 6. 저장·receipt 의미

| 결과 | target mutation | 사용자 표시 |
| --- | ---: | --- |
| 이동 성공 | 1 | before→after, affected ref, Undo |
| 같은 위치 | 0 | 같은 위치, 저장하지 않음 |
| 사용자 취소·Escape·pointer cancel | 0 | 취소 원인, 저장하지 않음 |
| invalid/outside drop | 0 | 놓을 수 없음 또는 취소 |
| 저장 실패 | 성공 state mutation 0 | 이전 값 보존, 같은 intent 재시도 |
| Undo | 1 | 이전 값 복원 |

실패 과정에서 PoC writer 호출과 exact rollback이 있을 수 있으므로 `API 호출 0`과
`성공한 state mutation 0`을 혼동하지 않는다. 허용 prefix 밖 set/remove와 clear는 모든
결과에서 0이어야 한다.

## 7. 검증 시나리오

### 모델·component

- drag/menu/keyboard-equivalent payload와 최종 state parity
- 현재 위치·경계·invalid·cancel의 transition mutation 0
- Flow Item 날짜 이동 뒤 source schedule과 부모 폴더 불변
- move panel close는 저장 성공 뒤에만 수행
- pointer/lost-capture cleanup 뒤 ghost·강조·RAF·suppressed click 정리
- 원래 opener selector capture와 성공·취소 focus 복귀

### 실제 Chromium

1. Item sheet, 기간 행, Flow 상세에서 날짜·폴더·순서를 옮기고 각 opener focus를 확인한다.
2. QuickItem을 pointer로 폴더에 옮긴 결과와 메뉴·키보드 결과를 비교한다.
3. `current`, `valid`, `invalid`의 선·문구·DOM 상태와 mutation 수를 확인한다.
4. Escape, pointer cancel, lost pointer capture, outside drop 뒤 저장 0과 cleanup을 확인한다.
5. 320×700과 필수 다섯 viewport에서 panel rect, overflow, sticky action, 16px 입력,
   primary CTA를 확인한다.
6. reload 뒤 마지막 성공 상태와 Undo 가능 상태를 확인한다.

## 8. 의도적 부분 충족과 증거 경계

- Flow 자체의 폴더 이동은 menu/keyboard 경로를 제공한다. Flow row 전용 drag handle까지
  모든 입력 modality가 구현됐다고 판정하지 않는다.
- standalone HTML은 offline fixture다. React 제품 정본의 live origin·저장 경계 증거를
  대신하지 않는다.
- 자동 Chromium pointer와 device emulation은 실제 Android Chrome 또는 iOS Safari의
  touch 증거가 아니다.
- screen reader, 실제 가상 키보드, OS 글자 확대, 실제 200% browser 확대는 별도
  미실행 항목으로 남긴다.

## 9. 단계 4 종료 증거

| 구분 | fresh 결과 | 증거 범위 |
| --- | --- | --- |
| PoC focused model/component | 253/253 PASS | 개인공간 PoC model·store·transition·component |
| 전체 `npm test` | 1,738/1,738 PASS | 여섯 TAP group `177 + 455 + 253 + 633 + 201 + 19` |
| production build | 18/18 PASS | Next.js type check와 static generation |
| Stage 4 Chromium runtime | 4/4 PASS | semantic focus 복귀, 입력 방식 동등성, current/invalid/cancel exact bytes, 320 보조+필수 5개 viewport |
| 저장 경계 | PASS | 허용 prefix 밖 set/remove/clear 0, non-PoC key/value snapshot 동일 |

브라우저 최종 결과는 `test-results-stage4-final-fixed/.last-run.json`에 남겼다. 자동
Chromium과 저장 fixture는 실제 Android/iOS touch, 실제 browser profile/backend,
screen reader, 실제 200% text zoom 증거를 대신하지 않는다.

## 10. 단계 Exit gate

- [x] 최신 production build로 Stage 4 브라우저 시나리오가 통과한다.
- [x] 필수 viewport와 320×700에서 overflow·console/page error·covered action이 0이다.
- [x] 성공·same·cancel·invalid·failure·Undo의 저장 의미가 증거와 일치한다.
- [x] source/운영 bytes와 허용 namespace 밖 writer 호출이 불변이다.
- [x] 실제 기기와 남은 Flow drag 차이를 완료로 과장하지 않는다.
