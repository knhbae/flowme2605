# FlowMe Text Authoring 서비스 P0 구현 결과

- **2026-08-11 source 상태:** LOCAL_INTERNAL_QA_PASS / OWNER_REVIEW_READY
- **보존 source 브랜치:** `codex/text-authoring-service-p0-20260811`
- **source에서 커밋·푸시·PR·merge·deploy:** 수행하지 않음
- **관찰 사용자:** 0명

> 이 문서는 승인 전 source checkout의 역사적 구현·QA 기록이다. 승인
> `TA-P0-PROMOTE-20260813-01`에 따른 clean target 적용과 fresh QA는
> [2026-08-13 P0 승격 결과](../2026-08-13-flowme-text-authoring-p0-promotion-results/README.md)를 기준으로 본다.

## 현재 결과

- 1인 제작자 제품 route를 `/flows/authoring`, `/flows/new`, `/flows/authoring/[draftId]`로 분리했다.
- 제품 목록은 열기·이름 변경·복제·보관·복구만 노출한다.
- 최초 원문, 작업 원문, canonical, projection, recovery, explicit save, ready receipt의 owner와 revision을 분리했다.
- 손상 schema와 write/quota 실패는 기존 raw를 보존하며 fail closed한다.
- 첫 저장 전 recovery와 저장본보다 최신인 draft별 recovery를 자동 덮어쓰기 없이 선택하게 한다.
- 평문은 Item을 만들지 않고 TXT에 한 번만 보존하며 저장할 수 있다.
- 반복 Todo는 Calendar·Todo·Sheet·TXT에서 같은 bounded occurrence를 사용한다.
- 사실형 표는 Sheet·TXT에만 투영하고 Todo·Calendar에는 행동을 발명하지 않는다.
- 제품 결과는 실제 월 Calendar, 부모 Todo+한 단계 체크, 표, 계층형 TXT를 사용한다.
- 날짜 표시 정렬과 확인형 원문 재정렬·1회 undo를 분리했다.
- 처음 붙여넣은 원문과 현재 작업본의 변경 block을 비교할 수 있다.
- dirty 상태의 browser unload, SPA history, 목록·다른 draft 이동을 명시적으로 보호한다.
- `준비 완료`는 저장 revision의 상태만 바꾸고 publish/network/P35 side effect는 0이다.
- 문제 행에서 정확한 원문 위치로 이동하고, 수정·재계산 뒤 호출했던 결과와 Item 문맥으로 돌아온다.
- 안전한 단일 Item의 제목·설명·자료·출처·안내·주의만 source와 결과에 한 revision으로 반영하고 한 번에 undo한다. 표·중복·공유 범위처럼 모호한 수정은 쓰기 전에 차단한다.
- 320px·200% text에서도 결과와 마지막 저장 조작까지 도달하며, 390px의 38개 Item과 899/900px 구성 경계도 유지한다.

## 2026-08-11 source checkout 최종 검증 결과

| 검증                         | 결과                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Text Authoring unit/contract | `259/259 PASS`                                                                                              |
| 전체 `npm.cmd test`          | `173/173 + 442/442 + 622/622 + 182/182 PASS`                                                                |
| Production build             | PASS, 정적 경로 `19`개 생성                                                                                 |
| 제품 P0 E2E                  | `21/21 PASS`                                                                                                |
| 기존 Text Authoring QA E2E   | `37/37 PASS`                                                                                                |
| 브라우저 자동 검증 합계      | `58/58 PASS`                                                                                                |
| responsive·접근성            | 320/360/390/899/900/1024/1440, 200% text, reduced motion, 44px target, overflow, keyboard/focus/scroll PASS |
| 저장·복구 안전성             | 손상 schema, quota/write 실패, 첫 저장 전 recovery, newer recovery, unload·SPA Back/Forward 보호 PASS       |
| 제품/QA 경계                 | 제품 route의 fixture/scenario ID·QA catalog·불필요한 parser/revision 용어 비노출 PASS                       |
| docs/format/diff             | `docs:check`, P0 변경 source/E2E·신규 문서 Prettier, `git diff --check` PASS                                |

## source 완료 경계와 현재 승격 상태

- P0 구현과 당시 로컬 내부 QA는 source checkout에서 완료했다.
- source branch 자체는 커밋·푸시되지 않았고 별도 PR도 만들지 않았다. 이 사실은 과거 source provenance로 유지한다.
- 2026-08-13 owner 승인은 SHA-256 `687E943319C86D9A60F947753453295AACCC7C68594DD480DE03BB5138281D45`로 고정된 51개 파일을 공통 기준 `a5f2127eff75f8fdf91bbedd9e60526f47209049`의 clean target `codex/text-authoring-v5-integration-20260811`에 적용하도록 허용했다. 적용·fresh QA·scoped closeout이 완료됐고 결과는 승인된 한 개의 로컬 승격 커밋에 포함된다. Push/PR/merge/deploy는 수행하지 않았다.
- 게시, 외부 Calendar/Todo/Excel 전송, 계정·협업, P35 연결은 P0 범위 밖이며 side effect는 `0`이다.
- Chromium에서 제품 Back/Forward와 dirty guard를 자동 검증했다. 다른 브라우저의 Navigation API 미지원 경로는 `beforeunload` fallback을 유지하지만 별도 실브라우저 증거는 후속 호환성 QA다.

내부 자동 QA는 관찰 사용자 검증이 아니다. 현재 관찰 사용자 세션은 `0`이다.
