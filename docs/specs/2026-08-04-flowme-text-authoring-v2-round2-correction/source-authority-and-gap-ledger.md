# FlowMe Text Authoring v2 Round 2 권위·소유권·갭 장부

> `TA-R2-G0`의 정본 장부다. 사용자 요구, 현재 route/standalone 구현, Claude Design v2, P35 참고 원칙의 권위를 분리하고 이후 ticket이 무엇을 유지하고 무엇을 고쳐야 하는지 고정한다.

## 0. 상태

| 항목 | 값 |
|---|---|
| 기록 시각 | 2026-08-04 17:06 KST |
| 작업 checkout | `D:\flowme2605\flow-text-authoring-ta` |
| G0 상태 | `PASS / CROSS-SURFACE_VISUAL_MATRIX_20_OF_20` |
| G1 상태 | `PASS / SOURCE_SNAPSHOT_AND_CONTRACT_EVIDENCE_COMPLETE` |
| 구현·배포 경계 | 로컬 dirty worktree. commit, push, PR, merge, Preview, Production 모두 미수행 |
| 검증 경계 | 자동 테스트·브라우저 캡처는 내부 QA다. 관찰 사용자 검증은 수행하지 않는다. |

아래 5개 제품 예시 × 4개 viewport의 route/standalone 행동 증거와 Claude 구조 비교를 실제 Chromium으로 기록해 `TA-R2-G0`를 닫았다. 이 기록은 내부 QA이며 관찰 사용자 검증이 아니다.

## 1. 권위 규칙

| 영역 | 정본 | 사용 규칙 |
|---|---|---|
| 사용자가 이해해야 하는 의미와 행동 | 최신 사용자 피드백 1~10 | 화면에서 이해되지 않으면 자동 테스트가 통과해도 보정 대상으로 남긴다. |
| canonical 문법·parser·writer·projection | Text Authoring v2 계약과 현재 제품 API 테스트 | Claude prototype parser나 index 기반 ID 모델로 교체하지 않는다. |
| 현재 구현 사실 | `flow-text-authoring-ta`의 실제 코드·테스트·route·생성 standalone | 결과 보고서의 과거 수치만으로 새 Round 2 변경을 통과 처리하지 않는다. |
| 정보 구조 참고 | Claude Design v2 | 3영역, 모바일 단계, 고정 rail, help 감산 등 구조만 참고한다. 색·폰트·parser·외부 `_ds` bundle은 제품 정본이 아니다. |
| 소유권·capability·loss 원칙 | P35 Round 2 문서 | stable identity, count parity, held/unavailable, source/overlay 분리 원칙만 참고한다. P35 route·storage·component는 복사하거나 자동 통합하지 않는다. |
| 검증 판정 | 해당 checkout에서 현재 실행한 테스트와 실제 화면 증거 | Text Authoring, P35, Claude의 수치와 화면을 서로 대신 사용하지 않는다. |

충돌 시 순서는 `사용자 의도 → Text Authoring v2 데이터 계약 → 실제 제품 코드·테스트 → Claude 구조 참고 → P35 일반 원칙`이다. 단, 사용자 피드백이 이미 구현된 동작과 충돌하는 듯 보이면 먼저 같은 입력으로 재현한 뒤 계약 변경 여부를 결정한다.

## 2. 세 checkout 기준선과 dirty 소유권

### 2.1 Git 기준선

| checkout | branch | HEAD | upstream | ahead/behind | 기록 당시 dirty |
|---|---|---|---|---:|---:|
| `D:\flowme2605\flow-text-authoring-ta` | `codex/text-authoring-ta-implementation-20260729` | `c09f859b30b854f6f897b8ec1eb781fd774fbeca` | `origin/main` | `0 / 0` | 최초 감사 `M 19 / ?? 14`; 병렬 작업 중 Round 2 결과 폴더가 생겨 `?? 15`로 변경 |
| `D:\flowme2605\flow-mvp` | `main` | `c09f859b30b854f6f897b8ec1eb781fd774fbeca` | `origin/main` | `0 / 0` | `M 33 / ?? 29` |
| `D:\flowme2605\flow-p35-production-mobile-p0` | `codex/p35-production-mobile-p0` | `d5f693776f7cebbce72a247ddb33ca6c5d550900` | `origin/codex/p35-production-mobile-p0` | `0 / 0` | `M 34 / ?? 42` |

모든 기존 dirty path는 이 Round 2가 만들었다고 추정하지 않는다. reset, checkout, clean, stage, 자동 merge를 금지한다.

### 2.2 이번 문서·계약 lane의 명시적 소유 범위

| 경로 | 시작 상태 | 이번 lane의 소유 | 비고 |
|---|---|---|---|
| `docs/specs/2026-08-04-flowme-text-authoring-v2-round2-correction/source-authority-and-gap-ledger.md` | 없음 | 신규 문서 전체 | 이 파일 |
| `docs/specs/2026-07-28-flowme-text-authoring-ux-v1/text-authoring-contract-v2.json` | untracked v2 구현 산출물 | plain bullet read compatibility, 제목 precedence, semantic round-trip 항목만 | 다른 계약 필드는 보존 |
| `lib/flow/text-authoring/v2-acceptance.test.ts` | untracked v2 구현 테스트 | 위 세 계약 항목을 확인하는 focused test만 | parser·writer 제품 구현은 수정하지 않음 |

### 2.3 보존해야 하는 기존·병렬 변경

| 영역 | 관련 path | 이 장부의 처리 |
|---|---|---|
| route/style | `app/flows/new/page.tsx`, `app/globals.css` | 기존 v2 구현. 문서 lane이 수정하지 않음 |
| UI | `components/flow/text-authoring/*` | 기존 v2 구현 또는 UX lane 소유 |
| logic | `lib/flow/text-authoring/*` | 기존 v2 구현 또는 logic lane 소유. 이 lane은 계약 테스트 한 파일의 지정 부분만 수정 |
| E2E | `tests/e2e/text-authoring.spec.ts`, `tests/e2e/flow-mvp.spec.ts` | 기존 v2 구현. 문서 lane이 수정하지 않음 |
| 기존 결과 | `docs/content-audit/2026-08-04-flowme-text-authoring-grammar-ux-improvement-results/*` | 읽기 전용 기준선 |
| 병렬 Round 2 결과 | `docs/content-audit/2026-08-04-flowme-text-authoring-v2-round2-results/*` | 감사 도중 새로 생긴 병렬 변경. 작성자를 추정하거나 덮어쓰지 않음 |
| 다른 checkout | `flow-mvp`, `flow-p35-production-mobile-p0` 전체 dirty path | 읽기 전용 참고 |

## 3. Claude Design v2 원본 장부

| 항목 | 값 |
|---|---|
| ZIP | `D:\flowme2605\flow-mvp\claude_work\FlowMe 텍스트 저작 v2_260804_1617.zip` |
| 크기 | `1,102,022 bytes` |
| 수정 시각 | 2026-08-04 16:18:02 KST |
| SHA-256 | `10C2090C6A3B3239176E090F8D17A085F8909DF7839FCF92DFD4514186E4BDCF` |
| entry 수 | `26` |
| 원본 처리 | 수정·재압축·덮어쓰기 금지 |

### 3.1 ZIP entry manifest

```text
.thumbnail                                                               12588
FlowMe 텍스트 저작 v2.dc.html                                             99816
_ds/broadsheet-9b5a9fa7-7891-4b48-afd2-49db6ffb98a3/_adherence.oxlintrc.json 4361
_ds/broadsheet-9b5a9fa7-7891-4b48-afd2-49db6ffb98a3/_ds_bundle.js       13805
_ds/broadsheet-9b5a9fa7-7891-4b48-afd2-49db6ffb98a3/_ds_manifest.json    7572
_ds/broadsheet-9b5a9fa7-7891-4b48-afd2-49db6ffb98a3/readme.md            8691
_ds/broadsheet-9b5a9fa7-7891-4b48-afd2-49db6ffb98a3/styles.css          19645
support.js                                                               69150
uploads/flowme-claude-design-handoff-2026-08-04/README.md                 4245
uploads/flowme-claude-design-handoff-2026-08-04/claude-design-review-prompt-ko.txt 7561
uploads/flowme-claude-design-handoff-2026-08-04/claude-handoff-guide-ko.md 5154
uploads/flowme-claude-design-handoff-2026-08-04/current-hyphen-properties-misparsed-1440x900.png 48420
uploads/flowme-claude-design-handoff-2026-08-04/current-mobile-result-390x600.png 21335
uploads/flowme-claude-design-handoff-2026-08-04/current-mobile-structure-toolbar-390x600.png 19792
uploads/flowme-claude-design-handoff-2026-08-04/current-relative-date-no-anchor-1440x900.png 49415
uploads/flowme-claude-design-handoff-2026-08-04/current-sheet-identity-1440x900.png 96011
uploads/flowme-claude-design-handoff-2026-08-04/flowme-text-authoring-grammar-ux-improvement-ko.html 49566
uploads/flowme-claude-design-handoff-2026-08-04/flowme-text-authoring-ta-test.html 2075488
uploads/flowme-claude-design-handoff-2026-08-04/grammar-ux-contract-v2-candidate.json 7867
uploads/flowme-claude-design-handoff-2026-08-04/report-qa-evidence.json     1500
uploads/flowme-claude-design-handoff-2026-08-04/review-brief-ko.md        12463
uploads/flowme-claude-design-handoff-2026-08-04/simulation-matrix-v2.json 15305
uploads/flowme-claude-design-handoff-2026-08-04/ui-route-default-1440.png 77470
uploads/flowme-claude-design-handoff-2026-08-04/ui-route-example-catalog-390x600.png 31900
uploads/flowme-claude-design-handoff-2026-08-04/ui-route-live-reflection-1440.png 81542
uploads/flowme-claude-design-handoff-2026-08-04/ui-route-mobile-result-bottom-390x600.png 20763
```

### 3.2 Claude 결과의 사용 범위

Claude main prototype은 `기본 문법 / 날짜 역순 / D-Day·기준일 없음 / 링크·상세 / 원본 표 / 빈 문서` 시나리오를 가진다. 제품의 대표 5개 예시와 내용이 같지 않으므로 Claude에서 제품 semantic parity나 Item count parity를 주장하지 않는다.

채택 후보는 다음 구조뿐이다.

- 데스크톱 `입력 → 항목 구조 → 결과` 위계
- 모바일 `01 입력 / 02 항목 구조 / 03 결과` 단계 전환
- 입력에 따라 움직이지 않는 네 결과 위치
- 긴 설명의 작은 disclosure 이동
- 고급 구조 수정의 dialog/bottom sheet 분리

제외 대상은 Broadsheet 청록 theme, Source Serif, prototype parser/index identity, `support.js`, `_ds` bundle, Claude만의 export 동작이다.

## 4. 사용자 피드백 1~10 → gate·owner 연결

| # | 사용자 요구 | 현재 v2 기준선 | Round 2 판정 | owner ticket | 필수 증거 |
|---:|---|---|---|---|---|
| 1 | `-`로 구조 표식, 표식 없는 문장은 text | canonical `- [ ]`, 속성 `  - 키: 값`; prose는 source issue | 계약 유지 + plain bullet 호환 명문화 | `G1`, `R2-01` | Item count, writer normalization, prose 0 Item |
| 2 | Calendar 날짜순과 원문 순서를 명시적으로 맞추기 | Calendar만 날짜순, same-Step `입력도 이 순서로 맞추기` + undo | 원본 snapshot 소유권과 적용 예고 보강 필요 | `G1`, `R2-02` | draft만 변경, raw snapshot 불변, ID/count 불변 |
| 3 | Sheet 정체성 명확화 | 원본 표 또는 반복 의미 필드 조건 | 경계 사례와 실제 열·URL·완료 상태 추가 검증 | `R2-01`, `R2-03` | title-only 비활성, meaningful-column 활성, export parity |
| 4 | 상대 날짜 기준일이 원문에 보여야 함 | raw `- 기준일:`만 계산 기준 | 계약 유지, 오류·삭제 transaction 추가 검증 | `R2-02` | 기준일 없음 추정 0, UI 변경이 draft 줄에 반영 |
| 5 | 결과 형태 버튼 고정 | 네 슬롯 위치 고정 | 추천·조건부·불가 표현만 보정 | `R2-03`, `R2-04` | 입력 변화 전후 slot geometry 동일 |
| 6 | `정리 메모`의 정체성 제거 | `텍스트` 안에 원문/TXT/Markdown 분리 | 원문 우선 위계와 변환물 label 보정 | `R2-03`, `R2-04` | exact source byte parity, 변환물 별도 표시 |
| 7 | 링크·상세가 미리보기에 보여야 함 | 결과별 상세·링크 projection 존재 | preview/export loss matrix 강화 | `R2-01`, `R2-03` | 설명·완료 기준·시간·장소·링크 parity |
| 8 | Tab·표·CSV·Markdown 기술 용어 감산 | 기술 형식은 import/export 내부 | 기본 화면 잔여 기술 제어 감산 | `R2-04` | 첫 화면 기술 용어·반복 설명 inventory |
| 9 | 수동 1·2·3 입력 불필요 | source order로 번호 계산; numbered read compatibility | `[x]` 완료 상태와 정렬 후 번호 보존은 미검증 | `R2-01`, `R2-03` | checked state, 번호 자동 계산, export parity |
| 10 | `나눈 항목` 의미 불명확 | `항목 구조` 요약 + 구조 수정 dialog | merge 충돌·split 경계와 기본 화면 감산 필요 | `R2-01`, `R2-04` | 적용 전 결과, 충돌 보존, undo |

## 5. G0 요구별 상태

| G0 요구 | 상태 | 근거 또는 미충족 이유 |
|---|---|---|
| 세 checkout branch/HEAD/upstream/dirty 기록 | `PASS_EVIDENCE` | 이 문서 2장 |
| Claude ZIP checksum·entry 기록 | `PASS_EVIDENCE` | 이 문서 3장 |
| 사용자 10개 요구에 owner와 다음 ticket 연결 | `PASS_PLANNING` | 이 문서 4장 |
| route와 standalone의 제품 예시 5개 행동 비교 | `PASS_EVIDENCE` | V01~V20, 5개 예시 × 4 viewport × route/standalone의 실제 Chromium 행동 증거 20/20 PASS |
| Claude 구조 비교 | `PASS_STRUCTURE_REFERENCE` | 원본 ZIP을 임시 폴더에만 추출해 동일 4 viewport를 캡처. 제품 semantic parity는 주장하지 않음 |
| before/reference 화면 묶음 | `PASS_EVIDENCE` | 제품 40 PNG와 Claude 구조 reference 4 PNG, 총 44 PNG 생성 |
| P35 무수정 | `PASS_THIS_LANE` | 이 lane은 P35를 읽기 전용으로만 사용 |

`TA-R2-G0` 최종 판정은 `PASS`다. 이 판정은 실제 Chromium 기반 내부 시각·행동 QA이며 관찰 사용자 검증은 아니다.

## 6. G1 계약 결정

### 6.1 canonical write와 read compatibility

정본 writer는 계속 다음 한 형식만 출력한다.

```markdown
# Flow 제목
- 기준일: 2026-08-10

## 단계
- [ ] 항목
  - 설명: 설명입니다.
  - 날짜: 2026-08-03
  - 자료: [안내](https://example.com)
```

호환 입력 결정:

- root `- 일반 항목`과 `1. 항목` / `2) 항목`은 현재 parser 동작대로 Item으로 읽는다.
- 이 형식은 새 작성 문법으로 가르치지 않는 `read compatibility`다.
- writer는 저장·내보내기 때 root `- [ ] 항목`으로 정규화한다.
- v1의 `  설명: 값`은 읽되 writer는 `  - 설명: 값`으로 쓴다.
- 표식 없는 prose는 Item으로 만들지 않는다.

### 6.2 제목 precedence

- 원문에 H1 `# 제목`이 있으면 그 H1이 source of truth다.
- 별도 제목 필드는 H1을 따라가며, 제목 필드를 수정하면 같은 H1 줄을 갱신한다.
- H1이 없는 입력에서만 document 제목 필드가 fallback이다.
- H1과 제목 필드가 서로 다른 값인 채 저장되는 상태를 허용하지 않는다.

### 6.3 semantic round-trip 정의

`writer → parser → writer` golden의 합격 기준은 변환된 Markdown byte equality가 아니라 다음 의미 필드의 동등성이다.

- Flow 제목과 source anchor
- Step 제목·순서
- Item 제목·순서
- 설명, 완료 기준
- 날짜·상대 날짜·시간·시간대·소요 시간·반복
- 장소·조건
- 자료·출처·안내·주의

Markdown 주석 metadata와 stable identity는 receipt/metadata-aware 검사로 별도 확인한다. 실제 입력 parser가 재생성하는 내부 metadata ID 때문에 transformed Markdown 전체가 byte-equal일 필요는 없다.

단, `원문 그대로` 복사는 별도 계약이다. 현재 초안 복사는 authoring draft의 `rawText`와 byte-equivalent여야 하고, `처음 붙여넣은 원문` 복원은 별도 `rawSourceSnapshot.rawText`와 byte-equivalent여야 한다. snapshot은 구조 수정·날짜순 정렬·현재 초안 저장에 의해 바뀌지 않는다.

## 7. 초기 논리·projection 갭의 종료 결과

| 초기 gap | 종료 상태 | 구현·증거 |
|---|---|---|
| 최초 `rawSourceSnapshot`과 현재 `authoringDraft` 분리 | `CLOSED` | 최초 원문 bytes를 별도 snapshot으로 저장·migration·복원하고 현재 초안과 독립적으로 검증 |
| `[x]` source 체크 상태 | `CLOSED` | `sourceChecked`를 parser·writer·preview·export에서 보존하되 실행 완료 상태와 분리 |
| merge 속성 충돌 | `CLOSED` | completion·schedule·checkbox·property 충돌을 preflight에서 차단하고 확인 전 mutation 0 |
| split 경계 | `CLOSED` | 단어 경계 후보와 적용 전 확인을 제공하고 source block·lineage·undo를 함께 갱신 |
| Sheet 정체성 | `CLOSED` | 원본 표 또는 2개 이상의 공통 의미 열이 있는 경우만 활성화하고 실제 열·셀·URL을 preview/export에 공통 사용 |
| preview/export parity | `CLOSED_LOCAL` | source `[x]`, detail, resource/source 링크, raw source, Sheet 열·셀, ID/count/loss를 unit·matrix·브라우저에서 확인 |
| plain bullet 호환 문서 drift | `CLOSED` | read compatibility와 canonical writer 정규화를 v2 contract와 acceptance test에 추가 |
| 제목 precedence 문서 drift | `CLOSED` | H1 source-of-truth 규칙을 v2 contract와 acceptance test에 추가 |

P35 effective snapshot까지의 cross-contract parity는 이 표의 범위가 아니다. [P35 연결 게이트](./p35-integration-gate.md)에서 adapter contract v2와 공통 golden fixture 전까지 `HOLD_NOT_READY`로 남긴다.

## 8. route·standalone 행동 증거와 Claude 구조 비교 matrix

### 8.1 행동 proof 공통 필드

각 route/standalone case는 다음을 JSON으로 기록해야 한다.

1. 입력 원문 fingerprint와 적용 예시 ID
2. Flow 제목, Step 수, Item IDs/count, 대표 Item 제목
3. 네 result slot의 순서·위치·활성 상태·선택 상태
4. 선택 결과의 row IDs/count, 상세·링크·loss reason
5. 마지막 내용과 하단 행동 도달, 가로 overflow, sticky overlap
6. route와 standalone semantic parity

Claude는 같은 데이터 결과의 정본이 아니므로 위 1~4의 parity 대상이 아니다. 같은 viewport에서 3영역 비율, 모바일 단계, rail 위치, help·dialog 위계만 대표 구조 참고로 캡처한다.

### 8.2 필수 5 × 4 matrix

| ID | 제품 예시 | viewport | route + standalone 행동 proof | Claude 대표 구조 reference | 상태 |
|---|---|---|---|---|---|
| V01 | 작성 형식 한눈에 | 1440×900 | 제목·전체 공식 속성·고정 rail·상세 링크 parity | `기본 문법`의 3영역·rail | `PASS_EVIDENCE` |
| V02 | 작성 형식 한눈에 | 1024×768 | 2-pane/stage 전환과 동일 semantic 결과 | `기본 문법`의 중간 폭 위계 | `PASS_EVIDENCE` |
| V03 | 작성 형식 한눈에 | 390×844 | 입력/구조/결과 stage, 끝 도달, rail label | `기본 문법` 모바일 단계 | `PASS_EVIDENCE` |
| V04 | 작성 형식 한눈에 | 390×600 | 짧은 화면 scroll·footer·도움말 | `기본 문법` 짧은 화면 구조 | `PASS_EVIDENCE` |
| V05 | 제주 여행 메모 | 1440×900 | 5 Items, Todo 기본, source order | `기본 문법`의 입력→결과 위계만 | `PASS_EVIDENCE` |
| V06 | 제주 여행 메모 | 1024×768 | 5 Items와 네 slot parity | `기본 문법` 중간 폭 구조 | `PASS_EVIDENCE` |
| V07 | 제주 여행 메모 | 390×844 | 5 Item 구조 요약과 결과 끝 도달 | `기본 문법` 모바일 구조 | `PASS_EVIDENCE` |
| V08 | 제주 여행 메모 | 390×600 | 긴 Todo 결과·저장 행동 도달 | `기본 문법` 짧은 화면 구조 | `PASS_EVIDENCE` |
| V09 | 이사 D-30 체크리스트 | 1440×900 | 27 Items, Calendar 날짜순, source 정렬 CTA | `날짜 역순`의 정렬 설명·고정 rail | `PASS_EVIDENCE` |
| V10 | 이사 D-30 체크리스트 | 1024×768 | 27 Item count·Calendar/Todo parity | `날짜 역순` 중간 폭 구조 | `PASS_EVIDENCE` |
| V11 | 이사 D-30 체크리스트 | 390×844 | 긴 구조·결과 scroll과 정렬 CTA | `날짜 역순` 모바일 구조 | `PASS_EVIDENCE` |
| V12 | 이사 D-30 체크리스트 | 390×600 | 27 Item 긴 결과의 마지막 행동 도달 | `날짜 역순` 짧은 화면 구조 | `PASS_EVIDENCE` |
| V13 | K-MOOC 14주 학습표 | 1440×900 | 14 rows, 실제 열·셀·URL Sheet preview | `원본 표`의 결과 폭·table 구조 | `PASS_EVIDENCE` |
| V14 | K-MOOC 14주 학습표 | 1024×768 | Sheet column/row parity와 overflow | `원본 표` 중간 폭 table | `PASS_EVIDENCE` |
| V15 | K-MOOC 14주 학습표 | 390×844 | table 가로 처리와 마지막 row 접근 | `원본 표` 모바일 결과 구조 | `PASS_EVIDENCE` |
| V16 | K-MOOC 14주 학습표 | 390×600 | table·rail·footer 겹침 0 | `원본 표` 짧은 화면 구조 | `PASS_EVIDENCE` |
| V17 | Allblanc 7일 복근 챌린지 | 1440×900 | 7 Items, 날짜·영상 URL·상세 projection | `링크·상세`의 detail hierarchy | `PASS_EVIDENCE` |
| V18 | Allblanc 7일 복근 챌린지 | 1024×768 | 7 Item Calendar·link parity | `링크·상세` 중간 폭 구조 | `PASS_EVIDENCE` |
| V19 | Allblanc 7일 복근 챌린지 | 390×844 | 링크 focus·stage scroll·결과 끝 도달 | `링크·상세` 모바일 구조 | `PASS_EVIDENCE` |
| V20 | Allblanc 7일 복근 챌린지 | 390×600 | 긴 URL/상세 잘림·overflow·footer 겹침 0 | `링크·상세` 짧은 화면 구조 | `PASS_EVIDENCE` |

### 8.3 기존 evidence와 새 matrix의 관계

기존 `ui-simulation-evidence.json`은 route/standalone U01~U08, 6 viewport, product 5/QA 27 경계, live reflection, scroll, keyboard, runtime 기본선을 제공한다. 이는 Round 2의 출발점이지만 V01~V20을 대신하지 않는다. 새 캡처는 기존 증거를 삭제하거나 덮어쓰지 않고 별도 Round 2 evidence로 남긴다.

## 9. 테스트 기준선과 이번 계약 보정

| 검증 | 결과 | 의미 |
|---|---:|---|
| 기존 `npm.cmd run test:text-authoring` | `147 / 147 PASS` | Round 2 시작 전 parser·writer·projection 기준선 |
| focused `npx.cmd tsx --test lib/flow/text-authoring/v2-acceptance.test.ts` | `33 / 33 PASS` | 새 계약 테스트 2개 + 기존 acceptance 31개 통과 |
| 변경 후 `npm.cmd run test:text-authoring` | `149 / 149 PASS` | 기존 147개 회귀 없음 + 새 계약 테스트 2개 포함 |
| Round 2 최종 `npm.cmd run test:text-authoring` | `161 / 161 PASS` | snapshot, source check, merge/split, Sheet, 링크·원문 경계까지 포함 |
| Round 2 최종 `npm.cmd test` | `694 / 694 PASS` | repository unit 회귀 통과 |
| Round 2 focused E2E | `31 / 31 PASS` | desktop/mobile, ownership disclosure, result rail, source update·export 경계 |
| `npm.cmd run docs:check` | `PASS` | 필수 문서 14개, 로컬 링크 3,689개 확인 |
| v2 contract JSON parse | `PASS` | 계약 JSON 문법 유효 |
| 관찰 사용자 검증 | 수행하지 않음 | 이 수치로 사용성·출시를 주장하지 않음 |

새 계약 테스트는 다음을 직접 확인한다.

- plain bullet과 numbered list를 읽고 writer가 `- [ ]`로 정규화한다.
- H1이 별도 제목 값보다 우선한다.
- golden round-trip은 제목·단계·Item·설명·날짜·링크 의미 동등성으로 판정한다.

## 10. 종료 handoff

1. `rawSourceSnapshot` / `authoringDraft` 타입·저장·migration·undo 계약을 닫았다.
2. V01~V20 route/standalone 행동 JSON과 Claude 구조 reference 캡처를 생성했다.
3. `[x]`, merge conflict, split boundary, Sheet/export parity fixture를 추가했다.
4. dependency High 2는 최소 patch override로 0까지 낮추고 전체 unit·build를 다시 통과했다.
5. P35 연결은 `SEPARATE_WITH_ADAPTER_CONTRACT / HOLD_NOT_READY`로 판정했다.
6. commit/push/PR/merge/deploy와 관찰 사용자 검증은 수행하지 않았다.

## 11. G0 실행 증거 결과

2026-08-04에 실제 Chromium(`Google Chrome 150.0.7871.184`)으로 route와 standalone을 각각 실행했다. 전용 로컬 포트는 route `3127`, static/Claude `4191`이며 캡처 후 종료했다.

| 증거 | 결과 |
|---|---|
| V01~V20 | `20 / 20 PASS` |
| 제품 조합 | 대표 예시 5개 × viewport 4개 × route/standalone 2개 |
| 제품 PNG | `40`개 |
| Claude 구조 reference PNG | `4`개 |
| route/standalone semantic parity | `20 / 20 동일` |
| 고정 4-slot geometry | 같은 viewport의 예시 전환 전후 및 route/standalone 모두 동일 |
| 제품 runtime | console error `0`, page error `0`, failed request `0`, HTTP error `0`, replacement character `0`, external request `0` |
| 실제 끝 도달 | 입력의 보이는 출처·저장 설정 summary, 구조의 마지막 Item, 결과의 보이는 추가 확인 summary와 저장 행동을 검사 |
| 관찰 사용자 검증 | 수행하지 않음 |

증거 파일:

- `docs/content-audit/2026-08-04-flowme-text-authoring-v2-round2-results/round2-visual-behavior-matrix.json`
- `docs/content-audit/2026-08-04-flowme-text-authoring-v2-round2-results/claude-structure-reference.json`
- `docs/content-audit/2026-08-04-flowme-text-authoring-v2-round2-results/round2-visual-evidence/`

Claude ZIP은 임시 폴더에만 추출했고 원본을 수정하지 않았다. Claude 화면은 동일한 4개 viewport에서 3영역 비율, 모바일 단계, 결과 rail, help/dialog 경계만 구조 reference로 기록했다. Claude 화면에서 발생한 외부 React/font 요청과 최초 404 console 메시지도 숨기지 않고 JSON에 기록했으며, Claude와 제품 간 semantic parity는 주장하지 않는다.
