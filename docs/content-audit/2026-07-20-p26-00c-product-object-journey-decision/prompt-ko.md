# P26-00C 독립 검토 프롬프트

아래 자료를 production 및 current source와 대조해 검토해줘.

- Production: https://flowme2605.vercel.app
- GitHub main: https://github.com/knhbae/flowme2605
- Package: `docs/content-audit/2026-07-20-p26-00c-product-object-journey-decision/`
- P26 program spec: `docs/specs/2026-07-20-p26-program/spec.md`

검토할 질문:

1. Flow/Flow Map을 user-facing Flow 하나로 통일한 판단이 자연스러운가?
2. discovery card의 job/source/artifact/input/result 순서만으로 저장 결과를 예측할 수 있는가?
3. `그대로 시작 / 내게 맞게 조정` 두 경로가 같은 Flow의 깊이 선택으로 읽히는가?
4. timeline/checklist/routine/project/record에 adaptive grouping이 필요한가?
5. Calendar의 on-demand undated tray와 Flow filter가 date-first 역할을 지키는가?
6. quick/advanced/structure/batch mode가 capability와 복잡도를 균형 있게 나누는가?
7. current와 proposed의 설명문, action, tap depth, overflow, accessibility 차이는 무엇인가?

결과는 severity 순 finding, 선택/기각 대안, route/viewport/reproduction, evidenceKind, P26 구현 acceptance marker로 작성해줘. 자동화와 heuristic을 실제 사용자 관찰로 표현하지 말고 앱 코드는 수정하지 마.
