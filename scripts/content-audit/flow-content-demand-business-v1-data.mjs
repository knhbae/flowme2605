export const observedAt = '2026-07-22';

export const urls = {
  funmom: 'https://funmom.tistory.com/',
  opic: 'https://mansour.tistory.com/entry/%EC%98%A4%ED%94%BD-%EB%AA%A8%EC%9D%98%EA%B3%A0%EC%82%AC-%EA%B3%B5%EB%B6%80-%EB%B0%A9%EB%B2%95',
  babyFood: 'https://blog.naver.com/01695258757/222768860919',
  reading: 'https://blog.naver.com/naristyle87/222978131890',
  newCar: 'https://web.getcha.kr/blog/complete-guide-new-car-purchase-procedure-for-beginners',
  vaccination: 'https://khms.or.kr/healthy_life/prevention/vaccination_child',
  moving: 'https://www.ajd.co.kr/contents/basic-tip/detail/%EC%9D%B4%EC%82%AC_%EC%A4%80%EB%B9%84_%EC%B2%B4%ED%81%AC%EB%A6%AC%EC%8A%A4%ED%8A%B8_2024_%EC%99%84%EB%B2%BD%EC%A0%95%EB%A6%AC!-23363',
  movingComparator: 'https://ohou.se/advices/8442',
  wedding: 'https://blog.naver.com/wilklove/223518896995',
  weddingGuide: 'https://gongysd.com/wedding-notion/?bmode=view&idx=167989966',
  allblanc: 'https://youtube.com/@allblanctv',
  allblancPlaylist: 'https://www.youtube.com/playlist?list=PLhWr-n-L9kWj5NFTs11Yb8CpZeKC-edMq',
  storage: 'https://ohou.se/advices/9345',
  lunchbox: 'https://ohou.se/advices/9098',
  remodel: 'https://ohou.se/advices/1972',
  ossu: 'https://github.com/ossu/computer-science',
};

const scoreMax = {
  visibleDemandScore: 20,
  userCommunicationScore: 20,
  copyExecutionIntentScore: 15,
  creatorBusinessValueScore: 20,
  flowConversionFitScore: 20,
  portfolioCoverageScore: 5,
};

function score(points, max, comment) {
  return { score: points, max, comment };
}

function makeScores(values) {
  const result = {};
  for (const [key, max] of Object.entries(scoreMax)) {
    const input = values[key];
    result[key] = score(input[0], max, input[1]);
  }
  result.total = Object.values(result).reduce((sum, entry) => sum + entry.score, 0);
  return result;
}

function candidate(input) {
  const { scoreValues, ...rest } = input;
  return {
    observedAt,
    sourceOpened: true,
    demandEvidence: [],
    communicationEvidence: [],
    copyIntentEvidence: [],
    businessEvidence: [],
    sourceRowStatus: 'verified',
    rightsAndSafety: '출처 링크와 최소 실행 메타데이터만 공개하고 원문 이미지·전문은 복제하지 않는다.',
    hardGates: {
      opened: true,
      visibleDemand: true,
      userCommunication: true,
      sourceRows: true,
      noInventedActionsNeeded: true,
      threeSidedValue: true,
      rightsFreshnessSafety: true,
      fiveSecondPromise: true,
      minimalInput: true,
    },
    ...rest,
    scores: makeScores(scoreValues),
  };
}

const highFitComment = '원문 행이 곧 실행 단위가 되고, 링크·설명은 memo로 보내면 현재 Flow/Step/Item 틀 안에서 과밀 없이 표현된다.';

export const goldBenchmarks = [
  {
    benchmarkId: 'GOLD-01', title: '펀맘 홈스쿨 자료', url: urls.funmom,
    status: 'high_potential_after_import',
    reason: '1,124개 글과 뚜렷한 과목 트리는 강하지만 사이트 전체에는 기간 순서가 없다. 실제 글 URL·대상 나이·학습 목표를 먼저 가져온 뒤 2주 자료 큐로 만들어야 한다.',
    learnedRule: '큰 자료실은 그 자체가 Flow가 아니다. article-level 행을 가져와 목표가 같은 자료만 기간형 큐로 묶는다.',
  },
  {
    benchmarkId: 'GOLD-02', title: '오픽 모의고사 공부 방법', url: urls.opic,
    status: 'gold_reference',
    reason: '2주·1달 PDF/XLSX 계획표, 10회 모의고사 영상, 커뮤니티·상품 경로가 한 사용자 목표로 연결된다.',
    learnedRule: '계획표 셀과 영상 URL을 묶어 한 날짜의 행동 하나로 만들면 사용자가 다시 계획하지 않아도 된다.',
  },
  {
    benchmarkId: 'GOLD-03', title: '초기 이유식 식단표', url: urls.babyFood,
    status: 'gold_reference',
    reason: '댓글 9,999+와 반복적인 파일 요청이 보이고, 비밀번호가 있는 실제 PDF에 D+174~209 식단 행이 있다.',
    learnedRule: '파일 확보 전에는 Hold, 확보 후에는 날짜 행 하나를 제공 행동 하나로 변환한다. 섭취량·상태는 memo다.',
  },
  {
    benchmarkId: 'GOLD-04', title: '독서 기록과 목표', url: urls.reading,
    status: 'boundary_example',
    reason: '댓글 37개와 제작자의 실제 루틴은 있으나, 모든 사용자가 그대로 따를 공통 일정은 아니다.',
    learnedRule: '개인 경험을 보편 루틴으로 발명하지 않는다. 책 제목과 완료일을 사용자가 정하는 빈 루틴 템플릿은 별도 제작자 상품으로 다룬다.',
  },
  {
    benchmarkId: 'GOLD-05', title: '신차 구매 절차', url: urls.newCar,
    status: 'boundary_example',
    reason: '8단계와 세부 행은 매우 좋지만 글 단위 조회·댓글 등 사용자 소통 증거가 약하다. 변환 품질 비교군으로는 우수하다.',
    learnedRule: '구조가 완벽해도 수요·커뮤니케이션 hard gate를 대신하지 못한다.',
  },
  {
    benchmarkId: 'GOLD-06', title: '영유아 예방접종 일정', url: urls.vaccination,
    status: 'boundary_example',
    reason: '공식 일정 신뢰도는 높지만 creator 커뮤니티 콘텐츠가 아니다. 최신 공식 사실을 보강하는 trust anchor 역할이 맞다.',
    learnedRule: '의료 일정은 공식 행만 쓰고, 이상반응 같은 별도 기록 필드를 늘리지 않는다. 필요한 내용은 개인 memo에 둔다.',
  },
  {
    benchmarkId: 'GOLD-07', title: '이사 준비 체크리스트', url: urls.moving,
    status: 'gold_reference',
    reason: '조회 98,401, XLSX·PDF·Notion 배포, 견적 연결, D-30부터 당일까지의 실제 행이 함께 있다.',
    learnedRule: 'D-day 원문은 기준일 하나로 일정화하되 서로 연관된 낮은 수준 체크는 한 Item으로 묶는다.',
  },
  {
    benchmarkId: 'GOLD-08A', title: '결혼 준비 타임라인', url: urls.wedding,
    status: 'gold_reference',
    reason: '댓글 1,102개, Notion 요청, 14개 후속 글, D-12개월~D-1개월 타임라인이 확인된다.',
    learnedRule: '제작자 경험 중 선택 항목은 optional로 표시하고, 계약·예약·결정 행은 그대로 보존한다.',
  },
  {
    benchmarkId: 'GOLD-08B', title: '결혼 준비 A-to-Z 가이드', url: urls.weddingGuide,
    status: 'high_potential_after_import',
    reason: '최신 A-to-Z 보조 원문으로 유용하지만 타임라인 대표 후보와 사용자 목표가 중복된다.',
    learnedRule: '같은 카테고리의 유사 원문은 한 Map의 버전 또는 trust/support source로 합치고 대표 자리를 중복 점유하지 않는다.',
  },
  {
    benchmarkId: 'GOLD-09', title: 'Allblanc 홈트 재생목록', url: urls.allblanc,
    status: 'gold_reference',
    reason: '재생목록이 기간형 Map이고 영상 하나가 자연스러운 루틴 하나다. 7일 복근 챌린지 7개 영상의 합산 조회는 약 53.9만이다.',
    learnedRule: '영상 제목·URL·순서만 실행 객체로 두고 통증·중단 같은 별도 필드를 만들지 않는다. 필요한 기록은 memo다.',
  },
];

export const sourceCandidates = [
  candidate({
    candidateId: 'C-OPIC', title: '오픽 2주·1달 모의고사 계획', lifeArea: 'study_reading', sourceUrl: urls.opic,
    provider: '오픽만수르', sourceType: 'creator_business', verdict: 'representative', selectedBundleId: 'bundle-opic-plan',
    demandEvidence: ['1회 모의고사 영상 조회 11,861·좋아요 56', '제작자 YouTube 구독자 6.09천명'],
    communicationEvidence: ['원문에서 Kakao 오픈채팅·Discord·YouTube·1:1 문의 경로를 함께 운영', '모의고사 영상과 본문·PDF가 서로 연결됨'],
    copyIntentEvidence: ['XLSX, 1달 PDF, 2주 PDF를 직접 배포'],
    businessEvidence: ['SmartStore, 첨삭, 커뮤니티, YouTube로 이어지는 제작자 경로'],
    scoreValues: {
      visibleDemandScore: [15, '영상 조회 11,861, 좋아요 56, 채널 구독자 6.09천명이 보인다. 본문 자체 조회수는 공개되지 않아 5점 감점했다.'],
      userCommunicationScore: [15, '오픈채팅·Discord·YouTube·1:1 문의가 실제 연결되어 있다. 각 채널의 활동량은 공개 화면에서 수치 확인이 어려워 5점 감점했다.'],
      copyExecutionIntentScore: [15, '사용자가 그대로 옮겨 쓰는 XLSX와 2주·1달 PDF를 모두 제공한다.'],
      creatorBusinessValueScore: [19, '첨삭·상품·커뮤니티·영상으로 원문 회귀와 후속 상품 연결이 명확하다.'],
      flowConversionFitScore: [20, highFitComment],
      portfolioCoverageScore: [4, '시험 공부의 기간형 진도 콘텐츠를 대표하지만 OSSU와 학습 영역이 겹쳐 1점 감점했다.'],
    },
  }),
  candidate({
    candidateId: 'C-BABY-FOOD', title: '초기 이유식 D+174~209 식단', lifeArea: 'family_parenting', sourceUrl: urls.babyFood,
    provider: '엄마표 식단 제작자', sourceType: 'creator_community', verdict: 'representative', selectedBundleId: 'bundle-baby-food-174',
    demandEvidence: ['댓글 9,999+ 표시', '초기·중기·후기 관련 글에서도 대규모 파일 요청이 반복됨'],
    communicationEvidence: ['파일과 비밀번호 요청 댓글에 제작자가 반복 응답', '댓글에서 사용 시기와 재료 질문이 이어짐'],
    copyIntentEvidence: ['비밀번호가 있는 PDF 식단표와 큐브 재고표 배포'],
    businessEvidence: ['후속 이유식 시리즈와 제작자 채널 재방문 동기가 강함'],
    scoreValues: {
      visibleDemandScore: [20, '댓글 9,999+와 여러 단계 식단표 글의 반복 수요가 직접 보인다.'],
      userCommunicationScore: [20, '파일·비밀번호 요청과 제작자 답변이 대량으로 확인된다.'],
      copyExecutionIntentScore: [15, 'PDF 식단표를 내려받아 매일 확인하는 행동이 원문 자체에서 검증된다.'],
      creatorBusinessValueScore: [17, '후속 단계 콘텐츠로 재방문할 이유는 강하다. 직접 상품 연결은 확인되지 않아 3점 감점했다.'],
      flowConversionFitScore: [20, highFitComment],
      portfolioCoverageScore: [5, '영아 식사라는 고빈도 가족 실행 영역을 단독으로 채운다.'],
    },
  }),
  candidate({
    candidateId: 'C-MOVING', title: 'D-30 이사 준비', lifeArea: 'home_living', sourceUrl: urls.moving,
    provider: '아정당', sourceType: 'brand_interaction', verdict: 'representative', selectedBundleId: 'bundle-moving-d30',
    demandEvidence: ['원문 조회 98,401·스크랩 20', '비교 원문은 조회 138,823·스크랩 11,446·좋아요 1,959'],
    communicationEvidence: ['비교 원문 댓글 26·공유 4,182', '원문은 견적 상담과 후기 경로를 제공'],
    copyIntentEvidence: ['XLSX·PDF·Notion 체크리스트 동시 제공'],
    businessEvidence: ['이사·청소 견적과 상담으로 직접 연결'],
    scoreValues: {
      visibleDemandScore: [20, '두 원문 모두 9만~13만 조회를 넘고 스크랩 수치도 확인된다.'],
      userCommunicationScore: [17, '비교 원문 댓글 26과 공유 4,182, 원문의 상담 경로가 보인다. 원문 댓글 수의 직접 라벨은 불명확해 3점 감점했다.'],
      copyExecutionIntentScore: [15, 'XLSX·PDF·Notion을 모두 제공해 복사 의도가 매우 강하다.'],
      creatorBusinessValueScore: [20, '체크리스트 사용 직후 이사·청소 견적으로 자연스럽게 연결된다.'],
      flowConversionFitScore: [20, highFitComment],
      portfolioCoverageScore: [5, '고관여 D-day 생활 업무의 대표 콘텐츠다.'],
    },
  }),
  candidate({
    candidateId: 'C-WEDDING', title: '결혼 준비 D-12개월 타임라인', lifeArea: 'travel_outings_events', sourceUrl: urls.wedding,
    provider: 'wilklove', sourceType: 'creator_community', verdict: 'representative', selectedBundleId: 'bundle-wedding-timeline',
    demandEvidence: ['댓글 1,102개', '14개 후속 결혼 준비 글'],
    communicationEvidence: ['Notion 링크 요청과 제작자 응답', '업체·일정·준비 항목 질문이 댓글에 반복됨'],
    copyIntentEvidence: ['Notion 타임라인 요청과 단계별 체크리스트'],
    businessEvidence: ['업체·견적·예약 의사결정이 많아 제휴·제작자 후속 콘텐츠 가치가 큼'],
    scoreValues: {
      visibleDemandScore: [20, '댓글 1,102개와 14개 후속 글이 직접 확인된다.'],
      userCommunicationScore: [20, 'Notion 요청, 일정·업체 질문, 제작자 응답이 명확하다.'],
      copyExecutionIntentScore: [15, '사용자가 타임라인을 복사해 자신의 결혼일에 적용하려는 의도가 직접 드러난다.'],
      creatorBusinessValueScore: [19, '고관여 업체·예약 영역이라 후속 콘텐츠와 제휴 가치가 높다. 직접 판매 수치는 없어 1점 감점했다.'],
      flowConversionFitScore: [20, highFitComment],
      portfolioCoverageScore: [5, '장기 행사 준비와 compare/decide 패턴을 함께 채운다.'],
    },
  }),
  candidate({
    candidateId: 'C-ALLBLANC', title: 'Allblanc 7일 복근 챌린지', lifeArea: 'health_fitness', sourceUrl: urls.allblancPlaylist,
    provider: 'Allblanc TV', sourceType: 'creator_business', verdict: 'representative', selectedBundleId: 'bundle-allblanc-7day-abs',
    demandEvidence: ['7개 영상 합산 조회 약 539,000', '첫 영상 조회 150,000'],
    communicationEvidence: ['첫 영상 댓글 154개', '재생목록과 채널에 후속 루틴이 계속 축적됨'],
    copyIntentEvidence: ['7 Days Abs Challenge라는 명시적 기간·순서 구조'],
    businessEvidence: ['채널 구독·후속 영상·브랜드 노출로 돌아가는 제작자 유입 경로'],
    scoreValues: {
      visibleDemandScore: [20, '7개 합산 약 53.9만 조회, 개별 최고 15만 조회가 보인다.'],
      userCommunicationScore: [18, '첫 영상 댓글 154개와 후속 재생목록이 있다. 전체 7개 댓글 합산은 확인하지 않아 2점 감점했다.'],
      copyExecutionIntentScore: [15, '7일 챌린지와 Day 순서가 사용자의 반복 실행 의도를 직접 만든다.'],
      creatorBusinessValueScore: [18, 'Flow에서 영상 재생과 채널 재방문이 계속 발생한다. 별도 상품 연결은 확인하지 않아 2점 감점했다.'],
      flowConversionFitScore: [20, '영상 1개=Flow 1개, 재생목록=Map으로 변환하면 추가 행동을 만들 필요가 없다.'],
      portfolioCoverageScore: [5, '짧은 영상 루틴과 creator 반복 소비 영역을 채운다.'],
    },
  }),
  candidate({
    candidateId: 'C-STORAGE', title: '신박한 수납 팁 5', lifeArea: 'home_living', sourceUrl: urls.storage,
    provider: '1분생활꿀팁·오늘의집', sourceType: 'creator_community', verdict: 'representative', selectedBundleId: 'bundle-storage-five',
    demandEvidence: ['조회 684,233·좋아요 12,986·스크랩 53,119'],
    communicationEvidence: ['댓글 398', '스크랩 기반 후속 사용과 플랫폼 공유가 직접 보임'],
    copyIntentEvidence: ['서로 독립적인 5개 미니 프로젝트와 단계 사진'],
    businessEvidence: ['제작자 팔로우와 오늘의집 쇼핑·콘텐츠 생태계로 회귀'],
    scoreValues: {
      visibleDemandScore: [20, '조회·좋아요·스크랩 세 수치가 모두 매우 높다.'],
      userCommunicationScore: [20, '댓글 398과 스크랩 53,119가 사용·저장 반응을 함께 보여준다.'],
      copyExecutionIntentScore: [15, '각 팁이 준비물과 순서를 가진 독립 미니 프로젝트다.'],
      creatorBusinessValueScore: [18, '제작자 팔로우와 플랫폼 쇼핑 경로가 있다. 개별 상품 귀속은 약해 2점 감점했다.'],
      flowConversionFitScore: [20, '5개를 하나의 긴 체크리스트가 아니라 독립 Quick Flow Map으로 만들 수 있다.'],
      portfolioCoverageScore: [4, '집·살림 영역을 강화하지만 이사와 같은 생활 영역이어서 1점 감점했다.'],
    },
  }),
  candidate({
    candidateId: 'C-LUNCHBOX', title: '평일 5일 도시락 식단', lifeArea: 'meals_grocery', sourceUrl: urls.lunchbox,
    provider: '_밖·오늘의집', sourceType: 'creator_community', verdict: 'representative', selectedBundleId: 'bundle-weekday-lunchbox',
    demandEvidence: ['조회 10,943·좋아요 226·스크랩 451'],
    communicationEvidence: ['댓글 27', '제작자 팔로우와 댓글 입력 경로'],
    copyIntentEvidence: ['월~금 식단표와 일부 상세 레시피'],
    businessEvidence: ['재료·도구·후속 식단 콘텐츠로 연결 가능한 플랫폼 경로'],
    scoreValues: {
      visibleDemandScore: [15, '조회 10,943와 스크랩 451이 보이지만 대표군 내 절대 규모는 중간이다.'],
      userCommunicationScore: [16, '댓글 27이 확인된다. 제작자 답변 비율은 확인하지 못해 4점 감점했다.'],
      copyExecutionIntentScore: [15, '요일별 식단표를 그대로 옮겨 쓰는 목적이 명확하다.'],
      creatorBusinessValueScore: [15, '팔로우·쇼핑 연결은 있으나 글 자체의 직접 상품 연결은 약하다.'],
      flowConversionFitScore: [20, '요일 행 하나를 식사 Item 하나로 두고 레시피를 memo로 보내면 자연스럽다.'],
      portfolioCoverageScore: [5, '식사·장보기 영역의 평일 반복 콘텐츠를 새로 채운다.'],
    },
  }),
  candidate({
    candidateId: 'C-REMODEL', title: '리모델링 계약서 체크 10', lifeArea: 'money_admin_purchase', sourceUrl: urls.remodel,
    provider: '오늘의리모델링·오늘의집', sourceType: 'brand_interaction', verdict: 'representative', selectedBundleId: 'bundle-remodel-contract',
    demandEvidence: ['조회 253,495·좋아요 2,427·스크랩 8,029·공유 13,704'],
    communicationEvidence: ['댓글 124', '표준계약서 양식과 상담 경로'],
    copyIntentEvidence: ['계약 전 확인할 10개 번호 행과 표준계약서 링크'],
    businessEvidence: ['리모델링 상담·업체·시공 서비스로 직접 연결'],
    scoreValues: {
      visibleDemandScore: [20, '조회 25만, 스크랩 8천, 공유 1.37만이 직접 확인된다.'],
      userCommunicationScore: [19, '댓글 124와 양식·상담 경로가 있다. 제작자 답변률은 확인하지 않아 1점 감점했다.'],
      copyExecutionIntentScore: [15, '계약서에 옮겨 확인할 10개 행과 양식 링크가 있다.'],
      creatorBusinessValueScore: [20, '체크 직후 리모델링 상담과 업체 연결로 이어진다.'],
      flowConversionFitScore: [20, '원문 번호 10개를 그대로 체크 Item으로 두면 된다.'],
      portfolioCoverageScore: [5, '고액 계약·비교·결정 영역을 대표한다.'],
    },
  }),
  candidate({
    candidateId: 'C-OSSU', title: 'OSSU Computer Science 시작 구간', lifeArea: 'study_reading', sourceUrl: urls.ossu,
    provider: 'OSSU community', sourceType: 'open_community', verdict: 'representative', selectedBundleId: 'bundle-ossu-start',
    demandEvidence: ['GitHub star 207k·fork 25.7k'],
    communicationEvidence: ['열린 issue 16·PR 7·Discord 커뮤니티', '1,109 commits로 업데이트 흔적 확인'],
    copyIntentEvidence: ['과정명·기간·주당 시간·선수조건이 있는 커리큘럼 표'],
    businessEvidence: ['오픈 커뮤니티 fork·issue·contribution으로 개선과 공유가 순환'],
    scoreValues: {
      visibleDemandScore: [20, '207k stars와 25.7k forks가 강한 재사용 수요를 보여준다.'],
      userCommunicationScore: [20, 'issue·PR·Discord·1,109 commits가 실제 커뮤니티 수정 루프를 보여준다.'],
      copyExecutionIntentScore: [15, '과정 표를 자신의 진도표로 옮겨 쓰는 목적이 명확하다.'],
      creatorBusinessValueScore: [20, 'fork·issue·Discord로 원문 개선과 유입이 지속된다.'],
      flowConversionFitScore: [20, '과정 행과 선수조건을 그대로 Step으로 보존할 수 있다.'],
      portfolioCoverageScore: [4, '장기 학습 진도 패턴을 채우지만 OPIC과 학습 영역이 겹쳐 1점 감점했다.'],
    },
  }),
];

const supportCandidates = [
  ['C-FUNMOM', '펀맘 자료실', 'family_parenting', urls.funmom, 'creator_archive', 'promising_after_fix', 74,
    ['최근 글 댓글 수와 1,124개 글', '과목별 프린트 자료 요청·활용 댓글'], 'article 행을 가져오기 전에는 사이트 전체를 Flow로 만들 수 없음'],
  ['C-READING', '독서 시스템 만들기', 'study_reading', urls.reading, 'creator_experience', 'backup', 68,
    ['댓글 37', '개인 루틴과 목표에 대한 독자 반응'], '제작자의 개인 목표를 공통 일정으로 일반화할 수 없음'],
  ['C-NEW-CAR', '신차 구매 8단계', 'money_admin_purchase', urls.newCar, 'brand_editorial', 'promising_after_fix', 78,
    ['2026-01-01 업데이트', '견적 요청 CTA'], '원문 행은 좋지만 글 단위 조회·댓글 수가 보이지 않음'],
  ['C-VACCINATION', '영유아 예방접종 일정', 'health_fitness', urls.vaccination, 'official_trust', 'trust_anchor', 72,
    ['공식 일정표', '의료기관 확인 경로'], 'creator 수요·소통이 아니라 최신 사실 보강용'],
  ['C-WEDDING-GUIDE', '2026 결혼 준비 A-to-Z', 'travel_outings_events', urls.weddingGuide, 'brand_editorial', 'backup', 71,
    ['최신 A-to-Z 글', '업체 탐색·준비 질문을 받는 구조'], '대표 타임라인과 사용자 목표가 중복됨'],
  ['C-OHOUSE-MOVING', '오늘의집 이사 체크리스트', 'home_living', urls.movingComparator, 'brand_interaction', 'backup', 83,
    ['조회 138,823·좋아요 1,959·스크랩 11,446', '댓글 26·공유 4,182'], 'AJD 대표 Flow의 수요·소통 비교 근거로 사용'],
  ['C-OHOUSE-ALONE', '자취 필수품 리스트', 'home_living', 'https://ohou.se/advices/4494', 'creator_community', 'promising_after_fix', 82,
    ['조회 326,721·좋아요 2,565·스크랩 8,834', '댓글 66'], '항목 수가 많아 입주 전·주방·욕실 등 source group import 필요'],
  ['C-OHOUSE-CLEAN', '나의 청소 성향 파악', 'home_living', 'https://ohou.se/advices/5951', 'creator_community', 'backup', 76,
    ['조회 24,756·좋아요 152·스크랩 772', '댓글 12'], '진단 설명은 많지만 실행 행이 상대적으로 약함'],
  ['C-OHOUSE-DEFECT', '리모델링 공정별 하자 점검', 'home_living', 'https://ohou.se/advices/2327', 'brand_interaction', 'promising_after_fix', 91,
    ['조회 111,575·좋아요 1,019·스크랩 4,249', '댓글 30·다운로드 양식'], '사진·보수·재점검 상태는 현재 앱의 단순 Item보다 Sheet에 더 적합'],
  ['C-OHOUSE-CLOSET', '옷장 정리 1일', 'home_living', 'https://ohou.se/advices/7406', 'creator_community', 'promising_after_fix', 87,
    ['조회 29,854·좋아요 152·스크랩 746', '댓글 28'], '보관·보류·처분 선택 상태가 필요해 현재 앱 표현을 확인해야 함'],
  ['C-OHOUSE-WEEK-MEAL', '평일 5일 집밥 식단', 'meals_grocery', 'https://ohou.se/advices/8220', 'creator_community', 'backup', 83,
    ['조회 9,412·좋아요 118·스크랩 607', '댓글 13'], '대표 도시락 식단과 패턴이 중복됨'],
  ['C-WEB1', '생활코딩 WEB1 26개 토픽', 'study_reading', 'https://opentutorials.org/course/3084', 'open_creator_community', 'promising_after_fix', 94,
    ['공동공부 9,199명', '최근까지 start/restart 댓글과 질문·답변'], '좋은 후보지만 이번 대표군에서 학습 카테고리 2개 제한'],
  ['C-KOCW', 'KOCW 빅데이터 분석 차시', 'study_reading', 'https://kocw.net/home/search/kemView.do?kemId=1422415', 'public_education', 'backup', 82,
    ['조회 30,854', '강의 후기·수강신청·차시 링크'], '차시 행은 좋지만 creator 비즈니스와 공유 루프가 약함'],
  ['C-RECIPE', '야채 참치 볶음 레시피', 'meals_grocery', 'https://www.10000recipe.com/recipe/6865737', 'creator_community', 'backup', 81,
    ['후기 63', '댓글·조리 후기 4 이상'], '한 번의 조리는 Quick Flow지만 대표 포트폴리오 확장 폭이 작음'],
  ['C-COMPUTER-PDF', '컴활 2급 실기 자료', 'study_reading', 'https://useful13.tistory.com/entry/%EC%BB%B4%ED%99%9C-2%EA%B8%89-%EC%8B%A4%EA%B8%B0-%ED%95%A9%EA%B2%A9-%EC%B4%9D-%EC%A0%95%EB%A6%AC-%EB%B0%8F-%EA%BF%80%ED%8C%81-PDF-%EB%AC%B4%EB%A3%8C-%EC%9E%90%EB%A3%8C-%EC%A0%9C%EA%B3%B5', 'creator_community', 'source_import_required', 75,
    ['방문 7,734 표시', '요약 자료 요청 댓글'], 'PDF의 실제 행을 확보·권리 검토하기 전에는 Flow 제작 불가'],
  ['C-CAMPING-XLSX', '캠핑 준비 리스트 엑셀', 'travel_outings_events', 'https://bubbletomato.tistory.com/63', 'creator_community', 'source_import_required', 73,
    ['댓글 4', '파일 다운로드와 사용 후기'], '엑셀 행을 가져오기 전에는 목록을 발명할 수 없음'],
  ['C-BABYBILLY-BIRTH', '출산·육아 준비물 PDF', 'family_parenting', 'https://babybilly.co/ko/post/1927', 'brand_community', 'source_import_required', 79,
    ['매달 10만 커뮤니티 문구', '댓글·북마크·PDF 다운로드 경로'], 'PDF 행과 최신성·상업 이용 범위를 확인해야 함'],
];

for (const [id, title, lifeArea, sourceUrl, sourceType, verdict, total, evidence, issue] of supportCandidates) {
  const visible = Math.min(20, Math.max(10, Math.round(total * 0.2)));
  const communication = Math.min(20, Math.max(8, Math.round(total * 0.2)));
  const copy = Math.min(15, Math.max(8, Math.round(total * 0.15)));
  const business = Math.min(20, Math.max(8, Math.round(total * 0.19)));
  const fit = Math.min(20, Math.max(8, total - visible - communication - copy - business - 4));
  sourceCandidates.push(candidate({
    candidateId: id, title, lifeArea, sourceUrl, provider: sourceType, sourceType, verdict,
    demandEvidence: [evidence[0]], communicationEvidence: [evidence[1]],
    copyIntentEvidence: [issue], businessEvidence: [issue],
    sourceRowStatus: verdict === 'source_import_required' ? 'not_imported' : 'verified_or_bounded',
    hardGates: {
      opened: true,
      visibleDemand: !['C-NEW-CAR', 'C-VACCINATION'].includes(id),
      userCommunication: !['C-NEW-CAR', 'C-VACCINATION'].includes(id),
      sourceRows: verdict !== 'source_import_required',
      noInventedActionsNeeded: verdict !== 'source_import_required',
      threeSidedValue: !['C-VACCINATION'].includes(id),
      rightsFreshnessSafety: true,
      fiveSecondPromise: !['C-FUNMOM', 'C-READING'].includes(id),
      minimalInput: true,
    },
    scoreValues: {
      visibleDemandScore: [visible, `${evidence[0]}. 다만 대표 후보 대비 근거 범위가 좁아 감점했다.`],
      userCommunicationScore: [communication, `${evidence[1]}. 제작자 답변률 또는 활동량을 모두 확인하지 못해 감점했다.`],
      copyExecutionIntentScore: [copy, `${issue}. 원문에서 바로 옮길 수 있는 범위만 점수에 반영했다.`],
      creatorBusinessValueScore: [business, `${issue}. 확인되지 않은 판매·제휴 가능성은 점수에 넣지 않았다.`],
      flowConversionFitScore: [fit, `${issue}. 원문 행을 확보한 범위까지만 변환 가능성으로 평가했다.`],
      portfolioCoverageScore: [4, `${lifeArea} 영역을 보강하지만 이번 대표군의 중복 제한도 함께 반영했다.`],
    },
  }));
}

export const scoreModel = {
  weights: scoreMax,
  thresholds: {
    representative_candidate: '80점 이상 + 모든 hard gate 통과',
    promising_after_fix: '70~79점 또는 한 가지 보완 가능한 hard gate 실패',
    backup: '60~69점 또는 포트폴리오 중복',
    hold_reject: '60점 미만 또는 source/rights/safety gate 실패',
  },
  rule: '숫자는 순위를 돕지만 hard gate를 대신하지 않는다. 각 점수의 코멘트와 원문 증거를 함께 검토한다.',
};

function sourceRow(bundleId, rowId, sourceUrl, locator, label, detail, extra = {}) {
  return {
    sourceRowId: `${bundleId}-${rowId}`,
    bundleId,
    sourceUrl,
    sourceLocator: locator,
    label,
    detail,
    verifiedAt: observedAt,
    ...extra,
  };
}

function item(itemId, itemTitle, memo, sourceRowIds, extra = {}) {
  return {
    itemId,
    itemTitle,
    memo,
    completionMode: 'manual_check',
    sourceRowIds,
    sourceTrace: sourceRowIds.map((sourceRowId) => ({ sourceRowId })),
    ...extra,
  };
}

function step(stepId, title, items, extra = {}) {
  return { stepId, title, items, ...extra };
}

function flow(flowId, title, steps, extra = {}) {
  return { flowId, title, steps, ...extra };
}

function bundle(input) {
  return {
    status: 'representative',
    decision: 'Go',
    userVisible: true,
    setupFields: [],
    rightsMode: 'link_and_minimal_execution_metadata',
    ...input,
  };
}

function opicBundle() {
  const bundleId = 'bundle-opic-plan';
  const sourceRows = [];
  const videos = [
    ['1', 'https://www.youtube.com/watch?v=MZmrXlAc6k4', '15문항 모의고사'],
    ['2', 'https://www.youtube.com/watch?v=YOZADzoC22s', '은행·바·카페·MP3·걷기'],
    ['3', 'https://www.youtube.com/watch?v=bRjvaQ380MU', '15문항 모의고사'],
    ['4', 'https://www.youtube.com/watch?v=N2s5golewUI', '15문항 모의고사'],
    ['5', 'https://www.youtube.com/watch?v=uCUiUlggGlE', '15문항 모의고사'],
    ['6', 'https://www.youtube.com/watch?v=KddRF_nM9uI', '동네·건강·국내여행·은행·가족'],
    ['7', 'https://www.youtube.com/watch?v=cAOaiJsT7ac', '집에서 보내는 휴가·지리·공휴일·집·음악'],
    ['8', 'https://www.youtube.com/watch?v=VFWF-HUYggI', '기술·캠핑·패션·쇼핑·건강'],
    ['9', 'https://www.youtube.com/watch?v=y0Y1j7fEZj4', '외식·영화·날씨·계절·콘서트·바'],
    ['10', 'https://www.youtube.com/watch?v=xh_zHNfAgQo', '해외여행·모임·공연·가족·친구·산업'],
  ].map(([round, videoUrl, topics]) => ({ round: Number(round), videoUrl, topics }));

  for (const video of videos) {
    sourceRows.push(sourceRow(bundleId, `video-${video.round}`, video.videoUrl, `오픽 모의고사 ${video.round}회 영상`, `${video.round}회 모의고사 영상`, video.topics));
  }

  function activeMemo(video, mode) {
    const common = `영상: ${video.videoUrl} · 범위: ${video.topics}`;
    if (mode === 'practice') {
      return `${common} · 실제 시험처럼 답변을 녹음하고, 막힌 질문과 고칠 표현을 같은 메모에 적는다.`;
    }
    return `${common} · 이전 녹음을 다시 듣고 답변을 보완한 뒤, 다음 회차에 다시 쓸 핵심 표현을 같은 메모에 남긴다.`;
  }

  const twoWeekSteps = [];
  for (let week = 1; week <= 2; week += 1) {
    const startRound = (week - 1) * 5 + 1;
    const days = ['월', '화', '수', '목', '금'];
    const items = days.map((day, index) => {
      const video = videos[startRound + index - 1];
      const row = sourceRow(
        bundleId,
        `2w-w${week}-${day}`,
        urls.opic,
        `2주 계획표 ${week}주차 ${day}요일`,
        `${video.round}회 모의고사 실전·녹음·보완·복습`,
        activeMemo(video, 'practice'),
      );
      sourceRows.push(row);
      return item(
        `${bundleId}-2w-w${week}-${day}`,
        `${video.round}회 모의고사 실전처럼 풀기`,
        activeMemo(video, 'practice'),
        [row.sourceRowId, `${bundleId}-video-${video.round}`],
        { schedule: { type: 'relative_weekday', week, weekday: day }, sourceActionCount: 4 },
      );
    });
    const endRound = startRound + 4;
    const summaryRow = sourceRow(
      bundleId,
      `2w-w${week}-토`,
      urls.opic,
      `2주 계획표 ${week}주차 토요일`,
      `${startRound}~${endRound}회 총복습`,
      '주중 녹음을 다시 듣고 반복해서 막힌 질문과 보완 표현을 정리한다.',
    );
    sourceRows.push(summaryRow);
    items.push(item(
      `${bundleId}-2w-w${week}-토`,
      `${startRound}~${endRound}회 답변 총복습`,
      '이번 주 녹음을 다시 듣고 반복해서 막힌 질문과 다음 주에 쓸 핵심 표현을 한 메모로 정리한다.',
      [summaryRow.sourceRowId, ...videos.slice(startRound - 1, endRound).map((video) => `${bundleId}-video-${video.round}`)],
      { schedule: { type: 'relative_weekday', week, weekday: '토' } },
    ));
    twoWeekSteps.push(step(`${bundleId}-2w-week-${week}`, `${week}주차 · ${startRound}~${endRound}회`, items, {
      schedule: { type: 'relative_week', week },
      sourceNote: '일요일은 원문에서 휴식일이며 실행 Item을 만들지 않았다.',
    }));
  }

  const oneMonthSteps = [];
  const weeklyPattern = [
    ['월', 'practice', 0],
    ['화', 'review', 0],
    ['수', 'review', 0],
    ['목', 'practice', 1],
    ['금', 'review', 1],
    ['토', 'review', 1],
  ];
  for (let week = 1; week <= 5; week += 1) {
    const firstRound = (week - 1) * 2 + 1;
    const secondRound = firstRound + 1;
    const items = weeklyPattern.map(([day, mode, offset]) => {
      const video = videos[firstRound + offset - 1];
      const actionLabel = mode === 'practice' ? '실전처럼 풀기' : '녹음 듣고 보완하기';
      const row = sourceRow(
        bundleId,
        `1m-w${week}-${day}`,
        urls.opic,
        `1달 계획표 ${week}주차 ${day}요일`,
        `${video.round}회 ${actionLabel}`,
        activeMemo(video, mode),
      );
      sourceRows.push(row);
      return item(
        `${bundleId}-1m-w${week}-${day}`,
        `${video.round}회 ${actionLabel}`,
        activeMemo(video, mode),
        [row.sourceRowId, `${bundleId}-video-${video.round}`],
        { schedule: { type: 'relative_weekday', week, weekday: day } },
      );
    });
    oneMonthSteps.push(step(`${bundleId}-1m-week-${week}`, `${week}주차 · ${firstRound}~${secondRound}회`, items, {
      schedule: { type: 'relative_week', week },
      sourceNote: '일요일은 원문에서 휴식일이며 실행 Item을 만들지 않았다.',
    }));
  }

  return bundle({
    bundleId,
    title: '오픽 모의고사 계획표',
    category: '공부·학습',
    sourceType: 'creator_business',
    sourceUrls: [urls.opic, ...videos.map((video) => video.videoUrl)],
    userPromise: '2주 또는 1달 계획을 고르면 모의고사 회차와 영상이 날짜 순서대로 생긴다.',
    firstAction: '선택한 계획의 첫 회차 영상을 열어 실제 시험처럼 답변한다.',
    setupFields: [{ key: 'planVariant', label: '계획', type: 'choice', options: ['2주', '1달'], required: true }, { key: 'startDate', label: '시작일', type: 'date', required: false }],
    defaultArtifact: 'calendar_checklist',
    uxFit: {
      cardPromise: '2주 12개 또는 1달 30개 학습 행동과 10개 영상',
      inputCount: '필수 1개(계획 선택), 일정화할 때 시작일 1개',
      firstScreen: '첫 회차와 영상 링크를 먼저 표시',
      mobileRule: '주차를 접어 두고 현재 주차만 펼친다.',
      verdict: '현재 Flow/Step/Item 구조에 적합',
    },
    screenshots: ['gold-opic-top.png', 'gold-opic-plan.png', 'gold-opic-download.png'],
    businessValue: {
      user: '계획표와 영상 링크를 다시 맞추는 시간을 없앤다.',
      creator: '각 회차에서 원문·영상·첨삭·커뮤니티로 사용자를 돌려보낸다.',
      flowMe: '기간형 학습 저장, 체크, 캘린더 내보내기, 다음 회차 재방문이 생긴다.',
    },
    map: {
      mapId: `${bundleId}-map`, title: '오픽 모의고사 학습 플랜',
      flows: [
        flow(`${bundleId}-2week`, '오픽 모의고사 2주 플랜', twoWeekSteps, { expectedItemCount: 12 }),
        flow(`${bundleId}-1month`, '오픽 모의고사 1달 플랜', oneMonthSteps, { expectedItemCount: 30 }),
      ],
    },
    sourceRows,
  });
}

function babyFoodBundle() {
  const bundleId = 'bundle-baby-food-174';
  const sourceRows = [];
  const groups = [
    { start: 174, end: 176, meal: '쌀미음' },
    { start: 177, end: 179, meal: '쌀·오트밀 미음' },
    { start: 180, end: 182, meal: '쌀·오트밀 미음 + 소고기' },
    { start: 183, end: 185, meal: '쌀·오트밀 미음 + 소고기 + 애호박' },
    { start: 186, end: 188, meal: '쌀·오트밀 미음 + 소고기 + 애호박 + 청경채' },
    { start: 189, end: 191, meal: '쌀·오트밀 미음 + 소고기 + 청경채 + 오이' },
    { start: 192, end: 194, meal: '쌀·오트밀 미음 + 소고기 + 애호박 + 브로콜리' },
    { start: 195, end: 197, meal: '쌀·오트밀 미음 + 소고기 + 브로콜리 + 양배추' },
    { start: 198, end: 200, meal: '쌀·오트밀 미음 + 소고기 + 브로콜리 + 청경채 + 당근' },
    { start: 201, end: 203, meal: '쌀·오트밀 미음 + 소고기 + 양배추 + 브로콜리 + 단호박', snack: { 203: '사과' } },
    {
      start: 204, end: 206,
      breakfast: '쌀·오트밀 + 소고기 + 양배추 + 단호박 + 완두콩',
      lunch: '쌀·오트밀 + 당근 + 사과 + 브로콜리 + 청경채',
      snack: { 206: '바나나' },
    },
    {
      start: 207, end: 209,
      breakfast: '쌀·오트밀 + 달걀 + 당근 + 완두콩 + 브로콜리',
      lunch: '쌀·오트밀 + 소고기 + 단호박 + 양배추 + 청경채',
      snack: { 209: '바나나' },
    },
  ];

  const steps = groups.map((group) => {
    const items = [];
    for (let day = group.start; day <= group.end; day += 1) {
      const meals = group.meal
        ? `한 끼: ${group.meal}`
        : `아침: ${group.breakfast} · 점심: ${group.lunch}`;
      const snack = group.snack?.[day] ? ` · 간식: ${group.snack[day]}` : '';
      const detail = `${meals}${snack}`;
      const row = sourceRow(bundleId, `d${day}`, urls.babyFood, `첨부 PDF D+${day} 행`, `D+${day} 식단`, detail, {
        sourceAsset: day <= 193 ? 'gold-baby-food-plan-page1.png' : 'gold-baby-food-plan-page2.png',
      });
      sourceRows.push(row);
      items.push(item(
        `${bundleId}-d${day}`,
        `D+${day} 식단 제공`,
        `${detail} · 먹은 양이나 반응을 남기려면 이 Item의 개인 메모를 사용한다.`,
        [row.sourceRowId],
        { schedule: { type: 'source_day_index', dayIndex: day }, dataBoundary: '섭취량·상태·반응은 별도 필드가 아니라 개인 memo' },
      ));
    }
    return step(`${bundleId}-d${group.start}-${group.end}`, `D+${group.start}~${group.end}`, items, {
      schedule: { type: 'source_day_range', start: group.start, end: group.end },
    });
  });

  return bundle({
    bundleId,
    title: '초기 이유식 D+174~209 식단',
    category: '가족·육아',
    sourceType: 'creator_community',
    sourceUrls: [urls.babyFood],
    userPromise: 'PDF의 D+174~209 식단 36개가 순서대로 생기고, 매일 제공한 식단만 체크한다.',
    firstAction: '현재 D+n에 해당하는 식단을 확인하고 제공한다.',
    setupFields: [{ key: 'sourceDay', label: '현재 D+n', type: 'number', required: false }, { key: 'startDate', label: 'D+174 시작일', type: 'date', required: false }],
    defaultArtifact: 'calendar_checklist',
    uxFit: {
      cardPromise: '36일 식단·하루 한 개 체크',
      inputCount: '날짜 없이 저장 0개, 오늘부터 일정화할 때 현재 D+n 또는 시작일 1개',
      firstScreen: '현재 날짜의 식단 한 장만 표시',
      mobileRule: '3일 묶음을 접고 현재 묶음만 자동으로 펼친다.',
      verdict: '현재 구조에 적합. 36개 전체를 한 화면에 펼치면 과밀하므로 진행 위치 중심 UI가 필요',
    },
    screenshots: ['gold-baby-food-comments.png', 'gold-baby-food-plan-page1.png', 'gold-baby-food-plan-page2.png'],
    businessValue: {
      user: '암호 PDF를 매번 열고 오늘 행을 찾는 수고를 줄인다.',
      creator: '초기·중기·후기 원문과 후속 자료로 다시 연결된다.',
      flowMe: '매일 체크와 메모, 다음 식단 재방문이 자연스럽게 생긴다.',
    },
    map: {
      mapId: `${bundleId}-map`, title: '초기 이유식 시작 식단',
      flows: [flow(`${bundleId}-flow`, 'D+174부터 36일 식단', steps, { expectedItemCount: 36 })],
    },
    sourceRows,
  });
}

function groupedProcedureBundle({ bundleId, title, category, sourceUrl, sourceType, stepDefs, ...rest }) {
  const sourceRows = [];
  const steps = stepDefs.map((stepDef, stepIndex) => {
    const items = stepDef.items.map((itemDef, itemIndex) => {
      const rowIds = itemDef.parts.map((part, partIndex) => {
        const row = sourceRow(
          bundleId,
          `s${stepIndex + 1}-i${itemIndex + 1}-r${partIndex + 1}`,
          itemDef.sourceUrl || sourceUrl,
          `${stepDef.locator || stepDef.title} · ${part}`,
          part,
          itemDef.detail || part,
        );
        sourceRows.push(row);
        return row.sourceRowId;
      });
      return item(
        `${bundleId}-s${stepIndex + 1}-i${itemIndex + 1}`,
        itemDef.title,
        itemDef.memo || itemDef.parts.join(' · '),
        rowIds,
        { optional: Boolean(itemDef.optional), schedule: stepDef.schedule || null },
      );
    });
    return step(`${bundleId}-s${stepIndex + 1}`, stepDef.title, items, {
      schedule: stepDef.schedule || null,
      sourceLocator: stepDef.locator || stepDef.title,
    });
  });

  return bundle({
    bundleId, title, category, sourceType, sourceUrls: [sourceUrl],
    ...rest,
    map: {
      mapId: `${bundleId}-map`, title,
      flows: [flow(`${bundleId}-flow`, title, steps, { expectedItemCount: steps.reduce((sum, entry) => sum + entry.items.length, 0) })],
    },
    sourceRows,
  });
}

function movingBundle() {
  return groupedProcedureBundle({
    bundleId: 'bundle-moving-d30',
    title: '이사 D-30 체크리스트',
    category: '집·살림',
    sourceUrl: urls.moving,
    sourceType: 'brand_interaction',
    userPromise: '이사일 하나를 넣으면 D-30부터 도착지 정리까지 해야 할 일이 생긴다.',
    firstAction: '이사 방식과 업체를 결정하고 새집 점검 일정을 잡는다.',
    setupFields: [{ key: 'moveDate', label: '이사일', type: 'date', required: false }],
    defaultArtifact: 'calendar_checklist',
    uxFit: {
      cardPromise: 'D-30·D-10·D-3·D-1·당일 27개 묶음 행동',
      inputCount: '날짜 없이 저장 0개, 일정화할 때 이사일 1개',
      firstScreen: '가장 가까운 D-day 구간의 첫 행동을 표시',
      mobileRule: '지난 구간은 접고 현재·다음 구간만 펼친다.',
      verdict: '현재 상대 날짜·Item 모델에 적합',
    },
    screenshots: ['gold-moving-top.png', 'support-ohouse-moving-snapshot-metrics.png', 'gold-moving-table.png'],
    businessValue: {
      user: '여러 파일에서 이사 시기별 항목을 다시 옮겨 적는 시간을 줄인다.',
      creator: '이사·청소 견적과 원문 다운로드로 사용자를 되돌린다.',
      flowMe: '기준일 일정화, 완료 체크, 가족 공유, 캘린더 export가 발생한다.',
    },
    stepDefs: [
      {
        title: 'D-30 · 큰 결정과 예약', locator: '원문 D-30 행', schedule: { type: 'relative_to_target', offsetDays: -30 },
        items: [
          { title: '이사 방식과 이사업체 정하기', parts: ['포장이사·반포장이사·일반이사 중 방식 선택', '이사업체 견적 비교와 예약', '입주청소 업체 견적 비교와 예약'], memo: '선택한 방식, 업체명, 견적 링크와 예약 내용을 같은 메모에 적는다.' },
          { title: '새집 상태 확인하고 필요한 수리 잡기', parts: ['새집 현장 점검', '도배·장판·수리 필요 항목 확인과 일정 잡기'] },
          { title: '가져가지 않을 물건 처분 시작하기', parts: ['대형폐기물·중고판매·기부 등 처분 대상 정리'] },
          { title: '학교 전학과 돌봄 계획 세우기', parts: ['자녀 학교 전학 절차 확인', '이사 당일 아이·어르신·반려동물 돌봄 계획'] },
        ],
      },
      {
        title: 'D-10 · 주소·서비스·짐 줄이기', locator: '원문 D-10 행', schedule: { type: 'relative_to_target', offsetDays: -10 },
        items: [
          { title: '우편·배송·전출 주소 변경하기', parts: ['우편물 주소 이전 신청', '정기배송 주소 변경 또는 중지', '관리사무소에 퇴거 일정 알리기'] },
          { title: '엘리베이터·사다리차·주차 예약하기', parts: ['출발지와 도착지 엘리베이터 예약', '사다리차 사용 여부와 주차 공간 확인'] },
          { title: '폐기물과 남은 짐 처리하기', parts: ['종량제 봉투와 폐기물 스티커 준비', '대형폐기물 수거 신청', '열쇠·리모컨·설명서 한곳에 모으기'] },
          { title: '냉장고 비우고 새집 물품 배치 정하기', parts: ['냉장고 식재료 소진 시작', '새집에 필요한 물품 주문', '가구·가전 배치도 정리'] },
          { title: '인터넷·정수기 등 이전 신청하기', parts: ['인터넷·TV 이전 설치 신청', '정수기 등 렌탈 기기 이전 신청'] },
        ],
      },
      {
        title: 'D-3 · 해지와 당일 준비', locator: '원문 D-3 행', schedule: { type: 'relative_to_target', offsetDays: -3 },
        items: [
          { title: '도시가스 철거·설치 예약하기', parts: ['출발지 도시가스 철거 예약', '도착지 도시가스 설치 예약'] },
          { title: '기존 집 자동이체 해지하기', parts: ['전기·수도·가스·관리비 자동이체 해지 또는 변경'] },
          { title: '세탁기 배수하고 운반 상태 만들기', parts: ['세탁기 물 빼기와 운반 준비'] },
          { title: '임대차 권리 서류 확인하기', parts: ['필요한 경우 임차권·보증금 관련 서류 확인'] },
          { title: '당일 바로 쓸 짐을 따로 싸기', parts: ['신분증·충전기·세면도구·약·옷 등 당일 물품 분리'] },
        ],
      },
      {
        title: 'D-1 · 돈·귀중품·인계 확인', locator: '원문 D-1 행', schedule: { type: 'relative_to_target', offsetDays: -1 },
        items: [
          { title: '당일 일정·송금 한도·잔금 확인하기', parts: ['이사업체와 최종 시간 확인', '은행 이체 한도 확인', '보증금·잔금 지급 계획 확인'] },
          { title: '출발지·도착지 주차 다시 확인하기', parts: ['이삿짐 차량 주차 위치 최종 확인'] },
          { title: '귀중품과 중요서류 직접 보관하기', parts: ['현금·귀중품·중요서류 별도 보관'] },
          { title: '열쇠·리모컨·비밀번호 인계 준비하기', parts: ['출발지 열쇠·리모컨 모으기', '도착지 공동현관·도어락 정보 확인'] },
          { title: '가전·가구 상태 사진 남기기', parts: ['운반 전 가전·가구 외관 사진 촬영', '어항이 있으면 이동 준비'] },
        ],
      },
      {
        title: '이사 당일 · 출발지 마감', locator: '원문 이사 당일 기존 집 행', schedule: { type: 'relative_to_target', offsetDays: 0, segment: 'origin' },
        items: [
          { title: '전기·수도·가스·관리비 정산하기', parts: ['출발지 전기·수도·가스 사용량 확인과 정산', '관리비 정산'] },
          { title: '장기수선충당금 환급 확인하기', parts: ['세입자인 경우 장기수선충당금 반환 요청'] },
          { title: '남은 물건 확인하고 열쇠 반납하기', parts: ['방·수납장·계량기 주변 남은 물건 확인', '집주인 또는 관리실에 열쇠 반납'] },
        ],
      },
      {
        title: '이사 당일 · 도착지 시작', locator: '원문 이사 당일 새집 행', schedule: { type: 'relative_to_target', offsetDays: 0, segment: 'destination' },
        items: [
          { title: '분실·파손 확인하고 이사업체 정산하기', parts: ['짐 분실·파손 여부 확인', '이사업체 잔금 정산'] },
          { title: '인터넷·TV와 도어락 확인하기', parts: ['인터넷·TV 연결 확인', '도어락 비밀번호 변경'] },
          { title: '잔금·관리비·열쇠 인수 마치기', parts: ['주택 잔금 또는 보증금 정산', '관리비 확인', '열쇠·리모컨 인수'] },
          { title: '전기·수도 명의와 가스 개통하기', parts: ['전기·수도 명의 변경', '도착지 도시가스 개통'] },
          { title: '전입신고와 확정일자 처리하기', parts: ['전입신고', '필요한 경우 확정일자 받기'] },
        ],
      },
    ],
  });
}

function weddingBundle() {
  return groupedProcedureBundle({
    bundleId: 'bundle-wedding-timeline',
    title: '결혼 준비 D-12개월 타임라인',
    category: '여행·외출·행사',
    sourceUrl: urls.wedding,
    sourceType: 'creator_community',
    userPromise: '결혼 예정일을 넣으면 원문의 6개 시기와 계약·예약 항목이 순서대로 생긴다.',
    firstAction: '예식 날짜·예산·후보 예식장을 정하고 방문 견적을 잡는다.',
    setupFields: [{ key: 'weddingDate', label: '예식일', type: 'date', required: false }],
    defaultArtifact: 'calendar_checklist',
    uxFit: {
      cardPromise: 'D-12개월부터 D-1개월까지 30개 핵심 준비 행동',
      inputCount: '날짜 없이 저장 0개, 일정화할 때 예식일 1개',
      firstScreen: '현재 시기의 계약·예약 행동을 우선 표시',
      mobileRule: '시기별 접기와 선택 항목 숨김 토글 제공',
      verdict: '현재 구조에 적합. 선택형 미용·이벤트 항목은 기본 접힘 필요',
    },
    screenshots: ['gold-wedding-naver-top.png', 'gold-wedding-naver-timeline.png', 'gold-wedding-naver-comments.png'],
    businessValue: {
      user: '업체·예약·계약 시기를 놓치지 않고 자신의 예식일에 맞춘다.',
      creator: '14개 후속 글과 Notion 원문, 업체 관련 콘텐츠로 사용자를 돌려보낸다.',
      flowMe: '장기 D-day 일정, 계약 체크, 파트너 공유, 메모 재방문이 생긴다.',
    },
    stepDefs: [
      {
        title: 'D-12개월 · 예식 기반 확정', locator: '원문 12개월 전', schedule: { type: 'relative_to_target_months', offsetMonths: -12 },
        items: [
          { title: '예식장 비교하고 최종 계약하기', parts: ['예식 날짜와 예산 정하기', '예식장 후보 목록 만들기', '예식장 방문과 견적 비교', '예식장 최종 계약'] },
          { title: '웨딩플래너 상담하고 계약하기', parts: ['플래너 상담', '플래너 계약'] },
          { title: '본식 사진·영상 업체 계약하기', parts: ['본식 스냅 업체 계약', '본식 DVD 업체 계약'] },
          { title: '아이폰 스냅 예약 여부 정하기', parts: ['아이폰 스냅 업체 확인과 예약'], optional: true },
        ],
      },
      {
        title: 'D-10개월 · 촬영과 진행자 예약', locator: '원문 10개월 전', schedule: { type: 'relative_to_target_months', offsetMonths: -10 },
        items: [
          { title: '스튜디오·드레스·메이크업 계약하기', parts: ['스튜디오 촬영 일정 확인', '드레스 투어와 가봉 일정 확인', '메이크업 업체 계약'] },
          { title: '촬영 부가 준비 확인하기', parts: ['촬영 꽃과 헤어 준비 여부 확인', '촬영 영상 제공 여부 확인'] },
          { title: '사회자와 축가 일정 잡기', parts: ['사회자 섭외와 일정 확인', '축가 담당자 섭외와 일정 확인'] },
        ],
      },
      {
        title: 'D-7개월 · 의상과 가족 준비', locator: '원문 7개월 전', schedule: { type: 'relative_to_target_months', offsetMonths: -7 },
        items: [
          { title: '신랑 예복과 구두 준비하기', parts: ['신랑 예복 업체와 디자인 결정', '신랑 구두 준비'] },
          { title: '혼주 메이크업 예약하기', parts: ['양가 혼주 메이크업 예약'] },
          { title: '촬영 드레스 가봉하기', parts: ['촬영용 드레스 가봉'] },
          { title: '촬영 부케 준비하기', parts: ['촬영 부케 결정과 예약'] },
          { title: '신부 관리 일정 정하기', parts: ['신부 피부·체형 관리 여부와 일정 결정'], optional: true },
        ],
      },
      {
        title: 'D-6개월 · 촬영·여행·신혼집 구매', locator: '원문 6개월 전', schedule: { type: 'relative_to_target_months', offsetMonths: -6 },
        items: [
          { title: '스튜디오 촬영하고 수정본 고르기', parts: ['스튜디오 촬영', '사진 셀렉과 수정본 확인'] },
          { title: '신혼여행 예약하기', parts: ['신혼여행지와 일정 결정', '항공·숙소 예약'] },
          { title: '가전·가구 구매 목록 정하기', parts: ['신혼집 가전 목록', '신혼집 가구 목록'] },
          { title: '혼주 한복 준비하기', parts: ['양가 혼주 한복 업체와 일정 결정'] },
          { title: '예물 반지 비교하고 계약하기', parts: ['웨딩링 후보 목록', '업체 견적 비교', '최종 계약'] },
          { title: '신랑·신부 추가 관리 여부 정하기', parts: ['신부 추가 관리 여부 결정', '신랑 관리 여부 결정'], optional: true },
        ],
      },
      {
        title: 'D-3개월 · 집·청첩장·가족 행사', locator: '원문 3개월 전', schedule: { type: 'relative_to_target_months', offsetMonths: -3 },
        items: [
          { title: '신혼집 입주 준비하기', parts: ['신혼집 계약', '이사업체 예약', '가전 배송 일정', '입주청소 예약'] },
          { title: '청첩장 만들고 모임 잡기', parts: ['청첩장 제작', '청첩장 전달 모임 일정'] },
          { title: '식전 영상 준비하기', parts: ['식전 영상 제작 또는 의뢰'] },
          { title: '가족 상견례 일정 잡기', parts: ['상견례 장소와 일정 확정'] },
          { title: '프로포즈 준비 여부 정하기', parts: ['프로포즈 준비 여부와 방식 결정'], optional: true },
          { title: '신랑·신부 피부 관리 마무리하기', parts: ['신랑 피부 관리', '신부 피부 관리'], optional: true },
        ],
      },
      {
        title: 'D-1개월 · 본식 최종 점검', locator: '원문 1개월 전', schedule: { type: 'relative_to_target_months', offsetMonths: -1 },
        items: [
          { title: '최종 참석 인원 확정하기', parts: ['양가 최종 하객 수 확인'] },
          { title: '본식 드레스 최종 가봉하기', parts: ['본식 드레스 최종 가봉'] },
          { title: '예식장 시식하고 메뉴 확인하기', parts: ['예식장 시식', '식사 메뉴 최종 확인'] },
          { title: '본식 진행 자료 확정하기', parts: ['예식 순서와 식순', '혼인서약·성혼선언문', '축가와 사회 대본', '신랑·신부 입장·퇴장 음악'] },
          { title: '답례품 준비하기', parts: ['답례품 종류·수량·수령 일정 확인'] },
          { title: '포토부스 준비 여부 정하기', parts: ['포토부스 예약 또는 미진행 결정'], optional: true },
          { title: '본식 부케 최종 확인하기', parts: ['본식 부케 디자인과 수령 확인'] },
          { title: '신혼여행 예약 자료 출력·확인하기', parts: ['항공·숙소·투어 예약 확인', '필요한 예약 자료 출력 또는 오프라인 저장'] },
        ],
      },
    ],
  });
}

function allblancBundle() {
  const bundleId = 'bundle-allblanc-7day-abs';
  const sourceRows = [];
  const videos = [
    [1, '코어 + 복근 한방에! 20분 복근 운동', 'https://www.youtube.com/watch?v=XwUKn-52ykk', '21:25', '150,000'],
    [2, '허리 통증 없이 20분 복근 운동', 'https://www.youtube.com/watch?v=KzH8TcfyKFA', '20:41', '78,000'],
    [3, '아랫 뱃살 집중 타격 20분 운동', 'https://www.youtube.com/watch?v=Ft5gNO-2Je4', '21:01', '73,000'],
    [4, '서서하는 20분 복근 운동', 'https://www.youtube.com/watch?v=8RzHWcq6eq0', '20:49', '88,000'],
    [5, '집에서 옆구리살 빼기 20분 운동', 'https://www.youtube.com/watch?v=peQuipmDIuc', '20:40', '45,000'],
    [6, '허리 군살 제거 20분 복근 홈트', 'https://www.youtube.com/watch?v=K3yO9oHgaIs', '20:36', '42,000'],
    [7, '헤어질 결심: 복부지방 20분 운동', 'https://www.youtube.com/watch?v=W2fS4TqeWCc', '20:49', '63,000'],
  ].map(([day, title, videoUrl, duration, visibleViews]) => ({ day, title, videoUrl, duration, visibleViews }));

  const flows = videos.map((video) => {
    const row = sourceRow(
      bundleId,
      `day-${video.day}`,
      video.videoUrl,
      `7 Days Abs Challenge · Day ${video.day}`,
      video.title,
      `영상 길이 ${video.duration} · 확인 조회수 ${video.visibleViews}`,
    );
    sourceRows.push(row);
    const action = item(
      `${bundleId}-day-${video.day}-item`,
      video.title,
      `영상: ${video.videoUrl} · 길이: ${video.duration} · 운동 후 남길 내용이 있으면 이 Item의 개인 메모를 사용한다.`,
      [row.sourceRowId],
      { schedule: { type: 'sequence_day', day: video.day } },
    );
    return flow(
      `${bundleId}-day-${video.day}`,
      `Day ${video.day} · ${video.title}`,
      [step(`${bundleId}-day-${video.day}-step`, '영상 따라 하기', [action], { schedule: { type: 'sequence_day', day: video.day } })],
      { expectedItemCount: 1, sourceVideoUrl: video.videoUrl },
    );
  });

  return bundle({
    bundleId,
    title: 'Allblanc 7일 복근 챌린지',
    category: '건강·운동',
    sourceType: 'creator_business',
    sourceUrls: [urls.allblanc, urls.allblancPlaylist, ...videos.map((video) => video.videoUrl)],
    userPromise: '7개 영상을 Day 1부터 순서대로 열고 완료만 체크한다.',
    firstAction: 'Day 1 영상을 열어 21분 25초 루틴을 따라 한다.',
    setupFields: [{ key: 'startDate', label: '시작일', type: 'date', required: false }, { key: 'repeatWeekdays', label: '운동 요일', type: 'weekday_multi', required: false }],
    defaultArtifact: 'calendar_checklist',
    uxFit: {
      cardPromise: '7개 영상·7개 루틴·각 20~21분',
      inputCount: '날짜 없이 저장 0개, 일정화할 때 시작일 또는 운동 요일 1개',
      firstScreen: '오늘 영상 제목·길이·재생 버튼만 표시',
      mobileRule: '영상 1개를 한 화면의 주 행동으로 표시하고 나머지는 다음 목록으로 둔다.',
      verdict: '현재 구조에 매우 적합. 별도 통증·중단 필드 불필요',
    },
    screenshots: ['gold-allblanc-top.png', 'gold-allblanc-videos.png', 'gold-allblanc-video-comments.png'],
    businessValue: {
      user: '재생목록에서 오늘 영상을 다시 찾지 않고 바로 시작한다.',
      creator: '모든 완료 행동이 원본 YouTube 영상 조회와 채널 재방문으로 돌아간다.',
      flowMe: '반복 일정·완료 체크·다음 영상 재방문이 생기며 콘텐츠를 복제하지 않는다.',
    },
    map: { mapId: `${bundleId}-map`, title: '7 Days Abs Challenge', flows },
    sourceRows,
  });
}

function storageBundle() {
  const bundleId = 'bundle-storage-five';
  const sourceRows = [];
  const projects = [
    {
      title: 'L파일로 쓰레기봉투 디스펜서 만들기',
      detail: 'L파일 한쪽을 밀봉하고 꺼내는 구멍을 자른 뒤, 뒷면에 테이프를 붙여 수납장 안쪽에 고정하고 접은 봉투를 넣는다.',
    },
    {
      title: '몰딩으로 떠 있는 틈새 수납 만들기',
      detail: '전선 몰딩을 필요한 길이로 자르고 폼 양면테이프를 붙인다. 종이 간격자 두 개로 위치를 맞춰 부착한 뒤 24시간 기다리고 컵이나 작은 물건을 올린다.',
    },
    {
      title: '휴지심과 컵으로 책상 정리함 만들기',
      detail: '휴지심을 컵 높이보다 낮게 자르고 2~3개를 컵 안에 빽빽하게 넣어 펜·도구 칸을 나눈다.',
    },
    {
      title: '파일꽂이 또는 상자로 옷걸이 수납 만들기',
      detail: '방법 A는 파일꽂이에 옷걸이를 세워 넣는다. 방법 B는 단단한 상자를 파일꽂이 모양으로 잘라 옷걸이를 넣고 옷장 문 안쪽에 테이프로 고정한다.',
    },
    {
      title: '북엔드로 상부장 자석 수납 만들기',
      detail: '약 11cm의 낮은 북엔드를 상부장 선반에 걸고 테이프로 고정한 뒤 자석 고리나 틴 케이스를 붙인다.',
    },
  ];
  const flows = projects.map((project, index) => {
    const row = sourceRow(bundleId, `project-${index + 1}`, urls.storage, `원문 수납 팁 ${index + 1}`, project.title, project.detail);
    sourceRows.push(row);
    return flow(
      `${bundleId}-flow-${index + 1}`,
      project.title,
      [step(`${bundleId}-flow-${index + 1}-step`, '만들기', [
        item(`${bundleId}-flow-${index + 1}-item`, project.title, project.detail, [row.sourceRowId]),
      ])],
      { expectedItemCount: 1 },
    );
  });
  return bundle({
    bundleId,
    title: '신박한 수납 팁 5',
    category: '집·살림',
    sourceType: 'creator_community',
    sourceUrls: [urls.storage],
    userPromise: '수납 팁 5개 중 필요한 하나만 골라 독립 프로젝트로 저장한다.',
    firstAction: '해결할 수납 문제와 맞는 팁 하나를 고른다.',
    setupFields: [{ key: 'selectedProject', label: '수납 팁', type: 'choice', required: true }],
    defaultArtifact: 'checklist_memo',
    uxFit: {
      cardPromise: '독립 Quick Flow 5개',
      inputCount: '필수 1개(팁 선택), 날짜는 선택',
      firstScreen: '5개 결과 사진과 제목을 먼저 비교',
      mobileRule: 'Map 카드에서는 5개 썸네일 목록, 저장 후에는 선택한 Flow 하나만 표시',
      verdict: '현재 구조에 적합. 한 Flow에 5개를 모두 체크하게 만들면 부적합',
    },
    screenshots: ['new-ohouse-storage-snapshot-metrics.png', 'new-ohouse-storage-snapshot-rows.png'],
    businessValue: {
      user: '필요한 팁만 골라 준비와 실행을 한 번에 끝낸다.',
      creator: '각 실행에서 원문 사진과 제작자 팔로우로 돌아간다.',
      flowMe: '작은 생활 프로젝트의 저장·완료·파생 버전 공유가 생긴다.',
    },
    map: { mapId: `${bundleId}-map`, title: '수납 문제별 5가지 Quick Flow', flows },
    sourceRows,
  });
}

function lunchboxBundle() {
  const bundleId = 'bundle-weekday-lunchbox';
  const sourceRows = [];
  const days = [
    {
      day: '월요일', title: '스팸 볶음밥과 딸기 도시락',
      detail: '재료: 밥 1/2공기, 스팸 1/2캔, 달걀 1개, 대파, 굴소스 1T, 후추. 대파·스팸·계란물을 준비하고 파기름에 스팸을 2분 볶는다. 빈 공간에 스크램블 에그를 만든 뒤 불을 끄고 밥을 섞고, 굴소스와 후추로 마무리한다. 다른 칸에는 딸기를 담는다.',
    },
    {
      day: '화요일', title: '게살 계란 덮밥과 골드키위 도시락',
      detail: '재료: 밥 1/2공기, 양파 1/2개, 굴소스 1.5T, 달걀 2개, 크래미 2줄, 소금·후추. 크래미 볶음, 스크램블 에그, 굴소스 양파볶음을 만든 뒤 밥 위에 양파·계란·크래미 순으로 올리고 골드키위를 담는다.',
    },
    {
      day: '수요일', title: '김치볶음밥·두부봉 부침·깍두기 도시락',
      detail: '원문은 김치볶음밥과 깍두기, 두부봉을 썰어 계란물을 입혀 굽고 남은 계란물은 얇은 지단으로 담는 방법까지만 제시한다.',
    },
    {
      day: '목요일', title: '짜장 잡채밥과 깍두기 도시락',
      detail: '원문은 맵지 않은 잡채볶음밥 반과 짜장 반을 담고, 단무지 대신 깍두기를 곁들이는 구성까지만 제시한다.',
    },
    {
      day: '금요일', title: '만두 마요 덮밥 도시락',
      detail: '재료: 밥 1공기, 달걀 2개, 냉동만두 2개, 식용유·소금·마요네즈. 달걀지단 2장을 부쳐 채 썰고, 만두는 에어프라이어 180도에서 앞뒤 5분씩 굽는다. 밥·지단·만두 순으로 담고 마요네즈를 뿌린다.',
    },
  ];
  const steps = days.map((entry, index) => {
    const row = sourceRow(bundleId, `day-${index + 1}`, urls.lunchbox, `원문 ${entry.day} 식단`, entry.title, entry.detail);
    sourceRows.push(row);
    return step(`${bundleId}-day-${index + 1}`, entry.day, [
      item(`${bundleId}-day-${index + 1}-item`, entry.title, entry.detail, [row.sourceRowId], {
        schedule: { type: 'weekday', weekday: entry.day.replace('요일', '') },
      }),
    ], { schedule: { type: 'weekday', weekday: entry.day.replace('요일', '') } });
  });
  return bundle({
    bundleId,
    title: '평일 5일 도시락 식단',
    category: '식사·장보기',
    sourceType: 'creator_community',
    sourceUrls: [urls.lunchbox],
    userPromise: '월요일부터 금요일까지 도시락 메뉴와 확인된 레시피가 한 주에 배치된다.',
    firstAction: '월요일 스팸 볶음밥 재료와 조리 순서를 확인한다.',
    setupFields: [{ key: 'weekStartDate', label: '시작 주', type: 'date', required: false }],
    defaultArtifact: 'calendar_checklist',
    uxFit: {
      cardPromise: '평일 5개 메뉴·하루 한 개 식사 행동',
      inputCount: '날짜 없이 저장 0개, 일정화할 때 시작 주 1개',
      firstScreen: '오늘 메뉴와 재료·방법만 표시',
      mobileRule: '요일 탭 또는 오늘 카드 하나를 우선 표시',
      verdict: '현재 구조에 적합. 수·목요일의 누락 레시피는 보강하지 않고 원문 범위만 표시',
    },
    screenshots: ['new-ohouse-lunchbox-snapshot-metrics.png', 'new-ohouse-lunchbox-snapshot-rows.png'],
    businessValue: {
      user: '식단표와 레시피를 별도로 옮겨 적지 않고 평일 메뉴를 바로 확인한다.',
      creator: '레시피 사진·후속 식단·팔로우로 사용자를 돌려보낸다.',
      flowMe: '주간 반복과 메뉴 완료, 다음 주 fork가 자연스럽다.',
    },
    map: {
      mapId: `${bundleId}-map`, title: '평일 도시락 한 주',
      flows: [flow(`${bundleId}-flow`, '월~금 도시락 식단', steps, { expectedItemCount: 5 })],
    },
    sourceRows,
  });
}

function remodelBundle() {
  const bundleId = 'bundle-remodel-contract';
  const sourceRows = [];
  const checks = [
    ['계약 상대방의 업체 정보 확인하기', '사업자명·대표자·주소·연락처 등 계약 주체가 실제 시공업체와 같은지 확인한다.'],
    ['공사 시작일과 완료일 적기', '공사 시작일과 완료 예정일을 계약서에 명확히 적는다.'],
    ['공사 지연 배상 조건 적기', '완료일이 늦어질 때 적용할 지체상금 또는 손해배상 기준을 계약서에서 확인한다.'],
    ['계약금·중도금·잔금 조건 적기', '각 지급 금액, 지급 시점, 지급 조건을 구분해 적는다.'],
    ['최종 공사금액과 추가비용 책임 적기', '총 공사금액과 변경·추가 공사비가 생길 때 부담 주체와 승인 방식을 적는다.'],
    ['세금계산서 발행 기한 적기', '세금계산서 발행 여부와 발행 기한을 계약서에서 확인한다.'],
    ['자재와 사양을 별지로 붙이기', '자재 브랜드·제품명·색상·수량 등 공정표나 내역서를 계약서 별지로 연결한다.'],
    ['공사 변경 승인 방식을 적기', '설계·자재·금액 변경은 사전 합의와 기록 후 진행한다는 조건을 적는다.'],
    ['공정별 A/S 기간 적기', '공정별 하자보수 범위와 기간, 접수 방법을 계약서에서 확인한다.'],
    ['해지와 위약금 조건 적기', '계약 해지 가능 사유, 통지 방법, 위약금과 정산 기준을 확인한다.'],
  ];
  const items = checks.map(([title, detail], index) => {
    const row = sourceRow(bundleId, `check-${index + 1}`, urls.remodel, `원문 체크리스트 ${index + 1}`, title, detail);
    sourceRows.push(row);
    return item(`${bundleId}-item-${index + 1}`, title, `${detail} · 최신 표준계약서 양식은 원문 링크에서 다시 확인한다.`, [row.sourceRowId]);
  });
  return bundle({
    bundleId,
    title: '리모델링 계약서 체크 10',
    category: '돈·행정·구매',
    sourceType: 'brand_interaction',
    sourceUrls: [urls.remodel],
    userPromise: '계약서 작성 전에 놓치기 쉬운 10개 조항을 한 번에 확인한다.',
    firstAction: '계약 상대방의 업체 정보가 실제 시공업체와 같은지 확인한다.',
    setupFields: [],
    defaultArtifact: 'checklist_memo',
    uxFit: {
      cardPromise: '계약 전 체크 10개·표준계약서 링크',
      inputCount: '0개',
      firstScreen: '10개 중 미확인 항목과 원문 링크를 먼저 표시',
      mobileRule: '한 항목씩 읽고 체크할 수 있는 세로 목록',
      verdict: '현재 구조에 적합. 법률 판단이나 자동 추천은 범위 밖',
    },
    screenshots: ['new-ohouse-remodel-snapshot-metrics.png', 'new-ohouse-remodel-snapshot-rows.png'],
    businessValue: {
      user: '고액 계약에서 빠뜨리기 쉬운 조항을 줄인다.',
      creator: '표준계약서·상담·리모델링 서비스로 사용자를 되돌린다.',
      flowMe: '비교·계약 전 체크와 메모, 업체별 fork가 생긴다.',
    },
    map: {
      mapId: `${bundleId}-map`, title: '리모델링 계약 전 점검',
      flows: [flow(`${bundleId}-flow`, '계약서 10개 조항 확인', [step(`${bundleId}-step`, '계약서 작성 전', items)], { expectedItemCount: 10 })],
    },
    sourceRows,
    cautions: ['법률 자문이 아니라 원문의 계약 체크 항목을 실행 목록으로 옮긴 것이다.', '공개 적용 시 최신 표준계약서와 원문 업데이트 날짜를 다시 확인한다.'],
  });
}

function ossuBundle() {
  const bundleId = 'bundle-ossu-start';
  const sourceRows = [];
  const courses = [
    { key: 'intro', group: 'Intro CS', title: 'Introduction to Computer Science and Programming using Python', duration: '14주', weekly: '주 6~10시간', prereq: '고등학교 대수' },
    { key: 'systematic', group: 'Core programming', title: 'Systematic Program Design', duration: '13주', weekly: '주 8~10시간', prereq: '없음' },
    { key: 'class', group: 'Core programming', title: 'Class-based Program Design', duration: '13주', weekly: '주 5~10시간', prereq: 'Systematic Program Design·고등학교 수학' },
    { key: 'languages', group: 'Core programming', title: 'Programming Languages', duration: '11주', weekly: '주 4~8시간', prereq: 'Systematic Program Design' },
    { key: 'ood', group: 'Core programming', title: 'Object-Oriented Design', duration: '13주', weekly: '주 5~10시간', prereq: 'Class-based Program Design' },
    { key: 'architecture', group: 'Core programming', title: 'Software Architecture', duration: '4주', weekly: '주 2~5시간', prereq: 'Object-Oriented Design' },
  ];
  for (const course of courses) {
    sourceRows.push(sourceRow(
      bundleId,
      course.key,
      urls.ossu,
      `Curriculum 표 · ${course.group}`,
      course.title,
      `${course.duration} · ${course.weekly} · 선수조건: ${course.prereq}`,
    ));
  }
  const makeCourseStep = (course, index) => step(
    `${bundleId}-${course.key}-step`,
    `${index + 1}. ${course.title}`,
    [item(
      `${bundleId}-${course.key}-item`,
      `${course.title} 수강`,
      `예상 기간 ${course.duration} · ${course.weekly} · 선수조건: ${course.prereq} · 과정 링크와 개인 진도는 같은 Item에서 관리한다.`,
      [`${bundleId}-${course.key}`],
    )],
    { order: index + 1, prerequisite: course.prereq },
  );
  const intro = courses[0];
  const core = courses.slice(1);
  return bundle({
    bundleId,
    title: 'OSSU Computer Science 시작 구간',
    category: '공부·학습',
    sourceType: 'open_community',
    sourceUrls: [urls.ossu],
    userPromise: 'OSSU 전체를 한꺼번에 넣지 않고 Intro CS와 Core programming 6개 과정의 순서·기간·선수조건만 관리한다.',
    firstAction: '고등학교 대수 조건을 확인하고 Intro CS 과정 링크를 연다.',
    setupFields: [{ key: 'selectedStartFlow', label: '시작 구간', type: 'choice', options: ['Intro CS', 'Core programming'], required: false }, { key: 'startDate', label: '시작일', type: 'date', required: false }],
    defaultArtifact: 'sheet_checklist',
    uxFit: {
      cardPromise: '시작 구간 2개·과정 6개·기간·선수조건',
      inputCount: '날짜 없이 저장 0개, 시작 구간·날짜는 선택',
      firstScreen: '다음 수강 과정과 선수조건을 우선 표시',
      mobileRule: '과정명·기간·선수조건을 한 행 카드로 표시하고 세부 링크는 펼침',
      verdict: '현재 구조에 적합. 전체 OSSU를 한 번에 펼치면 과밀하므로 시작 구간만 포함',
    },
    screenshots: ['new-ossu-top.png', 'new-ossu-community.png', 'new-ossu-curriculum.png'],
    businessValue: {
      user: 'README를 반복 탐색하지 않고 다음 과정과 선수조건을 관리한다.',
      creator: '각 과정과 GitHub 원문, issue·Discord로 사용자를 돌려보낸다.',
      flowMe: '장기 진도·중단 위치·fork·공유가 생긴다.',
    },
    map: {
      mapId: `${bundleId}-map`, title: 'OSSU 시작 구간',
      flows: [
        flow(`${bundleId}-intro-flow`, 'Intro CS', [makeCourseStep(intro, 0)], { expectedItemCount: 1 }),
        flow(`${bundleId}-core-flow`, 'Core programming', core.map(makeCourseStep), { expectedItemCount: 5 }),
      ],
    },
    sourceRows,
    rightsMode: 'MIT_attribution_and_source_links',
  });
}

function newCarComparisonBundle() {
  const bundleId = 'bundle-new-car-comparison';
  return groupedProcedureBundle({
    bundleId,
    title: '신차 구매 8단계',
    category: '돈·행정·구매',
    sourceUrl: urls.newCar,
    sourceType: 'brand_editorial',
    status: 'promising_after_fix',
    decision: 'Modify',
    userPromise: '예산 결정부터 출고 후 관리까지 신차 구매의 8단계를 순서대로 확인한다.',
    firstAction: '총예산과 월 납입 가능액을 기준으로 차종 후보를 좁힌다.',
    setupFields: [{ key: 'vehicleName', label: '차량 후보', type: 'text', required: false }],
    defaultArtifact: 'checklist_sheet',
    uxFit: {
      cardPromise: '신차 구매 8단계·비용·서류·계약 체크',
      inputCount: '0개, 차량 후보명은 선택',
      firstScreen: '현재 단계와 다음 결정 한 개를 표시',
      mobileRule: '단계별 접기와 비용·서류 memo 분리',
      verdict: '구조는 적합하지만 공개 대표 승격 전 글 단위 수요·소통 증거 보강 필요',
    },
    screenshots: ['gold-new-car-top.png', 'gold-new-car-steps.png', 'gold-new-car-business.png'],
    businessValue: {
      user: '견적·계약·출고·등록에서 빠뜨릴 항목을 줄인다.',
      creator: '차량 견적과 상담 경로로 연결된다.',
      flowMe: '고관여 비교·결정·구매 진행 상태가 생긴다.',
    },
    hardGateFailure: '원문 행은 충분하지만 글 단위 조회·댓글·자료 요청 등 직접 사용자 커뮤니케이션 수치가 보이지 않는다.',
    stepDefs: [
      { title: '1. 예산과 차량 선택', items: [
        { title: '총예산과 월 납입 가능액 정하기', parts: ['차량 가격 외 취등록세·보험·유지비를 포함한 총예산 확인', '현금·할부 시 월 납입 가능액 확인'] },
        { title: '차종·트림·옵션 후보 좁히기', parts: ['용도와 탑승 인원에 맞는 차종 선택', '트림과 필수 옵션 후보 정리'] },
      ] },
      { title: '2. 구매 방식 선택', items: [
        { title: '현금·할부·리스·장기렌트 비교하기', parts: ['소유권·월 납입액·세금·만기 조건 비교', '본인 상황에 맞는 구매 방식 선택'] },
      ] },
      { title: '3. 견적과 할인 협상', items: [
        { title: '여러 판매처 견적 비교하기', parts: ['동일 트림·옵션 기준으로 견적 받기', '차량 가격·탁송료·등록비·서비스 품목 비교'] },
        { title: '할인과 서비스 조건 확정하기', parts: ['제조사 할인과 딜러 할인 확인', '현금 지원·용품 등 서비스 조건 기록'] },
      ] },
      { title: '4. 계약', items: [
        { title: '계약서 차량 사양과 금액 확인하기', parts: ['차종·트림·색상·옵션 확인', '총액과 계약금 확인', '출고 예정일과 취소·환불 조건 확인'] },
        { title: '계약금 납부하고 서류 보관하기', parts: ['계약금 납부', '계약서와 영수증 보관'] },
      ] },
      { title: '5. 출고와 검수', items: [
        { title: '차대번호와 출고 정보 확인하기', parts: ['차대번호·생산연월·출고 일정 확인'] },
        { title: '외관·내장·기능 검수하기', parts: ['도장·유리·타이어·휠 외관 확인', '시트·내장재 확인', '등화·전자장비·옵션 작동 확인'] },
      ] },
      { title: '6. 등록', items: [
        { title: '등록 서류와 비용 확인하기', parts: ['신분증·계약서·보험가입증명 등 필요 서류 확인', '취득세·공채·번호판 등 등록 비용 확인'] },
        { title: '차량 등록과 번호판 발급 마치기', parts: ['직접 등록 또는 등록 대행 선택', '자동차등록증과 번호판 수령'] },
      ] },
      { title: '7. 보험', items: [
        { title: '자동차보험 조건 비교하고 가입하기', parts: ['운전자 범위·보장 한도·자기부담금 비교', '차량 인수 전에 보험 효력 시작 확인'] },
      ] },
      { title: '8. 출고 후 관리', items: [
        { title: '차량 문서와 보증 조건 보관하기', parts: ['등록증·보험증권·보증서 보관', '보증 기간과 정기점검 조건 확인'] },
        { title: '초기 점검과 소모품 일정 확인하기', parts: ['제조사 초기 점검 안내 확인', '소모품 교환 주기 확인'] },
      ] },
    ],
  });
}

export const selectedContentBundles = [
  opicBundle(),
  babyFoodBundle(),
  movingBundle(),
  weddingBundle(),
  allblancBundle(),
  storageBundle(),
  lunchboxBundle(),
  remodelBundle(),
  ossuBundle(),
];

export const comparisonBundles = [newCarComparisonBundle()];

function flattenBundles(bundles) {
  const flows = [];
  const steps = [];
  const items = [];
  const sourceRows = [];
  for (const entry of bundles) {
    sourceRows.push(...entry.sourceRows);
    for (const flowEntry of entry.map.flows) {
      flows.push({
        ...flowEntry,
        bundleId: entry.bundleId,
        mapId: entry.map.mapId,
        steps: undefined,
        stepIds: flowEntry.steps.map((stepEntry) => stepEntry.stepId),
      });
      for (const stepEntry of flowEntry.steps) {
        steps.push({
          ...stepEntry,
          bundleId: entry.bundleId,
          flowId: flowEntry.flowId,
          items: undefined,
          itemIds: stepEntry.items.map((itemEntry) => itemEntry.itemId),
        });
        for (const itemEntry of stepEntry.items) {
          const trace = itemEntry.sourceTrace.map((traceEntry) => {
            const row = entry.sourceRows.find((candidateRow) => candidateRow.sourceRowId === traceEntry.sourceRowId);
            return {
              ...traceEntry,
              sourceUrl: row?.sourceUrl || null,
              sourceLocator: row?.sourceLocator || null,
            };
          });
          items.push({
            ...itemEntry,
            bundleId: entry.bundleId,
            flowId: flowEntry.flowId,
            stepId: stepEntry.stepId,
            sourceTrace: trace,
          });
        }
      }
    }
  }
  return { flows, steps, items, sourceRows };
}

export const flattened = flattenBundles([...selectedContentBundles, ...comparisonBundles]);

export const portfolioCoverage = {
  representativeBundleCount: selectedContentBundles.length,
  lifeAreas: {
    '공부·학습': ['bundle-opic-plan', 'bundle-ossu-start'],
    '가족·육아': ['bundle-baby-food-174'],
    '집·살림': ['bundle-moving-d30', 'bundle-storage-five'],
    '여행·외출·행사': ['bundle-wedding-timeline'],
    '건강·운동': ['bundle-allblanc-7day-abs'],
    '식사·장보기': ['bundle-weekday-lunchbox'],
    '돈·행정·구매': ['bundle-remodel-contract'],
  },
  planningPatterns: {
    date_preparation: ['bundle-moving-d30', 'bundle-wedding-timeline'],
    repeating_routine: ['bundle-opic-plan', 'bundle-baby-food-174', 'bundle-allblanc-7day-abs', 'bundle-weekday-lunchbox'],
    ordered_procedure: ['bundle-remodel-contract'],
    resource_queue: ['bundle-storage-five', 'bundle-allblanc-7day-abs'],
    source_table_rows: ['bundle-baby-food-174', 'bundle-ossu-start'],
    compare_decide: ['bundle-remodel-contract', 'bundle-wedding-timeline'],
  },
};

export const ruleGapProposals = [
  {
    id: 'RG-01',
    status: 'review_only',
    proposal: '동일 사용자 목표에서 수요·소통 원문과 실행 행 원문이 다를 때, bundle-level multi-source evidence를 허용할지 결정한다.',
    example: 'AJD 이사 체크리스트의 실행 행 + 오늘의집 이사 체크리스트의 수요·소통 증거',
  },
  {
    id: 'RG-02',
    status: 'review_only',
    proposal: '영상 재생목록은 Map, 영상 하나는 Flow라는 규칙을 canonical playbook에 명시할지 결정한다.',
    example: 'Allblanc 7 Days Abs Challenge',
  },
  {
    id: 'RG-03',
    status: 'review_only',
    proposal: '원문 레시피의 요일별 상세 수준이 다를 때, 빈 상세를 보강하지 않고 uneven source fidelity를 화면에서 표시한다.',
    example: '도시락 식단의 수·목요일은 메뉴 구성만 있고 상세 조리 순서는 없음',
  },
];
