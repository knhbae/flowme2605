# FlowMe 실사용 알파 전환 — 현재 실행 원장

9/24 최신: 사용자가 검증 반복을 줄이고 필수/후속 작업을 분리하는 순서를 승인했다. [제한 PC 사용 시작 판정](alpha-m7-2-personal-trial.md#924-현재--제한-pc-사용을-먼저-시작)을 따르며 실계정 복원 승인을 PC 사용의 차단 조건으로 삼지 않는다. 다음은 다기기 접속 준비와 별도 배포 승인 후 대표 왕복 확인이다. 원래 M7-2의 미실행 항목은 남기며 전체 완료로 바꾸지 않는다. 아래는 이전 진행 이력이다.

9/23 승인 후 **DEV 이력 개선·별도 QA 시험·로컬 앱 재시작 완료**. [적용과 검증 원장](alpha-m7-2-compact-inverse.md)에 API15/15·브라우저 저장/Undo/Redo/reload·백업 파일/미리보기·다섯 해상도 결과를 기록했다. 기존 계정2개·이력502건은 보존됐고 별도 QA에만9건 기록했다. 운영계·실자료 계정의 시험용 변경·발행0. M7-2 전체·실자료 독립 사본/명시 복원·실기기/일상 사용·전체 용량 및 미연결 콘텐츠는 여전히 남는다. 아래 ‘승인 전’은 직전 시점의 기록이다.

9/23 DEV 사전 확인: [원격/로컬 기준 대조와 실행 경계](alpha-m7-2-compact-inverse.md)를 기록했다. 관련10함수/권한 일치·로컬18검사 통과, compact 아직 미적용·자료 집계 hash 전후 동일이다. 실제 앱script3개400으로 재시작/초기 화면 재검증도 필요하다. 원격 적용·별도 QA 계정 검증은 승인 후이며 실제001/002·운영계·배포를 그 범위로 승격하지 않는다. M7-2 전체·독립 백업/명시 복원·실기기는 남는다.

9/23 저장·백업 경계 후속: [실패 재현·writer 지도·후속 단계](alpha-m7-2-compact-inverse.md)에 SQL26·백업 구성6·npm2255 통과를 기록했다. compact inverse가 있어도 저장 성공 뒤 전체 백업이 거절될 수 있음을 재현했으며, SQL 읽기 한정 rollback 후보는 메모리 DB 실험이지 제품 적용이 아니다. 제품 source·migration·실계정·원격 DB·발행 변경0. 기존 DEV 이력 개선 적용 승인과 제한 검증을 먼저 진행할 수 있고, 완전한 용량 계산/다른 writer/공용 증가·초과 계정 복구는 단계별 잔여다. M7-2 전체 완료는 아니다.

9/23 한도 실패 안내 후속: [현재 검사 기록](alpha-m7-2-compact-inverse.md)에서 native 문서/이력 한도와 서버-only 거절 사유를 구분했다. 모델7·관련119·서버/클라이언트35·컴포넌트 브라우저56·통합2293·npm2255·타입/build 통과다. 기존 한도·기록·권한·불확실한 저장 복구는 유지한다. 전체 앱 재검증은 미완료이며 격리 컴포넌트의 다섯 해상도 통과로 대체하지 않는다. 원격DEV·실계정·발행0, 다음은 DEV 적용/별도 QA 계정 사용 승인 후 실제 writer·Undo·백업 확인이다. 독립 사본·실제 복원·실기기·미연결 콘텐츠와 M7-2 전체는 남는다.

9/23 후속 승인: [문서400만 자 조정·검증](alpha-m7-2-compact-inverse.md#승인된-한도-조정-계획)을 로컬 완료했다. 사용자 요청에 따라 임시 자원 guard만 두 배 확대하고 원문/owner/actions128/계정·백업30MB와 검증 규칙은 유지했다. 경계9·초과 거절·공개100회 준비 문서의 저장/재열기/백업·통합2282·npm2255·타입/build 통과. 실제 백업 복사본100회 시험은70회 checkpoint 이후 중단해 미완료로 남기며 최종 Undo/백업과 혼동하지 않는다. 이 무거운 부하검사와 구조 개편은 후속 과제로 분리했다. 원격DB·실계정·발행 변경0이며 M7-2 전체 완료는 아니다. 아래200만 자 관련 판정은 직전 이력이다.

9/23 최신 진행: [신규 이력 중복 축소](alpha-m7-2-compact-inverse.md)와 bounded cache v3의 로컬 검증을 마쳤다. 표적45·SQL162·실자료 PG8전이·통합2273·npm2255·타입/빌드 통과. 실제 백업 복사본의15전이(4반입+작업본+10편집)·백업 왕복에서 과거 이력을 그대로 두고 신규 inverse 합계를 구 방식 비교99.35% 줄였다. 단일 문서100편집은 기존2M자 한도로 **미충족**이며, 다음 우선 갭은 문서 내부 이력의 손실 없는 중복 축소다. 경계 거절의 변경0과 마지막 유효 상태 백업은 별도 fixture로 통과했다. 원격 DB·실계정 변경0, DEV 적용은 별도 승인 전이다. 전체 백업 여유·장기 사용·M7-2 전체는 미완료다. 아래는 직전 측정 단계 기록이다.

9/23 최신: [백업 한도 적정성 측정](alpha-m7-2-backup-capacity.md)을 완료했다. Node18·최종 브라우저15·도구/경계9·회귀43·npm2255 통과이며 실제 계정/DB/제품 한도는 바꾸지 않았다. 현재30MB를 영구 정책으로 유지하거나60MB를 즉시 채택할 근거로 보지 않는다. 다음 우선 갭은 이력 중복을 줄이면서 Undo·과거 백업·저장 후 전체 백업 가능성을 보장하는 구현이다. 세부 단계·성능 경고·미실행 범위는 링크 원장을 따른다. 사용자 용량/요금제 결정 대기가 아니며 M7-2 전체는 미완료다.

9/23 추가 묶음 완료: [두 번째 연결 묶음](alpha-m7-2-catalog-wave2.md)에서 후보32개를 대조하고4개·28항목을 추가해11개·84항목 지원으로 확대했다. 격리 콘텐츠184/184·최종 압축 화면28/28·콘텐츠 재검사45/45, 통합2234/2234·npm2255/2255·build/타입/문서 통과다. 실제001/002 자료 변경0. 누적 자료의 JSON 포장 초과를 수정했지만 expanded30MB와 이력 증가 문제는 남는다. 다음 우선 갭은 기록 보존을 유지하는 용량 관리다. 전체166개 미연결·Map·독립 백업·실제 복원·일상 사용·실기기 및 M7-2 전체는 미완료다. 아래는 이전 단계 기록이다.

9/23 후속 구현: [자료실 → 제작 사본 → 개인 실행 연결](alpha-m7-2-catalog-editing.md)을 기존2개에서7개·56항목으로 확대했다. 전체177개/Map26개 열람과 편집 지원 수를 구분하며 새5개를 실제 계정에 자동 반입하지 않았다. 최종 판정·검사 수·잔여170개 분류는 해당 원장에서 관리한다. 실제 계정 복원·독립 백업·일상 사용·실기기는 남으므로 M7-2 전체 완료는 아니다.

9/23 현재: **기존 콘텐츠 전체의 비공개 보존·열람 완료, 전체 편집·실행 연결은 미완료**. [전체 반입·판정·잔여](alpha-m7-2-full-catalog.md): 002에 Flow177·Item957·구간371·Map26 및 현재 다른 판본2개를 원본 구조로 보존했다. 계정 r74→75 명령1건, 001·기존 제작 사본2개·개인 기록·공유 자료 불변. 표적70/70·통합2188/2188·npm2255/2255·빌드/타입 통과, 실제 브라우저34/34 및 독립 재검사37/37·다섯 해상도 확인. 반입 후 압축 백업1.67MB와 서버 preview 검증을 마쳤다. 다음은 반복·기간·표·Map 의미를 유지한 편집/개인 실행 사본 연결이며, 독립 사본·실제 복원·일상 사용·실기기와 M7-2 전체는 남는다. 공개·배포는 하지 않았다. 아래는 이전 단계 이력이다.

2026-09-23 최신: **M7-1 안전성 강화·운영 준비 준비 목표 완료.** [M7-1 요구 대응·검증·선택지](alpha-m7-1-readiness.md)에 R01–05 강화 결과와 R06–08 미실행/후속 조건을 기록했다. 실제 경합·손상/공개 경로50/50, 10,224,235bytes 백업9/9, UI66/66·20화면을 재검사했다. 전송 포장 크기 결함 수정, Windows 타입 검사 범위 수정과 테스트 fixture assert 보완까지 검증한다. 다음은 D03/D04 확인 후 M7-2 제한 실자료 시험이며 M7 전체·정책/실기기·배포가 완료된 것은 아니다. 아래 M6 ‘현재’는 직전 이력이다.

2026-09-23 현재: **M6 개발계 목표 완료.** [M6 실행 기록](alpha-m6-preservation.md)에 요구별 종료 판정·최종 브라우저 66/66·20화면·QA 정리와 잔여 M6-R01–08을 분리했다. 보고서 HTML 시각 검사는 도구 제한으로 미실행이며 사용자 확인을 목표 종료의 필수 승인으로 요구하지 않는다. 다음은 M7 실사용 준비다. 강화 검사·실기기/관찰·실사용/배포와 D03–D05 결정은 남으며 M6 완료가 이를 승인하지 않는다. 아래 9/21 M5 ‘현재’는 당시 완료 이력이다.

2026-09-21 현재: **M5 공개 탐색·공유·커뮤니티의 개발계 구현·검증 완료**. 요구12흐름·실제 API153/153·사진54/54·UI140/140·20화면·통합2025/2025·npm2255/2255·build 및 QA 자료 정리 근거는 [M5 실행 기록](alpha-m5-social.md)을 따른다. 다음은 M6 실제 자료 이관·전체 백업/복원·업데이트 호환이다. 전체 서비스 공개 정책(D05)·실기기/관찰·실사용·배포(M7)는 남는다.

직전 완료 이력: **M4 제작·저장 이력 개발계 목표 완료**. `/alpha`에서 제작 작업본·명시 저장 판본·개인 인계를 계정별 서버 거래에 연결하고 충돌·응답 유실·미반영 입력 보호를 검증했다. 당시 실제 실행 수·요구별 적용 범위·화면 평가·실패 이력은 [M4 실행 기록](alpha-m4-authoring.md)을 따른다. 이후 M5·M6의 개발계 목표도 완료했으며 M7은 남는다. 부모 A 요구의 모든 원자 조건 완료로 확대하지 않는다.

**직전 단계 이력 — 2026-09-21 M2 종료 시점.** M0와 PR #203 코드 병합, M1 로컬 저장·복구 계약에 이어 M2 개발계 인증·권한 목표를 완료했다. 실제 두 계정 가입/메일 확인 서버 기록·사용자 복구 성공·새 비밀번호 실브라우저71/71·자연 만료23/23과 개발 데이터/권한 사후 확인을 마쳤다. 실패 이력·검증 범위·외부 잔여 준비는 [M2 기록](alpha-m2-auth.md)을 따른다. 당시 다음 단계였던 M3는 이후 승인으로 착수했으며 현재 상태는 위 요약과 [M3 기록](alpha-m3-sync.md)을 따른다. M2 완료를 서비스 전체 실사용·배포 완료와 혼동하지 않는다.

## 완료 이력 — M1 계정별 저장·명령·복구

사용자가 다음 M1 목표 설정과 실행을 승인했다. 최신 `origin/main` `efd8b642`와 일치하는 깨끗한 격리 worktree에서 `agent/alpha-m1-persistence-20260921`로 구현했다. 표적40/40, 전체 통합1789/1789, 기존 npm2255/2255, strict0·build·docs 검사를 완료했다. 전체 통합 후 마지막 백업 거절 조건을 보완한 재검증 범위까지 [M1 계약·계획·검증 결과](alpha-m1-persistence.md)에 기록했다. 실제 로그인·DB 연결·배포는 M1에 포함하지 않는다.

PR #203은 main에 병합됐고 병합 후 [CI](https://github.com/knhbae/flowme2605/actions/runs/35539633782)도 성공했다. 아래 Git 보존·머지 준비 문단은 날짜별 이력이다. 이전 목표에서 확인한 자동배포 차단은 유지하며 이번 목표에서 발행 작업을 수행하지 않는다.

M1 전 Git 보존 기준점은 코드 commit `181302ed`·작업 branch push·[Draft PR #203](https://github.com/knhbae/flowme2605/pull/203)으로 만들었다. [사용자 결정](../../DECISIONS.md#2026-09-20---실사용-알파-인증가입무료-검증과-발행-권한)을 반영하고 승인된 출처 기한·취약점·공개본 재현 의존성을 수정했다. [보존 검사와 발행 결과](git-preservation-2026-09-20.md)에 실패·재검증·공개/로컬 증거를 구분해 남겼다. hook 우회·main merge·배포는 하지 않았다. 아래 M0 완료 기록은 과거 문서 목표 범위다.

보존 재검사에서 출처·취약점을 처리하고 현행 통합 브라우저3경로를 추가했다. 다만 기존 v4.1 브라우저 검사 대표1개는 옛 Surface/저장 owner를 전제해 현행 Program에서 실패했다. PR도 main 충돌 상태이고 CI 실행 결과가 없다. 전체 E2E/merge-ready가 아니며, M1 착수 전 현행 요구와 회귀 검사의 대응·역사 재현 경계 및 충돌 통합 계획을 정리해야 한다. 상세 실행과 공개·로컬 증거 분리는 위 Git 보존 원장을 따른다.

## 완료 이력 — 자동배포 차단 후 PR #203 코드 병합

2026-09-21 KST 사용자가 '자동배포를 먼저 차단한 뒤 PR #203을 main에 코드만 병합'하는 권고를 승인했다. 아래 머지 준비 목표는 완료됐으며, exact head `4be9878b`의 [CI](https://github.com/knhbae/flowme2605/actions/runs/35524317591)에서 core와 전체 E2E 760/760이 통과했다. 이는 요구사항 전체 완료나 서버 실사용 검증을 뜻하지 않는다.

이번 후속 작업은 저장소의 Vercel Git 자동배포 차단, 필요한 검증·commit/push, PR ready 전환·main 병합과 배포 무발생 확인까지다. Preview/Production 배포, DB/Auth/환경변수 변경, M1 기능 구현은 승인 범위 밖이다. 아래 과거 기록의 merge 미승인 문구는 당시 범위이며 이 후속 승인으로 PR #203 코드 병합에 한해 대체한다. 실행 결과는 [머지 실행 원장](merge-readiness-2026-09-20.md)에 기록한다.

## 완료 목표 — PR #203 머지 준비

2026-09-20 사용자가 다음 목표 등록을 요청했다. v4.1·개발1·개발2의 요구를 보존하면서 충돌·회귀 문제를 해결하고, 충돌 없는 PR과 필요한 CI 통과를 확인한 뒤 실제 main 머지 승인을 요청한다. [단계·충돌·검증 실행 원장](merge-readiness-2026-09-20.md)에서 진행을 관리한다. 실제 main 머지·배포·외부 설정·M1 기능 구현은 포함하지 않는다.

권장 추론은 GPT-6 Astra / Extra High(xhigh)다. 전체 요구·양쪽 코드 의미·데이터 경계·회귀를 함께 다루는 이번 목표의 권고이며 실제 세션 설정 변경을 주장하지 않는다. 단일 난제에 Max가 필요하면 이유를 먼저 알린다.

## 지금 어디까지 왔나

2026-09-23 현재 M1–M6의 개발계 목표를 완료했다. [M6 종료 판정과 잔여 원장](alpha-m6-preservation.md)을 기준으로 다음은 M7 실사용 준비다. 계정별 이관·백업·복원 구현 완료와 실제 사용자의 원본 귀속·운영 복구·배포 승인은 구분한다. 중요한 자료의 유일본 투입은 아직 권하지 않는다.

2026-09-21 M5 완료 이력: 기존 개발1·개발2 화면을 실제 두 계정의 catalog·선택 사본·불변 공개판·제안/검토·사진/참여에 연결했다. 계정/공유 이중 CAS, 당사자 제안 projection, opaque 별칭/사진 경로, 개인 기록과 공유 원본의 경계를 검증했다. [M5 원장](alpha-m5-social.md)에 실제 API/화면/도메인 근거와 남은 정책을 구분했다.

직전 **M3 개인공간 서버 저장·동기화의 개발계 목표**도 완료 상태를 유지한다. 기존 개인 문서·폴더·기간·이동·반복/Map·출력의 결과와 한계는 [M3 기록](alpha-m3-sync.md)을 따른다. 제작 연결은 후속 M4, 공개/커뮤니티 서버 연결은 M5에서 개발계 범위를 완료했다. 실제 자료 이관과 실사용·배포는 남았다. 최초 가입 화면의 직접 관찰, Google·일반 사용자 SMTP 등의 잔여 준비는 [M2 기록](alpha-m2-auth.md)에, 실기기·관찰 사용자 범위는 M7에 남긴다.

이 문서는 기존 프로그램의 **실사용 전환 작업 상태를 관리하는 유일한 원장**이다. 별도 사업 계획이나 새 제품 요구사항 목록을 만들지 않는다. 기존 spec/원자 요구는 원래 문서에, 과거 실행 증거는 원래 보고서에 그대로 둔다. 상위 계획·상태 문서는 이 파일을 가리킨다. 이번 문서 작업의 실제 검사 결과는 [정합화 QA](alpha-transition-qa.md)에 둔다.

| 읽고 싶은 내용 | 위치 |
| --- | --- |
| 무엇을 이어받고 무엇이 달라지는가 | 아래 정본과 충돌 조정 |
| 기능별 현재 상태·다음 단계 | A01–A24 요구 대조표 |
| 전체 순서·단계별 완료 조건 | M0–M7 실행 계획 |
| 최근 완료한 개발 묶음 | [M5 공개·공유·커뮤니티 결과·한계](alpha-m5-social.md), 직전 [M4 제작·이력](alpha-m4-authoring.md) |
| 확정 답변과 아직 정해야 할 것 | D01–D07 결정 상태 |

M0 당시 승인 범위는 조사·설계·문서 갱신·문서 검사였으며 해당 단계에서 외부 변경·commit/push/PR/배포를 하지 않았다. 후속 Git 보존 목표에는 필요한 commit/push·Draft PR 준비와 기존 검증 실패·취약점 수정이 승인됐다. DB 테이블/Auth/Storage, 환경변수, 기존 사용자 데이터, 유료 설정, 추가 프로젝트 생성, merge·배포는 여전히 범위 밖이다. 이후 M1–M7 단계가 이 문서에 적혀 있다는 사실만으로 해당 구현·외부 작업을 승인한 것은 아니다.

위 문단은 M0/Git 보존 당시 경계다. 9/21 M2 착수 승인으로 allowlisted **개발 프로젝트의 빈 계정·권한 migration과 인증 연결**을 실행했다. 이후 별도 승인한 localhost Auth URL도 저장·확인했다. 후속 M3 승인에 따른 개발계 저장 migration과 개인 화면 연결은 [M3 실행 범위](alpha-m3-sync.md)를 따른다. 운영 데이터·배포·유료 설정·기존 자료 이관 권한으로 확대하지 않는다.

## 정본과 판정 기준

| 근거 | 현재 역할과 한계 |
| --- | --- |
| [7월 데이터 spec](../2026-07-11-canonical-flow-data-model/spec.md), [저장/API 계약](../2026-07-11-canonical-flow-data-model/storage-api-contract.md), [tasks](../2026-07-11-canonical-flow-data-model/tasks.md) | SourceRow→Item→Step→Flow→Bundle, private/public/version 분리·RLS·CAS·이관의 출발점. 설계 승인이지 서버 구현 증거가 아님. 당시 URL/AI 선행 순서를 이번 수동 작성·다기기 알파의 필수 조건으로 복사하지 않음 |
| v4.1 원본 spec (로컬 전용 근거: `../../../../flow-mvp/docs/specs/2026-09-01-personal-workspace-v4-1-prototype/spec.md`), [v4.1 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/v41-audit.md) | 원본 spec은 이 격리 checkout에 없고 인접 원본 저장소에 있음. 읽기 참조만 사용, 복사·수정하지 않음. 폴더/날짜/순서의 의미와 48px 터치 동작 보존 |
| [개발1 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d1-audit.md), [개발2 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d2-audit.md), [요구 목록](../2026-09-05-flowme-integrated-poc-ux-audit-v1/coverage-inventory.md) | 세 결과물 및 BP의 원자 요구·의사결정 대체 관계. 이번에는 정본화된 감사 기록을 읽었으며 원대화 전체를 다시 읽었다고 주장하지 않음 |
| [통합 실행 spec](spec.md), [과거 계획](plan.md), [진행 기록](progress.md), [요구 원장](coverage-ledger.md) | P01–P08의 승인된 통합 의미. 과거 제목에 남은 ‘진행 중/K4 미구현’은 날짜별 이력이며 최신 상태가 아님 |
| [최종 평가](final-evaluation-2026-09-20.md), [S01–S10 시나리오](final-scenario-ledger-2026-09-20.md) | 9/20 기능형 PoC 대표 경로 완료의 증거. 모든 원자 UX 동등성, 서버 보안, 실제 기기·관찰 사용자 검증의 증거가 아님 |
| [원 요구 참조 매핑](alpha-requirement-routing.json) | 기존 부모254/하위424를 잃지 않기 위한 ID→A 요구 연결. 원래 본문/판정/체크 상태는 복제하지 않음. 하위 조건은 원본 parentId의 A 경로를 상속하며 같은 단계에서 개별 증거를 확인 |

대조표의 `재사용`은 모델·컴포넌트·검사를 이어받는다는 뜻이다. `수정 필요`는 알파 조건에 맞게 저장/연결을 바꾸는 일, `미구현`은 실제 서버 실행 경로가 없는 일, `미검증`은 해당 범위의 실행 증거가 없는 일이다. `보류`는 사라진 요구가 아니라 결정 또는 별도 승인 대상이다. **배포된 통합 알파의 실사용 검증은 미실행**이다. M2의 실제 인증과 M3의 개발계 서버·브라우저 검증은 각각의 실행 기록에 한정한다. M1의 합성 자료·fake-server 결과는 아래에 별도 기록하며 과거 PoC나 M1 PASS를 실제 서버 PASS로 올리지 않는다. 부모와 하위 조건을 더하거나 테스트 개수로 완료율을 만들지 않는다.

## 환경 기준점 — 9/20 조회 이력

2026-09-20 읽기 조회로 두 프로젝트 모두 `ACTIVE_HEALTHY`, `public` 테이블 목록 `[]`를 확인했다. 이것은 모든 schema/Auth 사용자/Storage 객체가 비어 있다는 증거가 아니다. 아래 표는 당시 기준점이며 현재 개발 DB가 비어 있다는 뜻이 아니다. 이후 개발계 인증·권한 적용은 [M2 기록](alpha-m2-auth.md), 개인 저장 적용과 최종 검증은 [M3 기록](alpha-m3-sync.md)을 따른다.

| 역할 | 실제 식별자 | 확인된 사실 / 미완료 |
| --- | --- | --- |
| Supabase 조직 | `Flowme` / `ottkvrramtqszwoncwvo` | 앞선 계정 조회에서 Free 확인. 플랜 변경·결제 없음 |
| 개발계 | [flowme-dev](https://supabase.com/dashboard/project/wkmzcxpnojobxrgebapw) / `wkmzcxpnojobxrgebapw` | 사용자 승인 후 9/20 10:03:29 UTC 생성. 생성 비용 조회 월 $0·전용 확인 절차 후 실행. `ap-northeast-1`. 이번 목표에서는 조회만 함 |
| 운영용으로 확보 | [knhbae's Project](https://supabase.com/dashboard/project/ldellkztijrijbpwthjl) / `ldellkztijrijbpwthjl` | 사용자가 FlowMe용이라고 확인. `ap-northeast-1`. 이름 변경·테이블 생성·설정 변경 없음. 아직 실사용 DB로 연결하지 않음 |
| Vercel | 기존 `flowme2605` | 후속 Git 보존 때 읽기 UI로 연결 프로젝트1개·저장소 루트·Deploy Hook 없음을 확인. branch 자동배포 차단을 저장소에 추가. 9/20 13:02 UTC 목표 시작 이후 새 배포0. 알파 프로젝트·URL·개발/운영 환경 연결은 미설정 |
| 현재 개발 코드 | branch `agent/personal-workspace-v4-1-poc-20260901`, 코드 보존 `181302ed` | M0 시작 HEAD `6e4b44fe`, modified189/untracked478. 후속 보존 commit/push·Draft PR 완료. 원래 `flow-mvp` dirty 자료는 수정·정리·stage하지 않음 |

월 $0은 당시 신규 개발 프로젝트 비용 조회 결과이지 운영 전체 비용 보장이 아니다. 키·비밀번호·토큰은 이 문서나 채팅에 기록하지 않는다. 운영용 프로젝트 ID를 개발 실행에 주입하면 시작/쓰기/테스트가 실패하도록 M1–M2에서 검증한다. 앱 build와 CI에서 자동 migration을 실행하지 않는다.

## 기존 설계와 현재 코드의 충돌 조정

아래는 전환의 설계 방향과 미결 정책이다. 개발계 DDL·이메일 인증·개인 저장의 현재 적용 범위는 [M2](alpha-m2-auth.md)와 [M3](alpha-m3-sync.md)를 따른다. 보존 기간·최종 Undo/오프라인 정책은 미확정이다. 로그인 방향은 Google 우선·이메일 대안이며 Google 제공자는 아직 설정하지 않았다.

1. **한 저장 묶음과 실제 계정 격리.** [ProgramData](../../../lib/flow/integrated-poc/contract.ts)는 모든 `actors/spaces/public/receipts`를 담고, [실제 진입점](../../../components/flow/integrated-poc/ProgramApp.tsx)은 localStorage를 주입한다. 이 envelope 전체를 모든 사용자에게 내려주는 DB 저장으로 바꾸지 않는다. 인증된 서버 identity가 owner를 결정하고, 개인 자료/공개 DTO/서버 전용 자료를 분리한다. 클라이언트 actor 선택이나 `owner_id` 입력을 권한 근거로 사용하지 않는다.
2. **Flow 없는 원문.** 7월 `CanonicalFlowContent` 최소 Flow/Step/Item 조건을 자유 메모에 강제하지 않는다. 문서·행·sidecar·폴더·참조는 독립 private aggregate다. 명시 해석/개인 인계/공개 때만 실제 Flow lineage를 만든다. raw-only 저장이나 가짜 source Item으로 축소하지 않는다.
3. **ID와 버전.** 문서/행 ID, savedCopyId+flowId+itemId, Map owner/child, native sourceRow/item, series/occurrence, 공개 version, mutable revision을 구분한다. 기존 문자열 ID를 UUID로 바꾸며 새 항목으로 취급하지 않도록 owner+origin+legacyID 대응을 둔다. 제목·배열 위치·content hash를 identity 대신 쓰지 않는다.
4. **실행 기록.** 7월 단일 active run/완료 스냅샷을 날짜별 누적 progress·반복 회차·개인 기준일 전체의 대체물로 쓰지 않는다. 원문 일정/계획 기준일/실행 날짜/기록 날짜/조회 날짜를 따로 보존한다. `[1]`와 `[1.0]`, COUNT 의미를 DB 이전 과정에서 바꾸지 않는다. 실제 run 연결은 M1 계약 검토 사항이다.
5. **임시 입력과 저장 판본.** native working, pending raw, recovery, 명시 saved revision, 원본 후보/결정, 개인 인계, 공개 판본은 다른 확정 경계다. 자동 동기화가 이를 한 최신 문자열로 합치거나 원문을 자동 materialize하지 않는다.
6. **로컬 CAS와 서버 거래.** [program-store](../../../lib/flow/integrated-poc/program-store.ts)의 exact bytes/readback 및 [ProgramApp](../../../components/flow/integrated-poc/ProgramApp.tsx)이 [controller](../../../lib/flow/integrated-poc/controller.ts)에 주입하는 Web Locks는 같은 브라우저 탭 보호다. 서버에서는 owner 확인·expectedRevision 조건부 갱신·idempotency·거래 범위를 함께 검증한다. 다른 기기 변경 알림은 정본이 아니며 재조회 후 반영한다. 영구적인 local/server 이중 정본과 조용한 last-write-wins는 쓰지 않는다.
7. **Undo와 취소의 시간 경계.** 로컬 개인 snapshot Undo를 서버 전체 되감기로 바꾸지 않는다. 다른 기기의 후속 변경을 검출하는 개인 범위 보상 거래가 필요하다. 요청 전 취소/no-op/Escape는 mutation0; 전송 후 응답이 끊긴 요청은 ‘실패·취소0’으로 단정하지 않고 같은 request ID로 결과를 조회한다. 서버 성공이 확인된 뒤에만 저장됨 표시, 화면 갱신 실패는 별도 처리한다.
8. **공개와 파일.** 기존 공개 allowlist/불변 판본/철회 후 사본 기록 보존을 서버에서도 검증한다. 커뮤니티 dataUrl 사진은 object storage·권한·메타데이터·삭제 관계를 설계해야 한다. 임의 서버 URL fetch/AI/외부 Calendar OAuth는 현재 출력 기능을 잇는 선행 조건이 아니다.
9. **이관과 복구.** 7월 import allowlist에는 새 Program·native context 전체가 없다. 원본 key를 읽어 preview→사용자 귀속 확인→명시 commit→개수/identity/hash/투영 대조로 이전하고 원본은 보존한다. 시뮬레이션 actor·공개 샘플을 실제 타인의 계정이나 서비스 공개물로 자동 승격하지 않는다. 지원 불명 자료는 버리지 않고 원본 백업과 미매핑 사유를 남긴다.
10. **업데이트 rollback.** 7월의 `server-primary → local` flag만으로 최신 서버 자료를 복원할 수 없다. 호환 앱 rollback 또는 쓰기 중지+현재 서버 스냅샷 확보+검증된 재동기화를 우선한다. 복구 가능한 데이터 시점·누락 범위를 확인하기 전 오래된 로컬 자료로 덮어쓰지 않는다. DB는 additive/forward-fix, 복원은 분리 환경에서 연습한다.
11. **범위와 과거 임시값.** v4.1 최초 폴더2단계, PoC actor8/history80/30MB 상한은 운영 상품 정책이 아니다. 최신 text 모델의 트리/자원 제한, 별도 Flow 폴더 상속, 문서 참조를 구분해 재검토한다. 초기 Todo 제안보다 후속 D1 Text-first 결정이 우선이고, D2 작성 틀별 결과 정책은 별개다. 옛 K4 미구현 표시는 후속 구현 근거와 연결하고 역사 본문은 지우지 않는다.
12. **틀 선택과 구조 입력의 확정 시점.** D2-049는 단순 template 선택 자체를 명시적 1회 TXT 삽입으로 정하고 이전의 별도 materialize 단계를 대체했다. M4에서 빈 원문의 단순 틀 선택을 그 의미로 수정했고, 완성 예시·사용자 StructureDraft는 미리보기 후 명시 적용으로 구분했다. non-empty/조합 입력/오래된 선택은 적용하지 않는다. 이는 원 결정의 복구이며 틀 전체를 자동 적용하는 새 제품 정책이 아니다. [M4 요구 대조](alpha-m4-authoring.md)를 따른다.

Supabase 공식 자료를 9/20 확인했다. 새 테이블의 **GRANT와 RLS는 별도**이므로 둘 다 검증한다([변경 안내](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically), [API 보안](https://supabase.com/docs/guides/api/securing-your-api)). view/RPC도 권한 우회가 없어야 하며 secret/service-role은 브라우저에 넣지 않는다. DB 백업에는 Storage 파일 본체가 포함되지 않으므로 전체 복구에는 파일도 필요하다([백업 문서](https://supabase.com/docs/guides/platform/backups)). 이메일 인증을 선택하면 기본 테스트용 발송을 운영 메일로 간주하지 않는다([SMTP 안내](https://supabase.com/docs/guides/auth/auth-smtp)). 실제 구현 시 다시 확인하며 이번에는 설정을 바꾸지 않았다.

## A01–A24 요구 대조표

원래 V41/D1/D2/BP ID 전체의 연결은 `alpha-requirement-routing.json`을 따른다. 아래 A 행이 현재 전환 판정의 정본이며 각 원자 조건의 ‘현재 충족’까지 대신하지 않는다. 기존 19개 의사결정 이력·14개 decisionRows도 원래 [inventory](../2026-09-05-flowme-integrated-poc-ux-audit-v1/coverage-inventory.json)에 보존하며 M1에서 상충하는 UI/정책만 D07로 올린다.

| ID / 출처·요구 | 현재 코드·증거 | 전환 판정 / 단계 | 알파 완료 조건과 검증 |
| --- | --- | --- | --- |
| A01 환경 분리 / 이번 사용자 결정·7월 §13 | 위 실제 프로젝트 조회, [M2 환경·검증](alpha-m2-auth.md), [package](../../../package.json) | M1 계약과 M2 개발 전용 gate 구현; 실제 배포 환경 미설정 / M1,M2,M7 | dev/test/preview에서 운영 DB·Auth·bucket·redirect 접속 거절, env 누락 시 fail-closed, build DB쓰기0, 운영 fixture 주입0 |
| A02 다중 계정·권한 / 사용자 결정·7월 §6 | [actor/space 계약](../../../lib/flow/integrated-poc/contract.ts), [M2 인증·RLS](alpha-m2-auth.md) | API49·SQL9·비메일30·자연 만료23 PASS; 실제 refresh/로그아웃 잔여 JWT/삭제 파일 접근 거절. 사용자 계정 삭제는 미실행 / 개발 M2 완료 | 두 실제 계정+anonymous로 테이블/API/RPC/파일 직접 읽기·쓰기 음성 검사, owner 위조·토큰 만료·삭제된 대상 거절 |
| A03 계정 전환·입력 보호 / D1-003,004,011,016,018·P08 | [App 복구 검사](../../../components/flow/integrated-poc/ProgramApp.external-recovery.test.tsx), [publisher 복구](publisher-external-recovery-review.md), [M2 인증 UI](alpha-m2-auth.md), [M3 입력 보호](alpha-m3-sync.md) | 개인 편집 연결·계정/탭별 sessionStorage 복구 구현·개발계 M3 범위 검증 완료. 탭 종료 후 영구 보존은 미포함 / M2,M3 | A 로그아웃→B 로그인 후 A 입력·캐시·응답·구독 노출0; 같은 계정의 reload/재인증 후 보관 입력 비교·복사·명시 복구/폐기, 지연 A 응답 무시. M3는 재조회 기반이며 이후 구독 연결도 같은 격리 조건을 따름 |
| A04 독립 문서·폴더·참조·휴지통 / P01·v4.1 | [text-workspace](../../../lib/flow/integrated-poc/text-workspace.ts), [P01 평가](final-evaluation-2026-09-20.md), [M3 개인 저장](alpha-m3-sync.md) | 기존 화면·private transition의 서버 저장 연결 구현·개발계 M3 범위 검증 완료 / M1,M3 | 원문/행/sidecar/순서/참조/보관·휴지통 상태 round-trip; Flow 생성 없는 독립 문서; 폴더 삭제 내용 보존; 참조가 실행 복제하지 않음 |
| A05 QuickItem·네 origin·identity / V41-002·D1-001,007–009,024·P03 | [identity 계약](../../../lib/flow/personal-workspace-poc-contract.ts), [legacy-entry 검사](../../../lib/flow/integrated-poc/legacy-entry.test.ts), [네 origin](whole-two-b-origins-review.md), [M6 선택 이관](alpha-m6-preservation.md) | QuickItem·네 origin·개인 identity의 명시 이관을 구현하고 합성 QA 원본의 실제 DEV 계정 왕복을 검증했다. 사용자 실제 원본의 계정 귀속/이관은 D04 미결로 미실행 / M1,M3,M6 | 네 origin+QuickItem 충돌 없는 대응표, 재import 중복0, 정체성·원문/개인 기록 보존. M3 명령은 기존 source snapshot을 임의로 최초 반입/삭제하지 않으며 최초 반입은 M6 명시 이관 경로 |
| A06 날짜·폴더·순서 이동 / V41-003–020·P02/P08 | [v4.1 원 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/v41-audit.md), [S03](final-scenario-ledger-2026-09-20.md), [M3 이동 연결](alpha-m3-sync.md) | 기존 이동 명령의 서버 연결·350ms/8px 원 요구 복구 구현·개발계 M3 범위 검증 완료. 실제 기기 동등성은 미검증 / M3,M7 | drag/350ms long-press/메뉴/키보드 동일 명령; 8px 이상 이동 취소·Escape/pointer cancel/동일위치0거래; Flow Item 폴더 상속, 날짜 이동이 원본/Flow 소속 불변 |
| A07 오늘·주·월·미정·시간순 / V41-021–028·P02 | [개인 surface](../../../components/flow/integrated-poc/ProgramSpace.tsx), [개인 실행 평가](weekly-execution-map-review.md), [M3 기간·순서 저장](alpha-m3-sync.md) | 기존 기간 화면·날짜 context별 order의 서버 저장 연결 구현·개발계 M3 범위 검증 완료 / M3 | 같은 target의 기간/문서/Flow 일치, 날짜 context별 직접 정렬/시간순 복귀, 빈 날짜 펼침·날짜 중복 표시 대조 |
| A08 완료·날짜별 누적·반복 / D2-016·P02 | [recurrence 상태](../../../lib/flow/integrated-poc/recurrence-state-contract.ts), [주간 평가](weekly-execution-map-review.md), [M3 실행 저장](alpha-m3-sync.md) | 기존 누적/반복 모델·개인 실행 화면의 서버 연결 구현·개발계 M3 범위 검증 완료. 공개 원본 변경은 M5 / M1,M3 | 같은 회차 identity, 날짜별 누적값 비합산, 완료/다시열기/지난값 수정, 미래 계획 변경 후 과거 기록 보존; COUNT 안내는 기존 의미 유지 |
| A09 Map 구조·기준일·품질 / D1·P02/P03/P07 | [Map 계약](../../../lib/flow/integrated-poc/program-legacy-map-plan-contract.ts), [Map 근거](map-b-execution-review.md), [M3 Map 보존](alpha-m3-sync.md) | 기존 개인 Map 화면·aggregate 저장 연결 구현·개발계 M3 범위 검증 완료. 합성 fixture 근거를 실제 Map 자료 이관/live UI 전체 검사로 확대하지 않음 / M1,M3,M6 | 공통/개별 고정 기준일·child ID·포함/복원·품질 보류 유지, 빈/추가 child 지원 경계 명시, 다른 자료로 성공 대체 금지 |
| A10 공개 탐색·부분 가져오기 / D1-017,019·P03 | [Discovery](../../../components/flow/integrated-poc/ProgramDiscovery.tsx), [S05](final-scenario-ledger-2026-09-20.md), [M5 연결·근거](alpha-m5-social.md) | 기존 UI/도메인 재사용·DEV 계정 catalog/선택 사본 연결 구현. 실제 API와 브라우저 검사 범위는 M5 기록 / M5 | 공개 검색과 개인 saved 검색 분리, 필터/스크롤 복귀, A 공개본→B 선택 사본/기준일→다중 문서 참조; 중복 요청1건 |
| A11 URL·무저장 출력·형식 / D1-021–026·P04 | [output](../../../lib/flow/integrated-poc/output.ts), [private-output](../../../lib/flow/integrated-poc/private-output.ts), [결과 정책](creator-template-result-review.md), [M3 개인 출력](alpha-m3-sync.md), [M5 공개 출력](alpha-m5-social.md) | 개인·공개 TXT/CSV/ICS와 exact `/alpha` 고정판본 복귀 연결. 로컬 개발 주소 실제 bytes/무저장 왕복 검사, 배포주소·외부 앱 import는 미실행 / M3,M5,M7 | 원문 TXT와 선택 TXT/CSV/ICS 구분·실제 bytes 대조, 출력만으로 서버 저장0·미정 ICS 안내. 미지원URL 예시대체0; 외부 import는 별도 실행 증거 |
| A12 native 편집기·작성 틀·속성 / D2-035,036,038,040,041,049·P06 | [CreatorWorkspace](../../../components/flow/integrated-poc/ProgramCreatorWorkspace.tsx), [M4 적용 범위](alpha-m4-authoring.md) | 계정 저장 연결·D2-049 단순 틀 선택=삽입 수정·개발계 검사 완료. 실제 OS IME 미검증 / M4,M7 | 빈 원문 예시·여섯 틀/16속성·네 범주·미완성 원문 허용. 단순 틀/예시/구조 적용 구분, 명시 적용 한 거래·둘러보기/취소0, native Undo/Redo·48px; ghost는 원문에 저장 안 함 |
| A13 working/saved/pending/recovery / 개발2 이력·P06 | [제작 계약](../../../lib/flow/integrated-poc/creator-workspace-contract.ts), [M4 복구 한계](alpha-m4-authoring.md), [M6 선택 이관](alpha-m6-preservation.md) | 제작 semantic 저장·명시 판본/working 분리·탭별 보호 구현. M6에서 QA native 후보의 명시 이관·원문/이력·구/신 앱 재접속 26/26 검사. 사용자 실제 원본 계정 귀속과 보조 선택 자동 재적용은 미실행 / M4,M6 | 첫 저장 전/후 미반영 입력, saved identity·context·journal·이력 보존. 자동 저장을 명시 저장본으로 합성하지 않음. 계정/독립 클라이언트 충돌에서 입력 보존. sessionStorage는 영구 백업 아님 |
| A14 원문 갱신·정렬·개인 인계 / D2-018·P06/P07 | [원문 정렬](whole-two-b-weekly-order-review.md), [M4 서버 경계](alpha-m4-authoring.md), [native lineage](../../../lib/flow/integrated-poc/creator-native-lineage.ts), [M6 이관 검증](alpha-m6-preservation.md) | 제작 전용 서버 거래·raw 개인 인계/업데이트 실제 API/UI 검사 완료. native 후보는 합성 QA 원본으로 실제 DEV 계정 이관·M5 fail-closed·M6 재접속을 검사했다. 사용자 실자료 이관은 D04 보류 / M4,M6 | 원문 정렬과 TimelineOrder 분리, candidate→decision→apply→save→개인 수용 분리, CRLF/한글/하위구조·부분연결·원본전용 Undo 영향 검사 |
| A15 선택 공개·불변 판본·철회 / 개발2·P06/P07 | [publication](../../../lib/flow/integrated-poc/publication.ts), [철회 근거](final-output-withdraw-review.md), [M5 거래](alpha-m5-social.md) | DEV semantic publish/철회·private allowlist·계정/공유 이중 CAS·불변판본 구현. 실제 두 계정 검사, 전체 외부 공개 정책은 D05 보류 / M5 | private allowlist 배제, owner 검증·atomic publish, 현재pointer 경쟁409, 철회 후 구판/사본/개인기록 보존; 미리보기·취소0게시 |
| A16 제안·검토·부분 수용 / 개발1·개발2·P07 | [D note](whole-two-d-note-review.md), [D week](whole-two-d-week-review.md), [M5 제안·사본](alpha-m5-social.md) | DEV 제안 당사자 projection·보류/거절/수용·개인 선택 갱신/Undo 구현. 실제 API/UI 범위를 분리해 기록 / M5 | B의 구판 제안→A 검토→불변 새판→B 필드별 비교/유지/수용, source 경고 우회0·개인 기록 보존·stale 거절·Undo 경합 |
| A17 커뮤니티·활동·사진 / 승인 P05 | [community](../../../lib/flow/integrated-poc/community.ts), [커뮤니티 평가](whole-two-c-community-review.md), [M5 파일 접근](alpha-m5-social.md), [M6 사진 복원](alpha-m6-preservation.md) | DEV Auth/별칭·글/답글/반응/활동·private Storage 구현. M6에서 원본 Storage 소실 뒤 개인 draft의 사진 bytes 복원·권한·hash를 QA 25/25 검사. 공개 사진 재게시에는 새 첨부가 필요하다. 물리 고아 자동 정리·서비스 전체 DR·신고/운영 정책은 미완료 / M5,M6,D05 | Flow 없는 질문·부분/반대 경험·답글/반응·수정/삭제·정확 활동 복귀, 타인수정 거절, 사진 MIME/크기/노출·삭제된 근거 처리 |
| A18 서버 거래·다기기·네트워크 / 사용자 결정·7월 §7/11 | [controller](../../../lib/flow/integrated-poc/controller.ts), [program-store](../../../lib/flow/integrated-poc/program-store.ts), [M3 서버 거래](alpha-m3-sync.md) | owner별 CAS·영수증·동일 요청 조회/재시도·polling/focus/online/visibility 재조회 구현·개발계 M3 범위 검증 완료. Realtime push·실제 세 기기 검증은 미포함 / M1,M3 | expectedRevision 경합1성공/1충돌, 동일request 재시도1mutation, 성공응답 유실 후 정확 조회, 통신 복귀·갱신 누락 보정·오래된 캐시 덮어쓰기0. 이후 구독 연결 시 누락 보정도 검증하며 독립 browser context와 실제 기기 증거를 분리 |
| A19 Undo/Redo·복구 / 세 결과물·P08 | [M3 Undo·복구 한계](alpha-m3-sync.md), [M4 제작 이력·Undo](alpha-m4-authoring.md) | 개인/제작 서버 거래 단위 Undo/Redo·후속 revision 충돌·탭별 입력 복구 구현·M3/M4 개발계 검사 완료. 연속 입력 groupId 병합·영구 Undo/오프라인 정책은 미확정 / M1,M3,M4 | 마지막 성공 저장의 허용 필드만 보상하며 다른 계정/공개자료/다른기기 후속변경을 지우지 않음. 명시 저장 판본 복원과 개인 실행 수용은 분리. 전체 복원은 M6; sessionStorage는 영구 백업이 아님 |
| A20 전체 백업·복원·이관 / 사용자 요청·7월 §12 | [7월 계약](../2026-07-11-canonical-flow-data-model/storage-api-contract.md), [M6 검증·한계](alpha-m6-preservation.md), [M7-1 강화](alpha-m7-1-readiness.md) | 명시 이관·v2 seal/사진 bytes 복원 위에 실제 취소 경합·손상 Storage·10,224,235bytes 왕복을 확인했다. 복원 요청 한도 초과 백업은 다운로드 전 거절. 실제 원본 귀속·별도 프로젝트/지역·Auth/공개 서비스 전체 복원은 미실행 / M1,M6,M7-1 | owner/schema/checksum/ID·native/기록/관계/공개판본/파일 manifest, 원본 보존·preview0쓰기·동일backup 재이관0중복, 실패 원자성·분리 환경 restore 대조 |
| A21 업데이트·rollback / 사용자 요청·7월 §12/13 | [M6 계약·검증](alpha-m6-preservation.md), [M7-1 구 앱 판정](alpha-m7-1-readiness.md) | additive 계약·old client fail-closed·현재 앱 재접속 QA. 구 M5는 신규 복원 사진 API400/현 앱200으로 그 상태의 rollback 후보 제외. 실제 배포 rollback·DB downgrade·실사용 원본 이전판은 미실행 / M1,M6,M7-1 | 이전 버전 fixture+실사용형 자료로 additive migration/호환 앱 rollback, 복구 후 최신 서버 자료 보존·구독 복원, old client 차단·재업데이트 회귀 |
| A22 화면·키보드·실기기 / V41-062–066·D2-038/042/061·P08 | [화면별 평가](final-evaluation-2026-09-20.md), [원자 기기 항목](../2026-09-05-flowme-integrated-poc-ux-audit-v1/coverage-inventory.md), [M7-1 검사/기기 계획](alpha-m7-1-readiness.md) | M7-1 백업/이관4상태×5크기 UI66/66 재검사, Escape 초점·파일/취소/복원·reload. 전체 화면/48px/키보드 전수 검사·실제 기기/IME/AT는 미검증 / M2–M7 | 375×812,390×844,844×390,1024×768,1440×900 overflow/page error/핵심가림0; 48px 지정행동·비드래그·초점·safe area·확대; Android/iOS/IME/AT별 실제 증거 |
| A23 회귀·보안·성능·운영 / P08·최종 잔여 | [M7-1 현재 검사와 실패 이력](alpha-m7-1-readiness.md); [최종 평가](final-evaluation-2026-09-20.md)는 당시 npm1FAIL/audit5 이력 | 기존 출처/의존성 실패는 후속 보존 단계에서 수정했고 이번 npm2255/2255·build·audit0 재확인. 백업 크기/검사 도구 보완, 통합 회귀·strict 검사. 성능 예산·운영 관측·release smoke는 남음 / M1,M7 | 출처기한 정직한 검토, 취약점 triage/수정, npm/build/security·권한음성/E2E, 긴본문·누적자료 측정/기준 합의, 비밀 없는 로그·비용/오류 관측·release smoke |
| A24 보류·승인 경계 / BP·원 대체 결정·이번 목표 | [inventory 이력](../2026-09-05-flowme-integrated-poc-ux-audit-v1/coverage-inventory.json), [아래 D 결정](#결정-상태) | 일부 보류 / 각 단계 gate | 임시값을 제품정책으로 확정하지 않음. AI/외부동기화/공동편집/유료/배포는 별도 승인. 보류 원자ID·이유·재개 조건 유지 |

### M1 종료 당시 근거와 잔여 범위 — 이력

아래는 M1 종료 시점의 9/21 근거와 당시 남은 범위다. `저장 adapter 연결 전`·`M2/M3에서 검사` 등은 과거 상태이며 현재 판정은 위 A 행과 [M2](alpha-m2-auth.md)·[M3](alpha-m3-sync.md)를 따른다. 상세 시나리오/실행 수는 [M1 결과](alpha-m1-persistence.md#검증-결과)에 보존한다. 원자 요구 충족률을 새로 계산하거나 후속 단계를 완료 처리하지 않는다.

| A 행 | M1 적용 | M1 종료 당시 남은 일 |
| --- | --- | --- |
| A01 | 개발 환경 project/API/Auth/Storage/redirect allowlist·운영 ref 거절의 순수 검사 | 실제 클라이언트/CI 환경 연결·SQL 권한은 M2 |
| A02–03 | fake session이 owner 결정, 타인 자료/영수증 차단, 계정 변경·만료·늦은 응답과 입력 복구 | 실제 Auth/RLS·두 실제 계정·로그인 화면은 M2 |
| A04–05, A08–09 | 원문/참조·QuickItem·네 origin·실제 Map·숫자 토큰·누적/반복 이력의 합성 데이터 왕복, 개인 명령·Undo | 실제 자료 귀속·전체 legacy reader 이관·개인 동기화는 M3/M6 |
| A06–07 | 현재 UI/이동·기간 모델 그대로 유지; 저장 adapter 연결 전 | drag/터치/키보드와 서버 저장을 실제 화면에서 잇는 검사는 M3 |
| A12–14 | native saved/pending/recovery/source session·journal 및 개인 인계 자료의 무손실 왕복 | 틀 UX 원결정 대조와 실제 제작 화면 서버 연결은 M4 |
| A15–17 | 불변 공개 두 판본·사본·커뮤니티·합성 이미지 reference를 오프라인 백업에 보존. 계정 API에 전체 reference 노출0 | 실제 공유/권한·파일 업로드·공개 DTO는 M5 |
| A18–19 | CAS 경합·idempotency·영수증 조회·재시도·개인 보상 Undo·후속 변경 충돌 | 실제 DB 거래·구독·다기기·세분화된 revision은 M2/M3 |
| A20–21 | owner/schema/checksum·inline 파일·operation journal 검증, 복원 서버의 중복 요청/Undo 보존, 미지원 버전 거절 | 실제 import·DB/Storage 전체 복원·이전 앱/DB migration·rollback은 M6 |
| A22–24 | 기존 UI/운영 writer 불변, 표적/회귀/빌드 검사 | 실기기·관찰·긴 자료 성능·운영 gate는 후속 단계 |

## M0–M7 실행 계획

단계가 올라가도 앞 단계의 원 요구·회귀를 계속 검사한다. 아래 단계 상태는 요약이고, A 원장의 기능 판정과 실제 결과 링크를 근거로 갱신한다. 구현 후에는 `구현 완료 → 개발계 검증 완료 → 운영 반영 → 실사용 확인`을 구분한다. 모든 단계를 승인 없이 연속 실행하지 않는다.

| 단계 / 의존성 | 기획·UX | 개발 설계·구현 | 검증·종료선 / 현재 상태 |
| --- | --- | --- | --- |
| M0 문서 정합화 / 완료 이력 | 세 결과물·의사결정 대체 관계와 실사용 목적 정리 | 기존 문서 연결·A 원장·원자 참조 매핑·환경 사실·다음 묶음 | 출처/단계/완료조건/검증 연결, 매핑·링크·원문 검사18/18 및 docs:check PASS. 보호1716 중 예정 문서9개 외 변경0. **완료 — 문서 범위만** |
| M1 저장·권한·복구 경계 / 9/21 승인 | 저장됨/대기/충돌/계정만료/복구 상태 계약, 원문·실행·공개 구분. D04/D07 실제 정책은 보류 유지 | 계정 aggregate/identity/revision/operation receipt·repository port·환경 검증, checksum/파일/journal backup·9종 lossless fixture, 로컬/fake-server adapter 구현 | A01/A04–09/A18–21의 계약 왕복·실패·경합·오염 차단 PASS. **완료 — 로컬 M1 계약/QA만**, 실제 SQL/Auth/서비스 동기화는 M2 이후 |
| M2 실제 인증·개발 환경 / M1,D01,D02 + 9/21 개발 DB/Auth 연결 착수 승인 | 로그인/복구/만료·계정전환·빈 상태, 기존 자료는 자동 가져오지 않음 | 개발용 migrations·RLS/grants·Auth provider·bucket 정책, 서버 auth identity·캐시/구독 격리. CI는 mock API, 실제 실행은 dev만, 운영식별자 reject | **완료 — 개발계 M2 범위.** API49·SQL9·비메일30·mock30·새 비밀번호 실브라우저71·자연 만료23 PASS, 실제 가입/확인 서버 기록·사용자 복구 확인·사후 권한 점검 완료. [검증과 잔여 준비](alpha-m2-auth.md) |
| M3 개인공간·동기화 / M2 + 9/21 실행 승인 | 기존 개인 화면 재사용, 저장 상태·원문 충돌 비교·미저장 입력 보호; 원래 이동/기간/완료 의미 대조 | 개인 원문/폴더/QuickItem/기존 사본·Map/반복·누적 기록 저장, owner별 CAS/idempotency·polling/재조회·서버 거래 단위 Undo, 개인 무저장 출력 연결 | **완료 — 개발계 M3 범위.** A03–09/A11/A18–19의 이번 적용 범위에 대한 최종 검증과 개발 DB 사후 확인을 마쳤다. 합성 도메인 검증·실제 개발 API/브라우저·독립 클라이언트의 증거는 [M3 실행 기록](alpha-m3-sync.md)에서 구분한다. 실제 PC/폰/태블릿·실자료 이관·공개 복귀 및 부모 A 요구 전체 완료를 뜻하지 않음 |
| M4 제작·이력 / M3 + 9/21 실행 승인 | 같은 편집기·빈 단순 틀 1회 삽입·예시/16속성·미반영 입력·복구 | working/saved/pending/recovery/source session/native journal/개인 handoff 분리 저장, 제작 전용 semantic 명령·CAS·서버 이력/Undo | **완료 — 개발계 M4 범위.** 실제 raw 제작 API/UI·명시 저장·이력 복원·개인 인계·응답 유실/충돌을 검증했다. native 원래 fixture 합성 전이와 실제 raw 경로를 [M4 기록](alpha-m4-authoring.md)에서 구분한다. 실제 native import·OS IME·실기기·영구 복원 완료를 뜻하지 않음 |
| M5 실제 공유·커뮤니티 / M4 + 9/21 DEV 제한 공유 실행 승인 | 탐색→일부 사용, 선택 공개→질문/기여→업데이트 왕복; 경험 작성은 의무 아님 | public repository·immutable versions·개인 사본·제안/검토·질문/답글·사진/활동, service authorization·개발 rate/파일 보호 | **완료 — 개발계 M5 범위.** A10–11/A15–17 실제 두 계정 API153/153·사진54/54·UI140/140·통합2025/2025·npm2255/2255·build와 QA 자료 정리를 확인했다. [M5 기록](alpha-m5-social.md)의 API/UI/합성 검증 범위와 D05 외부 공개 정책·M6 복원·M7 실기기/배포의 미완료를 유지한다. |
| M6 보존·복구·업데이트 / M3–M5,D03,D04 | import preview·미매핑/충돌·복원 범위·최종복구시점 안내 | 기존 PoC/legacy 명시 이관, 계정 backup+Storage 파일·owner 대응·격리 복원, additive migration·구 앱 fail-closed 처리 | **개발계 목표 완료.** 계정/사진/호환/격리 DR·최종 브라우저66/66·QA 정리·종료 판정은 [M6 기록](alpha-m6-preservation.md). 보고서 시각 검사 미검증과 강화 검사 M6-R01–08은 유지. D03/D04, 실제 서비스 전체/별도 환경 DR·배포 rollback은 실자료 투입 전 별도 gate |
| M7 실사용 gate·배포 / M1–M6,D03/D04/D05/D06/D07 + 발행 승인 | 각 여정의 모바일/접근성/긴 자료·상태 안내 재평가, 실사용 안내 | 회귀/취약점 해결·오류/비용 관측·고정 HTTPS·운영 설정·검증된 release 반영·복구 절차 | **M7-1 준비 목표 완료**, [강화 QA와 운영 준비안](alpha-m7-1-readiness.md). 이후 D03/D04에 따른 M7-2 제한 실자료 시험, 실제 기기 기록과 공개/배포 gate가 남는다. commit/push/PR/Preview/Production 각각 별도 기록 |

M3의 계정 단위 revision·서버 거래 단위 Undo·sessionStorage 복구는 [이번 개발 버전 계약](alpha-m3-sync.md)의 적용 범위다. 연속 입력의 여러 서버 거래를 하나의 Undo로 묶거나 닫은 탭의 입력을 영구 보관하는 기능은 포함하지 않는다. 이 제한을 D07의 영구 Undo/오프라인 정책 확정으로 올리지 않는다.

M5·M6는 승인된 개발계 범위에서 완료했다. [M6 실행·검증 기록](alpha-m6-preservation.md)의 잔여 M6-R01–08과 D03–D05를 M7 실사용 준비에서 이어받는다. 개발계 구현을 외부 공개/운영 정책 승인이나 통합 알파 완성으로 대신하지 않는다. 실제 자료의 유일본 투입 전에는 해당 실사용 보존·복구 조건을 충족해야 한다.

## M1 구현 범위 — 9/21 승인 이력

**목표:** 현재 UI/운영 데이터를 바꾸지 않고 계정별 저장·명령·복구 port를 정의하고, 기존 모델의 무손실 round-trip과 실패 경계를 fake server로 증명한다. Supabase/Vercel 자원 수정은 이 묶음의 완료 조건이 아니다.

- 착수 전: 최신 git/소유권 재확인, 현재 미커밋 PoC를 기준선으로 확보. main 동기화나 새 worktree 필요 여부는 별도 판단하며 검증된 미커밋 기능을 잃는 clean-main 재시작 금지. commit/push는 별도 승인이다.
- 설계: private document/creator/execution, immutable public/version, community/attachment, import/operation manifest의 관계·owner·revision 표. A01 환경 denylist/allowlist·session-bound response·A19 Undo 충돌 계약. 세부 테이블명은 DDL 전에 검토한다.
- UX: 기존 화면 옆에 `서버 저장 대기 / 저장 확인 / 다른 기기 변경 / 로그인 만료 / 결과 확인 중 / 복구 필요` 상태와 행동을 정의한다. 저장 성공 전 성공 toast·완료 화면으로 넘어가지 않음. 무조건 재로그인/새로고침으로 입력을 버리지 않음.
- 구현 후보: 별도 alpha persistence 모듈/계약 검사와 기존 순수 모델 adapter. 새 client 전체 envelope endpoint 금지. 현재 `ProgramApp`의 활성 localStorage writer는 아직 교체하지 않는다.
- fixture: 독립 문서+참조, QuickItem, 네 saved origin, 실제 structured Map, 일반/반복 누적 기록, native saved/pending/recovery, public 두 판본/사본/커뮤니티/사진. 합성 자료임을 표시하고 실행 이력을 재생성하지 않음.
- 종료: serialize→validate→restore의 identity/원문/record/관계 동등, stale·중복·응답유실·권한오류·잘못된환경·다른계정0누출, 미지원payload fail-closed. 문서/표적 검사 PASS, 영향 범위에 맞게 npm/build를 실행하고 기존 실패와 새 실패 분리. 실제 서버 동기화 완료라고 보고하지 않음.

위 M1 묶음은 9/21 사용자 승인으로 착수했다. 후속 M2의 실제 개발 Auth/DB 설정과 실서비스 검증은 이 M1 결과로 자동 완료하거나 실행하지 않는다.

## 9/21 M2 후속 진행 원칙과 M3 착수 순서 — 이력

사용자가 실제 메일 검증은 나중으로 두고 나머지를 진행하도록 지시했다. 메일 발송·수신·비밀번호 변경과 SMTP 준비를 별도 후속으로 관리하며, 이것 때문에 코드 점검·비메일 권한 검사·다음 단계 설계까지 멈추지 않는다. 보류를 PASS로 바꾸거나 M2 전체 완료로 계산하지 않는다. 메일 재전송·서비스 가입·설정 변경은 이번 후속에 포함하지 않는다.

위 문단은13시의 진행 원칙이다. 이후 사용자 직접 복구·새 비밀번호 재로그인,16:05 실브라우저71 PASS,16:40 두 계정 signup/verify 성공 서버 기록,17:06 자연 만료23 PASS로 새 근거가 쌓였다. 보류를 임의 PASS로 바꾼 것이 아니라 실제 성공과 사후 경계 확인으로 개발 M2를 완료했다. 최초 가입 화면의 직접 관찰과 일반 사용자 SMTP 서비스 준비는 별도로 남긴다.

다음 표는 M2 종료 당시 정리한 M3 착수 순서다. 이후 승인으로 실제 구현·개발 DB migration을 실행했으며 현재 결과는 [M3 실행 기록](alpha-m3-sync.md)을 따른다.

| 순서 | 설계·구현 출발점 | 확인할 조건 |
| --- | --- | --- |
| 1. 요구·거래 범위 | A04–A09/A18–A19, `alpha-persistence/contract.ts`와 `program-adapter.ts` | 원문·행·sidecar·QuickItem·네 origin·Map·반복 identity 유지. 계정/문서 revision 단위와 Undo 충돌 의미 비교; M1 임시 계약을 영구 정책으로 확정하지 않음 |
| 2. 실제 저장 port | `AlphaRepository.read/execute/lookup`, `fake-server.ts`의 CAS·idempotency·receipt 원자성 | 서버 Auth identity로 owner 결정. 개인 계정만 저장하고 전체 ProgramEnvelope/public/다른 actor를 업로드하지 않음. M2 empty-only migration은 보존하고 별도 M3 migration 설계 |
| 3. 개인 화면 연결 | `ProgramApp.tsx`의 controller 생성, `mutate/scopedMutate`, `ProgramSpace` 전달 지점 | 인증된 화면에 adapter를 주입. 기본 `/my`·로컬 PoC writer는 유지하고 시뮬레이션 actor 전환을 실제 계정 전환으로 사용하지 않음 |
| 4. 통신·입력 복구 | `alpha-persistence/client.ts`, `local-recovery.ts`, 외부 갱신의 pending input 보호 | owner별 pending 보존, 같은 requestId 조회/재시도, 서버 확인 후 저장 표시. 구독은 재조회 신호로 사용하고 누락·재접속·늦은 이전 계정 응답을 검사 |
| 5. 개인 Undo | 서버 operation/inverse와 기존 native/global Undo의 경계 | 다른 기기 후속 변경을 전체 snapshot으로 덮지 않음. D07 비교가 필요한 범위는 구현 전 제시 |
| 6. 계약→서버→화면 검증 | M1 9종 fixture·persistence/client 검사·ProgramApp 외부 복구 검사 | 실제 두 계정과 독립 세 클라이언트의 경합·응답 유실·오프라인 복귀·취소/동일위치0거래. 브라우저 context와 실제 PC/폰/태블릿 검사를 분리 |

D04 실제 자료 귀속/이관은 M6, 제작 확정은 M4, 실제 공개/커뮤니티는 M5에 남긴다. D03 백업·복원 조건 충족 전 실자료 유일본 투입을 권하지 않는다. 배포·운영 migration 권한은 별도다.

## T01–T12 검증 계획

각 실행은 build/commit 또는 소스 hash, 환경·사용자 구분, 사전/사후 상태, 실제 명령·실행 개수·실패·skip, 화면 크기·기기, 증거 파일을 기록한다. 아래는 통합 알파의 전체 검증 계획이다. M1·M2·M3의 완료 근거는 각 단계 원장의 범위별 증거를 따르며, 이것으로 해당 통합 시나리오 전체를 완료 처리하지 않는다.

| ID | 시나리오와 통과 기준 | 연결 |
| --- | --- | --- |
| T01 | dev 설정에 운영 project ref/URL 주입·env 누락·build/테스트 초기화 시도 → 외부 쓰기0·시작 거절. 기본 `/my`·원본 `flow:*` 전후 bytes 같음 | A01,A23 |
| T02 | A/B/anonymous에서 ID·owner·경로·RPC 위조 및 public/private file 접근 → 타인비공개 읽기/쓰기0. privileged key로 통과한 검사를 일반 사용자 검사로 세지 않음 | A02,A15–17 |
| T03 | A 미저장 입력·느린 응답 중 logout→B login, 만료→재인증·Back/reload → A 입력/응답/캐시가 B에 노출0, 복구 선택 보존 | A03,A13 |
| T04 | 4origin+QuickItem·문서/폴더→오늘/주/월/미정→완료/다시열기·모든 이동경로·Undo → 같은 target, source/Flow소속 불변·무효동작0 | A04–07,A19 |
| T05 | 같은 계정 PC/폰/태블릿, 같은 revision 경합·다른 항목·오프라인/응답유실·중복요청 → 의도한 거래만 반영. `[1]`/`[1.0]`, 날짜/DST/시간대·반복 past/future·Map 기준일 보존 | A08–09,A18 |
| T06 | 빈/긴 원문·여섯 틀·예시·16속성·native 정렬/CRLF/한글조합·pending/recovery→명시저장→개인인계→이력복원 → 원문/ID/context 보존·미리보기/취소 무적용 | A12–14,A19 |
| T07 | A 일부 공개→B 검색·기준일/포함 선택·두 문서 참조·실행→A 새판→B 필드별 수용/Undo→철회 → 사본·고정판본·개인기록 유지, 비공개필드 누출0 | A10,A15–16 |
| T08 | Flow 없는 질문·경험/반대근거·답글/반응·사진·활동·수정/삭제 → owner만 변경, 원글삭제 표기, private draft 비노출·파일 접근 검사 | A17 |
| T09 | URL hit/unsupported·직접 원문 확인·무저장 TXT/CSV/ICS → 실제 bytes/UID·출처/주의·선택 일치, 새 배포주소의 정확판본 복귀. 외부 앱 import는 실행한 경우만 PASS | A11 |
| T10 | 기존 local/import preview→commit/retry→이미 서버수정 후 rollback, backup schema변조/손상/누락파일→거절, 별도환경 전체복원 → counts/hash/identity/권한·원문·실행·첨부 대조 | A05,A13,A20 |
| T11 | 이전 앱/DB fixture→업데이트→앱 rollback/forward-fix→재업데이트·old client → 최신자료 손실0, 불명 성공 요청 조회·중복0, 복구 가능 시점 명시 | A18,A21 |
| T12 | 원래 S01–S10 + T01–11 조합을 실제 알파에서 수행. 다섯 해상도·키보드/비드래그·실제 Android Chrome/iOS Safari·IME/AT·긴자료 지연, npm/build/security/배포 smoke → 결함·미실행을 각각 공개 | A22–24 |

배포 전 자동 검사 명령은 `npm.cmd run docs:check`, 영향 표적/권한·SQL/API 테스트, `npm.cmd test`, `npm.cmd run build`, `npm.cmd run security:audit`, 실제 경로 E2E다. 공급 서비스 재연결·배포가 필요한 검사는 승인받은 개발/운영 환경에서만 실행한다. 원래 모바일 전용 행동 48px 기준을 ‘일부44px 통과’로 바꾸지 않는다. 가로 넘침/console/page error/가려진 핵심 행동은0을 목표로 한다. 실제 기기 미실행이면 승인된 축소 테스트 범위를 따로 표시하며 제품 전체 검증으로 표현하지 않는다. 관찰 사용자 수는 사람의 실제 수행 기록으로만 집계한다.

## 결정 상태

M0 이후 받은 답변은 [9/20 사용자 결정](../../DECISIONS.md#2026-09-20---실사용-알파-인증가입무료-검증과-발행-권한)이 정본이다. 아래는 적용 상태와 잔여 질문이며 D04/D05/D07 등 답하지 않은 항목을 승인된 정책으로 바꾸지 않는다.

| ID | 결정과 권장안 | 필요한 시점 |
| --- | --- | --- |
| D01 | 방향 확정: Google 우선, 복잡하면 이메일 대안 허용. 개발 Email·정확한 local redirect 설정과 두 계정 가입/확인·복구 검증 완료. Google OAuth는 미설정, 일반 사용자 SMTP 배달/한도는 후속 | Google 사용 시 외부 OAuth 준비, 공개 서비스 전 메일 전달/남용 방지 검증 |
| D02 | 방향 확정: 누구나 가입 가능. 초대 전용 권장은 채택하지 않음. 개발 A/B 검사와 서비스 가입은 구분하고 인증·가입/요청 남용 방지·비공개 데이터 격리를 검증 | M2 인증/가입, M5 공개 접근 검증 |
| D03 | 초기 무료 검증·유료 별도 승인. [M7-2](alpha-m7-2-personal-trial.md)의 PC 폴더 `D:\FlowMe-Backups`에 두 시작 백업 완료. 독립 2차 매체·자동 주기·보존/복구 목표는 미결. [M7-1 선택지](alpha-m7-1-readiness.md#운영-준비-결정안--아직-정책으로-확정하지-않음)의 일별7/주별4·손실24시간·복구1일은 제안이며 보장/자동 작업 아님 | 독립 사본은 덮어쓰기 복원 전, 자동화/보존 약속은 별도 확정 |
| D04 | 두 계정 확인·백업 완료. [전체 원본177개·Map26개 보존](alpha-m7-2-full-catalog.md), 기존 제작 사본2개 유지. [제작 연결 지원7개](alpha-m7-2-catalog-editing.md)는 사용자가 명시 생성하며 새5개 자동 반입 없음. 사용 흔적 제외, 002 비공개 관리 사본. QA actor·mock 공개물 승격/전체 소유권 변경 없음. 공개 발행은 별도 | 추가 연결 전 원본 충실도·정책·크기 증가 점검. 실제 생성 사본 수와 지원 원본 수 구분 |
| D05 | 공개 대상·신고/숨김·계정/공개본/사본/첨부 삭제 영향은 미결. [M7-1 운영 준비안](alpha-m7-1-readiness.md)에서 가입 개방·비공개 기본·명시 공개와 삭제 한계를 분리. 실제 설정 변경0 | 외부 서비스 공개 전 |
| D06 | 권한 확정: 필요할 때 코드 commit/push 가능, 현재 목표는 Draft PR까지 준비. merge와 Preview/Production 배포는 별도 승인. 자동 배포를 먼저 차단·확인하며 기존 서비스 덮어쓰기·도메인 구매·저장소 visibility 변경은 미승인 | 현재 Git 보존 및 각 배포 전 |
| D07 | 정책·UX 충돌: 폴더/자료 상한·서버 Undo 범위·오프라인 저장 의미·COUNT 안내·긴자료 성능 예산. 기존 의미 유지가 기본이며 변경이 필요한 항목만 비교안을 제시 | 해당 M1–M7 구현 전 |

추론 수준은 Astra Extra High 권장이다. 보안/동기화/이관 계약에서 단일 어려운 충돌이 생기면 Max 필요 이유를 먼저 알린다. 실제 설정을 바꿨다고 가정하지 않는다.

## 보류와 재개 조건

실제 AI provider/URL 임의 수집, Google Calendar 등 외부 계정 동기화, 동시 공동편집, 조직/팀 권한, 결제/마켓플레이스, 알림·push, 네이티브 앱은 이 전환의 자동 선행 작업이 아니다. 기존 출력/수동 원문/개인 실행을 유지하고, 실사용에서 확인한 필요와 별도 승인 때 재개한다. 서버 공개·커뮤니티는 보류 목록에 숨기지 않고 M5로 유지한다. 커스텀 도메인·유료 branch·서비스 추가는 필요와 비용 승인 후 선택한다.

7월의 URL/AI future tasks 중 runtime validator·identity·repository·Auth/RLS·이관/동시성은 A 원장에 연결한다. fake/live provider·자동 수집은 그대로 보류한다. 그 체크박스를 현재 PoC 구현만으로 일괄 완료 처리하지 않는다.

## M0 검증 기록과 이후 갱신 규칙

M0에서 수행한 것은 문서/코드 읽기 대조와 Supabase metadata/public-table 조회다. 당시 제품 테스트·브라우저·실제기기·관찰 검증을 새로 수행한 것은 아니다. 이후 M1의 현재 실행 결과는 [M1 검사](alpha-m1-persistence.md#검증-결과)에 기록한다. 최종 PoC 평가의 1749/1749, npm2030/2031, audit5는 과거 실행 이력이다. 운영 계정이나 여러 기기 동기화의 증거로 재사용하지 않는다.

이후 구현 시 해당 A 행에 정확한 결과/잔여와 실행 근거를 갱신하고, 완료된 M 단계의 종료 조건을 모두 확인한다. 과거 PoC progress와 final report는 덮어쓰지 않는다. 검사·제품 구현·운영 반영·관찰 결과를 한 ‘완료’로 묶지 않는다.
