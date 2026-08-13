# FlowMe Text Authoring 서비스 P0 개발 목표

- **2026-08-11 구현 상태:** LOCAL_INTERNAL_QA_PASS / OWNER_REVIEW_READY
- **보존 source 브랜치:** `codex/text-authoring-service-p0-20260811`
- **승격 target 브랜치:** `codex/text-authoring-v5-integration-20260811`
- **공통 기준:** Text Authoring v5 통합 기준선 `a5f2127eff75f8fdf91bbedd9e60526f47209049`
- **승격 승인:** `TA-P0-PROMOTE-20260813-01` / 51개 row-set SHA-256 `687E943319C86D9A60F947753453295AACCC7C68594DD480DE03BB5138281D45`
- **현재 승격 상태:** 적용 완료 / fresh QA PASS / 승인된 로컬 승격 커밋에 포함
- **관찰 사용자:** 0명

> 이 문서의 완료 기준과 아래 QA 수치는 2026-08-11 source 구현 기록이다.
> 현재 clean target 승격의 fresh 결과와 실행 경계는
> [2026-08-13 승격 결과](../../content-audit/2026-08-13-flowme-text-authoring-p0-promotion-results/README.md)에서 관리한다.

## 1. 목표

Text Authoring 검토 데모를 한 사람이 반복해서 사용할 수 있는 로컬 제작 서비스로 닫는다. 사용자는 `내 콘텐츠 → 새 콘텐츠 → 작업 원문 → 결과 확인 → 명시적 초안 저장 → 재진입 → 준비 완료 표시`를 수행할 수 있어야 한다.

P0는 게시, 외부 전송, P35 반영, 계정 동기화를 하지 않는다. 자동 테스트와 브라우저 QA는 내부 검증이며 관찰 사용자 검증이 아니다.

## 2. 승인된 제품 결정

- 대표 사용자는 개인·공식 제작자의 공통 부분만 사용하는 1인 제작자다.
- 콘텐츠 목록의 제품 동작은 열기, 이름 변경, 복제, 보관, 복구만 둔다.
- 최초 SourceSnapshot은 바꾸지 않고, 사용자가 편집하는 WorkingSource가 현재 작업의 진실이다.
- parser, canonical draft, Calendar·Todo·Sheet·TXT projection은 같은 WorkingSource revision을 가리켜야 한다.
- 자동 저장은 복구본이며 `저장됨`으로 표시하지 않는다. `초안 저장`만 durable explicit save다.
- `준비 완료`는 마지막 명시 저장 revision의 상태만 바꾸며 publish, network, P35 side effect는 모두 0이다. 편집하면 즉시 해제한다.
- 표식 없는 평문은 canonical Item을 만들지 않고 TXT 원문 메모로 한 번만 보존한다.
- 사실형 CSV·TSV·Markdown 표는 Sheet·TXT에만 투영한다. 명시 행동이 아닌 표 행을 Todo·Calendar로 만들지 않는다.
- root `- [ ]`는 Todo, `  - [ ]`는 한 단계 하위 확인 항목, 날짜가 있는 같은 Item은 Calendar 일정, 반복은 같은 Item의 bounded occurrence다.
- Calendar 표시 정렬은 원문을 바꾸지 않는다. 원문 재정렬은 확인 뒤 같은 Step의 Item 블록 전체를 옮기며 1회 undo로 되돌린다.

## 3. 상태와 저장 계약

| 객체           | 역할                    | P0 불변식                                |
| -------------- | ----------------------- | ---------------------------------------- |
| SourceSnapshot | 최초 입력 보존본        | 편집·정렬·Inspector가 변경하지 않음      |
| WorkingSource  | 현재 편집 원문          | 모든 derived result의 source revision    |
| CanonicalDraft | 해석된 구조             | WorkingSource와 같은 revision pair       |
| Projection     | Calendar·Todo·Sheet·TXT | 같은 canonical revision과 occurrence set |
| RecoveryRecord | crash 복구              | explicit save와 분리, 자동 적용 금지     |
| CreatorDraft   | 명시 저장본             | coherent current pair만 저장             |
| ReadyHandoff   | 제작 workflow 상태      | 저장 revision status-only, side effect 0 |

손상되거나 지원하지 않는 저장 schema는 빈 목록으로 해석하지 않는다. 기존 raw 값을 보존하고 읽기·쓰기를 fail closed한다. quota/write 실패도 이전 raw와 현재 textarea를 보존한다.

## 4. 제품 route

| 목적                    | route                        | history            |
| ----------------------- | ---------------------------- | ------------------ |
| 콘텐츠 목록             | `/flows/authoring`           | entry 또는 push    |
| 새 콘텐츠               | `/flows/new`                 | push               |
| 저장 초안               | `/flows/authoring/[draftId]` | push               |
| 내부 대표 5개 QA        | `/flows/new?authoringQa=0`   | 제품 데이터와 분리 |
| 내부 전체 문법 QA       | `/flows/new?authoringQa=1`   | 제품 데이터와 분리 |
| 기존 수동 화면 fallback | `/flows/new?legacy=1`        | 기존 계약 유지     |

목록↔편집은 browser history에 남기고, 모바일 입력↔결과 전환과 결과 종류 선택은 route history에 넣지 않는다. 존재하지 않는 draft ID는 목록 route로 replace한다.

## 5. P0 완료 기준

- [x] `P0-00` 8개 대표 fixture와 product/QA visible-data 경계를 고정한다.
- [x] `P0-01` snapshot, working source, coherent revision pair, recovery, explicit save, ready receipt를 분리한다.
- [x] `P0-02` 새 콘텐츠→저장→목록→재진입과 rename·duplicate·archive·restore를 제공한다.
- [x] `P0-03` 빈 제품 화면의 첫 focus를 textarea에 두고 평문 TXT를 구조 문법 없이 저장할 수 있다.
- [x] `P0-04` 실제 월 Calendar, 부모 Todo+하위 체크, 표, 계층형 TXT와 반복 회차 parity를 제공한다.
- [x] `P0-05` 문제·원문 line·기대 입력·막힌 결과를 보여 주고 원문 수정 뒤 같은 결과 문맥으로 돌아온다.
- [x] `P0-06` 안전한 우측 수정만 source+canonical+projection 한 revision/한 undo로 적용하고 나머지는 fail closed한다.
- [x] `P0-07` 표시 정렬과 원문 재정렬을 분리하고 전체 block move/undo를 보존한다.
- [x] `P0-08` explicit save, draft별 newer recovery 선택, 재진입, source 비교, ready status-only를 제공한다.
- [x] `P0-09` 320/360/390/899/900/1024/1280/1440, keyboard, 44px target, 200% reflow, reduced motion, 오류→원문 프로그램 연결, focus/scroll을 최종 브라우저 검증한다.

## 6. 2026-08-11 source checkout에서 완료된 필수 검증

1. `npm.cmd run test:text-authoring`: `259/259 PASS`
2. `npm.cmd test`: `173/173 + 442/442 + 622/622 + 182/182 PASS`
3. `npm.cmd run build`: PASS, 정적 경로 `19`개 생성
4. 새 production build의 제품 P0 E2E `21/21`, 기존 Text Authoring QA E2E `37/37` PASS
5. 320/360/390/899/900/1024/1440, 200% text, reduced motion, overflow, 마지막 조작, keyboard/focus, 44px target PASS
6. 손상 schema, quota/write 실패, 첫 저장 전 crash recovery, saved보다 최신 recovery, SPA Back/Forward 미저장 보호 PASS
7. 제품 DOM의 QA fixture/scenario와 사용자에게 불필요한 parser/revision 내부 용어 비노출 PASS
8. `npm.cmd run docs:check`, P0 변경 source/E2E·신규 문서 Prettier, `git diff --check` PASS

당시 수치와 브라우저 증거는 [source 결과 README](../../content-audit/2026-08-11-flowme-text-authoring-service-p0-results/README.md)에 기록했다.

이 완료는 source checkout의 로컬 구현과 내부 자동 QA 완료 기록이다. 그 source checkout에서는 커밋·푸시·PR·merge·deploy·P35 연결 및 관찰 사용자 검증을 수행하지 않았다. 2026-08-13 승인 후 exact 51개 파일은 clean target에 적용됐고 최종 runtime 기준 fresh E2E `58/58`과 8-width·200%·접근성 검증이 통과했다. Scoped subtraction도 P1/P2·외부 side effect 혼입 `0`을 확인했으며 이 문서는 승인된 한 개의 로컬 승격 커밋에 포함된다.

## 7. 중단과 rollback

다음 중 하나가 발생하면 해당 mutation을 비활성화한다: source-only line 유실, Item/Checklist/occurrence identity 변경, invalid source의 정상 표시, source/result 한쪽만 undo, recovery의 explicit save 덮어쓰기, mobile 마지막 조작 미도달, publish/network/P35 mutation 발생.

Rollback은 저장된 CreatorDraft와 WorkingSource를 삭제하지 않는다. 목록은 기존 `/flows/new` fallback, Inspector는 원문 이동, 정렬은 display-only, ready는 action off로 축소한다.
