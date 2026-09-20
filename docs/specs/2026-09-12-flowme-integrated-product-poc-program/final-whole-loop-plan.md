# 같은 실행판의 전체 평가·개선 실행표

2026-09-14 · [전체 계약](spec.md) P01~P08을 줄이지 않는다. [기존 상황 원장](journey-closeout.md)의 서로 다른 빌드별 결과는 이력으로 남기며 아래 실행을 대신하지 않는다.

## 시작과 기록

- 실행 중인 document BUILD_ID와 실제 `/my` chunk를 build manifest와 대조한다. 각 단계의 시작/끝 revision, actor, 문서/항목/Flow/판본 ID, 보호 key의 정확 bytes를 기록한다.
- 누적 QA 프로필의 기존 자료는 보존한다. 빈 profile 전제의 `prepare-program-whole-qa.mjs`, `program-whole-s05-copy.cli.js`를 다시 seed하지 않는다. 고정 Mgb/Zrf chunk를 현재 ID로 바꾸는 것만으로 재사용 완료로 보지 않는다.
- 새로 필요한 글·문서·사본·판본은 제품 UI로 만든다. 테스트 프로세스에서 바꾼 원본 catalog는 명시적인 후속 원본 시뮬레이션이며 실제 공개·수집·동기화가 아니다.
- 손상/미지원 origin gate만 별도 일회성 QA 프로필에서 확인한다. 누적 사용 프로필에 손상 payload를 넣지 않는다.
- 각 행은 목적 달성, 다음 행동, 맥락 유지, 입력 부담, 복구, 공개 경계, 모바일/키보드를 `충족 / 부분 / 실패 / 미실행`과 실제 근거로 기록한다. 예상 소요 시간·가상 선호·사용자 수를 만들지 않는다.

## 전체 두 루프

| 상황 | 첫 전체 평가의 연속 행동 | 두 번째 평가의 다른 목적·구조 | 재사용할 기존 script 본문 |
| --- | --- | --- | --- |
| S01 독립 문서 | Flow 없이 메모·체크·하위 항목 생성 → 폴더/날짜 → 문서 왕복 → 보관/복원·Undo/reload | 긴 자유 기록·검색 결과 없음·이어쓰기 | `program-document-lifecycle`, `program-long-writing-reentry` |
| S02 날짜별 진행 | 같은 항목 이틀10→20% → 과거 기록 수정 → 완료/재열기 → 문서/기간·Undo/reload | 반복 회차의 개인 계획 변경과 기존 완료 보존 | `program-progress-journey`, `program-progress-completion` |
| S03 이동 의미 | 하위 묶음/폴더/기간 이동 → 자기 하위 거절·취소 → 키보드/비드래그·Undo | CRLF·같은 제목·하위 확인이 있는 제작 원문 | `program-movement-parity`, `program-movement-input-preserve`, `program-native-sort-undo-redo` |
| S04 무저장 출력 | 등록 URL→확인·조정→TXT/CSV/ICS 실제 파일; 미지원 URL→붙여넣기→확정→파일. 문서/사본 증가0 | 다른 원문·시간대·반복 규칙 | `program-discovery-output`, `program-discovery-output-reloaded` |
| S05 발견·개인 사용 | 경험/질문에서 원본 진입 → 상황/판본 → 일부 사본 → 재가져오기 중복0 → 두 문서 참조·같은 실행·복귀 | 기존 Map/반복 사본·다른 사용 목적 | `program-discovery-copy`, `program-discovery-copy-continue`, `program-discovery-history-regression` |
| S06 참여·활동 | 부분/반대 경험·긴 글·사진 → 답글/반응 → 근거 지식 → 수정/삭제 → 활동에서 정확한 글·답글 | Flow 없는 짧은 질문, 경험 없는 Flow 사용 | `program-community-lifecycle`, `program-second-question`, `program-second-no-experience` |
| S07 선택 공개 | 제작 초안 → 선택/비공개 제외 → 미리보기 취소·quota/재시도·단일 공개 → 활동에서 원문/공개 편집 | 독립 개인 문서의 선택 공개와 철회·기록 보존 | `program-creator-current-publication`, `program-second-independent-publish` 및 후속 manage/archive |
| S08 제안·판본·수용 | S05 치앙마이 사본은 원래 원본/판본에 그대로 보존한다. S07의 새 공개 v1에서 실제 UI로 새 사본을 만들어 그 동일 원본의 옛 판본 제안→작성자 검토/새 판본→자동 변경0→부분 수용/충돌·기록·Undo/reload | 여러 개인 필드 동시 충돌·반복/하위 구조 | `program-public-old-version-whole`, `program-public-old-version-conflict`, 최신 `program-copy-*` |
| S09 실패·중단 | 위 상황의 미저장 입력/뒤로/reload/없는 대상/quota·저장 성공 후 알림 실패를 같은 run에 연결 | 다른 actor/다중 탭·CAS와 미저장 입력 | `program-input-protection`, `program-responsive-recovery`, 최신 navigation/return 회귀 |
| S10 원래 자료·운영 보호 | 기존4origin·실제 Map·제작 저장본의 진입/기록 보호. S01~S09 전체의 운영 key와 허용 밖 writer 대조 | 삭제·재등장·부분 연결 등 다른 원본 구조 | `program-origin-enum-from-live`, `program-held-map-readonly`, Map removal 시나리오 |

script 이름은 `scripts/personal-workspace-poc/` 아래 `.cli.js`의 본문 재사용 후보이며 그대로 실행 가능한 단일 runner가 아니다. 실제 window audit·actor·기존 자료의 ID와 전제부터 대조한다. 필요한 사본이 없으면 해당 원본의 실제 생성 흐름으로 돌아가며 낮은 수준 저장 조작으로 보충하지 않는다. S05의 기존 사본을 S07의 다른 제작 원본에 재연결하지 않는다. 이는 기존 원본/사본 정체성 계약을 적용한 실행 준비이며 새로운 제품 정책이 아니다.

## 결함과 재검사

검증 범위는 승인된 요구, 원래 세 산출물의 매칭, 위 대표 상황과 명시된 오류 경계다. 모든 날짜·문장·폴더·판본의 가능한 조합을 전수 검사하는 새 완료 조건으로 늘리지 않는다. 발견된 필수 경로 결함은 해결하되, 미지원 입력의 안전한 거절과 아직 미연결인 필수 기능은 구별한다.

실패한 행은 실패로 남기고 독립 행은 계속한다. 첫 전체 평가에서 발견한 결함을 수정한 뒤 영향 행을 다시 검사한다. 두 번째는 위의 다른 목적/구조를 평가하고 새 문제를 고친다. 최종 코드가 바뀌면 같은 최종판에서 10행의 핵심 왕복을 모으되, 과거 수백 확인점을 매번 전부 반복하지 않는다. 단일 항목 수정 두 번이나 동일 성공 시나리오 재실행은 두 전체 루프가 아니다.

실제 Android/iOS·OS 입력기·보조기술·외부 import·관찰 사용자는 별도 수행 여부다. 로컬 시뮬레이션을 실제 사람/외부 게시로 표현하지 않으며 운영 저장소·commit/push/PR/Preview/Production 권한은 확장하지 않는다.
