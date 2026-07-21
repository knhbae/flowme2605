# P28 Cross-Surface Experience Reconstruction

상태: `internally_complete_awaiting_owner_review`

작성일: 2026-07-21

기준 source: `origin/main` `46e567ec09c5eba37ac703529b3d3eccc75e0dde`

실제 관찰 사용자: `0`

## 한 줄 판정

P28-01에서 Hybrid 공통 문법을 선택했고 P28-02~08에서 저장 전 조정, 반복 Flow, My Flow, Calendar, 다섯 실제 결과 projection과 전체 회귀를 연결했다. 내부 구현 gate는 green이며 owner/독립 UX review를 기다린다.

## 현재 게이트

[P28 final review package](../../content-audit/2026-07-22-p28-final-review-package/README.md)에서 current implementation을 검토하고 `keep / revise / redesign`을 결정한다. 아래 항목은 구현 완료됐지만 observed-user validation은 아니다.

- 저장 전 기본 화면이 `전체 Flow 우선`, `결과 형태 우선`, `Hybrid` 중 무엇인지
- 모바일과 1024px에서 outline, 결과 미리보기, 조정이 어떤 순서로 나타나는지
- 반복 Flow가 일반 Flow와 공유할 row, editor, 완료 상태, 자료 영역
- My Flow의 browse, search, detail 관계
- Calendar의 다중 Flow 선택 방식
- 다섯 결과 형태를 고정 Gallery가 아니라 실제 projection으로 보여주는 방식

## 문서 지도

1. [피드백 대조](./feedback-reconciliation.md) - 사용자, Codex, Claude Design, current source와 화면의 일치·충돌
2. [제품·UX 계약](./spec.md) - P28이 보존할 것과 다시 설계할 것
3. [실행 계획](./plan.md) - 시뮬레이션, 재계획, 구현, 통합 순서
4. [상세 백로그](./tasks.md) - P28-01~P28-08의 범위와 완료 기준
5. [QA와 시뮬레이션](./qa.md) - 콘텐츠·보유량·viewport별 gate
6. [참고 패턴](./reference-patterns.md) - Calendar, Todo, 운동, 여행 서비스의 공식 문서에서 가져온 제한된 패턴

## 이전 P28 문서와의 관계

- [P28-00 public handoff](../../content-audit/2026-07-21-p28-00-promise-delivery-reconciliation/README.md)는 문제와 사용자 약속을 정리한 입력 자료로 유지한다.
- 로컬 Codex package의 기존 `P28-01 -> P28-07` 백로그는 구현 가능성 근거로 유지한다.
- Claude Design `P28-00 설계 검토 요청.zip`은 Hybrid와 actual-data preview 방향의 설계 입력이다.
- 이 spec은 최신 사용자 피드백을 반영해 실행 순서를 **구현 우선에서 비교 설계 우선으로 변경**한다.
- 기존 `P28-01 저장 전 전체 Flow shell` 요구는 폐기하지 않고 P28-02와 P28-03으로 분리한다.

## P28 전체 순서

```text
P28-01 비교 시뮬레이션과 아키텍처 결정
  -> P28-02 공통 projection·item role·artifact policy
  -> P28-03 저장 전 whole-Flow 조정 workspace
  -> P28-04 반복 Flow 공통화
  -> P28-05 My Flow 정보 구조 재구성
  -> P28-06 Calendar 다중 Flow 확장과 공통화
  -> P28-07 다섯 결과 형태·대표 콘텐츠·export parity
  -> P28-08 통합 회귀와 독립 설계 재검토
```

P28-05의 low-fi 설계는 P28-03과 병렬로 준비할 수 있다. P28-06의 filter prototype은 P28-01 fixture로 미리 검토할 수 있지만 production 구현은 공통 row와 routine 정책이 고정된 뒤 진행한다.

## 완료의 의미

P28 완료는 새 control 수가 늘었다는 뜻이 아니다. 다음이 한 문법으로 연결됐다는 뜻이다.

```text
Flow 찾기
-> 저장될 전체 내용과 실제 결과 형태 확인
-> 필요한 부분만 조정
-> 저장 또는 외부 이동
-> My Flow에서 전체 구조와 다음 행동 확인
-> Calendar 또는 Today에서 같은 항목 실행
-> 완료·재개·수정·복구
```

자동화와 agent simulation은 이 연결의 correctness와 조작성만 증명한다. 실제 관찰 사용자 수는 P28 동안 계속 `0`으로 기록하며, 사용자가 별도로 관찰 재개를 승인하기 전에는 usability validation을 주장하지 않는다.
