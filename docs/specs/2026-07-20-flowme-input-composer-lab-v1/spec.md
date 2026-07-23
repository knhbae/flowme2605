# FlowMe Input Composer Lab v1

작성일: 2026-07-20
상태: 검토용 실험 계약
범위: 문서·fixture·정적 HTML·validator만. app runtime, DB, LLM provider, crawler, 공개/배포는 변경하지 않는다.

## 결론

Flow 콘텐츠의 실행 최소 단위는 `Item`이다. 화면에서는 이를 **할 일·결정·기록·볼/들을 자료 한 건**으로 보여주고, 저장 계약은 아래 조합으로 고정한다.

```text
Item = 실행 의도 + 짧은 제목 + 상세 설명 + 완료 기준
     + 선택적 일정 + 선택적 장소 + 선택적 기록값 + 선택적 조건 + 출처 연결
```

ICS, Calendar, Checklist, Todo, Sheet, Memo는 Item 자체가 아니라 사용 목적에 맞춘 projection이다. 일정이 없는 Item에는 ICS를 만들지 않는다. 폭염 대응처럼 조건·중지·응급 규칙이 핵심인 내용은 모든 문장을 완료 체크로 만들지 않고 response card로 분리한다.

## 이번 실험이 답하는 질문

1. 사용자가 내부 데이터 필드나 분류명을 몰라도 한두 번의 입력으로 쓸 만한 첫 미리보기를 볼 수 있는가?
2. 원문에서 이미 읽은 날짜창·주차·장·반복 조건·주의사항을 다시 묻지 않는가?
3. 콘텐츠를 만드는 사람의 원문 확인과 최종 사용자의 날짜·시작점·선택을 서로 다른 저장층으로 분리할 수 있는가?
4. 같은 Item 조합이 Calendar, Checklist, Todo, Sheet, Memo 중 자연스러운 결과물로만 투영되는가?
5. 원문 부족이나 안전 검토 대기 상태에서 그럴듯한 빈 Flow를 만들지 않고 멈출 수 있는가?

## Canonical Item v1.1 view

| 구성 | 필수 | 사용자 화면 | 규칙 |
|---|---:|---|---|
| `intent` | 예 | 할 일 / 결정 / 기록 / 볼·들을 자료 | `action`, `decision`, `record`, `consume` 네 의미로 제한한다. |
| `title` | 예 | 짧은 행동 제목 | 원문 행동 또는 사용자가 직접 쓴 문장만 허용한다. |
| `detail` | 예 | 방법·맥락·주의 | 낮은 가치의 설명을 별도 Item으로 부풀리지 않는다. |
| `completion` | 예 | 언제 끝난 것으로 볼지 | 체크, 선택, 기록, 소비 완료 기준을 명시한다. |
| `schedule` | 아니오 | 날짜·시간·반복 | 실제 날짜/offset/date window/시간 반복이 있을 때만 사용한다. 조건 발생은 일정이 아니다. |
| `location` | 아니오 | 방문 장소 | 실제 실행에 필요할 때 사용자 overlay로만 추가한다. |
| `fields` | 아니오 | 상태·선택·마지막 위치 | 실행 상태와 기록값이며 원문 행을 다시 타이핑하는 입력이 아니다. |
| `conditions` | 아니오 | 해당 시 할 대응 | 완료 체크와 분리하며, 응급 조건은 접지 않는다. |
| `sourceRefs` | 출처 기반이면 예 | 원문 보기 | SourceRow까지 추적하며 개인 한 줄 입력은 `user_request` provenance를 쓴다. |

기존 canonical 문서의 `SourceRow → Item → Step → Flow`와 projection 원칙은 유지한다. 이 실험 계약은 런타임 타입 교체가 아니라 URL-to-Flow backend가 반환할 수 있는 입력/overlay adapter의 검증안이다.

## 네 입력 경로

| 경로 | 사용 순간 | 첫 응답 | 대표 사례 |
|---|---|---|---|
| 한 줄 빠른 추가 | 이미 알고 있는 작은 일을 적을 때 | 사용자가 쓴 범위 그대로 + 기존 source-backed Flow가 있으면 재사용 제안 | 세탁조 알림 루틴 |
| 여러 줄 붙여넣기 | 문서·메모에 행이 이미 있을 때 | 행 수와 범위를 먼저 보여주고 묶음/결정 형태를 제안 | 여권, 에어컨 세척 비교 |
| URL 제안 후 확인 | 공식/제작자 원문이 있을 때 | 읽은 범위·빠진 범위·결과물 제안 | 이사, 폭염, Todoist 로그인 경계 |
| 표·커리큘럼 가져오기 | 주차·장·행이 핵심일 때 | 행을 줄이지 않은 진도표 | K-MOOC 14주, LibriVox 38장 |

한 줄·여러 줄·URL은 첫 composer가 자동 판별할 수 있다. 표는 파일/표 범위 선택이 필요하므로 별도 보조 행동으로 둔다. 내부에는 네 경로를 보존해 비용과 실패 원인을 비교한다.

## 제작자 입력과 사용자 개인화

```text
원문/표/URL 입력 (creator draft)
  → 원문 범위와 행 확인
  → source-backed content version
  → 날짜·장소·현재 위치·결정 (user overlay)
  → 실행 기록 (run state)
```

- 제작자는 원문 하나와 변환 범위를 확인한다.
- 최종 사용자는 자기에게만 있는 날짜·장소·현재 진행점·결정만 입력한다.
- source, creator content, user overlay, run state는 같은 값을 덮어쓰지 않는다.
- 첫 미리보기 뒤의 실행 기록은 composer 필수 입력 수에 포함하지 않는다.

## 8개 실험 사례

| 사례 | 경로 | 첫 artifact 전 필수 payload | 핵심 결과 | 경계 |
|---|---|---:|---|---|
| 이사 D-day | URL | URL + 이사일 = 2 | Calendar 24건 | 상대일은 원문, 이사일만 사용자 값 |
| K-MOOC 14주 | 표 | 표 1 = 1 | 14행 Sheet | 주차·활동 재입력 금지 |
| LibriVox 38장 | 표 | 표 1 = 1 | 38행 Sheet | 청취 날짜 발명 금지 |
| 성인 여권 재발급 | 여러 줄 | 본문 1 = 1 | Todo + Checklist | 신청 경로는 실행 중 결정 |
| 세탁조 알림 루틴 | 한 줄 | 문장 1 = 1 | 조건형 Todo | 40회/알림을 월간 ICS로 바꾸지 않음 |
| 에어컨 세척 선택 | 여러 줄 | 본문 1 = 1 | 결정 Memo | 가격·추천 발명 금지 |
| 농사로 폭염 대응 | URL | URL 1 = 1 | 내용 확인만 | 조건 카드 보존, safety/editorial review 전 export 차단 |
| Todoist 템플릿 | URL | URL 1 = 1 | 원문 확보 안내 | 실제 task import 전 Flow 생성 금지 |

## Projection 규칙

- Calendar/ICS: 실제 schedule이 계산되는 Item만 event 1:1로 만든다.
- Checklist: 한 번의 현장에서 빠뜨리지 않고 확인하는 독립 항목에 사용한다.
- Todo: 다음 행동이나 조건 발생 시 수행할 작은 일에 사용한다.
- Sheet: 주차·장·행과 상태가 계속 유지돼야 할 때 사용한다.
- Memo: 비교 근거, 선택 결과, 조건/주의, source link를 함께 보존한다.
- 적용 불가능한 결과물은 빈 payload를 만들지 않고 `필요 없음` 또는 `검토 대기`로 표시한다.

## UI progressive disclosure

항상 보이는 것은 입력 한 칸, 원문에서 찾은 범위, 첫 자연 artifact, 출처 연결이다. 다음은 필요할 때만 연다.

- 이사: 실제 날짜 계산에 필요한 `이사일`.
- 여권: 방문을 선택한 뒤에만 방문 장소.
- K-MOOC: 사용을 시작한 뒤 주차별 상태·메모.
- LibriVox: 이어 듣기를 고른 뒤 현재 장·마지막 위치.
- 에어컨: 비교를 본 뒤 선택·견적 메모.
- 세탁조: 원문의 조건은 읽기 전용이며 반복 입력을 다시 묻지 않는다.
- 안전 조건·중지·119는 고급 영역에 숨기지 않는다.

## 검증 경계

이 산출물은 동결된 실제 source-backed fixture와 deterministic adapter를 이용한 자동/에이전트 QA다. 실제 crawler, LLM provider 비용·지연, 관찰 사용자 이해도, 공개 권리 승인을 증명하지 않는다. HTML의 입력 조작은 제품 방향을 판단하기 위한 local prototype이다.
