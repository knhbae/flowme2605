# FlowMe route lifecycle·검색 노출 evidence

작성일: 2026-07-11

## 목적

빌드에 남아 있는 과거 실험, creator supply preview, 개인 workspace가 정상 사용자 nav나 검색 결과에서 현재 공개 제품처럼 보이지 않게 한다. 직접 URL을 이용한 개발·검토 접근은 유지한다.

## 결과

- 390px/1024px 정상 route의 `/creators`, `/content-flows`, `/ia-compare*`, `/restart/*`, creator review 링크: 0
- 비공개·상태형 route 14개 `noindex`: 14/14
- 공개 discovery 표본 5개 indexable: 5/5
- `/creators`: 정상 secondary nav 제거, direct/noindex internal review 유지
- preview creator `/u/samsung-service`: noindex
- unknown creator `/u/not-a-real-profile`: noindex
- verified public creator `/u/flow-curation-team`: indexable 유지
- `/restart/moving-d30`: release-preview display gate와 noindex 동시 유지
- 최신 preview: <https://flowme2605-9d7bx3zvq-flowme.vercel.app/> (`dd7834b`)

## 산출물

- [감사 기록](./audit.md)
- [판정 JSON](./route-evidence.json)
- [모바일 390px 보조 메뉴](./screenshots/01-home-secondary-menu-mobile.png)
- [wide 1024px 보조 메뉴](./screenshots/02-home-secondary-menu-wide.png)

## 검증 경계

`noindex`는 검색 엔진에 대한 지시이지 접근 제어가 아니다. 내부 route는 직접 URL로 계속 열리므로 민감정보나 비밀 운영 기능을 두면 안 된다. 실제 검색 결과에서 제거되는 시점은 crawler 재방문에 달려 있다.
