# FlowMe 통합 PoC 미충족 해소 v1 Tasks

## 상태 표기

- `[x]`: 현재 worktree에서 해당 작업을 구현·수행함. 최종 판정은 fresh 전체 검증과
  trace 갱신 뒤 확정할 수 있음.
- `[ ]`: 실행 대기.
- `결정 필요`: 사용자 또는 제품 owner 선택 전 구현 금지.
- `조건부`: 선행 결정이 해당 lane을 열 때만 실행.
- `제외 유지`: 현재 PoC에서 구현하지 않고 금지 경계만 검증.

## 0. 기준선과 보호 경계

- [x] 격리 worktree와 dirty 원본의 소유권 경계를 확인했다.
- [x] 세 결과물 168개와 bridge 86개를 독립 denominator로 고정했다.
- [x] primary gap 98개와 bridge gap 24개를 A0~A12에 중복·누락 없이 배치했다.
- [x] exact `/my?personalWorkspacePoc=v1`과 `flow:poc:personal-workspace:v1:*` 경계를
  유지했다.
- [x] 기본 `/my`, 운영 `flow:*`, 기존 writer, `localStorage.clear()` 금지를 문서에
  고정했다.
- [x] commit·push·PR·Preview·Production 미진행 경계를 고정했다.
- [ ] 구현 시작과 각 단계 종료 직전에 Git 상태를 다시 확인한다.
- [ ] 변경 대상 파일이 기존 미소유 변경과 겹치면 좁은 diff로 보존 가능성을 먼저
  확인한다.

## 1. 현재 완료된 safe batch

- [x] 전용 touch handle에서 350ms 길게 누르기를 시작한다.
- [x] 8px 이동·pointer cancel·Escape·빠른 scroll·window 변화 시 이동 session을
  취소한다.
- [x] 취소 뒤 synthesized click이 패널을 다시 열지 않게 한다.
- [x] 행 본문의 세로 scroll과 전용 handle 이동을 분리한다.
- [x] handle에 스크린리더용 이동·취소·키보드 대안 지침을 연결한다.
- [x] 상하좌우 safe area를 적용하고 강제 inset browser assertion을 추가한다.
- [x] 통합 state model의 고정 seed 5,000회 연속 조작 시뮬레이션을 추가·실행한다.
- [x] A9 변경 뒤 통합 모델·component 76/76, standalone 모델 30/30, 전체 npm
  1,561/1,561, production build 18개 route, 관련 Playwright 7개 suite 37/37을 확인했다.
- [x] A8 핵심 4건을 2회씩 8/8, 관련 6건을 별도 반복에서 12/12 확인했다.
- [x] A9 targeted 결과로 통합 PoC 76/76, standalone 30/30,
  React+standalone 브라우저 27/27, standalone 844×390 반복 3/3, React
  844×300 화면 밖 DATE drop·Undo 반복 10/10을 확인했다.
- [x] `V41-004,005,006,010,019,020,028,033,034,043,047,049,051,065,067,068,070`과 관련 subcheck의
  판정을 traceability data에 반영했다.

<!-- SAFE_BATCH_TEST_COUNTS: model/component=76/76; standalone-model=30/30; full=1561/1561; build=18 routes; browser-7-suite=37/37; A8-core-repeat=8/8; A8-related-repeat=12/12; A9-standalone-month-repeat=3/3; A9-offscreen-date-repeat=10/10; docs는 최종 verification-manifest 정본 -->

## 2. 단계 0 — A0 제품 결정

### 기획

- [x] `A0-1` D2 저장 lane을 personal, creator, two-lane 중에서 결정한다.
- [x] `A0-2` D1 editor·trash·Calendar·export의 no-write/shadow/operating owner를
  결정한다.
- [x] `A0-3` global shell과 workspace accent, 모바일 header·primary CTA를 결정한다.
- [x] `A0-4` full live editor와 textarea+선택형 correction의 목표 상태를 결정한다.
- [x] `A0-5` recurrence, public S3, table/source update의 포함·차단·보류를 결정한다.
- [x] `A0-6` standalone의 core parity와 fixture-only 경계를 결정한다.

### UX/디자인

- [x] 각 안의 첫 화면, 첫 행동, 완료 문구, 되돌리기, 재진입을 비교한다.
- [x] shell과 authoring 비교 기준을 필수 viewport 계약으로 고정한다.
- [x] 제품 UI에 PoC 작업 선택을 영구 정책처럼 노출하지 않는다.

### 개발 설계

- [x] 선택안별 route·owner·read source·write command·namespace·rollback을 기록한다.
- [x] operating writer가 필요한 선택은 별도 후속 phase로 분리한다.
- [x] 선택하지 않은 안의 재검토 trigger를 기록한다.

### 구현

- [x] A0 결정 기록 전 관련 제품 코드를 수정하지 않았다.
- [x] 결정 뒤 A1~A12 scope와 requirement 판정을 갱신했다.

### 검증

- [x] A0 primary 4개와 bridge 5개가 구현·부분·의도적 변경·제외 중 하나를 가진다.
- [x] 선택 결과가 exact gate와 operating writer 금지에 어긋나지 않는지 검토한다.

### Exit gate

- [x] A0-1~A0-6 모두 선택안·거절안·owner·write 경계·revisit trigger가 있다.
- [x] 미승인 정책이 코드에 들어가지 않았다.

## 3. 단계 1 — A1/A3/A4 데이터·전환 기반

### 기획

- [x] source, creator, personal, execution 필드 ownership matrix를 만든다.
- [x] 날짜 `inherit/fixed/unscheduled`와 원래 날짜 복구 의미를 고정한다.
- [x] unsupported grammar의 preserve/block/correct/defer 기준을 고정한다.
- [x] Plan draft, Item draft, apply, Undo의 사용자 단위를 고정한다.

### UX/디자인

- [x] source read-only block과 personal edit block을 분리한다.
- [x] impact summary, dirty guard, 저장 6상태와 receipt copy를 설계한다.
- [x] 실패 뒤 retry, 취소 뒤 focus/scroll 복귀를 설계한다.

### 개발 설계

- [x] `savedCopyId + flowId + itemId` collision-free identity를 고정한다.
- [x] SourceRow→Item→Step adapter와 unknown/loss manifest를 설계한다.
- [x] 공통 `intent -> resolve -> transition -> persist -> receipt` contract를 만든다.
- [x] staged Plan apply와 one-snapshot Undo를 설계한다.
- [x] multi-key late failure byte rollback을 설계한다.

### 구현

- [x] A1 source/personal/execution model을 구현한다.
- [x] unknown property·nested check·source order를 보존한다.
- [x] A3 draft/apply/dirty/collision transition을 구현한다.
- [x] A4 saving/success/no-op/failure/retry/Undo receipt를 구현한다.

<!-- STAGE1_IMPLEMENTATION_SCOPE: 위 완료 표시는 순수 모델·PoC store·adapter 계약 기준이다.
공통 editor 화면, 모든 opener 연결, 상세 receipt·retry UI는 단계 3 구현 항목으로 남긴다. -->

### 검증

- [x] 네 origin·identity·malformed·unsupported·duplicate model test를 추가한다.
- [x] unknown property와 원문 byte round-trip을 검사한다.
- [x] apply 전 persistent state 불변과 final 1회 write를 검사한다.
- [x] cancel/stale/failure write 0과 late failure rollback을 검사한다.
- [x] reload/Undo/corrupt fail-closed를 검사한다.
- [x] allowed prefix 밖 set/remove/clear 0을 검사한다.

### Exit gate

- [x] A1/A3/A4 순수 모델과 store test가 모두 통과한다.
- [x] silent data loss와 partial save가 0이다.
- [x] 관련 trace 행과 subcheck 증거가 fresh 결과로 갱신됐다.

<!-- STAGE1_EXIT_EVIDENCE: 당시 PoC 168/168, 공통 editor transaction 결합 197/197,
Stage 1 browser runtime 4/4, production build PASS. 당시 UI 미연결 parent는 `부분`이었고
현재 연결 상태는 아래 STAGE3_EXIT_EVIDENCE가 대체한다. -->

## 4. 단계 2 — A2/A6/A7 작성·탐색

### 기획

- [x] 한 입력의 query/URL/memo 분기와 fallback을 정의한다.
- [x] single/multi-child Map 표현을 정의한다.
- [x] 기본 입력→결과와 optional structure review를 정의한다.
- [x] template, contextual helper, ghost의 서로 다른 역할을 고정한다.

### UX/디자인

- [x] mobile·landscape·desktop의 entry→authoring→result wireflow를 만든다.
- [x] pure text/Flow view와 current-line raw 표현을 설계한다.
- [x] contextual `+`, hierarchy menu, one-level guide를 설계한다.
- [x] blank recognized line의 ghost overlay와 접근성 계약을 설계한다.
- [x] mobile chrome과 설명을 감산한다.

### 개발 설계

- [x] one source of truth와 caret/selection/scroll/composition 보존을 설계한다.
- [x] template empty/fingerprint/non-composing guard를 설계한다.
- [x] Map child 선택의 Text reset·detail close·focus return transition을 설계한다.

### 구현

- [x] A2 한 입력과 네 origin/Map 선택을 연결한다.
- [x] A6 기본 입력→결과와 optional structure drawer를 연결한다.
- [x] A6 contextual helper와 최신 structure hierarchy를 연결한다.
- [x] A7 scaffold insertion·caret·native Undo/Redo를 연결한다.
- [x] A7 line-level ghost overlay를 연결한다.

### 검증

- [x] query/URL/memo와 네 origin duplicate 0을 E2E로 검사한다.
- [x] Map child change→Text reset→detail close를 검사한다.
- [x] 정상 문서가 구조 화면 없이 결과로 가는지 검사한다.
- [x] IME/stale/double apply/picker cancel write 0을 검사한다.
- [x] scaffold caret, Undo/Redo byte parity를 검사한다.
- [x] ghost의 source/clipboard/selection/history 영향 0을 검사한다.

### Exit gate

- [x] 기존 Flow와 새 텍스트에서 결과까지 막힘 없이 도달한다.
- [x] structure review는 선택형이고 source bytes가 보존된다.
- [x] A2/A6/A7의 단계 2 범위 판정이 최신 구현과 일치한다. 단계 3 결과
  projection과 외부 evidence를 요구하는 부모 항목은 부분으로 유지한다.

<!-- STAGE2_EXIT_EVIDENCE: PoC model/component 211/211; npm test PASS;
production build 18/18; Chrome 151 runtime 11/11; viewport 보강 1/1;
6 viewport + CDP DPR2 PNG 14개; prefix 밖 set/remove 0, clear 0. 실제 browser
200% text zoom, Android/iOS, 실제 가상키보드, screen reader, 관찰 사용자는 미실행. -->

## 5. 단계 3 — A3/A4/A5/A11 편집·결과

### 기획

- [x] common Plan/Item editor의 진입·적용·dirty·duplicate 의미를 고정한다.
- [x] Text/Todo/Calendar/TXT의 역할과 base date/view state를 정의한다.
- [x] A0 결과에 따라 CreatorDraft 관리 범위를 열거나 보류한다. A0 결정대로
  CreatorDraft 목록·검색·복제·보관·재진입은 이번 PoC에서 보류했다.

### UX/디자인

- [x] 모든 opener에 같은 Item editor field order를 적용하는 계약을 정했다.
- [x] result selector, 기준일, impact summary를 설계했다.
- [x] complete/reopen/Undo의 cross-view 피드백 계약을 통일했다.
- [x] 조건부 CreatorDraft list/search/clone/archive/reentry는 A0 보류로 설계 대상에서
  제외하고 완료로 과장하지 않는 표시 규칙을 정했다.

### 개발 설계

- [x] 모든 opener를 같은 edit intent로 연결하는 구현 경계를 정했다.
- [x] result view와 persisted execution date를 분리했다.
- [x] Text/Todo/Calendar/TXT가 같은 effective ref를 읽는 selector 계약을 정했다.
- [x] 실제 `/calendar`·operating writer는 A0 승인 전 차단하는 경계를 유지했다.

### 구현

- [x] common Plan/Item editor와 staged apply를 연결했다.
- [x] shadow title/memo/date/property edit를 연결했다.
- [x] effective Text, full Todo, month grid/selected day, TXT를 연결했다.
- [x] 구체 값 receipt와 retry/Undo를 연결했다.
- [x] A0 보류에 따라 A11 CreatorDraft 관리 surface를 연결하지 않고 경계를 유지했다.

### 검증

- [x] 네 origin 동일 editor와 transition parity를 검사했다.
- [x] dirty cancel/Escape/Back, focus/scroll 복귀를 검사했다.
- [x] Text/Todo/Calendar/TXT ref/date/completion parity를 검사했다.
- [x] Today complete→detail/Calendar→reopen을 검사했다.
- [x] reload와 corrupt payload fail-closed를 검사했다.

### Exit gate

- [x] 기존 Flow와 작성 Flow가 같은 편집·결과 문법을 쓴다.
- [x] source schedule/ownership은 personal placement로 바뀌지 않는다.
- [x] 운영 owner 미승인 요구를 완료로 과장하지 않는다.

<!-- STAGE3_EXIT_EVIDENCE: Chromium 13/13 PASS; workspace/result/Plan/Item ×
6 viewport PNG 24개; 허용 prefix 밖 set/remove/clear 0; 격리 operating snapshot
시나리오 전후 byte-identical. 전체 회귀·Stage 4·최종 보고서 수치는 단계 6 pending. -->

## 6. 단계 4 — A8/A9 이동·반응형

### 기획

- [x] destination, reorder, current, invalid target 의미를 고정했다.
- [x] 36~72px edge zone과 reduced-motion 속도 범위를 고정했다.
- [x] 날짜별 Quick add와 맨 위·맨 아래 이동 범위를 고정했다.
- [ ] A0 shell 결정을 viewport별 규칙으로 바꾼다.

### UX/디자인

- [x] 왼쪽 destination과 오른쪽 reorder corridor를 설계했다.
- [x] before/after line, valid/invalid/cancel/result 피드백을 설계했다.
- [x] 48px handle, body scroll, non-modal panel, keyboard path를 설계했다.
- [x] 월간 점유·빈 날짜의 세로 section과 날짜별 48px Quick add를 설계했다.
- [x] 844×390에서 move dialog/panel의 독립 scroll과 compact Undo 노출을 설계했다.
- [ ] safe-area, skip-link, short landscape, 1024/1280+ 구성을 설계한다.

### 개발 설계

- [x] drag/long/short/menu/keyboard를 같은 move transition에 연결했다.
- [x] timer/threshold/suppress-click/pointer cleanup contract를 고정했다.
- [x] edge auto-scroll과 offscreen drop을 같은 transition에 연결했다.
- [x] 맨 위·위·아래·맨 아래를 같은 reorder position resolver와 transition에 연결했다.

### 구현

- [x] 1차 safe batch의 handle/cancel/a11y/safe-area를 구현했다.
- [x] 오른쪽 원 목록 reorder target과 before/after insertion line을 구현했다.
- [x] React에 edge auto-scroll과 화면 밖 날짜 drop+Undo를 구현했다.
- [ ] 실제 touch drag-to-date를 실제 기기에서 검증한다. Chromium synthetic pointer
  날짜 이동과 pointer cancel의 ghost·강조·상태·RAF cleanup은 구현·자동 검증했지만
  실제 기기 증거는 아니다.
- [x] 맨 위·맨 아래 이동과 월간 날짜별 Quick add를 구현했다.
- [ ] A0 shell token/header/CTA 결정을 적용한다.
- [ ] standalone에 승인된 parity 범위를 적용한다.

### 검증

- [x] no-movement release와 8px cancel 후 synthesized click 0을 검사한다.
- [x] Chromium trusted touch로 body scrollY를 바꾼 뒤 같은 fixture에서 desktop mouse drag를 연속 검사했다.
- [x] right corridor, Chromium synthetic pointer date, React 화면 밖 날짜
  auto-scroll+Undo를 검사했다.
- [ ] 실제 touch date와 standalone 화면 밖 날짜 parity를 검사한다.
- [x] pointer cancel·scroll·invalid drop의 DOM cleanup과 storage mutation 0을 검사했다.
- [x] menu·Enter·Space·arrow·Escape·focus return과 맨 위·위·아래·맨 아래 결과를
  같은 transition 기준으로 검사했다.
- [x] move panel·item sheet·reset confirmation·standalone dialog/toast에 강제 safe-area bounding-box assertion을 추가했다.
- [x] React·standalone·단계형 보고서에서 필수 다섯 viewport의 overflow·error·가림 0을 fresh 검사했다.

### Exit gate

- [x] 구현된 drag·menu·keyboard 경로가 같은 reorder transition 결과를 만든다.
- [ ] 실제 touch cancel까지 포함한 모든 종료 뒤 DOM과 storage mutation 0을 확인한다.
- [x] 필수 viewport와 비드래그 keyboard path가 통과했다.
- [x] V41 원 화면과 남은 차이를 결정·부분 판정 장부에 반영했다.

## 7. 단계 5 — A10 P1 fidelity 보존·보류 경계

### 기획

- [x] A0-5에 따라 recurrence, public S3, table/source update를 후속 보류·제외로
  확정하고 각각의 다시 여는 조건을 기록했다.
- [x] QuickItem→Flow와 장기 CreatorDraft 관리는 별도 제품 범위 승인 전까지 보류했다.
- [x] 31개 후보 fixture 전체 replay를 현재 기능 채택이나 완료 증거로 쓰지 않기로 했다.

### UX/디자인

- [x] 지원 가능한 좁은 root checkbox near-miss만 명시 correction 후보로 두고 자동 수정은
  금지했다.
- [x] Quick→Flow receipt와 table/source 양방향 UI는 승인 전 노출하지 않기로 했다.
- [x] 미지원 material은 원문·lineage·loss field를 보이거나 commit 전에 차단한다.

### 개발 설계

- [x] exact `rawText`, line byte range, source lineage, fidelity manifest 보존 경계를 고정했다.
- [x] stale/tampered manifest, unknown field, unsupported grammar는 무저장으로 차단한다.
- [x] 보류 기능의 provider adapter·identity·writer는 승인 전에 만들지 않는다.

### 구현

- [x] 새로 승인된 P1 기능 slice가 없으므로 recurrence/public/table/source writer를 추가하지
  않았다.
- [x] 미지원 grammar는 loss manifest, exact raw fallback 또는 commit 차단으로 보존했다.

### 검증

- [x] recurrence/time/timezone과 unknown·nested material의 preserve/block 경계를 검사했다.
- [x] Markdown·TSV·보수적 CSV block 인식과 prose 오인식 방지를 검사했다.
- [x] stale/tampered·blocked·unconfirmed·collision 경로의 state mutation 0을 검사했다.
- [x] public writer와 source row mutation이 추가되지 않았음을 확인했다.

### Exit gate

- [x] 미채택 P1 후보는 보류·제외 근거와 다시 여는 조건을 가진다.
- [x] 보류 기능을 지원하는 것처럼 노출하거나 판정하지 않는다.
- [x] P0 전체 flow·storage 최종 회귀 수치를 단계 6에서 확정했다.

## 8. 단계 6 — A12 검증·평가·보고

### 자동 모델·회귀

- [x] 고정 seed 5,000회 통합 state simulation을 추가·실행했다.
- [x] 단계 1~3의 targeted model/store/transition·component·browser 검증을 각 단계에서
  실행했다.
- [x] `npm.cmd run test:personal-workspace-poc`를 최종 fresh 실행해 253/253을 확인했다.
- [x] 단계 4 종료 뒤 standalone model tests를 최종 fresh 실행해 33/33을 확인했다.
- [x] `npm.cmd test` 전체 회귀의 여섯 TAP group을 최종 fresh 실행해 1,738/1,738을
  확인했다.
- [x] `npm.cmd run build`를 최종 fresh 실행해 18/18 route를 확인했다.
- [x] React runtime 6개 suite를 각각 fresh 실행해 48/48, standalone runtime을
  14/14, 보고서 browser를 4/4로 확인했다.
- [x] 최종 문서 갱신 뒤 `npm.cmd run docs:check`를 실행해 16개 필수 문서와
  4,588개 로컬 링크를 확인했다.
- [x] 최종 tracked diff에 `git diff --check`를 실행했다. untracked 산출물은
  모델·browser·문서 검사에서 별도로 읽고 검증했다.

<!-- FINAL_TEST_COUNTS: poc-model-component=253/253; full=1738/1738 across
177+455+253+633+201+19; build=18/18; react-browser=48/48 across
stage1=4,stage2=11,integration=3,v41-core=13,stage3=13,stage4=4;
standalone-model=33/33; standalone-browser=14/14; report-browser=4/4;
docs=16 required files and 4588/4588 local links; tracked-diff-check=PASS. -->

### 브라우저 화면 — 단계 4 final 4/4 PASS

- [x] 단계 4 정본으로 390×844 core journey와 overflow/error/covered action을 검사했다.
- [x] 375×812에서 같은 항목을 검사했다.
- [x] 844×390에서 월간·QuickItem·dialog/panel scroll·compact Undo를 검사했다.
- [x] 1024×768에서 list+execution 구성을 검사했다.
- [x] 1440×900에서 wide/inspector 구성을 검사했다.
- [x] 키보드와 비드래그 이동 경로를 검사했다.
- [x] safe-area 4방향 강제 inset을 최종 fresh 검사했다.

### 실제 기기·접근성

- [ ] 실제 Android Chrome에서 지정 과업을 수행하고 기기·OS·browser를 기록한다.
- [ ] 실제 iOS Safari에서 같은 과업을 수행한다.
- [ ] screen reader, OS 글자 확대, browser 200% 확대를 검사한다.
- [x] 자동화가 실기 검사를 대신하지 않았음을 보고서에 명시했다.

### 관찰 사용자

- [ ] 메모 저장·다시 찾기 과업을 관찰한다.
- [ ] 날짜와 폴더의 차이를 설명하는 과업을 관찰한다.
- [ ] 완료 cross-view 확인·다시 열기 과업을 관찰한다.
- [ ] 실제 관찰 사용자 수와 발견·이해·회복·효용 결과를 기록한다.

### 운영 데이터 불변

- [x] 허용 prefix 밖 `setItem` 0을 검사했다.
- [x] 허용 prefix 밖 `removeItem` 0을 검사했다.
- [x] `clear` 호출 0을 검사했다.
- [x] 격리 localStorage fixture의 operating sentinel bytes parity를 검사했다.
- [x] 실제 browser profile/backend를 검사하지 않은 한계를 명시했다.

### 최종 보고서

- [x] 구현한 기능을 패키지별로 최종 보고서에 정리했다.
- [x] 변경한 파일을 책임 단위로 최종 보고서에 정리했다.
- [x] 필수 시나리오별 결과를 최종 보고서에 정리했다.
- [x] 자동 테스트 결과와 실제 실행 개수를 실행 묶음별로 정리했다.
- [x] viewport별 UX/UI 평가를 정리했다.
- [x] 실제 Android/iOS·보조기술 검사는 미실행으로 분리했다.
- [x] 운영 데이터 불변 증거와 격리 fixture/browser context라는 범위를 함께 적었다.
- [x] 남은 결함·결정 필요·의도적 제외를 분리했다.
- [x] commit, push, PR, Preview, Production을 각각 미진행으로 기록했다.
- [x] 관찰 사용자 수를 0명으로 기록했다.
- [x] traceability HTML·JSON과 verification manifest를 최종 수치로 갱신했다.

### Exit gate

- [x] primary 168, bridge 86, compound 77, subcheck 386 denominator를 최종 확인했다.
- [x] 초기 gap 98개와 bridge gap 24개의 요구 매핑·판정 근거를 확인했다.
- [x] 자동 QA, 브라우저, 실기, 관찰 사용자, publish 상태를 최종 분리 보고했다.
- [x] 미실행 항목을 완료로 표현하지 않았는지 최종 검토했다.

## 9. 요구 coverage ledger

다음 대표 패키지 배치는 primary gap 98개와 bridge gap 24개를 정확히 한 번씩
포함한다.

- `A0` primary 4: `V41-001`, `D1-010,013`, `D2-005`
- `A0` bridge 5: `BP-002,006,019,056,075`
- `A1` primary 11: `D1-005,006,017,025`, `D2-002,004,011,012,013,016,018`
- `A1` bridge 2: `BP-032,033`
- `A2` primary 4: `D1-009,016,019,024`
- `A3` primary 11: `D1-001,002,003,004,012,018`,
  `D2-021,035,036,039,040`
- `A3` bridge 2: `BP-038,080`
- `A4` primary 2: `D1-011`, `D2-058`
- `A4` bridge 4: `BP-059,060,062,063`
- `A5` primary 7: `D1-021,022,023`, `D2-003,017,019,020`
- `A5` bridge 5: `BP-007,035,049,069,079`
- `A6` primary 12: `D2-022,029,030,031,032,033,034,037,038,043,044,055`
- `A6` bridge 1: `BP-074`
- `A7` primary 6: `D2-046,050,052,053,054,056`
- `A8` primary 18: `V41-004,005,006,007,008,009,010,018,019,020,037,043,051,058,065,066,067,068`
- `A9` primary 12: `V41-028,033,034,036,049,053,070`, `D1-014,015`,
  `D2-007,042,061`
- `A10` primary 5: `D2-023,024,025,026,041`
- `A10` bridge 3: `BP-017,027,053`
- `A11` primary 1: `D2-057`
- `A12` primary 5: `V41-047,062,063,064`, `D2-063`
- `A12` bridge 2: `BP-081,083`

## 10. 의도적 변경·제외 유지

- [ ] V41 `029,035,040,069,071,072,073,074,075,076,077,078`의 이유와 revisit
  trigger를 유지한다.
- [ ] D2 `008,027,028,060,062,064`의 이유와 evidence boundary를 유지한다.
- [ ] BP `008,036,054,057`의 shadow/operating owner 차이와 제외를 유지한다.
- [ ] dark mode, sync, public, 외부 도구, recurrence runtime, account/cloud/AI, deploy를
  별도 승인 없이 구현하지 않는다.

## 11. 게시 상태

- [x] commit: 미진행
- [x] push: 미진행
- [x] PR: 미진행
- [x] Preview: 미진행
- [x] Production: 미진행
- [x] 관찰 사용자: 0명

위 값은 현재 문서 작성 시점의 상태다. 후속 작업에서 실제 상태가 바뀌면 각 항목을
독립적으로 갱신한다.
