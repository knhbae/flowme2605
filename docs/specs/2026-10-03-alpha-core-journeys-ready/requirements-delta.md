# 세 원천 요구와 이번 변경의 연결

2026-10-03. 정본은 [목표](spec.md)와 [직전 대표 요구](../2026-10-02-alpha-ux-comparison-gaps/requirements.md)다. 이 표는 이번 연결부의 대조이며 v4.1·개발1·개발2 전체 충족률이 아니다. 과거 audit의 판정은 당시 기록으로 보존한다.

| 원천 요구 | 현재 대표 요구·화면 | 이번 판단과 적용 | 새 검증·반영의 위치 |
| --- | --- | --- | --- |
| v4.1 V41-013/014/025: 날짜 이동의 소속·시간·원본 경로 보존 | C07~C10, ProgramSpace 문서·기간·상세 | 기존 전이를 유지. 필터가 있는 빈 결과를 구분하고, 전체 할 일로 기간만 넓힌다. 시간 있는 항목에 날짜-only 이동의 시간 보존 안내 | 새 personal 3개와 관련 Space 회귀. UC1/UC6의 같은 Item·날짜·시간·원문·reload. [QA](qa.md)에서 실제 실행 판정 |
| v4.1 V41-041/042/050: 대상·결과·초점·키보드 대안 | C08/C12/C18, 원문 항목 메뉴 | 대상 원줄을 표시하고 진행·날짜/추가·연결/문서 구조로 구분. 기존 Tab trap·Escape 선택 복귀·등록 identity·Undo를 보존 | TextEditor 신규 2개 및 기존 회귀. UC1 메뉴·양방향 Tab·초점·취소0쓰기 |
| 개발1 D1-002/004/006: 같은 전이·dirty 취소·날짜 의미 | C08/C09/C12/C18, 개인 작성과 실행 연결 | 새 parser·일정 owner·강제 저장을 추가하지 않음. 기존 lock/flush 실패 시 빈 결과의 기간 이동도 거절. 문서↔기간↔정확 원문 연결 유지 | personal lock/flush negative와 기존 context/date/journey 회귀, UC1/UC6 |
| 개발1 D1-017/019: 출처·개인 사본·단일 탐색 | C14, Discovery·상세·개인 사본 | 공개 없음/검색 없음은 기존 구현 유지. account 목록의 제외 설명에서 기존 ‘내 문서 보기’ 경로만 추가. private 제목/개수 조회 없음 | 신규 public 3개, 기존 Discovery 회귀. UC2/UC7의 공개 없음·판본/출력·개인 복귀와 공개 원본 불변 |
| 개발1 D1-021/023: 출력 형식·선택 판본·기준일 분리 | C14, 공개 상세·출력·복귀 | 기존 명시 판본과 정확 return token 보존. 자동 사본·질문·게시·판본 치환 없음 | 기존 output-return 회귀 및 UC2. 전체 Flow/Map·외부 도구 import 품질은 이 표로 닫지 않음 |
| 개발2 D2-003/004: 같은 Item projection·계층 분리 | C01/C08/C12/C14, 문서·기간·공개/개인 | 같은 Item을 다른 화면으로 표시하며 메모를 자동 할 일로 승격하지 않음. Source/Creator/Public/Personal/Execution의 writer/schema 변경 없음 | 기존 모델·컴포넌트 회귀와 UC1/UC2/UC6. 최종 source inventory와 build를 별도 연결 |
| 개발2 D2-014/015/039: 빈 값·날짜·기준일·원문 caret | C08/C09/C12, 상세와 원문 메뉴 | 날짜 정책을 새로 정하지 않음. 기존 원문 offset·날짜 입력·선택/IME guard 유지. 메뉴 그룹은 같은 handler를 사용 | TextEditor/date 회귀와 UC1/UC6. 실제 IME/AT는 미실행 |
| 세 원천 통합 뒤 UX-N1: 거절·unknown·추가 입력·실제 충돌 | C15/C16/C18, Community와 AlphaWorkspace | 현재 초안 근처에 한 복구 안내. 원 owner/payload/expected/receipt/private bytes와 현재 참여 입력의 단독 pending이 일치할 때만 부모 경고 감산. 독립 사진 오류·다른 편집기 입력은 유지하고 action도 같은 조건을 재검사. 이후 입력을 자동 저장하거나 baseline으로 채택하지 않음 | AlphaWorkspace82·Community30의112/112 회귀. UC3/UC4/UC5의 6상태·입력/선택·다른 요청 결과 구분은 실제 브라우저 미실행 |
| 세 원천 통합 뒤 UX-N2: 복원 대상·닫기·재진입 | C17, 계정 관리·PreservationPanel | 기존 진입과 창을 ‘백업 · 복원 · 가져오기’로 맞추고 선택 목적 명시. 기존 pending/닫기/취소/복원 정책 유지 | Preservation 신규 1개 및 기존 pending/unmount/owner 회귀. UC7의 손상 파일·취소·재진입은 0전송 검사이며 대형 실제 복원 검사가 아님 |

원천 ID의 직접 대조 문서는 [v4.1](../2026-09-05-flowme-integrated-poc-ux-audit-v1/v41-audit.md), [개발1](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d1-audit.md), [개발2](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d2-audit.md)다. 좁은 후보의 변경 이유·상태/행동 계약은 [P/F](personal-public-design.md), [C](recovery-design.md), [N](menu-restoration-design.md)에 둔다.

피드백26개·대표18군의 분모는 유지한다. 현재 필터로 정정된 누락을 결함으로 되돌리지 않고, 실제 원환경·정책 PC01~06·일반 social 전체 retry·전체 콘텐츠/Map·대형 백업·실기기 검증은 [후속 조건](spec.md#제외와-재개-조건)에 남긴다. 게시/반영 여부는 기능 검사와 분리해 QA 원장에 기록한다.
