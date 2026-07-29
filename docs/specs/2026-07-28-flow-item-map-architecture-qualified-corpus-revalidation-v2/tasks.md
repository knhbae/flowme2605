# Tasks

## 입력·baseline

- [x] v1 source artifact 경로·hash·기존 수치·결론 동결
- [x] Qualified v2 source artifact 경로·hash·validation 동결
- [x] 현재 `lib/flow/types.ts`, `lib/flow/export.ts` 구현 경계 기록
- [x] Vertical benchmark와 iCalendar 설명서의 증거 범위 기록

## corpus

- [x] 로직 이관 8개만 정상 corpus로 선택
- [x] 21 Flow / 49 Step / 160 Item / 210 SourceRow 자동 계산
- [x] 일정 112 / 날짜 없음 48 자동 계산
- [x] 생활코딩 WEB1 포함 및 Public Go 단독 상태 확인
- [x] 트리플·핏펫을 정상 수치에서 제외하고 boundary로 보존

## 아키텍처·projection

- [x] 세 아키텍처에 동일 Item·SourceRow·schedule·completion 투입
- [x] 10개 기준의 새 점수와 계산 근거 생성
- [x] 160 Item projection matrix 생성
- [x] 일정 없는 VEVENT 0
- [x] VEVENT/VTODO 중첩 0
- [x] 발명된 행동·날짜·반복·완료 기준 0
- [x] SourceRow provenance 누락 0
- [x] 날짜 없는 48 Item의 비Calendar projection 확인
- [x] calendar bundle의 canonical 개별 완료 상태 보존
- [x] VTODO 미지원 fallback 명시
- [x] 외부 client 왕복 `NOT_RUN`

## readiness·Vertical

- [x] Architecture / Logic / Public readiness 분리
- [x] rights, personal conversion, source completeness, review, promotion 분리
- [x] Public Go 1 / Modify 6 / Hold 1 확인
- [x] Vertical 8개를 실제 변환 corpus와 분리
- [x] Vertical taxonomy alias를 canonical life area로 명시적 매핑
- [x] Vertical behavior metadata와 canonical execution pattern 분리

## 문서·검증

- [x] 필수 JSON과 schema 생성
- [x] validator 및 test 통과
- [x] 새 한국어 HTML 생성
- [x] 기존 v1에 baseline 안내만 추가
- [x] iCalendar 설명서에 단순화 예시 표시 및 v2 상호 링크
- [x] `npm.cmd run docs:check`
- [x] `git diff --check`
- [x] 1440×900 browser QA
- [x] 390×844 browser QA
- [x] broken image / horizontal overflow / console error 0
- [x] scoped work closeout
