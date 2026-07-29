# FlowMe Text Authoring UX v1

- 작성일: 2026-07-28
- 문서 상태: design decision
- 구현 상태: 미구현
- 최종 선택: `adopt_hybrid_text_preview`
- 앱 코드 변경: 없음
- 관찰 사용자 수: 0

## 1. 사용자 약속

사용자는 Wiki, Obsidian, 메모장, 표에서 쓰던 내용을 그대로 입력하거나 붙여 넣는다.
FlowMe는 원문을 숨기지 않은 채 `Flow -> Step -> Item`으로 해석한 전체 결과를 먼저
보여 준다. 사용자는 잘못 묶인 부분과 자기에게 필요한 값만 고친 뒤 개인 초안,
제작자 초안 또는 외부 도구용 결과로 보낸다.

첫 사용 시 외워야 하는 FlowMe 전용 문법은 없다. Markdown은 지원되는 입력이자
round-trip 교환 형식이지 필수 작성 언어가 아니다.

## 2. 결정

세 대안 중 C를 기본으로 채택한다.

| 대안 | 판정 | 이유 |
|---|---|---|
| A. Markdown-first split editor | 보조 모드 | 이식성과 원문 소유감은 좋지만 metadata 문법을 학습시킨다. |
| B. Block/outline editor | 보정 모드 | 구조 오류 수정에는 좋지만 범용 문서 편집기로 커질 위험이 있다. |
| C. Text composer + structured preview | 기본 모드 | 일반 메모, Markdown, 표, URL 혼합 입력을 가장 적은 선행 결정으로 처리한다. |

권장 구조는 C 안에 A와 B의 장점을 제한적으로 포함한다.

1. 왼쪽 또는 첫 단계: 사용자가 소유하는 원문 텍스트
2. 가운데 또는 둘째 단계: FlowMe가 감지한 outline
3. 오른쪽 또는 셋째 단계: 실제 primary artifact
4. 특정 Item을 선택했을 때만 contextual editor
5. Markdown 원문 보기와 내보내기는 보조 행동

## 3. 제품 경계

### 포함

- 빈 문서, 일반 메모, Markdown, TSV/표, URL 혼합 입력
- 문단과 heading, checklist row, 표 행의 구조 감지
- 원문 줄과 Flow/Step/Item 연결 표시
- 합치기, 나누기, 들여쓰기, 내어쓰기, 순서 변경
- Item, resource, guide/caution 역할 수정
- 제목, 상세, 완료 기준 수정
- 선택적 날짜, 상대 날짜, 시간, 장소, 반복, 조건, 예상 시간
- source-derived 값과 user-authored 값 구분
- 개인 초안, 제작자 초안, correction suggestion 분기
- primary artifact 1개와 의미 있는 secondary artifact 최대 2개
- Markdown round-trip, 저장/export preflight, receipt
- parsing 오류, 권리·안전 검토, source 부족, draft 복구

### 제외

- 범용 Wiki와 지식 그래프
- 실시간 협업 편집과 댓글 시스템
- 실제 LLM API, crawler, OCR
- 계정, DB, cloud sync
- Notion, Obsidian, Calendar, Todo OAuth
- 완전한 Markdown 문법 지원
- 공개 Flow를 즉시 덮어쓰는 편집
- 실행 완료 상태와 recurrence occurrence 편집

## 4. Canonical 경계

```text
SourceRow -> Item -> Step -> Flow -> Bundle / Flow Map
```

- `Item`은 독립적으로 완료·결정·기록·보류 가능한 최소 단위다.
- `Step`은 Item을 묶는 순서·구간·주제이며 완료 상태를 별도로 소유하지 않는다.
- Calendar, Checklist/Todo, Sheet, Memo는 같은 canonical Item의 projection이다.
- 설명, URL, 경고는 실행 가능한 행동이 아니면 Item으로 만들지 않는다.
- 날짜 없는 Item은 정상 상태이며 VEVENT로 만들지 않는다.

다음 소유권 층은 분리한다.

```text
source snapshot
creator draft
published Flow
personal draft / personal overlay
personal structural overlay
execution run
recurrence series / occurrence
export identity / receipt
correction suggestion
```

## 5. 기본 화면 계약

### 5.1 Input

- 사용자 질문: 무엇을 Flow로 만들까?
- 기본 노출: 하나의 composer, 가져온 파일/URL 요약, 작성 중 복구 상태
- primary action: `구조 확인`
- secondary: 표 가져오기, 예시 선택
- 숨김: parser 이름, taxonomy enum, backend 필드

### 5.2 Structure Review

- 사용자 질문: FlowMe가 내용을 어떻게 나눴나?
- 기본 노출: 원문 줄과 Step/Item 연결, unresolved 표시
- primary action: `결과 보기`
- contextual actions: 합치기, 나누기, 들여쓰기, 역할 변경
- 숨김: 전체 고급 property와 저장 계약

### 5.3 Result Preview

- 사용자 질문: 실제로 무엇이 만들어지나?
- 기본 노출: 전체 Item 수, primary artifact, 날짜 범위, source 상태
- primary action: `개인 Flow 5개 항목으로 저장` 같은 구체적 행동
- secondary: 의미 있는 다른 projection, 필요한 항목만 조정
- 숨김: 지원되지 않는 artifact와 빈 탭

### 5.4 Contextual Item Editor

- 사용자 질문: 이 항목에서 무엇을 고칠까?
- 기본 노출: 제목, 상세, 완료 기준
- 펼침 정보: 날짜·시간·장소·반복·조건·resource·source
- primary action: `변경 적용`
- 취소: 원래 해석으로 되돌리기

### 5.5 Ownership Review

- 사용자 질문: 이 내용은 누구 것이고 어디에 저장되나?
- 기본 노출: source-derived, creator-authored, personal override, unresolved
- primary action: 역할에 따라 `개인 초안으로 저장`, `검토 요청`
- 공개 원본 수정은 correction suggestion으로 분기

### 5.6 Receipt

- 사용자 질문: 무엇이 저장되거나 이동됐나?
- 기본 노출: 제목, Item 수, artifact, 범위, source 보존 여부
- primary action: `내 Flow 열기` 또는 생성 파일 확인
- 중복 CTA와 추가 설정은 두지 않는다.

## 6. 권장 텍스트 문법

### 6.1 원칙

- 일반 문장만으로 첫 결과가 나와야 한다.
- 익숙한 Markdown heading과 checklist는 구조 힌트로 사용한다.
- 짧은 속성은 읽을 수 있는 한국어 label을 허용한다.
- 복잡한 recurrence와 조건은 inspector에서 설정한다.
- 알 수 없는 syntax는 원문에 남기고 issue로 표시한다.
- silent drop과 임의 추론을 금지한다.

### 6.2 지원 후보

```markdown
# 8월 제주 여행 준비

## 예약
- [ ] 항공권 확인
  날짜: 2026-08-03
  시간: 08:20
  장소: 김포공항
  완료 기준: 예약번호를 메모에 남김

## 출발 전
- [ ] 온라인 체크인
  날짜: D-1
```

지원 label:

- `자세히:` 또는 `설명:`
- `완료 기준:`
- `날짜:`
- `시간:`
- `장소:`
- `반복:`
- `조건:`
- `예상 시간:`
- `자료:`
- `출처:`
- `메모:`

inline token은 읽기 전용 감지 후보로 둘 수 있지만 기본 작성법으로 가르치지 않는다.

## 7. 해석 규칙

| 입력 | 기본 해석 | 확인이 필요한 경우 |
|---|---|---|
| 문서 첫 heading | Flow 제목 | 여러 최상위 heading이 독립 계획처럼 보임 |
| 하위 heading | Step | heading 아래 실행 Item이 없음 |
| `- [ ]` 행 | Item | URL 또는 설명만 있음 |
| 일반 bullet | Item 후보 또는 detail | 동사가 없거나 reference 성격 |
| indented prose | 직전 Item detail | 새 행동 문장처럼 보임 |
| URL | resource/source link | URL만 있고 source를 확보하지 못함 |
| 표 행 | Item 또는 source row | 헤더가 불명확하거나 병합 셀이 있음 |
| 날짜 label | Item date/relative date | 연도, 기준일, timezone 불명확 |
| 반복 label | recurrence proposal | 종료 조건 또는 빈도 충돌 |

자동 해석은 제안이며 원문을 수정하지 않는다.

## 8. 여덟 사례 acceptance

| 사례 | 기본 결과 | 반드시 보존 |
|---|---|---|
| 이사 D-30 | Calendar | 선택한 source/version, 6 Step, 상대 날짜, source row |
| 차량 점검 | Todo 또는 Calendar | canonical 상대일 유지, anchor 없는 개인 projection만 undated |
| Allblanc 7일 순서형 | Calendar | Day 1~7 순서, resource, 주간 반복형과 variant 분리 |
| K-MOOC 14주 | Sheet | 14개 행, 현재 주차는 개인 값 |
| LibriVox 38장 | Queue/Sheet | 38장, 순서, 현재 장·재생 위치 |
| 신차 구매 8단계 | Checklist | 결정·확인·기록 차이와 비교 필드 |
| 해외여행 안전정보 | Memo/Guide | guide/caution/action 분리, 공식 source |
| 제주 여행 개인 메모 | Todo | 원문 fragment와 5 Item lineage, 재정렬·병합·분할 |

## 9. Progressive disclosure

첫 useful preview 전 필수 사용자 입력은 일반 사례에서 0~2개다.

- 상대 날짜 Calendar를 실제 날짜로 만들 때만 기준일을 묻는다.
- 방문을 선택했을 때만 장소를 묻는다.
- 이미 진행 중인 과정일 때만 현재 주차/현재 장을 묻는다.
- recurrence가 source에 없으면 임의 반복을 만들지 않는다.
- 권리·안전·source 부족은 사용자 개인화로 해결하지 않는다.

## 10. 데이터 우선순위

1. source 사실은 source snapshot에 유지한다.
2. creator edit는 creator draft에 기록한다.
3. 개인 수정은 personal draft/overlay에 기록한다.
4. 같은 필드에서 source와 개인 값이 충돌하면 결과는 개인 값을 사용하되 source 값을 함께 보여 준다.
5. 실행 완료와 메모는 execution run에 기록하며 authoring document에 쓰지 않는다.
6. 공개 Flow correction은 제안으로만 저장한다.

## 11. 구현 판단

- 기존 canonical schema migration: 1차 slice에는 불필요
- 새 authoring draft 계약: 필요
- 기존 source/personal/run/occurrence/export 변경: 금지
- parser: deterministic adapter부터 시작
- AI/provider: 후속 검증 전 보류
- 첫 vertical slice: 개인 제주 메모와 이사 Markdown을 같은 hybrid shell에서 해석하고
  원문 lineage를 유지하는 deterministic authoring contract

### Version manifest

이사 benchmark는 제목과 Item 수만으로 동일한 Flow라고 판단하지 않는다.

| fixtureId | source | itemCount | 용도 |
|---|---|---:|---|
| `runtime-moving-d30-basic` | AJD | 24 | current runtime route evidence |
| `bundle-moving-d30` | AJD | 27 | qualified corpus v2 authoring 대표 fixture |
| `IC-C01-MOVING` | EasyLaw | 24 | prior Input Composer comparison fixture |

이 문서의 authoring 대표는 `bundle-moving-d30`이다. interactive prototype에서 EasyLaw
24개를 보여 줄 때에는 별도 fixture 이름과 source를 표시한다.

Allblanc도 다음 두 variant를 섞지 않는다.

- `bundle-allblanc-7day-abs`: 7개 영상의 Day 1~7 순서형 Flow
- `curated-allblanc-morning-workout`: 1개 영상에 사용자 선택 weekly recurrence를 적용한 Flow

K-MOOC의 `0/14`는 source 사실이 아니라 execution run의 초기/derived 값이다.

## 12. 완료 기준

- 8개 사례가 `input -> mapping -> artifact -> save/export`로 이어진다.
- 일반 메모는 전용 문법 없이 첫 preview가 나온다.
- K-MOOC 14행과 LibriVox 38장이 축약되지 않는다.
- resource와 guide가 완료 Item으로 강제되지 않는다.
- 날짜 없는 Item에 가짜 날짜가 생기지 않는다.
- source와 사용자 값이 시각적으로 구분된다.
- creator/personal/suggestion write path가 분리된다.
- 390, 1024, 1440에서 overflow와 겹침이 없다.
- keyboard로 입력, 구조 확인, Item 수정, 저장까지 가능하다.
- fixture simulation과 현재 구현이 구분된다.
- 자동 검토를 실제 사용자 검증으로 표현하지 않는다.
