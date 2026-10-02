# 검증한 두 UX 묶음의 개발계 선별 반영

2026-10-02. 사용자 ‘다음 목표 잡고 ㄱㄱ’에 따라 시작한다. 개인 원문 계획·공유 경험/지식·선택적 기여의 방향을 유지하며 현재 우선순위는 UX·사용성 개선이다. 관찰 사용자 시험은 보류한다.

## 목표와 기준

[제작→개인 실행](../2026-10-01-alpha-flow-execution-journey/results.md)과 [폴더·작성·날짜](../2026-10-02-alpha-feedback-ux-bundle/results.md)의 검증 완료 변경을 소유 경로만 선별해 개발계에 반영하고, 실제 제공 판본과 피드백 기준을 맞춘다. 기존 26개 피드백 또는 424개 통합 조건 전체 완료를 목표로 삼지 않는다.

- 후보: `flow-flow-execution-ux-20261001`, branch `agent/flow-flow-execution-ux-20261001`, HEAD `9333b29931c838a51a5034e15e908ef0218e154b` 위의 두 목표 변경. 현재 dirty라는 이유로 소유를 추정하지 않는다.
- 기존 개발계: `flow-folder-content-ux-20261001@6d534a97`, build `667DI4JldqTDckfQ16wB5`, 승인된 Cloudflare 노트북 alpha 경로. 현재 외부/실제 저장 정상은 별도 검사다.
- 원격 기준: 시작 읽기 확인에서 main `efd8b642`, 기존 Draft PR207 head `9333b299`의 필수 네 CI가 SUCCESS다. 이는 새 후보 CI 결과가 아니다.
- 게시 준비 작업본: 기존 QA3106을 제공하는 후보에서 build/push하지 않도록 `flow-two-ux-dev-release-20261002`, branch `agent/flow-two-ux-dev-release-20261002`를 같은 `9333b299`에서 별도로 만들었다. 두 목표 공개 후보74+이번 정본5=79개만 byte 대조해 옮겼다. `_workspace`10·중간 HTML3·원본 output/pack/설정은 옮기지 않았다.
- 선행 결과: 직전 npm2,258·통합2,901·앱35/회귀60·사본 build는 이전 실행 증거다. 게시/반영 판본과 소스·자산을 다시 결합하고 위험에 맞춰 현재 검사를 수행한다.

## 단계와 완료 조건

1. 소유 합집합·중복·미소유를 대조하고 private 원문/증거/설정의 공개 경계를 검사한다.
2. 보안·출처·문서·테스트·빌드와 게시 경로/CI·자동 배포 side effect를 확인한다.
3. 확정된 승인 범위에서 선별 commit·push·stacked Draft PR 및 정확한 head의 CI를 확인한다. main 병합은 하지 않는다.
4. 새 제품 판본을 동결해 합성 조작과 자산을 확인하고, 승인된 기존 launcher로 개발계 앱만 교체한다. 이전 앱/build와 설정·자료를 보존하고 실패하면 정확한 이전 판본으로 복귀한다.
5. 외부 무인증 경계·합성 주요 동선·자산 provenance·보호 대조와 반영 원장을 확인한다.

완료는 선별 후보가 실제 개발계 제공 판본과 같고, 기존 개인 자료 경계를 유지하고, 정확한 이전 build로 돌아갈 절차/근거가 있는 상태다. 제품 전체 UX·공개 출시·실기기·관찰 사용자 검증을 뜻하지 않는다.

## 승인과 제외

목표 준비·조사·선별 설계·로컬 검증은 시작한다. 공개 commit/push/PR, 이 후보의 비공개 카탈로그 CI 실행, 개발계 서비스 교체의 정확한 범위는 사용자에게 묶어서 확인하며 답변 전에 실행하지 않는다. 초기 프롬프트의 별도 게시/배포 승인 경계를 유지한다.

새 날짜/반복/마감/메모 문법, 기본 폴더 위치 정책 확정, DB schema/migration, 계정/Auth·로그인 정책, Tunnel/DNS, 대용량5D 활성, 실제 계정 문서 시험 쓰기, Render/Vercel/Production 배포, main merge, 관찰 사용자 시험은 제외한다. 기존 dirty·미추적 `_workspace/`와 원본 `flow-mvp`, 실행 개발계의 install/build/hooks·증거 재작성은 금지한다.

정본은 [계획](plan.md)·[작업](tasks.md)·[QA](qa.md)·[교체/복귀](runbook.md)다. 새 미결 요구를 이 목표에서 구현하지 않는다.
