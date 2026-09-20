# FlowMe 통합 PoC 제품형 UX 패스 v1 QA

- 작성일: 2026-09-03
- 상태: `P0_AUTOMATED_PASS_WITH_ONE_PREEXISTING_FULL_SUITE_FAILURE`
- 이번 목표의 중복 없는 핵심 검증: `371` (`269 + 43 + 59`)
- 실제 기기: `미실행`
- 관찰 사용자: `0명`

## 1. 증거 원칙

- 이전 parity의 통과 수치는 변경 전 기준선이다.
- 이번 변경 뒤 다시 실행하지 않은 suite를 `PASS`로 기록하지 않는다.
- 자동 Chromium, touch emulation, 화면 캡처는 실제 Android Chrome·iOS Safari 검사가 아니다.
- fixture와 browser context의 storage 비교는 실제 사용자 profile이나 운영 backend 검사가 아니다.
- build 통과는 Preview 또는 Production 배포가 아니다.

## 2. 이전 기준선

| 실행 | 이전 결과 | 현재 해석 |
| --- | --- | --- |
| personal-workspace model/component | 256/256 | 변경 전 기준선 |
| standalone node | 39/39 | 변경 전 기준선 |
| authoring→workspace product browser | 37/37 | 제한된 P0 자동 시나리오 기준선 |
| production build | PASS, 정적 페이지 18개 | 배포 아님 |
| 전체 `npm test` | FAIL, 1,520/1,521 | 기존 dog fixture 신선도 1건에서 fail-fast 중단 |
| docs check | 4,588/4,588 links | 의미 정합성 검사는 아님 |
| diff check | PASS | 변경 전 closeout 근거 |

기존 실패는 `dog-adoption-first-week:review_due:2026-06-04`다. 콘텐츠 owner의 재검토 없이
날짜를 바꾸지 않는다.

## 3. 순수 모델·component 시나리오

| ID | 시나리오 | 합격 조건 | 이번 결과 |
| --- | --- | --- | --- |
| QA-M01 | 다섯 origin schema | 네 saved-plan origin과 authoring handoff가 같은 Plan→Item field order | PASS |
| QA-M02 | source/personal owner | source bytes 불변, 개인 overlay target만 변경 | PASS |
| QA-M03 | staged Item apply | Item 적용 뒤 durable storage 0, 부모 Plan draft만 변경 | PASS |
| QA-M04 | final Plan apply | revision·Undo snapshot·state target write 각각 정확히 1회 | PASS |
| QA-M05 | 취소·같은 값·stale | 성공 mutation과 성공 receipt 0 | PASS |
| QA-M06 | 날짜 3상태 | inherit/fixed/unscheduled와 execution placement를 독립 계산 | PASS |
| QA-M07 | 폴더 상속 | Flow Item의 독립 folder membership 0 | PASS |
| QA-M08 | impact summary | 포함·제외 ref/count가 실제 staged diff와 일치 | PASS |
| QA-M09 | save failure·retry | 이전 bytes 복구, 동일 retry 중복 Flow 0 | PASS |
| QA-M10 | Undo·reload | 이전 workspace와 필요한 authoring draft exact 복구 | PASS |
| QA-M11 | corrupted payload | 운영 write 없이 fail-closed | PASS |
| QA-M12 | copy/primary contract | 사용자 화면 내부 용어 0, 화면별 primary 1개 | PASS |

## 4. 브라우저 핵심 시나리오

| ID | 사용자 조작 | 합격 조건 | 이번 결과 |
| --- | --- | --- | --- |
| QA-B01 | 빈 원문에서 작성 시작 | editor와 작성 틀이 먼저 보이고 primary는 `결과 보기` 하나 | PASS |
| QA-B02 | 작성 Flow 저장·열기 | receipt primary 하나로 같은 개인 Flow 상세를 연다. | PASS |
| QA-B03 | saved-plan 네 origin 각각 열기 | 같은 Plan→Item 화면·field order·source/personal 구획 | PASS |
| QA-B04 | Item 수정 후 Plan 저장 | staged 변경 요약 뒤 최종 저장 1회, projection 동기화 | PASS |
| QA-B05 | 계획 날짜 변경 | 세 상태 전환과 기간 projection, source 날짜 보존 | PASS |
| QA-B06 | 실행 날짜 이동 | execution placement만 변경, Flow·폴더·source 유지 | PASS |
| QA-B07 | 오늘에서 완료·다시 열기 | 오늘·기간·Flow 상세에서 같은 상태 | PASS |
| QA-B08 | drag·long press·더보기·keyboard | 같은 transition·결과·receipt | PASS |
| QA-B09 | 같은 위치·취소·Escape·pointer cancel | mutation 0, opener focus와 scroll 복귀 | PASS |
| QA-B10 | 저장 오류·retry·Undo | 성공 표시 0, 이전 bytes, retry 성공, Undo 복구 | PASS |
| QA-B11 | reload·손상 payload | 마지막 성공 상태 복원, 손상 시 기존 `/my`로 fail-closed | PASS |
| QA-B12 | React·단일 HTML parity | 허용된 fixture 차이 밖 행동명·상태·next-state 일치 | PASS |

## 5. 화면·제품성 검사

각 화면에서 아래 값을 함께 기록한다.

- document horizontal overflow
- console error와 page error
- failed internal request
- replacement character
- header 중복 층 수
- 화면 primary action 수
- editor·첫 Item·primary action hit-test와 rect 교차
- 기본 화면의 `PoC`, `shadow`, `write`, `mutation`, 내부 ref/fingerprint/Stage 노출 수

| viewport | 필수 판정 | 이번 결과 |
| --- | --- | --- |
| 320×700 | 한 층 header, 16px input, 48px target, editor·CTA·첫 Item 가림 0 | PASS |
| 375×812 | 작성/결과 compact 상태, picker·review 내부 scroll, primary 1개 | PASS |
| 390×844 | source/personal 구획, focus return, safe-area와 action 경계 | PASS |
| 844×390 | compact header, active panel scroll, 마지막 행동 접근 | PASS |
| 1024×768 | 두 pane 독립 scroll, 빈 세 번째 열·nested modal 0 | PASS |
| 1440×900 | 정보·편집 위계, 첫 task와 저장 행동, 과도한 빈 공간 0 | PASS |
| 200% 등가 reflow | 자동 proxy의 overflow·겹침 0 | PASS |

실제 browser 200% text zoom은 위 자동 proxy와 별도로 미실행 상태를 유지한다.

## 6. 접근성·keyboard

| ID | 검사 | 이번 결과 |
| --- | --- | --- |
| QA-A01 | 모든 control의 visible name과 48px 주 target | PASS (자동 assertion) |
| QA-A02 | Tab·Shift+Tab의 시각 순서와 focus ring | PASS (자동 assertion) |
| QA-A03 | Enter/Space opener와 Escape close | PASS (자동 assertion) |
| QA-A04 | overlay close 뒤 정확한 opener focus·scroll 복귀 | PASS (자동 assertion) |
| QA-A05 | drag 없는 메뉴·keyboard 이동 | PASS (자동 assertion) |
| QA-A06 | ghost·guide의 접근성 tree 제외와 중복 source 낭독 0 | PASS (자동 assertion) |
| QA-A07 | reduced motion에서 같은 상태·focus 결과 | PASS (자동 assertion) |

screen reader 실기는 자동 assertion과 분리해 미실행으로 남긴다.

## 7. 저장 경계

시작 전에 fixture의 PoC key와 비-PoC `flow:*` sentinel key/value bytes를 따로 저장한다.

| 시나리오 | PoC 성공 mutation | 비-PoC mutation | 이번 결과 |
| --- | ---: | ---: | --- |
| browse·view·toggle·overlay open/close | 0 | 0 | PASS |
| editor draft 입력 | 허용 draft target만 | 0 | PASS |
| staged Item 적용 | durable 0 | 0 | PASS |
| 최종 Plan/authoring 저장 | 허용 state/draft transaction | 0 | PASS |
| 같은 값·취소·stale·IME·pointer cancel | 0 | 0 | PASS |
| 저장 오류 | 성공 mutation 0, 이전 bytes 복구 | 0 | PASS |
| Undo | 허용 snapshot 복원 | 0 | PASS |
| malformed payload | 0, fail-closed | 0 | PASS |

합격 조건:

- 허용 prefix 밖 `setItem` 0
- 허용 prefix 밖 `removeItem` 0
- `localStorage.clear()` 0
- 비-PoC sentinel key/value byte 차이 0
- 기존 completion·memo·date·archive·export writer 호출 0

## 8. 최종 실행 기록

| 실행 | 실제 실행 수 | 통과 | 실패 | 상태 |
| --- | ---: | ---: | ---: | --- |
| focused model/component | 269 | 269 | 0 | PASS |
| standalone node | 43 | 43 | 0 | PASS |
| React browser | 36 | 36 | 0 | PASS |
| standalone browser | 21 | 21 | 0 | PASS |
| report browser | 2 | 2 | 0 | PASS |
| 전체 browser logical tests | 59 | 59 | 0 | PASS |
| 관련 기존 회귀 | 220 | 220 | 0 | PASS |
| 전체 `npm test` | 1,534 | 1,533 | 1 | 기존 dog source 검토기한 1건 FAIL |
| production build | 1 | 1 | 0 | PASS, route 18개 |
| docs check | 4,594 links | 4,594 | 0 | PASS |
| diff check | 1 | 1 | 0 | PASS, whitespace error 0 |

## 9. 외부·게시 상태

| 증거 | 상태 | 자동화로 대체하는가 |
| --- | --- | --- |
| 실제 Android Chrome | 미실행 | 아니오 |
| 실제 iOS Safari | 미실행 | 아니오 |
| 실제 모바일 가상 키보드 | 미실행 | 아니오 |
| screen reader | 미실행 | 아니오 |
| 실제 browser 200% zoom | 미실행 | 아니오 |
| 관찰 사용자 | 0명 | 아니오 |
| commit·push·PR | 미진행 | 아니오 |
| Preview·Production | 미진행 | 아니오 |

## 10. Exit gate

- [x] PUX-01~16에 구현·fresh 자동화·화면 근거가 직접 연결됐다.
- [x] 새 작성 Flow와 네 saved-plan origin의 공통 상세·편집이 통과했다.
- [x] 내부 용어 0, 화면별 primary 1개, 지정 viewport 가림·오류 0이다.
- [x] staged 저장·실패·retry·Undo·reload가 통과했다.
- [x] storage 경계와 운영 sentinel bytes 불변이 통과했다.
- [x] 전체 회귀의 실제 결과를 PASS/FAIL 그대로 기록했다.
- [x] 실제 기기·보조기술·관찰 사용자·게시를 별도로 기록했다.
