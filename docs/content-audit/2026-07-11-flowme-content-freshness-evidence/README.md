# FlowMe 공개 콘텐츠 최신성·기본 노출 evidence

작성일: 2026-07-11

## 목적

오래되거나 아직 검토 중인 콘텐츠를 의도적 채널 미리보기와 정상 사용자 실행 후보로 분리한다. 정상 사용자 후보에는 원문 확인 메타를 요구하고, 공개 제작자 profile은 확인된 콘텐츠를 기본으로 보여준다.

## 변경 결과

- 병합된 published bundle: 617개
- 정상 사용자 실행 후보: 155개
- 정상 후보 원문 확인일 누락: 8개 → 0개
- 정상 후보 출처 정밀도: exact 149개 / broad 6개
- preview 또는 hidden: 462개
- 공개 `/u/flow-curation-team`: 전체 75개 / 기본 확인된 콘텐츠 8개
- 기본 화면의 `needs_review`: 0개
- 기본 화면의 preview sample: 0개
- 개인 `/u/my-flow-studio`: 기존 전체/초안 선반 정책 유지
- 전체 단위 테스트: 397/397
- freshness 경계 targeted 테스트: 4/4
- 핵심 5개 spec 통합 회귀: 234/234

## 산출물

- [감사 기록](./audit.md)
- [판정 JSON](./route-evidence.json)
- [모바일 390px 기본 화면](./screenshots/01-public-creator-verified-default-mobile.png)
- [wide 1024px 기본 화면](./screenshots/02-public-creator-verified-default-wide.png)

## 검증 경계

원문 URL이 열리고 Flow 주제와 맞는지 확인했으며, 의료·법률·행정 사실 전체를 재감수한 것으로 확대 해석하지 않는다. 후속 live audit에서 삭제·구주소·연도 고정 자료를 정리한 뒤 `needs_review` 80개는 확인일이 있어도 source-fit 보강 큐로 남는다. 실제 사용자 관찰은 별도 P22 gate이며 이번 자동 evidence에 포함하지 않는다.

URL 생존과 redirect는 [정상 사용자 콘텐츠 출처 도달성 evidence](../2026-07-11-flowme-live-source-reachability-evidence/README.md)에서 별도 판정한다.

재감사는 `npx.cmd tsx scripts/content-audit/audit-flow-source-freshness.ts`로 실행한다. 90일 초과는 `review_due`, 180일 초과는 `stale`로 보고하며, 누락·미래 확인일·잘못된 source metadata·review due·stale 중 하나라도 있으면 종료 코드가 실패한다.

같은 gate를 표준 `npm.cmd test`가 실행하는 `lib/flow/seed-flows.test.ts`에도 연결했다. 기준일은 고정 snapshot 날짜가 아니라 실행 시점의 서울 날짜를 사용하므로, 이 문서 작성일이 지난 뒤에도 재확인 없이 영구 통과하지 않는다.
