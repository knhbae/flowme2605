# Claude Design P21 피드백 접수 및 실행 순서

## 검토 근거

- 원문: `claude_work/FlowMe UXUI 전체 검토9.zip`
- 핵심 문서: `FlowMe UX 재검토 P20 마감 (P21 백로그).dc.html`
- 비교 기준: `docs/content-audit/2026-07-10-claude-design-p20-final-review-package/`

Claude Design은 P20-01~P20-05를 모두 닫힘으로 판정했다. Blocking은 0이다. P20에서 URL-first miss부터 My Flow, Studio 초안 선반, Calendar, export까지의 경로는 열렸지만, 저장되는 초안이 한 항목짜리 빈 골격이라는 점을 P21의 가장 큰 제품 병목으로 보았다.

## P21 백로그 판정

| 항목 | 우선순위 | 판단 | 실행 방침 |
| --- | --- | --- | --- |
| P21-01 URL/메모를 여러 실행 단계 초안으로 펼치기 | High | 즉시 실행 | 결정론적 3~7개 제안부터 구현한다. 실제 AI는 사용하지 않는다. |
| P21-03 정상 route 구조 표시 2건 제거 | Medium | P21-01 검증에 포함 | `저장한 Flow`, `지금 볼 Flow`를 사용자 행동 중심 문구로 바꾸고 guardrail 0을 확인한다. |
| P21-04 실패·빈·완료 후·오프라인·중복 초안 evidence | Medium | 다음 evidence slice | 새 기능 없이 기존 상태를 390/1024px로 캡처하고 marker를 추가한다. |
| P21-02 실제 AI 생성 및 자동 제목 gate | Low | P21-01 후 spec | 실제 생성 전에는 AI 생성처럼 보이는 문구와 버튼을 만들지 않는다. |
| P21-05 홈 구분자·Calendar 약칭 polish | Low | 후순위 | P20 Calendar 압축 규칙은 유지하고 식별 토큰만 다듬는다. |

## 현재 실행 목표: P21-01

사용자가 남긴 제목과 메모를 결정론적으로 읽어 3~7개의 초안 할 일을 제안한다.

- 제목에서 준비 주제를 추출한다.
- 메모의 줄바꿈, 문장, 화살표 구분을 실행 후보로 나눈다.
- 짧은 요청도 최소 3개가 되도록 범위 결정, 메모 기반 행동, 기준일 배치 행동을 제안한다.
- 각 항목에 기준일 기준 `day_offset`을 0부터 순서대로 부여한다.
- 저장 전에는 제안 목록만 보여주고 full editor를 만들지 않는다.
- 저장 후 My Flow의 기존 설정과 상세 편집에서 포함 여부, 제목, 날짜, 메모를 손본다.
- Calendar와 export는 기존 projection을 그대로 사용한다.
- 초안은 항상 제안/초안 톤을 유지하며 완성된 Flow나 live AI 결과처럼 표현하지 않는다.

## 유지 기준선

- 4탭 IA와 public `/f` 공유 shell
- Studio는 noindex 보조 선반이며 5번째 탭이 아님
- 완료는 My Flow/Calendar 행 왼쪽 체크박스 1종
- public `/f` 저장 전 preview와 저장 후 completion 경계
- Calendar 월 grid의 2개 라벨 + `외 N개` 압축
- 개인 수정본 overlay와 source-backed 원본의 분리
- 저장/실행/export 스키마
- `urlFirstMissDraftImpliesLiveAi: false`
- URL-first visible `Markdown` 0
- candidate user-copy internal hit 0
- normal route structural display hit 0

## 다음 실행 순서

1. P21-01 결정론적 다단계 초안 구현과 My Flow/Calendar/export 회귀 검증
2. P21-04 쓰기 경로의 실패·빈·완료 후·오프라인·중복 상태 evidence
3. P21-02 실제 AI 생성 gate spec
4. P21-05 홈/Calendar 마이크로카피 polish
5. P21 final review package
