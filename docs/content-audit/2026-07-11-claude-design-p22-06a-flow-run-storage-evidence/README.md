# P22-06A Flow Run Storage Evidence

완료한 Flow를 다시 사용할 때 과거 완료 기록을 덮어쓰지 않도록, 사용자 UI보다 먼저 runId 기반 저장 계약을 구현한 evidence package입니다.

## 판정

**Slice A 완료**입니다.

- 기존 slug 상태를 첫 active run으로 승격: 통과
- 완료 상태 snapshot 보존: 통과
- 과거 run과 새 run의 ID 분리: 통과
- 새 run의 완료·회고·원본 알리기 미복사: 통과
- source version·personal copy 보존: 통과
- 기존 My Flow·Calendar·export 호출부 변경: 0
- 사용자-facing `다시 쓰기` UI: 아직 없음

## 먼저 볼 파일

1. [audit.md](./audit.md) - 저장 계약, 상태 전이, 남은 경계
2. [route-evidence.json](./route-evidence.json) - 기계 판정 summary
3. [P22-06 policy](../2026-07-11-claude-design-p22-06-completed-flow-reuse-version-policy-ko.md) - 전체 재사용·버전 정책

## 검증

- focused storage test: 10/10
- full unit: 383/383
- targeted E2E: 36/36
- `tsconfig.next.json` typecheck: pass
- production build: pass
- `git diff --check`: pass

이번 slice는 저장 경계만 다루므로 새 screenshot은 없습니다. 화면 변화가 없는 것을 screenshot으로 과장하지 않고 `routeEvidence: []`로 기록합니다.
