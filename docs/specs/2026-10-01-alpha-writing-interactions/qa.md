# 검증 원장

범위 내 구현·회귀·화면 평가를 완료했다. 직전 폴더 목표의 통과는 과거 이력으로만 사용하며 이번 구현의 초기 재현·수정·최종 소스 실행을 분리한다. 전체 UX·실기기·사용자 관찰·개발계 반영 완료가 아니다.

| 검사 | 현재 상태 |
| --- | --- |
| 요구·현재 코드 읽기 전용 감사 | 3개 독립 감사 완료; 자동 키/지역 검증/전체 전환 차이 확인 |
| 표적 순수/컴포넌트 | 최종118/118, fail/skip/cancel0. 여섯 표적 파일 실행; 넓은 통합과 중복 |
| 합성 앱 키/전환/저장·Undo·실패·조합 | `final-frozen-v2`75/75(15시나리오×5크기), fail/skip/flaky0; 실제 계정/API/DB 미접촉 |
| standalone HTML 조작 | `final-frozen-v2`40/40(8시나리오×5크기), fail/skip/flaky0; 앱 저장 증거와 분리 |
| 다섯 viewport / 이미지 확인 | 앱 전체/부분10장·HTML5장 실제 열람, 모든 크기의 앱15·HTML8·기존 회귀5 통과. 첫 화면 제한은 아래 구분 |
| npm test / 전체 통합 / build / docs | 최종 npm2,258/2,258·전체 통합2,735/2,735·범위 타입564entry 오류0·build 성공. 각각639source 실행 중 변경0. 최종 문서·파일 보고 QA는 아래 마감 기록 |
| 실제 Android/iOS/OS IME/AT | 미실행·이번 목표 제외 |
| 관찰 사용자 | 이번 목표0·보류 |
| commit/push/PR/merge/배포/개발계 교체 | 0·제외 |

## 실패·보완 이력

증거는 이 worktree의 `output/`에 보존한 로컬 전용 원본이다. 아래 실행은 별개이며 같은 시나리오/테스트의 재실행을 고유 커버리지로 합산하지 않는다.

| 실행 / 원인 | 처리 / 실제 결과 |
| --- | --- |
| 첫 표적 fixture5실패 | 지원 지역 아닌 문맥을 가정한 fixture 보완 후35/35; 이후90/90. 최종118 실행과 분리 |
| 앱 initial390 12실패, boot-fixed1실패 | Auth 신원 표시보다 비동기 library가 늦게 뜨고 빈 위치에는 toggle이 없음을 harness에서 구분. `boot-settled`는 grep0개였으며 검증 아님; `boot-settled2`1/1 |
| mobile-core-v2 7/11 | W6 일반 prose ShiftEnter 기대와 W10 새 입력 후 실패 UI 기대를 보완. 제품 결함 W8/W12는 그대로 실패로 유지 |
| mobile-core-targeted-v3 2/3, mobile-stale-evidence-v4 0/1 | W8 폴더 해제 효과가 기간→원문 Item focus 예약을 덮는 경쟁, W12 held external authority가 local 인계에 전달되지 않는 결함 재현 |
| 목적지 설치 거절·단일 blank 저장 후 후속 메모 | install 성공 및 getValue 일치를 stage 이전에 확인. blank→메모+바로 뒤 한 줄만 좁은 identity 증명으로 허용. 부분 권한/기록/숨은 줄 보호 유지 |
| critical-mobile-final01 5/5 | W8·W12·W13·W14·W15: 정확한 원문 위치, stale 인계 거절, Item 속성/하위 소속, pause 뒤 blank ID와 한 줄 메모 재시험 |
| HTML attempt01 35/40, scroll-diagnostic1실패 | 다섯 크기에서 End 뒤 마지막44px 행의13px가 잘림. 입력/Undo/측정값은 바꾸지 않고 부족한 scroll만 보정 |
| HTML final01 36/40 | 가로844는44/44px, 나머지 네 크기는31/44px. 실제 Control keyup이 End 예약을 취소하는 원인 확인 |
| 실제 End→Control 해제 회귀와 end-check1/1 | 보조 키 해제는 예약을 유지하되 다른 키·선택·입력·수동 scroll은 취소. 최종40에서 다시 전수 확인 |
| 초기 npm2,258/2,258 / 타입0 / build 성공 | 이후 소스 변경이 있었으므로 이번 최종 통과를 대신하지 않음. 초기 타입2파일 drift, 통합 실행 중 후속 수정도 최종 근거에서 제외 |
| 전체 통합의 외부 pack 경로 누락 두 실행 | `02:53:35`는 TAP완료 결과2,210건 중PASS2,111·FAIL99, `03:12:28`은596건 중PASS566·FAIL30까지 기록 후 중단. 전체 footer가 없어 recorder의testExecutions0은 ‘검사0건 통과’가 아니라 집계 미완료다. ENOENT와 연쇄 fixture 실패를 지우지 않았고 assertion을 바꾸지 않음 |
| 읽기 전용 source 지정 후 전수 재실행 | 직전 두 목표가 사용한 외부 catalog pack 경로를 정확히 지정. 제품 후보에 복사/수정하지 않고 `03:17:18`부터 전체267파일을 새로 실행. source freeze 이후 변경0 유지 |
|267파일2worker·256MiB 제한 실행|`03:17:18`은 TAP완료 결과1,319건 중PASS1,318·FAIL1까지 기록. 기존`alpha-preservation/backup-capacity.test.ts`가 exit134·`Reached heap limit Allocation failed`로 종료. 원본 log 보존 후 실행 중단; 제품 한계나 assertion 변경 없이 지원된2worker·512MiB로 전수 재실행. 전체 footer 없음|

앱 원본: `output/playwright/writing-interactions-<run>/results.json`. HTML 원본: `output/playwright/writing-interactions-lab-<run>/results.json`. 실패 screenshot/trace와 boundary 첨부도 같은 디렉터리에 보존했다.

## 고정 소스

- 최종 production build: `output/integrated-product-poc/build-2026-10-01T02-57-08-788Z.json`, exit0·639개 source·실행 중 변경0.
- 최종 조작 HTML:226,227bytes, SHA256 `a28ed84235e556ae69f517281975ad276ac3137a618c9d3285c9d8fbf3915862`. 앱과 HTML 브라우저는 `final-frozen-v2`로 이 시점 이후 소스 변경 없이 실행한다.
- 과거 결과 JSON은 덮어쓰지 않는다. 최종 표적·타입·npm·전체 통합·화면 평가를 아래에 확정한다.
- 전수 검사용 외부 pack은 `D:/flowme2605/flow-poc-merge-prep-20260920/lib/flow/integrated-poc/catalog-library-pack.v1.json`을 명시 환경 변수로 읽기만 한다. 검사 전 SHA256 `723ABEFDC26243EB1F9B4BCF21730758ECC7A300494AD2AE75293AC5C6DDE4BE`; 복사·개인 계정/.env 읽기·수정·게시0. 최종 후 다시 hash를 대조한다.

## 독립 검토

지역/입력 담당의 마지막 읽기 전용 검토에서 install 확인·1회 focus lease·host guard·IME/CAS 경계를 확인했고 막아야 할 결함을 추가로 찾지 못했다. 별도 in-memory 재현1회에서 ACK 이후 새 regional pending bytes와 view는 보존되고 stale 기준의 재저장이 거절됐다. 원래 실패 요청1회 외 추가 mutation0이며, 이 재현을 실제 IME/Undo 검사로 계산하지 않는다.

## 현재 확정한 자동 실행

| 실행 | 개수 / 결과 | 로컬 전용 원본 |
| --- | --- | --- |
| 최종 여섯 표적 |118/118; fail/skip/cancel0|현재 도구 실행96342 및 아래 최종 전체 통합의 동일 표적|
| 최종 npm test |2,258/2,258; fail/skip/cancel0·sourceChanged[]|`output/integrated-product-poc/npm-test-2026-10-01T03-02-31-383Z.json`|
| 최종 범위 타입 |564entry·diagnostic0·639source·sourceChanged[]|`output/integrated-product-poc/targeted-types-2026-10-01T03-04-10-910Z.json`; repo 전체 타입0 주장 아님|
| 최종 production build |exit0·639source·sourceChanged[]|`output/integrated-product-poc/build-2026-10-01T02-57-08-788Z.json`|
| 최종 HTML 브라우저 |40/40;70경계 첨부, 실제 network0·밖 key쓰기/clear0·console/page0·합성 sentinel bytes 동일|`output/playwright/writing-interactions-lab-final-frozen-v2/results.json`|
| 최종 앱 브라우저 |75/75;125경계 첨부, 실제 API 전달0·허용 prefix 밖쓰기/clear0·console/page0·합성 sentinel bytes 동일|`output/playwright/writing-interactions-final-frozen-v2/results.json`|
| 기존 작성·저장 회귀 |25/25;25경계 첨부, 같은 보호 경계 통과|`output/playwright/folder-writing-regression-final-frozen-v2/results.json`|
| 최종 전체 통합 |267파일·2,735/2,735; fail/skip/cancel0·sourceChanged[]·exit/verifiedExit0.2worker·각512MiB 테스트 프로세스 제한, 제품 제한 변경 아님|`output/integrated-product-poc/new-tests-2026-10-01T03-24-04-085Z.json`,03:24:04.085→03:40:05.975UTC|

최종 HTML의 End 재시험은 모든 크기에서 마지막44px 전체 노출·raw/caret404 동일. 390/375는 scroll962+height330=1292, 나머지는1002+290=1292, 마지막 행1248+44=1292다. 원문/Undo 측정값을 줄여 기대를 통과시키지 않았다. 실제 PNG5개를 root도 열람했다.

세 브라우저 suite의 실행140회와 boundary 첨부220개(125+70+25)는 서로 다른 집계다. 앱·기존 회귀가 읽은 실제 production 자산24개의 경로별 SHA가 모두 같고 집합 SHA256은 `ca57b4e010afe87dbda955eb956f7eed18d84e3a17c7e90ac36d3bc58fef81df`다. DOM stub을 앱 엔진인 것처럼 검사하지 않았다. API/Auth는 합성이며 외부 API/DB 요청은 전달하지 않았다.

## 앱 시나리오별 판정

각 행은390×844·375×812·844×390·1024×768·1440×900에서5/5통과다.

| ID | 확인한 동작 | 결과 |
| --- | --- | --- |
|W1|같은 native mirror·문서/원문 모드·Escape→Tab·기본48px도구·넘침|5/5|
|W2|Todo Enter와 새 빈 scaffold 종료, 이전 Item/숨은 bytes 보호|5/5|
|W3|일반 목록 Enter는 일반 메모 유지·Todo 비승격|5/5|
|W4|메모 속성 Enter/ShiftEnter가 같은 Item.note 줄바꿈으로 결합|5/5|
|W5|Tab 즉시 ShiftTab은 최초 subtree 역연산; 부분 구조키 거절0쓰기|5/5|
|W6|부분 pending 입력의 exact raw/caret 전체 local 인계0쓰기, 일반 ShiftEnter literal|5/5|
|W7|도구 Undo와 CtrlZ가 입력 한 번을 native remount/저장 없이 되돌림|5/5|
|W8|부분 저장→전체→기간→정확한 원문 Item 복귀·저장 Undo·reload|5/5|
|W9|합성 composition 중 parse/save/보기 차단, 끝에서 정확한 입력 한 번 반영|5/5|
|W10|저장 거절 뒤 새 입력 보존, 동일 전체 model 재저장·숨은 줄 보호|5/5|
|W11|응답 유실의 같은 request 확인·중복 mutation0·caret/reload 보존|5/5|
|W12|held external revision이 local 인계 차단·추가 command0·전체 pending 복구|5/5|
|W13|제목 끝 Enter는 메모/시간/자식 뒤 형제 추가·기존 Item 소속 불변|5/5|
|W14|blank 저장·잠시 멈춤·메모 입력 후 기존 lineId/숨은 Item 유지|5/5|
|W15|저장된 blank ID로 메모 채우고 바로 뒤 한 줄 메모 추가·Item0승격|5/5|

## 조작 HTML 시나리오별 판정

| ID | 확인한 동작 | 결과 |
| --- | --- | --- |
|L1|같은 native·모드·EscapeTab·다섯 viewport의 기본 도구|5/5|
|L2|Todo/list Enter, 빈 scaffold 종료·일반 메모 비승격|5/5|
|L3|메모 Enter/ShiftEnter의 같은 Item·ID 유지·저장/reload|5/5|
|L4|ShiftTab→Tab 정확한 역연산, 부분 Tab 거절→전체 exact 인계0쓰기|5/5|
|L5|도구 Undo/CtrlZ·remount/저장0|5/5|
|L6|저장 오류 입력 보존·retry·같은 값0쓰기·복귀/reload·exact key|5/5|
|L7|합성 composition 중 보기/저장 차단·정확한 입력 보존|5/5|
|L8|손상 payload readonly·exact key 초기화·긴 원문 End 마지막44px전체|5/5|

시나리오의 ‘composition’은 DOM 합성 이벤트다. 실제 Android/iOS 한글 입력기 또는 보조기술을 대신하지 않는다.

## 화면 관찰

앱 whole/region10 PNG와 HTML5 PNG를 root가 실제 열람했다. 최종 시나리오 합격과 첫 화면의 사용성을 분리한다. 아래는 합성 원문·Chrome viewport의 관찰이며 실제 기기/OS 키보드 검증이 아니다.

| viewport | 앱 관찰 | HTML 관찰 / 한계 |
| --- | --- | --- |
|390×844|whole 도구·여러 본문 줄 보임. folder 목록을 연 region 상태는 첫 화면에 목록이 있고 작성 본문은 아래|첫 editor·입력 Undo·저장/복귀/초기화 보임. 마지막44px 보정 통과|
|375×812|기간 탭의 날짜 미정이 다음 줄로 배치됨. whole 첫 원문 보임. region은 목록 아래|도구/저장 버튼 줄바꿈, editor 유지. 설명/증거 접기는 아래로 scroll|
|844×390|whole 도구와 첫 일반 메모 보임. region은 범위/문맥까지 보이며 실제 입력은 아래|짧은 가로에서 설명을 접고 도구+editor 우선; 저장은 페이지 아래로 scroll|
|1024×768|좌측 library+우측 whole. region의 첫 메모 일부가 첫 화면에 보임|editor·저장/복귀/초기화가 첫 화면에 보임|
|1440×900|좌측 library+우측 whole/region 모두 본문과 기본 도구 보임|중앙 폭 제한, editor/저장/접기 증거 보임|

가로 문서 overflow·콘솔/page 오류와 핵심 키/도구의 실제 접근은 suite 경계로 검사한다. 일반 페이지 scroll이 필요한 상태를 ‘가려진 버튼’ 또는 전면 UX 완료로 바꾸지 않는다. 폴더 선택 뒤 목록 자동 닫기/유지 정책, 큰 집중 모드와 실제 모바일 소프트 키보드는 후속이다.

## 경계와 마감 근거

- 실제 계정·API/DB·운영 key/value는 접촉하지 않았다. 앱 fixture와 HTML disposable profile의 합성 운영 sentinel만 byte 대조했으며, 이것을 실제 운영 데이터 전수 감사로 표현하지 않는다.
- 원래 `/my` entry·`AppClient`·`lib/flow/storage.ts` diff0, staged0, HEAD `1eb9be68835b71d234995e932d791b4058571fd5` 유지. 원본 피드백 SHA256 `AC58C0EFCDD65A3BF964C7BB4FCCED970E08112049352E0BFE02B93F889A9493` 불변.
- 범위 closeout reporter2026-10-01T03:25:59.947Z:31개 grouped scope entry(수정11·미추적20), 전체24수정·48미추적 grouped entries. spec 디렉터리는 한 entry로 집계되므로31을 실제 파일 수로 표현하지 않는다. 현재 채팅의 이전 후보와 이번 hunk를 분리한 [소유](ownership.md)·[변경 목록](results.md)을 따른다.
- build·타입·npm의 각각639개 source hash를 현재 파일과 다시 대조해drift0. 이 검사도 관찰 사용자·개발계 반영 근거는 아니다.
- 전체 통합도639source의 실행 중 변경0. 외부 pack의 마지막 SHA256 `723ABEFDC26243EB1F9B4BCF21730758ECC7A300494AD2AE75293AC5C6DDE4BE`로 검사 전과 같았다. 읽기 전용 source 누락/256MiB 실패·중단 세 실행을 최종 통과에 섞지 않는다.
- commit0·push0·PR0·merge0·Preview0·Production0·개발계 교체0. 다른 서비스/설정은 변경하지 않았다. QA3106의 소유 launcher23040·child19592를 명령/부모/포트로 다시 확인한 뒤 종료했고 listen0이다. 기존 개발계3105/2184와 조작 파일 미리보기3113/27268은 유지했다. 포트 소유 확인을 공개 주소의 health 검증으로 표현하지 않는다.

## 최종 파일·문서 마감

- 실제 Chrome의 `file://` 실행: `output/playwright/writing-artifacts-final/results.json` passed. 보고서 다섯 크기와 조작 HTML390/1440 두 크기에서 총7화면을 검사했다. 보고서의 세 접기 영역을 키보드 Enter로 열고 닫았고, 요구9개가 펼쳐져도 가로 넘침0·로컬 링크3개 존재·초점 접근을 확인했다. HTML은 실제 키 입력→정확한 key 저장2회→reload 복원 통과, 다른 key/clear·network·console/page 오류0이다.
- 파일 검사 중 보고서/조작 HTML hash 변경0. 보고서 SHA256 `ff2b72981de4aad461dd270d1a3bcaebc207b687c24fd14924ffd55a00e39608`, 조작 HTML SHA256 `a28ed84235e556ae69f517281975ad276ac3137a618c9d3285c9d8fbf3915862`. 최종 보고서 첫 화면 PNG5개도 root가 열람했다. 모바일은 링크와 변경 요약부터 보이고 자세한 비교는 펼쳐서 읽는다.
- 문서 검사 `output/integrated-product-poc/docs-2026-10-01T03-47-19-964Z.json`:4/4, 필수16파일·로컬 링크6,906개 통과, sourceChanged[]. 마감 기록 이후 같은 검사를 다시 실행하며 최신 기록은 `docs-latest.json`에 남긴다.
- build·npm·범위 타입·전체 통합 각각의639소스를 현재 파일과 다시 대조해 모두drift0. 외부 pack/원본 피드백 hash도 위 기록과 동일하며 HEAD·staged0·원래 /my/storage/AppClient diff0을 재확인했다. 이번 후보의 내부 목표 완료와 별도 개발계 반영/전체 UX 후속을 분리한다.
