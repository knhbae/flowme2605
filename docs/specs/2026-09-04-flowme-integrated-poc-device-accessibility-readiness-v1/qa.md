# P3-G QA 계약

## 판정 원칙

- 자동화 PASS는 E4 준비도다.
- 실제 Android/iOS·보조기술 PASS만 E5-D다.
- emulator·simulator·desktop emulation은 actual-device PASS가 될 수 없다.
- 실행하지 않은 검사는 NOT_RUN이다.
- 실패가 하나라도 있으면 해당 요구사항을 승격하지 않는다.

## 자동화 수용 기준

| 영역 | 수용 기준 |
|---|---|
| visual viewport | resize·scroll·offsetTop·fallback 반영, CTA가 viewport 안에 있음 |
| virtual keyboard | 마지막 입력·취소·적용에 scroll로 접근 가능, 임의 저장 0 |
| touch cancel | pointercancel·blur·resize·hidden 뒤 panel 닫힘, 후속 ghost click 0, mutation 0 |
| keyboard | drag 없이 모든 이동 가능, Escape focus return, 같은 transition 결과 |
| reduced motion | transition/animation 제거, 자동 스크롤이 motion에 의존하지 않음 |
| storage | PoC prefix 밖 set/remove/clear 0, 운영 bytes 전후 동일 |

## 브라우저 화면

각 화면에서 다음을 모두 확인한다.

- `scrollWidth <= clientWidth`
- console error 0
- page error 0
- 현재 과업의 주 행동이 visual viewport 밖에 고정되지 않음
- keyboard-only 경로 존재
- 48px 이상 터치 대상 유지

## 실기 수용 기준

Android와 iOS 모두 다음을 실행한다.

1. 350ms 활성화 전에 8px 이상 이동해 long press가 열리지 않는지 확인한다.
2. 활성 drag를 scroll·앱 전환으로 중단하고 취소 상태와 저장 0을 확인한다.
3. 날짜·폴더·순서를 long press·`…`·keyboard로 각각 옮겨 같은 결과인지 확인한다.
4. 작성 owner `+`와 마지막 메뉴 행을 실제 가상 키보드 위에서 닫기·재열기·적용한다.
5. 닫은 뒤 opener focus, 적용 한 번, 마지막 field·CTA 접근을 확인한다.
6. keyboard를 닫고 reload한 뒤 마지막 성공 상태와 운영 데이터 불변을 확인한다.

보조기술 검사는 화면 이름·역할·상태·순서, Escape/뒤로가기, 최대 글자 reflow,
200% browser zoom에서의 핵심 행동 접근을 확인한다. 기술 안정성 proxy는 같은 build로
핵심 과업 5회를 포함해 30분 연속 실행하며 focus trap·ghost overlay·중복 저장·가린
행동·복구 불가 오류가 0이어야 한다. 이는 관찰 사용자 검증이 아니다.

## 결과 기록

최종 QA 표에는 실행명, 상태, 실제 테스트 수, 환경, 근거 파일, 실제 기기 여부를
각각 기록한다. 자동화·캡처·실기·관찰 사용자를 합산하지 않는다.

## 2026-09-04 최종 자동화 결과

| 실행 | 상태 | 실제 실행 수 | 환경 | 실제 기기 |
|---|---:|---:|---|---:|
| P3-G 실기 판정 계약 | PASS | 6/6 | Node | 아니오 |
| React·standalone focused | PASS | 132/132 | jsdom·Node | 아니오 |
| P2-B~P3-G additive trace | PASS | 53/53 | Node | 아니오 |
| 통합 runtime browser | PASS | 80/80 | Desktop Chromium | 아니오 |
| P3-G 보고서 unit | PASS | 8/8 | Node | 아니오 |
| P3-G 보고서 browser | PASS | 1/1 | Desktop Chromium, 7 viewport | 아니오 |
| 전체 `npm test` | PASS | 2,140/2,140, 13 invocation | Node·jsdom | 아니오 |
| production build | PASS | static page 18/18 | Next.js production build | 아니오 |
| `docs:check` | PASS | required 16, local link 4,634 | Node | 아니오 |
| dependency audit | FAIL | 취약점 2건 | npm audit | 아니오 |

브라우저 자동화는 320×700, 360×800, 375×812, 390×844, 844×390,
1024×768, 1440×900과 200% 등가 reflow를 포함했다. 검사 범위에서 page 가로
넘침, console error, page error, 가린 핵심 행동은 모두 0건이었다. 보고서의 최초
320px 검사에서 카드 min-content로 69px 넘침을 잡아 `minmax(0, 1fr)`와 단어
줄바꿈 계약을 적용했고, 최종 HTML을 다시 생성해 7개 viewport를 재통과했다.

의존성 감사의 미해결 항목은 High `browserslist` 1건과 Low
`postcss-selector-parser` 1건이다. 이 결과는 숨기지 않되, 사용자의 요청에 없던
패키지 갱신은 수행하지 않았다.

## 실기·관찰 결과

- Android Chrome, iOS Safari, TalkBack, VoiceOver: `NOT_RUN`
- OS 최대 글자, 실제 browser 200%, 실제 모바일 가상 키보드: `NOT_RUN`
- 30분·핵심 과업 5회 기술 안정성 proxy: `NOT_RUN`
- 관찰 사용자: 0명

따라서 자동화 준비는 7/7 PASS지만 primary 판정은 `138/4/3/11/12`, gap 7을
유지한다. 실제 기기 E5-D가 없으므로 Production ready는 false다.

실기 후보인 standalone HTML과 Android single-file HTML은 각각 911,334 bytes이며
SHA-256 `6B416411F75063FC7A1B493DA8A4CE7D5553E1E38465BC0031FE837897286C1D`로
byte-identical하다. 후속 실기는 이 값을 build fingerprint로 기록한다.
