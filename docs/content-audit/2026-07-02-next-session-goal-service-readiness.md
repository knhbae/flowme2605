# 2026-07-02 Next Session Goal - Service Readiness

아래 블록을 새 세션에서 그대로 복사해 시작한다.

```text
/goal

목표:
현재 4탭 IA와 My Flow v2.1 실행 UX를 기준선으로 유지하고, FlowMe가 실제 서비스처럼 보이기 위한 대표 콘텐츠 품질, 홈/Flow 찾기 신뢰도, 제작자 콘텐츠 확장 구조를 재정리한다.

핵심 전제:
- 4탭 IA는 유지한다: 홈 / Flow 찾기 / 캘린더 / 내 Flow.
- 캘린더는 글로벌 실행 탭이다.
- 내 Flow > 오늘은 실행 inbox다.
- 내 Flow > Flow는 저장한 Flow 구조와 진행률을 보는 공간이다.
- Step은 캘린더/투두/시트에 저장되는 최소 실행 단위다.
- Item은 Step 안의 체크/메모/detail이며 외부 앱에서는 text fallback으로 내려간다.
- 사용자 화면과 검토/기획 화면은 계속 분리한다.
- 자동 QA나 Vercel preview를 실제 사용자 검증이라고 부르지 않는다.

먼저 읽을 문서:
- docs/content-audit/2026-07-02-my-flow-v21-session-handoff-ko.html
- docs/SERVICE_STRUCTURE.md
- docs/specs/2026-07-01-my-flow-v2-execution-ux/spec.md
- docs/specs/2026-07-01-my-flow-v2-execution-ux/qa.md
- docs/flow-rules/source-to-flow-conversion-gate.md
- docs/flow-rules/flow-content-source-selection.md
- docs/flow-rules/quality-rubric.md

진행 범위:
1. 현재 기준선 재확인
   - 홈, Flow 찾기, 공개 Flow 상세, 캘린더, 내 Flow의 역할을 다시 요약한다.
   - My Flow v2.1 구조를 다시 갈아엎지 말고, 관찰된 문제만 보정한다.

2. 대표 콘텐츠 2~3개 재선정
   - 원문 출처가 분명하고 저장 이유가 강한 콘텐츠만 후보로 둔다.
   - 후보마다 Flow Map / Flow / Step / Item 구조를 먼저 텍스트 모델로 작성한다.
   - 원문에 없는 Step이나 Item을 UI에 맞춰 만들지 않는다.
   - 약한 후보는 Park/Revise/Legacy로 분리한다.

3. 홈/Flow 찾기 신뢰 신호 설계
   - 가짜 리뷰나 사용량 없이 보여줄 수 있는 신뢰 신호를 설계한다.
   - 예: 원문 출처, 제작자 맥락, 저장 후 결과, 입력 수, Step 수, 업데이트일, 미리보기 항목.
   - 홈은 서비스 약속과 대표 시작점, Flow 찾기는 catalog로 역할을 나눈다.

4. 사용자용 PoC와 검토 리포트 분리
   - 사용자용 화면에는 내부 평가, source fit, 점수, 개발자 문구를 넣지 않는다.
   - 검토 리포트에는 후보 판정, 원문 근거, UX 평가, 남은 리스크를 남긴다.

5. 필요 시 앱 코드 반영
   - P0/P1만 먼저 반영한다.
   - 내 Flow/캘린더 기준선을 깨지 않는다.
   - 홈/Flow 찾기 카드와 공개 상세 저장 전 preview를 중심으로 개선한다.

6. 사용자/UX 디자이너 시뮬레이션
   - 원문 발견
   - Flow 찾기에서 후보 선택
   - 공개 상세에서 저장 여부 판단
   - 저장 후 내 Flow에서 첫 실행
   - 캘린더에서 날짜 확인
   - 며칠 뒤 재방문

검증:
- npm run docs:check
- npm test
- npm run build
- 필요한 E2E
- 모바일 390px 클릭 시뮬레이션
- 사용자용 화면과 검토용 화면의 문구 분리 확인

완료 기준:
- 홈이 단순 설명 페이지가 아니라 서비스 입구처럼 보인다.
- Flow 찾기에서 콘텐츠를 왜 저장해야 하는지 납득된다.
- 대표 콘텐츠가 원문 기반으로 충분히 강하다.
- 내 Flow/캘린더 UX 기준선은 깨지지 않는다.
- 사용자용 PoC와 검토 리포트가 분리되어 있다.
- 남은 과제는 백로그/상태 문서에 업데이트되어 있다.
```

## 현재 기준선 요약

- `홈`: 서비스 약속과 대표 시작점을 보여준다. 전체 catalog가 아니다.
- `Flow 찾기`: 저장할 콘텐츠를 고르는 catalog다.
- `공개 Flow 상세`: 저장 전 preview와 최소 입력을 제공한다.
- `캘린더`: dated Step 실행용 글로벌 탭이다.
- `내 Flow > 오늘`: 오늘 또는 가까운 다음 Step 실행 inbox다.
- `내 Flow > Flow`: 저장한 Flow 구조, 진행률, Step list, Step detail을 보는 관리 공간이다.

## 다음 세션에서 조심할 점

- 콘텐츠를 늘리기 전에 원문 기반 구조 모델을 먼저 만든다.
- 사용자 화면에 기획/리뷰 문구를 넣지 않는다.
- 홈과 Flow 찾기를 다시 같은 catalog로 만들지 않는다.
- My Flow는 이미 기준선이 있으므로 대표 콘텐츠 검증 중 깨지지 않게 회귀 확인한다.
