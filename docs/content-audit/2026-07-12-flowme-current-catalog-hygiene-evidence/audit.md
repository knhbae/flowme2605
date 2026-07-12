# 현행 공개 카탈로그 감사

## 발견

현재 `/flows`에는 11개 Flow Map 카드가 있었다. `moving-d30`과 `curated-ajd-moving-d30`는 같은 AJD 글의 실행 형태를 비교하기 위해 남긴 두 버전이지만 일반 사용자는 둘의 차이를 판단하기 어렵다. `baby-health-schedule`과 `curated-child-vaccination-schedule`은 내부 품질판정이 `revise`인데도 정상 탐색에 노출됐다. 나머지 source-backed 카드 대부분은 카테고리 대신 `콘텐츠`를 표시했다.

## 결정

1. 공개 탐색 readiness와 direct route/URL lookup eligibility를 분리한다.
2. 일반 카탈로그에는 `representative`와 `candidate`만 보인다.
3. `revise`, `park`, `reject`는 재검토 또는 직접 진입 정책에 남기고 정상 탐색에서 제외한다.
4. 별도 비교가 필요한 중복 후보는 `publicCatalogEligible: false`로 숨긴다.
5. 숨긴 콘텐츠를 삭제하거나 저장 기록에서 제거하지 않는다.
6. 모든 공개 카드에 사용자가 구분할 수 있는 카테고리를 둔다.

## 숨긴 항목

| map | 이유 | 유지되는 경로 |
| --- | --- | --- |
| `baby-health-schedule` | 품질 상태 `revise`; 공식 일정 행과 실행 깊이 재검토 필요 | direct route, exact URL lookup, 기존 저장 |
| `curated-child-vaccination-schedule` | 품질 상태 `revise`; 의료 민감 카피와 공식표 parity 재검토 필요 | direct route, exact URL lookup, 기존 저장 |
| `curated-ajd-moving-d30` | 현재 대표 `moving-d30`과 같은 AJD 이사 준비 job의 비교용 중복 | direct route, exact URL lookup, 기존 저장 |

## 사용자 표면 결과

- 일반 목록은 8개 고유 콘텐츠로 줄었다.
- 카드 분류는 `생활 일정`, `교육 진도`, `어학 학습`, `독서 루틴`, `구매 준비`, `결혼 준비`, `운동 루틴`, `이유식 식단`으로 보인다.
- 검색 입력, 상황 필터, URL/memo intake, 첫 카드 above-fold 위치는 유지된다.
- 모바일과 wide 모두 가로 overflow가 없다.

## 남은 리스크

- direct URL로 들어온 `revise` 콘텐츠는 현재 품질판정상 계속 접근 가능하다. 이번 slice는 발견 경로 정리이며 route 폐기나 저장 migration은 아니다.
- AJD의 두 URL은 문서 ID가 같아 보이지만 URL alias를 일반화하지 않았다. 도메인별 canonical alias는 별도 검증 없이 적용하면 다른 글을 합칠 수 있다.
- 카테고리는 현재 map metadata에 명시했다. 새 public map은 같은 필드를 채우지 않으면 fallback `실행 콘텐츠`가 보이므로 unit test와 등록 gate에서 계속 확인해야 한다.
