# P31 Mobile Journey Reconstruction Evidence

작성일: 2026-07-23

기준 SHA: `91ff789637ad9d46f8d646f1f21bd18baa3bfb15`

검증 대상: 기준 SHA 위의 P31 현재 작업 트리

실제 관찰 사용자: `0`

## 판정

P31-01~P31-05 구현은 완료되었다. 현재 브라우저 자동 검증에서는 P30에서 확인된 날짜 우선순위 오류, Home/Flow 찾기 역할 중복, 모바일 My Flow의 inline 과밀, Calendar inline 상세, 모바일 보관 복구 단절이 재현되지 않는다.

P31은 데이터 모델을 다시 만들지 않았다. 기존 source, personal overlay, execution run, recurrence occurrence, export identity를 유지하면서 화면 composition과 consumer precedence를 정리했다.

Local release gate와 canonical production smoke가 모두 green이다. 자동화, screenshot, heuristic simulation은 실제 사용자 검증이 아니다.

## 구현 결과

| Slice | 결과 |
| --- | --- |
| P31-01 | 실행 중 사용자가 바꾼 날짜가 draft/personal/source 날짜보다 우선하고, 명시적 날짜 제거가 다시 살아나지 않도록 My Flow, Calendar, ICS 입력을 통일했다. |
| P31-02 | Home은 활용 예시와 재방문 이어가기, Flow 찾기는 catalog/search 역할로 분리했다. 카드에는 원문 링크, 대표 결과, 대표 항목, `더보기`만 남기고 가짜 사용자 수와 리뷰 수는 넣지 않았다. |
| P31-02 | 결혼 준비는 한 결과 형태를 먼저 고르는 흐름으로, 운동은 compact 반복 요약과 필요할 때만 여는 설정으로 정리했다. |
| P31-03 | 모바일 My Flow를 compact library에서 dedicated workspace로 여는 구조로 바꾸고 `실행 / 전체 계획 / 기록`을 분리했다. 개인 저장 이름을 library와 workspace의 주 제목으로 사용한다. |
| P31-03 | Flow lifecycle 동사를 `보관 / 복구 / 이 기기에서 영구 삭제`로 통일하고 모바일과 wide에서 보관 후 복구 경로를 맞췄다. |
| P31-04 | Calendar 모바일 Item 상세를 inline 확장 대신 bottom sheet로 열고, 날짜 없는 항목 배치 tray와 실행 상세를 분리했다. |
| P31-05 | 영구 삭제는 보관된 Flow에서만 허용하고 삭제 범위를 확인 dialog에 명시했다. source-backed Flow의 공개 원본은 보존하고 개인 저장 관계와 관련 로컬 상태만 제거한다. |

## 24-Cell Simulation

8개 persona를 3회 세션으로 나눈 `24`개 cell을 같은 storage 연속성으로 평가했다.

- supported: `21`
- partial: `3`
- blocked: `0`
- 설명 없이 과업을 이어갈 수 있는 cell: `21 / 24`
- P30 비교 기준: `13 / 24`
- 전체 interaction depth: `115`
- 평균 interaction depth: `4.79`

남은 partial은 기능 실패가 아니라 실제 사용자 관찰이 필요한 발견성 가설이다.

1. 재방문 Home에서 활용 예시와 최근 실행 중 무엇을 먼저 기대하는가.
2. 저장 후 고급 `가져가기` 범위를 설명 없이 찾는가.
3. 50개 이상 Flow가 있는 Calendar scope 검색을 처음 보는 사용자가 바로 이해하는가.

상세 결과는 [journey-results.json](./journey-results.json)에 있다.

## Evidence

- [상세 감사](./audit.md)
- [route와 marker](./route-evidence.json)
- [keep/change/defer 결정](./decision-matrix.json)
- [screenshot manifest](./screenshot-manifest.json)
- [모바일·wide screenshots](./screenshots/)
- [canonical production smoke](./production-smoke/results.json)
- [production screenshots](./production-smoke/screenshots/)

Screenshot은 `390x844`와 `1024x768`에서 현재 production build를 로컬로 실행해 캡처했다. full-page screenshot에서는 fixed bottom navigation이나 fixed command가 문서 중간에 보일 수 있으므로, fixed-layer 겹침 판정은 viewport screenshot과 DOM bounding-box 검증을 우선한다.

## 보존한 계약

- source 원본은 개인 제목·날짜·메모·실행 상태로 덮어쓰지 않는다.
- completion/reopen은 execution run에 남는다.
- recurrence series와 occurrence execution은 분리한다.
- Calendar와 export는 동일한 effective Item identity를 사용한다.
- 4탭 IA, public `/f` shell, Studio 보조 표면을 유지한다.
- 실제 telemetry가 없는 사용자 수, 리뷰 수, 검증 수를 만들지 않는다.

## Publish 상태

최종 상태:

- `npm.cmd ci`: 통과
- unit: `586 / 586`
- P31 targeted Playwright: `5 / 5`
- full Playwright: `310 / 310`, workers `2`
- docs: `14` required files, `2943` local links
- production build: `18 / 18`
- security: critical `0`, high `0`, moderate `2`
- implementation commit: `06841a274151edef39da3838f39388f42dc7126f`
- [PR #150](https://github.com/knhbae/flowme2605/pull/150): merged
- merge commit: `0227cd2fa7a93ea9ff7d9776b76b0cc33401279b`
- GitHub CI run `30006649714`: 통과
- production: <https://flowme2605.vercel.app>
- canonical production smoke: `12 / 12`
- production horizontal overflow / console-page error: `0 / 0`
- production screenshots: `12`
- `git diff --check`: 통과

Next는 high advisory를 제거하기 위해 `15.5.20 -> 15.5.21`로 patch했다. 남은 moderate `2`는 Next가 포함한 PostCSS `<8.5.10` advisory와 그 parent package로, `npm audit fix --force`가 제안하는 Next `9.3.3` downgrade는 제품과 호환되지 않아 적용하지 않는다.

Production smoke는 current production interaction과 DOM marker를 검증한 자동 QA다. 실제 사용자의 이해, 신뢰, 반복 사용을 증명하지 않으며 observed-user count는 `0`이다.
