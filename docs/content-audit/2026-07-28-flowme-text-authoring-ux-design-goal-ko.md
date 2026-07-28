# FlowMe 텍스트 기반 콘텐츠 저작 UX 기획·Wireflow 설계 목표

- 작성일: 2026-07-28
- 상태: 설계 목표 제안, 구현 미승인
- 작업 성격: UX 기획, 콘텐츠 근거 패키지, wireflow, interactive prototype, 개발 handoff
- 앱 코드 수정: 금지
- 데이터·migration 실행: 금지
- commit / push / PR / merge / deploy: 금지
- observed-user count: 0

## 1. 목표

Wiki, Obsidian, 일반 메모장처럼 텍스트를 빠르게 작성하거나 붙여넣으면 FlowMe가
그 내용을 `Flow -> Step -> Item` 구조와 자연스러운 실행 결과로 해석해 보여 주는
저작 경험을 설계한다.

이번 목표는 긴 설정 폼이나 범용 문서 편집기를 만드는 것이 아니다. 사용자는 익숙한
텍스트를 먼저 쓰고, FlowMe는 그 안에서 다음을 구분해 실제 결과로 보여 줘야 한다.

- Flow 제목과 목적
- 순서나 구간을 나타내는 Step
- 독립적으로 완료·결정·기록할 수 있는 Item
- Item의 상세 설명과 완료 기준
- 선택적인 날짜, 상대 날짜, 시간, 장소, 반복, 조건, 예상 시간
- 실행 Item이 아닌 source, resource, caution, reference
- 원문에서 확보한 값과 사용자가 추가한 값
- Calendar, Checklist/Todo, Sheet, Memo 중 자연스러운 primary artifact

최종 산출물은 다음 질문에 답해야 한다.

> 사용자가 메모나 Markdown을 쓰는 가장 가벼운 행동만으로 쓸 만한 Flow를 만들고,
> 구조가 잘못 해석된 부분만 바로잡은 뒤, 실행 결과를 확인·저장·내보낼 수 있는가?

## 2. 이번 목표의 제품 경계

FlowMe는 Obsidian, Notion, Confluence, Todoist를 대체하는 범용 workspace가 아니다.

이번 설계가 다루는 범위는 다음과 같다.

```text
빈 문서 / 기존 메모 / Markdown 붙여넣기 / 표 붙여넣기
-> 입력 형태와 구조 감지
-> 해석된 Flow 전체 미리보기
-> 불명확한 부분만 확인
-> 필요한 항목만 수정
-> 자연스러운 artifact 확인
-> 개인 초안 저장 또는 제작자 초안으로 넘기기
-> FlowMe 실행 또는 기존 도구로 가져가기
```

다음은 이번 목표에서 설계하지 않는다.

- 범용 Wiki 지식 그래프
- 양방향 링크와 그래프 뷰
- 플러그인 생태계
- 실시간 공동 편집
- 공개 문서를 누구나 직접 덮어쓰는 open wiki
- 페이지 데이터베이스, 수식 엔진, 범용 table builder
- 계정, DB, cloud sync
- 실제 LLM API, crawler, OCR
- Notion, Obsidian, Google Calendar, Todoist OAuth
- Markdown 전체 문법 지원
- 무거운 planner나 creator marketplace

## 3. 반드시 유지할 기존 계약

### 3.1 콘텐츠 계층

```text
SourceRow -> Item -> Step -> Flow -> Bundle / Flow Map
```

- `Item`은 독립적으로 완료, 결정, 기록, 보류할 수 있는 최소 실행 단위다.
- `Step`은 관련 Item을 묶는 순서·구간·의미 단위이며 완료 상태를 소유하지 않는다.
- Calendar/ICS, Checklist/Todo, Sheet, Memo는 canonical Item의 projection이다.
- 설명 문장을 UI를 채우기 위한 가짜 Item으로 만들지 않는다.
- 날짜가 없다는 이유로 Item을 Calendar event로 만들지 않는다.

### 3.2 데이터 소유권

다음 층을 저작 UX에서 섞지 않는다.

1. source snapshot과 source row
2. creator draft
3. published Flow version
4. personal draft와 personal overlay
5. personal structural overlay
6. execution run
7. recurrence series와 occurrence
8. export identity와 receipt
9. canonical Flow에 대한 correction suggestion

제작자 저작, 사용자의 개인화, 실행 기록은 서로 다른 write path를 사용한다.

### 3.3 공개 편집 경계

- 제작자 기준본은 사용자 개인 수정으로 덮어쓰지 않는다.
- 개인 초안은 사용자가 자유롭게 수정할 수 있다.
- 공개 Flow의 수정 의견은 canonical 변경이 아니라 검토 대기 제안으로 남긴다.
- source-backed 콘텐츠는 source URL, sourceTrace, 권리·안전 상태를 보존한다.
- 원문을 확보하지 못한 상태에서 그럴듯한 가짜 Flow를 만들지 않는다.

## 4. 먼저 만들 기반 자료

Wireframe을 그리기 전에 독립적인 `text authoring evidence package`를 만든다.
Claude Design이 로컬 저장소에 접근하지 못해도 같은 콘텐츠와 계약을 이해할 수 있는
standalone 패키지여야 한다.

### 4.1 정본 읽기 순서

1. 현재 콘텐츠·데이터 계약
   - [Canonical Flow Data Model](../specs/2026-07-11-canonical-flow-data-model/spec.md)
   - [Source-to-Flow Conversion Gate](../flow-rules/source-to-flow-conversion-gate.md)
   - [Flow Execution Types](../flow-rules/flow-execution-types.md)
   - [Export Destination Fit](../flow-rules/export-destination-fit.md)
   - [Quality Rubric](../flow-rules/quality-rubric.md)
   - [Quality Gate](../flow-rules/quality-gate.md)
   - [UX Copy](../flow-rules/ux-copy.md)

2. 기존 입력·저작 UX
   - [Input Composer Lab v1](../specs/2026-07-20-flowme-input-composer-lab-v1/spec.md)
   - [Input Composer UX v1.1](../specs/2026-07-21-flowme-input-composer-ux-v1-1/spec.md)
   - [Input Composer Interaction Spec](../specs/2026-07-21-flowme-input-composer-ux-v1-1/interaction-spec.md)
   - [Input Composer State Model](../specs/2026-07-21-flowme-input-composer-ux-v1-1/state-model.md)
   - [URL-to-Flow Output Quality Lab v2](../specs/2026-07-20-url-to-flow-output-quality-lab-v2/spec.md)
   - [Input Composer interactive HTML](./2026-07-21-flowme-input-composer-ux-v1-1-ko.html)

3. 실제 Flow 콘텐츠와 projection 근거
   - [Qualified Corpus v2 snapshot](./2026-07-28-flowme-text-authoring-ux-design-handoff/local-evidence/qualified-corpus-v2/qualified-corpus-fixture-v2.json)
   - [Projection Matrix v2 snapshot](./2026-07-28-flowme-text-authoring-ux-design-handoff/local-evidence/qualified-corpus-v2/projection-matrix-v2.json)
   - [Projection Loss Manifest v2 snapshot](./2026-07-28-flowme-text-authoring-ux-design-handoff/local-evidence/qualified-corpus-v2/projection-loss-manifest-v2.json)
   - [Input Lineage v2 snapshot](./2026-07-28-flowme-text-authoring-ux-design-handoff/local-evidence/qualified-corpus-v2/input-lineage-v2.json)
   - [Round-trip Results v2 snapshot](./2026-07-28-flowme-text-authoring-ux-design-handoff/local-evidence/qualified-corpus-v2/round-trip-results-v2.json)
   - [Todo fixture snapshots](./2026-07-28-flowme-text-authoring-ux-design-handoff/local-evidence/fixtures/todo/)
   - [Sheet fixture snapshots](./2026-07-28-flowme-text-authoring-ux-design-handoff/local-evidence/fixtures/sheet/)

4. 기존 시뮬레이션과 사용자 방향
   - [콘텐츠 편집·실행 시뮬레이션](./2026-07-14-flowme-content-edit-execution-simulation-ko.html)
   - [콘텐츠 사용 미리보기](./2026-07-19-flow-content-usage-preview-ko.html)
   - [Source-backed UX 콘텐츠 시뮬레이션](./2026-06-24-source-backed-flow-map-ux-content-simulation-ko.html)
   - [사용자 피드백 통합본 snapshot](./2026-07-28-flowme-text-authoring-ux-design-handoff/local-evidence/flowme-user-feedback-synthesis-ko.txt)
   - [Product Principles](../PRODUCT_PRINCIPLES.md)
   - [Service Structure](../SERVICE_STRUCTURE.md)
   - [Decisions](../DECISIONS.md)
   - [Ideas](../IDEAS.md)

### 4.2 기반 패키지에 포함할 자료

다음 파일을 새 패키지 안에 만든다.

```text
docs/content-audit/2026-07-28-flowme-text-authoring-ux-design-handoff/
  README.md
  evidence-index.md
  evidence-index.json
  product-boundary.md
  content-corpus-index.md
  content-corpus-snapshots.json
  source-to-text-to-flow-examples.md
  authoring-ownership-matrix.json
  current-capability-matrix.json
  terminology-ko.md
  unified-design-prompt-ko.txt
  response-template-ko.md
  offline-preview/
  assets/
```

`evidence-index`는 각 자료에 다음을 기록한다.

- 파일 경로와 가능한 GitHub 링크
- 기준 commit 또는 `local_uncommitted`
- 자료가 증명하는 것
- 자료가 증명하지 않는 것
- current contract / historical artifact / proposal 구분
- Claude Design이 반드시 읽어야 하는 우선순위

로컬에만 있는 자료는 경로만 던지지 않는다. 필요한 최소 내용을 snapshot으로 복사하거나
요약하고, 원본 경로와 hash를 함께 남긴다.

## 5. 실제 콘텐츠 검증 세트

추상적인 예시를 새로 만들지 말고 기존 데이터와 source-backed 콘텐츠를 사용한다.
다음 8개 사례를 최소 검증 세트로 삼는다.

| 사례 | 검증할 구조 | 자연스러운 결과 | 반드시 보존할 의미 |
|---|---|---|---|
| 이사 D-30 | 기준일 역산, 6개 구간, 다수 Item | Calendar + Checklist | 상대 날짜, Step 구간, source row |
| 차량 점검 | 날짜 없는 준비·확인 Item | Todo/Checklist, 선택적 Calendar | 날짜 없음이 정상 상태임 |
| Allblanc 운동 | resource가 있는 반복·순서 실행 | Routine/Calendar + resource | series와 occurrence, 영상은 Item이 아님 |
| K-MOOC 14주 | 긴 표, 주차 순서, 현재 진도 | Sheet + 선택적 Todo | 14개 행을 축약하지 않음 |
| LibriVox 38장 | 순서형 resource queue, 재생 위치 | Sheet/Queue + Memo | 장 순서와 현재 위치, 가짜 날짜 금지 |
| 신차 구매 8단계 | 결정·확인·기록 혼합 | Checklist + Sheet/Memo | 결정과 기록을 단순 완료로만 만들지 않음 |
| 해외여행 안전정보 | guide, caution, 실행 Item 혼합 | Memo/Guide + 제한된 Checklist | 읽을 정보와 실행할 일을 분리 |
| 개인 여행 메모 | 자유문, 날짜·장소·할 일 혼합 | Todo + Calendar + Memo | 사용자가 쓴 원문과 해석 결과 연결 |

콘텐츠마다 다음 한 묶음을 만든다.

```text
실제 원문 또는 frozen fixture
-> 사용자가 붙여넣을 텍스트
-> 감지한 문서 구조
-> Flow / Step / Item mapping
-> unresolved 또는 confirmation 필요 부분
-> primary artifact
-> secondary artifact
-> projection에서 빠지는 정보
-> 저장 후 개인화 가능한 값
```

현재 runtime의 이사 Flow 항목 수와 Qualified Corpus v2 항목 수처럼 같은 이름의
콘텐츠가 서로 다른 버전·항목 수를 가지면 하나로 섞지 않는다. 각 사례에
`sourceVersion`, `fixtureId`, `itemCount`, `evidencePath`를 표시한다.

## 6. 비교할 저작 UX 대안

다음 세 대안을 실제 8개 사례로 구현해 비교한다.

### A. Markdown-first split editor

- 왼쪽 또는 상단에서 Markdown을 직접 쓴다.
- 오른쪽 또는 하단에서 해석된 Flow와 artifact를 본다.
- heading, checklist, 일반 문장, 표, 링크 문법을 최대한 그대로 활용한다.
- 장점: Obsidian·README·메모 사용자에게 익숙하고 복사·이동이 쉽다.
- 위험: metadata syntax가 늘면 사용자가 FlowMe 문법을 배워야 한다.

### B. Block / outline editor

- Flow, Step, Item, detail을 block으로 직접 조작한다.
- drag, indent, slash command, property popover를 사용한다.
- 장점: 구조 오류를 눈으로 고치기 쉽다.
- 위험: Notion형 범용 편집기로 커지고 모바일 입력이 무거워질 수 있다.

### C. Text composer + structured preview

- 사용자는 한 텍스트 surface에 자연어·Markdown·표를 붙여넣는다.
- FlowMe가 구조를 감지해 outline과 artifact preview를 먼저 만든다.
- 사용자는 불명확한 줄이나 필요한 Item만 contextual editor로 수정한다.
- 고급 속성은 inspector나 inline popover에서 점진적으로 연다.
- 장점: 첫 결과가 빠르고 FlowMe 내부 문법 학습을 줄일 수 있다.
- 위험: 자동 해석과 원문 보존 경계가 불명확하면 사용자가 결과를 신뢰하기 어렵다.

최종 판정은 다음 중 하나를 사용한다.

- `adopt_markdown_first`
- `adopt_block_outline`
- `adopt_hybrid_text_preview`
- `retain_current_composer_with_bounded_changes`
- `reject_text_authoring_for_current_stage`

선호도만으로 판정하지 않는다. 8개 사례의 입력 수, 첫 결과까지의 행동 수, 의미 손실,
모바일 복잡도, 오류 복구, 기존 계약 호환성을 근거로 선택한다.

## 7. 텍스트 문법 실험

FlowMe 전용 문법을 먼저 확정하지 않는다. 다음 입력 형태를 모두 비교한다.

1. 일반 메모
2. Markdown heading과 checklist
3. Obsidian에서 복사한 Markdown
4. 표 또는 TSV 붙여넣기
5. URL과 설명이 섞인 목록
6. 날짜·장소·반복 표현이 포함된 자연문
7. source-backed 원문 요약과 개인 메모가 섞인 문서

다음은 문법 후보일 뿐 확정 문법이 아니다.

```markdown
# 8월 제주 여행 준비

## 예약
- [ ] 항공권 확인
  출발: 2026-08-03 08:20
  장소: 김포공항
  완료 기준: 예약번호를 메모에 남김

- [ ] 숙소 예약번호 정리
  메모: 부모님 객실은 조식 포함 여부 확인

## 출발 전
- [ ] 온라인 체크인
  날짜: D-1
```

반드시 비교할 문법 선택지는 다음과 같다.

- label 기반: `날짜:`, `장소:`, `완료 기준:`
- inline token 기반: `@2026-08-03`, `@김포공항`, `@D-1`
- properties/inspector 기반: 본문은 깨끗하게 두고 속성은 UI에서 설정
- 혼합형: 읽기 쉬운 label은 text에 남기고 복잡한 반복·조건은 inspector에서 설정

평가 기준:

- 별도 학습 없이 읽고 쓸 수 있는가
- Obsidian과 일반 Markdown으로 round-trip 가능한가
- 문법을 지워도 사람이 읽을 수 있는 문서인가
- 모바일에서 특수 기호 입력을 강요하지 않는가
- source 값과 개인 값의 충돌을 설명할 수 있는가
- unsupported syntax를 조용히 버리지 않는가
- 내부 enum과 backend field 이름을 노출하지 않는가

## 8. 사용자 여정

### 8.1 개인 메모 사용자

```text
새 문서
-> 메모 작성 또는 붙여넣기
-> 구조 감지
-> Flow 전체 미리보기
-> 잘못 묶인 줄 수정
-> 필요한 날짜·장소만 확인
-> 개인 Flow 저장
-> My Flow에서 실행 또는 외부 도구로 가져가기
```

### 8.2 Obsidian·Markdown 사용자

```text
기존 Markdown 붙여넣기
-> 지원 문법과 무시될 문법 확인
-> 원문과 해석 결과 비교
-> Flow로 사용할 section 선택
-> artifact 확인
-> Flow 저장
-> Markdown으로 다시 내보내 round-trip 비교
```

### 8.3 표·강의계획 사용자

```text
표 붙여넣기 또는 파일 가져오기
-> header·행 범위 확인
-> 한 행이 Item인지 resource인지 판정
-> 전체 행 수와 순서 확인
-> 현재 진도 선택
-> Sheet 중심 Flow 저장
```

### 8.4 제작자

```text
원문 URL 또는 허가된 원문 입력
-> 확보한 source 범위 확인
-> creator draft 생성
-> Item·Step·detail·완료 기준 보완
-> sourceTrace·권리·안전 확인
-> preview
-> 검토 대기 또는 공개용 저장
```

### 8.5 기존 공개 Flow를 수정하려는 사용자

```text
공개 Flow 열기
-> 개인 사본으로 시작
-> 텍스트 view에서 개인 메모·제외·날짜 수정
-> 개인 사본 실행
-> 원본 오류 발견
-> 개인 수정과 별도로 correction suggestion 작성
```

## 9. 상태 모델

각 상태는 제목, 설명, primary action 하나, secondary action, 되돌아가기, 저장 데이터,
사용자에게 숨길 내부 정보를 정의한다.

- `empty`
- `typing`
- `pasting`
- `detecting`
- `structure_detected`
- `table_detected`
- `source_link_detected`
- `existing_flow_found`
- `proposal_ready`
- `needs_structure_confirmation`
- `needs_value_confirmation`
- `partial_parse`
- `unsupported_syntax`
- `source_import_required`
- `rights_review_required`
- `safety_review_required`
- `conflict_source_vs_user`
- `personalized`
- `saved_personal_draft`
- `saved_creator_draft`
- `export_preflight`
- `exported`
- `source_updated`
- `retryable_error`
- `provider_error`
- `recovered_unsaved_draft`

막다른 상태를 만들지 않는다. 모든 blocked/error 상태는 다음을 보여 줘야 한다.

- 무엇을 읽었는가
- 무엇을 읽지 못했는가
- 현재 결과에서 보존되는 내용
- 사용자가 할 수 있는 다음 행동
- 원문으로 돌아가거나 텍스트로 계속 편집하는 경로

## 10. 화면 책임

각 화면은 사용자 질문 하나와 핵심 메시지 최대 두 개만 가진다.

### 10.1 입력 시작

- 질문: 무엇을 Flow로 만들까?
- 기본 노출: 하나의 text composer, 붙여넣기, 보조 가져오기
- primary action: 입력 후 자동 감지 또는 `결과 확인`
- 숨김: 내부 taxonomy, source parser 상태, 모든 고급 속성

### 10.2 구조 확인

- 질문: FlowMe가 내용을 어떻게 나눴나?
- 기본 노출: 원문 줄과 Flow/Step/Item 연결
- primary action: `전체 결과 보기`
- contextual action: 합치기, 나누기, 들여쓰기, Item/resource 전환

### 10.3 결과 미리보기

- 질문: 실제로 무엇이 만들어질까?
- 기본 노출: 전체 Item, primary artifact, Item 수, 날짜 범위
- primary action: `개인 Flow로 저장` 또는 구체적인 외부 이동 action
- secondary: 필요한 항목만 조정

### 10.4 contextual Item editor

- 질문: 이 한 항목에서 무엇을 고칠까?
- 기본 노출: 제목, 상세, 완료 기준
- 접힘 정보: 날짜·시간·장소·반복·조건·resource·source
- primary action: `변경 적용`

### 10.5 source/ownership review

- 질문: 이 내용은 누구의 어떤 근거에서 왔나?
- 기본 노출: source 범위, 개인 입력, unresolved, 권리·안전 상태
- primary action: 역할에 따라 `개인용으로 계속` 또는 `검토 요청`

### 10.6 receipt

- 질문: 무엇이 저장되거나 이동했나?
- 기본 노출: Flow 제목, Item 수, artifact, 범위, source 보존 여부
- primary action: `내 Flow 열기` 또는 실제 외부 파일 확인

## 11. Wireflow 요구사항

모바일 390x844과 wide 1024x768을 모두 설계한다. 핵심 workbench는 1440x900도
비교한다.

반드시 그릴 화면:

1. 빈 text composer
2. 일반 메모를 입력하는 상태
3. Markdown을 붙여넣은 상태
4. 표를 붙여넣은 상태
5. source URL이 포함된 상태
6. 구조 감지 중
7. 원문 줄과 Item mapping 확인
8. Step/Item 합치기·나누기·재정렬
9. Item/resource/guide 구분 수정
10. contextual Item editor
11. source 값과 개인 값 충돌
12. primary artifact preview
13. secondary artifact 전환
14. 개인 초안 저장
15. 제작자 초안 저장과 review gate
16. Markdown export와 round-trip 확인
17. parsing 실패와 복구
18. 작성 중 이탈 후 draft 복구

각 화면에는 다음을 표시한다.

- 첫 시선
- primary action
- secondary action
- 기본 노출
- 접힘 정보
- 변경 전과 변경 후
- 다음 상태
- undo 또는 복구
- source-derived 값과 user-authored 값
- 현재 계약으로 가능한 부분
- 선행 데이터 계약이 필요한 부분

## 12. Interactive prototype 요구사항

설명 보고서보다 실제 조작 surface를 먼저 보여 주는 standalone 한국어 HTML을 만든다.

필수 상호작용:

- 8개 사례 전환
- 직접 text 입력
- Markdown·표·URL 예시 붙여넣기
- 감지 시작과 loading
- 감지한 input kind 표시
- heading -> Step, checklist row -> Item mapping 표시
- 줄 합치기·나누기
- 들여쓰기·내어쓰기
- Item 순서 이동
- Item/resource/guide 역할 변경
- 제목·상세·완료 기준 수정
- 날짜·상대 날짜·시간·장소·반복 설정
- unresolved 줄 확인
- source-derived / user-authored 비교
- primary artifact 변경 시 손실 안내
- personal draft / creator draft write path 분기
- save, export, blocked, retry, recovery 상태
- Markdown round-trip preview
- undo와 작성 중 draft 복구

프로토타입에서 실제 backend나 AI가 동작하는 것처럼 속이지 않는다.

- deterministic fixture 기반이면 `fixture simulation`으로 표시한다.
- parser가 없는 부분은 제안 상태로 표시한다.
- source를 읽지 못하면 가져온 척하지 않는다.
- 자동화 결과를 사용자 검증으로 표현하지 않는다.

## 13. 디자인 원칙

- 첫 유용한 preview 전 필수 입력은 일반 사례에서 0~2개다.
- 원문에서 확보한 값을 다시 입력시키지 않는다.
- 첫 화면의 competing primary action은 1개 이하이다.
- 긴 설정 폼보다 실제 결과를 먼저 보여 준다.
- 전체 문서와 한 Item 수정을 동시에 경쟁시키지 않는다.
- 모바일은 `입력 -> 해석 요약 -> 결과` 순으로 한 column에서 진행한다.
- wide는 `source/text -> interpreted outline -> artifact/inspector` 역할을 사용한다.
- 3열을 항상 고정하지 않고 화면 폭과 현재 작업에 따라 2열 또는 focus mode로 전환한다.
- 중첩 카드로 문서 구조를 표현하지 않는다.
- editor toolbar는 익숙한 icon과 accessible name을 사용한다.
- 날짜·반복·조건은 text 문법 암기 대신 contextual control을 우선할 수 있다.
- 원문과 생성 결과의 연결을 잃지 않는다.
- 공개 Flow 편집과 개인 사본 편집을 같은 `저장` 버튼으로 뭉개지 않는다.
- FlowMe 내부 구조어를 첫 화면에 강요하지 않는다.

## 14. 비교 측정

각 대안과 사례에서 다음을 기록한다.

- 첫 useful preview까지의 입력 수
- click/tap/keyboard action 수
- 사용자가 배워야 하는 전용 문법 수
- 필수 확인 항목 수
- 잘못된 Step/Item mapping 수
- 수정에 필요한 action 수
- 원문에서 다시 묻는 값 수
- source provenance가 보이는지
- primary artifact 예측 정확성
- projection에서 손실되는 필드 수
- mobile scroll depth
- competing primary action 수
- undo/recovery 가능 여부
- keyboard-only task completion
- 390px horizontal overflow

자동화된 점수는 heuristic 결과로만 기록한다.

## 15. Backend·개발 handoff

이번 목표에서는 구현하지 않지만 UX가 요구하는 최소 계약을 정리한다.

필수 entity 후보:

- `TextAuthoringDocument`
- `AuthoringBlock`
- `AuthoringParseResult`
- `BlockToCanonicalMapping`
- `UnresolvedAuthoringIssue`
- `DraftOwnership`
- `SourceValue`
- `UserOverride`
- `DraftRevision`
- `RoundTripReceipt`

이 이름은 사용자 UI에 노출하지 않는다. 기존 type으로 충분한지 먼저 평가하고,
새 계약은 필요성이 증명된 경우에만 제안한다.

필수 event 후보:

- `authoring_started`
- `text_pasted`
- `input_kind_detected`
- `structure_previewed`
- `mapping_corrected`
- `user_value_added`
- `artifact_previewed`
- `draft_saved`
- `creator_review_requested`
- `export_preflight_opened`
- `export_completed`
- `round_trip_checked`
- `unsaved_draft_recovered`
- `blocked_reason_viewed`

각 event에 다음을 기록한다.

- 발생 조건
- payload
- source 데이터와 user 데이터 소유권
- 저장 여부
- 실패 상태
- UI가 기다리는 응답
- 개인정보·민감정보 취급

## 16. Claude Design 독립 작업 lane

Claude Design에는 앱 전체 코드를 읽으라고만 지시하지 않는다. 먼저 4절의 standalone
handoff 패키지를 전달한다.

Claude Design의 역할:

1. evidence package의 8개 실제 콘텐츠를 사용한다.
2. A/B/C 저작 UX 대안을 같은 사례와 동일한 screen contract로 비교한다.
3. current Input Composer의 유지할 구조와 제거할 복잡도를 구분한다.
4. 390px, 1024px, 1440px current/proposed wireflow를 만든다.
5. 순수 Markdown, block outline, hybrid 방식의 interaction 차이를 실제 화면으로 보여 준다.
6. source-derived와 user-authored 값을 시각적으로 구분한다.
7. personal draft와 creator draft의 저장 결과를 다르게 보여 준다.
8. 상태 전환, error, recovery, round-trip을 포함한 interactive HTML을 만든다.
9. 긴 설명을 추가하지 않고 hierarchy, direct manipulation, progressive disclosure로 해결한다.
10. 앱 코드를 수정하지 않는다.

Claude Design이 참고할 외부 패턴:

- Obsidian: Markdown 원문을 사용자가 소유하는 방식
- Notion: block outline과 contextual property
- GitHub/GitLab Wiki: 읽기와 편집, revision 경계
- Workflowy/Dynalist: 들여쓰기 기반 outline 조작
- Linear/Todoist: 빠른 입력과 상세 편집 분리

외형이나 기능 목록을 복제하지 않는다. 다음 패턴만 `adopt / adapt / reject`로 판정한다.

- plain text portability
- outline hierarchy
- slash command
- property inspector
- source preview
- revision history
- keyboard command
- mobile editing
- conflict resolution
- export round-trip

## 17. Codex·Claude Code 작업 lane

Codex 또는 Claude Code는 다음을 담당한다.

1. 현재 repo의 canonical hierarchy와 실제 fixture를 추출한다.
2. 같은 콘텐츠의 version·항목 수 충돌을 정리한다.
3. handoff package를 self-contained로 만든다.
4. 대안별 데이터 계약 재사용 가능성과 migration 필요성을 평가한다.
5. deterministic interactive prototype을 구현한다.
6. source/personal/run/occurrence/export 경계 회귀 위험을 기록한다.
7. keyboard, accessible name, focus, overflow, draft recovery를 검증한다.
8. Claude Design 제안을 현재 계약으로 가능한 부분과 선행 계약이 필요한 부분으로 나눈다.
9. 앱 runtime을 수정하지 않는다.

## 18. 필수 산출물

### 18.1 기획·계약

```text
docs/specs/2026-07-28-flowme-text-authoring-ux-v1/
  spec.md
  plan.md
  tasks.md
  qa.md
  current-authoring-audit.md
  user-journey.md
  authoring-grammar-comparison.md
  state-model.md
  interaction-spec.md
  data-handoff.md
  content-corpus-index.md
  text-authoring-contract-v1.json
  case-authoring-matrix-v1.json
  syntax-alternative-comparison-v1.json
  surface-ownership-matrix-v1.json
```

### 18.2 시각 산출물

```text
docs/content-audit/2026-07-28-flowme-text-authoring-ux-v1-ko.html
docs/content-audit/2026-07-28-flowme-text-authoring-wireframes-ko.html
docs/content-audit/2026-07-28-flowme-text-authoring-ux-design-handoff/
```

메인 HTML 첫 화면에는 다음이 바로 보여야 한다.

- 실제 입력 텍스트
- FlowMe가 감지한 Step과 Item
- source에서 온 값
- 사용자가 추가한 값
- 만들어질 primary artifact
- 저장 또는 가져가기 결과

## 19. 실행 순서

### Phase 0. Evidence freeze

- 정본 파일과 current commit을 기록한다.
- 8개 사례 snapshot을 만든다.
- version·항목 수·projection 차이를 정리한다.
- Claude Design용 standalone handoff를 만든다.

Gate:

- 8개 사례 모두 actual evidence path가 있다.
- historical artifact와 current contract가 구분된다.
- source content를 새로 지어낸 사례가 없다.

### Phase 1. Authoring contract

- 텍스트 입력이 어떤 canonical 구조로 변하는지 정의한다.
- source/creator/personal write path를 분리한다.
- 문법 후보와 unsupported 경계를 정의한다.
- state model과 recovery를 작성한다.

Gate:

- plain text, Markdown, table, URL mixed input이 설명된다.
- Item/detail/field/resource 경계가 모호하지 않다.
- canonical Flow를 개인 편집이 덮어쓰지 않는다.

### Phase 2. Alternative wireflows

- A/B/C를 390px과 1024px으로 그린다.
- 8개 사례 중 최소 5개를 각 대안에 적용한다.
- 입력부터 save/export receipt까지 연결한다.

Gate:

- 예쁜 단일 화면이 아니라 end-to-end 상태 전환이 있다.
- 각 화면의 primary action은 하나 이하이다.
- 오류·취소·undo·draft recovery가 있다.

### Phase 3. Interactive prototype

- 8개 사례를 전환할 수 있는 standalone HTML을 만든다.
- 직접 입력과 deterministic parse simulation을 제공한다.
- mapping correction, contextual edit, artifact preview, save/export를 조작할 수 있다.

Gate:

- 390x844, 1024x768, 1440x900에서 가로 overflow가 없다.
- keyboard와 accessible name으로 핵심 여정을 수행할 수 있다.
- fixture simulation과 실제 구현을 구분한다.

### Phase 4. Independent design review

- Claude Design이 동일 handoff로 독립 대안을 만든다.
- Codex가 계약·구현 가능성·회귀 위험을 대조한다.
- 같은 평가표로 두 안을 비교한다.

Gate:

- current fact, design proposal, heuristic inference가 분리된다.
- 디자인 취향이 아니라 8개 사례와 사용자 행동으로 판정한다.

### Phase 5. Decision and implementation handoff

- 최종 UX 대안을 하나 선택하거나 보류한다.
- 구현 가능한 4~7개 slice로 나눈다.
- 첫 vertical slice와 rollback 경계를 정한다.
- 앱 구현 전 acceptance screenshot과 E2E marker를 작성한다.

Gate:

- 구현 전에 사용자에게 약속할 authoring journey가 한 문장으로 설명된다.
- 데이터 migration 필요 여부가 결정된다.
- 실제 사용자 관찰 전에 닫을 correctness·accessibility 문제가 분리된다.

## 20. 완료 기준

- 8개 실제 사례 모두 `input text -> Flow/Step/Item -> artifact -> save/export` 경로가 있다.
- 일반 메모 사용자는 FlowMe 전용 문법을 몰라도 첫 결과를 볼 수 있다.
- Markdown 사용자는 원문과 round-trip 결과를 비교할 수 있다.
- 긴 표는 행을 임의로 축약하지 않는다.
- resource와 guide 문장을 완료 Item으로 강제하지 않는다.
- 날짜 없는 Item에 가짜 날짜를 만들지 않는다.
- source-derived 값과 user-authored 값이 시각적으로 구분된다.
- creator draft와 personal draft의 write path가 섞이지 않는다.
- 공개 Flow 수정은 개인 사본 또는 correction suggestion으로 분기된다.
- 첫 useful preview 전 필수 입력은 일반 사례에서 0~2개다.
- 화면별 competing primary action은 1개 이하이다.
- 390px과 1024px에서 텍스트, outline, preview가 겹치거나 넘치지 않는다.
- keyboard로 입력, 구조 확인, Item 수정, 저장까지 수행할 수 있다.
- blocked/error 상태마다 이유, 보존 내용, 다음 행동, 돌아가기가 있다.
- 자동화와 agent review를 observed-user validation으로 표현하지 않는다.
- 앱 코드, dependency, 저장 데이터, STATUS, ROADMAP를 변경하지 않는다.
- `npm.cmd run docs:check`를 통과한다.

## 21. 최종 결과 형식

1. Executive decision
2. 기존 Input Composer에서 유지할 것
3. 텍스트 저작 UX가 해결할 사용자 문제
4. 8개 콘텐츠 evidence와 mapping
5. A/B/C 대안 비교
6. 권장 text grammar와 비지원 경계
7. creator / personal / suggestion write path
8. 전체 state model
9. 390px·1024px wireflow
10. interactive prototype
11. Keep / Change / Remove / Defer
12. 데이터 계약·migration·회귀 위험
13. 구현 slice와 dependency
14. 첫 구현 목표
15. 실제 사용자에게만 확인 가능한 질문 최대 5개

## 22. AI에 전달할 시작 지시

아래 문구와 이 문서의 GitHub 링크를 함께 전달한다.

```text
FlowMe의 실제 콘텐츠와 canonical 데이터 계약을 근거로, Wiki·Obsidian처럼 텍스트를
작성하거나 붙여넣어 Flow 콘텐츠를 만드는 UX를 기획해줘.

먼저 다음 목표 문서와 handoff README를 처음부터 끝까지 읽고 Phase 0 evidence
package부터 만든다.

https://github.com/knhbae/flowme2605/blob/codex/text-authoring-ux-design-handoff-20260728/docs/content-audit/2026-07-28-flowme-text-authoring-ux-design-goal-ko.md

https://github.com/knhbae/flowme2605/blob/codex/text-authoring-ux-design-handoff-20260728/docs/content-audit/2026-07-28-flowme-text-authoring-ux-design-handoff/README.md

이번 작업은 앱 구현이 아니다. 실제 Flow 콘텐츠를 새로 지어내지 말고 문서에 지정된
current fixture와 source-backed 사례를 사용한다. Markdown-first, block/outline,
text composer + structured preview 세 대안을 같은 사례로 비교한다.

최종적으로 모바일·wide wireflow, 조작 가능한 standalone HTML, Claude Design용
self-contained handoff, 데이터·상태 계약, 개발 slice를 만든다.

source, creator draft, published Flow, personal draft/overlay, execution run,
recurrence occurrence, export identity를 섞지 않는다. 자동화와 시뮬레이션을 실제 사용자
검증이라고 표현하지 않는다. 앱 코드, dependency, 저장 데이터, STATUS, ROADMAP,
commit, push, PR, merge, deploy를 변경하지 않는다.
```
