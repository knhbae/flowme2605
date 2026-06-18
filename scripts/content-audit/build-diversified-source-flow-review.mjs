import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const jsonPath = path.join(
  root,
  'docs/content-audit/original-source-review/2026-06-07-diversified-source-flow-review.json',
);
const htmlPath = path.join(root, 'docs/content-audit/2026-06-07-diversified-source-flow-review.html');

const weights = {
  sourceContext: 0.3,
  userDesire: 0.2,
  executionClarity: 0.2,
  portability: 0.15,
  inputSimplicity: 0.1,
  reuse: 0.05,
};

const candidates = [
  {
    id: 'japan-esim-setup',
    title: '해외여행 eSIM 출국 전 설정',
    category: '여행/통신',
    sourceTitle: "로깨비 eSIM 사용 후기 + Holafly/WOWPASS 설정 가이드",
    sourceUrl: 'https://www.korea-iphone.com/blog/cPmwHeayWgQN.html',
    supportUrls: [
      'https://esim.holafly.com/ko/guides-esim/esim-roaming/',
      'https://wowpass.oopy.io/guide/sim/ko/esim',
    ],
    sourceStatus: '직접 확인',
    sourceEvidence:
      '앱 다운로드, 상품 선택, QR 스캔/수동 입력, 여행용 레이블 지정, 데이터 로밍 ON, 사용 후 삭제까지 순서가 분명하다. Holafly/WOWPASS 공식성 가이드에서도 APN, 데이터 로밍, iOS/안드로이드 QR 설치 절차가 확인된다.',
    destination: '체크리스트 + 메모',
    inputs: ['출국일', '사용 기기'],
    flowItems: [
      ['D-3', 'eSIM 지원 기기 확인'],
      ['D-2', '상품 구매 후 QR/활성화 코드 보관'],
      ['D-1', '한국에서 eSIM 추가 후 여행용 레이블 지정'],
      ['도착 후', '데이터 로밍 ON, 네트워크/LTE 확인'],
    ],
    memo: 'APN, 재부팅, 비행기 모드, 데이터 자동 업데이트 제한은 상세 메모에 둔다.',
    scores: { sourceContext: 4.4, userDesire: 4.7, executionClarity: 4.8, portability: 4.6, inputSimplicity: 4.7, reuse: 4.0 },
    verdict: '신규 대표 후보',
  },
  {
    id: 'banana-peanut-recipe-video',
    title: '노밀가루 바나나 땅콩버터 빵',
    category: '요리/레시피',
    sourceTitle: '레시피오 - 유튜브 기반 레시피',
    sourceUrl: 'https://www.recipio.kr/recipes/WwyL63J3',
    supportUrls: ['https://www.youtube.com/'],
    sourceStatus: '직접 확인',
    sourceEvidence:
      '레시피오 페이지에서 유튜브 원본 영상, 수리테이블 채널, 조리 시간 20분, 3인분, 조리도구, 재료 가격, 4단계 조리 순서가 확인된다.',
    destination: '체크리스트 + 장보기 메모',
    inputs: ['요리 날짜', '분량'],
    flowItems: [
      ['장보기', '바나나 2개, 계란 3개, 땅콩버터 3큰술, 초코칩 준비'],
      ['준비', '내열용기와 포크, 에어프라이어 준비'],
      ['조리', '바나나/계란/땅콩버터 섞기'],
      ['완료', '180도 약 15분 굽기'],
    ],
    memo: '영상 링크, 재료 대체, 에어프라이어 온도/시간, 쿠팡 파트너스 표시는 메모/출처 영역에 둔다.',
    scores: { sourceContext: 4.1, userDesire: 4.1, executionClarity: 4.9, portability: 4.4, inputSimplicity: 4.8, reuse: 3.2 },
    verdict: '신규 대표 후보',
  },
  {
    id: 'kids-dino-footprint-art',
    title: '공룡 발자국 엄마표 미술놀이',
    category: '육아/놀이',
    sourceTitle: '슈에뜨아르떼 네이버 블로그 - 공룡 발자국 찍기 놀이',
    sourceUrl: 'https://blog.naver.com/PostView.naver?blogId=ibbunde&logNo=222504197592',
    supportUrls: [],
    sourceStatus: '검색 결과 기반',
    sourceEvidence:
      '검색 결과에서 권장연령, 도안 다운로드, 재료, 활동 방법, 공감/태그 유도 등 제작자-사용자 상호작용 단서가 확인된다.',
    destination: '캘린더 + 준비물 체크',
    inputs: ['놀이 날짜', '아이 연령'],
    flowItems: [
      ['전날', '도안 다운로드/인쇄'],
      ['시작 전', '물감, 뽁뽁이 또는 매직페이퍼 준비'],
      ['놀이', '발자국 찍기 활동'],
      ['마무리', '작품 말리기와 정리'],
    ],
    memo: '도안 링크, 준비물 사진, 작가 태그 안내는 메모에 둔다. 아이 발달 기록 필드는 만들지 않는다.',
    scores: { sourceContext: 4.0, userDesire: 4.3, executionClarity: 4.1, portability: 4.2, inputSimplicity: 4.6, reuse: 4.0 },
    verdict: '신규 대표 후보',
  },
  {
    id: 'wedding-day-before-pdf',
    title: '결혼식 하루 전/당일 준비물 PDF',
    category: '생활 이벤트',
    sourceTitle: '네이버 블로그 - 본식 하루 전 체크리스트 및 준비물 PDF 공유',
    sourceUrl: 'https://blog.naver.com/PostView.naver?blogId=yeonju3310&logNo=223286480422',
    supportUrls: [],
    sourceStatus: '검색 결과 기반',
    sourceEvidence:
      '검색 결과에서 본식 하루 전/당일 준비물, PDF 템플릿, 연락처 템플릿, 웨딩밴드/예복/사례금/축의금 가방 같은 구체 항목이 확인된다.',
    destination: 'D-1 체크리스트 + 메모',
    inputs: ['예식일'],
    flowItems: [
      ['D-1', '웨딩밴드, 예복, 구두, 혼주 한복 확인'],
      ['D-1', '헬퍼비/사회자/축가 사례금 봉투 준비'],
      ['D-day', '축의금 가방, 생수, 인공눈물, 구강 청결제 확인'],
      ['공유', '가족 연락처/차량 자료 링크 메모'],
    ],
    memo: '템플릿 PDF는 첨부/링크로 두고, 체크 항목은 사용자 상황에 맞게 삭제 가능하게 한다.',
    scores: { sourceContext: 4.2, userDesire: 4.8, executionClarity: 4.8, portability: 4.7, inputSimplicity: 4.7, reuse: 2.6 },
    verdict: '기존 결혼 후보 보강',
  },
  {
    id: 'toss-card-otp-setup',
    title: '토스뱅크 체크카드 OTP 등록',
    category: '금융/앱 설정',
    sourceTitle: '토스뱅크 공식 카드 페이지 + OTP 등록 방법 글',
    sourceUrl: 'https://tossbank.com/product-service/card/check-card',
    supportUrls: [
      'https://thisthatbase.com/tossbank-otp-registered/',
      'https://extrememanual.net/44462',
    ],
    sourceStatus: '검색 결과 기반',
    sourceEvidence:
      '토스뱅크 공식 페이지에서 체크카드 OTP 기능이 확인되고, 검색 결과에서 체크카드/타행/모바일 OTP 등록 방법과 1천만원 이상 이체 인증 맥락이 확인된다.',
    destination: '체크리스트 + 완료 메모',
    inputs: ['카드 수령일'],
    flowItems: [
      ['수령일', '체크카드 사용 등록'],
      ['설정', '앱에서 OTP 또는 모바일 OTP 등록'],
      ['확인', 'NFC/카드 접촉 인증 방식 확인'],
      ['완료', '고액 이체 전 인증 수단 메모'],
    ],
    memo: '앱 메뉴 경로는 최신성이 바뀔 수 있으므로 공식/최신 링크를 메모에 둔다.',
    scores: { sourceContext: 4.0, userDesire: 3.8, executionClarity: 4.3, portability: 4.0, inputSimplicity: 4.6, reuse: 2.4 },
    verdict: '보류 후보',
  },
  {
    id: 'puppy-adoption-checklist',
    title: '강아지 입양 전 준비 체크',
    category: '반려동물/입양',
    sourceTitle: '유기견 입양 체크리스트/PDF 검색 결과',
    sourceUrl:
      'https://on.com2us.com/wp-content/uploads/2022/03/2021%E1%84%82%E1%85%A7%E1%86%AB11%E1%84%8B%E1%85%AF%E1%86%AF_%E1%84%80%E1%85%A6%E1%85%B5%E1%86%B7%E1%84%87%E1%85%B5%E1%86%AF%E1%84%8F%E1%85%A5%E1%86%B7%E1%84%90%E1%85%AE%E1%84%89%E1%85%B3%E1%84%82%E1%85%B2%E1%84%89%E1%85%B3.pdf',
    supportUrls: ['https://min-dro.com/34'],
    sourceStatus: '검색 결과 기반',
    sourceEvidence:
      '검색 결과에서 유기견 입양 체크리스트, 입양 전 준비, 입양 후 교육, 보호동물 확인 같은 실행 단서가 확인된다.',
    destination: '입양 전 체크리스트 + 첫 주 캘린더',
    inputs: ['입양 예정일', '강아지 나이'],
    flowItems: [
      ['입양 전', '가족 동의와 생활 시간 확인'],
      ['입양 전', '식기, 배변패드, 이동장, 잠자리 준비'],
      ['첫날', '집 안 적응 공간 마련'],
      ['첫 주', '동물병원/보호소 안내사항 메모'],
    ],
    memo: '건강 판단은 병원/보호소 안내 링크로 분리하고, Flow는 준비와 적응 체크에 머문다.',
    scores: { sourceContext: 3.8, userDesire: 4.3, executionClarity: 3.9, portability: 4.1, inputSimplicity: 4.0, reuse: 3.2 },
    verdict: '보류 후보',
  },
  {
    id: 'newborn-car-seat-setup',
    title: '신생아 카시트 설치/방향 체크',
    category: '육아/장비',
    sourceTitle: '신생아 카시트 후기 + 안전 착석 PDF 검색 결과',
    sourceUrl: 'https://blog.naver.com/PostView.naver?blogId=nurse_leeda&logNo=223355986848',
    supportUrls: [
      'https://www.kidsafensw.org/imagesDB/documents/RP429KidsafeNSWSeatMeSafely-RearwardFacing.V1.8KoreanWeb.pdf',
    ],
    sourceStatus: '검색 결과 기반',
    sourceEvidence:
      '검색 결과에서 신생아 카시트 사용 시기, 설치 방향, 적응 방법이 확인되고, 안전 자료에서는 후방장착, 하네스, 안전벨트 통로 같은 체크 단서가 보인다.',
    destination: '출산 전 체크리스트 + 설치 메모',
    inputs: ['출산 예정일', '차량/카시트 모델'],
    flowItems: [
      ['D-30', '카시트 모델과 차량 호환 확인'],
      ['D-14', '후방장착/안전벨트 통로/ISOFIX 확인'],
      ['D-7', '하네스 높이와 이너시트 확인'],
      ['퇴원 전', '설치 완료 사진 또는 메모 선택 저장'],
    ],
    memo: '브랜드 후기와 안전 기준은 분리한다. 설치 판단은 제품 설명서와 공식 안전 자료 링크를 우선한다.',
    scores: { sourceContext: 3.9, userDesire: 4.4, executionClarity: 4.1, portability: 4.2, inputSimplicity: 3.7, reuse: 2.8 },
    verdict: '보류 후보',
  },
  {
    id: 'car-inspection-local-reservation',
    title: '자동차 검사 예약/방문 준비',
    category: '차량/행정',
    sourceTitle: '자동차 검사소 예약/방문 준비 네이버 블로그 검색 결과',
    sourceUrl: 'https://blog.naver.com/PostView.naver?blogId=caryak-blog&logNo=223541063791',
    supportUrls: [],
    sourceStatus: '검색 결과 기반',
    sourceEvidence:
      '검색 결과에서 예약, 접수처 방문, 검사 진행, 검사 기한 초과 시 과태료 같은 방문 전 체크 단서가 확인된다.',
    destination: '검사 만료일 캘린더 + 방문 체크리스트',
    inputs: ['검사 만료일', '검사소'],
    flowItems: [
      ['D-30', '검사 기간과 검사소 확인'],
      ['D-14', '예약 완료'],
      ['D-1', '자동차등록증/보험/차량 상태 확인'],
      ['당일', '접수처 방문과 검사 결과 메모'],
    ],
    memo: '지역 업체 홍보와 공식 검사/과태료 정보는 분리한다.',
    scores: { sourceContext: 3.6, userDesire: 4.0, executionClarity: 4.4, portability: 4.3, inputSimplicity: 4.2, reuse: 3.3 },
    verdict: '보류 후보',
  },
  {
    id: 'advance-voting-prep',
    title: '사전투표소 확인과 준비물',
    category: '생활 행정',
    sourceTitle: '관악구 사전투표소 위치 정리 네이버 블로그 검색 결과',
    sourceUrl: 'https://blog.naver.com/PostView.naver?blogId=wkf23&logNo=223878764789',
    supportUrls: [],
    sourceStatus: '검색 결과 기반',
    sourceEvidence:
      '검색 결과에서 투표 장소, 신분증, 휴대폰 보관 같은 방문 전 체크 항목이 확인된다.',
    destination: '일정 + 체크리스트 + 공식 링크 메모',
    inputs: ['투표 예정일', '지역'],
    flowItems: [
      ['D-3', '내 지역 사전투표소 공식 확인'],
      ['D-1', '신분증 준비'],
      ['당일', '휴대폰 보관/투표소 위치 확인'],
      ['완료', '투표 완료 체크'],
    ],
    memo: '지역/날짜는 공식 선관위 링크를 우선하고 블로그는 보조 참고로 둔다.',
    scores: { sourceContext: 3.4, userDesire: 3.8, executionClarity: 4.0, portability: 4.2, inputSimplicity: 4.4, reuse: 2.0 },
    verdict: '보류 후보',
  },
  {
    id: 'weekend-farm-june-crops',
    title: '6월 주말농장 작물 심기',
    category: '텃밭/가드닝',
    sourceTitle: '6월에 심는 텃밭작물 10가지 네이버 블로그 검색 결과',
    sourceUrl: 'https://blog.naver.com/PostView.nhn?blogId=aldus_06&logNo=222737304553',
    supportUrls: [],
    sourceStatus: '검색 결과 기반',
    sourceEvidence:
      '검색 결과에서 6월 작물 목록과 서리태 본잎 5~7장 순지르기처럼 작물별 관리 시점 단서가 확인된다.',
    destination: '작물별 캘린더 + 관찰 메모',
    inputs: ['작물', '심은 날'],
    flowItems: [
      ['심는 날', '작물 선택과 심기 메모'],
      ['생육 중', '본잎/순지르기 시점 확인'],
      ['주간', '물주기와 병충해 관찰'],
      ['수확 전', '수확 신호 메모'],
    ],
    memo: '작물별 세부 일정은 원문 직접 확인 후 표로 나눠야 한다.',
    scores: { sourceContext: 3.5, userDesire: 4.0, executionClarity: 3.7, portability: 4.1, inputSimplicity: 3.8, reuse: 4.3 },
    verdict: '보류 후보',
  },
];

const weightedScore = (scores) =>
  Number(
    (
      scores.sourceContext * weights.sourceContext +
      scores.userDesire * weights.userDesire +
      scores.executionClarity * weights.executionClarity +
      scores.portability * weights.portability +
      scores.inputSimplicity * weights.inputSimplicity +
      scores.reuse * weights.reuse
    ).toFixed(2),
  );

const enriched = candidates
  .map((candidate) => ({ ...candidate, weightedScore: weightedScore(candidate.scores) }))
  .sort((a, b) => b.weightedScore - a.weightedScore);

const output = {
  generatedAt: '2026-06-07',
  purpose:
    '기존 대표 후보가 반복되는 문제를 줄이기 위해 새 카테고리 원문을 직접/검색 결과 기반으로 재확인하고 Flow 변환 가능성을 점수화한다.',
  weights,
  candidates: enriched,
};

fs.writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const scoreChip = (label, value) => `<span><b>${escapeHtml(label)}</b> ${value.toFixed(1)}</span>`;

const cards = enriched
  .map(
    (candidate, index) => `<article class="candidate" id="${escapeHtml(candidate.id)}">
      <header>
        <div>
          <span class="rank">#${index + 1}</span>
          <span class="category">${escapeHtml(candidate.category)}</span>
          <span class="status">${escapeHtml(candidate.sourceStatus)}</span>
          <h2>${escapeHtml(candidate.title)}</h2>
          <p>${escapeHtml(candidate.sourceEvidence)}</p>
        </div>
        <div class="total"><span>가중 점수</span><strong>${candidate.weightedScore.toFixed(2)}</strong><em>${escapeHtml(candidate.verdict)}</em></div>
      </header>
      <section class="grid">
        <div class="source">
          <h3>원문/보조 출처</h3>
          <a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(candidate.sourceTitle)}</a>
          ${candidate.supportUrls.map((url) => `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">보조 출처</a>`).join('')}
        </div>
        <div>
          <h3>저장 방식</h3>
          <p><strong>${escapeHtml(candidate.destination)}</strong></p>
          <p>${escapeHtml(candidate.inputs.join(' / '))}</p>
        </div>
        <div class="scores">
          <h3>점수</h3>
          ${scoreChip('출처/반응', candidate.scores.sourceContext)}
          ${scoreChip('욕구', candidate.scores.userDesire)}
          ${scoreChip('구조', candidate.scores.executionClarity)}
          ${scoreChip('변환', candidate.scores.portability)}
          ${scoreChip('입력', candidate.scores.inputSimplicity)}
          ${scoreChip('반복', candidate.scores.reuse)}
        </div>
      </section>
      <section class="artifact">
        <h3>Flow 변환 예시</h3>
        <ol>${candidate.flowItems.map(([time, title]) => `<li><span>${escapeHtml(time)}</span><strong>${escapeHtml(title)}</strong></li>`).join('')}</ol>
        <p>${escapeHtml(candidate.memo)}</p>
      </section>
    </article>`,
  )
  .join('\n');

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>다양화 원문 Flow 후보 리뷰</title>
  <style>
    body { margin: 0; background: #f6f7f9; color: #172033; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif; }
    a { color: #2563eb; text-decoration: none; display: inline-block; margin: 4px 8px 4px 0; }
    .wrap { max-width: 1120px; margin: 0 auto; padding: 28px 16px 64px; }
    .hero { background: #111827; color: white; border-radius: 8px; padding: 26px; }
    .hero h1 { margin: 0 0 10px; font-size: clamp(28px, 4vw, 42px); letter-spacing: 0; }
    .hero p { margin: 0; color: #d1d5db; line-height: 1.65; }
    .candidate { background: white; border: 1px solid #d8dee8; border-radius: 8px; padding: 16px; margin: 14px 0; }
    .candidate header { display: flex; justify-content: space-between; gap: 18px; border-bottom: 1px solid #e6eaf0; padding-bottom: 12px; }
    .rank, .category, .status { display: inline-flex; padding: 5px 8px; border-radius: 999px; font-size: 12px; margin-right: 4px; background: #eef2ff; color: #3730a3; }
    .category { background: #ecfeff; color: #155e75; }
    .status { background: #dcfce7; color: #166534; }
    h2 { margin: 8px 0 6px; font-size: 23px; letter-spacing: 0; }
    h3 { margin: 0 0 8px; font-size: 15px; }
    p { margin: 0; color: #667085; line-height: 1.55; }
    .total { min-width: 110px; text-align: right; }
    .total span, .total em { display: block; color: #667085; font-style: normal; font-size: 12px; }
    .total strong { display: block; font-size: 34px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 10px; margin-top: 12px; }
    .grid > div, .artifact { background: #fbfcfe; border: 1px solid #e6eaf0; border-radius: 8px; padding: 12px; }
    .scores span { display: inline-flex; gap: 5px; padding: 6px 8px; border-radius: 999px; background: #f8fafc; border: 1px solid #e6eaf0; margin: 3px; font-size: 12px; }
    .artifact { margin-top: 10px; }
    ol { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    li { border: 1px solid #e6eaf0; border-radius: 8px; padding: 10px; background: white; }
    li span { display: block; color: #0f766e; font-size: 12px; margin-bottom: 4px; }
    li strong { font-size: 14px; }
    .artifact p { margin-top: 10px; }
    @media (max-width: 840px) {
      .candidate header, .grid { display: block; }
      .total { text-align: left; margin-top: 12px; }
      .grid > div { margin-top: 10px; }
      ol { grid-template-columns: 1fr; }
      .wrap { padding: 18px 10px 48px; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero">
      <h1>다양화 원문 Flow 후보 리뷰</h1>
      <p>기존 세탁기/정수기/몬스테라/결혼/중고차 후보는 유지하되, 플랫폼 확장성을 보기 위해 전혀 다른 실행 맥락의 원문을 다시 점검했습니다. 아직 일부는 검색 결과 기반이므로 대표 후보 확정 전 직접 원문 재확인이 필요합니다.</p>
    </section>
    ${cards}
  </main>
</body>
</html>`;

fs.writeFileSync(htmlPath, html, 'utf8');
console.log(`Wrote ${path.relative(root, jsonPath)}`);
console.log(`Wrote ${path.relative(root, htmlPath)}`);
