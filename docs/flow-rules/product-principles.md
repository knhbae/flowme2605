# FLOW Product Principles

## Product Definition

FLOW는 콘텐츠 소비 앱이 아니다. FLOW는 블로그, 영상, 공식 안내, 제작자 경험을 사용자의 실행 도구로 옮길 수 있는 구조로 변환하는 실행 레이어다.

좋은 Flow는 사용자가 “읽었다”에서 멈추지 않고 다음 중 하나를 할 수 있게 한다.

- 캘린더에 넣는다.
- 엑셀/시트로 관리한다.
- 메모/노션/할 일 앱에 복사한다.
- FLOW 안에서 체크한다.
- 출처와 주의사항을 확인하고 실행 여부를 판단한다.

## Broad Principles

### 1. Start With The User Need

Flow를 만들기 전에 다음 문장을 쓴다.

```text
As a [specific person/context],
I need to [do or decide something],
so that [real-world outcome].
```

나쁜 예:

```text
As a user, I need a diet Flow, so that I can use the diet Flow.
```

좋은 예:

```text
As a beginner trying a creator diet tip today,
I need one meal-level action I can try without changing my whole diet,
so that I can test whether the advice fits me.
```

### 2. Choose The Destination Before The Layout

Flow의 primary destination을 먼저 정한다.

| Destination | Use When | Common Output |
|---|---|---|
| `calendar` | 실행 날짜, 반복 요일, 마감일이 중요하다. | ICS, date row, reminder copy |
| `sheet` | 여러 항목, 상태, 날짜, 비교/누적 관리가 중요하다. | XLSX execution table |
| `memo` | 짧은 기준, 레시피, 주의사항, 개인 메모가 중요하다. | plain text / Notion copy |
| `internal_check` | 지금 페이지에서 바로 체크하는 것이 가장 빠르다. | local checklist |
| `hybrid` | 시험, 이사, 이유식처럼 날짜와 기록이 모두 중요하다. | calendar + sheet + copy |

### 3. Preserve Source Shape, Do Not Worship It

원본 콘텐츠 구조를 존중하되 그대로 복사하지 않는다.

- 영상 1개가 하나의 따라하기 행동이면 1 action이 충분할 수 있다.
- 영상 1개가 4주 프로그램을 설명하면 다중 routine/phase가 맞을 수 있다.
- 블로그가 정보 모음이라면 사용자의 목적에 따라 checklist나 memo가 맞을 수 있다.
- 공식 안내는 공식 정보와 사용자 경험 팁을 섞지 않는다.

### 4. Use The Minimum Necessary Complexity

복잡도는 “사용자가 목적을 달성하는 데 필요한 만큼”만 둔다.

- 너무 단순하면 원본 핵심이 사라진다.
- 너무 복잡하면 사용자가 자기 도구로 옮기지 않는다.
- action 수, 탭 수, export 수, 설명 카드 수는 원본 복잡도가 아니라 사용자 결정 비용을 기준으로 정한다.

### 5. Separate Evidence, Experience, And Risk

민감 카테고리에서는 세 층을 분리한다.

- **Official/source fact:** 출처가 확인된 내용
- **Creator/user experience:** 제작자 또는 사용자의 경험적 조언
- **Risk/caution:** 중단 조건, 전문가 상담, 법적/의료/재무 한계

### 6. Optimize For Real Transfer

FLOW 안에서 모든 관리를 끝내려 하지 않는다. 사용자가 이미 쓰는 도구로 옮길 수 있어야 한다.

좋은 Flow는 다음 질문에 답한다.

- 이걸 어느 도구에 넣는가?
- 도구 안에서 제목은 무엇인가?
- 날짜/반복/마감은 무엇인가?
- 완료 기준은 무엇인가?
- 출처 링크는 어디에 붙는가?

### 7. Treat Validation As Evidence, Not Confidence

테스트 통과, 예쁜 화면, 많은 seed content는 검증이 아니다. “검증됨”은 실제 사용자 행동 데이터가 있을 때만 쓴다.

측정 우선순위:

1. open
2. anchor/date 입력
3. copy/export
4. check
5. repeat use
6. feedback/correction
