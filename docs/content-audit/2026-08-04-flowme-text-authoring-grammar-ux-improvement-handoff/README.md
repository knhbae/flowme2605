# FlowMe 텍스트 저작 문법·UX 개선 전달 패키지

작성일: 2026-08-04  
대상: `flow-text-authoring-ta` 로컬 구현 브랜치  
상태: 구현 전 검토·전달 자료. 사용자 검증 아님. 게시·배포·GitHub 업로드 안 함.

## 먼저 볼 파일

1. `flowme-text-authoring-grammar-ux-improvement-ko.html`
   - 사용자 피드백 10개, 독립 시뮬레이션 결과, 권장 문법, 목표 UX를 한 화면에 정리한 보고서
2. `review-brief-ko.md`
   - 근거와 결정안을 텍스트로 검토하기 위한 원본
3. `grammar-ux-contract-v2-candidate.json`
   - Codex와 Claude가 동일하게 따라야 할 후보 문법·정렬·결과 형태 계약
4. `simulation-matrix-v2.json`
   - 구현 후 반드시 재실행할 문법·날짜·결과·반응형 시나리오
5. `codex-implementation-prompt-ko.txt`
   - Codex에 그대로 붙여 넣는 구현 프롬프트
6. `claude-design-review-prompt-ko.txt`
   - Claude의 HTML Artifact/디자인 개선 작업에 그대로 붙여 넣는 프롬프트
7. `claude-handoff-guide-ko.md`
   - HTML과 GitHub 파일을 Claude에 전달하는 실제 방법
8. `report-qa-evidence.json`
   - 이 전달 보고서의 6개 viewport 스크롤·overflow·오류·링크 내부 QA 근거
9. `flowme-claude-design-handoff-2026-08-04.zip`
   - 현재 standalone HTML, 기준 PNG 4개, 문제 재현 PNG 5개, Claude 프롬프트·계약·시나리오를 모은 전달용 압축본
10. `qa-evidence/`
   - 새 속성 오해석, Sheet, 기준일, 390x600 구조·결과 문제와 전달 보고서 반응형 QA 화면

## 현재 확인된 핵심

- 기존 자동 시뮬레이션은 문법 27/27, UI 11/11이 통과했지만 이는 내부 QA일 뿐 사용자가 문법과 화면을 이해했다는 뜻이 아니다.
- 현재 파서에서 `  - 설명:`처럼 속성에 대시를 붙이면 그 속성이 새 Item으로 처리된다.
- 속성이 있는 18개 시나리오를 새 표기로 기계 변환해 현재 파서로 실행했을 때 18개가 모두 실패했다.
- 현재 Calendar 행은 날짜순이 아니라 입력 Item 순서를 따른다. 날짜 범위만 정렬된다.
- 결과 형태 버튼은 추천 가능한 결과만 필터링해 렌더링하므로 입력에 따라 위치가 바뀐다.
- Sheet는 일반 목록에도 폭넓게 노출되고, 미리보기 열이 `순서/항목/날짜` 중심이라 고유한 사용 목적이 약하다.

## 이번 후보의 한 문장 원칙

> 구조를 만드는 줄에는 Markdown 표식을 명시하고, 표식 없는 문장은 원문 텍스트로 보존하며, 결과 화면의 정렬과 원문 재정렬을 분리한다.

## 전달할 기존 파일

Claude에 실제 화면을 맡길 때는 이 패키지와 함께 다음을 전달한다.

- 현재 단일 HTML: `../2026-07-29-flowme-text-authoring-ta-implementation/flowme-text-authoring-ta-test.html`
- 데스크톱 화면: `../2026-07-31-flowme-text-authoring-grammar-simulation/ui-route-default-1440.png`
- 실시간 반영 화면: `../2026-07-31-flowme-text-authoring-grammar-simulation/ui-route-live-reflection-1440.png`
- 모바일 예제 화면: `../2026-07-31-flowme-text-authoring-grammar-simulation/ui-route-example-catalog-390x600.png`
- 모바일 하단 화면: `../2026-07-31-flowme-text-authoring-grammar-simulation/ui-route-mobile-result-bottom-390x600.png`
- 선택 참고: `D:\flowme2605\flow-mvp\claude_work\FlowMe 텍스트 저작 설계 완료_0729_1412.zip`

Claude 과거 시안은 구조·정보 위계 참고용이다. 색감은 현재 FlowMe 토큰을 유지하고, 과거 시안의 색을 그대로 이식하지 않는다.

Claude에는 압축본을 그대로 맡기기보다 먼저 풀어 `claude-design-review-prompt-ko.txt`, 두 JSON, 현재 HTML, 데스크톱·모바일 PNG를 개별 첨부하는 방식을 권장한다.

## 범위 경계

- 이 폴더는 새 자료만 추가한다. 기존 구현·스펙·테스트 파일은 수정하지 않았다.
- 사용자 관찰 세션은 수행하지 않는다.
- GitHub commit/push/PR, 배포, 공개 링크 생성은 별도 승인 전까지 하지 않는다.
- 구현 시 canonical data 흐름 `SourceRow -> Item -> Step -> Flow -> Bundle/Flow Map -> Projection`과 원문 보존을 유지한다.
