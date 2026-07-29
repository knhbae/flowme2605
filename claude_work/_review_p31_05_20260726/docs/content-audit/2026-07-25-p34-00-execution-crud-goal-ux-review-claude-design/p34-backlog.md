# P34 구현 backlog — execution CRUD / 조작 문법 정합

**작성** claude_design · 2026-07-25 · **기준 commit** `8c54992` · **PR** #156(draft, open) · **observed-user** 0

이 backlog는 새 기능 목록이 아니다. 이번 검토에서 **근거로 확인된 gap**만 slice로 만든다.
목표 관리(별도 Goal 객체)는 slice가 아니다 — `P34-07`은 조건부 보류 항목으로만 남긴다.

## 순서와 dependency

```
P34-01 ──▶ P34-02
   │
   ├─▶ P34-03 ──▶ P34-05
   ├─▶ P34-06
   └─ (독립) P34-04
                 P34-07  ← observed-user gate 통과 전 착수 금지
```

---

## P34-01 · Flow lifecycle 명령의 단일 소유자

- **문제** 집중 워크스페이스에서 보관/복구/영구 삭제가 사라진다. 사용자가 "이건 정리하자"고 결정하는 순간(=Flow를 열고 본 직후)에 경로가 화면에 없다. 보관함 진입점은 보관 이력이 생긴 뒤에만 나타난다. (finding H-1, M-6 · P1-C, P6-C)
- **route** `/my`, `/my?view=flows`
- **범위** 열린 Flow의 command 영역에 lifecycle 그룹 1개(보관 / 복구 / 이 기기에서 영구 삭제) 추가 · 목록 카드 메뉴와 **같은 순서·같은 문구** · 보관함 진입점 상시 노출(0건이면 "보관한 Flow 없음")
- **비범위** 4탭 IA · 저장 identity · storage schema · 새 필터 축 추가
- **dependency** 없음
- **데이터 영향** 없음(`flow:my-flow:lifecycle:v1` 읽기/쓰기 그대로)
- **acceptance 390** 워크스페이스에서 보관까지 tap depth ≤ 2 · 고정 하단 4탭과 겹침 0 · 스낵바가 탭 위에 표시
- **acceptance 1024** rail/canvas/inspector 유지 · 명령 위치가 목록 카드와 동일 라벨
- **접근성** 메뉴 트리거 accessible name에 대상 Flow 제목 포함 · 보관/복구 상태 전이를 aria-live로 announce · 포커스는 실행한 컨트롤로 복귀
- **screenshot marker** `p34-01-workspace-lifecycle-390.png`, `p34-01-archive-empty-1024.png`
- **E2E marker** `P34-LIFECYCLE-SINGLE-OWNER`, `P34-ARCHIVE-ENTRY-ALWAYS-PRESENT`
- **rollback** 명령 그룹을 목록 카드 전용으로 되돌리는 flag 1개(데이터 마이그레이션 없음)

## P34-02 · "이 기기에서 영구 삭제"를 계약으로 만들기

- **문제** 문자열이 `docs/STATUS.md`·`docs/DECISIONS.md`에만 존재하고 `tests/e2e` 0건, `personal-flow-lifecycle.ts`에는 삭제 API가 없다(archive/restore만, 백업 동기화 대상도 `archivedFlowSlugs`). 구현 여부는 열람 한도 밖이라 **판정 불가**지만, **파괴적 조작에 회귀 계약이 없다는 사실은 확인**된다. (finding H-2)
- **route** `/my`
- **범위** 삭제 대상 key 목록을 lifecycle 모듈의 명시 API로 이동 · 삭제 전 "무엇이 사라지는가"(항목 수·메모 수·완료 기록·백업 유무) 고지 · 백업 받기 유도 1회 · 되돌릴 수 없음 문구 · E2E marker
- **비범위** 계정/서버 저장 · 휴지통(soft delete) 신설 · 보관 정책 변경
- **dependency** P34-01
- **데이터 영향** **높음** — 삭제 대상 key 집합을 확정해야 한다(`flow:saved:*`, `flow_builder_mvp_item_state_*`, `flow:my-flow:item-drafts`의 해당 prefix, anchorDate, run 기록). 부분 삭제로 고아 key가 남지 않을 것.
- **acceptance 390/1024** 삭제 후 남은 관련 key 0 · 다른 Flow의 key 변화 0 · 새로고침 후 복원 안 됨이 화면과 저장소 양쪽에서 확인
- **접근성** 확인 다이얼로그 포커스 트랩·Escape 취소·기본 포커스는 취소
- **screenshot marker** `p34-02-delete-confirm-390.png`
- **E2E marker** `P34-PERMANENT-DELETE-KEY-SET`, `P34-PERMANENT-DELETE-ISOLATION`, `P34-PERMANENT-DELETE-BACKUP-OFFER`
- **rollback** 삭제 명령 비활성 flag(보관까지만 노출)

## P34-03 · 제외·삭제·완료·보류 4상태의 어휘와 복구함 통일

- **문제** 같은 의도가 표면마다 다른 동사로 나타난다: 저장 전 "저장에 포함" 체크박스, 저장 후 "Flow에서 빼기", draft "삭제"+confirm, 실행 "보류". 복구 위치도 접힌 "뺀 항목", confirm 문구 안내, 보류 목록으로 흩어진다. (finding M-1 · P5-C)
- **route** `/f/*`, `/my`, `/calendar`
- **범위** 4상태를 사용자 어휘 3개로 정리(**포함 안 함 / 완료 / 보류**)하고 파괴적 삭제는 draft에만 남김 · Flow 하나당 복구함 1개 · 같은 라벨을 저장 전/후에서 동일 사용
- **비범위** `personalExcluded` 저장 형식 변경 · legacy sentinel 읽기 호환 제거
- **dependency** P34-01
- **데이터 영향** 없음(표시 계층만). legacy `excluded_on_start`는 계속 읽기 호환
- **acceptance 390/1024** 같은 조작의 라벨이 표면 간 100% 일치 · 복구 경로 tap depth ≤ 2
- **접근성** 체크박스 accessible name에 결과 상태 포함
- **screenshot marker** `p34-03-recovery-drawer-390.png`
- **E2E marker** `P34-EXCLUSION-VOCABULARY-PARITY`, `P34-SINGLE-RECOVERY-DRAWER`
- **rollback** 라벨 map 1개 되돌리기

## P34-04 · 반복 occurrence 단위 수정(이번 회차만)

- **문제** 완료·재개는 회차 단위인데 수정은 series 단위만이다. "이번 회차만" 컨트롤은 문자열·testid 모두 0건. 반복 사용자의 가장 흔한 조작(이번 주만 시간 변경/건너뛰기)이 없다. (finding H-3 · P3-B)
- **route** `/calendar`, `/my`
- **범위** occurrence 상세에 수정 범위 선택(이번 회차만 / 이후 전체 / 전체) · 이번 회차 건너뛰기와 되돌리기 · 예외가 생긴 회차 표식
- **비범위** 새 반복 규칙 문법 · 타임존 정책 변경 · 외부 캘린더 양방향 동기화
- **dependency** 없음(`seriesId`와 occurrence identity가 이미 존재)
- **데이터 영향** **높음** — occurrence override 저장 형식 신설 필요. ICS는 `RECURRENCE-ID`/`EXDATE` 산출로 확장되며 현재 계약(단일 VEVENT, EXDATE 없음)을 바꾼다. export parity 재검증 필수.
- **acceptance 390/1024** 이번 회차 수정 후 다른 회차 불변 · 새로고침 유지 · export 수량이 화면 수량과 동일
- **접근성** 범위 선택은 라디오 그룹 · 기본값은 가장 안전한 "이번 회차만"
- **screenshot marker** `p34-04-occurrence-scope-390.png`, `p34-04-series-vs-occurrence-1024.png`
- **E2E marker** `P34-OCCURRENCE-SCOPE-EDIT`, `P34-OCCURRENCE-EXPORT-PARITY`
- **rollback** 범위 선택 UI 비활성 시 series 수정만 남고 저장된 override는 읽기 전용으로 표시

## P34-05 · undo 계약 단일화

- **문제** undo 주인이 최소 3개다: lifecycle 스낵바, 배치 스낵바, Calendar 패널 내부 되돌리기. 위치·문구·지속시간이 서로 다르다. (finding M-2)
- **route** 전 표면
- **범위** undo 표면 1개(위치·지속·문구·포커스 정책) · 파괴 강도별 정책 표(즉시 undo / confirm / 둘 다)
- **비범위** 새 알림 시스템 · 히스토리 스택
- **dependency** P34-03
- **데이터 영향** 없음
- **acceptance 390** 고정 4탭 위 표시, 겹침 0 · **1024** 실행 컨트롤 근처 표시
- **접근성** `role=status` · 포커스 이동 없이 announce · 키보드로 도달 가능
- **screenshot marker** `p34-05-undo-parity-390.png`
- **E2E marker** `P34-UNDO-SINGLE-CONTRACT`
- **rollback** 표면별 기존 스낵바로 복귀

## P34-06 · 항목 편집 진입 1개 경로

- **문제** 빠른 수정이 있으면 1탭, 없으면 요약 펼치기 → 수정 토글로 3탭. E2E 헬퍼조차 두 경로를 분기 처리한다. (finding M-3 · P1-B, P8-B)
- **route** `/my`, `/calendar`
- **범위** 모든 item 행에서 동일한 편집 진입 1개 · 읽기 요약은 읽기 전용으로 유지
- **비범위** editor 필드 구성 변경 · 고급 필드 노출 정책
- **dependency** P34-01
- **데이터 영향** 없음
- **acceptance 390/1024** 6개 콘텐츠 형태 전부에서 편집 진입 depth 1 · 진입 경로 분기 0
- **접근성** 편집 버튼 accessible name에 항목 제목 포함
- **screenshot marker** `p34-06-edit-entry-parity-390.png`
- **E2E marker** `P34-EDIT-ENTRY-SINGLE-PATH`
- **rollback** 헬퍼 분기 복원

## P34-07 · (조건부 보류) bounded goal overlay

- **문제 아님 — 가설.** 장기 Flow에서 "계속할지" 판단 신호가 완료 카운트뿐이다(P4-C). 그러나 목표 객체가 답인지는 **근거 없음**.
- **판정** 이번 검토 추천은 **A(별도 Goal 객체 없음)**. B는 observed-user 근거가 생기기 전까지 착수 금지, C는 적용 금지.
- **B를 열게 될 유일한 조건** 실제 사용자 3명 이상이 장기 Flow에서 "다음에 다시 볼 날짜"를 스스로 만들려 시도한 관찰 기록
- **B의 최대 범위(넘지 말 것)** Flow당 필드 2개(목표 한 줄 / 다시 볼 날짜) + 기존 단계(6단계)를 마일스톤으로 재사용. 새 객체·대시보드·습관·성과 추적 없음
- **rollback** 필드 2개 숨김(데이터는 메모와 같은 overlay에 저장)
