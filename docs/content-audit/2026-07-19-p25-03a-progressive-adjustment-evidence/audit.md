# P25-03A Audit

## Before

- 항목 편집 진입 문구가 필드 목록처럼 읽혔다.
- 날짜를 편집하려는 사용자에게 시간 입력도 즉시 노출됐다.
- 저장된 장소나 반복 값이 있으면 재방문 시 긴 고급 폼이 자동으로 펼쳐졌다.
- 메모 크기 변경 제어가 저장 행동과 경쟁했다.

## Decision

1. 편집 행동은 `할 일 조정`으로 부른다.
2. 기본 면에는 할 일, 날짜 상태, 내 메모만 둔다.
3. 시간, 소요 시간, 장소, 반복과 유형별 추가 값은 `세부 일정`에 둔다.
4. 저장된 고급 값은 접힌 상태의 한 줄 요약으로 표시한다.
5. 일반 항목은 콘텐츠 유형과 무관한 결정/기록 필드를 받지 않는다.
6. 모든 저장은 기존 personal overlay를 통하며 published source를 변경하지 않는다.

## Browser Evidence

| Scenario | Viewport | Result |
| --- | --- | --- |
| 이사 source-backed 항목 기본 조정 | 390x844 | 시간/장소/반복 입력 숨김, 제목·날짜·메모 visible |
| 같은 항목 세부 일정 열기 | 390x844 | 시간/장소/반복 visible, 결정/기록 field 0 |
| 저장 후 재방문 | 1024x768 | 세부 폼 collapsed, `집 · 매주` summary visible |
| 결정 항목 | 390x844 | 결정 field는 세부 일정 안에서만 visible |
| 개인 초안 user item | 390x844 | 날짜 지정 후에도 시간 mode는 세부 일정 전까지 hidden |

대표 screenshot에서 horizontal overflow와 console error는 각각 0이었다. 개인 초안 Calendar와 ICS/list export 회귀도 기존 targeted journey로 확인했다.

## Remaining

- P25-03B: 여러 항목 선택, 날짜 이동/지우기, 포함/제외, 선택 범위 export
- P25-04: `날짜 없음`을 실행 가능한 `언제든` 모델과 Calendar 배치 queue로 정리
- P25-07: 버튼/icon/spacing을 전체 route에 같은 visual token으로 통합

실제 사용자가 `할 일 조정`과 `세부 일정` 경계를 설명 없이 이해하는지는 아직 관찰하지 않았다.
