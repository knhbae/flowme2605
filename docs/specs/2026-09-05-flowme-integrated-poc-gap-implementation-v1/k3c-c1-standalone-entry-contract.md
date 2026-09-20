# C1-b — 단일 HTML의 기존 Flow 찾기 연결

2026-09-06. **최소 읽기 연결 구현·검증, C1 전체는 진행 중.** 이 문서는 구현 전 정한 계약과 baseline을 보존한다. 현재 반영·미충족은 [C1-b QA](./k3c-c1-standalone-entry-qa.md)를 따른다. 전체 목표나 영구 제품 정책을 바꾸지 않는다. [C1 설계](./k3c-c1-entry-preview-design.md) §5 C1-b를 구체화하며 [React 왕복 QA](./k3c-c1-react-return-qa.md) 다음 순서다.

## 이번에 연결할 범위

| 원본 | 단일 HTML에서 확인할 요구 | 보호할 것 |
| --- | --- | --- |
| 개발1 | 기존 사본 검색·선택, 출처 유무, 원문/내 사본, 같은 네 결과, 목록·개인공간 왕복 | 실제 보유하지 않은 출처·Map·기준 생성 금지 |
| v4.1 | 선택한 실제 사본을 개인공간에서 확인 | 폴더·실행 날짜·완료·순서·Undo 변경 없이 읽기 |
| 개발2 | 작성 도중 별도 읽기 입구 사용과 작성 재개 | exact 원문, 같은 연결 textarea·native Undo, 제작 초안 검색과 분리 |

구현 전 동결본은 app `DF4E08A960A97D59926F7E17B195B1B65A376BC96186AE54E6D9E6B4C0869CF7`, 두 사용자 HTML `7D1610AACC5C3DF6F33C37BFE7C517700AC8FF56FED9793300E528E05F17E34E` / 각1,454,070bytes다. 현재 HTML은 QA의9183FC 검증본이다. React HiAh 검증으로 HTML의 새 기능을 통과 처리하지 않는다.

## 실제 데이터 차이와 제한

root가 `model.js`의 seed·현재 PD 입력 gate, `app.js`의 display/authoring/render, canonical `entry.ts`의 origin/Map 검사를 직접 확인했다. 별도 읽기 조사도 대조했다.

- 로컬 seed 네 사본은 savedCopyId/sourceFlowId/ref와 Item membership을 보유한다. `sourceTitle`은 원래 Flow/Item 제목이다. 이를 외부 출처명으로 표시하지 않는다.
- seed에는 대표 원문 URL·원문 설명·완료 기준이 없다. 빈 상태를 사실대로 표시한다. 개인 메모, 제목 뒤의 “완료”, Item 수를 원문 기준으로 합성하지 않는다.
- `moving`의 origin은 source-backed-map이지만 실제 mapId/child 관계가 없다. canonical React resolver는 이 경우 차단하며 그 gate는 변경하지 않는다.
- 단일 HTML에서는 이미 표시 가능한 이 **저장 사본 자체**를 찾고 읽는 경로만 연결한다. Map 관계는 “그룹 정보 없음”으로 표시하며 child 선택·Map 복원은 제공하지 않는다. 이것은 로컬 fixture 공급 차이를 드러내는 읽기 분기이지 canonical Map 판정의 우회나 네 origin 전체 동등성 완료가 아니다.
- standalone 판정 계약을 `flowme-standalone-personal-entry-v1`로 분리한다. 네 origin allowlist는 유지하고 authored/Quick 변환을 검색에 새로 넣지 않는다. 알 수 없는 origin, 손상된 입력·중복 identity·foreign membership·지원하지 않는 버전은 기존 gate로 닫는다.
- 실제 공개 catalog를 메모리 reader로 검증 fixture에 공급할 수는 있다. 그러나 현재 seed와 exact identity/원문 binding이 없으므로 제목이나 일부 ID가 비슷하다는 이유로 URL·기준·Map을 결합하지 않는다. 공개 catalog를 “내 저장 사본” 목록으로 몰래 추가하지 않는다.

multi-child·known URL은 실제 관계를 보유한 **별도 읽기 fixture**에서 검사한다. seed 네 사본의 목록 검사와 같은 증거로 세지 않는다. canonical 동일 함수 재사용이 불가능한 로컬 분기는 출력과 판정에 명시한다.

## 화면·복귀 계약

1. 기존 개인공간·새 Flow 만들기 버튼 의미는 유지한다. 내용 영역의 문맥 행동 `기존 Flow 찾기`로 열고, 제작 초안 검색을 개명하거나 상시 세 번째 pane을 추가하지 않는다. `data-action="open-personal-entry"`를 두 입구에서 공유한다.
2. `data-testid="personal-workspace-entry-host"`의 독립 읽기 영역을 사용한다. 작성 중에는 기존 작성 subtree를 연결된 채 숨기고 inert로 만든다. 일반 `renderAuthoring()`의 innerHTML 교체나 `render()`의 non-authoring 초기화로 검색을 구현하지 않는다.
3. 검색어는 한 입력에 exact 보존한다. URL hit/miss/invalid와 memo·명시 새 작성은 기존 의미를 따른다. 미보유 URL은 hit를 만들지 않는다. 읽기 도중 자동 draft/Flow 생성은 없다.
4. 선택한 사본의 초기 결과는 Text다. `내 사본 미리보기`와 `원문 기준 보기`를 구분하고 같은 exact Item의 설명·기준·메모를 분리한다. 기존 Result renderer는 선택적 읽기 표시만 확장하며 기본 실행 제어는 유지한다.
5. 목록→미리보기→개인공간→읽기 복귀는 메모리 상태로 연결한다. 목록/미리보기 스크롤과 opener를 각각 보존한다. 같은 선택은 유지, 다른 선택은 Text·상세 닫기다. Escape와 `작성으로 돌아가기`는 정확한 opener/기존 작성기로 돌아온다.
6. Plan/Item 편집·도움 적용·복구·저장 중에는 기존 close/authority guard가 우선이다. 저장 실패 입력을 검색으로 없애지 않는다. 늦게 실행되는 focus callback은 새 사용자 행동을 덮지 않는다.
7. 상태·원문 bytes/epoch 관측 변화는 이전 읽기 상태를 폐기한다. A→B→A도 해당한다. source/read 실패 또는 `personal-execution-only`는 정상 원문/내 사본 결과로 fallback하지 않는다.

## 순수 adapter와 실제 앱의 책임

새 읽기 adapter는 검증된 checkpoint/sourceRead/sourceEpoch를 PD에 전달하고 전체 membership을 확인한다. private packet은 표시용이며 저장·Undo 권한이 아니다. personal 결과는 현재 `personalStructurePacket` → 기존 `M.resultProjection` 경로를 따른다. `workingSource`의 합성 문자열을 원본 전체로 표시하지 않는다.

실제 app은 읽기 직전 `S.sameAuthority`와 source bytes/epoch를 재확인한다. renderer를 공유할 때 완료·날짜·Plan 편집 writer 제어를 읽기 화면에 렌더하지 않는다. no-op callback을 writer 대신 달지 않는다. P/C/E2/S/PD 저장 schema와 M seed는 이번 변경 대상이 아니다.

파일 후보: 새 읽기 adapter/시험, app의 scoped host/이벤트/복귀, 해당 CSS, builder의 adapter 동봉. 기존 소유 파일은 exact before를 먼저 남긴다. 사용자 HTML 재생성은 adapter·실제 app·읽기 경계·기존 작성 회귀 gate를 통과한 뒤 진행한다.

## 실행 순서와 판정

- 첫 실제 baseline: 기본 workspace의 새 입구, 작성 원문을 저장한 뒤의 새 입구. 버튼 실패 뒤 아직 도달하지 않은 같은 DOM/Undo 기대는 미실행으로 기록한다.
- 순수 모델: 네 origin의 실제 사본 identity·중복/foreign·Map 관계 미보유, 원문/개인 필드 소유, URL 유무·안전성, 입력 버전·손상·no IO.
- 앱 연결: 검색/선택/owner/네 결과·상세·복귀, source/state ABA, 실패·취소·Escape·동일 선택0쓰기, 작성 초안/DOM/native Undo 보호.
- 회귀: 기존 K1-A/K3-A, B3 Plan/Item/source/Undo와 생성된 사용자 파일의 직접 file URL.
- 다섯 크기:390×844·375×812·844×390·1024×768·1440×900, 문서/상세 넘침·핵심 rect/9점·키보드·콘솔/pageerror. 별도로 캡처를 직접 읽는다.
- 전체 npm/build·문서·원본551 보호를 검사하고, 요구별 현재 판정과 실제 실행 수를 갱신한다. 과거 실패·미검사·React와 fixture 차이는 남긴다.

쓰기0은 읽기 구간의 모든 setItem/removeItem/clear를 뜻한다. 시험 seed·작성 입력·외부 변경 주입은 구간과 계수를 분리한다. 제품의 허용 prefix 밖 호출과 clear는 모든 구간에서0이어야 한다. 사용자 실제 프로필 대신 격리 fixture를 사용한다.

실제 Android/iOS·OS IME/OS Back·보조기술은 NOT_RUN, 관찰 사용자0명이다. commit/push/PR/Preview/Production 미실행. C1-b를 마친 뒤 C1-c → C2 → C3 → K4 설계 gate 순서를 유지한다.

## 첫 실제 baseline — 2026-09-06

신규 spec (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3c-standalone-entry.spec.ts`)은 등록2개다. 최초 실행01 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/k3c-standalone-entry-baseline-20260906-01.json`)의 B01은 입구 부재 RED, B02는 단일 `keyboard.insertText` 호출이 브라우저 input 이벤트도1개라는 하니스 가정에서 실패했다. 실제 멀티라인 입력은 trusted insertText7개와 draft 저장7회를 일으켰고 최종 원문은 exact였다. 제품 저장 회수를1로 맞추지 않았다.

하니스 정정 실행02 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/k3c-standalone-entry-baseline-20260906-02.json`)는 **2실행/2RED**다. B01 정상 workspace, B02 정상 작성·단일 입력 호출·기존 decoder의 restored exact 원문까지 통과한 뒤 둘 다 `open-personal-entry` 부재에서 실패한다. 이후 host·복귀·같은 DOM·native Undo 기대는 아직 실행되지 않았다.

두 context 모두 읽기 진입 시도 구간 저장0·전체 bytes exact, 운영 sentinel exact·금지 prefix/clear/console/pageerror0이다. 작성 입력7회는 별도 구간이며 허용 draft key만 썼다. 메모리 buildText와 두 사용자 HTML은7D1610/1,454,070bytes, builder가 읽은17개 입력 파일의 시작/종료 해시도 같다. 이 RED 단계에서 제품·builder·사용자 HTML은 변경하지 않았다. 다음 구현은 순수 read catalog이며 URL/query·UI·기존 Result 연결은 그 다음이다.
