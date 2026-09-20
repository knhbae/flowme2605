# K2-C React 결과·Undo adapter 검증

2026-09-05. **React adapter 구현과 freeze3 scoped 회귀 54/54, 최종 브라우저 18개 중 17 PASS/1 FAIL을 확인했다. Item A→B→A에서 이전 결과가 되살아나는 결함은 수정 후 PASS다. C05 native drag는 시작 직후 종료되어 실패했고 원인은 미확정이다.** 이 문서는 React 담당 범위의 증거 원장이다. 전체 K2-C 또는 통합 제품 완료 판정이 아니며, standalone·전체 최종 원장·HTML 보고서는 별도다.

## 1. 이번에 연결한 요구와 화면

정본은 [K2-C 설계](./k2c-design.md)다. V41-042·BP-060·BP-063 / P3K-V41-05의 변경 결과·되돌리기·닫기 발견성을 중심으로, BP-076의 날짜/폴더 독립성과 V41-043의 공통 transition을 보존했다. V41-024·V41-056의 날짜 중복 제거는 React 기간 TaskRow가 이미 날짜를 반복하지 않고 시간·Flow/폴더 경로를 표시하므로, 추가 정보 삭제 없이 회귀 대상으로 두었다. 이 근거로 P3K-V41-03/05 전체를 일괄 충족 처리하지 않는다.

| 화면·행동 | React 연결 | 보호한 경계 |
| --- | --- | --- |
| 오늘·주간·월간·날짜 미정 | 일반 날짜/폴더/순서/완료/다시 열기 성공 후 본문 결과·Undo·닫기 | 실제 마지막 성공 상태의 exact raw와 기존 snapshot을 함께 확인 |
| 마지막 행·날짜 그룹이 사라짐 | 원래 context/key와 행 위치에 UI-only 빈 그룹·결과 anchor 유지 | 원본 tasks, count, reorder 입력에는 placeholder를 넣지 않음 |
| 폴더 | Flow 카드 또는 Quick 목록 안의 결과 슬롯 | Flow Item 폴더 상속, 날짜 독립, 충돌 없는 ref 유지 |
| Flow 실행 Todo | 호출자가 선택한 exact Item 행 뒤에 optional 결과 슬롯 | shared component에 slot을 주지 않는 기존 화면은 동일 DOM |
| Item 상세 | 해당 개인 행동 toolbar 뒤에 결과 표시 | 원문 설명·완료 기준·개인 메모·writer는 변경하지 않음 |
| Undo | contextual·header·모바일 설정에서 현재 ordinary owner가 있으면 같은 guarded Undo 사용 | 새 history, 별도 snapshot, 저장 key/schema 추가 없음 |
| 저장/취소/오류/편집/영수증 | 기존 오류·pending·전용 receipt 우선. 일반 성공의 중복 global live만 억제 | 성공 이전 readback, CAS, rollback, editor guard는 기존 writer 그대로 |
| 외부 바이트 변화 | storage event의 newValue 및 적용 직전 exact raw 검사. 관측한 A→B→A도 이전 owner 무효화 | UI의 오래된 결과가 쓰기 권한을 대신하지 않음 |

결과 연결 정보는 [공통 순수 owner 모델](../../../lib/flow/personal-workspace-poc-contextual-result.ts)의 ticket/state를 복제하지 않고 동기 ref에 반영한다. `setState`보다 먼저 ref를 갱신해 빠른 이중 Undo를 막고, 저장 성공은 기존 writer/readback 뒤에만 확정한다. 화면·편집·receipt·source owner 전환으로 결과를 숨겨도 저장 snapshot을 지우지 않는다. 일반 화면 reload는 “방금 이동” 결과를 새로 만들지 않는다.

일반 adapter 직접 대상은 `move-date`, `move-folder`, `reorder`, `reset-order`, `complete`다. 별도 occurrence 날짜/완료와 기존 authoring/변환/editor receipt는 기존 경로를 유지하며, 이번 구현이 그 모든 경로에 새 ordinary 결과를 추가했다고 표현하지 않는다.

## 2. 소유 변경과 BEFORE

| 파일 | 이번 변경 | BEFORE SHA-256 |
| --- | --- | --- |
| [PersonalWorkspacePocSurface.tsx](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx) | 기존 dirty 수정 보존 후 pure owner adapter·본문 결과·Undo·focus 연결 | `286249040F9AAF10302742B7F3AD1A33FAD6AC090F2BB952C0B3538AB8E6BE21` |
| [DateGroupedTodoList.tsx](../../../components/flow/DateGroupedTodoList.tsx) | optional `renderAfterItem`만 추가 | `2F1A7AE7B9A2F6F600C7EE8764B1B6EEDC8199389D14A8FDE61269812623A1B1` |
| [MyPlanExecutionSurface.tsx](../../../components/flow/my-flow/MyPlanExecutionSurface.tsx) | optional renderer를 Todo에 전달 | `6B4A1A0D2102D55451A48E8B24059756ECD174AEA4222C5843832381CA333204` |

원본 복사는 BEFORE 폴더 (로컬 전용 근거: `../../../output/poc-gap-implementation/k2c/before-react-adapter/`)에 보존했다. 공유 두 파일은 작업 전 Git clean을 확인한 뒤 범위를 별도 승인받았다. slot이 없으면 wrapper·class·role·행 구조를 새로 만들지 않는다. 슬롯이 있는 PoC도 실제 내용이 없는 행에는 추가 wrapper를 만들지 않는다.

새 [SSR 검사](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocContextualResult.test.tsx) 8개를 추가했다. 기존 Surface 검사 1개 안의 receipt 변수명 하드코딩 assertion 2곳은 합성 owner 변수명으로 현행화하고 `receipt || contextual` 식 자체도 검사했다. 해당 테스트 BEFORE SHA는 `D850371CCC740B4D08786676DE3DA18DAE3CD724F81CFAA9237C8FCA2E03278B`다. 조건을 제거해 실패를 숨긴 변경이 아니다.

새 SSR 검사는 로컬 BEFORE 파일을 실제 실행해 현재 출력과 비교한다. 향후 clean CI에 편입하려면 캡처 fixture를 별도로 관리해야 한다. 현재 npm script에 자동 편입하지 않았다.

## 3. 공유 화면과 자동 검사

| 실행 | 결과 | 해석·원본 증거 |
| --- | --- | --- |
| 신규 SSR 최초 | 8/8 PASS | public/saved Todo, 4 composition MyPlan의 slot 미지정 HTML byte-identical, exact-ref slot/행수 보존, null slot 동일 출력 |
| 신규 SSR 재실행 | 8/8 PASS | 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k2c/react-shared-slots-2026-09-05.log`). 같은 8개 재실행이며 새 고유 검사 8개 추가가 아님 |
| 기존+신규 최초 scoped | 53/54 PASS | 기존 live owner 정규식 1개가 변수명 확장을 인식하지 못한 계약 현행화 필요. 제품 live 동작 실패로 판정하지 않음 |
| 정규식 현행화 후 scoped | 54/54 PASS | 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k2c/react-shared-regression-2026-09-05.log`) |
| focus 수정 후 freeze2 scoped | 54/54 PASS | 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k2c/react-shared-regression-freeze2-2026-09-05.log`) |
| Item 선택 owner 수정 후 freeze3 scoped | 54/54 PASS | 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k2c/react-shared-regression-freeze3-2026-09-05.log`). 같은 고유 54개 재실행이며 Item 왕복 행동의 브라우저 GREEN을 대신하지 않음 |
| production 대상 TypeScript | exit 0 | `tsc --noEmit --incremental false -p tsconfig.next.json`. freeze1 시점, focus 수정 후 최종 build는 root 원장 참조 |
| 일반 `tsc --noEmit` | FAIL | 기존 tests/output TSX 백업까지 포함한 여러 오류. 신규 Undo의 now 누락 1개는 수정했지만 일반 tsc 전체 PASS라고 보고하지 않음 |
| root 실행, freeze3 전체 npm | 2,249/2,249 PASS | JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k2c/npm-test-final-b86-freeze3-2026-09-05T08-10-57-881Z.json`). 15개 실행 그룹의 실제 합계, exit 0. scoped 54 일부와 중복되므로 더해 고유 검사 수로 만들지 않음 |
| root 실행, freeze3 production build | exit 0, static 18/18 | 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k2c/production-build-freeze3-2026-09-05T08-10-47-052Z.log`). Item owner 의존성 수정 포함. 이 build 결과만으로 브라우저 행동 PASS를 선언하지 않음 |

scoped 고유 검사는 **54개이며 신규 8개가 그 안에 포함**된다. 공유 기본 UI 보존을 검증한 것은 이 fixture들의 HTML 문자열이며, 모든 운영 화면의 시각 검사를 대신하지 않는다. React 담당자는 전체 npm/build를 직접 실행하지 않았으며 root 실행과 중복 집계하지 않는다.

## 4. focus 보조 검사: 실패와 수정

새 focus 진단 spec (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k2c-react-focus-smoke.spec.ts`)의 고유 등록은 2개다. 둘 다 전체 React inventory의 행동과 겹치는 보조 재현이므로 전체 18개와 더해 20개 독립 시나리오로 합산하지 않는다.

| 실행 | 결과 | 원인·증거 |
| --- | --- | --- |
| 최초 보조 | 0/2, timeout | period 완료를 `role=checkbox`로 잘못 찾은 하니스. 실제 `personal-workspace-complete` button/aria-pressed로 정정. JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k2c/react-focus-red-2026-09-05.json`) |
| 하니스 정정, 기존 DOM 기준 | 1/2 | 키보드 닫기→BODY는 실제 FAIL. 직접 완료의 viewport rect PASS는 아래 시각 검사로 불충분함을 확인. JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k2c/react-focus-product-red-2026-09-05.json`) |
| 같은 freeze1, 9점 hit 강화 | 0/2 | Undo 9점 중 6점이 global mobile nav에 가림. keyboard close focus FAIL 유지. JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k2c/react-focus-hit-red-2026-09-05.json`) |
| freeze2 최종 | 2/2 PASS, 28.340초 | 실제 hit/focus/저장 경계 재검증. JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k2c/react-focus-green-2026-09-05.json`) |

등록 테스트 실행은 2개 × 4회 = **8회**다. DOM 검사의 초기 1 PASS를 시각 완성도 PASS로 재사용하지 않는다. timeout 실행은 정상 종료한 storage-boundary 증거가 아니므로, 아래 경계 수치는 최종 2 context에만 해당한다.

### F01 — 직접 완료 결과가 하단 메뉴에 가림

390×844의 30개 Quick 목록 맨 아래에서 완료했다. 수정 전 Undo rect는 top 755 / bottom 803으로 viewport 844 안이었지만, 하단 메뉴가 약 y775부터 겹쳐 9점 중 6점을 가렸다. 수정 전 화면 (로컬 전용 근거: `../../../output/poc-gap-implementation/k2c/react-focus-hit-red-2026-09-05/personal-workspace-k2c-rea-cdf08-ls-the-full-result-and-Undo/direct-complete-390x844.png`)을 직접 열어 확인했다.

수정은 본문 결과에 기존 mobile tab clearance를 scroll margin으로 적용하고, 현재 성공 owner가 남아 있을 때만 다음 frame에 nearest-scroll하는 범위다. pointer 초점을 결과/Undo로 옮기지 않는다. 모델·전역 nav·저장 스키마는 바꾸지 않았다.

수정 후 Undo top 674 / bottom 722, **9/9 hit**, 기존 완료 button focus 유지다. 수정 후 화면 (로컬 전용 근거: `../../../output/poc-gap-implementation/k2c/react-focus-green-2026-09-05/personal-workspace-k2c-rea-cdf08-ls-the-full-result-and-Undo/direct-complete-390x844.png`)에서도 하단 메뉴와 결과 행동 사이의 간격을 직접 확인했다. 이 한 화면이 다른 모든 해상도의 가림 0 증거는 아니다.

### F02 — 키보드 결과 닫기 후 초점 소실

결과 닫기 button에 focus한 뒤 Enter를 누르면 결과가 사라지며 activeElement가 BODY가 됐다. 닫기 자체의 bytes/API 변화는 0이었다. 기능 안전과 키보드 UX 결함을 구분했다.

수정 후 keyboard 닫기에서만 exact origin opener, 없으면 현재 Flow/목록 heading으로 돌아간다. 복귀 callback은 epoch와 origin 일치를 다시 확인한다. pointer 닫기는 새 focus를 강제로 만들지 않는다. 최종 화면 (로컬 전용 근거: `../../../output/poc-gap-implementation/k2c/react-focus-green-2026-09-05/personal-workspace-k2c-rea-509ee-xact-origin-without-writing/keyboard-dismiss-390x844.png`)과 JSON은 정확한 `focus-0` Quick opener focus, 닫기 추가 API 0, raw 동일을 확인한다.

### F03 — 같은 Flow 안의 Item 왕복에서 이전 결과가 되살아남

freeze2의 1440 화면에서 Item A 상세 완료→Item B 선택→Item A 재선택을 실행했다. B에서는 결과 DOM이 0개였지만 A로 돌아오면 이전 결과가 1개 다시 나타났다. 실제 RED JSON (로컬 전용 근거: `../../../output/playwright/k2c-react-item-owner-red-20260905-01.json`)의 `c09-same-flow-active-item-roundtrip` 첨부와 exact Item ref를 확인했다. 이 검사는 전체 inventory에 추가된 18번째 고유 검사다.

원인은 화면/source owner 무효화 effect에 `activeItemRef`가 없던 것이다. freeze3에서 의존성에 이 값만 추가했다. 기존 성공 snapshot이나 header의 일반 Undo는 지우지 않고, 이전 항목의 일시적 결과 owner만 무효화한다. 수정 후 Surface SHA-256은 `001768710C275C7CB4EAF9EE9E0A263B0D8F0F75A475E267AE5F5FFCB9B4C6E2`다. scoped 54/54와 아래 freeze3 최종 브라우저의 해당 행동이 모두 PASS다.

## 5. freeze2 최종 보조 실행의 저장 경계

최종 실행의 Surface SHA-256은 `AC11B5D2FC4AF96809E5EA289450B3F38F6F3F340B40698CAE3A4783ADCCD9F5`, BUILD_ID는 `bxsKsrh__9mw9ggbCoFJQ`다. 각 JSON의 `focus-runtime.json`과 `focus-boundary.json`을 참조한다.

- HTTP 격리 Chromium context **2개**, context당 운영 `flow:k2c:focus-sentinel` 1개 byte-for-byte 동일. 실제 사용자 profile/운영 실데이터 전체를 읽어 검증한 결과가 아니다.
- context당 완료 target state `setItem` 1회, 기존 recovery journal/commit marker 보조 호출 4회 = **API 5회**. 총 10 API이며 logical 완료 2회다.
- 허용 prefix 밖 호출 0, `clear` 0, console error/page error 0, document 가로 overflow 0.
- keyboard 닫기 구간 추가 API 0 및 state raw 동일. fixture 준비의 native set은 제품 API 집계와 분리했다.
- 실제 Android Chrome·iOS Safari·실제 IME·보조기술 검사 **NOT_RUN**, 관찰 사용자 **0명**.

이 결과는 원문·운영 writer를 변경하지 않는 React UI adapter의 좁은 경계 근거다. 네 origin 전체와 실제 운영 저장 공간 전체 불변, 모든 viewport, 복구 matrix를 이 보조 2개만으로 완료 선언하지 않는다.

### freeze3 전체 React inventory — 담당자 실행 후 원본 JSON 대조

최종 JSON (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-final-20260905-01.json`), BUILD_ID `ppguj8lab6ZRyeueMcevG`. 실제 등록 18개 중 17 PASS/1 FAIL, skipped 0/flaky 0, 142.099초다. 최초 17개 14 PASS/3 FAIL과 이 재실행을 합쳐 새로운 고유 검사 수로 만들지 않는다.

- PASS: C01 마지막 날짜 그룹의 anchor/Undo, C02 Quick·Flow 폴더와 Item 날짜 독립, C03 순서/시간순/Undo, C04 개인 완료·다른 사본·sourceChecked 보존, C06 no-op·취소·Escape·pointer cancel·밖·blur·resize 0쓰기, C07 read/quota/readback 및 별도 CAS 충돌, C08 연속 owner·이중 Undo, C09 전용 receipt와 일반 결과 owner, C10 편집 실패 우선권, C11 닫기/reload·외부 drift/ABA·손상 reload, C12/C13 explicit placement fixture의 다섯 viewport·정보 보존, Item A→B→A owner, 긴 목록 결과 접근, 키보드 결과 닫기다. 같은 C 번호의 등록 분리를 숨기지 않으며 정확한 18개 이름은 JSON에 있다.
- FAIL: C05의 메뉴·짧은 handle·키보드·합성 long press 하위 경로는 실행됐지만 첫 native drag가 종료되어 전체 등록 1개는 실패다. **Undo 결과가 보이는 상태의 연속 native drag는 앞선 실패 때문에 미실행**이다. 나머지 경로의 성공을 native 성공으로 바꾸지 않는다.
- 최종 격리 HTTP context **29개**, context마다 합성 운영 sentinel 1개 전후 byte-identical. 실제 사용자 profile의 모든 운영 데이터를 검사한 것은 아니다.
- mutation API 총 **310회**: setItem 186/removeItem 124. state key 70회, 기존 recovery key 124회, commit-marker key 116회. API 결과 success 303/throw 7이며 이것은 성공 transaction 303회가 아니다. 실패 주입·rollback·journal 지원 호출을 포함한다.
- 허용 prefix 밖 0, clear 0, sentinel 불일치 0, console/page error 0. 본문 시나리오가 실패한 C05에서도 afterEach 저장 경계는 별도로 기록됐다.
- 다섯 viewport success/failure PNG 10개는 `fullPage: false`와 캡처 전후 상태 동일 검사로 다시 보존했다. 직접 시각 평가의 최종 판정은 담당자·root의 별도 원장에 연결하며, DOM 수치만으로 모든 픽셀 가림 0을 선언하지 않는다.

## 6. 대기·확인할 사항

1. 전체 React 브라우저 spec (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k2c-react-contextual-result.spec.ts`)은 최종 **17/18 PASS**다. C05 native 경로 실패가 남았으므로 V41-043의 모든 입력 동등성 또는 K2-C 전체 완료로 판정하지 않는다.
2. native drag 원인과 연속 native 조건이 남았다. 최초 Playwright `mouse.move` timeout 뒤 별도 Chromium Input interception으로 실제 시작/종료를 기록했다. 최종 probe OFF에서는 27ms 뒤 종료, scrollY 0·document 높이 861 유지, 이전 결과 없음, 같은 연결 source DOM이며 제거/disabled/draggable 변경 0·class 변경만 관측됐다. document bubble 시점 `defaultPrevented=false`, effectAllowed `move`, custom MIME 존재다. native 구간 focus 억제는 실제 호출 0·같은 실패, text/plain 병행 A/B (로컬 전용 근거: `../../../output/playwright/k2c-react-native-mime-ab-20260905-01.json`)도 실제 추가 후 같은 실패였다. 첫 진단 (로컬 전용 근거: `../../../output/playwright/k2c-react-native-diagnostic-20260905-02.json`), focus A/B (로컬 전용 근거: `../../../output/playwright/k2c-react-native-focus-ab-20260905-01.json`)와 최종 기록을 구분하며, 가설에 따른 제품 수정은 하지 않았다. source opacity/style이 원인이라는 증거도 아직 없다. 이를 ‘지원하지 않음’이나 standalone의 scroll clamp와 같은 원인으로 확정하지 않는다.
3. **Item A 상세 성공→같은 Flow Item B 상세 선택→A 복귀**의 실제 결함은 F03의 수정 후 최종 production 브라우저 PASS로 닫았다. 저장 snapshot과 기존 header Undo는 보존됐다.
4. 원문 `시간: 09:30`이 `sourceTimingLabel`에는 있으나 개인 placement time이 없으면 기간 행에 나오지 않는 기존 필드 투영 gap을 별도 [K3-B 메모](./k2c-found-k3b-source-time.md)로 남겼다. 독립 RED JSON (로컬 전용 근거: `../../../output/playwright/k3b-react-source-time-red-20260905-01.json`)은 source/raw 보존과 storage API 0을 기록한다. C12의 5개 viewport geometry는 explicit placement.time fixture로 분리했으며, 이를 원문 시간 요구 충족의 증거로 쓰지 않는다. Sheet 줄바꿈·전체 시인성도 K3 범위로 남는다.
5. root의 freeze3 전체 npm 2,249/2,249와 production build static 18/18을 §3에 연결했다. docs:check, standalone, 최종 보호 원장과 HTML 보고서는 root 담당 최종 결과와 별도로 대조해야 한다.
6. C12 초기 `fullPage` 캡처가 844×390에서 resize 취소를 일으켜, 검사 직전 failure와 PNG의 canceled가 달라졌다. 그 PNG는 실패 상태의 최종 시각 증거로 사용하지 않는다. 최종판에는 정확 viewport 캡처와 캡처 전후 상태 동일 검사를 적용했다.

commit·push·PR·Preview·Production은 모두 진행하지 않았다. 이 문서는 새 QA 원장만 작성했으며 기존 제품 목표나 영구 정책을 새로 확정하지 않는다.
