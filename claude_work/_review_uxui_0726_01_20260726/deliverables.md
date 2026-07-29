# Claude Design 필수 산출물 요청서

이 검토는 평가에서 끝나면 안 됩니다. 다음 개발 루프에 바로 넣을 수 있는 산출물을 받아야 합니다.

## 1. UX 진단

필수 포함:

- 현재 FlowMe가 설명형 화면처럼 보이는 지점
- 실행형 앱처럼 보이는 지점
- 사용자가 5초 안에 이해하지 못할 가능성이 높은 화면
- 저장 후 다음 행동이 약한 지점
- 내부 모델이 사용자에게 노출되는 지점

## 2. 우선순위 개선안

Blocking / High / Medium / Low로 나누어 주세요.

각 항목 형식:

- 문제
- 근거 화면 또는 소스 파일
- 사용자에게 생기는 혼란
- 수정 방향
- 기대 효과

## 3. 화면별 Revised UX Spec

대상 화면:

- 홈
- Flow 찾기
- Flow Map 상세
- 공개 Flow 상세
- 저장 완료 직후 My Flow
- My Flow 빈 상태
- My Flow 오늘
- My Flow 저장 목록
- My Flow 상세
- 캘린더
- source/detail/memo/export 영역
- 내부 검토 화면

각 화면별로 아래를 주세요.

- 화면의 한 문장 목적
- 첫 화면에 보여야 할 정보
- 첫 행동
- 낮춰야 할 정보
- 접어야 할 정보
- 제거하거나 내부 화면으로 옮길 정보
- 유지해야 할 정보

## 4. 구체 UI Spec

특히 아래는 개발자가 그대로 반영할 수 있게 구체적으로 주세요.

### Flow 찾기 카드

- 정보 순서
- 제목/보조 설명/입력 조건/저장 결과/첫 행동/CTA 구성
- metadata 처리 방식
- source 링크 처리 방식
- 카드 높이와 밀도 방향

### 공개 Flow 상세

- hero 정보 구조
- 저장 CTA 배치
- 입력값 영역
- 먼저 할 일 영역
- source/detail/memo 접힘 구조

### Flow Map 상세

- 큰 흐름 요약 구조
- 저장 전 preview 구조
- 모바일 sticky CTA 처리
- 원문/근거/메모 정보 위계

### My Flow

- 저장 직후 confirmation
- 오늘/다음/밀린 할 일 우선순위
- 저장 목록 스캔 구조
- 상세 열기 구조
- memo/source/export 위치

### 캘린더

- schedule-first로 보이게 하는 구조
- 날짜 선택 후 첫 행동
- My Flow와 역할이 겹치지 않게 하는 copy/배치

## 5. Copy 제안

사용자-facing 문구를 제안해주세요.

필수 대상:

- 홈 headline/subcopy
- Flow 찾기 카드 CTA
- 상세 저장 CTA
- 저장 후 안내 문구
- My Flow 빈 상태
- My Flow 오늘/다음/밀린 할 일 label
- export 버튼 label
- source/detail/memo 섹션 label

금지:

- `Flow Map`
- `Step`
- `Item`
- `sourceTrace`
- `review`
- `audit`
- `partial_draft`
- `source_import_required`

위 단어는 일반 사용자 첫 화면 문구로 쓰지 말아주세요.

## 6. 구현 체크리스트

다음 개발자가 바로 작업할 수 있게 주세요.

형식:

| 우선순위 | 파일/영역 | 수정 내용 | 완료 기준 | 검증 방법 |
| --- | --- | --- | --- | --- |

## 7. 검증 계획

수정 후 반드시 확인할 흐름:

- 모바일 390px
- 홈 -> Flow 찾기 -> 상세 -> 저장 -> My Flow
- 처음 저장한 사람
- 여러 Flow 저장 사용자
- My Flow 빈 상태
- 캘린더
- export/copy
- source/detail/memo 접힘 영역
- 내부 검토 문구 노출 여부

## 8. 유지할 것과 건드리면 위험한 것

분리해서 정리해주세요.

- 유지할 것
- 건드리면 위험한 것
- 지금은 하지 말아야 할 것
- 2차 이후로 미뤄도 되는 것

## 9. 최종 요약

마지막에 아래 4개 목록을 주세요.

- 지금 당장 고칠 5개
- 다음 루프에서 고칠 것
- 디자인 시스템으로 통일할 것
- 제품 방향상 유지할 것
