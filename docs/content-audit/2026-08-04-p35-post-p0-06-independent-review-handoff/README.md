# P35 P0-06 이후 독립 UX 검토 인계 패키지

> 상태: `REVIEW_HANDOFF`
> 기준: P35 Production + Round 2 local P0-06
> 구현: 이번 패키지에서는 하지 않음
> 게시·배포: 별도 상태로 기록
> 실제 관찰 사용자: `0명`
> 제외: Text-to-Flow, 사용자 관찰, OAuth·원격 동기화, 신규 기능 확장

## 한 줄 목표

버튼과 색을 개별 수정하기 전에, `공개 계획 → 수정 → 내 계획에 저장 → 내 계획에서 실행·옮기기`가 하나의 예측 가능한 생명주기인지 Codex와 Claude Design이 서로 독립적으로 반증·검토하게 한다.

이번 검토는 같은 사용자 피드백을 처음부터 다시 읽는 작업이 아니다. 이전 검토 뒤 로컬 구현이 `P0-06`까지 진행되었으므로 다음 세 층을 분리해서 본다.

| 층 | 의미 | 판정 가능 범위 |
|---|---|---|
| P35 Production | 현재 배포되어 있는 기준 제품 | 현재 프로덕션 동작 |
| Round 2 local P0-06 | 공통 저장 lifecycle·editor까지 반영한 미게시 후보 | 로컬 구현 사실과 회귀 |
| P0-07 이후 Proposal | capability preview, `/my` IA, 실제 결과 생성, 감산·카피 | 설계 적합성·위험·구현 전 acceptance |

Production canonical URL은 <https://flowme2605.vercel.app>이며 2026-08-04 15:36 KST에 anonymous HTTP 200을 확인했다. 최신 GitHub Production deployment는 성공 상태지만 보호된 deployment URL 때문에 alias→deployment SHA의 byte-level 매핑은 `PARTIAL`이다. 정확한 값과 Claude의 판정 규칙은 [03 증거 manifest](./03-evidence-manifest-ko.md)에 있다.

제안 화면은 `PROPOSAL`이다. 로컬 구현 화면만 `ROUND2_LOCAL_P0_06`이라고 부를 수 있으며, Production에 반영되기 전에는 `Production After`라고 부르지 않는다.

## 근본 검토 순서

1. 콘텐츠별 JSX와 별도 상태가 실행 의미를 소유하는지, 공통 데이터·renderer가 capability만 다르게 표현하는지 확인한다.
2. `내 Flow`가 저장 계획의 집인지, 오늘 실행 화면인지, 두 역할의 관계가 무엇인지 확인한다.
3. 공개 미리보기·세션 수정·저장·실행·내 도구로 옮기기의 상태와 행동 소유권을 확인한다.
4. 하나의 canonical 계획이 캘린더·할 일/체크리스트·시트·메모로 손실 없이 투영되는지 확인한다.
5. 공개 Plan/Item과 저장 Plan/Item이 같은 editor family를 쓰되 서로 다른 commit 효과를 정확히 알리는지 확인한다.
6. 위 구조가 닫힌 뒤에만 도움·주의·용어·색상·간격을 감산한다.

## 권장 실행 순서

두 검토자는 패키지 작성·기획·이전 검토 맥락이 없는 새 세션에서 시작하고, 먼저 서로의 결과와 기존 기획의 해답을 보지 않고 진행한다.

1. Codex에 [05a Codex 1차 블라인드 프롬프트](./05a-codex-blind-root-discovery-prompt-ko.md)를 전달한다.
2. Claude Design에 [06a Claude 1차 블라인드 프롬프트](./06a-claude-design-blind-root-discovery-prompt-ko.md)의 GitHub 링크를 전달한다.
3. 두 1차 결과를 각각 파일 hash·고정 시각으로 잠근다.
4. 각자 자신의 1차 세션을 계속 사용하거나, 새 세션에는 자신의 잠긴 1차 결과만 첨부한다. Codex에 [05 Codex 2차 계약 반증 프롬프트](./05-codex-local-post-p0-06-review-prompt-ko.md), Claude에 [06 Claude 2차 계약 반증 프롬프트](./06-claude-design-post-p0-06-review-prompt-ko.md)를 전달한다. 이때도 서로의 결과는 보여주지 않는다.
5. 양쪽 2차 결과가 모두 고정된 뒤에만 기획 세션 `019fac25-34bc-7ea1-9533-376776fac3c0`에 [08 교차 종합 프롬프트](./08-planning-reconciliation-prompt-ko.md)를 전달한다.
6. 실제 실행용 짧은 문구는 [09 실행 순서와 복사 문구](./09-run-order-and-copy-paste-ko.md)를 사용한다.

1차는 00a 원문·00b blind 증거와 각자 접근 가능한 raw runtime만 사용한다. 그 전에 00 해석 경계·README·01~04·07·승인 방향을 읽으면 blind independence가 훼손된다. Codex가 Claude 결과를 먼저 보거나 Claude가 Codex 결론을 먼저 보면 cross-review independence도 훼손된 것으로 표시한다.

## 문서 목록

| 문서 | 용도 |
|---|---|
| [00a Owner 피드백 원문 전용](./00a-owner-feedback-verbatim-only-ko.md) | 해석을 섞지 않은 1차 blind 입력 |
| [00b blind 증거 index](./00b-blind-evidence-index-ko.md) | 권장안 없이 화면 신원·링크·한계만 제공하는 1차 입력 |
| [00 Owner 피드백 해석 경계](./00-owner-feedback-verbatim-and-ambiguities-ko.md) | 2차에서 원문·문제 의도·해결 제안·모호함을 비교 |
| [01 현재 상태와 검토 경계](./01-current-state-and-review-boundary-ko.md) | P0-01~06에서 바뀐 것, 아직 안 바뀐 것, 검토 시점 분리 |
| [02 근본 문제·가설 지도](./02-root-problem-and-hypothesis-map-ko.md) | 사용자 피드백 10개를 네 가지 결정과 반증 가설로 재구성 |
| [03 증거 manifest](./03-evidence-manifest-ko.md) | Production·local·Proposal 화면과 확인 불가 항목 분리 |
| [04 비교 앱 study brief](./04-cross-app-study-brief-ko.md) | 다른 앱에서 가져올 관계 원칙과 가져오지 않을 복잡성 |
| [05a Codex 1차 blind](./05a-codex-blind-root-discovery-prompt-ko.md) | 기획 해답을 보기 전 원문·runtime 기반 근본 문제 발견 |
| [05 Codex 2차](./05-codex-local-post-p0-06-review-prompt-ko.md) | blind 결과 고정 후 실제 runtime·코드·storage·projection 계약 반증 |
| [06a Claude 1차 blind](./06a-claude-design-blind-root-discovery-prompt-ko.md) | 기획 해답을 보기 전 원문·화면 기반 근본 문제 발견 |
| [06 Claude Design 2차](./06-claude-design-post-p0-06-review-prompt-ko.md) | blind 결과 고정 후 GitHub 자료로 IA·visual·copy 계약 반증 |
| [07 공통 scorecard](./07-independent-scorecard-and-evidence-rules-ko.md) | 양쪽 결과를 같은 증거·판정 형식으로 기록 |
| [08 기획 교차 종합 프롬프트](./08-planning-reconciliation-prompt-ko.md) | 독립 결과를 구현 전 의사결정과 다음 gate로 합성 |
| [09 실행 순서와 복사 문구](./09-run-order-and-copy-paste-ko.md) | 실제 세션에 전달할 짧은 요청문 |
| [10 응답 템플릿](./10-review-response-template-ko.md) | 결과 누락 없이 D·S·U·증거를 기록하는 빈 양식 |
| [증거 JSON](./evidence-manifest.json) | 최신 local 이미지 hash·상태·증거 한계를 기계 판독 가능하게 기록 |
| [시나리오 JSON](./review-scenarios.json) | S01~S13 route·상태·필수 증거를 기계 판독 가능하게 기록 |

## 이번 검토에서 고정할 사용자 피드백 ID

| ID | 사용자 의도 |
|---|---|
| U01 | 실제 옮기기/내보내기의 주 위치를 `내 Flow`에서 찾고 싶음 |
| U02 | 반복 도움·주의를 줄이고 필요할 때 열고 싶음 |
| U03 | `내 Flow` 전체 정보 구조와 순서를 다시 검토하고 싶음 |
| U04 | Item 상세→메모→완료·되돌리기 흐름과 파란 surface·중복 heading·수정 문구를 함께 재검토하고 싶음 |
| U05 | Flow Map의 3칸 요약을 제거하거나 축약하고 싶음 |
| U06 | 시작일 입력 직후 같은 날짜가 반복되는 문제를 없애고 싶음 |
| U07 | 공개 상세 CTA와 여러 결과 미리보기, 저장 후 이동을 일관되게 만들고 싶음 |
| U08 | 공개/저장 편집 UI를 같은 family로 만들고 인라인 편집을 없애고 싶음 |
| U09 | 공개 상세의 더보기·미리보기·편집 역할을 단순화하고 싶음 |
| U10 | 사용자 화면의 `Flow` 용어가 이해되는지 다시 검토하고 싶음 |

U01~U10은 문제와 의도다. 사용자가 함께 제안한 해결법은 자동 정답이 아니며, 최소 세 항목에서 그대로 적용할 때의 위험과 수정안을 제출해야 한다.

## 이미 승인된 방향과 재개방 규칙

Owner는 Round 2에서 `Q1-B / Q2-B / Q3-B`를 승인했다.

- Q1-B: 미수정·eligible·local-only 결과만 저장 없이 한 번 사용 가능. 권위 있는 재생성·범위·이력은 저장 계획이 소유한다.
- Q2-B: 일반 `/my`는 저장 계획 library shell이며 Today는 같은 데이터의 compact 파생 요약이다.
- Q3-B: 핵심 사용자 화면은 `계획 찾기 / 내 계획 / 계획 수정`을 우선하되 FLOW 브랜드·URL·내부 type·storage key는 유지한다.

검토자는 이 결정을 비판할 수 있지만, 단순 취향으로 다른 안을 적용 대상으로 바꾸지 않는다. 다음 중 하나를 근거로 `DECISION_REOPEN_REQUIRED`를 명시해야 한다.

- canonical 데이터나 저장 상태를 손상함
- 지원하지 않는 결과를 정상처럼 약속함
- 안전·비가역 영향이 숨겨짐
- 같은 주 행동이 중복되어 어느 버전을 바꾸는지 알 수 없음
- rollback이나 legacy read-only 호환을 지킬 수 없음

## 완료 조건

- Codex와 Claude가 U01~U10을 모두 빠짐없이 판정한다.
- 양쪽 1차 blind 결과가 hash·시각으로 고정되고 2차 delta가 남는다.
- state namespace, evidence kind, implementation status, Proposal coverage가 서로 섞이지 않는다.
- 데이터→UI 구조와 네 가지 제품 결정을 합친 D0~D4, 감산·안전·용어 횡단 규칙 D5~D6마다 유지안·대안·기각 이유가 있다.
- 모든 계획에 고정 5형식을 강제하지 않는다.
- `완료`는 Item 실행 완료 외 의미로 확장하지 않는다.
- 중요한 안전·중복·비가역 영향은 아이콘을 열어야만 보이게 만들지 않는다.
- 양쪽 결과가 끝날 때까지 서로의 결론을 보지 않는다.
- 자동화·화면 캡처·전문가 시뮬레이션을 실제 사용자 관찰이라고 부르지 않는다.
