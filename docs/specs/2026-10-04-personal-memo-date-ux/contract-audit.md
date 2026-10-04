# 개인 문서 메모·날짜 계약 감사

2026-10-04. [목표](spec.md)와 [요구](requirements.md)의 PC01·PC02를 현재 source·표적 tests·세 원천 요구에 대조했다. 초기 감사는 HEAD `58df6bff`의 읽기 전용 조사였고, 후속 위임에서는 새 helper의 독립 테스트와 이 문서만 작성했다. PC03 반복/복제/메모 owner 변경과 PC04 due는 의미 충돌을 확인하는 범위다.

현재 제공 중인 다른 작업본과 서버·Tunnel·DB는 조작하지 않았다. 원본 `flow-mvp`의 dirty 문서는 읽기만 했으며 복사·수정·stage하지 않았다. 계정·credentials·개인정보를 읽지 않았다. 이 문서의 합성 fixture 제목과 메모는 테스트 입력이다.

## 원천과 승인 범위

| 원천 | 이 감사의 연결 | 판정 경계 |
| --- | --- | --- |
| [9/5 v4.1 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/v41-audit.md) V41-012/013/014/025/028 | 구획, 이동의 소속·날짜·시간 보존, 원문 경로와 기간 projection | 당시 standalone의 차이를 현재 제품 결함으로 다시 세지 않는다 |
| [9/5 개발1 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d1-audit.md) D1-004/006/018/022 | dirty 취소·초점 복귀, 날짜 3상태, 조회일/anchor, 저장 안전장치 | 조회 날짜를 실행 날짜나 source anchor로 취급하지 않는다 |
| [9/5 개발2 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d2-audit.md) D2-002/003/012/014/015/039/040 | 메모 귀속, 같은 Item projection, 날짜 입력·원문·정확 대상 | 이전 차이는 후속 현재 코드와 따로 대조한다 |
| [10/2 대표 요구](../2026-10-02-alpha-ux-comparison-gaps/requirements.md) C03/C08/C09와 PC01/PC02 | 현행 메모 Enter와 날짜 출처, 구조 이동과 실행 날짜 변경의 구분 | 새 자연 본문 문법·날짜 유지/따름 조작은 미결 |
| [10/2 피드백 요구](../2026-10-02-alpha-feedback-ux-bundle/requirements.md) B2/C1/C2 | 기존 반복 메모 속성, 지난 미완료/당일 표시, groupDate/explicitDate | 현재 지원과 제안 정책을 합치지 않는다 |

직접 피드백은 로컬 원본 `D:/flowme2605/flow-mvp/docs/content-audit/2026-09-28-flowme-use-feedback-session-ko.md`다. #14는 날짜 변경 결과의 원인이 아직 특정되지 않은 관찰, #16은 메모 줄바꿈 문제, #22는 같은 일·다른 날짜·반복·메모에 관한 질문, #23은 특정 폴더 Today의 어제 항목 관찰, #24/25는 날짜 구획 관계와 예정일/due의 정책 질문이다. 원래 사용 환경의 오류 해결을 이번 합성 검사로 선언하지 않는다.

Dots 자료는 [기존 대조](../2026-10-02-alpha-ux-comparison-gaps/dots-review.md)를 유지한다. 일정 L11은 구획일 변경에서 상속 항목만 변경됐다는 화면 보고이고, R05는 조회/검색 교집합과 미정의 시간 보존, R04는 예정일 변경 흔적의 발견성이다. 자유 편집 FE01~06은 등록 identity·수동 원문 복원·진짜 Undo·텍스트 복제의 차이를 다룬다. Dots가 구분한 날짜는 예정일과 진행 기록일이며 due 검증이 아니다. 비인간의 압축 시나리오를 사람의 장기 사용 근거로 합산하지 않는다.

원본 `DECISIONS.md:48-58`의 2026-09-06 큰 방향은 개인 텍스트 관리·공유 지식·선택 참여를 함께 유지한다. 이 방향은 새 날짜 문법·메모 owner·공개 기능의 즉시 구현 승인이 아니다. 현재 작업본 [DECISIONS.md](../../DECISIONS.md)의 P26 Item identity와 명시 미정 보호 결정은 보존하지만, 운영 overlay의 key를 이 텍스트 모델의 줄 ID에 그대로 이식하지 않는다.

## PC01 메모 귀속과 이어쓰기

| 현재 계약 | source·심볼 | 표적 근거 |
| --- | --- | --- |
| 들여쓴 직접 `- 메모:`는 바로 위의 유효 check owner를 읽음. root·child·grandchild를 근처 상위 할 일로 치환하지 않음 | [vendor 모델](../../../lib/flow/integrated-poc/vendor/text-model.cjs):320 `parseDocument`, :324 `taskOwner` | [문맥 테스트](../../../lib/flow/integrated-poc/text-context-presentation.test.ts)의 root/child/grandchild owner 사례 |
| 반복 메모 속성은 같은 Item.note에 줄바꿈으로 합침 | vendor :331 | [입력 계획 테스트](../../../lib/flow/integrated-poc/text-input-plan.test.ts):32 |
| 메모 속성 줄 끝의 Enter/ShiftEnter는 기존 들여쓰기의 `- 메모:`를 반복 | [입력 계획](../../../lib/flow/integrated-poc/text-input-plan.cjs):25 `planMemoEnter`; [키 엔진 테스트](../../../lib/flow/integrated-poc/text-input-engine.test.ts):46 | 기존 native replacement를 새 parser나 두 번째 편집기로 바꾸지 않음 |
| 일반 문장·들여쓴 설명·fence·빈 줄·빈 체크 scaffold는 메모 owner를 임의 생성하지 않음 | vendor :235, :242, :296, :321 | 문맥 테스트의 ordinary/fence/orphan/empty 사례 |
| 이미 독립 등록된 check는 다시 들여써도 task registry와 진행 기록을 유지 | vendor :283 `stableTask`, :699 `assignNewTaskScopes` | [workspace 테스트](../../../lib/flow/integrated-poc/text-workspace.test.ts):31; 문맥 테스트의 registered child 사례 |

새 [readProgramMemoContext](../../../lib/flow/integrated-poc/text-context-presentation.ts)는 유효 direct owner의 ID·제목·현재 kind를 읽는다. 반환 정보는 표시용이며 편집 권한, 메모 변경 전이, 저장 성공을 부여하지 않는다. `task`와 `subcheck`는 현재 parse/registry를 따른다. 일반 문장·fence·orphan·빈 check·reference는 안내를 숨긴다. 제목의 HTML 같은 문자는 plain string으로 반환한다. React escaping과 실제 UI는 별도 컴포넌트 검사 대상이다.

참조에 메모 속성을 추가하는 일반 raw edit는 현행 writer가 거절한다. 따라서 reference negative는 유효 참조 줄과 의도적으로 구성한 지원 밖 참조-property snapshot을 구분했다. 후자는 읽기 보호 확인용이며 허용되는 저장 상태가 아니다. helper는 typed workspace를 받는 reader이고 임의 입력 전체를 검증하는 validator가 아니다.

빈 메모 줄 Enter를 종료 문법으로 바꾸기, 자연 본문을 Item.note로 승격하기, 공통/회차 메모를 자동 배분하기, 같은 제목을 병합하기는 이번 표시 변경에 포함하지 않는다.

## PC02 날짜 상속·예외·미정·이동

| 현재 계약 | source·심볼 | 표적 근거 |
| --- | --- | --- |
| 최상위 `[YYYY-MM-DD]`/`[미정]`은 다음 구획까지 기본값. `## 날짜`는 heading | vendor :189 `sectionDate`, :258 `parseDocument` | [구획 입력 테스트](../../../lib/flow/integrated-poc/date-section-input.test.ts):21 |
| 직접 `- 날짜:`가 구획보다 우선. 명시 미정도 개별 예외 | vendor :326 | 구획 입력 :29; [날짜 출처 테스트](../../../lib/flow/integrated-poc/execution-presentation.test.ts):79 |
| 날짜 속성 제거는 상속 복귀. 날짜 폼을 비우면 명시 `미정`을 쓰므로 서로 다름 | vendor :990 `updateTask`, :1014 `restoreTaskDate` | 날짜 출처 :90; [개별 날짜 입력 테스트](../../../lib/flow/integrated-poc/date-property-input.test.ts):26 |
| 구획 날짜 자체를 바꾸면 같은 구조의 상속 항목만 변경. 개별 예외·진행 이력 유지 | vendor :841 `pinStructuralDates`, :848 | 구획 입력 :21/:29 |
| 항목의 구조 이동은 기존 유효 날짜 보존. 필요할 때 날짜 속성을 pin | vendor :862/:886, :1321 `moveSubtree`, :1308 `movementPreservesMeaning` | 구획 입력 :37/:41; 개별 날짜 입력 :30 |
| 기간 날짜 변경은 같은 Item의 원문 날짜 속성만 바꾸고 원문 위치·메모·시간·기록 보존 | [private-space](../../../lib/flow/integrated-poc/private-space.ts):155 `updateProgramTask` → vendor :976; [ProgramSpace](../../../components/flow/integrated-poc/ProgramSpace.tsx):581 `dateMove` | [일정 문맥 테스트](../../../components/flow/integrated-poc/ProgramSpace.context.test.tsx):92 |
| 제품 날짜·시간이 같은 적용은 no-op. 순수 model의 같은 날짜 pin과 제품 wrapper를 구분 | private-space :162; [ProgramTextEditor](../../../components/flow/integrated-poc/ProgramTextEditor.tsx) `applyDate` | 일정 문맥 :106; [private-space 테스트](../../../lib/flow/integrated-poc/private-space.test.ts):240 |
| 문서 날짜 form에서 시간만 바꿔도 기존 handler는 날짜·시간을 함께 patch하므로 상속 날짜를 개별 고정 | ProgramTextEditor `applyDate`; vendor :990 `updateTask` | 문맥 테스트의 `the existing date-and-time model patch pins an inherited date`는 같은 ID·원문 위치·구획·메모·완료·소속·기록 보존까지 검사 |
| 날짜만 미정 이동은 시간 유지. 날짜·시간을 명시 비우면 시간 제거 | ProgramSpace `dateMove`/`applySchedule` | [문서 편집기 테스트](../../../components/flow/integrated-poc/ProgramTextEditor.test.tsx):719; [브라우저 UC6](../../../tests/e2e/ux-comparison-gaps.browser.ts):508 |
| 문서·오늘/주/월/미정은 같은 canonical ID를 읽는 projection | vendor :375 `tasks`; [execution](../../../lib/flow/integrated-poc/execution.ts):42 `programExecutionTasks` | [기간 테스트](../../../lib/flow/integrated-poc/execution.test.ts):209 |
| Today의 지난 미완료는 원래 날짜를 유지. 조회 날짜/폴더/검색은 표시 상태 | execution :42; [날짜 표현](../../../lib/flow/integrated-poc/execution-presentation.ts):14 | 기간 테스트 :164/:180/:192 |
| 원문 복귀는 정확한 document+line ID와 presentation checkpoint 사용. dirty/IME/회차 입력 보호 | ProgramSpace `openDocument`/`changePeriod`; [writing-navigation](../../../lib/flow/integrated-poc/writing-navigation.ts):8 | [원문 복귀 테스트](../../../lib/flow/integrated-poc/writing-navigation.test.ts):15/:27; [navigation 테스트](../../../lib/flow/integrated-poc/navigation.test.ts):117 |

새 `programTaskDateChangeHint`는 [기존 날짜 출처 reader](../../../lib/flow/integrated-poc/execution-presentation.ts)의 유효 결과와 달라진 날짜 draft에서 개별 지정 안내를 만든다. 날짜가 같더라도 optional `timeEdit`의 현재·입력 시간이 모두 유효하고 달라졌으며 출처가 아직 individual이 아니면, 기존 handler가 날짜도 개별 고정한다는 안내를 만든다. 이미 individual인 항목의 시간 변경, 같은 시간, 잘못된 시간에는 이 추가 안내를 숨긴다. 시간 변경 정보 없이 같은 날짜·이미 미정을 재적용하거나 invalid date draft·invalid source/null presentation인 경우도 변경 안내를 숨긴다. 날짜를 구획일과 같은 값으로 바꿔도 개별 지정이며, 안내를 상속 복귀로 표현하지 않는다. helper는 날짜·시간·원문 위치·구획·ID를 바꾸지 않고 기존 handler가 mutation을 책임진다.

후속 독립 정적 리뷰에서 ‘날짜 동일·시간만 변경’이 최초 안내의 맹점임을 발견했다. 현행 모델 메모리 검사에서는 구획 상속 `2026-10-04`와 시간 `09:00`을 날짜 동일·시간 `10:00`으로 patch했을 때 `explicitDate`가 false에서 true가 되고 `- 날짜: 2026-10-04`가 삽입됐다. root는 mutation을 그대로 두고 이 결과를 적용 전에 설명하도록 표시 helper·컴포넌트를 보완했다. 독립 테스트는 유효 시간 변경의 안내·읽기 불변성, 안내 숨김 대상, 실제 기존 model patch의 날짜 고정과 같은 Item 보존을 추가했다. 이 검사는 브라우저·서버 저장 검증이 아니다.

## 표시 보완과 정책 선택의 경계

이번 좁은 표시 후보는 선택한 메모 속성의 실제 owner, 문서 날짜 form의 현행 날짜 출처, 적용 시 개별 날짜가 된다는 결과다. 기존 ProgramSpace의 날짜 출처·미정 시간 안내는 이미 있으므로 새 기능으로 집계하지 않는다. 새 helper가 read-only 상태에 편집 권한을 추가하거나 접근 보호를 대체하지 않는다.

다른 구획 이동의 날짜 유지/따름 선택, 상속 복귀 버튼, 같은 날짜의 강제 fixed pin, 예정일에 따른 원문 자동 재배치, 예정일 변경 이력은 후속 정책이다. 현재 개인 TextTask의 날짜를 독립 due나 진행 기록일로 안내하지 않는다. due-only 노출·임박/초과·반복 회차 due와 공통/회차 메모는 PC03/PC04에서 별도로 결정한다.

시간만 바꾸는 경우 날짜 patch를 생략해 상속을 유지할지 여부도 별도 정책이다. 이번 보완은 이미 존재하는 날짜·시간 동시 patch를 설명하며, 새 고정 정책을 만들거나 기존 `applyDate`를 바꾸지 않았다.

## 독립 검사와 실행 경계

| 이번 실행 | 실제 결과 | 범위 |
| --- | --- | --- |
| node의 현행 vendor 모델 메모리 단언 | 8개 통과 | 구획/개별 예외, 미정 시간·위치 보존, 상속 복귀, raw no-op, 순수 model의 same-date pin, invalid patch, JSON roundtrip, 일반 메모 비승격. 파일/서버/storage/DB 없음 |
| `npx.cmd tsx --test lib/flow/integrated-poc/text-context-presentation.test.ts` 최초 | 22개 중 21PASS/1FAIL | reference fixture 준비에서 현행 writer가 속성 추가를 거절. helper 실패가 아니며 runtime 변경 없음 |
| 같은 단독 suite의 fixture 보정 후 | 22/22 PASS, exit0 | root/child/grandchild/canonical kind, 숨김 대상, plain-string 제목, 동결 JSON 불변, 개별/상속/미정 hint, equal no-op, invalid/null/비문자 입력 |
| 시간-only 발견의 표시 보완 후 같은 단독 suite | 25/25 PASS, exit0 | 위 22개와 시간-only 유효 변경 안내·숨김 negative·실제 model patch의 상속→개별 고정 증거 3개. runtime 수정 없음 |

최종 새 suite는 memo 13개, 날짜·시간 안내 11개, 기존 날짜·시간 model patch 1개로 총 25개다. 하나의 테스트 안에 여러 입력을 넣은 경우 이를 별도 실행 수로 더하지 않았다. 다른 담당자의 memo 진단·전체 regression·component/browser 실행은 이 수에 합산하지 않는다. 위 표의 이전 테스트 링크는 source를 읽은 근거이며 이번 실행 결과가 아니다. 초기에는 node_modules가 없었고 root의 설치 완료 후 단독 소유 suite만 실행했다.

실제 browser, IME·실기기, 원래 피드백 환경, Auth/API·서버 writer·DB·외부 도구 저장은 이 독립 담당자의 실행 범위 밖이다. 순수 모델 JSON roundtrip은 실제 서버 reload나 전체 UI Undo 증거가 아니다.

후속 합성 시뮬레이션은 같은 날짜/시간 재적용0쓰기, 닫기·Escape·native cancel, 저장 거절·stale CAS·quota/ACK, `[미정]`/개별 미정/구획 밖/잘못된 날짜, 미정 시간 보존·명시 시간 비움, 복합 구조 이동, Undo/Redo의 전체 상태, reload·기간 왕복·정확 원문 복귀, 같은 제목 다른 ID, 일반 메모 비승격을 포함한다. 저장 거절 중 전환이나 원문 복귀를 성공처럼 표시하지 않아야 한다.

## 파일 소유

이 독립 담당자의 생성 파일은 [text-context-presentation.test.ts](../../../lib/flow/integrated-poc/text-context-presentation.test.ts)와 이 `contract-audit.md` 두 개다. runtime helper·컴포넌트·CSS·manifest·나머지 문서·의존성 설치는 root 담당이다. commit·push·PR·배포·운영 반영은 이 담당자가 수행하지 않았다.
