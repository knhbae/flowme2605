# FlowMe 통합 PoC 작성→개인공간 일치 v1 Spec

## 0. 2026-09-03 정합화

이 문서가 닫은 범위는 Text Authoring에서 개인공간으로 넘기는 P0 자동 시나리오다.
개인공간 v4.1, 개발 1 saved-plan 편집, 개발 2 Text Authoring의 전체 제품 통합 완료를
뜻하지 않는다. 네 saved-plan origin의 공통 Plan→Item 화면과 opener, 제품형 shell과
상태 문구는 [제품형 UX 패스 v1](../2026-09-03-flowme-integrated-poc-product-ux-pass-v1/spec.md)에서
계속 다룬다.

이전 단계는 model/component `256/256`, standalone node `39/39`, 제한된 제품 브라우저
`37/37`, build 통과를 기록했다. 전체 `npm test`는 기존 dog fixture 신선도 1건으로
`1,520/1,521` 실패이며, 실제 Android/iOS·보조기술·관찰 사용자·배포는 미실행이다.

## 1. 목표

v4.1 개인공간, 개발 1 saved-plan 편집, 개발 2 Text Authoring의 이미 확정된 결정을
한 조작 흐름으로 맞춘다. React exact-query 화면을 제품 구현 정본으로 유지하고, 독립
HTML은 같은 핵심 UX를 직접 검토할 수 있는 동반물로 맞춘다.

완료 시 사용자는 일반 메모나 작성 틀로 시작해 원문을 그대로 유지하면서 실행 항목을
확인하고, 개인 Flow로 저장한 뒤 개인공간 상세에서 열고 편집·실행할 수 있어야 한다.
새로고침은 작성 중 원문과 마지막 성공 상태를 복원한다.

## 2. 세 원천과 연결 계약

| 원천 | 보존할 정본 | 이번 연결 |
| --- | --- | --- |
| v4.1 | 개인공간의 폴더·기간·상세·실행 위치·상태 피드백 | 작성 결과를 저장 직후 같은 개인공간 상세로 연다. |
| 개발 1 | 네 saved-plan origin, source read-only, 개인 사본의 단일 저장, 취소·오류 무저장 | 기존 Flow 찾기와 새 작성 Flow가 같은 상세·개인 편집 owner로 수렴한다. |
| 개발 2 | 한 text source/editor, 파생 결과, 선택형 검토, 빈 원문 틀 삽입, ghost 예시 | React와 독립 HTML의 작성 단계·문구·저장 의미를 일치시킨다. |

개발 1의 운영 editor/writer를 이번 PoC에서 호출하지 않는다. 이미 투영된 기존 Flow와
새 작성 Flow는 PoC shadow state에서만 같은 사용자 경험을 공유한다.

## 3. 화면·상호작용 계약

### 3.1 한 편집기

- 기본 여정은 `원문 작성 → 파생 결과 → 개인 Flow로 저장`이다.
- 강제 `작성 → 구조 확인 → 저장` wizard를 두지 않는다.
- 정상 원문은 매번 확인 checkbox를 요구하지 않고 저장할 수 있다.
- 구조 검토는 사용자가 요청하거나 blocking issue가 있을 때만 연다.
- 일반 문장은 원문에 남고 `- [ ]`로 명시한 행만 실행 항목이 된다.

### 3.2 작성 틀과 예시

- 여섯 작성 틀의 scaffold와 example은 versioned 계약 한 벌을 쓴다.
- picker는 틀 이름·용도·짧은 예시 이름을 보여 준다.
- 틀을 고른 뒤에는 같은 편집기에서 모든 인식 가능한 빈칸의 장식 예시를 볼 수 있다.
- 장식 예시는 `aria-hidden`, pointer-none, selection-none이며 source, clipboard, draft,
  fingerprint, native Undo/Redo에 들어가지 않는다.
- 틀 전체 삽입은 빈 문서에서 한 번만 발생하며 native Undo 한 번으로 제거하고 Redo 한
  번으로 exact bytes를 복원한다.
- picker 열기·닫기·취소, non-empty, stale, composing, 중복 적용은 source write 0이다.

### 3.3 결과·저장·개인공간 연결

- 편집 중 결과는 실행 항목과 날짜 노출을 즉시 보여 준다.
- `Flow 편집`은 source를 바꾸는 별도 editor가 아니라 같은 source의 읽기 쉬운 표현이다.
- 정상 결과는 별도 강제 검토 없이 저장할 수 있다. 잘못된 값은 exact 원문 행으로 돌아가
  고치게 한다.
- 시간·장소·자료 등 현재 personal projection에서 평탄화되는 정보는 저장 전 loss 확인을
  요구한다.
- 성공 시 source, canonical authoring result, personal projection, folder assignment,
  draft cleanup을 한 복구 가능한 transaction으로 기록한다.
- 같은 source 재시도는 같은 handoff identity를 사용하고 개인 Flow를 중복 생성하지 않는다.
- 저장 영수증의 주 행동은 `개인공간에서 열기` 하나다.

## 4. React와 독립 HTML 일치 범위

| 항목 | React | 독립 HTML |
| --- | --- | --- |
| compact 단계 | 원문 / 결과 2-state | 동일 |
| desktop | 원문과 결과 병렬 | 동일 |
| 검토 | 선택형 drawer/sheet | 같은 의미의 선택형 panel |
| 작성 틀 | 여섯 canonical scaffold | byte-identical catalog |
| 예시 | 전체 빈칸 ghost + 전역 toggle | source와 분리된 전체 빈칸 ghost + 전역 toggle |
| 확인 checkbox | loss가 있을 때만 | loss가 있을 때만 |
| 저장 | state+draft 복구 transaction | state+draft 복구 transaction |
| identity | source fingerprint 기반 | 같은 규칙 |
| 완료 뒤 | 개인공간 상세 열기 | 개인공간 상세 열기 |

fixture-only, Next route, `PlatformNav` 차이는 독립 HTML의 역할상 허용한다.

## 5. 반응형·접근성 계약

- 320×700, 375×812, 390×844, 844×390, 1024×768, 1440×900에서 가로 넘침,
  console error, page error, 가려진 핵심 행동이 없어야 한다.
- compact 화면은 원문과 결과를 한 번에 세로로 길게 쌓지 않고 두 상태로 전환한다.
- editor와 sticky CTA의 실제 사각형은 겹치지 않는다.
- 첫 화면에서 현재 단계, 원문 입력, 예시 사용법 중 핵심 문맥이 보인다.
- 틀 선택 뒤 focus와 caret은 첫 입력 가능한 빈칸에 있고, 화면은 핵심 설명을 통째로
  밀어내지 않는다.
- 844×390과 200% 등가 reflow에서 editor 본문과 결과 이동 경로가 접근 가능하다.
- 모든 control은 keyboard로 접근하며 Escape는 overlay를 닫고 opener로 focus를 돌린다.

## 6. 저장 경계

- React 진입은 `/flows/new?personalWorkspacePoc=v1`과
  `/my?personalWorkspacePoc=v1` exact-query gate만 사용한다.
- 모든 쓰기는 `flow:poc:personal-workspace:v1:*`에만 허용한다.
- 운영 `flow:*` key/value는 시나리오 전후 byte-for-byte 같아야 한다.
- 기존 completion, memo, date, archive, export writer를 호출하지 않는다.
- `localStorage.clear()`를 호출하지 않는다.
- 손상된 state 또는 draft는 기존 `/my`로 fail-closed한다.

## 7. 이번 범위에서 닫을 요구

- A0-4: 한 editor, 선택형 review, template one-shot, ghost 무영향
- A0-6: standalone의 핵심 Text Authoring 여정 parity
- D2-007: authoring/standalone compact shell 차이 중 자동화 가능한 부분
- D2-040: helper의 IME·stale·cancel write 0 브라우저 근거 갱신
- D2-053~055: 네 진입 방식의 같은 예시 toggle과 최종 menu 계약
- D2-058: standalone state+draft transaction과 idempotent retry
- D2-061: 320/390/landscape/200% 자동 반응형 계약

실제 모바일 keyboard, Android Chrome, iOS Safari, screen reader 증거가 필요한 부분은
자동화가 통과해도 부분으로 남긴다.

## 8. 제외 범위

- CreatorDraft library/search/clone/archive와 공개 후보·AI·계정·cloud·외부 동기화
- Sheet·전체 D2 export surface, recurrence occurrence runtime, source reverse edit
- 운영 schema, migration, 배포 owner 확정
- 콘텐츠 검토 없이 review metadata 날짜만 변경하는 행위
- commit, push, PR, Preview, Production
- 실제 기기·관찰 사용자 검증

## 9. 완료 기준

- [x] React와 독립 HTML의 여섯 scaffold/example 계약이 byte-identical하다.
- [x] 모든 빈칸 예시가 보여도 source·selection·scroll·storage·Undo가 변하지 않는다.
- [x] 독립 HTML에서 강제 3단계와 일반 source 확인 checkbox가 제거된다.
- [x] 두 화면이 compact 2-state, desktop 병렬, 선택형 검토 의미를 공유한다.
- [x] standalone save가 stable identity와 복구 가능한 state+draft transaction을 쓴다.
- [x] 저장→개인공간 상세→개인 편집→기간 보기→reload가 이어진다.
- [x] 취소·같은 값·stale·IME·오류의 성공 mutation은 0건이다.
- [x] 여섯 viewport와 자동 200% 등가 reflow의 geometry·overflow·error 검증이 통과한다.
      실제 browser 200% text zoom은 미실행이다.
- [x] 요구 추적표와 통합 검증 보고서가 이전 단계의 실제 최종 실행 근거를 가리킨다.
- [x] 전체 회귀의 기존 콘텐츠 신선도 실패는 별도 기준선으로 정직하게 보고한다.
