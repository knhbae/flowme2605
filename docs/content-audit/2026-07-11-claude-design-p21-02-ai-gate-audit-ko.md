# Claude Design P21-02 실제 AI 생성 Gate 감사

## 판정

P21-02는 **spec 완료, runtime 미개방**으로 닫는다.

- 실제 AI API/SDK/비밀키/환경변수를 추가하지 않았다.
- P21-01 결정론적 3~7개 draft를 현재 기본 동작과 실패 fallback으로 유지한다.
- AI 결과는 `제안 초안`이며 사용자 검토 전 My Flow 저장, Calendar 반영, export, 공개 발행, 완료 처리를 하지 않는다.
- source 원본, AI proposal, 사용자 overlay의 소유권과 우선순위를 분리했다.
- timeout, empty, partial, duplicate, cancel, offline, 민감 콘텐츠 실패 정책을 정의했다.
- 비용·입력 길이·개인정보·로그 최소화와 provider retention 검토를 실제 구현의 선행 조건으로 두었다.

정본은 `docs/specs/2026-07-11-url-first-ai-draft-gate/spec.md`다.

## Go/No-Go

현재는 **No-Go**다. 다음 조건이 모두 확인된 뒤에만 실제 provider 구현 목표를 연다.

1. provider 보존·학습·보안 정책 검토
2. 민감정보 차단/redaction
3. request/response runtime validator
4. fake provider failure fixture
5. 사용자 검토 전 자동 저장·발행 금지 E2E
6. 비용·latency 상한과 feature flag
7. P21-01 fallback/rollback 검증

## 기준선

- `urlFirstMissDraftImpliesLiveAi: false`
- 3~7개 deterministic suggestion
- 기준일/date override와 personal overlay 유지
- My Flow/Calendar/export projection 유지
- user-facing internal/technical copy hit 0
