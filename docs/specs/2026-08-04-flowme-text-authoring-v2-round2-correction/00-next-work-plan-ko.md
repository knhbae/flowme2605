# FlowMe 텍스트 저작 v2 다음 업무 계획

> 사용자 피드백 10개, Claude Design v2, Codex Text Authoring v2, P35 Round 2의 관계를 정리하고 다음 보정 작업을 순서대로 실행하기 위한 정본 계획이다.

## 0. 문서 상태

| 항목 | 값 |
|---|---|
| 기준일 | 2026-08-04 |
| 계획 상태 | `ROUND2_LOCAL_IMPLEMENTATION_COMPLETE` |
| 구현 상태 | `TA-R2-G0`~`TA-R2-06`, `TA-R2-SEC-01` PASS / `TA-R2-INT-GATE` 계약 판정 완료 |
| 작업 checkout | `D:\flowme2605\flow-text-authoring-ta` |
| 작업 branch | `codex/text-authoring-ta-implementation-20260729` |
| 다른 checkout의 역할 | `flow-mvp`는 Claude ZIP 보관처, `flow-p35-production-mobile-p0`는 읽기 전용 참고 |
| publish 상태 | commit, push, PR, merge, Preview, Production 모두 미수행 |
| 사용자 검증 | 이번 계획에서 제외. 내부 시뮬레이션과 브라우저 QA만 수행 |

이 문서는 구현 승인이나 배포 승인을 대신하지 않는다. Round 2는 아래 순서와 선행 gate를 지켜 로컬에서 실행했으며, 이 완료 상태 역시 commit·배포·사용자 검증 승인을 뜻하지 않는다.

### 0.1 실행 완료 요약

| Gate | 최종 판정 | 핵심 증거 |
|---|---|---|
| `TA-R2-G0` | `PASS` | 대표 예시 5개 × viewport 4개, route/standalone `20 / 20`, 제품 PNG 40개와 Claude 구조 참고 PNG 4개 |
| `TA-R2-G1` | `PASS` | canonical v2·read compatibility·H1 우선순위·최초 원문 snapshot 소유권 고정 |
| `TA-R2-01` | `PASS` | source `[x]`, merge 충돌 fail-closed, split 경계 확인, Sheet/export parity 보정 |
| `TA-R2-02` | `PASS` | 날짜순 preview, 같은 Step의 완전한 Item block 정렬, 확인·원자 적용·undo, 원문 기준일 동기화 |
| `TA-R2-03` | `PASS` | 네 결과 슬롯 고정, Sheet 정체성, raw/structured Text 분리, 상세·자료·출처 시각화 |
| `TA-R2-04` | `PASS` | Claude의 3영역 구조만 선별 적용하고 FlowMe 색·타이포·control 체계 유지 |
| `TA-R2-05` | `PASS` | route/standalone 동등성, 짧은 화면·가로 화면의 끝 도달과 독립 스크롤 확인 |
| `TA-R2-06` | `PASS` | authoring `161 / 161`, full unit `694 / 694`, focused E2E `31 / 31`, build `18 / 18` |
| `TA-R2-SEC-01` | `PASS` | dependency audit High `0`, Critical `0`, Total `0` |
| `TA-R2-INT-GATE` | `SEPARATE_WITH_ADAPTER_CONTRACT` | P35 runtime 연결은 `HOLD_NOT_READY`; P35 checkout 변경 0 |

상세 근거는 [Round 2 결과 README](../../content-audit/2026-08-04-flowme-text-authoring-v2-round2-results/README.md), [권위·갭 장부](./source-authority-and-gap-ledger.md), [보안 게이트](./security-gate.md), [P35 연결 게이트](./p35-integration-gate.md)에 나뉘어 있다.

## 1. 한 문장 방향

> **현재 Codex v2의 문법·데이터·원문 보존 계약은 유지하고, Claude 시안의 구조적 장점만 FlowMe 색감과 실제 제품 코드에 맞게 옮긴 뒤, P35의 소유권·capability·preview/export 일치 원칙으로 회귀를 막는다.**

따라서 사용자 피드백 10개를 처음부터 다시 구현하지 않는다. 이미 반영된 계약은 고정하고, 실제 화면에서 덜 매끄러운 부분과 Claude 시안에서 새로 발견된 손실 위험을 보정한다.

## 2. 입력 자료와 권위

### 2.1 자료 목록

1. 사용자 피드백 10개
   - 제품 의도와 최종 사용성 판정의 최상위 기준이다.
2. Claude Design v2
   - 파일: `D:\flowme2605\flow-mvp\claude_work\FlowMe 텍스트 저작 v2_260804_1617.zip`
   - SHA-256: `10C2090C6A3B3239176E090F8D17A085F8909DF7839FCF92DFD4514186E4BDCF`
   - 역할: 구조, 정보 위계, 상호작용 아이디어 참고.
3. Codex Text Authoring v2
   - [구현 완료 보고](../../content-audit/2026-08-04-flowme-text-authoring-grammar-ux-improvement-results/README.md)
   - [정본 v2 계약](../2026-07-28-flowme-text-authoring-ux-v1/text-authoring-contract-v2.json)
   - [현재 standalone HTML](../../content-audit/2026-08-04-flowme-text-authoring-grammar-ux-improvement-results/flowme-text-authoring-v2-test.html)
   - 역할: parser, writer, 원문 보존, stable Item, projection, export, 테스트의 현재 로컬 정본.
4. P35 Round 2
   - 진입 문서: `D:\flowme2605\flow-p35-production-mobile-p0\docs\specs\2026-08-04-p35-round2-bounded-ux-correction\00-development-goals-summary-and-links-ko.md`
   - 역할: source/draft/overlay 소유권, capability 기반 결과, Item ID·count 일치, loss schema, 모바일·접근성 QA의 참고 계약.

### 2.2 충돌 시 판정 순서

| 충돌 영역 | 우선하는 근거 | 적용 규칙 |
|---|---|---|
| 사용자가 보는 의미·행동 | 최신 사용자 피드백 | 이미 구현됐더라도 실제 화면에서 이해되는지 다시 확인한다. |
| 문법·데이터·원문 보존 | Codex v2 계약과 테스트 | Claude prototype parser로 교체하지 않는다. |
| 화면 구조·정보 위계 | Claude v2를 참고하되 사용자 감산 피드백 우선 | 색·폰트·design system은 이식하지 않고 구조만 선별한다. |
| 결과 소유권·ID/count·loss | P35 계약 원칙 | P35 route, storage, `/my`, public quick 구현은 가져오지 않는다. |
| 검증 판정 | 각 checkout의 실제 테스트 | P35 테스트 수치를 Text Authoring 통과 증거로 재사용하지 않는다. |

### 2.3 Claude 결과를 제품 정본으로 쓰지 않는 이유

- 기본 시각 스타일이 Broadsheet 청록·Source Serif 계열이라 현재 FlowMe 색감 유지 지시와 다르다.
- HTML이 `support.js`, `_ds/styles.css`, `_ds_bundle.js`에 의존하므로 진짜 단일 self-contained 파일이 아니다.
- prototype의 항목 식별은 배열 index 중심이며, Codex 계약의 stable Item ID와 source lineage를 대체할 수 없다.
- 전달된 35개 matrix 전체가 prototype 안의 동일한 자동 검증으로 재현된 것은 아니다.
- 표/엑셀, 완료 상태, 상세 내보내기, 병합·분리에서 제품 계약과 다른 손실 가능성이 있다.

Claude 결과에서는 다음만 선별한다.

- 넓은 화면의 `입력 → 항목 구조 → 결과` 3영역 흐름
- 구조 영역을 요약 중심으로 좁히고 결과 영역을 실제 미리보기에 더 넓게 주는 배치
- 모바일 `01 입력 / 02 항목 구조 / 03 결과` 단계 전환
- 상단 대표 예시 선택, 작은 문법 도움말, 고정된 결과 rail
- 고급 구조 편집을 기본 화면이 아닌 dialog/bottom sheet로 분리하는 방식

## 3. 현재 기준선

### 3.1 이미 구현된 사용자 결과

현재 Codex v2는 사용자 피드백 10개를 다음과 같이 반영했다.

| # | 사용자 요구 | 현재 기준선 | Round 2에서 할 일 |
|---:|---|---|---|
| 1 | 항목·속성에 `-` 표식, 표식 없는 문장은 text | writer는 `- [ ] Item`, `  - 설명: 값`; prose는 원문 보존 | 계약을 동결하고 legacy·unknown·nested 경계만 재검증 |
| 2 | 날짜 결과 순서와 원문 순서 조정 | Calendar만 날짜 오름차순, 명시적 `입력도 이 순서로 맞추기`와 undo | 원본 snapshot과 작성 draft 소유권, 적용 전후 예고를 더 명확히 함 |
| 3 | Sheet 정체성 | `표/엑셀`; 원본 표 또는 반복 필드일 때만 활성 | 단일 Item 오활성, 실제 열·URL·완료 상태 손실을 추가 차단 |
| 4 | 상대 날짜의 기준일을 메모에 표시 | `- 기준일: YYYY-MM-DD`가 유일한 계산 기준 | 기준일 UI와 원문 줄의 양방향 일치, 잘못된 기준일 상태를 더 분명히 표시 |
| 5 | 결과 형태 버튼 고정 | 네 슬롯의 순서·폭·위치 고정 | 추천/가능/조건부/불가 상태를 안정된 rail 안에서 표현 |
| 6 | `정리 메모`의 정체성 | `텍스트` 안에서 원문, 정리 TXT, 정리 Markdown 구분 | `원문 그대로`를 기본으로 하고 변환물은 복사·내보내기 안으로 정리 |
| 7 | 링크·상세 시각화 | 결과별 상세와 링크 표시 | 시간대·소요 시간·완료 기준·링크가 preview와 export에서 같은지 loss matrix로 검증 |
| 8 | 탭·표·CSV·Markdown의 이유 | 기술 형식명은 import/export 내부로 이동 | 첫 화면의 `표 붙여넣기`, 기준일 등 고급 제어도 필요할 때만 노출 |
| 9 | 수동 순서 번호 제거 | 작성 순서로 번호 계산, numbered list는 읽기 호환 | `[x]` 완료 상태와 정렬 후 번호가 projection/export에서 보존되는지 추가 확인 |
| 10 | `나눈 항목`의 의미 | `항목 구조` 읽기 요약 + `구조 수정` dialog | 병합 속성 충돌과 분리 기준을 명시하고 silent loss를 금지 |

### 3.2 내부 QA 기준선

| 검증 | 현재 증거 |
|---|---:|
| Text Authoring 테스트 | 147 / 147 |
| 전체 unit/workflow | 694 / 694 |
| API acceptance + 브라우저 matrix | 35 / 35 |
| 브라우저 U01~U08 | 8 / 8 |
| focused production E2E | 위험 기반 12개 시나리오 통과 |
| production build | 18 / 18 static pages |
| observed-user validation | 0명, 이번 범위에서 수행하지 않음 |

이 수치는 Round 2의 출발점이다. 변경 후 같은 수치 이상을 유지해야 하지만, 기존 통과만으로 새 변경이 통과한 것으로 간주하지 않는다.

### 3.3 남은 위험

- nested Item 실행 계약은 없다. `unsupported_nested_item` issue로 원문만 보존한다.
- 표식 없는 prose를 자동 Item으로 바꾸는 import-assist는 승인되지 않았다.
- 반복 문구는 보존하지만 occurrence 확장과 ICS `RRULE`은 만들지 않는다.
- My Flow, 계정·cloud sync, 외부 Calendar/VTODO 직접 쓰기는 통합되지 않았다.
- dependency audit에 `exceljs → archiver → minimatch/brace-expansion` 경로의 High 2건이 남아 있다.
- 현재 여러 checkout이 dirty 상태다. 이 계획에 명시되지 않은 변경을 정리·reset·stage하거나 소유권을 주장하지 않는다.

## 4. 목표 사용자 흐름

```text
대표 예시 선택 또는 원문 붙여넣기
    ↓ 즉시 반영
작성 중인 원문/메모
    ↓ parser
항목 구조 읽기 요약
    ↓ capability + projection
고정된 결과 rail
    ↓ 사용자가 하나를 선택
실제 내용 미리보기
    ↓ 명시적 행동
복사 또는 파일 내보내기
```

사용자는 다음을 한 번에 이해해야 한다.

1. 어떤 줄이 제목·단계·항목·속성·일반 text인지 알 수 있다.
2. 원문을 수정하면 같은 화면의 구조와 결과가 바로 바뀐다.
3. Calendar 순서와 원문 순서가 다를 수 있고, 원문은 사용자가 눌렀을 때만 바뀐다.
4. 결과 버튼은 움직이지 않으며, 만들 수 없는 결과는 짧은 이유와 함께 비활성 상태다.
5. 선택한 결과 안에서 실제 제목·날짜·설명·링크·완료 기준을 볼 수 있다.
6. 작은 화면에서도 현재 단계의 마지막 내용과 하단 행동까지 스크롤해 도달할 수 있다.

## 5. 데이터와 소유권 계약

Round 2 구현 전에 다음 경계를 문서와 테스트에 고정한다.

```text
rawSourceSnapshot        최초 붙여넣은 원문, 비교·복원 기준
        ↓ 복사
authoringDraft           사용자가 현재 편집하는 source text
        ↓ parse
SourceRow → Item → Step → Flow
        ↓ project
Calendar / Check·Todo / Sheet·Excel / Text
        ↓ explicit action
copy / export artifact
```

규칙:

- 자동 parse와 미리보기는 `authoringDraft`를 읽지만 원문을 재작성하지 않는다.
- 기준일 입력, 구조 수정, `입력도 이 순서로 맞추기`는 명시적 correction transaction으로 `authoringDraft`만 바꾼다.
- `rawSourceSnapshot`은 위 행동으로 바뀌지 않는다.
- correction은 변경 전 미리보기 또는 명확한 결과 설명, stable identity, undo를 가져야 한다.
- preview Item IDs/count와 export Item IDs/count는 일치해야 한다.
- 결과 형식별로 `preserved / transformed / omitted / held / unavailable`을 계산하며 silent drop은 허용하지 않는다.
- 날짜 없는 Item과 기준일 없는 상대 날짜 Item은 Calendar에서 `held` 또는 `unavailable`이며 가짜 날짜를 만들지 않는다.

## 6. Claude 구조의 채택·수정·제외 결정

| Claude 요소 | 결정 | 적용 방식 |
|---|---|---|
| 데스크톱 3열 | 수정 채택 | 입력과 결과에 충분한 폭을 주고 구조는 읽기 요약 중심으로 더 좁게 구성 |
| 모바일 3단계 탭 | 채택 | 한 번에 한 pane, 각 pane 독립 스크롤, 하단 이전/다음은 모바일에만 제공 |
| 고정 4개 결과 슬롯 | 수정 채택 | 위치는 고정하되 추천 1개, 바로 가능한 보조 최대 2개, 조건부·불가 사유를 상태로 표현 |
| 결과 슬롯마다 별도 `설명 ?` | 제외 | 결과 영역에 하나의 문맥 도움말을 두고 선택된 결과의 이유만 표시 |
| 상단 대표 예시 | 채택 | 제품 예시 3~5개만, 27개 QA 사례는 `authoringQa=1`에서만 노출 |
| 작은 `문법 ?` | 채택 | 일반 설명은 disclosure에 숨기고 오류·손실 위험은 본문에 유지 |
| 구조 수정 bottom sheet/dialog | 채택 | 기본 구조는 읽기 전용, 고급 조작만 별도 surface |
| Broadsheet 청록·Source Serif | 제외 | 현재 FlowMe 토큰, 초록 accent, 기존 본문 글꼴 유지 |
| Claude prototype parser/export | 제외 | Codex v2 library와 테스트를 그대로 사용 |
| 외부 `_ds` bundle 의존 | 제외 | 제품 component와 기존 CSS token으로 구현, standalone은 실제 self-contained로 생성 |

## 7. 엄격한 실행 순서

### TA-R2-G0. 자료·화면·권위 대조 고정

**목표**  
현재 route, 현재 standalone, Claude 시안, 사용자 피드백을 같은 시나리오로 비교해 무엇을 유지·수정·제외할지 한 장부로 고정한다.

**작업 순서**

1. 세 checkout의 branch, HEAD, upstream, dirty 목록을 다시 기록한다.
2. Claude ZIP의 checksum과 파일 목록을 기록하고 원본은 수정하지 않는다.
3. 같은 5개 대표 예시를 현재 route, standalone, Claude 시안에서 연다.
4. 데스크톱 1440×900, 태블릿 1024×768, 모바일 390×844와 390×600을 캡처한다.
5. 사용자 피드백 1~10을 `이미 충족 / 표현 보정 / 로직 결함 / 범위 밖`으로 분류한다.
6. Claude 요소를 `채택 / 수정 채택 / 제외`로 확정한다.

**산출물**

- `source-authority-and-gap-ledger.md`
- 같은 예시·viewport의 before/reference 화면 묶음
- Round 2 변경 파일 후보와 시작 시 dirty ownership 표

**PASS 조건**

- 모든 요구가 하나의 owner와 다음 ticket에 연결돼 있다.
- 현재 통과 기능을 새 기능처럼 다시 구현하는 항목이 없다.
- P35 파일을 stage·수정·복사하지 않았다.

### TA-R2-G1. 문법·source ownership 동결

**의존성**: `TA-R2-G0 PASS`

**목표**  
시각 수정 전에 writer 문법과 source/draft 경계를 고정해 화면 작업이 parser 계약을 흔들지 못하게 한다.

**동결할 writer 문법**

```markdown
# Flow 제목
- 기준일: 2026-08-10

## 단계
- [ ] 항목
  - 설명: 설명입니다.
  - 날짜: 2026-08-03
  - 자료: [안내](https://example.com)
```

**작업 순서**

1. canonical Item은 `- [ ]`, canonical 속성은 `  - 공식 키: 값`으로 유지한다.
2. 표식 없는 prose는 Item으로 승격하지 않고 source text와 issue에 남긴다.
3. 단순 `- 일반 목록`, numbered list, v1의 대시 없는 속성은 읽기 호환 범위를 문서와 fixture에 명시한다.
4. unknown colon bullet은 `unknown_property`, 들여쓴 checkbox는 `unsupported_nested_item`으로 보존한다.
5. `rawSourceSnapshot`과 `authoringDraft`의 생성·수정·복원 owner를 타입과 테스트 이름에 반영한다.
6. Flow 제목 입력 UI와 source의 `# 제목`이 둘 다 존재한다면 한쪽만 source of truth가 되도록 양방향 일치 계약을 검증한다.

**산출물**

- v2 contract 보충 결정 또는 현 계약 유지 판정
- writer→parser→writer golden fixture
- legacy read / v2 write 호환 matrix

**PASS 조건**

- 속성 bullet을 추가해도 Item count가 늘지 않는다.
- writer 결과를 다시 읽었을 때 제목·단계·Item·속성·링크·날짜가 같다.
- UI 시각 변경 없이 계약 테스트가 먼저 통과한다.

**중단 조건**

- canonical 문법을 바꿔야 하는 결함이 발견되면 Round 2 UI 작업을 중단하고 별도 문법 결정으로 돌린다.

### TA-R2-01. parser·writer·round-trip 결함 보정

**의존성**: `TA-R2-G1 PASS`

**목표**  
Claude prototype에서 발견된 손실 가능성을 제품 library와 실제 export에서 재현하고, 재현되는 결함만 고친다.

**필수 시나리오**

1. Item 1개에 속성 2개가 있어도 일반 반복 목록 Sheet를 활성화하지 않는다.
2. Item 2개 이상에 공통 의미 필드 2개 이상이면 실제 열로 Sheet를 활성화한다.
3. `[x]` 완료 상태가 Todo preview와 Markdown/Sheet export에서 의도대로 보존된다.
4. 설명, 완료 기준, 시간, 시간대, 소요 시간, 장소, 반복, 조건, 링크가 형식별 loss matrix와 일치한다.
5. exact source copy는 변환된 TXT/Markdown과 명확히 분리되고 원문 내용이 바뀌지 않는다.
6. merge 시 같은 키의 서로 다른 값이 있으면 조용히 하나를 버리지 않는다.
7. split은 숨은 문자 규칙에 의존하지 않고 사용자가 경계를 확인할 수 있다.
8. numbered list와 v1 속성을 읽은 뒤 v2 writer가 canonical 형식으로 내보낸다.

**구현 원칙**

- 재현되지 않은 Claude prototype 결함을 추측으로 제품 코드에 이식하지 않는다.
- parser, model, writer, export를 함께 고치고 fixture 없이 UI만 보정하지 않는다.
- unsupported data는 보존하거나 `held/unavailable`로 표시하며 임의 추정하지 않는다.

**PASS 조건**

- 새 golden fixture 전부 통과.
- silent field/link/status loss 0.
- stable Item ID와 source lineage가 correction 전후 유지된다.

### TA-R2-02. 날짜·정렬·기준일 transaction 보정

**의존성**: `TA-R2-01 PASS`

**목표**  
Calendar의 자연스러운 날짜순과 사용자가 작성한 순서를 분리하면서, 원문이 언제 왜 바뀌는지 예측 가능하게 만든다.

**작업 순서**

1. Calendar view는 resolved date 오름차순, 같은 날짜는 source order로 고정한다.
2. Todo, Sheet, Text는 source order를 유지한다.
3. 두 순서가 다를 때만 `입력도 이 순서로 맞추기`를 노출한다.
4. 행동 옆에 `현재 단계 안에서 날짜순으로 원문 항목을 옮깁니다`처럼 결과를 짧게 알린다.
5. 적용 범위는 각 Step 내부 Item 블록과 그 소유 속성으로 제한한다.
6. 날짜 없는 Item은 뒤에 두되 Calendar event로 만들지 않는다.
7. 실행 직후 source, 구조, 결과를 같은 transaction으로 갱신하고 undo를 제공한다.
8. undo는 제목·속성·빈 줄·일반 text를 포함한 이전 draft를 복원한다.
9. 상대 날짜는 유효한 `- 기준일: YYYY-MM-DD`가 있을 때만 계산한다.
10. UI 기준일 수정은 숨은 state가 아니라 authoring draft의 기준일 줄을 즉시 추가·수정·삭제한다.

**필수 시나리오**

- 역순 절대 날짜
- 같은 날짜 2개 이상
- 날짜 있음·없음 혼합
- D-3 / D-Day / D+2
- 기준일 없음, 형식 오류, 기준일 삭제
- 두 Step에 날짜가 섞인 경우
- 정렬 적용 후 undo와 다시 적용

**PASS 조건**

- Calendar sort만으로 source가 바뀌지 않는다.
- 명시적 행동 전후 Item IDs/count가 같다.
- `rawSourceSnapshot` byte/content가 바뀌지 않는다.
- 기준일이 없으면 추정 날짜 0건이다.

### TA-R2-03. 결과 rail·Sheet·Text·상세 projection 보정

**의존성**: `TA-R2-02 PASS`

**목표**  
결과 형태의 위치를 안정시키면서 사용자가 실제로 얻을 내용을 형식명이 아니라 실제 데이터로 확인하게 한다.

**결과 rail 계약**

```text
캘린더 | 체크/할 일 | 표/엑셀 | 텍스트
```

- 네 슬롯의 위치·폭·순서는 입력에 따라 바뀌지 않는다.
- 한 슬롯만 현재 추천 결과로 강조한다.
- 바로 가능한 보조 결과는 최대 2개까지 일반 활성 상태로 둔다.
- 조건이 부족한 슬롯은 조건부 또는 비활성 상태와 한 줄 이유를 가진다.
- 도움말 버튼을 네 개 반복하지 않고 결과 영역의 문맥 도움말 하나로 통합한다.
- P35의 public quick, 저장, receipt 행동은 이 ticket에 넣지 않는다.

**형태별 역할**

| 형태 | 활성 기준 | 반드시 보이는 내용 | 금지 |
|---|---|---|---|
| 캘린더 | 계산 가능한 날짜가 1개 이상 | 실제 날짜순, 제목, 시간·장소, 관련 상세·링크, 포함·제외 수 | 가짜 날짜, 날짜 없는 VEVENT |
| 체크/할 일 | canonical Item이 1개 이상 | source order, 완료 상태, 설명·완료 기준·링크 | 제목만 복사하며 상세를 조용히 버리기 |
| 표/엑셀 | 원본 표 또는 2개 이상 Item의 공통 의미 필드 2개 이상 | 실제 열 이름, 셀, URL, source order | `순서/항목/날짜`만으로 억지 활성화 |
| 텍스트 | source text가 존재 | `원문 그대로` 우선, 정리 TXT/Markdown은 별도 변환물 | 원문과 정리본을 같은 결과로 오인시키기 |

**PASS 조건**

- 입력을 바꿔도 결과 rail geometry가 움직이지 않는다.
- preview와 copy/export의 Item IDs/count가 같다.
- 선택한 형태에서 설명·완료 기준·날짜·시간·장소·링크가 자연스러운 위치에 보인다.
- 형식별 누락은 loss reason으로 설명되며 silent drop이 없다.

### TA-R2-04. Claude 구조 적용과 UX 감산

**의존성**: `TA-R2-03 PASS`

**목표**  
현재 FlowMe 색감은 유지하면서 Claude 시안의 정보 구조를 적용하고, 사용자가 당장 쓰지 않는 설명과 제어를 기본 화면에서 뺀다.

**데스크톱**

1. `입력 / 항목 구조 / 결과`의 의미는 유지한다.
2. 구조 영역은 읽기 요약 중심으로 줄이고 결과 영역은 실제 preview가 잘 보이도록 넓힌다.
3. 상단에는 대표 예시 선택과 작은 문법 도움말만 둔다.
4. 현재 화면의 큰 전폭 `구조 확인` 같은 고정 CTA는 실제 저장·진행 owner가 아니면 제거하거나 해당 영역의 국소 행동으로 옮긴다.
5. Flow 제목 별도 필드와 source 제목이 중복돼 보인다면 한쪽을 보조 편집기로 명확히 하거나 source 중심으로 단순화한다.
6. 결과 카드의 반복 heading, count echo, 같은 설명의 반복을 제거한다.

**도움말**

- 일반 문법, 속성 목록, CSV/TSV/Markdown 설명은 `?` disclosure 또는 import/export 안에 둔다.
- `?`는 label, keyboard focus, Escape, focus return을 지원한다.
- 데이터 손실, 덮어쓰기, 기준일 없음, 비가역 상태는 도움말 안에만 숨기지 않는다.
- 한 화면에 같은 종류의 `?`를 반복하지 않는다.

**구조 영역**

- 기본값은 Step, Item, 핵심 속성의 읽기 요약이다.
- 이동, 병합, 분리, 역할, 포함 여부는 `구조 수정` 안에서만 보인다.
- 선택 전부터 빈 편집 toolbar나 `선택한 항목` placeholder를 길게 노출하지 않는다.
- merge 충돌과 split 결과는 적용 전에 확인하고 undo할 수 있다.

**시각 원칙**

- 현재 FlowMe의 흰 배경, 검정 본문, 초록 accent와 기존 token을 유지한다.
- Claude Broadsheet theme, Source Serif, `_ds` bundle을 가져오지 않는다.
- card, border, badge, helper text를 추가하기 전에 기존 요소를 감산한다.
- 색만으로 추천·비활성·오류를 구분하지 않는다.

**PASS 조건**

- 첫 화면에 제품 사용과 무관한 QA 정보가 없다.
- 대표 예시는 3~5개이며 27개 검증 예시는 QA 모드에만 있다.
- 같은 정보가 heading, badge, card 본문에 세 번 반복되지 않는다.
- 사용자가 결과를 보기 전에 구조 편집을 이해하거나 수행할 필요가 없다.

### TA-R2-05. 모바일·키보드·standalone 동등성

**의존성**: `TA-R2-04 PASS`

**목표**  
짧은 화면, 가로 화면, 키보드에서도 현재 단계의 마지막 내용과 행동에 도달하게 하고 route와 standalone의 동작을 맞춘다.

**모바일 계약**

1. `01 입력 / 02 항목 구조 / 03 결과` 중 한 pane만 연다.
2. 각 pane은 자체 스크롤을 가지며 페이지 scroll을 가두지 않는다.
3. 이전/다음 CTA는 모바일에서만 단계 이동을 보조하고 내용을 가리지 않는다.
4. 결과 rail은 네 위치를 유지하며 좁은 폭에서는 label과 상태가 잘리지 않는다.
5. 구조 수정은 full-height bottom sheet 또는 동등한 surface로 열고 닫을 때 focus를 돌려준다.
6. textarea, dialog, disclosure, result rail을 키보드만으로 사용할 수 있다.
7. 가상 키보드가 열려도 입력 caret와 현재 행동이 가려지지 않는다.

**필수 viewport**

- 1440×900
- 1024×768
- 390×844
- 390×600
- 360×640
- 844×390
- 200% browser zoom

**동등성 검증**

- `/flows/new` route와 생성된 standalone에 같은 대표 예시·문법·결과가 보인다.
- standalone은 외부 local JS/CSS 없이 실제 한 파일로 열린다.
- 새로고침, 직접 진입, Back 후 stage·scroll·draft 복원 정책이 문서와 일치한다.

**PASS 조건**

- 모든 viewport에서 마지막 내용과 하단 행동에 도달한다.
- sticky 요소가 content, dialog footer, result action을 가리지 않는다.
- keyboard trap 0, focus loss 0, 가로 overflow 0.

### TA-R2-06. 내부 회귀 gate와 closeout

**의존성**: `TA-R2-05 PASS`

**목표**  
새 기능을 더하지 않고 문법, projection, 반응형, standalone을 한 번에 회귀 검증한다.

**필수 자동 검증**

1. `npm.cmd run test:text-authoring`
2. `npm.cmd test`
3. focused Text Authoring production E2E
4. `npm.cmd run build`
5. `npm.cmd run build:text-authoring-html`
6. `npm.cmd run capture:text-authoring-grammar-ui`
7. `npm.cmd run build:text-authoring-v2-results`
8. `npm.cmd run docs:check`
9. `git diff --check`
10. v1/v2 contract, matrix, evidence JSON parse

**기존 35개에 추가할 회귀 사례**

- 한 Item·두 속성의 Sheet 비활성
- 두 Item·반복 필드 두 개의 Sheet 활성
- `[x]` 상태의 preview/export 보존
- 시간대·소요 시간·완료 기준·링크의 projection/export parity
- merge duplicate-property 충돌
- split 경계 확인과 undo
- exact source와 정리 TXT/Markdown의 구분
- 50 Items, 긴 한글, emoji, 긴 URL
- 결과 추천이 바뀌어도 rail geometry 불변
- 기준일 삭제 후 상대 날짜 Calendar 비활성

**브라우저 evidence**

- 위 7개 viewport의 before/after 캡처
- scroll 끝 도달 좌표
- console error 0
- page error 0
- failed request 0
- external request 0
- replacement character 0
- route/standalone 주요 상태 비교 JSON

**PASS 조건**

- 기존 147개 Text Authoring 테스트와 694개 전체 테스트에 회귀가 없고 새 테스트도 모두 통과한다.
- 기존 35개 matrix와 추가 사례가 모두 통과한다.
- build, standalone 생성, docs check가 통과한다.
- 자동 QA를 사용자 검증 또는 출시 승인으로 표현하지 않는다.

**closeout 산출물**

- 구현 결과 README
- 변경 파일과 시작 시 dirty 파일의 ownership 표
- 검증 명령·수치·실패 이력
- 남은 위험과 publish 상태
- 현재 route와 self-contained HTML 바로 열기 링크

### TA-R2-SEC-01. dependency High 2 별도 보정

**의존성**: `TA-R2-06 PASS`, 별도 실행 승인

**목표**  
UI·문법 변경과 dependency 변경을 분리해 원인과 회귀 범위를 추적할 수 있게 한다.

**작업 순서**

1. advisory와 실제 dependency path를 다시 확인한다.
2. 영향이 가장 작은 package/lock 변경안을 작성한다.
3. 자동 major upgrade나 unrelated dependency 정리를 하지 않는다.
4. audit, Text Authoring 테스트, 전체 unit, build, export, focused E2E를 다시 실행한다.
5. High가 남으면 publish gate를 green으로 표기하지 않는다.

**PASS 조건**

- High 0 또는 승인된 명시적 예외와 영향 분석이 있다.
- package/lock 외의 UI·문법 변경이 섞이지 않는다.

### TA-R2-INT-GATE. P35 연결 여부 결정

**의존성**: Text Authoring Round 2와 P35 양쪽의 독립 gate PASS, 별도 사용자 승인

이 단계는 자동 merge 단계가 아니다. 다음을 확인한 뒤 `분리 유지 / adapter 연결 / 별도 integration branch` 중 하나를 결정한다.

1. Text Authoring `SourceRow → Item → Step → Flow`와 P35 effective Item 계약의 field·ID 매핑표
2. description, completion criterion, date/time/repeat, resource/source/warning의 loss matrix
3. dated, undated, mixed, routine, memo, invalid-date 공통 golden fixture
4. Text Authoring preview/export와 P35 projection의 Item IDs/count 비교
5. creator source/draft와 personal/execution overlay의 write target 분리
6. 고정 4-slot rail과 P35 `primary 1 + secondary 최대 2 + conditional + unavailable` 결합 규칙
7. 각 checkout의 dirty ownership과 integration base commit

**가져올 수 있는 것**

- stable identity와 count parity 원칙
- source/base와 draft/overlay 분리
- capability, loss, held/unavailable 계약
- 완료 기준·warning·resource·source의 독립 필드
- 모바일·접근성·legacy QA matrix

**가져오지 않는 것**

- P35의 `/f`, `/my`, `/flow-maps` route와 storage lifecycle
- public quick, saved transfer, receipt 구현
- P35 editor component의 직접 복사
- 전역 `Flow → 계획` 치환
- 아직 미착수인 P0-07 또는 P1-03을 완료 자산처럼 사용하는 것
- cross-worktree 자동 stage, commit, merge

## 8. Ticket 순서 요약

| 순서 | Ticket | 핵심 결과 | 다음 단계로 가는 증거 |
|---:|---|---|---|
| 1 | TA-R2-G0 | 권위·갭·dirty ownership 장부 | 10개 요구와 owner가 1:1 연결 |
| 2 | TA-R2-G1 | 문법·source/draft 동결 | round-trip·legacy gate PASS |
| 3 | TA-R2-01 | parser/export 손실 보정 | silent loss 0, stable ID 유지 |
| 4 | TA-R2-02 | 날짜·정렬 transaction | source 자동 변조 0, undo PASS |
| 5 | TA-R2-03 | 결과 rail·형태별 실제 preview | preview/export IDs·count parity |
| 6 | TA-R2-04 | Claude 구조 적용·UX 감산 | 기본 화면의 불필요 정보 제거 |
| 7 | TA-R2-05 | 모바일·키보드·standalone | 7 viewport와 접근성 PASS |
| 8 | TA-R2-06 | 전체 내부 회귀·closeout | tests/build/matrix/browser green |
| 9 | TA-R2-SEC-01 | dependency 보정 | audit green 또는 승인된 예외 |
| 10 | TA-R2-INT-GATE | P35 연결 결정 | 별도 승인과 cross-contract evidence |

## 9. Hard-fail 조건

다음 중 하나라도 발생하면 해당 ticket은 `FAIL`이며 다음 단계로 가지 않는다.

1. `  - 설명:` 같은 속성 bullet이 Item count를 늘린다.
2. 표식 없는 문장을 자동으로 할 일로 만든다.
3. writer→reparse에서 제목·속성·날짜·링크·완료 상태가 사라진다.
4. 기준일 없는 상대 날짜에 날짜를 추정한다.
5. Calendar view 정렬만으로 authoring draft 또는 raw snapshot을 바꾼다.
6. `입력도 이 순서로 맞추기`가 Step 경계를 넘거나 undo할 수 없다.
7. 입력에 따라 결과 버튼 위치·폭·순서가 움직인다.
8. 제목만 있는 일반 목록이 Sheet를 활성화한다.
9. preview와 export의 Item IDs/count가 다르다.
10. 원문 복사 결과가 정리 과정에서 바뀐다.
11. 링크·완료 기준·시간대·소요 시간·완료 상태를 이유 없이 누락한다.
12. merge/split이 충돌 데이터를 조용히 버린다.
13. 390×600 또는 844×390에서 마지막 내용·CTA에 도달하지 못한다.
14. keyboard trap, focus 미복귀, 가로 overflow가 있다.
15. console/page/failed/external request 또는 replacement character가 남는다.
16. Claude의 색·폰트·prototype parser·DS bundle을 제품 정본으로 이식한다.
17. P35 checkout을 자동 수정·stage·merge한다.
18. 내부 QA를 observed-user validation으로 표기한다.

## 10. 후보 수정 범위

실제 구현 단계에서는 시작 시 diff ownership을 다시 확인한 뒤 필요한 파일만 소유한다.

| 영역 | 후보 경로 | 원칙 |
|---|---|---|
| route | `app/flows/new/page.tsx` | Text Authoring 진입·layout에만 한정 |
| style | `app/globals.css`의 Text Authoring 범위 | 기존 FlowMe token 유지, 전역 재설계 금지 |
| UI | `components/flow/text-authoring/*` | 구조 감산, rail, help, mobile surface |
| logic | `lib/flow/text-authoring/*` | 재현된 contract 결함만 수정 |
| E2E | `tests/e2e/text-authoring.spec.ts` | 위험 기반 시나리오 추가 |
| unit/fixtures | Text Authoring library test 경로 | round-trip, loss, stable ID, source ownership |
| build/evidence | `scripts/*text-authoring*`, 새 content-audit 결과 폴더 | route/standalone 동일 입력으로 생성 |
| canonical contract | 기존 v2 계약 | 동결 우선, 변경 시 별도 decision 필요 |

`old/`, `claude_ver/`, legacy dump, P35 checkout, 다른 제품 lane은 수정하지 않는다.

## 11. 되돌리기 단위

Round 2는 다음 단위로 분리해 한 영역의 실패가 전체 문법을 되돌리게 하지 않는다.

1. parser/writer와 fixture
2. 날짜·정렬 transaction
3. 결과 capability/projection
4. desktop 정보 구조와 시각 감산
5. mobile stage·scroll·bottom sheet
6. standalone 생성과 evidence
7. dependency remediation

schema migration이나 source 원문 일괄 재작성은 하지 않는다. visual 변경 실패 시 v2 계약과 parser를 유지한 채 component/style만 되돌릴 수 있어야 한다.

## 12. Codex 실행 프롬프트

```text
D:\flowme2605\flow-text-authoring-ta에서 FlowMe Text Authoring v2 Round 2를 진행한다.
먼저 00-next-work-plan-ko.md와 현재 v2 contract/results를 읽고 session-start를 실행한다.
TA-R2-G0부터 한 ticket만 수행하고 다음 ticket을 자동 시작하지 않는다.

문법·데이터 정본은 Codex v2 contract/tests다. Claude ZIP은 구조 참고만 하며 parser,
index ID, Broadsheet 색·폰트, _ds bundle을 가져오지 않는다. P35 checkout은 읽기 전용이다.
시작 시 dirty ownership을 기록하고, 기존 변경을 reset/clean/stage하지 않는다.

각 ticket은 재현 fixture → 최소 구현 → unit/round-trip → browser/E2E → evidence 순서로 진행한다.
사용자 검증은 수행하거나 주장하지 않는다. commit/push/PR/merge/deploy는 별도 승인 전 금지한다.
```

## 13. Claude Design 실행 프롬프트

```text
이 작업은 FlowMe Text Authoring의 시각·정보 구조 보정이다. 제품 문법과 parser를 새로 만들지 않는다.
첨부한 Codex standalone HTML, 데스크톱·모바일 PNG, v2 contract, simulation matrix를 기준으로 한다.

유지:
- 현재 FlowMe의 흰 배경, 검정 본문, 초록 accent, 기존 본문 글꼴
- canonical 문법과 네 결과 슬롯 위치
- 입력 즉시 반영, 원문 보존, 명시적 정렬+undo

개선:
- desktop 입력/항목 구조/결과 3영역에서 구조는 요약 중심, 결과는 실제 preview 중심
- mobile 01 입력/02 항목 구조/03 결과와 독립 스크롤
- 기본 화면의 긴 설명, 반복 heading/card/badge, 기술 형식명을 감산
- 일반 설명은 접근 가능한 작은 ? disclosure로 이동
- 고급 구조 편집은 dialog/bottom sheet에만 배치
- 결과는 형식명이 아니라 실제 제목·날짜·설명·링크·완료 기준으로 보여주기

금지:
- Broadsheet 청록, Source Serif, 외부 design-system bundle
- 새로운 parser/문법/ID 모델
- 가짜 날짜, 숨은 기준일, 자동 원문 재정렬
- QA 27개를 제품 기본 화면에 노출

반환물은 외부 로컬 JS/CSS 없이 열리는 self-contained HTML과
1440x900, 1024x768, 390x844, 390x600, 360x640, 844x390 화면이다.
구조 제안과 제품 로직 변경 제안을 분리해 표시한다.
```

## 14. 종료점과 다음 승인 경계

Round 2 로컬 구현과 내부 QA는 완료했다. 현재 직접 확인할 수 있는 산출물은 [standalone HTML](../../content-audit/2026-08-04-flowme-text-authoring-grammar-ux-improvement-results/flowme-text-authoring-v2-test.html)이다.

다음 업무는 이 계획의 자동 연장이 아니다. 아래 항목은 각각 별도 사용자 승인을 받아 새 gate로 시작한다.

1. Text Authoring 변경의 commit·push·PR·merge·Preview·Production 게시
2. adapter contract v2와 `dated / undated / mixed / routine / memo / invalid-date` 공통 golden fixture 구현
3. 깨끗한 integration base에서 P35 effective contract와 ID·count·loss parity 확인
4. 관찰 사용자 검증 또는 실제 외부 Calendar/VTODO 왕복 검증

현재 P35 production은 그대로이며, 내부 시뮬레이션·브라우저 캡처를 관찰 사용자 검증으로 간주하지 않는다.
