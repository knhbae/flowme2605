# 공식 일정 review-hold 감사

## 발견

직전 카탈로그 정리에서 `baby-health-schedule`과 `curated-child-vaccination-schedule`은 일반 `/flows` 목록에서 빠졌다. 그러나 두 품질 결정은 `status: revise`, `directRouteEnabled: true`였고, 하나의 필드가 직접 링크 보존과 신규 실행 허용을 함께 맡고 있었다. 그 결과 다음 경로가 계속 열렸다.

1. 직접 `/flow-maps/*`에서 생년월일 입력 후 저장
2. 공식 출처 URL을 `/flows`에 넣었을 때 saveable `hit`
3. 현재 표의 최신 일치가 확인되지 않았는데도 일정 row와 export preview 노출

이는 카탈로그 발견성 문제보다 큰 최신성·안전 문제다. 의료 일정은 작성 시점이 최근이더라도 공식표 parity가 확인되지 않으면 신규 실행 가능 상태로 취급할 수 없다.

## 결정

### 1. 직접 열람과 신규 실행을 분리

`SourceBackedFlowMapQualityDecision`에 `publicExecutionEnabled`를 추가했다.

- 직접 route가 필요한 이전 링크/저장본: `directRouteEnabled: true`
- 신규 저장·export·URL hit를 중지할 콘텐츠: `publicExecutionEnabled: false`
- 정상 대표/후보: 필드를 생략하면 기존 실행 가능 동작 유지

### 2. 공식 일정 2종은 review-hold

| map | 직접 route | URL-first | 신규 저장/export | 기존 저장 기록 |
| --- | --- | --- | --- | --- |
| `baby-health-schedule` | noindex hold 화면 | blocked `needs_review` | 중지 | 유지 + 공식 확인 경고 |
| `curated-child-vaccination-schedule` | noindex hold 화면 | blocked `needs_review` | 중지 | 데이터 구조 유지 |

직접 화면은 제목과 사용자 이유를 보여주되, 검토 전 일정 row를 다시 표시하지 않는다. 1차 행동은 `최신 공식 일정 확인`, 2차 행동은 `다른 Flow 찾기`다.

### 3. 초안 우회 차단

기존 `needs_review`는 일반 후보 요청을 만들 수 있었다. 이번 두 route는 `saveMode: blocked`로 분리해 URL-first 결과에서 시작 패널과 후보/초안 요청 폼을 모두 숨겼다. 알려진 의료 출처가 일반 miss draft로 우회되지 않는다.

### 4. 기존 저장본은 보존하되 최신성 경고

로컬 저장 스키마와 체크 기록은 삭제하지 않는다. 대신 My Flow의 저장 map 품질 결정을 읽어 다음 경고를 항상 표시한다.

- `실행 전 최신 공식 내용을 확인해 주세요`
- 자동 변경 없음
- 공식 내용 확인 링크
- 숨기기/새 버전 적용 버튼 없음

사용자 기록을 지키면서도 저장 당시 일정을 최신 공식 일정으로 오해하지 않게 한다.

## 현재 화면 판정

- 모바일 390px 두 hold route: 저장 버튼 0, 일정 row 0, 공식 링크 1, overflow 0
- wide 1024px hold route: 같은 정책 유지, overflow 0
- `/flows` 공식 의료 URL: `needs_review`, `새 저장 중지`, 시작/초안 요청 0, visible `Markdown` 0
- My Flow 기존 저장 fixture: Flow row 2, 공식 일정 경고 1, 공식 확인 링크 1
- 정상 `moving-d30`: indexable, 저장 컨트롤 유지

## 후속 freshness 감사 큐

이번 판단은 “오래된 날짜”가 아니라 위험도와 현재 출처 일치 여부를 기준으로 했다. 아래 direct-only 콘텐츠는 삭제하지 않았으며 다음 순서로 별도 감사가 필요하다.

1. `year-end-tax-submit`: 세무 민감, 적용 연도와 공식 절차 버전 확인 필요
2. `postal-address-transfer`: 행정 절차 변경 가능성 및 현재 서비스 경로 확인 필요
3. `curated-funmom-learning-park`: 넓은 카테고리 페이지를 실행 콘텐츠처럼 저장하는 구조 재검토
4. `aircon-filter-cleaning`: 저위험이지만 낮은 제품 점수와 직접-route 목적 재검토

`park` 전체를 일괄 중지하지 않는다. 저위험 utility와 고위험 공식 절차를 같은 규칙으로 묶으면 정상 직접 경로까지 불필요하게 막을 수 있기 때문이다.

## 남은 리스크

- 기존 저장본의 일정 row는 사용자 기록으로 남는다. 이번 slice는 경고와 공식 원문 확인을 추가했으며, 기록 자체의 강제 migration/삭제는 하지 않았다.
- 공식표 parity가 다시 검증되기 전에는 두 map의 `publicExecutionEnabled`를 열면 안 된다.
- `year-end-tax-submit` 등 다음 freshness 큐는 이번 커밋에서 실행 정책을 바꾸지 않았다.
