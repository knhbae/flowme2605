# FlowMe 공개 Flow 관리권 전략 — 출처 원장

- 조사일: 2026-08-04
- 범위: 블로그/CMS, 위키, Git 기반 협업, 실행형 커뮤니티 플랫폼의 작성자·관리자·기여자 권한과 검토·복구·승계 방식
- 증거 기준: 각 서비스의 공식 도움말·정책·문서만 핵심 근거로 사용했다. Wikipedia와 OpenStreetMap Wiki는 해당 공동체의 실제 운영 정책을 설명하는 1차 문서로 취급했다.
- 해석 기준: `확인된 운영 규칙`은 출처에서 직접 확인한 내용이고, `FlowMe 시사점`은 그 규칙을 바탕으로 한 제품 제안이다.
- 수치 주의: FlowMe 화면에 쓰인 사용자 수·제안 수·기간은 별도 표시가 없는 한 구조 설명용 가상 사례 또는 운영 시작 가설이며 실제 성과가 아니다.

## A. 블로그·출판 모델 — 저자성과 편집 책임

| 서비스·출처 | 확인된 운영 규칙 | FlowMe 시사점 | 그대로 가져오지 않을 점 |
|---|---|---|---|
| [WordPress 역할과 권한](https://wordpress.org/documentation/article/roles-and-capabilities/) | 기본 역할 6개. 편집자는 다른 사람의 글까지 공개·관리할 수 있고, 작성자는 자기 글을 공개·관리하며, 기여자는 자기 초안을 쓰지만 공개할 수 없다. | `처음 만든 사람`, `현재 관리하는 사람`, `제안만 가능한 사람`의 권한을 분리한다. | 역할 수를 그대로 복제하지 말고 사용자가 이해할 4~5개 역할로 줄인다. |
| [WordPress 버전 기록](https://wordpress.org/documentation/article/revisions/) | 저장한 초안과 공개 업데이트를 버전으로 보존하고, 추가·삭제·변경 부분을 비교하며 이전 버전을 복원할 수 있다. | 공개 Flow 변경 전후와 복구를 기본 기능으로 둔다. | 기술적인 버전 화면을 일반 사용자에게 그대로 노출하지 않는다. |
| [Ghost 직원 권한·정지·삭제](https://ghost.org/help/managing-staff-user-profiles/) | 관리자·편집자·작성자·기여자 4종. 직원을 정지하면 로그인은 막되 프로필과 작성자 표시는 유지한다. 사용자를 삭제하면 그 사람의 글은 소유자에게 귀속된다. 소유자는 한 명이며 다른 관리자에게 넘길 수 있다. | `정지해도 기여 표시는 보존`, `관리권은 이전 가능`을 가져온다. | 탈퇴·삭제 때 최초 작성자 표시를 다른 사람에게 바꾸는 방식은 피한다. |
| [Medium 출판물 역할](https://help.medium.com/hc/en-us/articles/115004681607-Getting-started-with-a-Medium-publication) | 출판물은 한 계정이 소유하고, 편집자는 제출 글을 검토·수정·공개·거절하며, 작성자는 글을 제출한다. | 작성자의 경험적 목소리와 편집자의 관리 책임을 함께 유지한다. | 한 명의 영구 소유자에게 전체 운영이 종속되지 않게 한다. |
| [Medium 제출 상태](https://help.medium.com/hc/en-us/articles/213904978-How-to-submit-a-story-to-a-publication) | 검토 대기·검토 중·수정 요청·거절·승인 상태를 제공한다. 작성자는 권리를 유지하고 저자로 표시된다. 다만 편집자의 공개 후 수정 알림을 작성자가 받지 않을 수 있다. | 일반어로 된 검토 상태와 저자 권리 보존은 유용하다. | 관리자가 공개 Flow를 바꾸고 작성자·기여자에게 알리지 않는 방식은 피한다. |
| [Medium 제출 담당자 배정](https://help.medium.com/hc/en-us/articles/40133928365591-Assigning-stories-in-your-submission-queue) | 여러 편집자가 제출물을 맡을 수 있고, 담당자가 자리를 비우면 소유자가 재배정하거나 담당을 해제할 수 있다. | 제안함에 담당자와 처리 기한을 두고, 부재 시 공동관리자가 이어받게 한다. | 사용자에게 담당자 개인 정보가 과도하게 노출되지 않게 한다. |
| [Medium 소유권 이전](https://help.medium.com/hc/en-us/articles/360035586814-How-to-transfer-the-publication-ownership-to-another-user) | 출판물 소유권 이전은 지원팀 요청을 통해 처리된다. | 관리권 승계는 명시적 절차·이력·수락을 거치게 한다. | 일상적인 공동관리까지 플랫폼 지원팀이 병목이 되게 하지 않는다. |

## B. 위키·공동 편집 모델 — 작은 기여, 근거, 이력

| 서비스·출처 | 확인된 운영 규칙 | FlowMe 시사점 | 그대로 가져오지 않을 점 |
|---|---|---|---|
| [Wikipedia 문서 소유권 정책](https://en.wikipedia.org/wiki/Wikipedia:Ownership_of_content) | 문서는 누구의 소유도 아니며 다른 편집자가 바꿀 수 있다. 작성자에게 계속 관리할 의무도 없다. 관심과 전문성을 가진 편집자의 행동은 소유가 아니라 관리로 볼 수 있다. | 최초 저자와 현재 관리 책임을 분리한다. | 경험자의 정체성·맥락까지 공동 문서처럼 지우지 않는다. |
| [Wikipedia 합의 정책](https://en.wikipedia.org/wiki/Wikipedia:Consensus) | 합의는 단순 투표가 아니라 정책·근거의 질을 평가한다. 합의가 없으면 대체로 기존 안정판을 유지하고, 합의는 새 근거로 바뀔 수 있다. | 좋아요·제안 수만으로 자동 반영하지 않고 조건과 근거를 본다. | 서로 다른 생활 조건을 하나의 중립적 정답으로 평균 내지 않는다. |
| [Wikipedia 보호 정책](https://en.wikipedia.org/wiki/Wikipedia:Protection_policy) | 훼손·편집 전쟁 등 특정 상황에서 편집 범위를 제한한다. 보호는 분쟁에서 특정 내용을 이기게 만드는 수단으로 쓰면 안 된다. | 위험·공격 시 특정 항목이나 공개 반영만 임시 제한한다. | 비판적 제안을 막거나 작성자 편을 드는 수단으로 잠금을 쓰지 않는다. |
| [Wikipedia 페이지 이력](https://en.wikipedia.org/wiki/Help:Page_history) | 각 수정의 시각·사용자·수정 설명을 확인하고 버전을 비교하거나 되돌릴 수 있다. | 누가, 언제, 무엇을, 왜 바꿨는지 공개한다. | 개인 실행 기록과 공개 기여 이력을 혼합하지 않는다. |
| [OpenStreetMap 변경 묶음](https://wiki.openstreetmap.org/wiki/Changeset) | 한 사용자의 관련 변경을 묶고, 변경 이유와 출처를 설명하며 공개 토론을 남긴다. 응답하지 않는 반복 문제는 Data Working Group으로 올릴 수 있다. | 한 단계씩 흩어진 댓글 대신 `바뀐 부분+이유+상황+근거`를 제안 단위로 묶는다. | 위치·주소·실제 날짜 등 개인 실행 정보는 공개 변경 단위에서 제거한다. |
| [OpenStreetMap 되돌리기 원칙](https://wiki.openstreetmap.org/wiki/Change_rollback) | 명백한 훼손이 아니면 되돌리기 전에 작성자와 대화하고 선의를 가정한다. 자동 대량 편집과 명백한 훼손은 빠르게 되돌릴 수 있다. | 일반 충돌은 대화·추가 근거 요청, 명백한 대량 공격은 즉시 격리한다. | 모든 반대 의견을 훼손으로 간주하지 않는다. |

## C. GitHub형 변경 관리 — 개인 수정과 공개판 분리

| 서비스·출처 | 확인된 운영 규칙 | FlowMe 시사점 | 그대로 가져오지 않을 점 |
|---|---|---|---|
| [GitHub Pull Request](https://docs.github.com/en/pull-requests/get-started/about-pull-requests) | 별도 변경을 제안하고, 차이·대화·검토를 한곳에서 확인한 뒤 기준 버전에 반영한다. | 내 계획은 즉시 수정하되 공개 Flow 반영은 별도 `개선 제안`으로 보낸다. | fork·branch·PR·merge 같은 개발 용어를 UI에 쓰지 않는다. |
| [GitHub CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) | 담당 영역이 바뀌면 지정된 사람·팀에게 자동으로 검토 요청을 보낼 수 있고, 담당자 승인을 필수로 설정할 수 있다. | 이사 비용·업체·안전처럼 구간별 공동관리자를 둔다. | 활동 횟수만으로 담당자를 자동 승격하지 않는다. |
| [GitHub 보호 규칙](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) | 중요한 기준 버전에 승인·검사·대화 해결을 요구할 수 있다. 승인 후 변경 내용이 달라지면 기존 승인을 무효화해 재검토할 수 있고, 마지막 변경자는 자기 변경의 유일한 승인자가 될 수 없게 할 수 있다. | 비용·안전 영향이 큰 제안은 2인 확인, 검토 뒤 내용이 바뀌면 재확인한다. | 모든 생활 팁에 무거운 승인 절차를 강제하지 않는다. |
| [GitHub 저장소 역할](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization) | Read·Triage·Write·Maintain·Admin 5단계로 필요한 작업만 허용한다. | `제안`, `검토 보조`, `낮은 위험 반영`, `민감 영역 관리` 권한을 나눈다. | 전역 등급 하나로 모든 주제의 권한을 올리지 않는다. |
| [GitHub 소유권 연속성](https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/maintaining-ownership-continuity-for-your-organization) | 한 명의 소유자가 연락 불가하면 프로젝트 접근이 끊길 수 있어 조직 소유자를 최소 2명 두도록 권장한다. | 중요한 Flow는 공동관리자 2명 또는 후임 관리자를 미리 둔다. | 모든 소규모 Flow에 같은 운영비를 강제하지 않는다. |
| [GitHub 저장소 이전](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository) | 소유권 이전 뒤에도 기존 주소는 새 주소로 연결되고 이슈·Pull Request·릴리스 등 협업 자산이 함께 넘어간다. | 관리권이 바뀌어도 Flow 주소·최초 작성자·변경 이력·사용자 사본 연결을 유지한다. | 관리권과 저자 표시를 같은 권리로 취급하지 않는다. |
| [GitHub 삭제 저장소 복원](https://docs.github.com/en/repositories/creating-and-managing-repositories/restoring-a-deleted-repository) | 조건을 충족하는 삭제 저장소는 90일 안에 복원할 수 있다. | 공개 중지와 영구 삭제를 분리하고 복구 기간을 둔다. | 90일을 FlowMe 정책으로 그대로 확정하지 않는다. |

## D. 실행형·템플릿 플랫폼 — 실제 사용과 공개 수정의 경계

| 서비스·출처 | 확인된 운영 규칙 | FlowMe 시사점 | 그대로 가져오지 않을 점 |
|---|---|---|---|
| [AllTrails 개인 경로 수정](https://support.alltrails.com/hc/en-us/articles/37270266245524-How-to-customize-existing-routes) | 검증 경로나 다른 회원의 공개 활동을 복사해 자기 경로로 수정·저장할 수 있다. | `내 계획으로 가져오기` 뒤의 편집은 승인 없이 자유롭게 한다. | 개인 사본과 공개 Flow 연결이 완전히 끊기게 하지 않는다. |
| [AllTrails 공개 경로 수정 제안](https://support.alltrails.com/hc/en-us/articles/360018930672-How-to-update-or-change-information-about-a-trail) | 공개 경로 수정 제안은 모더레이터가 먼저 평가하며, 처리 시간은 검토 대기량과 정보 검증 가능성에 따라 달라진다. | 공개 Flow 변경은 제안·검증·반영으로 분리하고 처리 상태를 보인다. | 모든 분야를 플랫폼 직원이 직접 검토하는 고비용 구조로 시작하지 않는다. |
| [AllTrails 새 경로 기여](https://support.alltrails.com/hc/en-gb/articles/360019244351-How-do-I-contribute-a-new-trail-to-AllTrails) | 공식 안내 기준 40만 개가 넘는 선별 경로를 운영하며, 새 경로는 내부 모더레이터가 확인한다. 설명·사진·경유점 등 정보가 많을수록 검증에 도움이 된다. | 실행 맥락·근거를 제안과 함께 받아 관리자의 판단 부담을 줄인다. | 규모 숫자를 FlowMe의 예상 성과로 전용하지 않는다. |
| [AllTrails Verified Completed](https://support.alltrails.com/hc/en-us/articles/360021841811-What-is-a-Verified-Completed-badge-and-how-do-I-earn-one) | 앱으로 기록한 경로가 선별 경로와 75% 이상 겹치면 Verified Completed 표시를 준다. | `실제로 해봤다`는 신호를 단순 좋아요와 분리한다. | 실행 사실을 곧바로 수정 내용의 정확성이나 전문성으로 간주하지 않는다. |
| [Waze 수정 제안 검토](https://support.google.com/waze/answer/14325044?hl=en-AU) | 초보 편집자의 제안은 필요한 등급의 경험 편집자가 지역 기준에 따라 승인·거절하고, 거절 이유를 설명한다. 현재는 제안 일부만 승인할 수 없다. | 위험도·주제별 검토 권한과 거절 이유를 둔다. | 부분 반영이 안 되는 한계를 복제하지 않는다. FlowMe 제안은 항목별 선택이 가능해야 한다. |
| [Waze 편집자 등급](https://support.google.com/waze/answer/6264191?hl=en) | 모두 1단계에서 시작하며 2단계 3,000회, 3단계 25,000회 등 지역별 기준과 승인에 따라 권한이 높아진다. | 기여 이력에 따라 낮은 위험 검토 부담을 줄일 수 있다. | 단순 편집 횟수를 진실·전문성 점수로 쓰지 않는다. 지역·분야 맥락을 함께 본다. |
| [Stack Overflow 편집 권한](https://stackoverflow.com/help/privileges/edit) | 평판 2,000 미만의 수정은 대기하고, 승인 또는 거절 2표로 확정된다. 모든 수정은 공개 이력과 기여자 표시를 남긴다. | 신규 기여는 검토하고, 반복해서 좋은 제안을 낸 사용자는 낮은 위험 기여 권한을 얻는다. | 전역 평판이 의료·법률·이사 등 모든 분야 권한으로 번지지 않게 한다. |
| [Figma Community 공개·업데이트](https://help.figma.com/hc/en-us/articles/360040035974-Publish-files-to-the-Figma-Community) | 공개 파일은 특정 시점의 스냅숏이며 복제본에는 원본 업데이트·버전 이력·댓글이 따라오지 않는다. 새 버전 공개도 기존 복제본을 자동 변경하지 않는다. | 공개 Flow가 바뀌어도 실행 중 개인 계획은 자동 덮어쓰지 않고 선택적으로 업데이트한다. | 사본과 원본의 계보가 완전히 끊기는 구조는 피한다. |
| [Notion 공개 페이지 복제](https://www.notion.com/help/duplicate-public-pages) | 공개 페이지를 자기 공간에 복제한 뒤 자유롭게 수정할 수 있고, 제작자는 복제 허용을 끌 수 있다. | 가져오기와 개인화는 매우 쉽게 한다. | 공개 개선을 원본으로 되돌리는 길이 없는 템플릿 복제에 머물지 않는다. |
| [Notion Marketplace 운영 조건](https://www.notion.com/help/template-gallery-guidelines-and-terms) | 제작자는 템플릿 권리를 유지하고 이용자에게 사용권을 주며, 유료 템플릿은 지속적인 합리적 지원을 제공해야 한다. 플랫폼은 보안·개인정보 검토를 할 수 있다. | 유료 Flow 전에는 작성자 권리·기여자 표시·관리 종료·기존 사용권을 먼저 정한다. | 법률 검토 없이 라이선스 문구를 확정하지 않는다. |

## E. 조사에서 도출한 FlowMe 운영 가설

아래는 외부 서비스의 현행 정책이 아니라 위 근거를 조합한 **FlowMe용 시작 가설**이다.

1. 공개 Flow는 `저자가 있는 공동관리 실행 계획`으로 정의한다.
2. 사용자 화면에는 `처음 만든 사람`, `현재 관리`, `이번 변경 확인`을 구분한다.
3. 개인 계획은 자유 편집, 공개판은 제한된 개선 제안과 검토를 거친다.
4. 의견 충돌은 투표로 평균 내지 않고 조건별 선택지 또는 별도 Flow로 나눈다.
5. 공식·비용·안전 영향이 커질수록 필요한 근거와 검토자를 늘린다.
6. 작성자 부재와 정보 노후화를 별도 상태로 다룬다.
7. 관리권은 승계할 수 있지만 최초 저자와 기여 이력은 바꾸지 않는다.
8. 플랫폼은 안전·권리·악용에 한해 필요한 범위만 임시 제한하고 이유·근거·이의 절차를 남긴다.
9. AI는 중복 묶기·개인정보 제거·차이 요약·노후 감지를 돕지만 공개 변경을 최종 승인하지 않는다.
10. 복제·수정·외부 내보내기·유료 판매의 권리 규칙은 출시 전에 별도 법률 검토가 필요하다.
