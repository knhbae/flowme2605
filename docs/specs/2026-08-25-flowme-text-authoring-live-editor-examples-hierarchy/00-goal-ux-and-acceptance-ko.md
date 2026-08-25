# Text Authoring Live Editor 예시 복구·계층 표현 목표

## 승인

- 목표 ID: `TA-TEXT-AUTHORING-LIVE-EDITOR-EXAMPLES-HIERARCHY-20260825-01`
- 사용자 승인: 2026-08-25, 이 세션의 명시적 승인 메시지
- target: `D:\flowme2605\flow-text-authoring-flow-view-poc-20260824`
- 경계: 격리 checkout의 local code, test, 문서와 정적 HTML만 변경한다.
- 제외: main app 통합, route/navigation/store/schema 변경, parser·canonical·projection 의미 확대, commit, push, PR, merge, deploy, P35, 외부 쓰기, 관찰 사용자 검증

## 사용자 문제

1. 이전 Text Authoring 검증 화면에서 선택 가능했던 예시가 현재 인라인 Flow 편집 PoC에서는 대부분 보이지 않는다.
2. 문법을 만족한 문장이 편집기 안에서 변환되지만 root Item, 그 Item의 속성, 한 단계 ChecklistEntry가 거의 같은 시작점과 밀도로 보여 소유 관계를 빠르게 읽기 어렵다.
3. 긴 문장이 줄바꿈될 때 marker와 본문 열이 분리되지 않아 둘째 줄의 정렬이 흐트러진다.

## 확인된 현재 상태

| 항목 | current | target |
| --- | --- | --- |
| 예시 원본 | 검증 예시 30개와 작성 형식 예시 1개가 source에 존재 | source·label·순서·rawText를 바꾸지 않는다 |
| PoC 선택 목록 | 대표 예시 5개만 노출 | 기본 PoC에서 작성 형식 1개 + 검증 예시 30개, 총 31개 노출 |
| 축소 목록 | product-mode 대표 예시 5개 | `authoringQa=0`에서 그대로 유지 |
| 계층 데이터 | action은 source-derived `depth`, property는 owner 정보 보유 | 기존 parser block의 깊이와 owner만 presentation에 전달 |
| 계층 표현 | marker 고정 폭 inline, property는 평평함 | marker/text 2열, hanging indent, 1단계 중립 guide, root group spacing |
| 오른쪽 결과 | Calendar·Todo·Sheet·TXT projection | 객체·순서·eligibility·저장 경계를 변경하지 않는다 |

검증 예시 group은 `기존 FLOW 콘텐츠 8`, `날짜·반복 바꿔보기 11`, `이전 입력·표 형식 6`, `예외 처리 5`로 고정한다. `검토 필요`는 0개이므로 빈 group을 표시하지 않는다.

## UX 계약

- 기존 `순수 텍스트 / Flow 편집` 토글과 같은 편집기 표면을 유지한다.
- 비활성인 유효 block만 문서처럼 표현하고, 사용자가 누른 block은 같은 위치에서 exact raw syntax로 돌아온다.
- root action은 marker 열과 본문 열을 분리한다. 긴 본문의 둘째 줄 이후도 첫 본문 글자와 같은 x축에서 시작한다.
- 한 단계 ChecklistEntry와 Item-owned property는 root보다 안쪽에 놓고, 얇은 중립색 guide와 들여쓰기를 함께 사용한다. 색만으로 계층을 전달하지 않는다.
- Flow-owned root property는 root 위치를 유지한다.
- root action 사이에는 작은 group 간격을 두되 별도 card, badge, hierarchy panel, helper copy를 추가하지 않는다.
- Obsidian 참고 화면의 무지개색·깊은 nesting을 복제하지 않는다. 현재 canonical 계약 밖의 깊이는 새 Item이나 완료 owner를 만들지 않고 기존 literal/raw fallback을 유지한다.
- 320~390px에서 guide와 들여쓰기가 본문 폭을 과도하게 잠식하지 않아야 한다.
- 원문, 선택, undo/redo, IME, scroll, 오른쪽 결과는 view 전환 때문에 바뀌지 않는다.

## 필수 acceptance

### 예시

1. 기본 PoC dropdown은 placeholder를 제외하고 정확히 31개 선택지를 갖는다.
2. 작성 문법 1개가 먼저 나오고, 검증 group과 각 group의 source 순서·개수가 보존된다.
3. 모든 `qa:*` 선택은 해당 exact raw source를 editor에 넣고 오른쪽 결과를 다시 계산한다.
4. 같은 예시의 재선택과 다른 예시를 거친 복귀가 정상 동작한다.
5. `?authoringQa=0`은 대표 5개만 노출한다.
6. 실제 product route에는 전체 QA count, group, 내부 marker가 나타나지 않는다.

### 계층·편집

1. root checkbox/bullet/ordered는 depth 0, 한 단계 subcheck는 depth 1을 source에서 보존한다.
2. Flow property는 depth 0, Item property는 depth 1로만 표현한다.
3. root와 child의 시작 x가 다르고, 각 action의 줄바꿈 본문 x는 모든 시각 line에서 같다.
4. depth 1은 들여쓰기와 guide를 함께 가지며 guide는 장식 요소로 screen reader에 노출하지 않는다.
5. 320·360·390·899·900·1024·1280·1440px에서 수평 overflow가 없다.
6. 200% 확대에서도 본문·footer·primary action이 겹치지 않는다.
7. rendered block click, raw reveal, 수정, copy/cut/paste, Enter, Backspace, undo/redo, IME, reload, save-reopen에서 source bytes를 잃지 않는다.
8. plain prose, URL-only, invalid, unsupported, code, HTML, comment, table은 임의 action으로 승격되지 않는다.

## 검증 순서

1. model·adapter·UI-state·example targeted unit/contract
2. `npm.cmd run test:text-authoring`
3. `npm.cmd test`
4. `npm.cmd run docs:check`
5. `npm.cmd run build:text-authoring-flow-view-poc`
6. `npm.cmd run build`
7. PoC Playwright happy/failure/re-entry/catalog/hierarchy와 8 viewport·200%·keyboard·mobile 검사
8. 생성된 정적 HTML을 실제 브라우저로 열어 console/page error, overflow, 겹침, example selection, raw reveal을 재확인

자동화, 브라우저 캡처와 정적 HTML은 local internal QA 증거이며 관찰 사용자 검증이 아니다.
