# K3-B B1-D — Plan metadata 삭제·복구 검증

2026-09-05. **새 삭제 순수12개, 실제 coordinator의 메모리 fault8개, 독립 검토 후 추가한 조합3개가 통과했다.** C/Plan/기존 저장·삭제를 함께 실행한 최종394개도 통과했다. 사용자 화면에는 아직 새 Plan metadata 쓰기를 열지 않았으며, 사용자의 데이터를 실제로 삭제하지 않았다. [설계](./k3b-plan-delete-connection-design.md)를 따른다.

## 요구별 연결

| 요구 | 수정 전 | 반영·현재 증거 |
|---|---|---|
| 선택 사본의 개인 수정도 영구 삭제 | 새 Plan metadata 때문에 소유 범위 미확인으로 삭제 차단 | 실제 P의 strict raw 검증 뒤 exact Flow entry의 binding·capture·overlay 전체 제거. 마지막 entry이면 metadata 루트 제거 |
| 같은 제목·같은 내용의 이웃 사본 보존 | 새 metadata 조합 검증 없음 | full ref·savedCopyId·sourceFlowId·localFlowId 대조. 이웃 entry와 Quick의 독립 Flow 보존 |
| 삭제 전 Undo/archive의 개인 내용 잔류 방지 | 새 capture 정리 미연결 | current와 Undo 각각 검증. 기존 삭제의 전체 Undo null 유지. legacy/archive reserved 충돌은 자동 채택하지 않고 차단 |
| journal 정리 전에는 삭제 완료 아님 | 기존 일반 삭제 coordinator는 구현돼 있으나 새 metadata 조합 근거 없음 | 실제 S.preparePermanentDelete/commitPrepared/loadActionRecovery/recoverAction/cleanupCommitted를 메모리 저장 fixture에서 실행. confirmed journal에 private before가 남으면 미완료이며 정리 후에만 완료 |
| 실패·손상·취소에서 다른 값 보존 | 기존 보호를 새 metadata에 연결해야 함 | 각 write 전/후 오류·각 write 뒤 읽기 실패·모든 중간 snapshot 복구·confirmed 정리 실패·이웃 overlay 주입 거절·cancel/stale/unknown 차단 |

이 모듈은 별도 writer·key를 만들지 않는다. 기존 명시 영구 삭제가 소유하는 PoC old/new/source key와 journal만 사용하며, 일반 저장의 legacy bytes 보존 계약은 바꾸지 않는다. raw source 전체 삭제는 선택 사본에 소유된 PoC payload에 한정한다. 운영 원문·독립 CreatorDraft·작업 중 작성 초안은 보존한다.

## 실제 실행과 개수

| 실행 | 결과 | 근거 |
|---|---|---|
| 신규 삭제 연결 수정 전 | 12개: PASS4 / FAIL8 | RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-delete-red-2026-09-05T11-04-36-043Z.json`). 8개는 새 metadata 때문에 안전 차단되던 정상 삭제 경로. 기존 제품이 데이터를 잘못 삭제했다는 결함8개로 세지 않음 |
| 신규 삭제 연결 수정 후 | 12/12 PASS | GREEN (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-delete-green-2026-09-05T11-05-17-040Z.json`). 기존 D34 기대값 수정0 |
| 새 metadata + 실제 삭제 coordinator | 8/8 PASS, 첫 실행 | fault8 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-delete-storage-first-2026-09-05T11-08-21-743Z.json`). 실제 모듈을 메모리 저장 fixture로 호출한 결과이며 브라우저 아님 |
| Plan/C/새 삭제/기존 회귀 합동 | 391/391 PASS | 합동391 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-checkpoint-delete-combined-2026-09-05T11-08-26-005Z.json`). 기존353 + C신규18 + 삭제신규12 + fault신규8. 위 하위 수와 중복 합산하지 않음 |
| 독립 검토 후 source/Undo/null seed 조합 | 3/3 PASS | 추가3 (로컬 전용 근거: `../../../output/k3b/plan-delete-review-first-20260905.tap`). 실제 S 모듈과 메모리 fixture 사용 |
| 위 조합을 포함한 최종 합동 | 394/394 PASS | 최종394 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-checkpoint-delete-final-2026-09-05T11-14-03-564Z.json`). 기존353 + C18 + D12 + 저장8 + 추가3. 391과 더해 고유 개수로 세지 않음 |

모든 최종 실행에서 FAIL/skip/cancel/todo0이다. 각 write 위치·중간 frame 반복은 등록 검사 수에 더하지 않았다. `node --check` D PASS. 동료가 설계·D diff·신규12개를 읽은 범위에서 추가 제품 결함을 찾지 않았으며, applied source+source Undo·null seed와 새 metadata의 조합3개를 보강했다. 394 실행 중 P의 별도 Sa reader 추가 작업은 진행 중이었다. 따라서 이 결과는 기존 P4 API/C/D/E2 회귀이며, Sa가 동결된 최종 버전의 검증으로 확대하지 않는다. 새 source reader와 session 구현 동결 후 합동 검사를 다시 실행한다.

## 신규 시나리오별 판정

| 등록 | 범위 | 결과 |
|---|---|---|
| B1D01–05 | 선택 private capture/overlay 삭제, 동일문자 이웃, 다른 Flow, Quick, Undo에만 metadata | 5/5 PASS |
| B1D06–08 | current/Undo 손상·foreign·raw drift, legacy/archive collision·unknown owner, 취소/stale/휴지통 밖 | 3/3 PASS, candidate 없음 |
| B1D09–12 | reload 후 일반 Undo 부활0, 실제 UMD lazy P/버전·ambient 접근0, 잘못된 tuple, 실행/순서/source facts 보존 | 4/4 PASS |
| B1DS01–02 | pending source와 새 Plan이 함께 있는 실제 삭제 저장·정리 및 모든 중간 snapshot 복구 | 2/2 PASS |
| B1DS03–05 | 각 write 전 오류, throw-after, 읽기 손실 뒤 재로드 복구 | 3/3 PASS |
| B1DS06–08 | confirmed cleanup 실패 후 target 추가쓰기0, 이웃 overlay 주입 journal 거절0쓰기, 확인된 source 부재 유지 | 3/3 PASS |
| B1DR01–03 | applied source와 source Undo, 모든 중간 frame, legacy key가 실제로 없는 null seed의 복구 | 3/3 PASS |

P의 disposable projection은 검증에만 사용하고 버린다. 삭제 입력이나 writer candidate로 effective view를 재사용하지 않는다. 입력 객체·raw 문자열은 시험 전후 동일하다. 문자열 전체를 검색해 삭제 소유자를 추정하지 않으며, 선택 owner에만 있는 private sentinel의 제거와 이웃 동일문자 보존을 따로 검사한다.

## 저장·운영 경계

새 fault8은 매번 격리 Map fixture를 만든다. 실제 사용자 localStorage·사용자 프로필·운영 서버는 사용하지 않는다. 운영 sentinel은 공백·CRLF·한글·이모지·tab을 포함하며 모든 경로에서 exact 문자열을 비교한다. writer의 허용 key는 S의 고정 STORAGE/LEGACY/SOURCE/RECOVERY 네 개뿐이며, 밖의 set/remove와 모든 clear는 기록하고 거절한다. 금지 호출0, CreatorDraft·working draft fixture bytes도 동일하다.

정상 삭제 성공은 workspace target set1회다. legacy/source 변경·journal prepare/confirm/cleanup 호출은 이 수와 별개다. confirmed cleanup 재개 시험에서는 target 추가쓰기0을 직접 확인했다. 전체 fault 반복의 API 호출을 합산해 제품 사용 횟수로 보고하지 않는다.

추가3의 12개 격리 메모리 저장 context에서는 read547회, set22회, remove13회를 관찰했다. mutation35회는 target8/journal18/old-source9로 구분된다. 고정 허용 key 밖 호출0, clear0이다. 운영 sentinel12회와 CreatorDraft/작업 초안24회의 exact 비교 총36회에서 차이0이었다. 중간 frame은 applied source 조합5개(prepare4/confirm1), null seed 조합4개(prepare3/confirm1)를 확인했다. 이 수들은 등록 검사3개에 더하지 않는다.

## 소유 파일과 남은 연결

- 제품: [workspace-permanent-delete.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-permanent-delete.js), SHA `A8448A47E89A3BEE4C9288AA58F71ECEC226A52ED58DFE14E9EAFE9353F97DF3`.
- 정확 이전본: D backup (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-plan-delete/workspace-permanent-delete.js`), SHA `8005B2AA8F85E249F26533D77CF3AEED7520D117AE5D6874C80C3A40C18087A1`.
- 신규 [순수12](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-context-permanent-delete.test.cjs), SHA `B4FF2E07E98BD289AC8FFB32BED1B9190FE07B00BAACFDD73300CE080240CBAF`.
- 신규 [fault8](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-context-delete-storage.test.cjs), SHA `FC1A9AF6BBF1676CC6771B0764D81E948911661522A6988CC0457927E934429F`.
- 신규 [독립 검토 조합3](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-context-permanent-delete-review.test.cjs).
- 이 설계·QA 문서. C/P/E2/S/app/builder/사용자 HTML은 이 삭제 하위 작업에서 수정하지 않았다.

source-bound reader·source-aware 정규화·새 Plan/Item draft session/journal·실제 UI 연결은 진행 중이다. 이 결과는 전체 B1 또는 두 runtime의 편집 동등성 완료가 아니다. 사용자 두 HTML은 마지막 검증본 B14A로 동결했다. 현재 새 C/D 소스와의 생성 비교 차이를 임의로 기대값 완화하지 않는다.

이 하위 작업의 npm 전체·production build·브라우저5화면·실제 Android Chrome/iOS Safari·IME·보조기술은 미실행. 관찰 사용자0명. commit 없음, push 없음, PR 없음, Preview 없음, Production 없음.
