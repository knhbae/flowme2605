# K3-C C3 — 로컬 UI 요구 비교·검증 원장

2026-09-06. **C3의 정한 구현·기능 검사 범위 완료, 보고서·K4 설계 인계 중**이다. 제공 HTML은 `55C57D51` / 각 1,925,497bytes다. 최종 React build `lLXF4heLSEAJg53NdomoU` / Surface `B0ABB3B1` / Review `AF9F336E` / shell CSS `DDC7B446`를 고정했다. [승인 설계](./k3c-c3-local-ui-design.md) §11 범위만 변경했으며 C2 성공이나 모든 UI의 완성 판정으로 확대하지 않는다.

## 요구를 어떻게 비교하는가

| 원본·후속 요구 | 현재 차이 | 이번 수정 범위 | 확인할 증거 |
| --- | --- | --- | --- |
| v4.1의 모바일 조작 크기, D1/D2의 핵심 편집 행동 | standalone C1 방문의 40회 측정 중36회 48×48 미달 | 클릭 box의 폭과 높이를 모두48 이상으로. 작은 glyph는 유지 | 같은8행동×5화면, full rect·9점hit·실제ancestor clipping. 고유36개 버튼으로 표현하지 않음 |
| 후속 제품 UX/C3의 로컬 청록 primary/focus | React 로컬 변수는 있으나 실제 action/focus는 전역 파랑 상속 | `.localMain` 안에서만 기존 workspace 값에 alias. 글로벌 nav는 형제로 보존 | 기본 `/my`·잘못된 query·PoC 전역/로컬 computed 전후 비교, 실제 hover/focus/상태색·대비 |
| D1의 같은 편집 진입 중복 금지 | standalone 상세와 결과에 동일 Flow의 같은 Plan editor 진입2개 | 상세 toolbar `개인 편집`1개 유지 | exact flow ID/같은 editor·취소·dirty·저장/Undo의 살아 있는 opener |
| D2의 필요한 선택만 노출, 후속 기술 정보 감산 | 결과 기본 제목·원문 disclosure에 내부 용어, React 닫힌 비교 진입 중복 | 목적 중심 문구, practice 정상 banner만 감산 | 원문/criteria/ID/네 결과/Sheet/내보내기 불변, 실제 record exact 재개 |
| 공통 실패·복구·접근성 | 감산으로 유일 진입이나 이유를 숨길 위험 | failed/stale/recovery·applying/undoing과 기본 presenter 출력 보존 | 기본12조합 exact, 새 practice 조건·actual selected gate, C2 회귀 |

실제 Android/iOS·OSIME/OSBack·보조기술은 미실행이며 관찰 사용자0명이다. 자동 viewport와 screenshot을 실제 기기·관찰 검증이라고 부르지 않는다.

## 변경 전 기록

- standalone 첫3등록 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-standalone-local-ui-baseline-20260906-01.json`): S01은 원래8행동×5화면의40측정을 전부 수집했다. 기존44px 높이/fullrect/9점hit·완료/Undo·저장 경계는 통과했으나48×48은36회 미달이다. S02는 같은 editor 진입2개와 기술 문구에서 RED이며 네 결과 manifest/원문/Sheet8열·취소 focus는 보존됐다. S03의 ‘무변경 저장은 disabled’ 기대는 기존 no-op 저장을 오인한 하니스 문제다.
- standalone 색상 후속 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-standalone-local-token-baseline-20260906-01.json`): 실제 primary `#087f73`, hover `#066c63`, focus `#1268b1`. 선택 tab의 흰 배경은 유지하고 글자/테두리 strong teal을 비교한다. soft 배경을 새 선택 정책으로 추가하지 않는다.
- React shell 계약13 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-local-token-contract-red-2026-09-06T06-43-36-805Z.json`): 기존 검사 중 로컬 alias 금지 assertion만 승인된 경계로 갱신한 뒤12PASS/1RED. 실제 CSS 수정 전 결과다. 전역 action/focus의 선언이나 소비를 바꾸지 않는다.
- React 신규4등록은 L01 전역/로컬, L02 상태색, L03 다섯 크기, L06 비교 기록이다. 첫 실행의 L03은 Plan 취소 뒤 열린 결과를 닫지 않아 정상 source-entry guard에 차단된 하니스 문제다. 제품 guard를 없애지 않고 실제 결과 닫기를 검사 경로에 추가한다. 최종 baseline과 구현 후 판정은 후속 절에 남긴다.

## 소유와 변경 제한

root: `PersonalWorkspacePocProductShell.module.css`와 해당 좁은 test. C1 preview control도 scoped CSS로 연결하며 EntryPreview 컴포넌트 자체는 수정하지 않았다. 독립 구현: standalone `app.js`/`style.css`의 CSS·표현만. 별도 담당: Review의 optional practice 정상 banner 표현과 Surface의 prop 전달1곳. 브라우저 검증 담당은 제품을 수정하지 않는다.

React CSS/test before는 `output/poc-gap-implementation/k3c/before-c3-react-local-ui-20260906-01/`, standalone 소스·제공 HTML before는 `output/poc-gap-implementation/k3c/before-c3-standalone-20260906-01/`에 보존한다. manifest551는 재채취하지 않는다. 기본 `/my`·전역 CSS/nav·운영 key/schema/writer·source/personal/execution owner·editor lifecycle은 보호한다.

## 남은 실행

실제 baseline 완료 → 최소 CSS/표현 구현 → focused·기존 회귀·npm/build → 두 runtime5화면·키보드·비드래그·실패/Undo/reload → 제공 HTML 재생성·pin/host/file → 보고서·보호·다음 K4 설계 순서다. 색상 선언이나 테스트 코드 존재만으로 UI 충족을 표시하지 않는다. 전체254/424 충족률은 재계산하지 않는다.

commit·push·PR·Preview·Production은 미실행이다. 전체 단계별 목표는 active다.

## 07:03 UTC — 구현 후보와 실행 결과

- React 변경 전 전체 실행은 3PASS/하니스1FAIL, 보정한 기록 재열기 단독은1PASS다. 합동4PASS로 합치지 않는다. 5화면×12행동=60측정 중25회가44px, 나머지35회는48px 이상이었다. full rect/540점 hit는 통과했다. fixed drawer가 localMain의 오른쪽 밖에 있으나 viewport 안에 있는 경우를 일반 부모 clip으로 오인한 하니스를 실제 containing-block 기준으로 보정했다.
- shell 계약: 제품 변경 전13개 중12PASS/alias1RED → 제품 변경 후14개 중13PASS/검사주석오인1FAIL → 최종14/14PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-local-token-contract-final-2026-09-06T06-59-56-378Z.json`). 마지막 실패는 selector 검사가 설명 주석의 `calendar` 단어까지 읽은 문제로, 주석만 제외하고 금지 selector 검사는 유지했다.
- Review/Surface diff는 optional practice 표현, 정상 closed pending/applied 숨김, prop1필드뿐이다. failed/stale/busy/recovery와 오류가 있는 상태는 숨기지 않는다. 기존 effect·owner·writer 본문은 exact다. 신규6+기존23=29/29PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-react-record-entry-combined29-2026-09-06T06-54-50-295Z.json`), strict6entry 오류0. 기본12·opt-out12·open6 markup exact 검사는 SSR이며 실제 브라우저로 부르지 않는다.
- production build PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-production-build-2026-09-06T07-00-08-809Z.json`), 정적18경로 생성. 제공 HTML 재생성은 별도다.
- npm test (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-npm-test-2026-09-06T07-00-19-015Z.json`): 실제2,031개/2,030PASS/1FAIL. 기존 seed4건의 `review_due:2026-06-07` 실패다. 콘텐츠를 임의로 재검토 완료 처리하지 않는다. 뒤의 `&&` 단계는 여기서 실행되지 않아 별도로 approved execution201/201, public plan19/19를 실행했다.
- 보호551 최초 검사는 승인 CSS/test2경로를 allowlist에 아직 반영하지 않아 FAIL했다. 원 결과는 `output/poc-gap-implementation/k3c/c3-protected-first-20260906-01.json`에 보존했다. root의 before diff 검토 후 그2경로만 명시하고 07:01:11Z 재검사에서 unexpected0을 확인했다. 원 manifest의551 hash는 재채취하지 않았다.

다음은 새 build actual browser·standalone same-candidate 검증, 제공 HTML/pin/file/host, 최종 보고서다. 위 숫자는 서로 중첩되는 실행 결과이므로 합쳐 고유 테스트 총수로 표시하지 않는다.

## 07:20 UTC — C3 요구별 최종 판정

위 07:03 절은 당시 중간 기록이다. 최종 제품 수정은 scoped CSS·표현뿐이며 source/model/writer/schema·편집 lifecycle은 변경하지 않았다. K4 필드 기능은 이 단계에 포함하지 않는다.

| 요구 | 변경 전 → 현재 | 판정 범위 |
| --- | --- | --- |
| v4.1/D1 핵심48×48 | standalone 상세40측정 중36미달 →40/40충족. 비교54측정도54/54충족 | 실제5화면, width AND height·전체 rect·실제clip·9점hit. 모든 버튼 전수는 아님 |
| D2 비교·작성48×48 | React 비교60측정 중25미달 →60/60충족. 추가 하위체크 값선택54.484×44 →48높이충족 | 비교5화면, 추가 하위체크390표본1. 원문선택 문구·focus·원문/draft exact·해당click API0 |
| 후속 로컬 색상 계약 | React전역action/focus 상속·standalone파랑focus →로컬청록 | default/invalid/exact의 global DOM/computed exact. normal/hover/selected/focus/failed/danger·warning 실제 표본. disabled0.6 합성 대비는 미측정 |
| D1 동일편집 중복 | standalone 같은Flow 동일editor2진입 →상세1진입 | 네 결과/원문/identity/Sheet8열/내보내기·실제취소focus 보존. React 다른맥락의 Item/Plan 버튼은 삭제하지 않음 |
| D2 비교기록과 기술 표현 | 구현용 제목/정상 닫힌 중복banner →목적형 문구/기록진입1 | mounted presenter·실제결정/recordID/sourceUndo 유지. 기본12/optout12/open6 exact, 오류·잠금·진행상태 보존 |
| v4.1 실행·D1편집·D2작성 연결 | UI 변경이 기존 동작을 깨뜨릴 위험 →관련actual회귀PASS | 아래33개/8개/12개는각실행이며중복을새고유검사로더하지않음 |

### 실제 실행 수·후보

| 실행 | 실제 결과 | 근거·제한 |
| --- | --- | --- |
| React 최종 UI/작성 | 8/8PASS | lLXF raw JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-local-ui-final-freeze-20260906-08.json`). C3기본4 + warning/하위체크2 + 기존EX/HS2 |
| React 기존gate/실행/작성 | 33/33PASS | 최종 원형 회귀 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-gates-existing-final-20260906-02.json`). gate9+integration10+poc14, 1worker/retry0 |
| 기존 C2 비교 | 9/9PASS | Q8H 회귀 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-source-practice-c3-regression-20260906-10.json`). 이후CSS 하위체크1추가 전 결과이며lLXF실행이라고부르지않음 |
| standalone local UI | 4/4PASS | 최종4 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-standalone-local-ui-four-final-20260906-02.json`), source FF9D/98F3. 상세40·비교54 actual측정. [별도 QA](./k3c-c3-standalone-local-ui-qa.md) |
| standalone 비교 캡처 보완 | 1/1PASS | 고유파일15 재촬영 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-standalone-practice-unique-captures-20260906-01.json`). 같은4등록의S04재실행, 신규5개로합산금지 |
| 실제제공file + host | 12/12PASS | 55C raw JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-provided-file-host-20260906-01.json`). 제공HTML두경로 상세2 + 작성/비교2 + host8 |
| React 관련model/presentation | 113/113PASS | 합동113 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-related113-2026-09-06T07-07-53-548Z.json`). 신규표현6·기존23·shell14 포함. 마지막CSS보완후 shell14 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-shell-final14-2026-09-06T07-14-50-338Z.json`) 별도PASS |
| standalone 기존/신규model | 135/135PASS | 생성후검사 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-generated-model-suite-2026-09-06T07-07-04-061Z.json`). EPR6+표현3 별도9/9, 관련57/57은 standalone QA에분리 |
| 제공pin/기기runner/hostCLI | 27/27,16/16,13/13PASS | evidence17+verifyCLI10이27. 과거C2의evidence17+host13=30과다른조합. 실제기기검사아님 |
| 전체npm / 후속중단단계 | 2,031실행/2,030PASS/기존1FAIL;별도201/201·19/19PASS | 07:00 UI후보실행. source검토기한4건으로실패. 마지막CSSselector1뒤shell14/build/browser를재검증했으며npm전체green아님 |
| production build | PASS | 최종 lLXF (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-final-production-build-2026-09-06T07-12-12-745Z.json`), 정적18경로. 이후제품소스변경0 |

### 수정한 검사와 실패 이력

- 기존33 첫실행은32PASS/selection시점1FAIL이었다(원본 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-gates-existing-final-20260906-01.json`)). 실제 `focusPropertyValue`→pending focus→effect의RAF 후선택 구조를 확인했다. 원래 `표 확인하기` 기대를 유지하며 그1곳만 `expect.poll`로기다린뒤최종33/33이다. 제품원문/선택lifecycle을검사편의로바꾸지않았다. before파일은 `before-c3-provided-html-20260906-01/`에있다.
- 추가측정에서하위체크값선택44px를확인하고CSS에해당testid접두사1개만추가했다. 비교60회통과가모든작성control통과를뜻하지않는사례다.
- standalone원형EPR01은승인전기술문구/중복CTA까지byteexact였다. 실제RED를보존하고승인된markup3부분만expected-before에반영했다. 그밖bytes·모델·실제출력은그대로검사한다.
- 캡처의caret-hide가빈style속성을남긴문제는 `caret:initial`로수정하고DOMexact검사는유지했다. 같은등록의viewport캡처파일명중복은고유접미사로보완해15장을다시생성했다. 최초실행27캡처를고유27PNG로표현하지않는다.

### 다섯 화면 직접 평가

root는 Q8H 비교ready5장·standalone완료/Undo5장과최종lLXF하위체크/375/844의3장을직접봤다. 독립담당은각최종캡처를별도검토했다. 화면은 `fullPage:false`이며보이는스크롤상태만설명한다.

| 화면 | 확인한표현 | 남은한계 |
| --- | --- | --- |
| 390×844 | 비교선택·닫기/적용·완료/Undo구별,긴제목줄바꿈,하위체크값선택도48px | 비교내용과작성helper는내부스크롤사용. 전체앱정보밀도완료판정아님 |
| 375×812 | 최하단행동도화면내접근,비교라벨과완료Undo줄바꿈유지 | 현재스크롤위치에서는위쪽변경번호가고정제목아래로벗어날수있음. 개별target은scroll후검사 |
| 844×390 | 비교footer와선택항목/실행Undo가서로가리지않음 | 비교전체값이동시에보이는것아님. 내부스크롤로각대상전체rect확인 |
| 1024×768 | 상세·비교drawer의역할구별,완료Undo와편집진입분리 | viewportfixeddrawer가localMain폭밖이어도실제viewport안이면부모clip으로오인하지않음 |
| 1440×900 | 회색탐색·흰본문·청록행동유지,상세중복편집감산 | 상단/상세복귀여백과전반정보밀도는이번표본만으로완성판정하지않음 |

### 제공 파일·운영 보호·다음 단계

두 제공 HTML은 동일 SHA `55C57D51ECE599CACA060D5A7A825A600E2D98D8E428DC51EC76E81855D8E8AD`, 각 1,925,497bytes다. 기존 A59 두 파일·pin5·수정 검사 before를 보존했고 `buildText`와 제공 bytes exact를 확인했다. 비교 계수 관측용 HTTP의 runtime wrapper 주입69846은 제공55C와 같은 bytes가 아니다. file/host12 검사 중 실제 file4(상세2·작성/비교2)는 제공 파일 그대로 열었으며 작성/비교 관측은 init wrapper를 사용했다.

standalone최종4의12context에서제품API50/실제byte변경50(실행거래40+source apply/Undo10),read단계0·prefix밖/clear/오류0이다. 개별쓰기수는성공거래수와다르다. 실제file/React의계측도각원JSON에분리하며사용자프로필의운영데이터를전수검사했다는뜻은아니다. 보호551는07:17:38Z unexpected0,원manifest재작성0이다.

다음은 **K4-D 날짜·포함/복원·원문block 무손실설계검증과구현gate**다. K4의새durablefield·운영writer·제품정책은C3에추가하지않았다. 실제AndroidChrome/iOSSafari·OSIME/OSBack·보조기술NOT_RUN,관찰사용자0. commit/push/PR/Preview/Production모두미실행이다.

### 현재 추적 보완과 보고서 검토

[현재 요구 추적 보완](./k3c-c3-current-trace.md)은 finding5개를 기존 부모14·하위16 ID에 연결한다. 원본대로 유지한 것·후속 승인으로 바꾼 것·부분 표본·미검사를 구별했다. 원본사진 대비 상단 높이/첫 행과 compiler 전체는 C3 완료로 올리지 않았다. 역사 감사 JSON/추적 HTML의 재점수와 변경은 0이다. [React 독립 QA](./k3c-react-local-ui-qa.md)와 [standalone 독립 QA](./k3c-c3-standalone-local-ui-qa.md)의 실제 후보·횟수를 따로 조회할 수 있다.

C3 보고서 자체는 5/5 PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-report-20260906-01.json`)다. 10개 구획×5크기의 PNG50장을 생성했고 root는 C3 카드390/1440을 직접 보았다. 이는 제품 브라우저나 관찰 사용자 검사를 추가한 수가 아니다. K4 통합 패키지가 추가된 후에는 보고서를 별도 후보로 다시 검사한다.
