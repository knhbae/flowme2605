# FlowMe UX/UI 2차 개선 루프 감사 기록

작성일: 2026-07-03

## 입력 기준

- `docs/content-audit/2026-07-03-flowme-claude-design-uiux-rollout-ko.md`
- `D:\flowme2605\output\claude-design-proposal-2026-07-03\FlowMe Design Proposal.dc.html`
- `docs/SERVICE_STRUCTURE.md`
- `docs/flow-rules/quality-rubric.md`
- `docs/flow-rules/quality-gate.md`
- `docs/flow-rules/ux-copy.md`

## 2차 감사 요약

1차 적용으로 홈, `/flows`, source-backed Flow Map, My Flow의 큰 방향은 실행형 앱에 가까워졌다. 2차에서 남은 문제는 전체 구조가 아니라 공개 단일 Flow 상세(`/f/[slug]`)와 카드/저장/export의 미세 정보 위계다.

| 우선순위 | 영역 | 사용자 상황 | 발견 | 2차 대응 방향 |
| --- | --- | --- | --- | --- |
| High | 공개 Flow 상세 `/f/[slug]` | 처음 저장하는 사용자 | 상단이 제목, 설명, source, badge, meta를 비슷한 무게로 보여서 "무엇을 넣으면 무엇이 생기는지"가 5초 안에 강하게 보이지 않는다. | 상단을 입력값, 저장 결과, 첫 행동, 단일 저장 CTA 중심으로 재배치한다. |
| High | 공개 Flow 상세 `/f/[slug]` | 원문/근거를 확인하려는 사용자 | source 카드 문구가 "이 Flow는..."처럼 내부 모델 중심이고, 일부 상세에서 원문/근거가 첫 화면과 경쟁한다. | source/detail/memo는 삭제하지 않고 접힘/보조 영역으로 낮추며 사용자 문구로 바꾼다. |
| High | 저장 후 My Flow | Flow를 처음 저장한 사람 | 방향은 개선됐지만 아직 `저장 완료` 라벨과 안내문이 먼저 보인다. | 저장 상태는 작은 칩으로 낮추고 첫 할 일 제목과 `먼저 할 일 열기`를 더 앞세운다. |
| Medium | Flow 찾기 카드 | 급한 문제를 해결하려는 첫 사용자 | 1차 카드도 상단 badge 3개와 하단 보조 링크가 CTA와 경쟁한다. 상용 목록 카드에 비해 metadata가 아직 앞쪽에 많다. | category/status/source/count를 한 줄 보조 메타로 낮추고 제목, 입력/결과, 첫 행동, CTA만 시각적으로 남긴다. |
| Medium | Export sheet | export로 가져가려는 사용자 | 공개 Flow 모바일 export sheet가 `캘린더에 추가`, `엑셀로 받기`, `텍스트 복사`처럼 일부 결과가 덜 구체적이다. | `캘린더 파일 받기`, `시트로 받기`, `메모로 복사`처럼 결과 중심 라벨로 맞춘다. |
| Low | My Flow 상세 export | 반복 사용자 | detail export는 이미 접혀 있고 `메모로 복사`, `캘린더 파일 받기`가 적용되어 있다. | 큰 구조 변경 없이 라벨 일관성만 유지한다. |

## 사용자 케이스 x 페이지 평가표

| 사용자 케이스 | 페이지/경로 | 5초 목적 | 첫 행동 | 설명 과다 | 내부 용어 | 2차 판정 |
| --- | --- | --- | --- | --- | --- | --- |
| 처음 들어온 사람 | `/flows` | 대체로 보임 | 검색 또는 카드 열기 | 보통 | 낮음 | 카드 메타 밀도만 더 줄인다. |
| 급한 문제를 해결하려는 첫 사용자 | `/flows` 카드 | 보이지만 카드별 badge가 먼저 읽힐 수 있음 | 저장 전 보기 | 보통 | 낮음 | badge를 보조 행으로 낮춘다. |
| Flow를 처음 저장한 사람 | `/f/[slug]` | 약함 | 저장 또는 입력값 적용 | 보통 | 중간 | hero를 입력/결과/첫 행동 중심으로 재작성한다. |
| Flow를 처음 저장한 사람 | 저장 후 `/my` | 대체로 보임 | 먼저 할 일 열기 | 보통 | 낮음 | 저장 상태보다 첫 할 일을 위로 올린다. |
| 여러 Flow 반복 사용자 | `/my` | 보임 | 오늘/다음/밀림 확인 | 낮음 | 낮음 | 기존 구조 유지, post-save가 방해하지 않게 한다. |
| 원문/근거 확인 사용자 | `/f/[slug]`, `/flow-maps/[map]` | 가능 | 원문 버튼 또는 source 영역 | 일부 높음 | 중간 | 원문은 남기되 첫 화면에서 접거나 보조화한다. |
| export 사용자 | 공개 Flow 모바일 sheet | 가능하지만 라벨 예측성이 다소 약함 | export 옵션 선택 | 낮음 | 낮음 | 파일/복사 결과가 드러나는 라벨로 정리한다. |

## FLOW 품질 게이트 메모

- User need: 저장할 실행 콘텐츠를 고르고, 기준일 또는 시작값을 넣어, 캘린더/시트/메모/체크로 바로 옮긴다.
- Destination: calendar, checklist, sheet, memo. 목적지별 버튼 라벨은 결과물 중심이어야 한다.
- Rubric low points: Cognitive Load, Copy Specificity, Accessibility/Operability.
- Key decisions: 설명을 추가하지 않고 metadata와 source를 낮춘다. seed에 없는 Step/Item/사실은 만들지 않는다.
- Tests: UI 수정 후 `npm test`, `npm run docs:check`, `npm run build`, targeted Playwright E2E, 390px screenshot, Vercel preview.

## 구현 결과

| 영역 | 적용 |
| --- | --- |
| `/flows` 카드 | category/status/source/count를 큰 badge 묶음에서 한 줄 보조 메타로 낮췄다. 제목, 입력-결과 promise, 먼저 할 일, CTA가 더 먼저 읽히게 했다. |
| `/f/[slug]` 공개 상세 | 상단에 입력값, 저장 결과, 먼저 할 일을 추가했다. compact Jeonse 상세도 promise와 첫 할 일을 상단에 노출한다. |
| source/detail 영역 | source 카드 제목을 `원문과 근거`로 바꾸고 기본 접힘 구조로 낮췄다. 전환 설명은 `원문에서 옮긴 방식`으로 바꿔 내부 모델 표현을 줄였다. |
| 저장 후 My Flow | post-save 패널에서 `저장 완료`를 `저장됨` 상태칩으로 낮추고, 첫 할 일 제목과 `먼저 할 일 열기`를 더 앞세웠다. |
| export UX | public export-first hero와 모바일 export sheet 라벨을 `캘린더 파일 받기`, `시트로 받기`, `메모로 복사`로 맞췄다. |

## 검증 진행

- `npm test`: 274개 통과.
- `npm run docs:check`: 통과. Required files 14개, local links 1232개.
- `npm run build`: 통과.
- Targeted Playwright E2E:
  - `/flows` 통합 카드, curated source 카드, search/intent chip, representative single Flow save, source card, moving export-first hero, moving mobile save/export, wedding detail: 9개 통과.
  - source-backed Flow Map post-save/My Flow 경로: 4개 통과.
- 모바일 390px screenshot:
  - `output/playwright/uxui-second-loop-20260703/after-flows-mobile-final.png`
  - `output/playwright/uxui-second-loop-20260703/after-public-jeonse-mobile-final.png`
  - `output/playwright/uxui-second-loop-20260703/after-public-moving-mobile.png`
  - `output/playwright/uxui-second-loop-20260703/after-post-save-my-flow-mobile.png`
- 390px post-save My Flow screenshot에서 `clientWidth=390`, `scrollWidth=390` 확인.
- Vercel preview: `https://flowme2605-d1nd01b1k-flowme.vercel.app`
