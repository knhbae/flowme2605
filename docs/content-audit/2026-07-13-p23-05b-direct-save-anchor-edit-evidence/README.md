# P23-05B Direct Save Anchor Edit Evidence

공개 Flow Map에서 직접 저장한 source-backed 일정의 기준일을 My Flow에서 다시 바꾸는 사용자 경로를 검증한다.

## 결과

- 390px과 1024px 모두 `이사일 바꾸기`가 보인다.
- 기준일 변경 후 상대 일정은 새 날짜로 재계산된다.
- 따로 바꾼 할 일 날짜와 개인 메모는 유지된다.
- Calendar와 ICS가 같은 개인 날짜를 읽는다.
- source version은 유지되고 personal copy나 구조 편집 control은 생기지 않는다.

이 패키지는 자동 E2E와 브라우저 캡처다. 정식 관찰 참여자는 0명이며 사용자 피드백을 문제 정의에 반영했다.
