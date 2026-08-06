# Codex 1차 블라인드 근본 문제 발견 프롬프트

이 단계는 기존 기획 결론을 확인하는 검토가 아니다. 패키지 작성·기획·이전 UX 검토 맥락이 없는 새 Codex 세션에서 시작하고, Owner 원문과 현재 제품·로컬 코드 증거만 보고 독자적으로 문제 구조를 만든다. 같은 세션이 이미 기획 결론을 봤다면 `blind_independence = COMPROMISED`다.

## 읽어도 되는 입력

1. [Owner 피드백 원문 전용 파일](./00a-owner-feedback-verbatim-only-ko.md)
2. 실제 repository code, tests, runtime, storage, canonical fixtures
3. [1차 blind 전용 증거 index](./00b-blind-evidence-index-ko.md)
4. Historical Before 14장과 local P0-06 이미지 13장

## 아직 읽지 않을 입력

- 이 패키지의 00 해석 경계, README, 01, 02, 03, 04, 05, 07, 08, 두 JSON
- active program의 승인 결론·다음 단계·Q1/Q2/Q3 결정
- Claude Design 결과와 이전 종합 점수·권장안

이미 읽었다면 숨기지 말고 `blind_independence = COMPROMISED`로 표시한다.

## 수행할 일

1. 원문 10개를 증상이 아니라 근본 문제로 최대 7개까지 묶는다.
2. 각 근본 문제에 반증 가능한 가설, 실패 조건, 필요한 runtime·storage·화면 증거를 쓴다.
3. 사용자 해결 제안 중 그대로 적용할 때의 역효과를 최소 3개 찾는다.
4. content/slug 전용 UI인지 공통 data→projection 구조인지 대표 다섯 콘텐츠에서 추적한다.
5. 공개→편집→저장→실행→외부 결과의 상태·행동 소유권을 현재 코드 기준으로 그린다.
6. 입력 패키지에 없던 새 발견 후보를 최소 3개 제시한다.
7. 아직 구현되지 않은 것은 `NOT_IMPLEMENTED`, 증거가 없으면 `TBD`로 남긴다.

이 단계에서는 코드·문구·fixture·정본 문서를 수정하지 않고, 결과 파일과 새 읽기 전용 증거만 별도 결과 폴더에 만든다. commit·push·deploy도 하지 않는다.

## 1차 결과

`codex-blind-root-discovery-ko.md` 하나에 다음을 기록한다.

- branch, HEAD, upstream, dirty fingerprint, runtime base URL, 확인 시각
- 실제로 읽은 파일·URL과 보지 않은 파일
- 원문에서 독립적으로 도출한 근본 문제와 가설
- 사용자 해결 제안 반증
- 새 발견 후보 최소 3개
- 증거 공백
- provisional verdict와 확신도
- `observed_user_count: 0`, `user_understanding: NOT_ASSESSED`

파일을 닫은 뒤 SHA-256과 생성 시각을 별도 manifest에 기록한다. 그 hash가 고정되기 전에는 2차 프롬프트를 읽지 않는다.
