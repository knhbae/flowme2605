# P3-B owner·adapter 경계

| 계층 | 이번 PoC의 읽기/쓰기 | 현재 owner | 이번 판정 |
|---|---|---|---|
| SourceSnapshot / 입력 원문 | source snapshot은 읽기 전용, exact working copy는 PoC authoring draft에만 쓰기 | 입력한 사용자 또는 제작자 | 분리 유지 |
| CreatorDraft | 전용 library에서 로컬 읽기·쓰기 | creator PoC lane | D2-057 대상 |
| canonical Item/Step/Flow preview | 원문에서 versioned projection만 생성 | adapter 후보, 운영 owner 아님 | D2-002 부분 유지 |
| Personal Flow / overlay | 기존 PoC 개인 저장 경로만 사용 | 개인 사용자 | CreatorDraft와 분리 |
| Execution placement / completion | 개인공간 shadow state에서만 사용 | 개인 실행 사용자 | CreatorDraft에 포함 금지 |
| PublishedVersion | 읽기·쓰기 없음 | 미결정 | D2-004 부분 유지 |
| ExportSnapshot | 기존 운영 writer 호출 없음 | 미결정 | D2-004 부분 유지 |

## 결정 가능한 비교안

### A. production CreatorDraft가 canonical preview를 소유

- 장점: 제작자가 검토할 구조와 revision을 한곳에서 관리할 수 있다.
- 위험: SourceRow→Item→Step→Flow adapter의 schema·migration·충돌 정책을 함께 결정해야 한다.
- 재검토 조건: account-backed creator workspace와 server revision 저장이 승인될 때.

### B. Source document가 소유하고 CreatorDraft는 projection 참조만 보관

- 장점: 원문을 정본으로 유지하며 canonical schema 변경을 늦출 수 있다.
- 위험: parser/compiler 버전이 바뀔 때 같은 초안의 preview 재현 계약이 필요하다.
- 재검토 조건: compiler versioning과 deterministic replay 정책이 준비될 때.

P3-B는 어느 안도 영구 정책으로 선택하지 않는다. 로컬 record는 exact raw bytes와 source fingerprint를 보관하고, preview는 현재 PoC adapter로만 계산한다.

## source label 계약

- 목록의 `sourceLabel`은 exact `rawText`에서 첫 `http(s)` URL을 파생한다.
- URL이 없으면 `직접 작성한 원문`으로 표시한다.
- label 생성과 검색은 원문·library·working draft에 write하지 않는다.
- 이 label은 검색·표시용 replaceable projection이며 `SourceSnapshot`, `sourceRefs`, 외부 provider identity를 소유하지 않는다.
- production source metadata와 SourceRow adapter는 `D2-002`의 잔여 결정으로 유지한다.

## 금지된 결합

- CreatorDraft 저장 성공을 Personal Flow 저장 성공으로 재사용하지 않는다.
- 개인 폴더·날짜·완료·메모·실행 순서를 CreatorDraft record에 넣지 않는다.
- CreatorDraft를 PublishedVersion, 공개 후보, ExportSnapshot으로 표현하지 않는다.
- 기존 `flow:map:creator-draft:*`, `flow:map:published-local:*` writer와 운영 완료·메모·날짜·보관·export writer를 호출하지 않는다.
- PoC 외 key를 지우지 않으며 `localStorage.clear()`를 호출하지 않는다.
