# FlowMe P27 Production Closeout

작성일: 2026-07-21 KST

판정: `released_to_canonical_production_automated_browser_green`

공개 서비스: <https://flowme2605.vercel.app>

## 배포 원장

| 경계 | 결과 |
| --- | --- |
| GitHub PR | [#141](https://github.com/knhbae/flowme2605/pull/141) merged |
| merge commit | `2829b379ada96baa79f49dfe75049b81f8b6d1c5` |
| Vercel | merge commit deployment status `success` |
| CI | Docs, Unit, Build `success`; Playwright E2E `success` |
| canonical production | 익명 접근 및 대표 상태 캡처 성공 |
| 관찰 사용자 | `0` |

## Production 검증

merge commit이 배포된 뒤 `390x844`와 `1024x768`의 새 브라우저 컨텍스트에서 P27 대표 여덟 상태를 다시 실행했다.

- app screenshots: `8`
- horizontal overflow: `0`
- console error: `0`
- page error: `0`
- unnamed visible focusable: `0`
- 내부 제작어 노출: 대표 저장 전 조정에서 `0`

검증한 상태:

1. 이사 Flow 저장 전 전체 preview와 한 번에 한 조정 작업
2. 홈트 반복 preview 4주와 종료일 없음, 원본 resource 분리
3. 작은 My Flow의 검색 없는 compact library
4. 큰 My Flow 검색 결과에서 해당 전체 Flow workspace 열기
5. Calendar Flow scope, routine marker, selected-day agenda
6. Flow 보관, 즉시 되돌리기, source 저장 record 보존
7. 저장 직후 compact receipt와 전체 Flow
8. Flow 전체 export preflight와 손실 안내

전체 수치와 시나리오별 DOM marker는 [capture-results.json](./capture-results.json)에 있다. 캡처 이미지는 [screenshots](./screenshots/)에 있다. full-page 모바일 캡처에서 고정 하단 navigation이 문서 중간에 반복되어 보일 수 있으나 런타임 viewport의 overlap 및 horizontal overflow 측정값은 `0`이다.

## Evidence 경계

- `current_canonical_production_browser`: 이번 merge 이후 canonical URL에서 직접 실행한 브라우저 evidence
- `current_command`: PR 전 로컬 및 push hook 검증
- `github_ci`: PR #141의 두 CI job
- `prior_artifact`: P26/P27 이전 설계·감사 자료
- `observed_user`: 없음

자동화, screenshot 검토, agent simulation은 실제 사용자 검증으로 계산하지 않는다.

## 남은 위험

- 영구 삭제는 계정·동기화·보존 정책 전까지 제공하지 않는다. 현재는 보관과 복구가 정본이다.
- 검색 노출 기준 `5`, 저장 전 기본 조정 mode, `보관` 용어는 실제 이해도 검증 전 가설이다.
- source resource 편집은 저장 전 preview와 개인 상세 편집의 역할 분리가 더 검토돼야 한다.
- browser-local persistence이므로 cross-device 연속성은 지원되지 않는다.
- 외부 Calendar 중복 import와 실제 export 활용성은 자동 QA만으로 증명되지 않았다.

## 다음 판단

새 기능을 바로 추가하지 않는다. [P27 최종 검토 프롬프트](../2026-07-21-p27-lifecycle-workspace-final/prompt-ko.md)로 Claude Design과 Codex의 독립 read-only production 검토를 수행한 뒤, 겹치는 Blocking/High만 P28 후보로 승격한다. 사용자 모집은 소유자가 별도로 재개하기 전까지 보류한다.
