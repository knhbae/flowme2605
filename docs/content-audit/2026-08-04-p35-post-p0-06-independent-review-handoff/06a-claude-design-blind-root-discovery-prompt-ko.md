# Claude Design 1차 블라인드 근본 문제 발견 프롬프트

이 단계는 패키지 작성·기획·이전 디자인 검토 맥락이 없는 새 Claude Design 세션에서 시작한다. 기존 기획의 가설·승인 방향·비교 앱 결론을 보지 않고, Owner 원문과 GitHub에서 열리는 현재/과거 화면만으로 문제 구조와 대안을 독립적으로 만든다. 같은 대화가 이미 결론을 봤다면 `blind_independence = COMPROMISED`다.

## Critical 입력

1. [Owner 피드백 원문 전용 파일](./00a-owner-feedback-verbatim-only-ko.md)
2. [1차 blind 전용 증거 index](./00b-blind-evidence-index-ko.md)
3. Historical Before 14장
4. local P0-06의 모바일 Public Plan·Public Item·Saved Plan·Saved Item 4장

Critical 입력이 열리지 않으면 `BLOCKED_BY_MISSING_CRITICAL_INPUT`으로 멈춘다.

## Auxiliary 입력

- local P0-06의 1024·1440 화면
- synthetic 50 Item layout stress
- live Production URL

Auxiliary 일부가 열리지 않으면 `PARTIAL_INPUT`과 누락 목록을 기록하고 가능한 범위에서 계속한다. live Production을 열지 못하면 그 칸은 `TBD + UNVERIFIED`다.

## 아직 읽지 않을 입력

- 이 패키지의 00 해석 경계, README, 01, 02, 03, 04, 05, 06, 07, 08, 두 JSON
- Q1/Q2/Q3 승인 방향
- Codex 결과, 이전 Claude 결과, 이전 종합 점수·권장안

이미 읽었다면 `blind_independence = COMPROMISED`, `review_type = CROSS_INFORMED`로 표시한다.

## 수행할 일

1. 원문 10개를 근본 UX/IA 문제 최대 7개로 독립 재구성한다.
2. 공개 상세→편집→저장 후→내 계획→외부 결과까지 현재 보이는 상태·행동 지도를 만든다.
3. 화면별로 사용자가 보는 데이터, 어느 버전을 바꾸는지, 얻는 결과, Back/취소 뒤 상태를 추론하고 불확실한 것은 확인 필요로 남긴다.
4. 사용자가 제안한 해결법 중 그대로 적용하면 더 나빠지는 것을 최소 3개 반증한다.
5. 대안 IA·wireflow를 최소 2안씩 비교하되 특정 답을 먼저 가정하지 않는다.
6. 제공된 자료에 없던 새 발견 후보를 최소 3개 제시한다.
7. 화면 자료가 없는 상태를 After나 구현 완료로 그리지 않는다. 새 화면은 모두 `PROPOSAL`이다.

## 1차 결과

`claude-blind-root-discovery-ko.md`와 필요한 최소 wireflow에 다음을 기록한다.

- 읽은 GitHub URL·commit·확인 시각, 열지 못한 입력
- blind independence
- 독립 근본 문제·반증 가설·증거 공백
- 사용자 제안 반증 최소 3개
- 새 발견 후보 최소 3개
- IA·wireflow 대안과 기각 이유
- provisional verdict와 확신도
- `observed_user_count: 0`, `user_understanding: NOT_ASSESSED`

결과를 확정한 시각과 반환 파일명을 기록한다. 가능하면 zip SHA-256도 제공하고, 불가능하면 기획 종합 전에 로컬에서 hash를 계산한다. 결과가 고정되기 전에는 2차 프롬프트를 읽지 않는다.
