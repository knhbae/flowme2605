# FlowMe Text Authoring · 한 편집기 작성 틀과 입력 예시 PoC 결과

## 바로 보기

- [로컬 실행 화면](./flowme-text-authoring-unified-editor-guidance-poc.html)
- [개발 계약](../../specs/2026-08-30-flowme-text-authoring-unified-editor-guidance-poc/spec.md)
- [Fresh QA](../../specs/2026-08-30-flowme-text-authoring-unified-editor-guidance-poc/qa.md)
- [개발 인계](../../specs/2026-08-30-flowme-text-authoring-unified-editor-guidance-poc/handoff.md)

## 반영 결과

기존 Flow 편집기를 별도 작성 틀 화면으로 교체하지 않았다. 빈 문서에서 `+ → 작성 틀로 시작`을 선택하면 구조를 설명하는 6개 선택지가 열리고, 하나를 고르면 해당 미완성 TXT 골격이 같은 편집기에 한 번 들어간다. 사용자는 전부 채우지 않아도 되며, 기존 텍스트 편집처럼 수정·삭제·복사·붙여넣기·undo·redo할 수 있다.

`입력 예시`는 작성 틀 전용이 아니다. Flow 편집기 전체에서 빈 문법 줄 옆에 presentation-only ghost로 보이고, 숨겨도 원문·selection·clipboard·scroll·dispatch·undo가 바뀌지 않는다.

## 빼서 단순해진 것

- 별도 템플릿 form/textarea 0
- 별도 초안 buffer 0
- `초안 보관`, `이 TXT를 원문에 넣기`, `Flow로 확인` CTA 0
- 모든 칸을 채워야 진행되는 gate 0
- 빈 scaffold에서 phantom Step·Item·property·issue 0
- 예시 문구의 source 삽입 0

## 검증 판정

- task-targeted unit/model 62/62
- shared Text Authoring 422/422
- successor와 기존 property re-entry browser 23/23
- build PASS
- full repository test 623/624로 NOT GREEN: 현재 날짜에 민감한 기존 seed review 기대 1건 실패
- 수동 확인은 로컬 390×844 headless screenshot이며 실제 모바일 기기·관찰 사용자 검증은 아님

HTML은 `2,814,564` bytes이고 SHA-256은 `1B7BC8D4ED432121CE5F8787E21C37131120E3A2079E28DE8A2008396FE9C0D4`다.

## 상태

게시 승인에 따라 commit·push·PR·merge 상태는 PR history에서 갱신한다. Vercel Preview·Production 배포는 제외하며 관찰 사용자 세션은 0이다.
