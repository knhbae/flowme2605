# Claude Design 검토 체크리스트

## 1. 검토 시작

- [ ] 실제 local SHA, branch, origin/main을 기록했다.
- [ ] Production과 local proposal의 증거 경계를 구분했다.
- [ ] Codex 제안을 현재 구현처럼 표현하지 않았다.
- [ ] 실제 관찰 사용자 수를 0명으로 기록했다.
- [ ] 앱 코드와 기존 dirty path를 수정하지 않았다.

## 2. Current 확인

- [ ] `/`, `/flows`, 네 개 public Flow, `/my`, `/calendar`를 직접 확인했다.
- [ ] 390x844에서 첫 viewport와 scroll depth를 기록했다.
- [ ] 1024x768에서 정보 밀도와 빈 공간을 기록했다.
- [ ] 핵심 workspace를 1440x900에서도 확인했다.
- [ ] current screenshot과 current interaction을 구분했다.
- [ ] current source에서 가능한 capability와 보이지 않는 capability를 구분했다.

## 3. A/B/C 대안 비교

- [ ] A Subtractive ownership을 작성했다.
- [ ] B Current model tightened를 작성했다.
- [ ] C Claude independent alternative를 작성했다.
- [ ] 같은 다섯 콘텐츠와 같은 지표로 비교했다.
- [ ] Home 제거/유지 대가를 비교했다.
- [ ] My Flow library-only/Today 유지 대가를 비교했다.
- [ ] Calendar lens-only/inline action 유지 대가를 비교했다.
- [ ] 데이터 계약 회귀 위험을 각 안에 표시했다.
- [ ] 최종 선택과 탈락 이유가 명확하다.

## 4. 화면 복잡도

화면마다 current와 proposed를 같은 방식으로 측정한다.

- [ ] first viewport의 핵심 메시지 수
- [ ] competing primary action 수
- [ ] visible command 수
- [ ] card 또는 framed block 수
- [ ] 설명 block 수
- [ ] 동일 의미 label 반복 수
- [ ] 첫 유용한 결과까지 click/tap 수
- [ ] 저장까지 click/tap 수
- [ ] 다음 실행까지 click/tap 수
- [ ] 중요한 기능을 찾기 위한 scroll depth
- [ ] 같은 action의 주 소유 surface 수

목표:

- 핵심 메시지 1~2개
- primary action 0~1개
- action owner 1개
- first useful preview 전 필수 입력 0~2개

## 5. 15-cell journey

- [ ] 이사 Session A/B/C
- [ ] 차량 점검 Session A/B/C
- [ ] 반복 홈트 Session A/B/C
- [ ] 장기 학습 Session A/B/C
- [ ] 개인 메모 Session A/B/C
- [ ] 같은 persona의 상태가 session 사이에 이어진다.
- [ ] title/count/date/stable identity parity를 확인했다.
- [ ] 완료와 다시 열기를 같은 위치에서 확인했다.
- [ ] 실패·취소·undo·reload를 포함했다.
- [ ] current와 proposed score를 분리했다.

## 6. 콘텐츠 fidelity

- [ ] 이사 Flow는 24개 전체 범위와 이사일 역산을 유지한다.
- [ ] 차량 점검은 날짜 없는 10개 Checklist로 시작한다.
- [ ] 홈트는 series와 occurrence, 영상 resource를 구분한다.
- [ ] 학습은 8개 순서와 진도 중심이며 Calendar를 강제하지 않는다.
- [ ] 개인 메모는 입력에 없는 행동을 생성하지 않는다.
- [ ] 모든 콘텐츠에 다섯 artifact를 강제하지 않는다.
- [ ] 콘텐츠별 primary artifact가 실제 결과로 보인다.

## 7. Screen contract

- [ ] 각 화면은 하나의 사용자 질문을 갖는다.
- [ ] 메시지는 최대 두 개다.
- [ ] primary action은 최대 하나다.
- [ ] 주 소유 기능과 소유하지 않는 기능이 적혀 있다.
- [ ] UI tree의 분기와 합류가 보인다.
- [ ] 화면 간 같은 Flow의 title/count/date가 이어진다.
- [ ] current/proposed annotation이 제품 surface 안에 섞이지 않는다.

## 8. Command grammar

- [ ] 완료 / 다시 열기
- [ ] 포함 / 제외
- [ ] 날짜 지정 / 날짜 제거
- [ ] 추가 / 삭제 / 복구 / 순서 변경
- [ ] 보관 / 복구 / 영구 삭제
- [ ] 새 기준일로 다시 쓰기
- [ ] whole / selected / current 가져가기
- [ ] series 전체 / 이번 occurrence

각 command에 대해:

- [ ] 같은 이름
- [ ] 같은 icon 의미
- [ ] 비슷한 위치
- [ ] destructive hierarchy
- [ ] confirmation 또는 undo
- [ ] 접근 가능한 이름

## 9. Responsive 및 접근성

- [ ] 390px horizontal overflow 없음
- [ ] 390px fixed UI overlap 없음
- [ ] 1024px이 늘어진 mobile이 아님
- [ ] 1440px에서 빈 공간과 밀도가 균형적임
- [ ] keyboard-only journey 가능
- [ ] focus order가 시각 순서와 일치
- [ ] sheet/dialog focus trap
- [ ] Escape close
- [ ] focus return
- [ ] 이름 없는 focusable control 없음
- [ ] 긴 title과 200% zoom 대응
- [ ] error/retry/undo feedback

## 10. Interactive prototype

- [ ] 사례 전환이 작동한다.
- [ ] stage 전환과 뒤로 가기가 작동한다.
- [ ] 이사일 변경이 실제 날짜와 range를 바꾼다.
- [ ] 포함·제외가 receipt count를 바꾼다.
- [ ] title/date/memo 수정이 다음 화면에 유지된다.
- [ ] 완료·다시 열기가 같은 Item에서 작동한다.
- [ ] Calendar 날짜 선택이 agenda를 바꾼다.
- [ ] event가 같은 개인 Flow를 연다.
- [ ] export scope가 count와 CTA를 바꾼다.
- [ ] 보이는 비활성 control은 이유가 있다.
- [ ] console/page error가 없다.

## 11. Red-team과 반복

- [ ] 첫 제안을 독립적으로 반박했다.
- [ ] 숨기기와 삭제를 구분했다.
- [ ] 기능을 다른 메뉴로 옮겨 복잡도를 보존하지 않았다.
- [ ] 데이터 접근 경로를 실수로 제거하지 않았다.
- [ ] 콘텐츠 shape를 과도하게 평준화하지 않았다.
- [ ] revision 2~3회의 변경점을 기록했다.

## 12. 구현 인계

- [ ] CSS/token-only와 구조 변경을 분리했다.
- [ ] component composition과 interaction state를 분리했다.
- [ ] route/IA 변경을 명시했다.
- [ ] data contract 선행 의존성을 별도 gate로 표시했다.
- [ ] 각 slice에 dependency와 rollback이 있다.
- [ ] 390/1024/1440 screenshot marker가 있다.
- [ ] 접근성과 unit/E2E marker가 있다.
- [ ] 앱 코드, commit, push, PR, deploy를 건드리지 않았다.
