# QA

## Evidence boundary

- 이 문서의 prototype interaction은 deterministic fixture simulation이다.
- 자동화, screenshot, agent review는 실제 사용자 검증이 아니다.
- 관찰 사용자 수는 0이다.

## Required verification

### Documents

- 모든 필수 Markdown 파일 존재
- 네 JSON 계약 parse
- handoff 링크와 spec 링크 유효
- `npm.cmd run docs:check`
- `git diff --check`

### Browser sizes

- 390x844
- 1024x768
- 1440x900

각 viewport에서 확인:

- `document.documentElement.scrollWidth <= innerWidth`
- fixed UI가 composer, CTA, inspector를 가리지 않음
- 가장 긴 제목과 URL이 컨테이너를 넘지 않음
- active state가 색상만으로 전달되지 않음

### Keyboard

1. case selector 이동
2. composer 입력
3. `구조 확인`
4. outline row 선택
5. contextual edit 열기
6. title 또는 role 수정
7. `변경 적용`
8. artifact 선택
9. save/export preflight
10. receipt 확인

필수:

- focus indicator
- 명시적 accessible name
- dialog/sheet focus 이동과 복귀
- Escape 취소
- status 변화 `aria-live`

## Eight-case assertions

### 이사 D-30

- fixture/version/count를 표시한다.
- AJD runtime 24, AJD corpus 27, EasyLaw Input Composer 24를 자동 병합하지 않는다.
- 기준일 전에도 상대 날짜 구조를 볼 수 있다.
- 기준일을 넣으면 Calendar 날짜가 계산된다.

### 차량 점검

- source의 D-14, D-10, D-3, D-Day offset을 보존한다.
- 기준일 없는 개인 Todo projection은 undated로 저장할 수 있다.
- 검사일을 넣으면 상대일을 Calendar 날짜로 계산한다.
- date 제거 후 source offset을 잃지 않고 undated personal projection으로 복귀한다.

### Allblanc

- resource URL은 Item이 아니다.
- 7일 sequence의 Day 1~7 순서를 보존한다.
- 7일 sequence와 1-item weekly routine variant를 합치지 않는다.
- weekly variant에서 series와 occurrence를 합치지 않는다.

### K-MOOC

- 14행 모두 존재한다.
- 현재 주차는 user-owned 값이다.
- 날짜를 임의 생성하지 않는다.

### LibriVox

- 38장 모두 존재한다.
- 현재 장과 재생 위치를 표현한다.
- 반복 routine으로 바꾸지 않는다.

### 신차 구매

- decision/check/record 역할을 구분한다.
- 비교 field는 Sheet에서 유지된다.
- context 문장을 완료 Item으로 만들지 않는다.

### 해외여행 안전정보

- guide, caution, action을 구분한다.
- 공식 source가 보인다.
- safety 판단을 새로 만들지 않는다.

### 제주 여행 메모

- 5 Item split과 원문 fragment를 연결한다.
- merge/split/reorder/rename/include-exclude가 가능하다.
- live AI라고 표시하지 않는다.

## State assertions

모든 blocked/error state는 다음을 갖는다.

- 감지한 내용
- 감지하지 못한 내용
- 현재 보존된 결과
- 다음 행동 하나
- 돌아가기 또는 원문 편집

필수 상태:

- `partial_parse`
- `unsupported_syntax`
- `source_import_required`
- `rights_review_required`
- `safety_review_required`
- `conflict_source_vs_user`
- `retryable_error`
- `provider_error`
- `recovered_unsaved_draft`

## Visual comparison

최종 screenshot마다 다음 fidelity ledger를 기록한다.

| 비교점 | 기대 |
|---|---|
| screen count | Input, Structure, Result 역할이 분리됨 |
| first viewport | composer와 useful preview summary가 보임 |
| primary action | 1개 이하 |
| source ownership | source와 user 값이 서로 다른 표식 |
| long content | search/progress/collapse 없이 전체를 숨기지 않음 |

## Completion audit

마지막에 목표 문서의 각 완료 기준을 `pass / partial / fail / inaccessible`로 분류하고
증거 파일과 browser marker를 연결한다. 하나라도 필수 `partial/fail`이면 완료로
표현하지 않는다.
