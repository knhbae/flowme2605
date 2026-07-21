# P27 Flow Lifecycle Workspace Reconciliation

이번 사용자 피드백과 current P27 자료를 통합한 다음 실행 프로그램이다. 기존 P27 package와 Input Composer v1.1을 폐기하지 않으며, 저장 전 조정·저장 후 My Flow·반복 Flow·삭제/복구·resource/subcheck를 하나의 라이프사이클로 다시 정렬한다.

## 문서

- [제품 계약](./spec.md)
- [실행 계획](./plan.md)
- [상세 백로그](./backlog.md)
- [작업 체크리스트](./tasks.md)
- [QA 계약](./qa.md)
- [첫 다음 목표](./next-goal.md)
- [피드백 종합 근거](../../content-audit/2026-07-21-p27-user-feedback-synthesis/README.md)
- [피드백 매트릭스](../../content-audit/2026-07-21-p27-user-feedback-synthesis/feedback-matrix.md)

## 현재 상태

- planning artifact: complete
- app implementation: not started
- owner prototype approval: pending
- observed-user sessions: 0
- canonical next slice: P27-R00A

## 실행 경계

- P27-R00A 전 app UI 대규모 변경 금지
- P26 stable identity/projection contract 유지
- archive/resource/recurrence 계약을 UI보다 먼저 고정
- dirty status/roadmap/decision 파일은 ownership 정리 후 별도 갱신
