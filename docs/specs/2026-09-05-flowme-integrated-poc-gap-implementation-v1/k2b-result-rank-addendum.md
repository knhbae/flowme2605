# K2-B — 날짜 순서와 개인 결과 Calendar의 연결

2026-09-05. standalone 개인 Calendar에만 연결하는 읽기 adapter다. 기간 목록의 날짜 순서를 전달하되 Plan, 원문, TXT·Sheet, 완료·회차 저장 계약을 변경하지 않는다.

## 연결 범위

`timeline-result-rank.js`의 `createResolver(checkpoint)`는 검증한 checkpoint를 복사해 보관한다. 실제 날짜 또는 날짜 미정 그룹에서 해당 task의 순위만 읽는다. localStorage를 읽거나 쓰지 않는다. 호출 후 원래 checkpoint가 바뀌어도 기존 reader의 결과는 바뀌지 않는다.

`model.js`의 개인 결과 projection은 명시적으로 전달받은 `timelineRankResolver`만 사용한다. hook이 없는 기존 호출과 Authoring 미리보기는 이전 계약을 그대로 따른다. 미리보기는 개인 순위 hook을 호출하지 않는다. 개인 Calendar에서 같은 날짜의 일반 Item은 전체 개인공간 날짜 순서 중 해당 Flow의 순서를 따른다. 다른 사본은 제목 대신 기존 tuple identity로 구분한다.

## 보수적으로 남긴 회차 제한

회차별 순서를 새로 저장하는 정책은 이 단계에 없다. `occurrenceId`가 있는 행은 task 순위를 대신 받지 않는다. 한 Flow 결과의 같은 날짜에 보이는 회차 또는 순위를 확인하지 못한 행이 하나라도 있으면, **그 날짜의 보이는 행 전체**를 기존 Plan 순서로 표시한다. 날짜 미정도 같은 규칙이다. 다른 날짜와 숨긴 행에는 이 fallback을 확대하지 않는다.

이 방식은 전역 날짜 순위와 Flow 내부 Plan 순위를 한 숫자 축에 섞어, 무관한 QuickItem 추가만으로 해당 Flow의 순서가 뒤집히는 것을 막는다. `timelineOrderFallbacks`에 날짜와 이유를 기록하고 개인 Calendar에서 제한을 안내한다. 회차 포함 날짜까지 기간 목록과 Calendar 정렬이 완전히 같아졌다는 판정은 하지 않는다. 회차 순서 정책은 K4에서 별도 근거와 소유·호환 계약을 확인할 항목이다.

구 view별 순서가 서로 충돌한 그룹은 보존한 원본을 수정하지 않고 시간순으로 표시하며 직접 정렬은 잠근다. 이는 회차 fallback과 별개의 상태다. 사용자가 이후 다른 날짜를 옮기거나 완료해도 충돌한 순서를 자동 정리하지 않는다.

## 실행한 검증

순수 rank 검사 최종 23/23 PASS. 최초 8개 구현 검사, 독립 리뷰에서 드러난 혼합 순위 문제 2개, 회차 이동·날짜 미정·동일 날짜 충돌·숨김·부분 실패·동일 제목 사본·완료·reload·미리보기 보존 13개를 포함한다. 앞선 실패와 재실행은 최종 23개에 중복 합산하지 않는다.

검사 파일: [timeline-result-rank.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/timeline-result-rank.test.cjs). T35·C40·P34·rank23 합동 실행은 132/132 PASS다. 이는 순수 모델 실행이며 브라우저 UI, 실제 기기, 관찰 사용자 증거가 아니다. 사용자용 생성 HTML과 현재 asset 코드는 별도 시점으로 관리한다.
