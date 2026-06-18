import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outputPath = path.join(
  root,
  "docs/content-audit/2026-06-03-creator-interaction-flow-candidates.html",
);

const candidates = [
  {
    id: "computer-skills-practical-5day",
    title: "컴활 2급 실기 5일 실습 커리큘럼",
    category: "자격증/공부",
    score: 5,
    sourceTitle: "컴퓨터활용능력 2급 독학I (실기 5일)",
    sourceUrl: "https://aekkio.tistory.com/23",
    sourceType: "개인 후기 + 유튜브 강의 활용",
    interaction: "원문에 댓글 영역과 후속 글이 있고, 기풍쌤 영상은 유튜브 라이브 수업 기반이라 대화/채팅 맥락이 보인다.",
    sourceEvidence:
      "5일차 시리즈, 1일차/2일차 자료, 숙제 파일, 함수 정리, 직접 풀어보기 흐름이 원문에 분리되어 있다.",
    userValue:
      "시험일까지 며칠 남았는지 입력하면, 매일 볼 영상/자료/숙제를 캘린더와 진도표로 옮길 수 있다.",
    inputs: ["시험일", "하루 공부 가능 시간", "시작 회차"],
    uxPattern: "D. 기준일 타임라인 + 진도표",
    flowItems: [
      {
        title: "1일차 기본작업 영상 보고 숙제 풀기",
        schedule: "시험 D-5",
        checklist: ["영상 보기", "xlsx 자료 열기", "혼자 1회 풀기", "막힌 함수 메모"],
        memo: "원문 자료 링크와 영상 링크를 메모 상단에 둔다.",
      },
      {
        title: "2일차 함수 계산작업 정리",
        schedule: "시험 D-4",
        checklist: ["2일차 자료 다운로드", "함수 인수 정리", "기출 함수 1회 재풀이"],
        memo: "사용자는 오답 함수만 메모한다. FlowMe가 함수 설명을 새로 만들지 않는다.",
      },
      {
        title: "남은 기출 회차 실전처럼 풀기",
        schedule: "시험 D-3~D-1",
        checklist: ["시간 재고 풀기", "틀린 문제 체크", "재풀이 날짜 지정"],
        memo: "완료 기준은 '기출 회차 상태가 풀이/오답/재풀이 중 하나로 남음'이다.",
      },
    ],
    exportShape:
      "My Flow에서는 날짜별 공부 item + 내부 체크리스트. Google Calendar에는 매일 공부 이벤트 하나와 메모에 자료/숙제 체크리스트.",
    uxVerdict:
      "매우 좋음. 원문에 일차, 자료, 숙제, 사용 후기, 후속 글이 있어 Flow 변환 근거가 명확하다.",
  },
  {
    id: "computer-skills-written-3day",
    title: "컴활 2급 필기 3일 회차 플랜",
    category: "자격증/공부",
    score: 4.8,
    sourceTitle: "컴활 2급 필기 요약 정리 공유 (+ PDF 파일)",
    sourceUrl: "https://blog.naver.com/PostView.naver?blogId=bunnudy&logNo=222440821485",
    sourceType: "네이버 블로그 개인 후기",
    interaction: "네이버 블로그 공감/댓글 구조가 있고, 개인 경험과 PDF 공유 맥락이 보인다.",
    sourceEvidence:
      "1일차 1과목, 2일차 2과목, 3일차 월단위 재풀이와 정리라는 3일 공부 계획이 원문에 직접 제시되어 있다.",
    userValue:
      "사용자는 시험일만 입력하고 3일 플랜을 바로 캘린더로 저장할 수 있다.",
    inputs: ["시험일", "시작일", "기출 연도 범위"],
    uxPattern: "D. 기준일 타임라인",
    flowItems: [
      {
        title: "컴퓨터 일반 기출 3년치 풀기",
        schedule: "시험 D-3",
        checklist: ["학생용 문제 풀기", "해설본 확인", "틀린 개념 표시"],
        memo: "원문 PDF/요약 링크를 메모에 둔다.",
      },
      {
        title: "스프레드시트 일반 기출 3년치 풀기",
        schedule: "시험 D-2",
        checklist: ["2과목 문제 풀기", "반복 출제 개념 표시", "헷갈린 함수 메모"],
        memo: "사용자가 직접 체크할 것만 남긴다.",
      },
      {
        title: "월단위로 다시 풀고 요약 보기",
        schedule: "시험 D-1",
        checklist: ["최근 회차 재풀이", "오답만 다시 보기", "시험장 직전 요약 보기"],
        memo: "완료 기준은 '재풀이 회차와 오답 메모가 남음'이다.",
      },
    ],
    exportShape:
      "캘린더에는 3일 일정. 상세에는 각 과목 체크리스트와 원문/PDF 링크.",
    uxVerdict:
      "좋음. 사용자가 무엇을 따라해야 하는지 원문에서 바로 보이며 입력도 시험일 중심으로 가볍다.",
  },
  {
    id: "computer-skills-source-rounds",
    title: "컴활 2급 실기 기출 회차 풀이표",
    category: "자격증/공부",
    score: 4.9,
    sourceTitle: "컴활 2급 실기 상시 복원 기출문제 모음(2019년~2023년)",
    sourceUrl: "https://blog.naver.com/PostView.naver?blogId=won2520179&logNo=222977849599",
    sourceType: "네이버 블로그 제작자 자료",
    interaction: "원문에 공감과 댓글 81개가 표시되고, 자료 오류 제보를 댓글로 받는 구조다.",
    sourceEvidence:
      "2019~2023년 16회분, 문제지/엑셀 문제 파일/정답 파일, 회차별 유튜브 링크가 원문에 정리되어 있다.",
    userValue:
      "회차별 문제 풀이 상태를 표로 저장하고, 시험 전까지 풀 회차를 캘린더에 배치할 수 있다.",
    inputs: ["시험일", "풀 회차 수", "하루 풀이 가능 회차"],
    uxPattern: "D. 기준일 타임라인 + 표",
    flowItems: [
      {
        title: "기출 자료 내려받기",
        schedule: "시작일",
        checklist: ["문제지 다운로드", "엑셀 문제 파일 다운로드", "정답 파일 다운로드"],
        memo: "첨부파일과 원문 링크를 함께 보존한다.",
      },
      {
        title: "회차별 기출 풀이",
        schedule: "시험 전 반복",
        checklist: ["회차 선택", "시간 재고 풀이", "정답 파일로 채점", "오답 메모"],
        memo: "표 행은 회차, 상태, 점수, 오답, 재풀이일로 구성한다.",
      },
      {
        title: "오답 회차만 다시 풀기",
        schedule: "시험 D-1",
        checklist: ["오답 회차 필터", "함수/분석작업 재풀이", "최종 상태 완료"],
        memo: "완료 기준은 모든 선택 회차가 완료 또는 재풀이 완료 상태로 남는 것.",
      },
    ],
    exportShape:
      "My Flow는 표 중심. 캘린더에는 오늘 풀 회차만 표시하고, 회차 목록은 sheet로 export.",
    uxVerdict:
      "매우 좋음. 제작자 자료, 댓글 상호작용, 다운로드 파일, 회차 구조가 모두 있어 FlowMe가 잘 정리해줄 가치가 크다.",
  },
  {
    id: "washer-self-clean-decision",
    title: "LG 통돌이 세탁기 셀프 분해청소 판단 Flow",
    category: "가전 관리",
    score: 4.3,
    sourceTitle: "LG 통돌이 세탁기 TR14WK1 셀프 분해청소 방법",
    sourceUrl: "https://blog.naver.com/PostView.naver?blogId=zigbot&logNo=223209312724",
    sourceType: "네이버 블로그 제작자 경험",
    interaction: "네이버 블로그 공감/이웃추가/댓글 구조가 있고, 실제 제품 모델과 작업 사진 기반의 경험담이다.",
    sourceEvidence:
      "월 1회 세탁조 클리너 관리, 먼지필터 상태 확인, 준비물, 전원 코드 분리, 고착 부품 주의 같은 판단 지점이 원문에 있다.",
    userValue:
      "무작정 분해청소 루틴을 만드는 것이 아니라, 월간 관리와 '셀프/업체 예약' 결정 Flow로 바꿔야 한다.",
    inputs: ["세탁기 모델", "최근 통세척일", "이물질 발생 여부"],
    uxPattern: "C. 결정형 체크리스트",
    flowItems: [
      {
        title: "월간 통세척과 먼지필터 확인",
        schedule: "매월 1회",
        checklist: ["통세척 실행", "먼지필터 확인", "이물질/냄새 여부 기록"],
        memo: "평소 관리는 가벼운 루틴으로 유지한다.",
      },
      {
        title: "분해청소 필요 여부 판단",
        schedule: "이물질 발생 시",
        checklist: ["전원 분리 가능 여부", "공구 보유 여부", "고착 부품 위험 확인"],
        memo: "준비물과 주의사항을 메모에 두고, 셀프가 어려우면 업체 예약으로 보낸다.",
      },
      {
        title: "업체 예약 또는 셀프 작업일 확정",
        schedule: "판단 후",
        checklist: ["업체 견적/예약", "작업일 지정", "청소 후 상태 확인"],
        memo: "완료 기준은 '청소 방식과 작업일이 결정됨'이다.",
      },
    ],
    exportShape:
      "캘린더에는 월간 통세척 1개. 분해청소는 완료/보류/업체예약 결정 sheet.",
    uxVerdict:
      "좋음. 단, 분해 방법 자체를 FlowMe가 지시하면 위험하므로 '결정과 준비' 중심으로 변환해야 한다.",
  },
  {
    id: "japan-esim-setup-before-departure",
    title: "일본 eSIM 출국 전 등록 체크",
    category: "여행 준비",
    score: 4.6,
    sourceTitle: "삿포로 eSIM 후기! 로밍도깨비 이심 사용 방법 & 장단점 정리",
    sourceUrl: "https://blog.naver.com/PostView.naver?blogId=4223611&logNo=223359962508",
    sourceType: "네이버 블로그 사용 후기",
    interaction: "원문에 공감/댓글 구조가 있고, 실제 구매/발권/QR 등록/현지 사용 후기가 분리되어 있다.",
    sourceEvidence:
      "eSIM 구매 후 발권, QR 촬영, 레이블 지정, 현지 도착 후 데이터 로밍 ON 단계가 원문에 직접 정리되어 있다.",
    userValue:
      "출국 전날 사용자가 eSIM 등록을 놓치지 않게 하고, 현지 도착 후 켜야 할 설정을 캘린더 메모로 남긴다.",
    inputs: ["출국일", "도착 국가", "사용 기기"],
    uxPattern: "D. 기준일 타임라인",
    flowItems: [
      {
        title: "eSIM 구매 후 QR 발권 확인",
        schedule: "출국 D-2",
        checklist: ["상품 구매", "QR 확인", "환불 조건 확인"],
        memo: "상품 추천은 원문 경험으로 분리하고, Flow는 등록 절차만 다룬다.",
      },
      {
        title: "출국 전 eSIM 미리 등록",
        schedule: "출국 D-1",
        checklist: ["QR 촬영", "셀룰러 요금제 추가", "여행용 레이블 지정"],
        memo: "날짜 차감/로밍 조건은 상품별 안내를 확인하도록 둔다.",
      },
      {
        title: "도착 후 데이터 로밍 켜기",
        schedule: "도착일",
        checklist: ["여행 eSIM 선택", "데이터 로밍 ON", "인터넷 연결 확인"],
        memo: "완료 기준은 현지에서 데이터 연결이 확인됨.",
      },
    ],
    exportShape:
      "캘린더에는 D-2/D-1/도착일 3개. 외부 캘린더 메모에는 QR/상품/원문 URL.",
    uxVerdict:
      "좋음. 원문 단계가 명확하고 여행 전후 날짜와 잘 맞는다.",
  },
  {
    id: "everland-family-trip-prep",
    title: "에버랜드 가족 방문 준비물 체크",
    category: "여행/외출",
    score: 4.5,
    sourceTitle: "에버랜드 준비물 15가지 이렇게 준비하세요",
    sourceUrl: "https://blog.naver.com/PostView.naver?blogId=prettyye02&logNo=222557542061",
    sourceType: "네이버 여행 인플루언서 글",
    interaction: "네이버 블로그 여행 인플루언서 글이며, 공감/댓글 구조와 실제 방문 팁이 있다.",
    sourceEvidence:
      "준비물 15개가 번호로 정리되어 있고, 도시락/보조배터리/이용권 등록/파크 내 시설 같은 실행 정보가 구체적이다.",
    userValue:
      "방문일을 입력하면 전날 챙길 물건과 당일 확인할 앱/이용권/동선을 체크할 수 있다.",
    inputs: ["방문일", "동행 구성", "도시락 여부"],
    uxPattern: "D. 기준일 타임라인 + 체크리스트",
    flowItems: [
      {
        title: "방문 전 준비물 챙기기",
        schedule: "방문 D-1",
        checklist: ["우비/우산", "보조배터리", "물티슈/손수건", "간식/음료"],
        memo: "동행이 유아인지, 도시락을 싸는지에 따라 체크리스트가 달라진다.",
      },
      {
        title: "이용권과 앱 등록 확인",
        schedule: "방문 D-1",
        checklist: ["모바일 이용권 등록", "QR 확인", "가이드맵/예약 앱 확인"],
        memo: "완료 기준은 입장권이 앱에서 확인됨.",
      },
      {
        title: "당일 피크닉/충전/의무실 위치 확인",
        schedule: "방문일",
        checklist: ["서비스센터 위치", "피크닉 에어리어", "충전/유모차 대여 위치"],
        memo: "캘린더 메모에 원문 링크와 핵심 위치만 둔다.",
      },
    ],
    exportShape:
      "캘린더에는 방문 전날/당일 2개. 체크리스트는 가족 공유 가능한 내부 체크로 유지.",
    uxVerdict:
      "좋음. 원문이 준비물 리스트형이라 Flow 변환이 직관적이다.",
  },
  {
    id: "thankyou-bubu-arm-30day",
    title: "땅끄부부 팔뚝살 30일 챌린지",
    category: "운동/챌린지",
    score: 4.2,
    sourceTitle: "Thankyou BUBU 영상 통계: 최고의 팔뚝살 다이어트 30일 챌린지",
    sourceUrl: "https://gb.youtubers.me/89b517b4-7920-4466-b5ed-b2b7a2b15773/youtube-videos-stats",
    sourceType: "유튜브 제작자 영상 후보",
    interaction: "해당 통계 페이지에 조회수, 댓글, 좋아요 수가 함께 표시되어 사용자 상호작용 규모를 확인할 수 있다.",
    sourceEvidence:
      "영상 제목 자체가 30일 챌린지이고, 댓글/좋아요 수가 많아 사용자가 따라하는 콘텐츠일 가능성이 높다.",
    userValue:
      "하나의 운동 영상을 30일 반복 캘린더로 저장하고, 상세에는 원문 영상 링크와 오늘 완료 체크만 둔다.",
    inputs: ["시작일", "운동 요일", "휴식일"],
    uxPattern: "B. 루틴 + 콘텐츠 카드",
    flowItems: [
      {
        title: "팔뚝살 30일 챌린지 영상 따라하기",
        schedule: "30일 반복",
        checklist: ["영상 열기", "가능한 강도로 따라하기", "완료 체크"],
        memo: "동작 설명은 원문 영상에 맡기고 FlowMe는 일정과 완료 상태만 관리한다.",
      },
      {
        title: "주간 완료 횟수 확인",
        schedule: "매주 마지막 운동일",
        checklist: ["이번 주 완료 횟수 확인", "무리한 날 메모", "다음 주 요일 조정"],
        memo: "통증/어지러움이 있으면 중단 문구를 둔다.",
      },
      {
        title: "30일 완료 후 유지 여부 결정",
        schedule: "30일차",
        checklist: ["완료율 확인", "다시 시작/종료/다른 영상 선택"],
        memo: "운동 효과 보장 문구는 넣지 않는다.",
      },
    ],
    exportShape:
      "캘린더에는 매일 또는 선택 요일 반복 이벤트 1개. 상세에 원문 영상 링크와 완료/중단 체크.",
    uxVerdict:
      "조건부 좋음. 사용자 상호작용은 강하지만 정확한 원본 영상 URL을 추가 확보해야 대표 후보로 올릴 수 있다.",
  },
  {
    id: "new-apartment-precheck",
    title: "신축 아파트 입주 사전점검 체크",
    category: "주거/입주",
    score: 4.7,
    sourceTitle: "청약 신축 아파트 입주 사전 점검 하자 체크리스트 준비물 및 대행업체 후기",
    sourceUrl: "https://pingpo.tistory.com/438",
    sourceType: "개인 후기 + 준비물 체크",
    interaction: "원문이 입주예정자 카톡방 경험을 언급하고, 실제 하자 점검/대행업체 판단 흐름을 가진다.",
    sourceEvidence:
      "사전점검 준비물, 하자 체크, 직접 점검과 대행업체 선택이라는 결정 지점이 분리된다.",
    userValue:
      "입주 사전점검일을 입력하면 준비물, 점검 구역, 하자 기록, 보완 요청까지 한 번에 관리할 수 있다.",
    inputs: ["사전점검일", "세대 타입", "대행업체 이용 여부"],
    uxPattern: "C. 결정형 체크리스트",
    flowItems: [
      {
        title: "사전점검 준비물 챙기기",
        schedule: "점검 D-1",
        checklist: ["줄자", "포스트잇/테이프", "충전기", "사진 촬영 준비"],
        memo: "원문 준비물과 개인 추가 준비물을 분리한다.",
      },
      {
        title: "구역별 하자 점검",
        schedule: "점검일",
        checklist: ["현관/창호", "욕실", "주방", "방/거실", "전기/수도"],
        memo: "사진 첨부는 선택. 기본은 하자 위치와 메모.",
      },
      {
        title: "보완 요청 목록 정리",
        schedule: "점검 직후",
        checklist: ["하자 목록 확인", "중복 제거", "관리사무소/시공사 제출"],
        memo: "완료 기준은 제출한 하자 목록이 남는 것.",
      },
    ],
    exportShape:
      "My Flow는 체크리스트 + 사진 선택. 캘린더에는 점검 전날/점검일/제출 마감일.",
    uxVerdict:
      "매우 좋음. 원문이 사용자가 실제로 해야 할 행동과 결정 지점을 잘 제공한다.",
  },
];

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const renderList = (items) => `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;

const renderChecklistRows = (items) =>
  items
    .map(
      (item) => `
        <label class="check-row">
          <input type="checkbox" />
          <span>${escapeHtml(item)}</span>
        </label>
      `,
    )
    .join("");

const renderFlowUiMock = (candidate) => {
  const first = candidate.flowItems[0];
  const second = candidate.flowItems[1] ?? first;
  const third = candidate.flowItems[2] ?? second;
  const flowRows = candidate.flowItems
    .map(
      (item, index) => `
        <button class="flow-row ${index === 0 ? "selected" : ""}" type="button">
          <span>${escapeHtml(item.schedule)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <em>${item.checklist.length}개 체크</em>
        </button>
      `,
    )
    .join("");

  return `
    <section class="block ui-mock">
      <h3>FlowMe UI로 보면</h3>
      <div class="ui-stage">
        <div class="source-card">
          <span class="mini-label">원문에서 가져온 실행 단서</span>
          <h4>${escapeHtml(candidate.sourceTitle)}</h4>
          <p>${escapeHtml(candidate.sourceEvidence)}</p>
          <a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">원문 열기</a>
        </div>

        <div class="save-card">
          <span class="mini-label">저장 화면</span>
          <h4>${escapeHtml(candidate.title)}</h4>
          <div class="field-grid">
            ${candidate.inputs
              .map(
                (input, index) => `
                  <label>
                    <span>${escapeHtml(input)}</span>
                    <input value="${index === 0 ? "사용자 선택" : "기본값"}" readonly />
                  </label>
                `,
              )
              .join("")}
          </div>
          <button type="button">내 Flow로 저장</button>
        </div>

        <div class="my-flow-card">
          <span class="mini-label">My Flow 실행 목록</span>
          <div class="flow-row-list">${flowRows}</div>
        </div>

        <div class="detail-card">
          <span class="mini-label">상세 편집</span>
          <h4>${escapeHtml(first.title)}</h4>
          <div class="detail-meta">
            <span>${escapeHtml(first.schedule)}</span>
            <span>${escapeHtml(candidate.uxPattern)}</span>
          </div>
          <div class="detail-checks">${renderChecklistRows(first.checklist)}</div>
          <label class="memo-field">
            <span>메모</span>
            <textarea readonly>${escapeHtml(first.memo)}

원문: ${escapeHtml(candidate.sourceUrl)}</textarea>
          </label>
          <div class="detail-actions">
            <button type="button">완료 체크</button>
            <button type="button" class="secondary">날짜/반복 수정</button>
          </div>
        </div>

        <div class="export-card">
          <span class="mini-label">외부 도구로 보내면</span>
          <strong>${escapeHtml(first.title)}</strong>
          <p>캘린더 제목은 짧게 유지하고, 체크리스트와 원문 링크는 설명/메모로 들어갑니다.</p>
          <div class="export-lines">
            <span>${escapeHtml(first.schedule)} · ${escapeHtml(first.title)}</span>
            <span>${escapeHtml(second.schedule)} · ${escapeHtml(second.title)}</span>
            <span>${escapeHtml(third.schedule)} · ${escapeHtml(third.title)}</span>
          </div>
        </div>
      </div>
    </section>
  `;
};

const renderFlowItems = (items) =>
  items
    .map(
      (item, index) => `
        <li class="flow-item">
          <div class="flow-title"><span>${index + 1}</span><strong>${escapeHtml(item.title)}</strong></div>
          <dl>
            <div><dt>일정</dt><dd>${escapeHtml(item.schedule)}</dd></div>
            <div><dt>체크</dt><dd>${renderList(item.checklist)}</dd></div>
            <div><dt>메모</dt><dd>${escapeHtml(item.memo)}</dd></div>
          </dl>
        </li>
      `,
    )
    .join("");

const renderPreview = (candidate) => {
  const first = candidate.flowItems[0];
  const second = candidate.flowItems[1] ?? first;
  const third = candidate.flowItems[2] ?? second;
  return `
    <aside class="preview">
      <div class="phone">
        <div class="phone-bar"><span>Flow 저장</span><strong>${escapeHtml(candidate.uxPattern.split(".")[0])}</strong></div>
        <section>
          <p class="label">원문에서 저장</p>
          <h4>${escapeHtml(candidate.title)}</h4>
          <div class="inputs">${candidate.inputs.map((input) => `<span>${escapeHtml(input)}</span>`).join("")}</div>
          <button>내 Flow로 저장</button>
        </section>
        <section>
          <p class="label">My Flow</p>
          <div class="row active"><span>${escapeHtml(first.schedule)}</span><strong>${escapeHtml(first.title)}</strong></div>
          <div class="row"><span>${escapeHtml(second.schedule)}</span><strong>${escapeHtml(second.title)}</strong></div>
          <div class="row"><span>${escapeHtml(third.schedule)}</span><strong>${escapeHtml(third.title)}</strong></div>
        </section>
        <section>
          <p class="label">상세</p>
          <h4>${escapeHtml(first.title)}</h4>
          <p>${escapeHtml(first.memo)}</p>
          <a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">원문 열기</a>
        </section>
      </div>
    </aside>
  `;
};

const renderCandidate = (candidate, index) => `
  <article class="candidate" id="${escapeHtml(candidate.id)}">
    <header>
      <div>
        <div class="tags">
          <span>#${index + 1}</span>
          <span>${escapeHtml(candidate.category)}</span>
          <span>${escapeHtml(candidate.uxPattern)}</span>
        </div>
        <h2>${escapeHtml(candidate.title)}</h2>
        <p>${escapeHtml(candidate.userValue)}</p>
      </div>
      <div class="score"><span>사용자 기준</span><strong>${candidate.score.toFixed(1)}</strong></div>
    </header>
    <div class="body">
      <div class="main-col">
        <section class="block">
          <h3>원문 컨텐츠</h3>
          <dl class="meta">
            <div><dt>링크</dt><dd><a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(candidate.sourceTitle)}</a></dd></div>
            <div><dt>성격</dt><dd>${escapeHtml(candidate.sourceType)}</dd></div>
            <div><dt>상호작용</dt><dd>${escapeHtml(candidate.interaction)}</dd></div>
            <div><dt>실행 근거</dt><dd>${escapeHtml(candidate.sourceEvidence)}</dd></div>
          </dl>
        </section>
        <section class="block">
          <h3>Flow 컨텐츠화</h3>
          <div class="input-box">
            <strong>사용자 입력</strong>
            ${renderList(candidate.inputs)}
          </div>
          <ol class="flow-list">${renderFlowItems(candidate.flowItems)}</ol>
        </section>
        ${renderFlowUiMock(candidate)}
        <section class="block">
          <h3>UX 적용 판단</h3>
          <p><strong>Export:</strong> ${escapeHtml(candidate.exportShape)}</p>
          <p><strong>판단:</strong> ${escapeHtml(candidate.uxVerdict)}</p>
        </section>
      </div>
      ${renderPreview(candidate)}
    </div>
  </article>
`;

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>실제 제작자 기반 Flow 후보</title>
  <style>
    :root {
      --bg: #f6f7f9;
      --panel: #fff;
      --ink: #0f172a;
      --muted: #5b6472;
      --line: #dfe5ee;
      --blue: #2563eb;
      --blue-soft: #eff6ff;
      --green: #047857;
      --green-soft: #ecfdf5;
      --amber-soft: #fffbeb;
      --shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 14px 34px rgba(15, 23, 42, 0.07);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.6;
      letter-spacing: 0;
    }
    a { color: var(--blue); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .page { max-width: 1340px; margin: 0 auto; padding: 28px 18px 80px; }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 380px;
      gap: 18px;
      align-items: end;
      margin-bottom: 18px;
    }
    .eyebrow {
      display: inline-flex;
      border: 1px solid #bfdbfe;
      border-radius: 999px;
      background: var(--blue-soft);
      color: #1d4ed8;
      padding: 4px 10px;
      font-size: 13px;
      font-weight: 900;
    }
    h1 { margin: 12px 0 0; font-size: clamp(34px, 5vw, 58px); line-height: 1.08; letter-spacing: 0; }
    .hero p { max-width: 820px; color: var(--muted); font-size: 15px; }
    .metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .metric, .candidate { border: 1px solid var(--line); border-radius: 8px; background: var(--panel); box-shadow: var(--shadow); }
    .metric { padding: 14px; }
    .metric span { display: block; color: var(--muted); font-size: 12px; font-weight: 800; }
    .metric strong { display: block; margin-top: 4px; font-size: 25px; }
    .note {
      border: 1px solid #fde68a;
      border-radius: 8px;
      background: var(--amber-soft);
      padding: 14px;
      margin: 18px 0;
      color: #334155;
      font-size: 14px;
    }
    .list { display: grid; gap: 18px; }
    .candidate { overflow: hidden; }
    .candidate header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 90px;
      gap: 12px;
      padding: 18px;
      border-bottom: 1px solid var(--line);
      background: linear-gradient(180deg, #fff, #fbfdff);
    }
    .candidate h2 { margin: 8px 0 0; font-size: 27px; line-height: 1.2; }
    .candidate header p { margin: 8px 0 0; color: var(--muted); font-size: 14px; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .tags span {
      border: 1px solid #dbeafe;
      border-radius: 999px;
      background: var(--blue-soft);
      color: #1d4ed8;
      padding: 4px 9px;
      font-size: 12px;
      font-weight: 900;
    }
    .score {
      display: grid;
      place-items: center;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      background: var(--green-soft);
      color: var(--green);
      text-align: center;
      font-weight: 900;
      min-height: 78px;
    }
    .score span { font-size: 11px; }
    .score strong { font-size: 25px; }
    .body { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; padding: 18px; }
    .main-col { display: grid; gap: 14px; }
    .block { border: 1px solid var(--line); border-radius: 8px; background: #fff; padding: 14px; }
    .block h3 { margin: 0 0 10px; font-size: 15px; }
    .block p, .block li, .block dd { color: #334155; font-size: 13px; }
    .meta, .flow-item dl { display: grid; gap: 8px; margin: 0; }
    .meta div, .flow-item dl div { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 10px; }
    dt { color: #64748b; font-size: 12px; font-weight: 900; }
    dd { margin: 0; }
    ul { margin: 0; padding-left: 18px; }
    .input-box { border: 1px solid var(--line); border-radius: 8px; background: #f8fafc; padding: 11px; margin-bottom: 10px; }
    .input-box strong { display: block; margin-bottom: 6px; font-size: 13px; }
    .flow-list { display: grid; gap: 10px; padding-left: 0; list-style: none; }
    .flow-item { border: 1px solid #e2e8f0; border-radius: 8px; background: #fbfdff; padding: 11px; }
    .flow-title { display: flex; gap: 8px; margin-bottom: 8px; align-items: flex-start; }
    .flow-title span { border-radius: 6px; background: #e0f2fe; color: #0369a1; padding: 2px 7px; font-size: 11px; font-weight: 900; }
    .flow-title strong { font-size: 14px; }
    .ui-mock { background: #f8fafc; }
    .ui-stage {
      display: grid;
      grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
      gap: 10px;
    }
    .source-card, .save-card, .my-flow-card, .detail-card, .export-card {
      border: 1px solid #dbe3ee;
      border-radius: 8px;
      background: #fff;
      padding: 12px;
      min-width: 0;
    }
    .source-card { border-left: 4px solid #64748b; }
    .save-card { border-left: 4px solid var(--blue); }
    .my-flow-card { border-left: 4px solid #0f766e; }
    .detail-card {
      grid-row: span 2;
      border-left: 4px solid #7c3aed;
    }
    .export-card {
      grid-column: 1 / -1;
      border-left: 4px solid #f59e0b;
      background: #fffbeb;
    }
    .mini-label {
      display: inline-flex;
      margin-bottom: 7px;
      color: #2563eb;
      font-size: 11px;
      font-weight: 900;
    }
    .source-card h4, .save-card h4, .detail-card h4 {
      margin: 0 0 7px;
      font-size: 16px;
      line-height: 1.25;
    }
    .source-card p, .export-card p { margin: 0 0 9px; font-size: 12px; color: #475569; }
    .field-grid { display: grid; gap: 8px; margin: 8px 0 10px; }
    .field-grid label, .memo-field { display: grid; gap: 5px; }
    .field-grid label span, .memo-field span {
      color: #64748b;
      font-size: 11px;
      font-weight: 900;
    }
    .field-grid input, .memo-field textarea {
      width: 100%;
      border: 1px solid #dbe3ee;
      border-radius: 7px;
      background: #f8fafc;
      padding: 8px;
      color: #334155;
      font: inherit;
      font-size: 12px;
    }
    .memo-field textarea {
      min-height: 108px;
      resize: vertical;
      line-height: 1.5;
    }
    .flow-row-list { display: grid; gap: 7px; }
    .flow-row {
      display: grid;
      grid-template-columns: 76px minmax(0, 1fr);
      gap: 5px 8px;
      width: 100%;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
      color: var(--ink);
      padding: 9px;
      text-align: left;
    }
    .flow-row.selected { border-color: #93c5fd; background: #eff6ff; }
    .flow-row span { color: #64748b; font-size: 11px; font-weight: 900; }
    .flow-row strong {
      overflow: hidden;
      min-width: 0;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
    }
    .flow-row em {
      grid-column: 2;
      color: #64748b;
      font-size: 11px;
      font-style: normal;
    }
    .detail-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 9px; }
    .detail-meta span {
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      background: #f8fafc;
      padding: 3px 8px;
      color: #475569;
      font-size: 11px;
      font-weight: 800;
    }
    .detail-checks { display: grid; gap: 6px; margin-bottom: 10px; }
    .check-row {
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr);
      gap: 7px;
      align-items: start;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      background: #fbfdff;
      padding: 7px;
      font-size: 12px;
      color: #334155;
    }
    .check-row input { margin: 2px 0 0; }
    .detail-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    button.secondary {
      border: 1px solid #cbd5e1;
      background: #fff;
      color: #334155;
    }
    .export-lines { display: grid; gap: 5px; }
    .export-lines span {
      border: 1px solid #fde68a;
      border-radius: 7px;
      background: #fff;
      padding: 7px;
      color: #334155;
      font-size: 12px;
    }
    .preview { align-self: start; position: sticky; top: 14px; }
    .phone {
      border: 1px solid #cbd5e1;
      border-radius: 22px;
      background: #f8fafc;
      padding: 12px;
      box-shadow: inset 0 0 0 6px #111827, 0 18px 36px rgba(15, 23, 42, 0.12);
    }
    .phone-bar { display: flex; justify-content: space-between; color: #fff; margin: 8px 4px 12px; font-size: 12px; }
    .phone section { border: 1px solid var(--line); border-radius: 8px; background: #fff; padding: 12px; margin-bottom: 10px; }
    .label { margin: 0 0 5px; color: #64748b; font-size: 11px; font-weight: 900; }
    .phone h4 { margin: 0 0 9px; font-size: 16px; line-height: 1.25; }
    .inputs { display: grid; gap: 6px; margin-bottom: 10px; }
    .inputs span { border: 1px solid #e2e8f0; border-radius: 7px; background: #f8fafc; padding: 7px 8px; color: #475569; font-size: 12px; }
    button { width: 100%; border: 0; border-radius: 8px; background: var(--blue); color: #fff; padding: 9px 10px; font-weight: 900; }
    .row { display: grid; grid-template-columns: 70px minmax(0, 1fr); gap: 8px; align-items: center; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; margin-top: 7px; }
    .row.active { border-color: #93c5fd; background: #eff6ff; }
    .row span { color: #64748b; font-size: 11px; font-weight: 900; }
    .row strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
    .phone p { color: #334155; font-size: 12px; }
    .phone a { font-size: 12px; font-weight: 900; }
    @media (max-width: 980px) {
      .hero, .body { grid-template-columns: 1fr; }
      .ui-stage { grid-template-columns: 1fr; }
      .detail-card, .export-card { grid-column: auto; grid-row: auto; }
      .preview { position: static; }
      .phone { max-width: 420px; }
    }
    @media (max-width: 640px) {
      .page { padding: 18px 10px 60px; }
      .hero { display: block; }
      .metrics { grid-template-columns: 1fr; margin-top: 16px; }
      .candidate header { grid-template-columns: 1fr; padding: 14px; }
      .body { padding: 14px; }
      .meta div, .flow-item dl div { grid-template-columns: 1fr; gap: 2px; }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <div>
        <span class="eyebrow">Creator Interaction Candidates</span>
        <h1>실제 제작자/상호작용 기반 Flow 후보</h1>
        <p>
          AI 느낌이 강한 일반 정보글보다, 네이버 블로그·유튜브·개인 후기처럼 제작자 맥락과 사용자 반응이 보이고
          원문에서 실행 구조가 명확한 후보를 우선 골랐습니다.
        </p>
      </div>
      <div class="metrics">
        <div class="metric"><span>추가 후보</span><strong>${candidates.length}개</strong></div>
        <div class="metric"><span>평균 점수</span><strong>${(candidates.reduce((sum, item) => sum + item.score, 0) / candidates.length).toFixed(1)}</strong></div>
        <div class="metric"><span>상호작용 근거</span><strong>댓글/공감/조회</strong></div>
        <div class="metric"><span>핵심 기준</span><strong>원문 실행성</strong></div>
      </div>
    </section>

    <div class="note">
      이번 후보는 “주제가 FlowMe에 맞는가”보다 한 단계 더 들어가서 봅니다.
      원문에 날짜, 반복, 일차, 회차, 체크리스트, 준비물, 제출/예약/결정 지점이 이미 보이는지,
      그리고 사용자가 제작자 콘텐츠를 보고 실제로 따라할 마음이 생기는지를 우선했습니다.
    </div>

    <section class="list">
      ${candidates.map(renderCandidate).join("")}
    </section>
  </main>
</body>
</html>`;

fs.writeFileSync(outputPath, html, "utf8");
console.log(`Wrote ${path.relative(root, outputPath)} (${candidates.length} candidates)`);
