# Plan

## 작업 순서

1. 저장소 규칙, 기존 v1, Qualified v2, Vertical benchmark, iCalendar 설명서,
   현재 runtime export를 읽고 입력 lineage를 동결한다.
2. Qualified v2의 로직 이관 8개 Bundle을 동일한 canonical fixture로
   정규화하고 21 Flow / 49 Step / 160 Item / 210 SourceRow와 일정 분포를
   자동 계산한다.
3. 동일 fixture로 Current canonical, Literal ICS-first, Item-first shared
   context를 독립 생성하고 10개 평가 축을 다시 계산한다.
4. 160 Item의 Calendar/VTODO/Checklist/Todo/Sheet/Memo projection과 손실,
   provenance, round-trip invariant를 검증한다.
5. readiness·rights 축, 트리플/핏펫 boundary, Vertical 8개 기회 부록을
   분리한다.
6. JSON schema, 교차 파일 validator, 테스트를 작성하고 모든 대표 JSON을
   검증한다.
7. 첫 화면부터 실제 WEB1·이사·반찬/취업 영상 사례가 보이는 반응형 한국어
   HTML을 생성한다.
8. 기존 v1 보고서에는 baseline 안내만, iCalendar 설명서에는 단순화 예시
   안내와 상호 링크만 최소 추가한다.
9. docs 검사, diff 검사, 1440×900·390×844 브라우저 QA를 수행한다.
10. scoped closeout으로 변경 범위·검증·미실행 상태를 확인하고 결과를
    보고한다.

## 변경 경계

- 변경: 이번 v2 spec 폴더, 새 v2 HTML, 필요한 최소 baseline/cross-link 안내
- 변경 안 함: app runtime, DB, seed, production API, 기존 v1 실험 결과,
  기존 콘텐츠 발굴 원본
- 수행 안 함: commit, push, PR, merge, deploy

## 재현성

- 숫자는 source JSON과 생성된 fixture에서 계산한다.
- 생성기는 같은 입력에 같은 의미 결과를 만든다.
- 보고서는 JSON을 읽어 렌더링하며 핵심 수치를 별도 수기 입력하지 않는다.
- 외부 Calendar 왕복과 실제 사용자 검증은 `NOT_RUN`이다.
