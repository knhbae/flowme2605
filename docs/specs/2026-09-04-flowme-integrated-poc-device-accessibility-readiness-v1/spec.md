# FlowMe 통합 PoC P3-G 실제 사용환경 준비 계약

## 현재 판정

- 단계: P3-G
- 시작 기준: P3-F `138/4/3/11/12`, primary gap 7
- 적용 범위: `/my?personalWorkspacePoc=v1` exact-query 격리 통합 PoC와 조작형 standalone HTML
- 목표 근거: 자동화 준비도 E4와 실제 기기 근거 E5-D를 분리한다.
- Production ready: false

P3-G는 자동 Chromium이나 viewport 축소를 실제 Android Chrome, iOS Safari,
TalkBack, VoiceOver 검사로 바꾸어 기록하지 않는다. 실제 기기 정보와 과업별 결과가
없는 요구사항은 기존 판정을 유지한다.

v4.1·개발2의 외부 정본은 dirty 원본을 수정·복사 편집하지 않고
[source-pins.json](./source-pins.json)에 절대경로, line range, SHA-256을 고정해 읽는다.

## 목표

1. 가상 키보드로 visual viewport가 줄어도 현재 입력, 마지막 필드, 취소·적용 행동에 접근할 수 있게 한다.
2. `pointercancel`, blur, resize, visibility change가 길게 누르기·drag를 취소하고 mutation 0을 지키게 한다.
3. Tab, Shift+Tab, Enter/Space, Escape, 비드래그 이동과 focus return이 같은 transition을 사용하게 한다.
4. `prefers-reduced-motion: reduce`에서 자동 스크롤·전환 애니메이션이 행동을 방해하지 않게 한다.
5. 실제 Android/iOS·보조기술 검사 결과를 재현 가능한 형식으로 기록하고, 자동화와 실기를 섞지 않는다.
6. 운영 `/my`, 기존 writer와 `flow:*` key/value가 바뀌지 않았음을 다시 검증한다.

## 대상 요구사항과 판정 문턱

| ID | P3-F | P3-G 자동화 준비도 | 최종 종료에 필요한 근거 |
|---|---|---|---|
| `V41-062` | 미충족/E0 | Android 과업·계측·취소 경로 E4 준비 | 실제 Android Chrome E5-D |
| `V41-063` | 미충족/E0 | iOS safe-area·gesture 과업 E4 준비 | 실제 iOS Safari E5-D |
| `V41-064` | 미충족/E0 | semantic/focus/reflow 검사 E4 준비 | TalkBack·VoiceOver·최대 글자 E5-D |
| `V41-066` | 부분/E3~E4 | touch 이동·cancel·mutation 0 E4 강화 | Android와 iOS 실제 touch E5-D |
| `D2-038` | 부분/E3~E4 | visualViewport·anchor·닫기·적용 E4 강화 | Android와 iOS 실제 가상 키보드 E5-D |
| `D2-042` | 부분/E3~E4 | 320·360·200%·viewport/caret/CTA E4 강화 | 실제 visual viewport E5-D |
| `D2-061` | 부분/E3~E4 | 전체 keyboard/focus/reduced-motion E4 강화 | 실제 keyboard·보조기술 E5-D |

자동화 준비도가 통과해도 primary 집계는 자동으로 바꾸지 않는다. 실제 기기 근거가
없으면 `138/4/3/11/12`, gap 7을 유지한다.

## 런타임 계약

### Visual viewport

- `window.visualViewport`가 있으면 `offsetTop`, `height`, layout viewport와의 차이를 사용한다.
- viewport resize와 scroll을 모두 반영한다.
- 지원하지 않는 browser에서는 `window.innerHeight`로 안전하게 대체한다.
- overlay의 최대 높이와 아래 여백은 현재 visual viewport 안에서 계산한다.
- 포커스된 입력과 주 행동을 필요한 만큼만 스크롤하며 원문·shadow state를 자동 변경하지 않는다.

### 입력·gesture 취소

- 길게 누르기 전 이동 임계값 초과, `pointercancel`, blur, resize, hidden, Escape는 같은 cancel 경로를 사용한다.
- 취소 뒤 합성 click이 이동 창을 다시 열지 않는다.
- drag 시작 전과 이동 창 확정 전에는 저장 mutation이 없다.
- 같은 위치·취소·오류도 mutation 0이다.

### Keyboard와 motion

- 모든 핵심 과업은 drag 없이 실행 가능하다.
- dialog·sheet·menu를 Escape로 닫으면 가능한 경우 opener로 focus가 돌아간다.
- 닫힌 뒤 opener가 사라졌다면 현재 화면의 의미 있는 heading으로 focus한다.
- reduced motion에서는 애니메이션과 smooth scroll에 의존하지 않는다.

## 실기 증거 계약

실기 PASS에는 기기 모델, OS, browser 버전, 검사 build fingerprint, 실행 시각,
요구사항 ID, 과업별 결과, 실패 시 재현 단계와 캡처가 필요하다. emulator, simulator,
desktop device emulation, 자동 Chromium은 E5-D로 인정하지 않는다.

장시간 사용은 P3-G 기술 안정성 proxy로 같은 build의 핵심 과업을 5회 반복하며 30분
연속 실행한다. 이 임시 기준은 사용자 효용·피로도 정책이나 관찰 사용자 검증이 아니며
후속 실제 사용 연구 기준으로 승격하지 않는다.

세부 과업은 [device-protocol.md](./device-protocol.md)를 따른다.

## 보호 경계

- PoC 쓰기는 `flow:poc:personal-workspace:v1:*`에만 허용한다.
- 기본 `/my`와 기존 운영 저장 key/schema/writer는 변경하지 않는다.
- 기존 네 saved-plan origin은 읽기와 projection에만 사용한다.
- `localStorage.clear()`를 호출하지 않는다.
- 운영 schema·migration·provider sync·배포를 만들지 않는다.
- commit·push·PR·Preview·Production은 실행하지 않는다.

## 완료 조건

1. 자동화 가능한 다섯 런타임 경계를 React와 standalone에서 fresh 검증한다.
2. 320×700, 360×800, 375×812, 390×844, 844×390, 1024×768, 1440×900과 200% 등가 reflow를 검사한다.
3. overflow, console error, page error, 가린 핵심 행동이 0이다.
4. 운영 prefix 밖 `setItem`, `removeItem`, `clear`가 0이다.
5. 실기 결과는 실제 실행 여부 그대로 PASS/FAIL/NOT_RUN으로 기록한다.
6. 추적표와 P3-G 검증 리포트가 같은 판정과 실행 수를 표시한다.
