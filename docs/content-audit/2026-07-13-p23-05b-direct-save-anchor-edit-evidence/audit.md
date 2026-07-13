# Audit

## 원인

직접 저장된 Flow Map은 anchor를 snapshot과 saved record에 가지고 있었지만, My Flow의 설정 진입 조건은 personal copy와 URL draft에만 열려 있었다. 기존 개인 사본 설정 폼을 그대로 넓히면 저장 이름과 항목 포함/제외까지 잘못 노출되므로 anchor-only 경로가 필요했다.

## 구현 판정

- direct saved map의 첫 child Flow에만 anchor entry를 노출한다.
- anchor-only helper는 저장된 source version을 보존한다.
- 날짜 기반 override key를 이전 원본 날짜에서 새 원본 날짜로 옮긴다.
- stable title/memo overlay와 execution state는 source 구조와 분리한다.
- map child Flow 전체의 saved record와 stored anchor를 같은 값으로 갱신한다.

## 시뮬레이션

1. moving-d30을 이사일 `2026-07-22`로 저장했다.
2. D-30 항목을 개인 날짜 `2026-07-07`로 바꾸고 메모를 남겼다.
3. My Flow에서 이사일을 `2026-08-05`로 바꿨다.
4. D-14 항목은 `2026-07-08`에서 `2026-07-22`로 이동했다.
5. D-30 항목은 새 원본 날짜 `2026-07-06` 대신 개인 날짜 `2026-07-07`을 유지했다.
6. ICS도 `2026-07-07`과 개인 메모를 읽었다.
7. 새로고침과 1024px 재진입 후 이사일 `2026-08-05`가 유지됐다.

## 남은 판단

- 기준일 변경 직후 이동한 항목 수를 알려 줄지는 실제 사용자 관찰 후 결정한다.
- source-backed 항목 add/delete/reorder는 source version merge와 tombstone 정책이 선행되어야 하므로 이번 범위에 포함하지 않았다.
