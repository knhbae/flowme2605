# Alpha 시스템·자료 지도

2026-10-30 · Alpha 앱이 어떤 화면과 코드로 이뤄졌고, 자료를 어디에 어떻게 저장하는지 정리한다. 기준 코드는 다음 후보 N1 통합 브랜치 `agent/alpha-next-20261030`(`e69bc416`)이다. 운영 R4와 저장·읽기 코드는 같다. 보안 설정 세부와 계정 정보는 적지 않는다.

`docs/SERVICE_STRUCTURE.md`(8/23)는 예전 로컬 저장 앱을 다룬다. Alpha 쪽은 이 문서가 맡는다. Alpha 코드를 `main`으로 옮길 때(진행판 5단계) 이 문서도 repo `docs/`로 옮긴다.

## 1. Alpha 라우트

| 라우트 | 하는 일 |
| --- | --- |
| `/alpha` | Alpha 앱 진입. 로그인 뒤 쓰기 작업 공간 |
| `/auth/callback` | 로그인 돌아오는 곳(이메일 확인, 비밀번호 재설정, Google) |
| `POST /api/alpha/account` | 개인 공간 명령(`change-private`, `undo-private`), 응답이 끊긴 요청 확인(`lookup`) |
| `POST /api/alpha/social` | 공개·이야기 글 명령 |
| `POST /api/alpha/creator` | 제작 공간 명령 |
| `POST /api/alpha/writing/[documentId]` | 메모·REA 계정군의 문서 단위 쓰기 |
| `GET /api/alpha/catalog` | 제작 공간 '기존 Flow 콘텐츠' 자료실 |
| `/api/alpha/media` | 이야기 글 사진 |
| `POST /api/alpha/preservation` | 백업·복원·가져오기 |
| `GET /api/alpha/health` | 설정 준비 여부만 200/503 |

## 2. 코드 지도

화면 (`components/flow/integrated-poc/`)

| 파일 | 맡은 일 |
| --- | --- |
| `AlphaAuthPanel.tsx` | 로그인·가입·재설정, 로그인 뒤 작업 공간 선택 |
| `AlphaWorkspace.tsx` | 계정 store, 자동 읽기(`POLL_MS = 20_000`), 저장 대기·충돌·복구, 아래 메뉴, 둘러보기·더보기 |
| `ProgramSpace.tsx` | 쓰기·오늘·분류 화면, 문서 목록 시트, 날짜 목록·빠른 추가, 반복, 원문 복귀 |
| `ProgramTextEditor.tsx` | 기본 편집기(textarea v11). 한글 조합, Enter 규칙(쓰기 A), '/' 메뉴, ＋ 메뉴, 키보드 바 |
| `AlphaAppWritingWorkspace.tsx`, `ProgramPmTextEditor.tsx` | 메모·REA 계정군 편집기 |
| `ProgramDiscovery.tsx`, `ProgramPublisher.tsx`, `ProgramCopyInspector.tsx`, `ProgramCopyProposal.tsx`, `ProgramProposalReview.tsx` | Flow 찾기·공개·사본·제안·검토 |
| `ProgramCommunity.tsx` | 이야기(경험·질문·지식) 글 |
| `AlphaCatalogLibrary.tsx`, `AlphaCatalogContentImport.tsx` | 제작 공간 자료실 |
| `AlphaPreservationPanel.tsx` | 백업·복원·가져오기 |

로직 (`lib/flow/integrated-poc/`)

| 폴더·파일 | 맡은 일 |
| --- | --- |
| `alpha-auth/` | 설정 읽기, 브라우저 Supabase 클라이언트, 계정 형식별 작성 경로 분기(`account-access.ts`) |
| `alpha-persistence/` | 계정 계약(`contract.ts`), 클라이언트 store(`client.ts`), 메모 계정군 변환(`memo-cohort.ts`), 합성 백엔드(`fake-server.ts`) |
| `alpha-sync/` | HTTP 저장소(`http-repository.ts`: 읽기·실행·lookup), 쓰기 전송, 탭별 복구 |
| `alpha-server/` | 서버 라우트 처리: 개인·이야기·제작·자료실·사진·보존 |
| `alpha-social/`, `alpha-creator/`, `alpha-preservation/` | 이야기·제작·백업 명령과 전송 |
| `contract.ts` | 개인 공간 형식 `ProgramPrivateSpace` |
| `text-workspace.ts`, `text-merge.ts`, `writing-*.ts` | 문서 본문 모델, 문서 단위 병합, 쓰기 명령·위치·계산 |
| `program-data.ts`, `task-classification.ts`, `recurrence-*.ts` | 할 일·분류·반복 |
| `publication*.ts`, `copy-proposal.ts`, `catalog*.ts` | 공개·사본·자료실 |
| `vendor/`, `native-creator-vendor/` | 생성물. 손으로 고치면 다시 만들 때 사라질 수 있다 |

## 3. 저장·읽기 흐름

### 3.1 읽기

1. 브라우저가 Supabase RPC를 바로 부른다. 세션당 처음 한 번 `flowme_alpha_social_open_v1`, 그다음부터 `flowme_alpha_social_read_v1`.
2. 응답은 내 계정 전체 + 공개 저장소 + 참여자 별칭 목록이다.
3. 20초 자동 읽기, 창 포커스·온라인 복귀·탭 표시, 저장 확인, 로그인 첫 읽기가 모두 이 경로다. 숨은 탭과 저장 진행 중에는 건너뛴다.
4. 10분 무입력 때 자동 읽기를 멈추는 수정은 N1에 들어가는 중이다.

### 3.2 쓰기 (개인 공간)

1. 편집기 → `ProgramSpace` → `AlphaWorkspace` store가 명령을 만든다. 스키마 `flowme-alpha-command/1`, `requestId`, `expectedRevision`, 바뀐 필드 목록.
2. 브라우저가 세션을 확인한 뒤 `POST /api/alpha/account`로 보낸다.
3. 서버가 계정 전체를 읽어 명령을 확인하고, DB 함수 `flowme_alpha_execute_v1`로 실행한다.
4. 응답 영수증: `requestId`, `revision`(바뀌었으면 +1), `changed`.
5. 브라우저가 영수증 revision 이상인 계정을 다시 읽어 확인한다. 그때까지 저장은 '대기'다.
6. 응답이 끊기면 같은 `requestId`로 `flowme_alpha_lookup_v1`를 불러 이미 반영됐는지 본다.

전송량: 저장 한 번에 계정 전체 읽기가 두 번(서버 확인 읽기, 브라우저 확인 읽기)이다. 로그인 때도 여러 번이다. 응답을 줄이는 설계(진행판 갈래 C)는 자동 읽기만이 아니라 이 읽기들도 다뤄야 한다.

### 3.3 충돌

- 동시성은 계정 `revision` 하나로 확인한다. 보낸 `expectedRevision`이 지금 값과 다르면 `revision-conflict`로 거절한다.
- 거절 사유: `invalid`, `unauthenticated`, `not-found`, `revision-conflict`, `idempotency-conflict`, `undo-conflict`, `unavailable`, `no-change`.
- 다른 기기 변경이 들어오면 입력을 보관하고 보호 상태로 바꾼다. 문서 단위 병합(`text-merge.ts`)이 먼저 적용될 수 있는지가 10/30 유휴 중지 리뷰의 수정 대상이었다.

### 3.4 메모·REA 계정군

- 계정을 읽어 REA 형식이면 `rea`, 메모 형식이면 `memo`, 아니면 기본 v11 경로로 나눈다.
- 메모 전용 계정은 첫 본문 저장 때 `flowme-rea-text/2` 형식으로 바뀐다.
- 쓰기는 `/api/alpha/writing/[documentId]`로 문서 단위로 보낸다. 계정 수는 미확인이다(진행판 선반 S6).

## 4. Supabase

### 4.1 구성

- 계정 하나 = 테이블 `public.flowme_alpha_accounts`의 한 행, `account` jsonb 한 덩어리. 문서·제작 도구·자료실·위치가 모두 이 안에 있다.
- 쓰기는 DB 함수로만 한다. 브라우저는 자기 계정 행을 읽기만 한다.
- 명령 로그 `alpha_operations_v1`: 요청마다 한 행, 되돌리기 정보 포함. 정리 작업이 없다.
- 공개(이야기) 저장소는 `alpha_social_state_v1` 한 행을 모든 계정이 같이 쓴다. 판본은 계정과 따로 센다.
- 자료실 콘텐츠는 DB 테이블이 아니다. 서버가 파일에서 읽어 계정의 `space.catalogLibrary`·`creatorWorkspace`에 사본으로 넣는다.
- 보존: `flowme_alpha_preservation_read_v1`은 계정 + 공개 저장소 + 명령 로그 + 가져오기 원본을 최대 30 MB까지 한 번에 돌려준다.
- 마이그레이션: 저장소(#218 브랜치 `supabase/migrations/`)에 22개, 라이브 DB에는 33개가 적용돼 있다(9/20 M2 ~ 10/28 `alpha_personal_authoring_v1_20261028`). 저장소에 없는 11개(실험·복원 시험·백업 작업·자료실 보충·personalAuthoring)의 SQL은 이식 때 찾아서 저장소에 둔다.

### 4.2 앱이 부르는 RPC

| 이름 | 누가 | 응답 |
| --- | --- | --- |
| `flowme_alpha_social_open_v1` | 브라우저, 세션 첫 읽기 | 작음 |
| `flowme_alpha_social_read_v1` | 브라우저, 모든 읽기 | **계정 전체** + 공개 저장소 + 별칭 |
| `flowme_alpha_open_account_v1` | 브라우저, 새 개인 공간 만들기 | 계정 전체 |
| `flowme_alpha_execute_v1` | 서버, 개인 공간 쓰기 | 영수증 |
| `flowme_alpha_lookup_v1` | 서버, 끊긴 요청 확인 | 영수증 또는 없음 |
| `flowme_alpha_social_execute_v1`, `flowme_alpha_social_server_read_v1` | 서버, 이야기·공개 | 영수증 / 공개 맥락 |
| `flowme_alpha_creator_execute_v1` | 서버, 제작 공간 | 영수증 |
| `flowme_alpha_social_media_stage_v1`·`_read_v1`·`_cancel_v1` | 서버, 사진 | 작음 |
| `flowme_alpha_preservation_read_v1`·`_execute_v1`·`_execute_v2`, `flowme_alpha_preserved_media_check_v1`·`_read_v1` | 서버, 백업·복원 | 읽기는 최대 30 MB |

앱 코드에는 `flowme_alpha_capacity_*` 두 개도 있지만 DB에 없고 운영 설정에서 쓰이지 않는다.

### 4.3 크기 (10/30)

| 대상 | 크기 |
| --- | --- |
| DB 전체 | 113 MB / 500 MB |
| 명령 로그 `alpha_operations_v1` | 76.5 MB, 약 2,491행(행당 약 30 KB) |
| 계정 테이블 | 11.7 MB, 11행 |
| 공개 저장소 | 0.1 MB |
| Storage | 57.9 MB, 객체 4개 |
| 실계정 001 계정 jsonb | 7.33 MB(제작 도구 7.26 MB, 문서 37 KB) |

명령 로그가 DB의 2/3를 넘는다. 되돌리기에 필요한 최근 행만 남기는 정리 설계가 필요하다(DB 변경이라 따로 승인).

## 5. 계정 자료 형식

- 계정: `{ schema: 'flowme-alpha-account/1', ownerId, revision, source, space, legacyUndo, legacyReceipts }`. 크기 한도 30,000,000 bytes, 깊이 120.
- `space`(`ProgramPrivateSpace`) 주요 필드: `text`(문서 본문, `version 11`), `personalAuthoring`(개인 Flow 작성), `creatorWorkspace`(제작 도구), `catalogLibrary`(자료실 사본), `archivedDocumentIds`, `documentTrash`, `copies`, `publications`, `publicationDrafts`, `position`, `timelineOrders`, `executionTimelineOrders` 외.
- 명령 스키마: `flowme-alpha-command/1`(개인), `flowme-alpha-social-command/1`, `flowme-alpha-creator-command/1`. 공개 맥락: `flowme-alpha-social-projection/1`. 백업 파일: `flowme-alpha-backup/1` 계열. 메모 계정군 본문: `flowme-rea-text/2`.
- `source`는 예전 로컬 PoC 봉투(`flowme-integrated-product-poc/1`)의 출처 정보이고 명령으로 바뀌지 않는다.

## 6. 공개·사본·제안·철회

- 공개: 개인 문서의 Flow를 판본으로 공개한다(`ProgramPublisher.tsx`, `publication.ts`). 철회한 뒤 다시 공개하는 기능은 없다(누락 기능 C9).
- 사본: 공개 Flow를 가져오면 개인 공간에 사본 문서가 생긴다. 할 일마다 '날짜:'와 원문 속성 줄이 붙는다.
- 제안: 사본에서 고친 것을 작성자에게 제안하고 작성자가 검토한다.
- 출처 재검토 보류는 `catalog-`로 시작하는 Flow에만 걸린다. 계정이 일반 경로로 공개한 Flow에는 걸리지 않는다.
- 일반 공개 경로는 출처 확인 날짜를 비워 둔다(S-a에서 표시만 고침).

## 7. 저장소 밖 자료와 브라우저 저장

| 자료 | 위치 |
| --- | --- |
| 운영 설정 | 운영 설정 worktree(`flow-alpha-backup-5d-publish-20260929`). [Alpha 운영](ops.md) 3절 |
| 자료실 묶음 | `flow-poc-merge-prep-20260920/lib/flow/integrated-poc/catalog-library-pack.v1.json` (권리 미결 128건) |
| 탭별 복구(보관한 입력, 대기 요청) | 브라우저 sessionStorage |
| 문서 단위 보관 | 브라우저 localStorage |
| 예전 쓰기 방식 선택 키 | localStorage. 쓰기 A(S1)가 더 읽지 않는다. 남은 키는 지우지 않는다 |

## 8. 남은 확인

- 메모·REA 형식을 DB가 어떻게 받는지(계정 형식 함수 정의 대조)
- Auth 설정(가입 허용, 이메일 확인, OAuth, 리다이렉트 URL)
- 계정 삭제가 이야기·사진·보존 자료 때문에 막히는지
- 만료된 사진 임시 객체, 계정마다 revision과 로그 행 수가 맞는지
- `flowme_alpha_social_read_v1` 호출 수·시간, 응답 압축 여부와 과금 기준
