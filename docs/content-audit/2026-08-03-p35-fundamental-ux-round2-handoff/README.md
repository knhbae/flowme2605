# P35 근본 UX 2차 검토 패키지

이 패키지는 2026-08-03 사용자 피드백 10개를 곧바로 UI 수정 목록으로 넘기지 않고, 먼저 제품 구조의 네 가지 결정을 검토하기 위한 자료입니다.

1. `내 Flow`는 무엇을 위한 화면인가
2. 저장과 내보내기는 어떤 순서이며 어느 화면이 소유하는가
3. 하나의 계획이 캘린더·할 일·체크리스트·메모·시트로 어떻게 보이는가
4. 공개 화면과 `내 Flow`에서 편집·저장·완료가 어떤 공통 문법을 쓰는가

현재 앱 증거는 `b215698` 기준, 모바일 390×844에서 다시 캡처했습니다. 이 문서는 기획·시뮬레이션 자료이며 앱 구현, PR 병합, 프로덕션 배포, 실제 사용자 관찰을 뜻하지 않습니다.

## 권장 진행 순서

### 1. Codex 로컬 시뮬레이션

[06-codex-local-simulation-prompt-ko.md](./06-codex-local-simulation-prompt-ko.md)를 로컬 접근이 가능한 Codex 작업에 전달합니다. 실제 화면·코드·상태 전이를 재현하고, 데이터와 UI가 정말 같은 구조를 공유하는지 확인하는 역할입니다.

### 2. Claude Design 독립 검토

[07-claude-design-round2-prompt-ko.md](./07-claude-design-round2-prompt-ko.md)의 GitHub 링크를 Claude Design에 전달합니다. 로컬 파일을 볼 수 없으므로 이 폴더의 캡처와 설명만 근거로 독립적인 IA·화면 구조·카피 대안을 만들게 합니다.

Codex 결과를 먼저 보여주지 않는 편이 좋습니다. 두 검토가 서로에게 끌려가지 않아야 실제 쟁점과 이견을 얻을 수 있습니다.

### 3. 기획 세션에서 합치기

두 결과가 나온 뒤 기존 기획 작업 `019fac25-34bc-7ea1-9533-376776fac3c0`에 [09-planning-synthesis-prompt-ko.md](./09-planning-synthesis-prompt-ko.md)를 전달합니다. 이 단계에서만 공통안, 기각안, MVP 구현 범위, 사용자 결정 필요 항목을 확정합니다.

## 문서 목록

| 문서 | 용도 |
|---|---|
| [01-owner-feedback-normalized-ko.md](./01-owner-feedback-normalized-ko.md) | 사용자 피드백 10개를 근본 문제와 검증 질문으로 재구성 |
| [02-fundamental-review-brief-ko.md](./02-fundamental-review-brief-ko.md) | 우선 결정할 제품 구조, 대안, 반증 조건 |
| [03-current-state-evidence-map-ko.md](./03-current-state-evidence-map-ko.md) | 현재 활성 화면·코드·캡처 증거 지도 |
| [04-benchmark-study-brief-ko.md](./04-benchmark-study-brief-ko.md) | 비교 앱의 공식 자료와 FlowMe에 적용할 패턴 |
| [05-simulation-scenarios-ko.md](./05-simulation-scenarios-ko.md) | 두 검토자가 공통으로 수행할 상태 전이·예외 시나리오 |
| [06-codex-local-simulation-prompt-ko.md](./06-codex-local-simulation-prompt-ko.md) | 로컬 재현·구조 검증용 Codex 프롬프트 |
| [07-claude-design-round2-prompt-ko.md](./07-claude-design-round2-prompt-ko.md) | GitHub 자료만 보는 Claude Design 프롬프트 |
| [08-review-scorecard-ko.md](./08-review-scorecard-ko.md) | `O / △ / X / TBD` 판정과 가중 점수 양식 |
| [09-planning-synthesis-prompt-ko.md](./09-planning-synthesis-prompt-ko.md) | Codex·Claude 결과를 기획안으로 합치는 프롬프트 |

이전 P35 사용자 피드백의 Before/After와 반영 판정은 [이전 시각 보고서](../2026-08-03-p35-feedback-before-after/p35-owner-feedback-before-after-ko.html)에 있습니다. 이번 패키지는 그 보고서에서 미완료였거나 새로 제기된 구조 문제를 다룹니다.

## 먼저 볼 화면

| 현재 상태 | 증거 |
|---|---|
| 날짜를 입력하면 같은 날짜가 바로 아래 다시 나타남 | [01 시작일 중복](./screenshots/01-public-date-selected-duplicate.png) |
| 공개 Flow 편집은 전용 전체 높이 패널 | [02 공개 Flow 편집](./screenshots/02-public-flow-editor.png) |
| `내 Flow` 편집은 기존 화면 아래로 길게 펼쳐짐 | [05 내 Flow 인라인 편집](./screenshots/05-my-flow-editor-inline.png) |
| Item 상세만 파란 표면과 `실행할 일`, `할 일 수정` 사용 | [06 Item 상세](./screenshots/06-my-flow-item-detail-current.png) |
| 공개 화면에도 저장 전 내보내기가 있음 | [13 공개 내보내기](./screenshots/13-public-export-panel-current.png) |
| `내 Flow`에도 별도의 내보내기가 있음 | [14 내 Flow 내보내기](./screenshots/14-my-flow-export-panel-current.png) |

## 검토 원칙

- 사용자 피드백은 문제를 찾는 강한 증거이지만, 제안된 해결법을 자동으로 정답 처리하지 않습니다.
- `완료`, 모든 형식 5개 노출, 모든 주의사항 숨김처럼 새 혼동이나 안전 문제를 만들 수 있는 안은 반드시 반증합니다.
- UI보다 먼저 사용자 상태와 행동 소유권을 정합니다.
- 하나의 Item·Step·Flow 데이터를 결과 형식마다 따로 만들지 않습니다. 결과 형식은 같은 데이터의 투영이어야 합니다.
- 자동화된 시뮬레이션과 디자인 검토는 실제 사용자 관찰이 아닙니다.
