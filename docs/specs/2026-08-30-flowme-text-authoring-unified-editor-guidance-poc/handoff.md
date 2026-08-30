# 개발 인계 · 한 편집기 작성 틀과 입력 예시 PoC

## 결론

작성 틀은 별도 폼이나 별도 편집 공간을 만들지 않는다. 빈 Flow 편집기의 기존 `+`에서 구조형 6개 중 하나를 선택하면 미완성 TXT 골격이 현재 CodeMirror에 transaction 한 번으로 들어간다. 사용자는 일부만 채우거나 줄을 지우고, 복사·붙여넣기·undo·redo를 그대로 쓸 수 있다. 빈 골격 줄은 source에 남지만 canonical Step·Item·field·issue를 만들지 않는다.

## 구현 경계

- 기존 Flow 편집기 하나와 기존 결과 영역 유지
- 구조명 6개와 승인된 scaffold bytes 유지
- 선택 전·취소·unsafe 상태에서 source write 0
- 선택 후 첫 `# ` 값 위치로 focus·caret 복귀
- 전역 `예시 보기/숨기기`를 직접 작성·기존 문서·문맥별 `+`·작성 틀에 동일 적용
- 구조 메뉴를 `다음 할 일 → 하위 확인/항목 정보 → 새 단계` 관계로 표시
- blank scaffold와 유효한 형제 행을 부분 해석
- 값이 있는 잘못된 날짜·URL·시간대는 기존 오류 유지

Production route/store/schema, main app, AI 생성, non-empty 문서 전체 틀 삽입은 열지 않았다.

## 주요 파일

- `components/flow/text-authoring/FlowLiveEditor.tsx`: 기존 line locator를 후속 overlay와 재진입에 노출
- `lib/flow/text-authoring/parser.ts`: blank scaffold를 source-only 행으로 해석
- `lib/flow/text-authoring/flow-view-model.ts`: 빈 골격 presentation block 경계
- `docs/specs/2026-08-30-flowme-text-authoring-unified-editor-guidance-poc/prototype/`: controller, browser runtime, style
- `scripts/build-text-authoring-unified-editor-guidance-poc.mjs`: 이전 결과물 exact-hash 확인과 successor 생성
- `tests/e2e/text-authoring-unified-editor-guidance-poc.spec.ts`: source·undo·부분 해석·예시·계층·guard·a11y·viewport 검증
- `playwright.unified-editor-guidance-poc.config.ts`: file artifact용 isolated browser 설정

## Fresh QA

- controller 7/7
- parser/model 56/56
- shared Text Authoring 422/422
- successor + inherited browser 23/23
- production build PASS
- artifact embedded module/style parse PASS
- full `npm.cmd test`는 623/624로 NOT GREEN: 수정하지 않은 seed review 날짜 기대 1건 실패
- 관찰 사용자 0명, 실제 Android/iOS 기기 검증 0

세부 명령과 실패 경계는 [qa.md](./qa.md)에 있다.

## 다음 작업

1. owner가 이 격리 PoC의 동선을 승인하면 clean product target과 owned path를 지정한다.
2. 6개 scaffold는 successor의 `unified-editor-template-scaffolds.mjs`에 versioned snapshot으로 포함되어 clean checkout에서도 이전 실패 PoC 없이 빌드된다.
3. product 적용 전 현재 날짜에 민감한 seed review test의 기대 기준을 별도 소유자가 결정한다.
4. 실제 Android/iOS 키보드에서 320·360·390px caret, picker scroll, 마지막 선택지 도달성을 확인한다.
5. 관찰 사용자 검증이 필요하면 과업과 성공 기준을 따로 승인한다. 자동화 결과를 그 근거로 대체하지 않는다.

## publish 상태

| 상태 | 결과 |
| --- | --- |
| local edits | 있음, 격리 checkout의 task-owned path만 |
| commit | `8dca3f14`, `53386931` local commits |
| push | 게시 절차에서 갱신 |
| PR | 게시 절차에서 갱신 |
| merge | 게시 절차에서 갱신 |
| deploy | 제외. source·target feature branch 모두 Vercel 비활성화 |
| external side effect | 0 |
| observed-user sessions | 0 |
