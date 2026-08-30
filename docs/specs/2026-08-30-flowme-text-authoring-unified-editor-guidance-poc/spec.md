# FlowMe Text Authoring · 한 편집기 작성 틀과 입력 예시 PoC

## 목표

기존 `Flow 편집` CodeMirror 하나를 그대로 사용한다. 작성 틀은 별도 폼이나 두 번째 초안 편집기가 아니라, 사용자가 빈 문서에서 선택하면 미완성 TXT 골격을 현재 편집기에 한 번 넣어 주는 시작 도구다. 이후 입력·삭제·복사·붙여넣기·되돌리기는 모두 기존 편집기에서 동작한다.

이 문서는 2026-08-30 `draft-guidance` PoC에 대한 후속 결정이다. 그 결과물은 비교 근거로 보존하며 수정하지 않는다.

## 사용자 동선

```text
빈 Flow 편집기
→ 문맥별 +
→ 작성 틀로 시작
→ 구조형 6개 중 하나 선택
→ 현재 편집기에 미완성 TXT 골격을 transaction 1회로 삽입
→ 첫 # 입력 위치로 커서 이동
→ 필요한 줄만 작성하고 필요 없는 줄은 삭제
→ 기존 결과 영역이 값이 있는 유효한 줄만 해석
```

별도 초안 화면, `초안 보관`, `Flow로 확인`, 모든 빈칸을 채워야 열리는 CTA는 만들지 않는다.

## 선택 가능한 구조 틀

틀 이름은 운동·이사 같은 특정 주제가 아니라 문서 구조를 설명한다. 주제 문구는 선택을 돕는 예시에만 쓴다. 아래 6개는 앞선 P0.2 catalog의 승인된 scaffold bytes를 그대로 재사용한다.

| templateId | 화면 이름 | 구조 설명 | 화면 예시 |
| --- | --- | --- | --- |
| `exercise-phased-4w-v1` | 단계별 반복 | 단계마다 기간과 반복할 일이 달라요 | 4주 운동 적응 |
| `exercise-weekly-repeat-v1` | 같은 일정 반복 | 정한 기간 동안 같은 일정으로 반복해요 | 주간 운동 루틴 |
| `moving-dday-v1` | 기준일 전후 준비 | 한 날짜를 기준으로 앞뒤 할 일을 적어요 | 이사 준비 |
| `wedding-dday-v1` | 기준일 전후 준비 + 자료 | 앞뒤 할 일과 참고 링크를 함께 적어요 | 결혼 준비 |
| `travel-itinerary-prep-v1` | 준비 + 날짜별 일정 | 사전 준비와 날짜별 시간·장소를 함께 적어요 | 여행 준비와 날짜별 일정 |
| `exam-dday-study-v1` | 반복 준비 + 목표일 | 반복할 일과 마지막 일정을 함께 적어요 | 시험 준비 |

## 후속 source 계약

기존 P0.2 기획의 “틀 선택 중 rawText 변경 0”은 별도 폼을 전제로 한 계약이었다. 이번 isolated successor에서는 **틀을 고르는 행위 자체를 사용자의 명시적인 TXT 골격 삽입 명령**으로 정의한다.

- picker를 열고 둘러보거나 취소할 때 source write 0
- 틀을 선택할 때 현재 CodeMirror에 정확히 한 번 삽입
- 삽입 전체는 native undo 한 번으로 제거되고 redo 한 번으로 동일 bytes 복원
- empty source, 같은 editor view, 같은 document fingerprint, 같은 dispatch count, non-composing 상태에서만 허용
- 원문이나 host가 바뀌면 fail-closed하고 현재 bytes를 보존
- 틀 이름, 설명, 예시 문구는 source에 넣지 않음

## 빈 골격과 실제 오류

다음 exact blank syntax는 편집을 돕는 미완성 원문이다. source bytes와 위치는 보존하지만 canonical 객체, 속성, blocking issue를 만들지 않는다.

- `# `
- `## `
- `- [ ] `
- `  - [ ] `
- `- 기준일: `
- parser가 아는 빈 item property

같은 문서에서 값이 들어간 유효한 형제 행은 정상적으로 Flow·Step·Item·속성이 된다. `날짜: 2026-13-40`, `시간대: Mars/Olympus`처럼 **값이 있는데 잘못된 행**은 기존 오류 계약대로 차단한다. 일반 문장과 개인 메모를 자동 Todo로 바꾸지 않는다.

## 구조 메뉴

표시는 실제 삽입 문법과 관계를 함께 쓴다.

```text
현재 단계에
- [ ]  다음 할 일

현재 할 일 안에
├─  - [ ]    하위 확인
└─  - 날짜:  항목 정보
              날짜 · 시간 · 장소 · 반복 · 자료 · 완료 기준

새 구간으로
##  새 단계
```

`날짜 · 장소 · 완료 기준`은 세 기능만 지원하는 것처럼 보이므로 메뉴 제목으로 사용하지 않는다. 주 제목은 `항목 정보`로 하고, 상세 목록에서는 기존 property catalog의 실제 지원 항목만 보여 준다. `하위 확인`과 `항목 정보`는 현재 Item 아래의 동급 행동이며, `새 단계`는 별도 구간으로 outdent한다.

## 편집기 전체 입력 예시

`입력 예시`는 템플릿 세션이 아닌 Flow 편집기 전체의 presentation state다.

- 직접 작성, 문맥별 `+`, 작성 틀, 기존 문서 재진입에 같은 문법 기반 규칙 적용
- Flow 편집일 때만 보이고 순수 텍스트에서는 숨김·tab order 제외
- Flow 편집으로 돌아오면 사용자가 고른 표시 상태 복원
- 값이 없는 인식 가능한 문법 줄에만 `예: …` ghost 표시
- ghost는 `aria-hidden`, `pointer-events: none`, `user-select: none`
- 토글은 source bytes, clipboard, selection, scroll, revision, dispatch, undo에 영향 0
- 입력 중 행 전체를 raw/rendered로 번갈아 바꾸지 않고 별도 DOM overlay만 갱신

## 접근성·모바일

- 버튼과 메뉴 행은 웹 최소 44px, 모바일 목표 48px 터치 영역
- visible label과 `aria-pressed`, `aria-expanded`, `aria-controls`를 함께 제공
- 메뉴는 non-modal이며 focus trap을 만들지 않음
- `Escape`는 picker에서 구조 메뉴로, 구조 메뉴에서 `+`로 복귀
- `Tab`과 `Shift+Tab`은 기본 동작을 막지 않고 picker를 닫은 뒤 문서의 정상 탭 순서를 계속 따름
- 삽입 후 편집기와 첫 입력 위치로 focus 복귀
- 320px, 390px, 가로 화면, 200% 확대에서 가로 overflow 0
- 모바일 visual viewport에서 현재 caret과 활성 메뉴 항목을 키보드가 가리지 않음
- reduced motion에서는 전환 효과 제거

## 범위

허용:

- 이 격리 checkout 안에서 existing parser의 blank-scaffold 호환 처리
- existing Flow editor line locator와 같은 편집기 삽입·재진입에 필요한 최소 호환 수정
- 새 isolated HTML successor
- 새 controller, presentation overlay, picker, 테스트와 handoff

제외:

- production route/store/schema 통합
- main app checkout 수정 또는 배포
- 기존 parser·canonical model·projection engine 대체
- 기존 property tray와 문맥별 `+` 제거
- AI 기본 콘텐츠 생성
- non-empty 문서 중간에 전체 틀 삽입
- commit, push, PR, merge, deploy
- 관찰 사용자 검증

현재 관찰 사용자 세션은 0이다.
