# 격리 PoC 보존 전 출처 최신성 처리

2026-09-20. 표준 회귀의 출처 기한 실패 9개를 처리한다. 제품 기능 전체 완료, 공개 배포, 원문 권리 취득 또는 관찰 사용자 검증을 뜻하지 않는다.

## 승인된 이전 감사 8개 재사용

기준 HEAD `6e4b44fe2f61b7086b8bbc61c30b5aa39dd4390e`와 main `b4a25a4fc85c99de32fb4282a00a9293ee532952`를 비교했다. main의 `7106736e` (PR #200, 원래 branch `codex/security-audit-refresh-20260907`)에 저장된 [9월 7일 의미 감사](../2026-09-07-flow-source-freshness-refresh/audit.md)와 [판정 원장](../2026-09-07-flow-source-freshness-refresh/review-ledger.json)을 원문 그대로 보존한다. 이 두 역사 문서의 dog 승인과 당시 취약점 0은 이번 판정이 아니다.

이번에 새 네트워크 재검사를 했다고 표현하지 않고, 다음 8개에만 기존 실제 감사일 `2026-09-07`을 seed와 source-fit에 반영했다. 행동·일정·위험 경계는 변경하지 않았다.

- alt-phone-sk7-self-activation
- chiangmai-solo-trip-packing
- jeonse-contract-precheck-docs
- banana-peanut-recipe-video
- elementary-school-entry-d30
- monstera-care-routine
- water-purifier-filter-cycle
- plank-30-day-challenge

레시피와 초등 입학 제목도 같은 감사의 실제 제목으로 맞췄다. 날짜 16곳과 제목 4곳의 선별 변경이다. main의 dog·EV·의존성 변경은 이 작업에서 가져오지 않았다.

## kids-printable-squishy-craft 새 원문 대조

- User need: 보호자로서 제작자의 도안을 다시 찾아 이용 조건을 확인하고 선택한 날 놀이에 사용하고 싶다.
- 정확한 원문: https://blog.naver.com/PostView.naver?blogId=makeitdiy&logNo=223260911491
- 조회: web reader 접근 불가 및 exact ID 검색 결과 없음. 같은 정확 URL의 PowerShell HTTP 요청은 200, 응답 224,066bytes. HTML title과 `se-text-paragraph` 본문을 읽었다. 파일·이미지·비밀번호·도안 첨부는 내려받거나 저장하지 않았다.
- 원문 형태/행: 제작자 printable resource 안내. 확인 가능한 본문은 겨울 간식꾸러미 도안, A4 인쇄, 저작권·무단 사용 및 배포 금지, 책 홍보·상업 링크 고지다.
- 현재 Flow: 일곱 항목에 출력/코팅 재료, 보호자 사전 작업, 당일 만들기, 사진 메모, 정리, 다음 놀이 후보와 D-1/당일/후속 구성을 포함한다.
- 대조: A4 인쇄와 원문 도안 링크는 확인했다. 나머지 재료·보호자 작업·기간 배치·사진/정리/다음 놀이 단계 전체를 본문 행에 연결하지 못했다. 첨부 파일이나 이미지 내용까지 없다고 단정하지 않는다. 이번에 그 상세를 읽지 않았으므로 추정해 채택하지 않는다.
- 권리: 무료도안이라는 제목을 복제·재배포 허락으로 확대하지 않는다. 제작자 자료는 원문에서 확인하며 FlowMe에 파일·이미지·비밀번호·아동 사진을 복사하지 않는다. 법률 판단을 확정한 검토가 아니다.
- 결정: `catalog_preview_only`, `sourcePrecision: mismatch`. 검토 시도/보류 판단의 `checkedAt`만 2026-09-20이며 콘텐츠 최신성의 seed `source_checked_at: 2026-06-10`은 그대로다. 실제 execution-model이 일반 실행에서 preview로 분류한다. freshness 임계값·분류 함수를 완화하지 않았다.

Conversion decision:
- Content shape: printable/resource
- Primary destination: 향후 원문 링크 중심 memo/bucket과 선택 놀이 날짜 검토. 이번에는 기존 실행 재설계 없음.
- Structure: 현재 timeline은 보류. 새 영구 구조를 확정하지 않음.
- Action count: 기존 7개 보존, 새 행동 0개.
- Playbook: resource gate; 원문 행 부족 시 hold.
- Exceptions: 열리지 않는 web reader 대신 동일 원문 HTTP 본문을 확인했으나 첨부 상세를 추정하지 않음.
- Risk/source handling: 원문 링크·권리 안내와 Flow의 실행 확장을 분리. 아동 정보 저장·효과 보장 없음.

Rubric: 원문 행 충족 여부를 확인할 수 없는 단계가 있어 Content Fidelity를 공개 통과로 채점하지 않는다. 나머지 UX/접근성 점수도 이번 source 검토에서 재평가하지 않았다. 최저 우선 과제는 읽을 수 있는 원문 행과 이용 조건에 근거한 재설계이며, 점수로 hold를 해제하지 않는다.

## 보존한 기존 보류

dog-adoption-first-week의 9월 4일 mismatch/catalog_preview_only와 seed `2026-06-04`를 보존했다. main의 9월 7일 dog 승인을 덮어쓰지 않았다. 기존 dog 회귀와 새 kids 보류 회귀를 함께 실행했다.

## 수정 전 SHA-256

| 파일 | SHA-256 |
| --- | --- |
| lib/flow/seed-flows.ts | 692ba828306674f8c347beb01e3c8de132a62f16cf9ca1ce76a2d8a329597299 |
| lib/flow/source-fit.ts | 6a70ecc5310b67a6e87b9b90fa4c17c8a319a373aa5af8807012125adaa90278 |
| lib/flow/source-fit.test.ts | 70319b6eb4287675dd8f58906decc9c7fc2a9f60e9434064eb5fd970348ff0c8 |
| lib/flow/content-lab.test.ts | 563bb395ba4fca5f3f2ffe640f9081a42a4d37c23325f2ca21115aa37aa29897 |
| lib/flow/seed-flows.test.ts | 386c6df21428d5ab0b6b976eb7611c99a6a6fa9e2a4916895f15c5e50e25b610 |

## 실제 실행

- `npm.cmd exec -- tsx --test lib/flow/seed-flows.test.ts lib/flow/source-fit.test.ts lib/flow/content-lab.test.ts lib/flow/natural-artifact-audit.test.ts`: 최초 138중137통과/1실패. kids가 실제 preview로 이동했지만 기존 최소 normal route 수 assertion이 남은 실패다. expected를 121/32로 이동하고 kids를 명시 preview 집합에 추가했다. 최종 **138/138 PASS, skip 0**. 새 고유 테스트 2개, 재실행을 더하지 않는다.
- `npm.cmd exec -- tsx scripts/content-audit/audit-flow-source-freshness.ts`: 2026-09-20T12:26:06.545Z, published156, normal133/current133, preview23, reviewDue0/stale0/missing0. 이 script는 source-backed merge 결과이며 raw seed의 테스트 집계와 분모가 다르다.
- 전체 npm/build/보안/브라우저는 상위 보존 작업에서 별도 검증한다. 이 문서는 해당 결과를 선행 주장하지 않는다.

변경: 위 5개 source/test 파일 + 이전 감사 2문서 + 이 기록. 런타임 저장소·개인 데이터·DB·Auth·환경 설정 변경 없음. 이 하위 작업의 commit/stage/push/배포 0, 실제 기기 검사 0, 관찰 사용자 0.
