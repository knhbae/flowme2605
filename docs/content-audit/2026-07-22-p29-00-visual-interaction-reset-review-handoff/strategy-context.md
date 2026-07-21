# FlowMe Strategy Context for P29-00

이 문서는 P29 화면 제안이 과거 전략과 제품 결정을 놓치지 않도록 만든 요약이다. 각 원칙은 아래 원문 링크를 통해 다시 확인할 수 있다. Reviewer는 current production과 충돌하는 prior artifact를 정답으로 복사하지 말고, 제품 방향과 제약을 이해하는 참고 근거로 사용한다.

## 1. North Star: 콘텐츠와 실행 사이의 연결

FlowMe가 공략하는 빈칸은 콘텐츠가 없는 문제가 아니라 **본 콘텐츠를 실제 행동으로 바꾸는 비용**이다.

```text
원문·URL·메모
-> 출처와 범위를 보존한 실행 구조
-> 사용자에게 필요한 최소 개인화
-> My Flow 또는 Calendar에서 실행
-> Calendar, Todo, Sheet, Memo, Obsidian 등 기존 도구로 휴대
-> 완료·수정·재사용 신호를 개인 기록과 제작자 학습으로 연결
```

FlowMe는 콘텐츠 플랫폼, 모든 기능을 가진 planner, Calendar 대체재가 아니다. 사용자가 이미 쓰는 도구를 존중하면서 **실행 계약과 변환 관계**를 소유하는 portable execution layer다.

원문:

- [사용자·제작자 가치사슬 CEO 보고](../2026-07-12-flowme-user-creator-value-chain-ceo-ko.html)
- [Flow 콘텐츠 사용 방식 prior prototype](../2026-07-21-p28-00-promise-delivery-reconciliation/prior-artifacts/flow-content-usage-preview-ko.html)
- [prior promise summary](../2026-07-21-p28-00-promise-delivery-reconciliation/artifact-summary.md)

## 2. 사용자 가치사슬

화면은 한 번 저장하고 끝나는 funnel이 아니라 아래 lifecycle을 지원해야 한다.

1. 발견: URL, 메모, 제작자 원문, public Flow
2. 신뢰: 출처, 범위, 실제 저장 결과 확인
3. 개인화: 기준일, 항목 포함, 제목, 날짜, 메모, routine 설정
4. 저장 또는 휴대: My Flow, Calendar, checklist, sheet, memo
5. 실행: 지금 할 일과 구체 occurrence 수행
6. 복구: 완료 취소, 건너뜀, 보류, 개인 제외, 보관, 복구
7. 학습: 실행 중 메모와 원본에 알릴 점 구분
8. 재사용: 이전 run을 보존하고 새 기준일 또는 새 occurrence로 시작

P29는 이 lifecycle을 더 무겁게 만드는 기능을 추가하는 것이 아니라, 사용자가 **같은 Flow의 상태가 이어진다**고 느끼게 해야 한다.

원문:

- [콘텐츠 편집·실행 시뮬레이션](../2026-07-14-flowme-content-edit-execution-simulation-ko.html)
- [P27 lifecycle workspace spec](../../specs/2026-07-21-p27-flow-lifecycle-workspace-reconciliation/spec.md)
- [P23 lifecycle completeness spec](../../specs/2026-07-13-execution-lifecycle-completeness/spec.md)

## 3. 제작자 가치사슬과 초기 범위

초기 공급은 제작자·원문 권리자와 함께 검토된 Flow를 만드는 방향이 중요하지만, 사용자 경험은 제작자 운영 UI보다 먼저 **원문에서 실행으로 이어지는 가치**를 증명해야 한다.

- 원문 콘텐츠의 권리와 출처를 보존한다.
- AI는 제안 초안일 뿐 자동 발행자가 아니다.
- 제작자 기준본과 비공개 사용자 개인본을 분리한다.
- 초기에는 자체 결제·마켓플레이스보다 기존 상품·예약·제휴 링크와 실행 기여를 연결한다.
- 완료율이나 외부 실행 성과를 근거 없이 추정하지 않는다.

P29 visual reset은 creator marketplace, account, DB, AI backend를 앞당기는 근거가 아니다.

## 4. 하나의 사용자-facing Flow

사용자가 보는 primary object는 하나의 `Flow`다. `Flow Map`, source bundle, canonical pipeline 같은 내부 개념을 사용자 카드와 저장 문법으로 다시 분리하지 않는다.

같은 Flow가 아래 surface에서 다른 데이터 객체처럼 보이지 않아야 한다.

- discovery card
- save-before workspace
- first-save receipt
- returning My Flow
- Today projection
- Calendar projection
- portable result/export
- completed run and reuse

원문:

- [docs/DECISIONS.md](../../DECISIONS.md)의 `P26 uses one user-facing Flow object and dual start/adjust paths`
- [canonical Flow data model](../../specs/2026-07-11-canonical-flow-data-model/spec.md)

## 5. 콘텐츠별 자연스러운 결과

모든 Flow에 다섯 destination을 똑같이 노출하지 않는다. 하나의 rich effective model에서 콘텐츠에 맞는 primary result를 선택하고, 실제로 가치가 있는 secondary result만 최대 2개 보여준다.

| 콘텐츠 형태 | 대표 사용자 작업 | 자연스러운 primary | 중요한 보조 원칙 |
| --- | --- | --- | --- |
| 기준일 역산형 | 이사일에서 준비 일정 계산 | Calendar | 날짜 없는 후속은 Checklist에 유지 |
| 날짜 없는 체크형 | 필요할 때 순서대로 확인 | Checklist/Todo | Calendar 배치는 선택 사항 |
| 반복 routine | series를 설정하고 occurrence 실행 | Flow execution / Calendar | 정의와 회차 완료 분리 |
| 비교·학습 행 | 많은 속성과 진행 추적 | Sheet | 필요한 마감만 Calendar |
| 기록·안전 기준 | 맥락과 source를 보존 | Memo / Checklist | warning/resource를 완료로 평탄화하지 않음 |
| 개인 draft | 사용자 문장을 직접 실행 항목으로 전환 | Checklist/My Flow | 원문에 없는 action을 채우지 않음 |

중요한 약속:

- 원문 기반 전체 Flow가 결과 전에 보인다.
- 원문에 없는 날짜와 action을 임의로 만들지 않는다.
- 꼭 필요한 개인 값만 받는다.
- export 전에 item/event/row 수와 손실을 예측할 수 있다.
- 날짜 없는 항목은 유효한 실행 항목이며 list 결과에서 사라지지 않는다.

## 6. 서로 다른 세 frame

다음 화면은 같은 Flow를 쓰지만 목적이 다르다.

### Save-before

- 신뢰와 범위 확인
- 실제 결과 preview
- 최소 조정
- 저장 또는 외부 가져가기 결정

### First-save receipt

- 무엇이 저장됐는지 확인
- 첫 행동, 전체 Flow, Calendar, 가져가기 중 다음 경로 선택

### Returning execution

- 다음 실행과 전체 계획 확인
- 완료·재개·수정·보관·재사용

P29는 이 세 frame을 하나의 거대한 editor로 합치지 않는다. 대신 같은 header, item anatomy, state vocabulary를 사용해 visual continuity를 만든다.

원문:

- [docs/DECISIONS.md](../../DECISIONS.md)의 `Save before, first-save confirmation, and returning execution are distinct frames`
- [P27 spec](../../specs/2026-07-21-p27-flow-lifecycle-workspace-reconciliation/spec.md)

## 7. 데이터와 상태 소유권

시각 reset이 아래 책임을 다시 섞으면 안 된다.

| Layer | 소유하는 것 | 소유하지 않는 것 |
| --- | --- | --- |
| source / published | 원문 제목, 항목, 순서, source URL, published schedule | 개인 날짜, 완료 상태 |
| personal overlay | alias, anchor, item date/memo, include/exclude, 개인 순서 | occurrence 완료 기록 |
| routine series | 빈도, 요일, 시간, duration, 종료 조건 | 회차별 완료 |
| execution run | done, reopened, skipped, held, 실행 메모 | source 구조 |
| projection/export | destination eligibility, scope count, stable receipt | canonical source mutation |

Stable identity는 My Flow, Calendar, export에서 공유한다. UI에서 count나 임시 identity를 다시 계산하지 않는다.

원문:

- [docs/DECISIONS.md](../../DECISIONS.md)
- [canonical data model](../../specs/2026-07-11-canonical-flow-data-model/spec.md)
- [P28 shared projection](../2026-07-22-p28-02-shared-projection-contract/README.md)

## 8. Interaction 전략

기존 결정 중 P29가 유지할 interaction 원칙은 다음과 같다.

- 제목을 날짜·Flow metadata보다 먼저 읽는다.
- 완료는 executable item 또는 occurrence마다 하나이며 되돌릴 수 있다.
- resource, reference, warning, subcheck는 같은 완료 level이 아니다.
- 날짜 없는 일은 My Flow에서 실행하고 Calendar에서는 배치한다.
- 개인 편집은 제목, 날짜 상태, 개인 메모부터 시작하고 advanced schedule은 progressive disclosure한다.
- 여러 항목 조정은 temporary mode이며 completion checkbox와 selection checkbox를 동시에 두지 않는다.
- export는 format보다 scope를 먼저 정하고 실제 effective count를 보여준다.
- 반복 definition은 설정에, occurrence는 Today/Calendar 실행에 둔다.
- personal note와 원본 수정 의견은 분리한다.
- archive, exclusion, tombstone, occurrence skip, completion은 서로 다른 의미다.

## 9. Source-to-Flow gate

새 reference나 화면을 추가할 때 아래 gate를 통과해야 한다.

```text
one original source
-> one user job
-> one natural artifact
-> minimal execution UI
```

원문이 없거나 권한이 필요한 경우 그럴듯한 가짜 Flow를 만들지 않고 `source_import_required` 또는 review gate로 남긴다. social proof, review count, popularity는 실제 데이터 계약 없이는 만들지 않는다.

원문:

- [source-to-flow conversion gate](../../flow-rules/source-to-flow-conversion-gate.md)
- [content source selection](../../flow-rules/flow-content-source-selection.md)
- [URL-to-Flow backend decision](../../DECISIONS.md)

## 10. P29에서 하지 않을 전략적 확장

- 계정, DB, cloud sync
- 실제 AI API와 crawler
- 직접 Calendar/Todo/Notion OAuth
- Studio의 5번째 핵심 탭 승격
- 제작자 marketplace와 자체 결제
- rich-text document editor
- workout tracker 수준의 전문 기록
- planner 수준의 임의 nested hierarchy
- source와 personal state를 합치는 migration

이 항목은 중요하지 않아서가 아니라 현재 핵심 실행 경험을 검증하기 전에 열면 제품 범위가 흐려지기 때문에 보류한다.

## 11. Evidence와 성공 판단

- current production이 현재 UI 사실의 우선 근거다.
- screenshot과 source는 interaction을 설명하지만 사용성 성공을 입증하지 않는다.
- reference product는 pattern의 존재를 보여줄 뿐 FlowMe acceptance를 입증하지 않는다.
- 자동화와 에이전트 시뮬레이션은 observed-user validation이 아니다.
- P29-00은 구현 전에 alternatives와 acceptance를 정하는 design gate다.

P29의 성공은 “화면이 예뻐졌다”가 아니라 아래로 판단한다.

1. 사용자가 첫 viewport에서 저장될 Flow와 다음 행동을 예측한다.
2. 같은 Flow가 save-before, My Flow, Calendar에서 같은 상태와 command vocabulary로 이어진다.
3. common task는 설명을 읽지 않고 실행·완료·재개·조정할 수 있다.
4. 콘텐츠별 자연스러운 result만 먼저 보이고 외부 도구로 가져갈 결과를 예측한다.
5. visual 변화가 data contract를 깨뜨리지 않는다.

## 12. Reviewer가 참고할 원문 목록

우선순위대로 읽는다.

1. [현재 STATUS](../../STATUS.md)
2. [제품 DECISIONS](../../DECISIONS.md)
3. [P28 final package](../2026-07-22-p28-final-review-package/README.md)
4. [P28 experience reconstruction spec](../../specs/2026-07-21-p28-experience-reconstruction/README.md)
5. [P28 prior promise reconciliation](../2026-07-21-p28-00-promise-delivery-reconciliation/README.md)
6. [P27 lifecycle workspace spec](../../specs/2026-07-21-p27-flow-lifecycle-workspace-reconciliation/spec.md)
7. [P26 program spec](../../specs/2026-07-20-p26-program/spec.md)
8. [사용자·제작자 가치사슬](../2026-07-12-flowme-user-creator-value-chain-ceo-ko.html)
9. [콘텐츠 편집·실행 시뮬레이션](../2026-07-14-flowme-content-edit-execution-simulation-ko.html)
10. [Flow 콘텐츠 사용 방식 prototype](../2026-07-21-p28-00-promise-delivery-reconciliation/prior-artifacts/flow-content-usage-preview-ko.html)
