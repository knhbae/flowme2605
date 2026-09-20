# FlowMe 통합 PoC 빠른 할 일→Flow 연결 v1 QA

**기준일:** 2026-09-05  
**현재 판정:** `BP-017` 구현·자동 E4 검증 완료

## 1. 판정 규칙

| 등급 | 이 패키지에서 필요한 증거 |
| --- | --- |
| E1 | 계약·코드·정적 UI가 존재한다. |
| E2 | 순수 모델·state·storage·component 자동 테스트가 통과한다. |
| E3 | 실제 Chromium 조작으로 성공·오류·회복·reload를 확인한다. |
| E4 | React·standalone·전체 회귀·build·다섯 viewport·문서 검사를 같은 최종 worktree에서 fresh 확인한다. |
| E5-D | 실제 Android Chrome 또는 iOS Safari에서 지정 과업을 수행한다. |
| E5-U | 관찰 사용자가 지정 과업을 수행한다. |

E3·E4는 E5-D나 E5-U를 대신하지 않는다. 자동 fixture의 storage parity는 실제 사용자
browser profile이나 운영 backend를 열어 검사했다는 뜻이 아니다.

## 2. 기능 시나리오

| ID | 시나리오 | 기대 결과 | 현재 상태 |
| --- | --- | --- | --- |
| QF-01 | 열린 QuickItem을 Flow로 정리 | 원본 보존, 새 Flow 1·Item 1, 새 Item open | React PASS |
| QF-02 | 완료 QuickItem을 Flow로 정리 | 원본 completed/completedAt 보존, 새 Item open | 모델 PASS |
| QF-03 | 폴더·날짜·메모가 있는 QuickItem 전환 | receipt와 새 Flow/Item에 전환 시점 값 복사 | 모델·React PASS |
| QF-04 | 전환 성공 뒤 새 Flow 열기 | 생성한 Flow 상세가 열리고 원본과 독립적으로 조작 가능 | React PASS |
| QF-05 | 이미 전환한 QuickItem 재요청 | 중복 생성 0, 기존 결과 열기 | 모델·React PASS |
| QF-06 | 전환 뒤 Undo | 전환 전 state 정확히 복원, 원본 QuickItem 동일 | 모델·React E2E PASS |
| QF-07 | 전환 뒤 reload | 성공 state와 receipt 복원 | React E2E PASS |
| QF-08 | 저장 실패 | state bytes 불변, 실패 receipt와 retry 노출 | React E2E PASS |
| QF-09 | 동일 snapshot에서 retry | 새 Flow가 한 번만 생성되고 성공 | React E2E PASS |
| QF-10 | 손상 receipt/payload | fail-closed, 잘못된 부분 state 노출 0 | 모델 PASS |
| QF-11 | standalone 핵심 흐름 | QF-01, 05~10과 결과 signature 동등 | standalone PASS |

## 3. mutation 0 matrix

다음 입력은 state revision, raw PoC state bytes, 운영 sentinel을 바꾸지 않아야 한다.

| 조건 | 필요한 assertion | 현재 상태 |
| --- | --- | --- |
| 확인 전 취소 | state write 0 | React PASS |
| Escape | state write 0, form 닫힘 | React E2E PASS |
| 빈 제목 | state write 0 | 모델 PASS |
| 줄바꿈 제목 | state write 0 | 모델 PASS |
| 없는 QuickItem | state write 0 | 모델 PASS |
| stale revision | state write 0 | 모델 PASS |
| Flow/Item identity 충돌 | state write 0 | 모델 PASS |
| 성공한 원본 반복 요청 | 새 Flow 추가 0 | 모델 PASS |
| storage write 오류 | raw state bytes 불변 | React E2E PASS |
| 손상 receipt | hydration 거절·fail-closed | 모델 PASS |

## 4. 저장·운영 경계 검사

- 허용 key: `flow:poc:personal-workspace:v1:*`
- 허용 prefix 밖 `setItem`: 기대 0
- 허용 prefix 밖 `removeItem`: 기대 0
- `localStorage.clear()`: 기대 0
- 격리 operating `flow:*` sentinel 변경 byte: 기대 0
- 기존 완료·메모·날짜·보관·export writer 호출: 기대 0
- 기본 `/my`와 운영 schema diff: 기대 0

React 핵심 E2E와 5-viewport matrix는 operating sentinel 전후 byte parity와 허용 prefix
밖 `setItem`·`removeItem`·`clear` 0을 검사했다. standalone 테스트도 operating bytes와
PoC exact key를 별도로 확인했다. 이는 격리 fixture 증거이며 실제 사용자 profile이나
운영 backend 조사로 확대 해석하지 않는다.

## 5. Browser matrix

각 viewport에서 QuickItem 관리→Flow로 정리→확인/취소→성공→Flow 열기→Undo를 검사한다.

| viewport | 레이아웃 기준 | 현재 상태 |
| --- | --- | --- |
| 390×844 | form, 주 행동, receipt, Undo 가림 0 | PASS |
| 375×812 | 좁은 세로 화면 overflow·잘림 0 | PASS |
| 844×390 | panel 내부 scroll로 모든 행동 도달 | PASS |
| 1024×768 | list와 상세 사이 선택·전환 맥락 유지 | PASS |
| 1440×900 | wide 상세에서 원본/새 Flow 관계 인지 가능 | PASS |

공통 측정은 `documentElement.scrollWidth <= clientWidth`, console error 0, page error 0,
핵심 버튼 viewport 도달, keyboard/non-drag 경로 도달이다.

## 6. 자동 테스트 현황

이 문서를 작성할 때 전달받은 fresh 증거만 기록한다.

| 범위 | 결과 | 해석 |
| --- | ---: | --- |
| React 순수 모델·state·storage·component focused | 104/104 PASS | materialization, transition, receipt, storage, UI 계약 |
| React Quick→Flow E2E | 1/1 PASS | 생성·reload·Undo·오류·retry·sentinel parity |
| React 필수 viewport | 5/5 PASS | overflow·가림·console/page error·forbidden writer 0 |
| standalone model/UI 계약 | 92/92 PASS | 원본 보존·전환·Undo·reload·오류 경계 |
| standalone Chromium smoke | 2/2 PASS | 390×844, 844×390 핵심 조작 |
| 전체 `npm test` | 2,201/2,201 PASS | 최종 lifecycle 전체 합계, 실패 0 |
| production build | 18/18 page PASS | compile·type check·static generation |
| 요구 추적 | 60/60 PASS | `BP-017` 미충족/E0→충족/E4 |
| docs check | PASS | 16개 필수 문서·4,651개 로컬 링크 |

## 7. 완료 판정 조건

`BP-017`을 최종 E4 충족으로 올리려면 다음이 모두 필요하다.

- React와 standalone의 핵심 결과 parity
- focused model/component/storage suite green
- React와 standalone E2E green
- 전체 `npm test`와 production build green
- 다섯 viewport의 overflow/error/covered-action 0
- 허용 prefix 밖 writer/clear 0과 operating sentinel byte parity
- reload, corruption fail-closed, Undo, retry 증거
- traceability current verdict와 verification manifest 갱신

실제 기기와 관찰 사용자는 E4와 별도다. 실행하지 않았다면 각각 `미실행`, `0명`으로
유지한다.

## 8. 미실행·게시 상태

| 항목 | 상태 |
| --- | --- |
| 실제 Android Chrome | 미실행 |
| 실제 iOS Safari | 미실행 |
| screen reader | 미실행 |
| OS 글자 확대·browser 200% | 미실행 |
| 관찰 사용자 | 0명 |
| commit | 미진행 |
| push | 미진행 |
| PR | 미진행 |
| Preview | 미진행 |
| Production | 미진행 |
