# P24-00B2 Production Design Readiness

**판정:** 실제 사용자 관찰을 시작할 수 있음. 사용자 검증은 아직 `0 / 15`이며 P24는 미완료다.

Claude Design `(8)`의 `FlowMe UX 개선안 목업 + 코멘트.dc.html`을 픽셀 복제 대상이 아니라 상태 표현과 행동 위계의 기준으로 사용해, 병합된 production 화면을 다시 확인했다. 목업이 제안한 A~G 상호작용은 현재 제품에 연결되어 있다. 다만 실제 사용자가 설명 없이 발견하고 결과를 예측하는지는 자동화로 증명할 수 없다.

## 바로 열기

- [한국어 디자인 준비 보드](./workboard-ko.html)
- [상세 감사](./audit.md)
- [route evidence](./route-evidence.json)
- [P24-00B1 2인 파일럿](../2026-07-14-p24-00b1-two-person-pilot/README.md)
- [전체 15세션 가이드](../2026-07-14-p24-00b-observed-user-test-guide/README.md)

## 현재 근거

- production: <https://flowme2605.vercel.app>
- merged baseline: `8b48b08159c91b58defb9e0912f3e72ba6e391af`
- HTTP response: `200` for all five audited routes at 390px and 1024px
- horizontal overflow: `0 / 10`
- browser console error: `0 / 10`
- screenshots: `10`
- actual observed-user sessions: `0 / 15`

## 핵심 판단

1. Home과 Flow 찾기는 첫 행동이 첫 화면에 있고 추천 콘텐츠보다 먼저 읽힌다.
2. My Flow Today는 실행 가능한 한 행과 조작 없는 다음 예고를 분리한다.
3. Calendar는 선택일 실행 목록과 월간 grid 역할이 분리되어 있다.
4. public `/f`는 저장 CTA가 명확하지만 전체 길이가 모바일 `3204px`이고 설명·근거·내보내기까지 이어져 있어 첫 행동 이후의 인지 부담을 실제 사용자에게 확인해야 한다.
5. A~G 구현 여부와 발견성은 다른 문제다. P24-00B는 발견성, 범위 예측, 결과 신뢰를 관찰한다.

## 다음 게이트

P1-S1과 P2-S1을 실제 참가자 두 명에게 실행한다. 날짜·저장·완료 상태·export 범위가 틀리면 즉시 중단한다. 단순 선호 발언 하나만으로 재설계하지 않고, 행동 실패와 반복 발화를 분리해 기록한다.
