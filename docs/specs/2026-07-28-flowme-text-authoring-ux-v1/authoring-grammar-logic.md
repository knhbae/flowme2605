# FlowMe Text Authoring 현재 문법·처리 로직

- 상태: `CURRENT LOCAL CONTRACT`
- 기준일: 2026-08-11 KST
- 보이는 쓰기 문법 버전: `flowme-authoring-markdown-v2`
- 현재 동작 기준: Text Authoring v5 통합 구현
- 적용 범위: `/flows/new`, standalone 검토 HTML, Text Authoring parser·projection·export
- 비범위: AI 문장 생성, P35 runtime 통합, 외부 Calendar/Todo/Excel 쓰기, 관찰 사용자 검증

이 문서는 **사람이 읽는 현재 문법 정본**이다. 공식 표식, 파서의 해석 순서,
날짜·반복 계산, 오류 처리, Calendar·Todo·Sheet·TXT 투영을 한곳에서 설명한다.
기계가 읽는 기본 계약은 [text-authoring-contract-v2.json](./text-authoring-contract-v2.json)이고,
코드와 회귀 테스트가 실행 가능한 근거다.

과거 문서와 충돌하면 다음 순서를 적용한다.

1. 2026-08-11·2026-08-10의 최신 [결정 기록](../../DECISIONS.md)
2. 이 문서와 동기화된 `text-authoring-contract-v2.json`
3. 현재 parser·recurrence·projection·export 코드와 통과한 테스트
4. 과거의 [문법 후보 비교](./authoring-grammar-comparison.md)와 v1/v2 설계 기록

`v5`는 제품 동작 개정 이름이고, 공식 작성 표식의 버전 문자열은 아직 `v2`다.

## 1. 가장 짧은 규칙

1. 첫 `#`은 Flow 제목이다.
2. `##`는 Step 시작이다.
3. root `- [ ]` 또는 `- [x]`만 독립 Item이다.
4. Item 바로 아래 두 칸 들여쓴 `  - 속성: 값`은 그 Item의 정보다.
5. Item 바로 아래 두 칸 들여쓴 `  - [ ]`은 Todo의 한 단계 하위 체크다.
6. Item 표식이 없는 일반 문장은 Item으로 추측하지 않고 TXT의 `원문 메모`로 보존한다.
7. 날짜는 존재하는 `YYYY-MM-DD`만 계산한다. 연도나 기준일을 추정하지 않는다.
8. 반복은 시작 날짜와 지원 규칙이 모두 있을 때만 회차를 만든다.
9. 원문에 없는 날짜·완료 기준·자료·출처는 만들지 않는다.
10. 읽기는 호환 입력을 넓게 받지만, 다시 쓰기는 아래 공식 문법 하나로 통일한다.

## 2. 전체 처리 흐름

```text
작업 원문
  -> 줄 단위 SourceRow와 원문 위치 보존
  -> Flow / Step / Item / 속성 / 하위 체크 해석
  -> 날짜·URL·반복 검증
  -> canonical Item 1개 유지
  -> 필요할 때 occurrence 계산
  -> 캘린더 / 할 일 / 표·Excel / TXT 투영
  -> 화면·복사·다운로드·내보내기
```

어떤 줄도 조용히 버리지 않는다. 구조로 안전하게 해석할 수 없으면 원문 메모나
source-linked issue로 남긴다.

## 3. 공식 복붙 템플릿

```markdown
# 주간 학습 계획
- 기준일: 2026-08-10

## 준비
- [ ] 학습 자료를 확인합니다.
  - 설명: 강의 전에 필요한 자료를 확인합니다.
  - 완료 기준: 필요한 파일을 모두 내려받습니다.
  - 날짜: 2026-08-10
  - 시간: 09:00
  - 시간대: Asia/Seoul
  - 소요 시간: 30분
  - 반복: 매주 월요일
  - 반복 종료: 3회
  - 장소: 집
  - 실행 조건: 강의가 열려 있을 때 확인합니다.
  - 자료: [강의 자료](https://example.com/material)
  - 안내: 첫 회차 전에 로그인합니다.
  - 주의: 자료의 이용 조건을 확인합니다.
  - 출처: [공식 강의](https://example.com/course)
  - [ ] PDF를 내려받습니다.
  - [x] 계정을 확인했습니다.

- [ ] 보고서를 제출합니다.
  - 상대 날짜: D-1
```

첫 Item의 `날짜`가 반복의 1회차다. 두 번째 Item의 `D-1`은 Flow 기준일
`2026-08-10`을 기준으로 `2026-08-09`가 된다.

## 4. 표식과 포함 관계

| 원문 | 현재 해석 | Item 수 |
| --- | --- | ---: |
| `# 제목` | 첫 H1은 Flow 제목 | 0 |
| `- 기준일: 2026-08-10` | Flow 전체의 상대 날짜 기준일 | 0 |
| `## 준비` | Step 시작 | 0 |
| `- [ ] 예약하기` | 독립 Item | 1 |
| `- [x] 예약하기` | source에서 체크된 독립 Item | 1 |
| `  - 설명: ...` | 바로 위 Item의 공식 속성 | 0 |
| `  - 담당자: 홍길동` | 정의되지 않은 속성을 label과 함께 설명으로 보존 | 0 |
| `  - [ ] 시간 확인` | 바로 위 Item의 한 단계 하위 체크 | 0 |
| `    - [ ] 더 깊은 체크` | 지원하지 않는 중첩으로 검토 필요 | 0 |
| `설명 문장입니다.` | 구조를 추측하지 않는 TXT 원문 메모 | 0 |

`- [x]`는 **붙여 넣은 source의 체크 표시**다. 현재 사용자의 실행 완료 상태를
자동으로 만들지 않는다. 하위 체크를 모두 체크해도 부모 Item을 자동 완료하지 않는다.

## 5. 공식 속성 사전

모든 Item 속성은 바로 위 Item 아래에 공백 두 칸과 `-`를 붙여 쓴다.

| 공식 속성 | 공식 값 형식 | 처리 |
| --- | --- | --- |
| `설명` | 자유 텍스트 | Item 상세 |
| `완료 기준` | 자유 텍스트 | 무엇을 완료로 볼지 설명하며 실행 완료 상태와는 별개 |
| `날짜` | `YYYY-MM-DD` | 유효하면 Calendar 날짜와 반복 시작일 |
| `상대 날짜` | `D-3`, `D-Day`, `D+2` | Flow 기준일이 있을 때 실제 날짜 계산 |
| `시간` | 24시간제 `HH:mm` | 유효한 시각만 일정 값으로 사용 |
| `시간대` | 예: `Asia/Seoul` | 현재는 문자열을 보존하며 IANA 표기를 권장 |
| `소요 시간` | 정수 + `분` 또는 `시간` | 분 단위로 정규화 |
| `반복` | 아래 지원 규칙 | occurrence 계산 |
| `반복 종료` | `N회` 또는 `YYYY-MM-DD` | 횟수에는 1회차가 포함되고 종료 날짜는 포함 |
| `장소` | 자유 텍스트 | 일정·상세 장소 |
| `실행 조건` | 자유 텍스트 | 표시용 메모이며 자동 판정하지 않음 |
| `자료` | `[이름](https://...)` | 실행에 쓰는 resource 링크 |
| `안내` | 자유 텍스트 | guide로 분리 |
| `주의` | 자유 텍스트 | caution으로 분리 |
| `출처` | `[이름](https://...)` | 근거 source 링크 |

`조건:`은 읽기 호환 별칭이고, 공식 writer는 `실행 조건:`을 쓴다.
`반복 종료:`는 `반복:`과 별도 줄이다.

### 정의되지 않은 속성

다음처럼 정확히 한 단계 들여쓴 `- 이름: 값`은 오류가 아니다.

```markdown
- [ ] 1장 듣기
  - 재생시간: 00:14:35
  - 난이도: 초급
```

`재생시간: 00:14:35`, `난이도: 초급`이라는 원문을 label까지 설명에 보존한다.
이를 날짜·링크·완료 기준 같은 구조 필드로 임의 승격하지 않는다. 부모 Item이 없거나
들여쓰기 위치가 맞지 않으면 `unknown_property` 또는 `missing_parent` 검토 대상이다.

## 6. 날짜와 D-Day

### 절대 날짜

- 공식 형식은 실제로 존재하는 `YYYY-MM-DD`다.
- `2026-02-30`, `8월 3일`, `08-03`은 날짜로 추정하지 않는다.
- 잘못된 날짜는 원문과 Item에 남고 Calendar 일정은 만들지 않는다.
- 날짜 속성이 아예 없으면 오류를 표시하지 않고 Calendar에서만 제외한다.

### 상대 날짜

```markdown
# 행사 준비
- 기준일: 2026-08-10

## 준비
- [ ] 사전 안내를 보냅니다.
  - 상대 날짜: D-3
```

- 지원 값은 `D-N`, `D-Day`, `D+N`이다.
- 기준일은 Flow 범위의 `- 기준일: YYYY-MM-DD` 한 줄이다.
- 기준일이 없으면 Todo와 TXT에는 남지만 Calendar 날짜는 계산하지 않는다.
- 화면에서 기준일을 바꾸면 숨은 값만 바꾸지 않고 원문의 기준일 줄도 갱신한다.
- Item 하나에 절대 날짜와 상대 날짜를 동시에 쓰는 공식 문법은 사용하지 않는다.

## 7. 반복과 루틴

루틴은 별도 결과 형식이 아니라 Item의 반복 속성이다.

| 원문 | 의미 |
| --- | --- |
| `매일` | 매일 |
| `3일마다` | 3일 간격 |
| `매주 월요일` | 매주 월요일 |
| `매주 월, 수, 금` | 매주 지정 요일 |
| `2주마다 화, 목` | 2주 간격의 지정 요일 |
| `매월 15일` | 매월 15일 |
| `2개월마다 15일` | 2개월 간격의 15일 |

대표적인 `매일 + 종료일` 입력은 다음과 같다.

```markdown
# 5일 아침 스트레칭
## 실행
- [ ] 스트레칭 영상 따라하기
  - 날짜: 2026-08-11
  - 시간: 07:30
  - 반복: 매일
  - 반복 종료: 2026-08-15
  - 자료: [스트레칭 영상](https://example.com/stretch)
  - 완료 기준: 영상을 끝까지 한 번 따라했습니다.
```

이 입력은 원본 canonical Item 하나를 유지하면서 2026-08-11부터 2026-08-15까지
종료일을 포함한 5개 회차를 만든다. Calendar·Todo·Sheet·TXT는 같은 5개 회차를
사용하고, ICS는 `RRULE` 없이 회차별 `VEVENT` 5개를 만든다.

반복 계산 규칙은 다음과 같다.

1. `날짜` 또는 기준일로 해결된 `상대 날짜`가 반드시 있어야 한다.
2. 시작 날짜가 항상 1회차다. 이후 회차부터 요일·월일 규칙을 적용한다.
3. `반복 종료: 3회`는 시작 회차를 포함해 총 3회다.
4. `반복 종료: 2026-10-26`은 해당 날짜까지 포함한다.
5. 종료가 있는 유한 반복은 30회씩 이어 본다.
6. 종료가 없는 반복은 4주 단위로 이어 본다.
7. canonical Item은 한 개이고, 회차는 stable occurrence ID를 가진 파생 결과다.
8. Calendar·Todo·Sheet·TXT는 같은 회차 날짜와 ID 집합을 사용한다.
9. `실행 조건`은 표시만 하며 회차를 자동으로 건너뛰거나 완료하지 않는다.
10. ICS는 현재 `RRULE` 한 개가 아니라 보이는 범위의 회차별 `VEVENT`를 만든다.

현재 지원하지 않는 예는 `매년`, `매월 둘째 월요일`, 공휴일 제외, 예외일,
여러 종료 규칙, 조건식 자동 실행이다. 이 경우 원문을 보존하고 반복 오류를 표시하며
회차를 발명하지 않는다.

## 8. URL 규칙

- 공식 링크는 `[이름](https://example.com)`이다.
- `http://`와 `https://`만 구조 링크로 읽는다.
- `자료`와 `출처`는 서로 다른 의미로 유지한다.
- 문서 source URL을 모든 Item의 출처로 자동 복제하지 않는다.
- 잘못된 자료·출처 URL이 포함되면 TXT는 복구용 원문을 보여 주되,
  Calendar·Todo·Sheet 구조 결과와 내보내기는 수정 전까지 비활성화한다.

## 9. 파서의 해석 순서

한 줄이 여러 규칙처럼 보일 때 현재 parser는 대체로 아래 순서를 사용한다.

1. 내부 metadata와 빈 줄
2. code fence, blockquote, HTML 등 지원하지 않는 구문
3. Markdown heading
4. Markdown table, TSV, CSV
5. Flow 기준일
6. 들여쓴 하위 checkbox
7. 들여쓴 공식 속성
8. 들여쓴 정의되지 않은 속성
9. root checkbox Item
10. 일반 bullet·번호 목록 호환 Item
11. 대시 없는 legacy 속성 호환 입력
12. 단독 URL
13. 표식 없는 일반 문장

표식 없는 문장은 직접 작성 모드에서 Item으로 만들지 않는다. 내부 source lineage를
위해 `ambiguous_plain_sentence` 기록이 남을 수 있지만, 자동 TXT 원문 메모로 안전하게
처리된 경우 사용자 조치가 필요한 outstanding 검토 수에는 넣지 않는다. 사용자가
명시적으로 보류한 경우에만 다시 outstanding 상태가 된다.

## 10. 네 결과의 투영 규칙

화면의 고정 순서는 `캘린더 -> 할 일 -> 표·Excel -> TXT`다.

| 결과 | 활성·표시 규칙 | 기본 순서 |
| --- | --- | --- |
| 캘린더 | 유효하게 해결된 날짜가 있는 Item·occurrence만 월간 달력에 표시 | 날짜 오름차순 → 같은 날짜의 종일 일정 먼저 → `HH:mm` 오름차순 → 같은 시각은 원문 순서 |
| 할 일 | 포함된 root Item과 한 단계 하위 체크를 표시하며 지원 반복은 회차별로 표시 | 원문 Item 순서, 반복 회차 순서 |
| 표·Excel | 원본 표이거나 아래의 구조 열 조건을 만족할 때 표시하며 반복은 회차별 행 | 원문·회차 순서 |
| TXT | 해석된 Item을 들여쓴 복사용 문서로 만들고, 구조화하지 않은 문장은 `[원문 메모]`로 보존 | 원문·회차 순서 |

구조 Item에서 표·Excel은 다음 중 하나일 때 활성화한다.

- 원본 입력이 Markdown table, TSV, CSV다.
- Item이 2개 이상이고 의미 있는 공통 필드가 2개 이상이다.
- Item이 2개 이상이고 공통 필드 1개 이상과 모든 행의 날짜 또는 설명이 있다.
- 반복 Item 하나가 여러 회차로 확장되고 공통 구조 필드가 2개 이상이다.

최종 화면의 Sheet 활성 여부는 canonical Item 수가 아니라 occurrence 확장 뒤의
projection 계약이 판단한다.

## 11. 원문 순서와 수정

- Calendar는 보기 단계에서 자동으로 날짜순 정렬한다.
- Todo·Sheet·TXT의 기본은 source 순서다.
- 저장이나 우측 수정만으로 원문 순서를 몰래 바꾸지 않는다.
- `날짜순을 원문에도 적용`을 명시적으로 실행하면 같은 Step 안에서 Item과 그 속성,
  하위 체크 블록을 함께 이동한다.
- 이 작업은 한 revision이며 되돌릴 수 있고 Item identity와 source lineage를 유지한다.
- Step을 가로질러 자동 정렬하지 않는다.

좌측 textarea 수정은 현재 작업 원문으로 다시 파싱한다. 우측 Inspector 수정은
source block이 하나로 확정되는 Item만 원문과 네 결과에 한 revision으로 함께 반영한다.
원본 표의 셀, 중복 속성, 공유 일정, 깨진 source range처럼 안전한 일대일 수정이
불가능하면 부분 수정하지 않고 원문에서 고치도록 안내한다.

## 12. 호환 입력과 canonical 출력

parser는 기존 내용을 잃지 않기 위해 다음을 읽을 수 있다.

- root `- 일반 항목`, `* 항목`, `+ 항목`
- `1. 항목`, `2) 항목`
- 대시 없는 들여쓴 `설명: ...`
- `상세`, `자세히`, `방법`, `완료`, `상대일`, `예상 시간`, `링크`, `영상`,
  `가이드`, `경고`, `조건` 등의 legacy 별칭
- Markdown table, TSV, CSV
- Item 제목 안의 명시적 ISO 날짜나 D-Day 표기

하지만 canonical writer는 `#`, `##`, root `- [ ]`, 두 칸 들여쓴 공식 한국어
속성 bullet만 쓴다. 호환 입력의 원문 bytes를 파괴적으로 고치는 것이 아니라,
내보낸 canonical Markdown의 의미가 같은지 round-trip으로 검증한다.

화면용 TXT/Markdown 요약과 **재입력용 canonical Markdown**은 목적이 다르다.
화면용 요약에 합쳐진 `반복: 매주 월요일 · 3회`를 공식 재입력 문법으로 보지 않는다.
재입력용 writer는 `반복`과 `반복 종료`를 각각 별도 줄로 쓴다.

## 13. 처리됨과 검토 필요

예시 catalog의 `exception_handling`·`review_needed` 그룹과 결과 label은 예시를
찾고 기대 결과를 설명하기 위한 **catalog review status**다. 이 분류가 runtime의
outstanding 검토 수를 정하지 않는다. 같은 `exception_handling` 그룹 안에서도
정의되지 않은 Item 속성이나 자동 TXT 원문 메모처럼 처리가 끝난 예시는
outstanding이 0일 수 있고, 잘못된 날짜나 URL-only처럼 원문 수정이 필요한 예시는
outstanding이 1 이상일 수 있다.

runtime outstanding은 각 source-linked issue의 현재 상태로만 계산한다. `open`과
`held`는 outstanding에 포함하고 `resolved`는 제외한다. 단, 별도 decision 없이
표식 없는 문장을 비차단 TXT 원문 메모로 자동 보존한 `ambiguous_plain_sentence`는
outstanding에서 제외한다. 구조 결과를 막는지도 catalog group이 아니라 해당 issue가
blocking이면서 outstanding인지로 판단한다.

| 입력 상태 | 사용자 상태 | 결과 |
| --- | --- | --- |
| 표식 없는 일반 문장 | 예외 처리됨 | Item을 만들지 않고 TXT 원문 메모로 1회 보존 |
| Item 아래 정의되지 않은 속성 | 예외 처리됨 | label과 값을 설명으로 보존 |
| 날짜 속성이 없음 | 정상 | Calendar만 비활성, 다른 결과 유지 |
| 잘못된 절대·상대 날짜 | 검토 필요 | 원문 보존, Calendar 날짜 미생성 |
| 기준일 없는 상대 날짜 | 기준일 입력 필요 | 원문 보존, 실제 날짜 미추정 |
| 잘못된 URL | 검토 필요 | TXT 복구 경로 유지, 구조 결과 비활성 |
| 지원하지 않는 반복·종료 | 검토 필요 | 원문 보존, occurrence 미생성 |
| 부모 없는 속성·하위 체크 | 검토 필요 | 자동 귀속하지 않음 |
| 두 단계 이상 하위 체크 | 검토 필요 | 자동 평탄화하지 않음 |
| blockquote·code fence 등 | 검토 필요 | source-linked issue로 보존 |

## 14. 구현 소유권

| 책임 | 코드·테스트 |
| --- | --- |
| 공식 버전·label·날짜·Markdown 링크 | [authoring-grammar.ts](../../../lib/flow/text-authoring/authoring-grammar.ts) |
| line 해석·alias·source mapping·validation issue | [parser.ts](../../../lib/flow/text-authoring/parser.ts) |
| canonical 문서·Item·subcheck·recurrence type | [types.ts](../../../lib/flow/text-authoring/types.ts) |
| 반복 파싱·날짜·occurrence identity | [recurrence.ts](../../../lib/flow/text-authoring/recurrence.ts) |
| 네 결과 활성·행·정렬·반복 parity | [artifact-projection.ts](../../../lib/flow/text-authoring/artifact-projection.ts) |
| TXT·CSV/TSV/XLSX·ICS 직렬화 | [file-export.ts](../../../lib/flow/text-authoring/file-export.ts) |
| canonical Markdown round-trip | [markdown-roundtrip.ts](../../../lib/flow/text-authoring/markdown-roundtrip.ts) |
| 원문 정렬·좌우 source sync·undo | [operations.ts](../../../lib/flow/text-authoring/operations.ts) |
| 사용자 예시 catalog | [validated-examples.generated.json](../../../components/flow/text-authoring/validated-examples.generated.json) |

현재 검토 데모는 [standalone HTML](../../content-audit/2026-08-04-flowme-text-authoring-grammar-ux-improvement-results/flowme-text-authoring-v2-test.html),
최신 구현 근거는 [v5 결과](../../content-audit/2026-08-11-flowme-text-authoring-exception-coverage-v5-results/README.md)에서 확인한다.

## 15. 문법을 바꿀 때 같이 바꿀 것

문법 변경은 도움말 문구만 고치는 작업이 아니다. 다음을 한 변경 단위로 맞춘다.

1. 이 문서와 `text-authoring-contract-v2.json`
2. 공식 label과 alias
3. parser와 canonical type
4. source sync·canonical writer·round-trip
5. Calendar·Todo·Sheet·TXT projection과 export
6. 기본 예시와 전체 검증 사례
7. parser·recurrence·projection·export unit test
8. route·standalone E2E와 모바일 scroll/browser QA
9. `DECISIONS`, active spec, 결과 기록

문법 버전을 올릴 조건은 공식 writer 표식이 바뀌거나 기존 canonical 입력의 의미가
호환되지 않게 바뀔 때다. projection 범위나 화면 표현만 바뀌면 동작 revision을
기록하되 `flowme-authoring-markdown-v2`를 임의로 올리지 않는다.

## 16. 남은 명시적 경계

- 시간·시간대·소요 시간은 날짜·URL만큼 엄격한 오류 계약이 아직 없다. 형식이 맞지
  않으면 일정 값으로 적용되지 않을 수 있으므로 공식 형식을 사용한다.
- 시작 날짜와 반복 요일·월일이 달라도 시작 날짜를 1회차로 포함한다. 이 정책을
  바꾸려면 occurrence identity와 네 결과 회귀를 함께 다시 승인해야 한다.
- Text Authoring 로컬 결과는 반복·하위 체크를 지원하지만 현재 P35 adapter v1은 이를
  손실 없이 받지 못하므로 `HOLD_NOT_READY`다.
- 자동·브라우저 QA는 내부 검증이며 관찰 사용자 검증이나 배포 근거가 아니다.
