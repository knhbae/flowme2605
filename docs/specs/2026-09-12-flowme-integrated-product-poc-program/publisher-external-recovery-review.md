# 공개 초안의 다른 탭 변경 복구 — 실제 UI 검사

2026-09-20. 새 전용 QA 프로필에서 공개 초안의 미저장 입력과 다른 탭 인물 변경을 겹쳐 검사했다. 코드 경로 감사로 먼저 보완한 `ProgramPublisher` 내부 recovery UI를 실제로 조작했다. 통합 제품 전체 완료 판정은 아니다.

실행판: `ylSngUBlsuD5I1e8zd_09`, `static/chunks/app/my/page-a578091b8c44e11b.js`, `http://127.0.0.1:3641`. 각 탭에서 inline Flight JSON과 실제 route resource를 확인했다. 종료 후 build source 421개 해시를 대조해 변경 0개였다.

## 결과

| 검사 | 실제 결과 |
| --- | --- |
| 신규 프로필·정상 준비 | 디렉터리 부재와 같은 origin의 local/session 0키 확인. 운영 fixture/sentinel 주입 0. 정상 UI로 개인 문서 생성·내용 입력·공개 초안 준비, 성공 쓰기 3회(revision 3) |
| A 미저장 입력 만들기 | 다음 Program setItem 한 번만 quota 실패. **실패 시도 1 / 성공 0**, 저장 wire는 그대로이고 공개 제목 입력 유지. 실패 이후 writer는 정상 호출 경로로 돌아옴 |
| B 인물 변경 | 기존 로컬 예시 `participant-jihun`으로 정상 UI 전환 1쓰기(revision 4). A는 기존 입력을 보존하며 external snapshot 적용 보류 |
| stale 저장·Escape | `초안 다시 저장`으로 writer 호출 0. Escape도 저장에 실패한 입력을 버리지 않고 modal 유지. 원격 성공 상태 덮어쓰기 없음 |
| 모달 안 복구·보관 | recovery region이 활성 `:modal` 안에 정확히 1개. 실제 TXT 다운로드에 미저장 제목이 포함됨 |
| 복구 취소 | `입력 버리고 최신 상태 보기`→`입력 유지`: 저장 0, 입력·modal 유지 |
| 명시 폐기·reload | `버리고 불러오기` 후 modal 닫힘, B의 최신 wire 채택. 추가 writer 0. reload 뒤 정확히 같은 wire, 새 generation writer 0 |

총 성공한 앱 거래는 4개(문서 생성·편집·공개 초안·인물 전환), 주입 저장 실패는 1개다. 공개 Flow/판본을 생성하거나 철회한 검사가 아니다. 정상 storage event의 입력 보호 경로이며 commit 사이에 강제로 끼어든 CAS race로 표현하지 않는다.

최종 revision 4, SHA-256 `4ac6a4ca5cad29d4aff3a454570297ecbf417f4c41c6000dddcaca69ea265d76`. 공개 초안 준비 revision 3 대비 최종 ProgramData는 activeActorId만 변경됐고, 모든 개인 문서·저장 공개 초안·공개 자료는 같았다. 저장되지 않은 QA 제목은 TXT에 보관됐으며 Program에는 들어가지 않았다.

## 화면·접근과 보호 범위

390×844·375×812·844×390·1024×768·1440×900에서 복구 버튼 높이 44px, 실제 hit-test·focus 통과, 가로 넘침 0. 필요한 경우 modal을 스크롤한 뒤 검사했다. 375와 844 캡처를 직접 열어 안내·복구 버튼·초점 표시를 확인했다. 가로 화면에서 공개 입력 폼은 아래로 스크롤해야 한다. 모든 내용의 동시 노출이나 전체 접근성 감사를 의미하지 않는다.

- 375×812 (로컬 전용 근거: `../../../output/playwright/program-publisher-recovery-20260920-final/publisher-recovery-375.png`)
- 844×390 (로컬 전용 근거: `../../../output/playwright/program-publisher-recovery-20260920-final/publisher-recovery-844.png`)
- 취소 후 입력 유지 (로컬 전용 근거: `../../../output/playwright/program-publisher-recovery-20260920-final/publisher-recovery-cancel-keeps-input.png`)
- 명시 폐기 후 reload (로컬 전용 근거: `../../../output/playwright/program-publisher-recovery-20260920-final/publisher-recovery-reloaded.png`)

관측 범위의 허용 밖 setItem/removeItem/clear 0. 운영 local key는 처음부터 0개, session도 0개다. 따라서 채워진 사용자 운영 데이터의 불변 검사로 확대하지 않는다. 각 generation observer와 전후 전체 wire를 함께 확인했으며 unload 순간의 연속 호출 관측은 주장하지 않는다. 후속 완료 실행의 page/console error 0. 실제 Android/iOS·실제 IME·관찰 사용자 검사는 0이다.

## 실패 기록과 이어서 실행한 근거

아래 기록은 모두 전용 출력 디렉터리 (로컬 전용 근거: `../../../output/playwright/program-publisher-recovery-20260920-final/`)에 보존했다. 확인 수를 합산해 고유 테스트 수로 보고하지 않는다.

| 기록 | 결과 |
| --- | --- |
| `2026-09-20T06-56-33-754Z-run.json` | 6확인 후 QA timeout. 접힌 `문서 작업`을 열지 않아 공개 버튼에 도달하지 못함. 문서 2쓰기 이후 revision 2 보존 |
| `2026-09-20T06-58-13-802Z-resume.json` | 정확 revision 2부터 재개, 7확인 후 QA timeout. quota 실패가 자동으로 연 보관 details를 다시 클릭해 닫음. 이 시점에는 준비·quota·B 변경·입력 보존·모달 내 recovery 확인 완료 |
| `2026-09-20T06-59-59-615Z-tail.json` | 3확인 후 QA URL 가정 실패. B 탭이 자동 `#flowme/space` 주소로 이동한 점 누락. 새 거래 0 |
| `2026-09-20T07-00-49-263Z-tail2.json` | exact wire·A 미저장 제목·같은 B 탭을 확인한 후 이어서 20확인 PASS. 저장 재시도·Escape·5크기·TXT·취소·명시 폐기·reload 완료 |

첫 runner의 성공 거래를 반복하지 않았고 프로필을 초기화하지 않았다. quota도 한 번만 주입했다. 각 실패는 제품 실패가 아닌 실제 QA 경로/상태 가정 오류로 남겼으며 결과를 성공으로 덮어쓰지 않았다. TXT SHA-256은 `617d93084ea9ff1ee7bb296d6271214008e899324ba95bbb52940d501f508e46`이다.

이번 실제 검사는 actor 변경 경로다. 다른 탭의 원문 삭제·보관까지 각각 재현했다고 주장하지 않는다. 제품 source/test 추가 변경 없음. QA runner·승인·실행 기록과 이 원장만 추가했다. commit·push·PR·Preview·Production 배포 없음, 관찰 사용자 0명.
