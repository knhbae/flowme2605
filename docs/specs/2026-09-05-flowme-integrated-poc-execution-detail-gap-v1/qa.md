# P3-J 검증 기록

- 작성일: 2026-09-05
- 상태: `VERIFIED` — 최종 제품·회귀·리포트 검사와 문서·소유 범위 종료 감사 완료
- 요구와 설계: [spec.md](./spec.md)
- 검증 fixture는 source 정보와 개인 정보를 구별할 수 있도록 서로 다른 문구를 사용한다. 화면에 테스트 문자열이 존재하는지만 확인하지 않고 값의 소유자, 같은 ref, 쓰기 호출과 저장 bytes를 함께 판정한다.

## 1. 시뮬레이션과 요구 매핑

| ID | 요구·연결 | 조작·입력 | 합격 기준 | 현재 결과 |
| --- | --- | --- | --- | --- |
| EJ-01 | D1-005.5 / D1-017.5 | 완료 기준이 있는 source bundle을 read model에 투영하고 Item 상세 열기 | `item_id`가 일치한 원문 완료 기준을 별도 읽기 전용 필드로 표시. source bundle bytes 불변 | PASS · 모델 및 네 origin 브라우저 |
| EJ-02 | D1-017.3/.6 | 원문 설명, imported 개인 메모, PoC 개인 메모를 서로 다른 문자열로 준비 | 원문 설명과 내 메모가 별도 구획. 개인 메모의 기존 우선순위를 지키며 원문 설명을 덮어쓰지 않음 | PASS · 모델 및 두 runtime lifecycle |
| EJ-03 | D1-017.5 identity | 같은 공개 Flow의 서로 다른 savedCopy와 겹치는 itemId, 다른 Item의 criteria 준비 | exact savedCopy/flow/item에 해당하는 기준만 표시. 제목/순서 fallback으로 다른 값을 선택하지 않음 | PASS · helper/read model identity |
| EJ-04 | 무추정·fail-closed | criteria 없는 source, empty text, foreign/stale source line map, 손상 payload | 없는 기준을 만들지 않음. malformed payload는 기존 fail-closed. 무효 열기/해석/탐색 write 0 | PASS · 모델, unsupported origin, 기존 negative 회귀 |
| EJ-05 | 개발2 D2-035→개발1 상세 | 일반 작성 Flow에 설명·완료 기준 입력 → 명시적 개인 저장 → Item 열기 | parsed snapshot의 기준이 정확한 Item 상세에 나타남. rawText·revision·fingerprint·lineage 유지 | PASS · 두 runtime authored lifecycle |
| EJ-06 | v4.1 Today↔Flow↔결과 | 같은 dated Item을 Today, Flow, 실제 상세 opener가 있는 결과에서 차례로 열고 돌아가기 | 같은 ref·원문 설명·완료 기준·개인 메모. 기존 view/date/선택/focus 복귀; 없는 opener를 새로 만들지 않음 | PASS · 네 origin·다섯 viewport 및 result linkage 2개 재실행 |
| EJ-07 | 개인 편집·staged 저장 | Item 개인 메모 변경→계획 반영→부모 저장→상세 재열기 | Item apply 전 persistent target write 0, 부모 저장 기존 transaction. 바뀐 것은 개인 메모이며 기준·설명·source 일정 불변 | PASS · authored 및 Stage 3 staged 회귀 |
| EJ-08 | 완료·다시 열기·Undo·reload | Today에서 완료→Flow 확인→다시 열기→개인 변경 Undo→reload | execution 상태만 변경. source 기준 유지. 마지막 성공 상태 복구 | PASS · 두 runtime lifecycle 및 reload 회귀 |
| EJ-09 | D1-023 관련 회귀 | 결과 형식 전환→상세→돌아가기, Calendar 선택 날짜 확인 | 같은 ref/date/completion과 결과 형식·선택 날짜·복귀 유지. 탐색 write 0. 기준일/형식 분리의 기존 판정 유지; 금회 anchor/baseDate 변경 재시험 아님 | PASS · Stage 3 및 P3-J 연결 검사 범위 |
| EJ-10 | D1-024 회귀 | multi-child 결과에서 Item 열기→다른 child 선택; 같은/stale/foreign child도 입력 | 유효 변경 시 Text reset·열린 상세 닫기·결과 focus 복귀. 무효 입력 무변경. write 0 | PASS · Stage 2 Map 선택·최초 child 회귀 |
| EJ-11 | 취소·실패·복구 | 상세 clean close, dirty 취소/Escape, 주입 저장 오류와 재시도 | 취소/실패에서 성공 mutation 없음 또는 기존 exact rollback. 원문 기준·설명 유지, retry 성공 범위만 저장 | PASS · Stage 3 cancel/Escape/Back·failure/retry/Undo |
| EJ-12 | gate·storage boundary | default `/my`, 잘못된 query/origin/payload, 성공·실패·reload 전체 전후 비교 | exact gate 밖 새 동작 없음. 허용 prefix 밖 setItem/removeItem/clear 각각 0. 운영 fixture bytes 동일 | PASS · 전용 및 기존 negative 회귀 |

EJ-01~05는 데이터 전달 공백의 직접 증거다. EJ-06~08은 세 산출물이 합류하는 실행 흐름의 증거다. EJ-09/10은 이미 충족된 요구의 회귀이므로 갭 감소로 세지 않는다. EJ-11/12는 경계와 오류 복구 증거다.

EJ-06의 결과 연결은 직접 재확인 로그 (로컬 전용 근거: `../../../output/playwright/p3j-final-result-linkage.log`) 2/2로 보강했다. React는 Text·Todo·Sheet·Calendar 네 결과에서 같은 ref의 Item 편집을 열어 읽기 전용 원문·완료 기준과 개인 메모 값을 확인했다. 취소하면 원래 결과 탭·Calendar 선택 날짜(`aria-pressed`)·opener focus가 복구되고 탐색 write는 0이다. 결과 anchor/baseDate 자체를 변경한 검사는 아니다. standalone은 기존 Todo·Calendar 상세 opener에서 같은 값을 확인했으며 TXT·Sheet는 기존대로 opener가 0개다. 이 차이를 네 결과 모두 같은 상세 동선이라고 표현하지 않으며, 이번 작업에서 새 opener를 만들지 않았다. 기존 lifecycle 2개를 강화해 재실행한 것이므로 제품 고유 테스트 26개에 더하지 않는다.

## 2. 자동 검증 실행 원장

| 검사 | 실행 명령·증거 경로 | 실행 수 | 결과 |
| --- | --- | --- | --- |
| helper·read model·composition·view·component 회귀 | wrap 수정 후 최종 로그 (로컬 전용 근거: `../../../output/p3j-focused-wrapfix.log`); source 정보·정확한 identity·meal slot 경로 포함 | 58/58 | PASS |
| standalone model·계약 | 최종 로그 (로컬 전용 근거: `../../../output/p3j-standalone-final.log`) | 96/96 | PASS |
| React 전용 browser | `personal-workspace-p3j-execution-detail.spec.ts`; 최종 로그 (로컬 전용 근거: `../../../output/playwright/p3j-final-wrapfix-v2.log`) | 11/11 | PASS |
| standalone browser | `personal-workspace-p3j-standalone-detail.spec.ts`; 최종 로그 (로컬 전용 근거: `../../../output/playwright/p3j-final-wrapfix-v2.log`) | 7/7 | PASS |
| 기존 D1·negative browser | Stage 1/2/3에서 고른 기존 회귀; 최종 로그 (로컬 전용 근거: `../../../output/playwright/p3j-final-wrapfix-regression.log`) | 8/8 | PASS |
| 결과→상세 직접 근거 보강 | 기존 authored lifecycle의 기준·메모·복귀·write 0 검사 추가; 재실행 로그 (로컬 전용 근거: `../../../output/playwright/p3j-final-result-linkage.log`) | 2/2 재실행 | PASS · 제품 26에 중복 포함 |
| 원본 캡처·SHA 보존 | `personal-workspace-p3j-reference-capture.spec.ts`; 전용 browser 로그 내 별도 실행 | 1/1 | PASS · 제품 26에 합산하지 않음 |
| 전체 자동 회귀 | `npm test`; wrap 수정 후 최종 로그 (로컬 전용 근거: `../../../output/p3j-npm-test-wrapfix.log`) | 2,210/2,210 | PASS |
| production build | `npm run build`; wrap 수정 후 최종 로그 (로컬 전용 근거: `../../../output/p3j-build-wrapfix.log`) | 18/18 페이지 | PASS |
| 요구 추적표 | builder 및 전체 trace assets; 최종 로그 (로컬 전용 근거: `../../../output/p3j-trace-final.log`) | 65/65 | PASS |
| 두 보고서 renderer | 새 검증 리포트·추적표 각각 390/1440, exact allowlist loopback 서버; 실행 JSON (로컬 전용 근거: `../../../output/p3j-report-qa-final.json`) | 4/4 | PASS |
| 문서 검사 | `npm run docs:check`; 검사 로그 (로컬 전용 근거: `../../../output/p3j-docs-check.log`) | 필수 문서 16개·로컬 링크 4,696개 | PASS |

과거 단계의 2,201건, 60건 등은 이번 재실행 개수로 복사하지 않는다. 전체 테스트의 실제 15개 그룹은 `177 + 455 + 68 + 78 + 38 + 24 + 39 + 7 + 27 + 29 + 23 + 391 + 634 + 201 + 19 = 2,210`이며 모든 그룹의 fail은 0이다. focused 58개와 standalone 96개를 이 수에 더해 고유 테스트 수처럼 표현하지 않는다. 선택한 제품 브라우저 고유 테스트는 `11 + 7 + 8 = 26`개다. 별도 원본 캡처 1개와 반복한 stress 10개는 이 26개에 더하지 않는다. 초기 화면 검사가 통과한 뒤 직접 캡처 비교에서 내부 잘림을 발견했고, CSS 수정·검사 강화 후 최종 26개를 다시 통과했다.

리포트 첫 검사에서는 새 HTML 2개 화면은 통과했지만 추적표의 원본 명세 링크 2개가 존재하지 않는 PoC 경로를 가리켜 실패했다. 실제 원본이 있는 main의 읽기 경로로 builder 링크만 고친 뒤 4개 화면을 다시 통과했다. 이 두 링크 결함은 제품 요구 갭 해결 수에 넣지 않는다. 검사 서버는 이번 두 HTML과 참조 PNG만 읽는 exact allowlist loopback 서버이며 검사 종료 시 닫는다. 배포·외부 호스팅이 아니다. 허용 원본 HTML·PNG의 SHA-256 전후 값과 화면별 넘침·이미지·링크·오류 수는 실행 JSON attachment에 기록한다. 문서 전체 가로 넘침·console/page error·실패한 이미지 요청은 0이며, 리포트 접기/펼치기는 키보드 Enter로 조작했다.

## 3. 화면별 평가

| viewport | React 상세·복귀 | standalone 상세·복귀 | 가로 넘침 | 핵심 행동 가림 | console/page error | 증거 |
| --- | --- | --- | --- | --- | --- | --- |
| 390×844 | PASS | PASS | 0 | 0 | 0 | React (로컬 전용 근거: `../../../output/playwright/p3j/execution-detail-390x844.png`) · standalone (로컬 전용 근거: `../../../output/playwright/p3j/standalone-detail-390x844.png`) |
| 375×812 | PASS | PASS | 0 | 0 | 0 | React (로컬 전용 근거: `../../../output/playwright/p3j/execution-detail-375x812.png`) · standalone (로컬 전용 근거: `../../../output/playwright/p3j/standalone-detail-375x812.png`) |
| 844×390 | PASS | PASS | 0 | 0 | 0 | React (로컬 전용 근거: `../../../output/playwright/p3j/execution-detail-844x390.png`) · standalone (로컬 전용 근거: `../../../output/playwright/p3j/standalone-detail-844x390.png`) |
| 1024×768 | PASS | PASS | 0 | 0 | 0 | React (로컬 전용 근거: `../../../output/playwright/p3j/execution-detail-1024x768.png`) · standalone (로컬 전용 근거: `../../../output/playwright/p3j/standalone-detail-1024x768.png`) |
| 1440×900 | PASS | PASS | 0 | 0 | 0 | React (로컬 전용 근거: `../../../output/playwright/p3j/execution-detail-1440x900.png`) · standalone (로컬 전용 근거: `../../../output/playwright/p3j/standalone-detail-1440x900.png`) |

각 크기에서 긴 원문 설명·긴 기준·개인 메모를 함께 넣는다. 스크롤 후 `돌아가기`, 저장 또는 계획 반영을 실제로 누를 수 있는지 확인한다. 키보드 Tab/Enter/Escape를 포함한 비드래그 경로를 조작하고 초점 복귀를 확인한다. viewport 자동화는 실제 기기 검사로 부르지 않는다.

### 원본 화면과 현재 구현의 비교 기준

원본 개발1 상세 캡처 (로컬 전용 근거: `../../../output/playwright/p3j/reference-d1-execution-detail.png`)는 원본 HTML의 320px 모형 영역이다. 현재 구현은 지정 다섯 화면 크기에서 평가하므로 전체 화면의 픽셀 동일성을 주장하지 않는다. 원본을 읽기만 한 전후 SHA는 capture test로 확인한다.

| 비교점 | 원본 결정 | 현재 적용 방식 | 판정 범위 |
| --- | --- | --- | --- |
| 정보 구획 | 원문 기준과 내 메모를 분리 | 원문 설명·완료 기준·내 메모를 별도 구획으로 표시 | 실제 값·소유권·표시 구분 |
| 완료 기준 | 읽기 전용 원문 정보 | 기준이 있는 정확한 Item에서만 표시, 값 없으면 생략 | read projection; 기준 정책을 새로 만들지 않음 |
| 편집 문법 | Item의 계획 반영은 부모 초안 | 기존 staged Plan→Item 흐름 유지 | 새 즉시 저장 버튼 추가 없음 |
| 색·글꼴 | 각 원본의 기존 제품 문법 | React 청색·standalone 청록 theme와 기존 글꼴 재사용 | 두 runtime의 동일 디자인·픽셀 복제 주장 없음 |
| 화면·스크롤 | 작은 화면에서도 정보와 행동 접근 | 짧은 화면 내부 세로 scroll, 긴 token anywhere 줄바꿈 | 최종 wrap 수정 뒤 내부 overflow·text bounds·CTA 조작 재검증 |

기존 `상세` 라벨을 `원문 설명`으로 좁히고 보유한 `완료 기준`과 `내 메모`를 드러낸 것은 원본 구분을 복구하려는 변경이다. 별도 새 행동 버튼은 추가하지 않았다.

## 4. before/after 판정

| 실제 결함 | before 증거 | 기대 after | 최종 결과 |
| --- | --- | --- | --- |
| 완료 기준 전달 누락 | source `itemDetails`·authored `parsedItems`에 값이 있으나 PoC read/caller가 전달하지 않음 | exact Item의 criteria가 두 runtime의 상세·편집에 표시; meal slot도 동일 exact join | 구현·모델·브라우저 PASS |
| source 설명·개인 메모 혼합 | `task.description ?? task.memo` 한 `상세` 행, effective memo override | source 설명과 개인 메모가 독립된 읽기 projection·UI 구획 | 구현·모델·브라우저 PASS |
| parent/subcheck 판정 불일치 | D1 26/26 기록과 criteria 부분 하위 조건·실제 누락 동시 존재 | 새 부모 수 증가 없이 결함 수정 및 current evidence를 하위 조건에 연결 | 현재 layer로 하위 조건 3개 승격·2개 근거 갱신; 부모 증가 0 |
| 검증 중 React 긴 token 내부 잘림 | page overflow는 0이지만 내부 horizontal scroll로 긴 원문과 왼쪽 헤더가 잘린 캡처 | source 구획·ReadOnlyRow min-width와 anywhere 줄바꿈, 내부 scrollWidth·text range bounds 검사 | 수정·최종 다섯 화면 자동/직접 캡처 비교 PASS |

원문 전달·메모 혼합의 요구 누락 원인 2개와 캡처 비교에서 찾은 화면 결함 1개를 별도로 센다. 화면 결함은 자동 검사가 이미 통과했던 사실도 남기며, 검사를 강화한 뒤 최종 결과를 확정한다.

## 5. 데이터 불변 증거 범위

검사 전후 운영 `flow:*` fixture의 key 목록과 원시 value 문자열을 보관해 byte 단위로 비교한다. 허용 prefix 밖 `setItem`, `removeItem`, `clear` 호출 수를 각각 기록한다. source bundle, authored rawText/snapshot, 개인 날짜와 완료가 허용 transition 외에 바뀌지 않았는지 별도로 확인한다.

이 검사는 격리 테스트 context의 fixture 증거다. 사용자의 실제 브라우저 프로필, 운영 backend, 운영 계정 데이터를 검사했다는 뜻이 아니다.

원문 identity map이 없는 legacy authored snapshot과 source-update disposable projection은 기준을 추정하지 않는다. 이 경우의 기준 생략은 제한으로 남기며 기존 텍스트에서 다시 기준을 추출하는 정책을 이번에 만들지 않았다.

## 6. 미실행·발행 상태

실제 Android Chrome, iOS Safari, TalkBack, VoiceOver, OS 글자 확대, 실제 200% 검사는 `NOT_RUN`을 보존하며 이번 목표를 막지 않는다. 관찰 사용자 0명. commit·push·PR·Preview·Production 모두 미진행.
