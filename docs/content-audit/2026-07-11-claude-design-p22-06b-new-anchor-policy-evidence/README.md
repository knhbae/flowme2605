# P22-06B New Anchor Policy Evidence

완료 Flow를 새 기준일로 다시 쓸 때 개인 고정 날짜를 조용히 유지하거나 삭제하지 않도록 conflict policy와 active projection 갱신을 구현한 evidence입니다.

## 결과

- 고정 날짜 없음: 별도 선택 불필요
- 고정 날짜 있음 + 선택 없음: 새 실행 거부
- `기존 날짜 유지`: 고정 날짜 보존
- `새 기준일에 맞추기`: 고정 날짜만 제거, 제목·메모 보존
- active Map anchor/personal copy 갱신: true
- 완료 run personal copy 불변: true
- 사용자-facing 재사용 UI: 아직 없음

## 먼저 볼 파일

1. [audit.md](./audit.md)
2. [route-evidence.json](./route-evidence.json)
3. [P22-06 policy](../2026-07-11-claude-design-p22-06-completed-flow-reuse-version-policy-ko.md)

## 검증

- focused storage/reuse test: 11/11
- full unit: 384/384
- `tsconfig.next.json` typecheck: pass
- production build: pass
- `git diff --check`: pass

화면 변화가 없는 정책 slice이므로 새 screenshot과 route capture는 만들지 않았습니다.
