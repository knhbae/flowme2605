# FlowMe 통합 PoC 제품형 UX 패스 v1 Design Contract

## 1. 목적

새 Flow 작성과 기존 Flow 실행이 서로 다른 시험 화면처럼 보이지 않게 한다. 화면은 사용자가
지금 할 일과 저장 결과를 이해하는 데 필요한 정보만 먼저 보여 주고, 구현·검증 정보는
기본 화면 밖에 둔다.

이 계약의 token과 shell은 격리 PoC 기준이다. 운영 design system이나 영구 navigation
정책을 확정하지 않는다.

## 2. 화면 공통 문법

### 남긴다

- 흰 본문과 평면 목록
- 회색 탐색과 청록 primary·focus
- 한 화면 한 제목
- 한 화면 한 primary action
- source, 개인 계획, 실행 위치의 시각적 구획
- 상태가 바뀌었을 때만 나타나는 짧은 feedback

### 기본 화면에서 뺀다

- `PoC`, `shadow state`, `write 0`, `mutation`, storage key
- 내부 Item/Flow ref, fingerprint, lineage id
- Stage·QA·검증용 badge와 성공 건수
- 같은 의미를 반복하는 설명 문단
- 모든 section을 카드로 감싸는 외곽선
- 같은 무게의 primary button 여러 개

기술 경계는 사용 안내의 별도 “이 검토본의 범위” 또는 검증 보고서에서만 설명한다.

## 3. shell

### 모바일

- 첫 줄: 뒤로가기 또는 제품 표식, 현재 화면 제목, 필요한 우측 action 하나
- 제품 전역 navigation과 화면 action header를 두 줄로 중복하지 않는다.
- 작성 화면의 compact 전환은 `작성 / 결과` 두 상태만 쓴다.
- sticky action은 editor caret, 마지막 행, safe-area를 가리지 않는다.

### desktop

- 작성은 원문 40~44%, 결과 56~60%의 두 pane을 기본으로 한다.
- 상세·편집은 정보와 편집 내용을 한 reading column에서 시작하고 넓은 화면에서만
  보조 요약을 옆에 둔다.
- 비어 있는 세 번째 열과 중첩 modal을 만들지 않는다.

## 4. 화면별 primary action

| 화면 | primary | secondary·text action |
| --- | --- | --- |
| 새 Flow 작성 | `결과 보기 · N개` | 작성 틀, 입력 예시, 취소 |
| 작성 결과 | `개인 Flow로 저장` | 원문 수정, 항목 검토 |
| 저장 영수증 | `개인공간에서 열기` | 없음 또는 작게 `새 Flow 만들기` |
| 개인공간 목록 | 행 선택 또는 `빠른 할 일 추가` 중 현재 맥락 하나 | 보기 전환, 정리 |
| Flow 상세 | `개인 편집` | 출처 보기, 기간 보기 |
| Plan 편집 | `변경 내용 확인` | 취소 |
| 변경 요약 | `저장` | 돌아가서 수정, 취소 |
| 이동 패널 | 선택한 목적지의 `이동` | 취소 |
| 오류 | `다시 시도` | 취소 |

목록의 행 선택은 화면 전체 primary button count에 포함하지 않지만, 같은 위치에 별도
대형 CTA를 추가해 경쟁시키지 않는다.

## 5. 공통 Plan→Item 필드 순서

### Flow

1. 원본 내용 — source read-only
2. 내 Flow 제목 — personal editable
3. 내 메모 — personal editable
4. 계획 날짜 — inherit/fixed/unscheduled
5. 실행 현황 — 이 편집에서 바꾸지 않는 derived 정보
6. 변경 내용 — staged impact summary

### Item

1. 원본 할 일 — source read-only
2. 내 할 일 제목 — personal editable
3. 내 메모 — personal editable
4. 실행 날짜 — execution placement
5. 변경 내용 — staged impact summary

Flow Item에는 독립 폴더 field를 만들지 않는다. “이 할 일은 Flow와 같은 폴더에 정리돼요”처럼
부모 상속을 설명한다.

## 6. owner 표현

| owner | 사용자에게 보이는 제목 | 편집 | 저장 대상 |
| --- | --- | --- | --- |
| source | `원본 내용` | 불가 | 없음 |
| personal plan | `내 Flow`, `내 할 일`, `내 메모`, `계획 날짜` | 가능 | PoC personal shadow |
| execution | `실행 날짜`, 완료 상태, 목록 순서 | 가능 | PoC execution shadow |
| derived | 기간 노출, 변경 요약 | 불가 | 계산 결과 |

`read-only`라는 구현 용어를 반복하지 않고, 필요한 곳에 “원본은 바뀌지 않아요” 한 번만
설명한다.

## 7. 날짜 문법

### 계획 날짜

- `원래 날짜 따르기`
- `날짜 지정`
- `날짜 미정`

### 실행 날짜

- `오늘 실행`
- `다른 날짜에 실행`
- `실행 날짜 미정`
- 자동 기간 노출을 숨기는 기존 PoC 선택이 있을 때는 그 상태를 별도로 유지한다.

실행 날짜를 옮겨도 원본 일정, 계획 날짜, Flow 소속, 부모 폴더는 변하지 않는다.

## 8. 상태 문구

| 상태 | 사용자 문구 | 행동 |
| --- | --- | --- |
| 저장 중 | `저장하는 중…` | 중복 저장 비활성 |
| 성공 | `저장했어요.` | 필요할 때 Undo 제공 |
| 같은 위치·값 | `이미 같은 위치예요.` | 저장 0, 성공 건수 증가 0 |
| 취소 | 기본 toast 없음 또는 `변경하지 않았어요.` | opener focus 복귀 |
| 실패 | `저장하지 못했어요. 다시 시도해 주세요.` | `다시 시도` 하나 |
| Undo 성공 | `되돌렸어요.` | 이전 화면 상태 복원 |
| 손상 복구 실패 | `저장된 상태를 열 수 없어 개인공간으로 돌아왔어요.` | 기존 `/my` |

`저장 0건`, `mutation 0`, `state rollback`은 사용자 문구에 쓰지 않는다.

## 9. 변경 요약

저장 전 요약은 기술 diff 대신 아래 순서로 보여 준다.

1. 무엇이 바뀌는가 — 제목, 메모, 계획 날짜 등 실제 변경만
2. 어디에 반영되는가 — 이 Flow와 포함된 Item 수
3. 바뀌지 않는 것 — 원본, Flow 소속, 실행 날짜 등 관련 항목만
4. 충돌·오류 — 저장하지 않은 상태와 사용자가 할 다음 행동

변경이 없으면 저장 button을 활성화하지 않는다.

## 10. overlay·이동

- picker, review, helper, move panel은 한 번에 하나만 연다.
- Escape와 닫기는 저장하지 않고 정확한 opener로 focus를 돌린다.
- 이동은 drag, 350ms long press, 더보기, keyboard가 같은 transition을 쓴다.
- 주 target은 48×48px 이상이다.
- 모바일 move panel은 왼쪽 목적지와 오른쪽 목록 corridor를 유지한다.

## 11. React·단일 HTML 허용 차이

| 반드시 같음 | 달라도 됨 |
| --- | --- |
| 화면 이름, primary action, 상태 의미 | Next route와 fixture file navigation |
| Plan→Item field order와 owner 구획 | 실제 origin loader와 고정 fixture |
| 날짜 문법, save/cancel/failure/Undo | `PlatformNav` 유무 |
| keyboard·Escape·focus 결과 | 다운로드 안내의 존재 |
| storage boundary 설명의 정확성 | 테스트 오류 강제 toggle의 안내 영역 |

단일 HTML의 오류 강제 toggle과 storage 설명은 `사용 안내` 안에만 둔다. 기본 제품 화면에는
노출하지 않는다.

## 12. 반응형 합격 기준

| 폭 | 계약 |
| --- | --- |
| 320~390 | compact 두 상태, 한 층 header, editor/CTA 교차 0, 첫 action과 마지막 줄 접근 |
| 844×390 | header와 상태 영역 최소화, pane 내부 scroll, 마지막 control 접근 |
| 1024 | 원문·결과 두 pane, 독립 scroll, review는 한 drawer |
| 1440 | 두 pane 비율 유지, 과도한 중앙 빈 공간과 세 번째 column 0 |

모든 지정 viewport에서 document-level overflow, 가려진 primary, console error, page error는
0이어야 한다.

## 13. 검토 순서

1. 구조 검사: 내부 용어, primary count, field order
2. 기능 검사: 다섯 origin, staged save, 날짜·완료·이동·Undo·reload
3. 화면 검사: 여섯 viewport와 전후 캡처
4. 감산 검토: 없어도 되는 설명·배지·card·action 재확인
5. 실제 기기·관찰 사용자·운영 결정은 별도 상태로 보고
