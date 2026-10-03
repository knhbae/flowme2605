# CP1 선행 보안·출처 소유와 동결 목록

2026-10-03. CP1 전용 branch `agent/alpha-core-journeys-cp1-20261003`, base `d1cc8dd1cbc1a220054f458aea369393642f71ed`.

원 r6 선별34파일은 [기존 manifest](manifest.md)에 남긴다. 아래는 승인된 선행 보안 해결의 추가44파일이다. 원 r6 snapshot과 별개의 보안 유지보수 후보이며 r6 전체 source byte 불변을 주장하지 않는다. 기계적 공식 alias36파일277줄 외에 앱 저장/분기/데이터 로직을 바꾸지 않는다. 해당 기능·노출 변경인 출처 검토는 별도 묶음으로 더한다. 이 표 자체와 common QA 문서는 재귀 hash 대상에서 제외하고 게시 manifest에서만 별도 소유한다.

## D — 의존성과 CSS·공식 alias 44파일

공식 Tailwind4.3.3/`@tailwindcss/postcss`4.3.3을 고정하고 v3의 braces/chokidar/micromatch/fast-glob 경로와 autoprefixer를 실제 제거했다. 잠금 파일은 registry 설치로 갱신했다. 기존 CI source 경계 검사가 기대던 전이 YAML은 기존 HEAD lock과 동일한 공식2.9.0을 direct devDependency로 선언해 재현 가능하게 했다. YAML은 CI test1곳만 사용하며 제품 import는0이다. CSS의 팔레트·ring/preflight 기본값과 기존 전역 우선순위를 보존하며 space/divide의 hidden sibling·physical edge만 제한된 PostCSS 호환 처리로 보존한다. `outline-none → outline-hidden`, `shadow-sm → shadow-xs`, `backdrop-blur-sm → backdrop-blur-xs` 등 공식 utility 명칭만 전환했다.

SHA256은 작업본의 실제 파일 bytes다. CP2로 가져올 때 변경되지 않은 파일만 그대로 복사하며 CP2 소유 변경이 겹치면 이 공식 alias만 적용한다. CP1 원 r6 자료나 새 CP2 기능 전체를 반대 작업본으로 복사하지 않는다.

| repo-relative path | SHA256 |
| --- | --- |
| `app/globals.css` | `8605aa052b50d1cd649abda526a253cf73fcba7f25b70c125e6df84a8c067f79` |
| `app/tailwind-v3-compat.css` | `b3107b3443467dedfc92ebc29888c03128fb369a01e6677a28ad92f2e3c82efb` |
| `components/flow/AppClient.tsx` | `353df657613a02b12d071d0254ff6e49417f8c4dde9535006bfb70b81eed6fb3` |
| `components/flow/ArtifactWorkbench.tsx` | `9c7186eaed0e214786e3b2b18e21d793d3d4553d6cfe275d92a660ce5c043ec6` |
| `components/flow/CalendarFlowScopePicker.tsx` | `b8b8122f0402133f836051e01fa8f45811869c6895556310e9c25aee1e126cba` |
| `components/flow/FlowArtifactDataPreview.tsx` | `82bf2fb28a8cc5fb0ade7e0ea55bfe92ebad60d67a73ba628640b256eadfff27` |
| `components/flow/FlowCapabilityResultPreview.tsx` | `68e212397e35a21a4d81ca80f36b5fa0550158511c10975e83e1219e4cc940ae` |
| `components/flow/FlowContextDisclosure.tsx` | `c9cea30393c5a5452bfb2ac12c7c608c699d1ab25fd9b1441fa68de0d020c007` |
| `components/flow/FlowEditorSurface.tsx` | `49c9410d7d78994fd5561c1d5b4c961e2c2ea0e40974187bf85ba2113393a448` |
| `components/flow/FlowExecutionPrimitives.tsx` | `36ce0727c803590a6383c7d6b492895e467b6e3523ebff79a6eeae2127725d97` |
| `components/flow/FlowExportPanel.tsx` | `73847d46218846380449b66e2a8a6f2429e92e31b9d1530f378c917375d49a81` |
| `components/flow/FlowItemMultiSelect.tsx` | `7cc858d9c18ba179d7ffea856e9343a73f5cdbb5ef0ffd0a8c145ecd771e9f08` |
| `components/flow/IaComparisonPoc.tsx` | `b13ca52361f375562c1734a2f1b1389563904808291ea132ebcec3d61aa23a8e` |
| `components/flow/KoreanFlowContentStudio.tsx` | `19ef0911f2820f85f7ee87007a759af377b6c4c613f8b15f58e16b1a3cbc533a` |
| `components/flow/MovingD30Restart.tsx` | `135d99a6567c6d8fcadac39e803f8afaf760b42d630e7ec6e39695964207785d` |
| `components/flow/my-flow/experiences/MyFlowR3aLabSurface.tsx` | `c641cdf1d94a4b6643f052ed188cca419e74831b7e2f32b2cef4062f583361cf` |
| `components/flow/my-flow/MyFlowSortMenu.tsx` | `b5ee641d91e7251a46784b576a036078e4a72d3403a78179a1b9ceaa1823ae68` |
| `components/flow/my-flow/MyPlanExecutionSurface.tsx` | `e599352519a1f92d2ce221ec3633450e95e9c40b33829c7b64546f8464e940a9` |
| `components/flow/P22ObservationSetup.tsx` | `b8f8b5ac604af485a498d03957ac064dd5de7236aaa8e0e8a9515f5ec8971334` |
| `components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx` | `ec607dba42e23754e269ca88c3c6c4dc70e8e85152b44ab825dad3bb8b3b61e3` |
| `components/flow/personal-workspace-poc/PersonalWorkspacePocCreatorDraftLibrary.tsx` | `c6878b0e817b5a7e4a16754ed6f0bcbb42e03e71b939d393ee1d55096a6448eb` |
| `components/flow/personal-workspace-poc/PersonalWorkspacePocEditorSurface.tsx` | `7f88500b19714f641653568dfb21409430cb28d4f16785059bf696f93d62aee6` |
| `components/flow/personal-workspace-poc/PersonalWorkspacePocEntryPreview.tsx` | `d1f47a489942e81905a395989c3cac971eab0daae695631c230a930320830489` |
| `components/flow/personal-workspace-poc/PersonalWorkspacePocLiveEditor.tsx` | `f8c0606eb5c24c96e506315937aa3f14a76a87b95fb793ce7e3934260ec0689e` |
| `components/flow/personal-workspace-poc/PersonalWorkspacePocPlanResultSurface.tsx` | `4b9da7622abac2899f9045348ef34bc0594a2fa534246f769cd3315bf9604850` |
| `components/flow/personal-workspace-poc/PersonalWorkspacePocReceiptSurface.tsx` | `977e62b0a711f0d09b6924fa072121fb6982d43de7703de26005de8294cd2b69` |
| `components/flow/personal-workspace-poc/PersonalWorkspacePocResultPresenter.tsx` | `5ff88dd74899520f6306fe34ad75bd247b6ac9cd3cb7994642f78e717aac2f60` |
| `components/flow/personal-workspace-poc/PersonalWorkspacePocSourceUpdateReview.tsx` | `672b451a12e30d15302cf8c056040702ccaa68bb30ee12f72a2941738dcdb623` |
| `components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx` | `e660b7d3e99c31827ac4b986f3e1fea7baed2e5511e1b82dcbdb3ba96a18a1a7` |
| `components/flow/personal-workspace-poc/PersonalWorkspacePocValidationExampleExplorer.tsx` | `5be0eb8bd51fc05e6c859a1f2647021c11454fc22ca809a403f22b6ab3381f88` |
| `components/flow/PublicFlowItemPreview.tsx` | `c43c12b6f59f4f9febbe5b9ca4f63c1073d7e14294043d83459452559d222747` |
| `components/flow/RoutineScheduleEditor.tsx` | `fc47f40df91cf2e70b731c5ff1b19053cd26dfbe20b0814683aa3510002d6844` |
| `components/flow/SavedFlowEditorSurface.tsx` | `b8bea5802d956eeec0172476fa5fd9d267809ce9c2ee15bd88fcf8ba3515ca38` |
| `components/flow/SavedFlowReceiptFrame.tsx` | `1b95762a0f867dfee72e1821940620bf965ce29df2fe17878c60517df5157848` |
| `components/flow/SourceBackedFlowMapChooseChildExperience.tsx` | `795e75ab446a4a3cf66916f5366145b7b8493b9d8a9b88e48774880761fc16dd` |
| `components/flow/SourceBackedFlowMapCreatorEditor.tsx` | `4f15b8061f4e46c887dc3ece9ac4f58f5fd20f5ea39193e175106d543c4f5372` |
| `components/flow/SourceBackedFlowMapSaveButton.tsx` | `96baed55265530b526684b1afb30ec49faa0628f31eacc9e6239d35c346b71bc` |
| `components/flow/UrlFirstP0Lab.tsx` | `ec7e36b4aba05a9c5eb0805f51a441ea7559dbd3af831921c37bffb36bbb1ea3` |
| `package-lock.json` | `558fcefdd2e4a36b42276d669430f87c13e53305409584e16cf84132d233ad89` |
| `package.json` | `1d4e0515c22d7fcb1f94790da07210195d53c125639c4daa341f63ed2960acc0` |
| `postcss.config.js` | `8dce68d810a7940fe355ea7add0a49bdc9b1d9b3ec3b8e5b5cd304c594f40e3a` |
| `scripts/tailwind-v3-compat.cjs` | `0bdcbcc20005601a1d711fec969457e6574afc461cb6fe7459d93d6edb23a366` |
| `scripts/tailwind-v3-compat.test.mjs` | `b4e4768b3715c6344f161636eadf43f45bf9a018dbdb17086528c1e7d85adcbe` |
| `tests/e2e/historical-app/postcss.config.js` | `7067fac5262f1c2dbf19e5a68aae15034b3b029a2e90dfc62e267912fff2558e` |

## E — 출처 검증과 기존 개인사본 보호

14개 bundle의 11개 실제 원문을 대조한 [출처 검토 정본](../../content-audit/2026-10-03-core-journeys-cp1-source-review.md)에 따른다. 일치7개만 검토 날짜를 갱신했다. 불일치/삭제7개는 원 자료·날짜·URL·version을 보존하고 기존 archive/hold 계약으로 새 공개 공급에서 제외했다. 기존 saved-record-only 개인사본은 유효한 정확 saved key·source identity가 일치할 때만 복구하며 snapshot 단독·삭제 save·다른 origin/namespace는 복구하지 않는다. 새 schema/저장 writer/실제 계정 쓰기는 없다. 2026-10-03 05:37:58 UTC published149/current126/reviewDue0/stale0/missing0, source 소유자 관련273/273 PASS와 새 targeted9/9 PASS를 별도로 기록한다. 아래15파일까지 최종 동결됐다.

| repo-relative path | SHA256 |
| --- | --- |
| `lib/flow/runtime-content-policy.ts` | `00065b148b26a4c44b49027b83e6d8fb5398d70cbd988b65e53437f24b2ee24d` |
| `lib/flow/source-backed-my-flow.ts` | `34f8557759f550cc7b17b7487d36836638be176c7103fd28ebab113fea6904bf` |
| `lib/flow/source-backed-expansion-260625.ts` | `693e2a2eb60cd9db9c1a3c2d0f504379f41be1af81a65a33e35507e91e1aa6ea` |
| `lib/flow/source-backed-curated-260630.ts` | `b8bfb45a0aa3819d61931a6dc4b74679051e58e70791c2dc5eee7d732944b663` |
| `components/flow/SourceBackedFlowMapPage.tsx` | `3c7e5941cd7ec9216f17e4158312c596fe27a6a778df0b24948569c34726b269` |
| `lib/flow/url-first-lookup.ts` | `9479eb5f9c0f016f19465b178cba065cf526a21990d13d26538435fdfdcd1ec8` |
| `lib/flow/source-backed-my-flow.test.ts` | `a6616dd93fabc3178e5b4d25d217d9c5c622b6071ccd7f8f104895af6fa66061` |
| `lib/flow/source-freshness.test.ts` | `3b4d9e83a585198fea6a7ef4067bfa984045dadc1ff98b123fb85da425684890` |
| `lib/flow/url-first-lookup.test.ts` | `e53d305fe0ff46dc7a9c919463c9ff9e68b3291f137f1a97ed063de71bb4e95d` |
| `lib/flow/source-backed-manual-registration-report.test.ts` | `4138705b6d18f4dc643dc9e6fd490db6be4a895244c10345d84a9c2896cc1059` |
| `lib/flow/source-backed-cp1-source-review.test.ts` | `fe3b9467379a318c3c8799908d608f581b5e69ee1c57132e1cd0a222a5d90c97` |
| `components/flow/SourceBackedFlowMapPage.cp1-source-review.test.tsx` | `459148841ed610f2e62399780b4dbbba8bef0a8557cd543be237e56e58d9c461` |
| `lib/flow/storage.ts` | `6492540b2937ec795e77231ab7e2f1e0e856181549be5455aa18d66aa449a0da` |
| `lib/flow/seed-flows.test.ts` | `8ddc0b18ba80120c7a0df207a6f2d8d53c1e0ad391fe3d26262d10eb29898842` |
| `docs/content-audit/2026-10-03-core-journeys-cp1-source-review.md` | `fe09edda15a17c2d23e75d394785d2ee685ec186011c33a3c97e220652232a82` |

## F — 새 exact-build QA 계약 2개와 원 A browser의 좁은 수정

`tests/e2e/ux-exact-build.ts`는 서비스·설정·네트워크를 실행하지 않고 정확 제공 Root/HEAD/build/static bytes와 실제 QA 실행 Root/HEAD를 연결한다. 원 A의 browser는 import/preflight build 선택/asset 증명 세 곳만 수정했다. CP2의 r7 browser 전체를 CP1로 복사하지 않는다.

QA 입력은 browser/config/fixture/새 helper와 Auth/folder/cloudflare fixture 및 tsconfig를 필수로 고정하고, local import·re-export·type import·literal require/dynamic import의 전체 의존 파일까지 닫는다. CP1 실제 closure는242개이며 private catalog pack은0이다. 제공 사본과 실제 실행 루트 모두 같은 QA bytes여야 한다. 검사 파일4개만 고정하거나 r6 manifest를 다른 r7 runner에서 쓰는 방법은 거절한다. 전체 compile 입력 목록의 완전성·소유·복사·hook build는 호출자가 별도로 증명해야 한다.

| repo-relative path | SHA256 |
| --- | --- |
| `tests/e2e/ux-exact-build.ts` | `870f27e236727f0a7c164fa991c9e6902a9ee4aae4d6312347949746dde703ab` |
| `tests/e2e/ux-exact-build.test.ts` | `11736e0553a6fb8fd489513cd04930be7bd5cb34549e10254183f438a3572ea0` |
| `tests/e2e/ux-comparison-gaps.browser.ts` — 원 A 경로의 수정판 | `1555bc665309bbc2f641028a951210bd9d6ef458e8e8d3b240ab256325d2a3c0` |

단위10/10 PASS는 정확 root/head/build, QA 의존 파일 누락·drift·실행 루트 불일치, compile CJS 누락, static 누락/추가/drift, private/traversal/junction 입력 거절, 관측 asset 일치 계약의 근거다. 제품 HTTP/browser gate는 아직 NOT_RUN이다.

## G1 — 실제 출처 재검토의 sealed 비교 검사 1파일

| repo-relative path | SHA256 |
| --- | --- |
| `lib/flow/integrated-poc/catalog-library.test.ts` | `e0d213650adf3504c4b540f58e9a30d0162cdae4eb6ff8105f07af39d0a14396` |

실제 확인한7개의 `source_checked_at` 단일 필드와 정확 old/new 날짜만 인정하며 옛9/30 delta6 계약도 보존한다. slug/date/updated_at/content/source_status 변조 negative, 보류7 raw 날짜/내용 유지와 새 공급 제외, sealed177/summary156/21Map 불변을 검사한다. frozen pack·validator·runtime·요약156은 수정하지 않았다. source 담당의 CP2 최종 bytes를 CP1 old SHA `07e5df85197d7477de3f5ea3327e9e20c01984773dacbc9f4836b5c51ebe4898` 및 새 SHA 대조 후 정상 복사했다. CP2 metadata-only15/15 PASS는 해당 작업본 근거이며 CP1 재검사는 별도 기록한다.

## H — 실행 성공 사례와 실제 출처 보류를 나눈 테스트 8파일

full private35FAIL 중30건은 보류7을 반영한 뒤에도 이전 moving/OPIC를 실행·검토 승인·개인 편집 성공 사례로 고른 기대값이었다. 오류 raw는 남기지 않고 공개 test filename/nested error code/해당 test line·column만 수집했다. 현재 원문 factory가 null이라는 가설은 실제26 Map 반환값 대조로 기각했다. 기존 품질 hold는 내용·기록을 유지하고 새 실행/변경을 막는 계약이며 runtime/policy/validator/frozen pack은 수정하지 않았다.

단일 source/review 성공 사례는 실제 `curated-ajd-moving-d30`5Step, 원자적2child review와 membership은 실제 `curated-wedding-checklist-family`6+4Step으로 옮겼다. 계획/기간·원본 삭제·Undo는 실제 `opic-plan-map`5+14Step을 사용하며 Item ID·기간/날짜·source/CAS/Undo/reload·운영 sentinel byte 검사를 유지했다. 기존 moving/Funmom SSR 및 품질 보류 negatives는 그대로이며 MR09/MR10에 실제 moving/curated OPIC 보류4건을 더했다. Source ID·quality 전역 override·가짜 owner·날짜 우회는 없다.

같은 direct21 선별 검사에서 수정 전173PASS/30FAIL, 수정 후207/207PASS(기존30복구+새 negative4)·FAIL0을 확인했다. frozen pack SHA `723abefdc26243eb1f9b4bcf21730758ecc7a300494ad2ae75293ac5c6dde4be` 전후 동일·실제 credential 전달0·설정 복사0·raw 미보관이다. 최초 전체35FAIL 이력과 잔여4의 별도 진단은 유지하며 이 선별 성공을 전체 full PASS로 부르지 않는다.

| repo-relative path | SHA256 |
| --- | --- |
| `lib/flow/integrated-poc/legacy-map-source.test.ts` | `5aef725f903dbdc44c79c5b1a0d6b6b601302a57d5005a4139c53eea703ac2f6` |
| `lib/flow/integrated-poc/legacy-map-review.test.ts` | `e623b90383d26b69631458b69dda712bd26b2e186baca029680685ba75a2c446` |
| `lib/flow/integrated-poc/legacy-map-membership-transition.test.ts` | `0586e6f3c38c9009a4849094a6aa1e07dcede48fa06eda103c13bffc9c26aadc` |
| `lib/flow/integrated-poc/program-legacy-map-plan.test.ts` | `4669d7c21f229e320f417e2fa750efc48738364a8c576109d62c9237de1cee14` |
| `lib/flow/integrated-poc/program-legacy-map-plan-read.test.ts` | `51c391ac02da18718c884ee113ce7cf8b4d8588283600fc5ec68c67cfe22d119` |
| `lib/flow/integrated-poc/program-legacy-map-removal.test.ts` | `3cc1a29aa15cc9c5dd11f002ff6345e707b6ecafc66f3723b9a3a869cc1b237b` |
| `lib/flow/integrated-poc/program-legacy-map-catalog-change.test.ts` | `7c6bd79f7395d7383ac9ee88b51eb2fb2e18357d47ca4d8233ca282f621d0476` |
| `components/flow/integrated-poc/ProgramLegacyWorkspace.test.tsx` | `03d33a410d8d303c786818cb3996c99f929896fac69d9571b91e6f8164d9576d` |

## J — 정상 실행 fixture와 M3 retained-held 경계 6파일

기존 정상 실행 fixture의 moving을 실제 실행 가능한 AJD Map으로 옮겼다. moving 원문 factory의 saved identity·raw snapshot은 별도 fixture로 보존했다. 이 재검토 중 shape validator를 통과하는 held canonical text 변경이 fake M3 RPC에 도달하는 실패를 재현했고, 기존 품질 보류 guard를 현재 revision의 `change-private` preflight에 연결했다. 공용 `preservesAlphaPrivateSources` 함수 body는 변경하지 않았다. retained Flow만 보호하므로 사본 전체 삭제·무관한 개인 문서 편집은 허용하며 creator/social source gate·raw legacy-state 정책·M6 restore·`undo-private` 경로는 바꾸지 않았다.

해당 pair의 초기16실행/15PASS/1FAIL, 실제 AJD 전환과 추가 forged probes 뒤26실행/21PASS/5FAIL, 기존 guard 연결 후26/26 PASS를 각각 구분한다. 최종 관련9파일153/153 PASS(07:15:31.443→07:15:56.546 UTC)는 정상 개인 편집 복귀/Redo 허용과 retained held canonical 변경 복귀/Redo 거절을 포함한다. source654 변경0·승인된 pack hash 전후 동일·실제 자격정보 전달0·raw 미보관이다. 이는 source 담당의 선별 검증이며 CP1 최종 full·타입·production build는 따로 실행한다.

| repo-relative path | SHA256 |
| --- | --- |
| `lib/flow/integrated-poc/alpha-persistence/synthetic-fixtures.ts` | `640eee04dd1ca70eae2f1d5bc7a6a574f7a6154518c0165962610d668ff8151c` |
| `lib/flow/integrated-poc/alpha-persistence/synthetic-fixtures.test.ts` | `5674e54eb7b51de71800785520778afe6b4414f8b8e0a311b1eeaf4c38ed0508` |
| `lib/flow/integrated-poc/alpha-server/private-parity.test.ts` | `fc672d3ebb4ed1016c717c67cc33a4554402d10050310f3bafe9db7d56c68f4d` |
| `lib/flow/integrated-poc/alpha-server/private-boundary.ts` | `4969b32eae04ba99dfe11d7ace92b194f6fe9b807652b10acd1422169855116b` |
| `lib/flow/integrated-poc/alpha-server/command-handler.ts` | `affcdf3277c6c3455b0361177b8f31d2261ef97f8149cbb4341f7e679121da01` |
| `lib/flow/integrated-poc/alpha-server/private-boundary.test.ts` | `6a2ae7131965588acb5d9928b708ad3f498b6ba37050e4e6e7aa8f871945d860` |

## K — 실제 Community save를 실행하는 busy 회귀 연결 1파일

J6 뒤 전수279파일/2960실행에서2957PASS/3FAIL을 확인했다. 남은3개는 community busy/conflict/checking-result 사례이며 `ProgramMutationBusy.test.ts`의 실제 handler 실행 context가 새 `setErrorNotice`를 공급하지 않아 첫 문장에서 `ReferenceError`를 발생시켰다. 공개 test 위치46:24와 중첩 ERR 코드만 남겼고 직접 handler 재현에서 누락 binding을 확인했다. 제품 저장 동작의 실패로 추정하지 않았다.

테스트 context에 실제 React 방식의 direct/functional updater를 연결했다. 원 queue·saved baseline·거절 시 commit0·명시 재시도·creator/copy assertions를 유지하고 failed draft/expected clone·reason 및 성공 후 failed-save origin 제거를 더 검사한다. runtime·정책·CAS·factory는 변경하지 않았다. 단독10실행/7PASS/3FAIL은 수정 뒤10/10 PASS·skip/cancel/todo0이다. 기존3FAIL 전수 이력은 유지하며 보완판의 최종 전수는 07:44:43.143→08:02:38.586 UTC 279파일/2960실행/2960PASS·FAIL/skip/cancel/todo0·verified exit0이다. source654/6c14dbc1...0f374와 catalog hash는 전후 불변이며 실제 계정 전달·설정 복사·raw 보관은 각각0이다.

| repo-relative path | SHA256 |
| --- | --- |
| `components/flow/integrated-poc/ProgramMutationBusy.test.ts` | `f179cc36d76766fd1fc8061fd069dd27b23987e0a37e315f97a49de3b4bb9f28` |

원 test bytes SHA `4e48e3826d8bbf0e1cbdc59d00bd1214386f3071f25397682e1083c771dd879f`를 넣어 현재654 source inventory를 계산하면 직전 전수의 `c11ee5879488ae16511e04a8eae0fb6eab45c37b4c32a94ef79636665c00fc3d`와 정확 일치한다. 전수 종료 뒤 이1개 외653파일을 바꾸지 않았다. 새 source654 SHA는 `6c14dbc1d2cc5db7f46a11cdc5e0595e26b4f40bd607e9b76b860cc83890f374`이다. 이 대조를 전체 검사 PASS나 새로운 build proof로 재해석하지 않는다.

## 실행 gate와 남은 경계

아래 audit/호환11 및 SortMenu CSS10은 최초 게시 전 근거다. 최초 CI 브라우저 실패 이후 CSS 호환2파일과 브라우저11파일을 보완하며 새 검증·exact build·CI 결과를 별도 기록한다. 기존 수치를 수정판의 최종 결과로 재사용하지 않는다.

현재 dependency gate는 audit0·compatibility11/11이다. 기존 기본 /my의 정렬버튼 실제 SSR과 native input/textarea/select·space/divide를 독립 Chrome CSS fixture에서5 viewport×forced-colors2=10검사로 비교했고 computed속성·pixel byte차이0이었다. 이는 fixture의 CSS 근거이며 실제 제품 HTTP 앱 여정·모든 /my 상태·실기기/IME/AT·사용자 관찰을 대신하지 않는다. 제품 서비스 시작은 현재 직접 실행이 거절된 경계를 그대로 지키며 다른 shell/tool/helper로 우회하지 않는다. 승인된 선별 commit/push/Draft PR·비공개 CI는 최종 local/full·보안·출처·문서·hook·소유 검사와 자동 Git 배포 차단 확인 뒤 별도로 진행할 수 있다. 이 게시 단계의 성공은 제품 HTTP QA·개발계 반영·전체 CP1 완료가 아니다. 정확 새 head/build의 제품 브라우저 gate는 NOT_RUN으로 남긴다.

## M — CI 브라우저 후속 11파일의 수정 전 기준선

CP1 commit `80abc0ad3981fe8ef316d72d23c8b0d5645544f9`·[Draft PR209](https://github.com/knhbae/flowme2605/pull/209)를 정상 게시한 뒤 [CI37109357657](https://github.com/knhbae/flowme2605/actions/runs/37109357657)의 실패를 확인했다. 모델·저장 계약은 **279파일/2960실행/2960PASS**, 브라우저는 **760개 중721PASS/29FAIL/2FLAKY/8NOT_RUN**이다. source654/변경0·준비/always cleanup/allowlisted 요약 업로드 성공·원본 공개0을 확인했다. 공개 CI 요약 SHA256 `7461c47844f2e1ff78031122c9c778f18e0b7362abe4a53c8070977ae1fd0ac9`는 로컬 source hash와 별개다. 기존 실패·flaky·미실행 결과를 지우지 않는다.

승인된 선행 검증 해결의 후속으로 브라우저11파일을 추가 소유한다. 최초112+추가11=**CP1 123 고유 경로**다. CSS 호환2파일과 이 문서는 기존 소유이므로 다시 더하지 않는다. 공통 STATUS/QA/manifest/tasks의 판정은 CP2에서 정리하며 CP1의 게시 전 상태 기록을 현재 성공 근거로 사용하지 않는다. 새 runtime/정책/schema·출처 자료·private pack·실제 계정은 변경하지 않는다.

정확 CP1 HEAD80abc0ad에서11개 모두 tracked-clean인 것을 먼저 확인했다. 아래 값은 Windows 작업본의 **수정 전 OS bytes SHA256**이다. Git의 LF blob과 CRLF 작업본을 혼용하지 않는다. 수정 후 해시는 별도 표에 추가하며 아래 이전값을 덮어쓰지 않는다. 기존 소유 CSS2파일의 이전값은 D표에 남아 있다.

| repo-relative path | 수정 전 SHA256 |
| --- | --- |
| `tests/e2e/flow-map-preview-parity.spec.ts` | `893440b340bdda15d037287e05f78145188e82e07415887bcda2e9b465d41067` |
| `tests/e2e/flow-mvp.spec.ts` | `ae3ed81e8faa4a32c7a604a20e0f4bd239a01cc07a4152753f810aa3a44d2b48` |
| `tests/e2e/p24-execution-trust.spec.ts` | `f071ff2c0864b176e3a2200d605764f6cfccbeba19b1853b172a1909f0e37564` |
| `tests/e2e/p26-discovery-save-before.spec.ts` | `5596a4d7585ba5b38b3b1292a415a2b1321218435e93b463e2280c3a8aee3e70` |
| `tests/e2e/p26-post-save-decision-hub.spec.ts` | `178d5cbe41d4673882755bbbd2624f6267eb0ae005935e559fee2d2493f2a3c0` |
| `tests/e2e/p26-unified-export.spec.ts` | `b0eb327931b4e796a79f2968f65d60f2f2f305f4a0d90d5946247cdc00587ac2` |
| `tests/e2e/p29-coordinated-surface-reset.spec.ts` | `5680456d6a87f4c106be076ac3ac1e6d839a8128a9b14c11f1fece8818261e93` |
| `tests/e2e/p35-export-scope-first.spec.ts` | `45e04a1bc393db0fd3641f4dcf09181260204cb72e5e84471380ec510272f68a` |
| `tests/e2e/p35-p1-final-internal-gate.spec.ts` | `9d646644dfc1dac4efdd37c1529b662d78addeade279af30c3ff5dbaa2b000b7` |
| `tests/e2e/public-plan-surface-unification.spec.ts` | `31e8da4731d41dd2a7ab548178621d8c4a3c6ba81dae9f4f04fa174bab599438` |
| `tests/e2e/url-first-user-surface.spec.ts` | `8eb86d83e149f4f738c58f116fc34a1e0f53f8bd065874f86da0c432f001ab0f` |

공개 선택의 성공 사례는 실제 eligible/direct `curated-wedding-checklist-family`의2child(Calendar6+Todo4), 이동 실행·날짜/export는 실제 eligible/direct `curated-ajd-moving-d30`의5행(-30/-10/-3/-1/0)을 사용한다. 현재 전체 공개 registry는4Map→choose-child 분리6card/curated5, canonical single2를 더한8card다. 단순 숫자 감산만 하지 않고 실제 roster/identity를 대조한다. 실행 보류된 OPIC나 moving을 quality override로 승인하지 않는다. public-plan 표의9개 원래 route는 유지하며 OPIC/reading2개는 같은4크기 루프에서 원문·새 공급0·storage byte 보호 검사로 분리한다.

보류된 연말정산은 새 공개 demo seed에서 제외되어 ‘기존 사본’이 자동 생성되지 않던 문제다. 실제 원본 factory의 이전 saved record를 브라우저에 사전 seed해 기존 사본 보관·0실행·저장 byte 불변을 확인한다. Funmom은 새 공급 보류 안내와 원문 링크·실행0·가짜 일정 없음, P35는 retained/missing/malformed 사본의0쓰기·reload·raw byte 불변을 유지한다. 실패3501/3507은 연말정산이며 중간의 Baby 분류는 잘못된 것이었다. Baby3521은 실패 목록이 아니고 변경하지 않는다.

포커스색9FAIL은 Tailwind4 기본 전환에 추가된 outline-color로 즉시 키보드 포커스색이 지연되는 문제였다. [공식 전환 안내](https://tailwindcss.com/docs/upgrade-guide#transitioning-outline-color)와 실제 generated stylesheet를 대조했다. CSS2파일은 공식 전체 generated shape의 해당 토큰만 제거하며 다른 속성/duration/variant/앞·뒤 important 및 임의·사용자 정의 전환을 유지한다. 기존 compiled stylesheet에서 변경은2토큰28bytes이며 독립 정적3/3·호환10/10 PASS다. 실제 PlatformNav 정적 렌더의3경로×5크기×일반/forced-colors30/30 PASS와 이전 CSS의 일반색15/15FAIL을 비교했다. 앱 서비스/HTTP30·실기기/IME/AT 검사는 아니며 전체 브라우저 CI를 대체하지 않는다.

## M 최종 보완 bytes와 선별 검증

main이 최종13개 실제 OS SHA256를 직접 다시 계산해 담당자 인계값과13/13 일치했다. 이 표는 후속 commit 전 CP1 작업본 bytes이며 최초 D/M 해시를 덮어쓰지 않는다. CP2 인수 시 같은 Git blob과 실제 OS bytes를 각각 확인한다. 이 manifest 자체는 재귀 hash 대상에서 제외한다.

| repo-relative path | 수정 후 SHA256 |
| --- | --- |
| `scripts/tailwind-v3-compat.cjs` | `335d747725d2eaa34edc54186f64157b6b20f105107cd80a107f6205efb62d67` |
| `scripts/tailwind-v3-compat.test.mjs` | `c203d408b5c7a7d876c8768bcaeaabe4614a633b045603845f700370e383ea62` |
| `tests/e2e/flow-map-preview-parity.spec.ts` | `2c34ee9b734a7482c5ae49a96f914b5dce277ee1460661b8833168ec90fdc577` |
| `tests/e2e/flow-mvp.spec.ts` | `7a7924d462e6bd713df25fa85306cf70c4c672e9c5d925c7b5d2f76957527265` |
| `tests/e2e/p24-execution-trust.spec.ts` | `1e55aa3c7528933d969544aaade1d9ce3f579473a6b4c90352fc2987dba7a2dd` |
| `tests/e2e/p26-discovery-save-before.spec.ts` | `e5cbfc2e4f34b563f55ac0dd2a06dcc1c3117c3d5977ff9a83e5827e17402a30` |
| `tests/e2e/p26-post-save-decision-hub.spec.ts` | `070febbf671dc4c97d7f9dd1f90c13e48d0abb0d8ad0fdfc37b2db6bd966033b` |
| `tests/e2e/p26-unified-export.spec.ts` | `d29e904263ea9b51c0c7877aada88993b4ddb61d26f60c1ac6968c598266595a` |
| `tests/e2e/p29-coordinated-surface-reset.spec.ts` | `1dd73e3e5e3d9af34149d37afba6c202be31fa24c9f0f6d4026803d54f2532ee` |
| `tests/e2e/p35-export-scope-first.spec.ts` | `70a828af5bc036595925995f97ac2321c951845ff8d0cb6201fce03d60864e2c` |
| `tests/e2e/p35-p1-final-internal-gate.spec.ts` | `a3f50e8e0291bc3748f55812d68712e34687497ccfa0043c08c91939283dd024` |
| `tests/e2e/public-plan-surface-unification.spec.ts` | `74fee11c525ffc0c7671460791702fd180584790eebb852070004c6a7f57694e` |
| `tests/e2e/url-first-user-surface.spec.ts` | `85ab39c1375d50e191526a41f7c9e32971551e8a5692fb67d5e23f1928bbc3a0` |

실제 factory/registry·SSR·Tax read-only 복구의 순수6검사는 **6/6 PASS**다. 공개 roster/2child identity·기간, AJD milestone/doneWhen, archived demo 공급0, Tax saved identity의 원 Item/Details·retired tag·fake storage0쓰기, hold3의 안내·원문 href·실행0을 확인한다. ignored harness의 첫 실행1FAIL은 stepId 잘못 참조였으며 실제 public step.id로 바로잡은 뒤6/6이다. 제품 코드를 수정한 결과가 아니고 처음 실패도 당시 결과로 유지한다.

최종 브라우저 수집은 소유11spec의210case, current project701case/98file, 전체 **760case/105file**이며 exit0이다. 정상/보류 표 분리 후 원래9route·4크기와 최상위 testcase 수를 유지했다. 수집은 실제 클릭·브라우저 실행 PASS가 아니며 새 HTTP30/35는 NOT_RUN이다. `git diff --check` exit0·변경14개 외0·staged0을 확인했다. 후속 정상 hooks·새 HEAD/build proof·CI는 아직 실행 전이다.

최종11개 entry의 TypeScript 대조는 source235개에서 baseline9/current9 diagnostic statement가 같고 신규0·해소0이었다. 대조 exit0이며 기존 legacy diagnostic9개는 남아 있다. 완전한 E2E 타입 PASS로 쓰지 않는다. 독립 정적 검토는 실제 registry/행/원문/receipt/export·hold/negative 경계를 대조했고 추가 결함을 찾지 못했다. 삭제·skip/fixme/only0, 파싱 오류0이며 새로운 실제 브라우저 실행을 한 결과가 아니다. Tax 브라우저의0쓰기는 보호된3키에 한정하고 전체 저장소0쓰기라고 확대하지 않는다.

09:29:33.862~09:29:40.151 UTC 보완판 `security:audit`는 exit0·취약점0·호환 **14/14 PASS**(의존성4+현재 CSS10)였다. OS allowlist만 전달하고 실제 자격정보 전달0·raw 미보관을 유지했다. 최종 proof helper self-test도 통과했으며 SHA `7f9b88bcef8334605e7466c2b06caef6262807a84b8585d3acf259136a492dee`는 그대로다. Vercel 자동 Git 배포 차단 파일은 실제 Git blob/HEAD 동일·deploymentEnabled=false였다. 후속 게시·CI·HTTP·개발계 반영 성공을 이 사전 검사로 대신하지 않는다.
