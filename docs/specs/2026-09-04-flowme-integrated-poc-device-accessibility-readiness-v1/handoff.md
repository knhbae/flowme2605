# P3-G handoff

## 상태

P3-G 자동화 준비 단계 완료. visual viewport·가상 키보드·gesture cancel·keyboard
focus·reduced motion을 React와 독립 HTML에 보강했고, 대상 요구사항 7건의 자동화
준비도는 7/7 PASS다. 실제 기기 E5-D는 0/7이므로 primary gap 7은 그대로다.

## 고정 경계

- primary 기준: `138/4/3/11/12`, gap 7
- 자동화 준비도 E4는 실제 기기 E5-D를 대신하지 않음
- Production ready: false
- commit·push·PR·Preview·Production: 미실행

## 완료 근거

- focused: 132/132 PASS
- additive trace: 53/53 PASS, 부모 판정 override 0건
- runtime browser: 80/80 PASS
- P3-G 보고서 unit: 8/8 PASS
- P3-G 보고서 browser: 1/1 PASS
- 전체 `npm test`: 2,140/2,140 PASS, 13 invocation
- production build: static page 18/18 PASS
- docs: required file 16개, local link 4,634개 PASS
- 검사한 viewport: 320×700, 360×800, 375×812, 390×844, 844×390,
  1024×768, 1440×900, 200% 등가 reflow
- 최종 검사 범위의 overflow·console error·page error·가린 핵심 행동: 각 0건
- PoC prefix 밖 set/remove/clear: 각 0건, 운영 sentinel bytes 전후 동일
- standalone·Android single-file: 각 911,334 bytes, byte-identical, SHA-256
  `6B416411F75063FC7A1B493DA8A4CE7D5553E1E38465BC0031FE837897286C1D`

의존성 감사는 High `browserslist` 1건과 Low `postcss-selector-parser` 1건으로
FAIL이다. 패키지 변경은 수행하지 않았다.

## 다음 단계

실제 Android Chrome A1~A6, iOS Safari I1~I6, TalkBack·VoiceOver·최대 글자·실제
200%·reduced motion X1~X6, 30분·5회 X7을 같은 artifact SHA에서 수행한다. 실제
기기 모델·OS·browser·UA·build fingerprint가 없는 결과는 E5-D로 승격하지 않는다.

현재 실제 Android/iOS/TalkBack/VoiceOver/최대 글자/실제 200%/실제 가상 키보드/
30분·5회는 모두 `NOT_RUN`, 관찰 사용자는 0명이다.
