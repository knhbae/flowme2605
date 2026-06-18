import fs from "node:fs";

const reviewPath = "docs/content-audit/original-source-review/2026-05-31-original-source-review-queue.json";
const reviews = JSON.parse(fs.readFileSync(reviewPath, "utf8"));
const readJsonIfExists = (path) => (fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, "utf8")) : []);
const extracts = [
  ...readJsonIfExists("docs/content-audit/original-source-review/2026-05-31-direct-source-extracts.json"),
  ...readJsonIfExists("docs/content-audit/original-source-review/2026-05-31-resolved-source-extracts.json"),
  ...readJsonIfExists("docs/content-audit/original-source-review/2026-05-31-remaining-source-repairs.json"),
];
const extractScore = (item = {}) =>
  (item.textSample?.length || 0) +
  (item.headings?.length || 0) * 80 +
  (item.accessStatus === "readable" ? 120 : 0) +
  (item.repaired ? 40 : 0);

const extractMap = new Map();
for (const item of extracts) {
  const current = extractMap.get(item.id);
  if (!current || extractScore(item) > extractScore(current)) extractMap.set(item.id, item);
}

const cleanTitle = (value = "") =>
  String(value)
    .replace(/\s*:\s*네이버\s*블로그\s*$/i, "")
    .replace(/\s*\|\s*[^|]{1,30}$/g, "")
    .replace(/\s+/g, " ")
    .trim();

const sourceTitleOf = (row) =>
  cleanTitle(row.resolvedOriginalTitle || row.pageTitle || row.title).replace(/^"|"$/g, "");

const sourceTypeOf = (row) => {
  if (row.sourceKind?.includes("youtube")) return "영상";
  if (row.sourceKind?.includes("naver_blog")) return "블로그/후기";
  if (row.domain?.includes("go.kr") || row.domain?.includes("or.kr")) return "공식 안내";
  if (row.url?.toLowerCase().includes(".pdf")) return "PDF/매뉴얼";
  if (row.sourceKind === "direct_url") return "웹 원문";
  return "웹 원문";
};

const userContextOf = (row) => {
  if (row.category.includes("집") || row.category.includes("가전")) return "집이나 기기를 관리하는 사용자";
  if (row.category.includes("공부") || row.category.includes("자격")) return "시험일이나 목표 기간을 잡고 공부하는 사용자";
  if (row.category.includes("여행")) return "출국 전 준비물과 안전 정보를 챙기는 사용자";
  if (row.category.includes("육아") || row.category.includes("가족")) return "가족/아이 관련 일정을 기록하며 확인하는 보호자";
  if (row.category.includes("돈") || row.category.includes("저축") || row.category.includes("구독")) return "돈, 구독, 세금, 보험 항목을 점검하는 사용자";
  if (row.category.includes("반려") || row.category.includes("식물")) return "반려동물이나 식물을 반복 관리하는 사용자";
  if (row.category.includes("자동차")) return "차량 상태나 구매/정비 결정을 기록하는 사용자";
  if (row.category.includes("식단") || row.category.includes("건강") || row.category.includes("운동")) return "식단/운동/건강 루틴을 무리 없이 실행하려는 사용자";
  if (row.category.includes("커리어") || row.category.includes("창작")) return "마감이나 제출물을 관리하는 사용자";
  return "온라인 콘텐츠를 실제 실행으로 옮기려는 사용자";
};

const actionGoalOf = (row) => {
  if (row.category.includes("집") || row.category.includes("가전")) return "마지막 관리일, 다음 점검일, 문의 필요 여부를 남긴다";
  if (row.category.includes("공부") || row.category.includes("자격")) return "자료, 진도, 오답/복습일을 남긴다";
  if (row.category.includes("여행")) return "출국 전 확인할 공식 정보, 준비물, 비상 메모를 남긴다";
  if (row.category.includes("육아") || row.category.includes("가족")) return "오늘 할 일과 관찰 기록, 보류/문의 상태를 남긴다";
  if (row.category.includes("돈") || row.category.includes("저축") || row.category.includes("구독")) return "조회 결과와 유지/해지/보류 결정을 남긴다";
  if (row.category.includes("반려") || row.category.includes("식물")) return "반복 관리일과 관찰 기록을 남긴다";
  if (row.category.includes("자동차")) return "확인한 상태와 구매/정비/보류 결정을 남긴다";
  if (row.category.includes("식단") || row.category.includes("건강") || row.category.includes("운동")) return "실행 여부, 컨디션, 중단/문의 필요 여부를 남긴다";
  if (row.category.includes("커리어") || row.category.includes("창작")) return "준비, 제출, 검토 상태를 남긴다";
  return "실행 여부와 다음 행동을 남긴다";
};

const isInvestmentLike = (row) =>
  /주식|ETF|투자|대출|DSR|DTI|공시|매매|리모델링|보험료|보장분석/.test(
    `${row.category} ${row.title} ${row.pageTitle || ""} ${row.originalSummary || ""}`,
  );

const firstInputOf = (row) => {
  const fc = row.flowContent || {};
  if (row.category.includes("여행")) return "출국일, 여행 국가, 원문 링크";
  if (row.category.includes("공부") || row.category.includes("자격")) return "시험일 또는 목표일, 사용할 자료, 회차/챕터";
  if (row.category.includes("집") || row.category.includes("가전")) return "대상 이름, 마지막 관리일, 반복 주기";
  if (row.category.includes("육아") || row.category.includes("가족")) return "기준일, 대상자, 오늘 관찰할 항목";
  if (row.category.includes("돈") || row.category.includes("저축") || row.category.includes("구독")) {
    if (isInvestmentLike(row)) return "관심 주제, 원문 링크, 확인할 공식 자료, 보류/상담 여부";
    return "기준일, 계정/계약 이름, 결정 상태";
  }
  if (row.category.includes("반려") || row.category.includes("식물")) return "대상 이름, 마지막 관리일, 반복 주기";
  if (row.category.includes("자동차")) return "차량명, 기준일, 비교/점검 대상";
  if (row.category.includes("식단") || row.category.includes("건강") || row.category.includes("운동")) return "시작일, 반복 요일, 오늘 기록할 상태";
  return fc.destination ? "기준일, 대상 이름, 원문 링크" : "대상 이름, 기준일";
};

const normalizeList = (items = [], prefix = "") =>
  [...new Set(items.filter(Boolean).map((item) => `${prefix}${String(item).trim()}`))].slice(0, 6);

const buildChecklist = (row) => {
  const fc = row.flowContent || {};
  const title = sourceTitleOf(row);
  if (isInvestmentLike(row)) {
    return [
      `원문 열기: ${title}`,
      `사용자 입력 채우기: ${firstInputOf(row)}`,
      "원문 주장을 메모로만 정리",
      "공식 공시/상품설명/계약서 등 1차 자료 확인",
      "내 상황에 맞는 질문 목록 작성",
      "투자/해지/가입 실행 지시 없이 보류/추가 확인/전문가 상담 중 하나로 기록",
      `마무리: ${fc.completion || actionGoalOf(row)}`,
    ];
  }
  const items = [
    `원문 열기: ${title}`,
    `사용자 입력 채우기: ${firstInputOf(row)}`,
    ...normalizeList(fc.checklist || []),
    `마무리: ${fc.completion || actionGoalOf(row)}`,
  ];
  return [...new Set(items)].slice(0, 8);
};

const cleanSignal = (value = "") =>
  String(value)
    .replace(/\s+/g, " ")
    .replace(/본문 바로가기|카테고리 이동|검색 MY메뉴 열기|이웃추가|본문 기타 기능/g, "")
    .trim();

const noisyChecklistPattern =
  /평가|만족|저작권|Copyright|SNS|대표전화|로그인메뉴|카테고리|이웃추가|광고문의|제휴|출연신청|댓글|인신공격|비속어|SAMSUNG|스스로해결|전문상담|서비스 안내|서비스 예약|메인메뉴|홈페이지|사이트맵|회사소개|이용약관|소모품샵|고객의 소리|로그인|장바구니|날짜 .*조회/;

const inputFieldsOf = (row) =>
  firstInputOf(row)
    .split(/,\s*/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 5);

const normalizeChecklistLabel = (phrase, row) => {
  let value = cleanSignal(phrase)
    .replace(/^요약 단서:\s*/, "")
    .replace(/^원문 요약 단서:\s*/, "")
    .replace(/^로,\s*/, "")
    .replace(/^.*확인했다\.\s*/, "")
    .replace(/^Step\s*\d+\s*/i, "")
    .replace(/^[0-9]+\.\s*/, "")
    .replace(/\s*(한다|합니다|하세요|해주세요|해 주세요|된다|됩니다|안내한다|설명한다)[.!?]*$/g, "")
    .trim();
  if (!value || noisyChecklistPattern.test(value)) return "";
  if (value.length > 72) value = `${value.slice(0, 69)}...`;

  if (/금융계좌.*카드.*보험|금융자산/.test(value)) return "금융계좌/카드/보험 조회";
  if (/금융결제원 계좌정보통합관리서비스 조회/.test(value)) return "계좌정보통합관리서비스에서 보유 계좌 조회";
  if (/어카운트인포.*금융계좌/.test(value)) return "어카운트인포에서 계좌 조회";
  if (/카드내역/.test(value)) return "카드 내역 조회";
  if (/불필요한 자동이체/.test(value)) return "불필요한 자동이체 정리 후보 표시";
  if (/자동이체/.test(value)) return "등록된 자동이체 확인";
  if (/신고 대상자.*개인정보/.test(value)) return "신고 대상자 개인정보 입력";
  if (/공제 신고서|소득\/세액공제|가족관계증명서/.test(value)) return "공제 신고서와 증빙 서류 제출 자료 확인";
  if (/근로소득원천징수영수증/.test(value)) return "종전 근무지 원천징수영수증 준비";
  if (/인적공제/.test(value)) return "인적공제 대상 확인";
  if (/기본 물품/.test(value)) return "기본 물품 준비 여부 확인";
  if (/영양소섭취기준 기반 식단/.test(value)) return "오늘 식단을 참고자료로 확인";
  if (/식단 안내문 색인|참고자료/.test(value)) return "";
  if (/주의사항.*의사와 상의|부상을 줄이고 예방/.test(value)) return "운동 전 중단/상담 조건 확인";
  if (/원문 단계 실행/.test(value)) return "원문 영상 1회 따라 하기";
  if (/재료\/도구 준비/.test(value)) return "운동 공간/도구 준비";
  if (/전원코드|전원 코드/.test(value)) return "전원 코드 연결 상태 확인";
  if (/리모컨/.test(value) && /배터리|건전지/.test(value)) return "리모컨 배터리 교체/점검";
  if (/실외기/.test(value)) return "실외기 주변 통풍 공간 정리";
  if (/먼지거름 필터|필터/.test(value) && /세척|청소|먼지/.test(value)) return "필터 분리 후 세척/건조";
  if (/필터 리셋|알림 해제/.test(value)) return "필터 리셋 또는 알림 해제";
  if (/진단서|소견서|처방전|보험 서류/.test(value)) return `${value} 준비 여부 확인`;
  if (/혈당|인슐린|저혈당/.test(value)) return `${value} 준비 여부 확인`;
  if (/접속|사이트/.test(value)) return `${value}하기`;
  if (/입력|로그인|선택|조회|다운로드|제출|신청|예약|기록|작성|준비|확인|점검|정리|세척|건조|교체|문의|상담|촬영|비교|측정|보관|완료|보류/.test(value)) {
    return value;
  }
  if (/서류|준비물|물품|연락처|자료|파일|계약서|영수증|사진/.test(value)) return `${value} 준비`;
  if (/일|날짜|마감|갱신|결제|시험|출국|방문/.test(value)) return `${value} 날짜 기록`;
  if (row.category.includes("돈") || row.category.includes("구독")) return `${value} 확인`;
  if (row.category.includes("식단") || row.category.includes("건강") || row.category.includes("육아")) return `${value} 기록`;
  return `${value} 확인`;
};

const phrasesFromSummary = (summary = "") => {
  const text = cleanSignal(summary);
  if (/^(블로그|영상|웹)\s+원문/.test(text)) return [];
  const chunks = [];
  const patternCandidates = [
    /(?:를|을)\s+(.{8,180}?)(?:\s*단계로|\s*순서로|\s*내용이다|\s*안내한다|\s*설명한다|\s*준비하는 내용)/,
    /(?:기본|주요|핵심)\s*(?:물품|항목|단서)?[,은는\s]+(.{8,180}?)(?:\s*을|\s*를|\s*이|\s*가|\s*내용이다|\s*준비하는)/,
  ];
  for (const pattern of patternCandidates) {
    const match = text.match(pattern);
    if (match?.[1]) chunks.push(match[1]);
  }
  if (!chunks.length) chunks.push(text);
  return chunks
    .flatMap((chunk) => chunk.split(/\s*,\s*|\s*\/\s*|\s+및\s+|\s+와\s+|\s+과\s+|\s*·\s*/))
    .map((x) => x.trim())
    .filter((x) => x.length >= 3 && x.length <= 90);
};

const phrasesFromExtract = (row) => {
  const extract = extractMap.get(row.id) || row.extraction || {};
  const text = cleanSignal([...(extract.headings || []), extract.h1, extract.textSample].filter(Boolean).join(" "));
  const found = [];
  const phrasePattern = /([가-힣A-Za-z0-9()[\]·/,.~% -]{2,54}(확인|입력|접속|로그인|누르|선택|세척|건조|교체|기록|작성|준비|예약|신청|제출|다운로드|조회|점검|정리|상담|문의|상의|보관|비교|촬영|측정|완료|보류))/g;
  for (const match of text.matchAll(phrasePattern)) {
    const phrase = cleanSignal(match[1]);
    if (phrase.length >= 5 && phrase.length <= 80 && !noisyChecklistPattern.test(phrase)) found.push(phrase);
  }
  return found;
};

const buildFlowChecklist = (row) => {
  const sourceTitle = sourceTitleOf(row);
  const fields = inputFieldsOf(row);
  const sourceItems = [...new Set([...phrasesFromSummary(row.originalSummary), ...phrasesFromExtract(row)])]
    .map((phrase) => normalizeChecklistLabel(phrase, row))
    .filter(Boolean)
    .filter((item) => !/^블로그|^영상 원문|^웹 원문|^원문/.test(item))
    .slice(0, 6);
  const fallbackItems = sourceItems.length >= 4 ? [] : (row.flowContent?.checklist || [])
    .map((item) => normalizeChecklistLabel(item, row))
    .filter(Boolean)
    .slice(0, 4);
  const concreteItems = [...new Set([...sourceItems, ...fallbackItems])].slice(0, 7);
  return {
    title: `${cleanTitle(row.title.replace(/\s*후보$/, ""))} 실행 체크리스트`,
    intent: "FlowMe 현재 수준에서는 입력값, 원문 링크, 실행 체크, 완료/보류 상태만 남깁니다.",
    fields,
    items: [
      { label: `기준 입력: ${fields.join(", ") || "기준일, 대상 이름"}`, kind: "input", basis: "FlowMe 입력" },
      { label: `원문 열기: ${sourceTitle}`, kind: "source", basis: "원문 링크" },
      ...concreteItems.map((label) => ({ label, kind: "check", basis: "원문 단서" })),
      { label: row.flowContent?.completion || actionGoalOf(row), kind: "done", basis: "완료 기준" },
    ].slice(0, 10),
  };
};

const sourceSignalsOf = (row) => {
  const extract = extractMap.get(row.id) || row.extraction || {};
  const text = cleanSignal([...(extract.headings || []), extract.h1, extract.textSample].filter(Boolean).join(" "));
  const candidates = [];
  const phrasePattern = /([가-힣A-Za-z0-9()[\]·/,.~% -]{2,44}(확인|입력|접속|로그인|누르|선택|세척|건조|교체|기록|작성|준비|예약|신청|제출|다운로드|조회|점검|정리|상담|문의|상의|보관|비교|촬영|측정|완료))/g;
  for (const match of text.matchAll(phrasePattern)) {
    const phrase = cleanSignal(match[1]);
    if (
      phrase.length >= 6 &&
      phrase.length <= 70 &&
      !/평가|만족|저작권|Copyright|SNS|대표전화|로그인메뉴|카테고리|이웃추가|광고문의|제휴|출연신청|댓글|인신공격|비속어|SAMSUNG|스스로해결|전문상담|서비스 안내|서비스 예약|메인메뉴|홈페이지|사이트맵|회사소개|이용약관|소모품샵|고객의 소리|로그인|장바구니|날짜 .*조회/.test(phrase)
    ) {
      candidates.push(phrase);
    }
  }
  const titleHints = [extract.h1, ...(extract.headings || [])]
    .filter(Boolean)
    .map(cleanSignal)
    .filter((x) => x.length >= 4 && x.length <= 80 && !/카테고리|블로그$|광고문의|제휴|SAMSUNG|스스로해결|전문상담|서비스 안내/.test(x));
  const summaryHint = row.originalSummary
    ? `원문 요약 단서: ${row.originalSummary.length > 140 ? `${row.originalSummary.slice(0, 140)}...` : row.originalSummary}`
    : "";
  return [...new Set([...titleHints.slice(0, 2), summaryHint, ...candidates.slice(0, 3)])].filter(Boolean).slice(0, 6);
};

const buildCalendar = (row) => {
  const fc = row.flowContent || {};
  if (isInvestmentLike(row)) return ["원문 검토일", "공식 자료 확인일", "보류/상담 결정일"];
  const items = normalizeList(fc.calendar || []);
  if (items.length) return items;
  if ((fc.destination || "").includes("캘린더") || row.category.includes("여행") || row.category.includes("공부")) {
    return ["기준일 입력", "실행일 또는 마감일 지정", "완료/보류 상태 확인일 생성"];
  }
  return [];
};

const sourceHandlingOf = (row) => {
  const title = sourceTitleOf(row);
  const summary = row.originalSummary || "";
  const isSensitive = /건강|육아|가족|돈|보험|주식|세금|법률|안전|당뇨|의료|투자/.test(`${row.category} ${title} ${summary}`);
  return {
    fact: `${sourceTypeOf(row)} 원문 "${title}"에서 확인된 요약과 실행 단서만 Flow 초안에 반영합니다.`,
    experience: row.sourceKind?.includes("blog") || row.sourceKind?.includes("youtube")
      ? "블로그/영상의 경험담은 공식 기준이 아니라 참고 메모로 분리합니다."
      : "공식/매뉴얼성 정보는 기준으로 쓰되 사용자 상황 입력을 별도로 둡니다.",
    caution: isSensitive
      ? "민감 영역입니다. 진단, 투자, 법률 판단처럼 보이는 문장은 금지하고 확인/기록/문의 상태로만 둡니다."
      : (row.flowContent?.risk || "원문 범위를 벗어난 세부 절차는 만들지 않습니다."),
  };
};

const qualityWeights = {
  sourceFidelity: 25,
  executionTransfer: 25,
  demandRepeatImpact: 20,
  inputSimplicity: 15,
  flowmeDifferentiation: 10,
  sensitivityRisk: 5,
};

const clampScore = (value) => Math.max(1, Math.min(5, value));
const roundScore = (value) => Number(clampScore(value).toFixed(1));

const demandScoreOf = (row) => {
  const text = `${row.category} ${row.title}`;
  let score = 3;
  if (/돈|저축|구독/.test(text)) score = 5;
  else if (/육아|가족|식단|건강|운동/.test(text)) score = 4.8;
  else if (/공부|자격증|여행|안전|생활행정|이벤트/.test(text)) score = 4.4;
  else if (/집|가전|자동차|모빌리티/.test(text)) score = 4.1;
  else if (/반려동물|식물/.test(text)) score = 3.6;
  else if (/커리어|창작/.test(text)) score = 3.2;

  if (/공식|정부|질병관리청|대한상공회의소|금융감독원|계좌정보|삼성전자서비스|코웨이|시나공|정부24|복지로/.test(text)) {
    score += 0.15;
  }
  if (/후기|추천|영상|블로그|후보군/.test(text)) score -= 0.25;
  if (/신청|접수|납부|갱신|예약|검진|접종|이사|시험|출국|자동이체|주소변경/.test(text)) score += 0.1;

  return roundScore(score);
};

const isSensitiveContent = (row) =>
  /건강|운동|식단|육아|가족|여행|안전|돈|저축|구독|보험|투자|대출|세금|자동차|반려동물|법률|의료|당뇨|이유식/.test(
    `${row.category} ${row.title} ${row.originalSummary || ""}`,
  );

const qualityOf = (row, checklist, flowChecklist) => {
  const verification = flowChecklist?.sourceVerification || evidenceStatusOf(row);
  const items = flowChecklist?.items || [];
  const directItems = items.filter((item) => item.confidence === "direct").length;
  const supportedItems = items.filter((item) =>
    ["direct", "summary_supported", "completion_rule", "user_input"].includes(item.confidence),
  ).length;
  const fields = flowChecklist?.fields || inputFieldsOf(row);
  const hasCalendar = Boolean(row.flowContent?.calendar?.length);
  const hasRoutine = Boolean(row.flowContent?.routine?.length);
  const hasChecklist = Boolean(row.flowContent?.checklist?.length || items.length);
  const hasDecisionState = /보류|결정|완료|기록|조회|비교|반복|일정|마감|갱신/.test(
    `${row.flowContent?.completion || ""} ${(row.flowContent?.checklist || []).join(" ")} ${row.originalSummary || ""}`,
  );
  const sensitive = isSensitiveContent(row);

  const sourceFidelity = verification.level === "source_text"
    ? (directItems >= 7 ? 5 : directItems >= 5 ? 4.7 : directItems >= 3 ? 4.3 : 3.5)
    : verification.level === "search_index_only"
      ? 2
      : 1;
  const destinationCount = [hasCalendar, hasRoutine, hasChecklist].filter(Boolean).length;
  const executionTransfer = roundScore(
    2.4 +
      (supportedItems >= 8 ? 1.2 : supportedItems >= 6 ? 1 : supportedItems >= 4 ? 0.7 : 0) +
      (row.flowContent?.completion ? 0.8 : 0) +
      destinationCount * 0.22 +
      (hasDecisionState ? 0.2 : 0),
  );
  const demandRepeatImpact = roundScore(demandScoreOf(row) + (hasRoutine ? 0.15 : 0) + (hasCalendar ? 0.1 : 0));
  const inputSimplicity =
    fields.length <= 3 && items.length <= 8 ? 5 : fields.length <= 4 && items.length <= 9 ? 4.6 : fields.length <= 5 && items.length <= 10 ? 4.2 : 3.4;
  const flowmeDifferentiation = roundScore(2.5 + (hasCalendar ? 0.7 : 0) + (hasChecklist ? 0.7 : 0) + (hasRoutine ? 0.4 : 0) + (hasDecisionState ? 0.5 : 0));
  const sensitivityRisk = !sensitive
    ? 5
    : verification.level === "source_text" && row.flowContent?.risk
      ? 4.2
      : verification.level === "source_text"
        ? 3.5
        : 2.5;

  const scores = {
    sourceFidelity,
    executionTransfer,
    demandRepeatImpact,
    inputSimplicity,
    flowmeDifferentiation,
    sensitivityRisk,
  };
  const weightedScore = Number(
    (Object.entries(scores).reduce((sum, [key, value]) => sum + value * qualityWeights[key], 0) / 100).toFixed(2),
  );
  const label = verification.level !== "source_text"
    ? "원문 재확인 필요"
    : weightedScore >= 4.3
      ? "우선 실험 후보"
      : weightedScore >= 3.7
        ? "실험 초안 후보"
        : "보완 후 후보";
  const lowest = Object.entries(scores).sort((a, b) => a[1] - b[1])[0]?.[0];
  const fixes = {
    sourceFidelity: "직접 열람 가능한 원문 추출본을 보강하고, 체크 항목별 근거 문장을 다시 연결해야 합니다.",
    executionTransfer: "첫 실행 항목, 완료 기준, 일정/체크/기록 목적지를 더 구체화해야 합니다.",
    demandRepeatImpact: "반복 사용 빈도나 사용자가 자주 찾는 상황을 더 검증해야 합니다.",
    inputSimplicity: "입력 필드와 체크 항목을 줄여 캘린더/리마인더 수준으로 단순화해야 합니다.",
    flowmeDifferentiation: "단순 요약을 넘어서 일정, 기록, 보류/결정 같은 FlowMe식 실행 단위를 더 분명히 해야 합니다.",
    sensitivityRisk: "민감 영역은 공식 출처, 개인 기록, 전문가 문의 조건을 더 분리해야 합니다.",
  };

  return {
    scores,
    weights: qualityWeights,
    weightedScore,
    average: weightedScore,
    label,
    topFix: fixes[lowest] || "가중치가 높은 낮은 점수 항목부터 보완해야 합니다.",
  };
};

const fitIds = new Set([
  "001", "002", "004", "009",
  "024", "027", "030", "035", "037",
  "041", "050", "053",
  "062", "064", "068", "071", "073", "077",
  "081", "082", "087", "089", "090", "094",
  "121", "122", "124", "125", "134",
  "181", "183", "184", "186", "188", "199",
]);

const rejectIds = new Set([
  "003", "005", "006", "007", "008", "011", "014", "018", "019",
  "021", "022", "023", "025", "026", "029", "031", "032", "034", "036", "038", "039", "040",
  "042", "048", "052", "056", "057", "059", "060",
  "063", "066", "070", "075", "079", "080",
  "084", "085", "086", "092", "096", "098", "099", "100",
  "104", "105", "106", "107", "110", "111", "112", "113", "114", "115", "117", "119",
  "126", "127", "131", "136", "139", "140",
  "141", "142", "143", "145", "146", "147", "150", "152", "153", "154", "155", "157", "158", "159", "160",
  "161", "162", "163", "164", "165", "166", "167", "168", "169", "170", "172", "174", "176", "177", "178", "179", "180",
  "182", "185", "187", "191", "192", "193", "194", "195", "196", "197", "198", "200",
]);

const anchorSignals = /일정|마감|접수|신청|예약|갱신|납부|검사|전입|이사|여권|시험|출국|준비|주기|반복|청소|교체|점검|관리|등록|신고|발급|구독|자동이체|검진|접종|구매|비교|계약/;
const weakContentSignals = /후기|추천|꿀팁|매매기법|유튜버|검색|고급 기술|루틴 영상|챌린지|식단 후기|다이어트|독서 기록|노션|프로젝트 관리|레시피|요가|스트레칭|홈트|운동법|가이드 후보|체험|서비스|비교 후보/;

const flowFitOf = (row, flowChecklist) => {
  const verification = flowChecklist?.sourceVerification || evidenceStatusOf(row);
  if (verification.level !== "source_text") {
    return {
      verdict: "원문 재확인",
      level: "recheck",
      reasons: ["직접 원문 추출본이 없어 Flow 적합 여부를 확정하지 않음"],
      blockers: ["원문 본문 또는 PDF 텍스트 재추출 필요"],
    };
  }

  const titleText = `${row.title} ${row.originalSummary || ""}`;
  const destinationText = `${row.flowContent?.destination || ""} ${row.flowContent?.structure || ""}`;
  const items = flowChecklist?.items || [];
  const directChecks = items.filter((item) => item.kind === "check" && item.confidence === "direct").length;
  const hasAnchor = anchorSignals.test(`${titleText} ${destinationText} ${(row.flowContent?.calendar || []).join(" ")} ${(row.flowContent?.routine || []).join(" ")}`);
  const hasWritableState = /기록|보류|완료|결정|조회|제출|예약|신청|납부|접수|비교|다음|반복/.test(
    `${row.flowContent?.completion || ""} ${(row.flowContent?.checklist || []).join(" ")}`,
  );
  const weak = weakContentSignals.test(titleText) || row.sourceKind?.includes("youtube_search_candidate");

  if (fitIds.has(row.id)) {
    return {
      verdict: "Flow 적합",
      level: "fit",
      reasons: ["실제 날짜/주기/마감 또는 행정 절차가 있고, 사용자가 체크·기록·완료 상태로 관리할 이유가 있음"],
      blockers: [],
    };
  }

  if (rejectIds.has(row.id) || (weak && !hasAnchor) || (!hasAnchor && directChecks < 3)) {
    return {
      verdict: "탈락",
      level: "reject",
      reasons: ["읽기/후기/추천/설명 성격이 강해 FlowMe가 관리판으로 바꿀 실행 구조가 약함"],
      blockers: ["일정, 반복, 마감, 기록, 보류/결정 중 명확한 실행 축이 부족함"],
    };
  }

  if (hasAnchor && hasWritableState) {
    return {
      verdict: "조건부",
      level: "conditional",
      reasons: ["실행 축은 있으나 원문 또는 후보가 넓어 바로 대표 Flow로 쓰기에는 정제가 필요함"],
      blockers: weak ? ["후기/영상/경험담에서 검증 가능한 실행 항목만 다시 골라야 함"] : ["입력값과 완료 기준을 더 줄여야 함"],
    };
  }

  return {
    verdict: "탈락",
    level: "reject",
    reasons: ["정보 참고 가치는 있지만 사용자가 반복 관리할 Flow 단위가 분명하지 않음"],
    blockers: ["캘린더/체크/루틴/기록 중 하나로 자연스럽게 옮길 수 있는지 재검토 필요"],
  };
};

const input = (name, example, required = true) => ({ name, example, required });
const calendarItem = (title, timing, description, type = "calendar") => ({ title, timing, description, type });
const checkItem = (title, completion, sourceBasis = "원문 근거") => ({ title, completion, sourceBasis });
const routineItem = (title, repeat, description) => ({ title, repeat, description });

const notCreatedFlowContent = (row, flowFit) => ({
  status: "not_created",
  reason: `${flowFit.verdict}: ${flowFit.reasons?.[0] || "실제 Flow 콘텐츠로 만들지 않음"}`,
  title: cleanTitle(row.title.replace(/\s*후보$/, "")),
});

const baseActualFlow = (row, config) => ({
  status: "ready",
  title: config.title || cleanTitle(row.title.replace(/\s*후보$/, "")),
  userGoal: config.userGoal,
  primaryDestination: config.primaryDestination || row.realFlowDraft?.primaryDestination || row.flowContent?.destination || "hybrid",
  structure: config.structure || row.flowContent?.structure || "timeline",
  anchor: config.anchor,
  inputs: config.inputs,
  calendarItems: config.calendarItems || [],
  checklistItems: config.checklistItems || [],
  routineItems: config.routineItems || [],
  recordFields: config.recordFields || [],
  completionDefinition: config.completionDefinition,
  sourceUse: config.sourceUse || "원문 링크는 상세 메모에 보존하고, 사용자는 실행 상태만 수정합니다.",
  appFitCheck: {
    inputComplexity: config.inputs.length <= 5 ? "pass" : "fail",
    hasAnchor: Boolean(config.anchor?.name),
    hasPortableItems: (config.calendarItems?.length || 0) + (config.checklistItems?.length || 0) + (config.routineItems?.length || 0) >= 4,
    result: config.inputs.length <= 5 && Boolean(config.anchor?.name) ? "pass" : "fail",
    notes: config.appFitNotes || "캘린더/체크/기록으로 바로 옮길 수 있는 실행 단위입니다.",
  },
});

const actualFlowContentOf = (row, flowFit) => {
  if (flowFit.level !== "fit") return notCreatedFlowContent(row, flowFit);

  const id = row.id;
  const title = cleanTitle(row.title.replace(/\s*후보$/, ""));

  if (["001", "002", "004", "009"].includes(id)) {
    return baseActualFlow(row, {
      title,
      userGoal: "집에 있는 가전의 마지막 관리일을 기준으로 다음 청소/점검일을 놓치지 않고 완료한다.",
      primaryDestination: "calendar",
      structure: "routine",
      anchor: { name: "마지막 점검일", example: "2026-06-01" },
      inputs: [
        input("기기명", "거실 시스템 에어컨"),
        input("마지막 점검일", "2026-06-01"),
        input("반복 주기", "2주"),
        input("공식 원문 링크", row.resolvedOriginalUrl || row.url, false),
      ],
      calendarItems: [
        calendarItem("다음 필터 청소", "마지막 점검일 + 반복 주기", "필터 분리, 세척/건조, 장착까지 한 번에 처리"),
        calendarItem("계절 전 사전점검", "3~5월 중 1회", "여름 전 전원/리모컨/실외기 주변을 확인"),
      ],
      checklistItems: [
        checkItem("전원 차단 또는 운전 정지", "청소 전 전원 상태를 안전하게 정리함"),
        checkItem("필터 분리 후 먼지 제거/세척", "필터 상태를 확인하고 세척 또는 먼지 제거 완료"),
        checkItem("완전 건조 후 장착", "건조 후 장착까지 끝냄"),
        checkItem("필터 리셋 또는 다음 점검일 저장", "알림 초기화 또는 다음 관리일 생성"),
      ],
      recordFields: ["완료 여부", "필터 상태", "이상 증상", "다음 점검일"],
      completionDefinition: "필터 청소/점검을 완료하고 다음 점검일이 생성되면 완료",
    });
  }

  if (["024", "027", "030", "033", "035", "037"].includes(id)) {
    return baseActualFlow(row, {
      title,
      userGoal: "시험일과 접수 마감일을 기준으로 접수, 자료 확보, 반복 학습, 시험 전 준비를 관리한다.",
      primaryDestination: "hybrid",
      structure: "timeline",
      anchor: { name: "시험일", example: "2026-07-20" },
      inputs: [
        input("시험명", title),
        input("시험일", "2026-07-20"),
        input("접수 마감일", "2026-06-30"),
        input("학습 자료 링크", row.resolvedOriginalUrl || row.url, false),
      ],
      calendarItems: [
        calendarItem("시험 접수 마감 확인", "접수 마감일 D-3", "공식 사이트에서 접수 상태 확인"),
        calendarItem("시험일", "시험일", "수험표/신분증/준비물 확인 후 응시"),
        calendarItem("오답 복습일", "시험일 D-7", "약한 범위만 다시 풀기"),
      ],
      checklistItems: [
        checkItem("공식 시험 일정 확인", "시험일/접수 기간을 공식 링크 기준으로 확인"),
        checkItem("학습 자료 확보", "자료 링크 또는 파일명을 기록"),
        checkItem("오늘 학습 범위 완료", "회차/챕터 상태를 완료 또는 보류로 기록"),
        checkItem("시험 전 준비물 확인", "수험표, 신분증, 필기구 등 준비 상태 기록"),
      ],
      routineItems: [
        routineItem("반복 학습", "주 3회", "회차/챕터를 체크하고 오답 메모를 남김"),
      ],
      recordFields: ["회차/챕터", "점수", "오답 영역", "다음 복습일"],
      completionDefinition: "접수 상태, 학습 범위, 시험 전 준비물이 모두 기록되면 완료",
    });
  }

  if (["041", "050", "053"].includes(id)) {
    return baseActualFlow(row, {
      title,
      userGoal: "출국일 또는 방문 예정일을 기준으로 공식 안전정보, 서류, 비상 연락처를 출발 전에 준비한다.",
      primaryDestination: "hybrid",
      structure: "timeline",
      anchor: { name: "출국일 또는 방문일", example: "2026-08-10" },
      inputs: [
        input("출국일/방문일", "2026-08-10"),
        input("국가/목적지", "일본"),
        input("여권 만료일", "2028-01-01", false),
        input("공식 링크", row.resolvedOriginalUrl || row.url, false),
      ],
      calendarItems: [
        calendarItem("공식 안전정보 확인", "출국 D-30", "국가별 최신 안내와 여행경보 확인"),
        calendarItem("서류/온라인 등록 확인", "출국 D-7", "여권, 입국 등록, 보험, 예약 정보를 확인"),
        calendarItem("오프라인 비상 메모 저장", "출국 D-1", "비상 연락처를 메모에 저장"),
      ],
      checklistItems: [
        checkItem("공식 페이지 열기", "최신 안전정보 또는 신청 절차 확인"),
        checkItem("비상 연락처 기록", "재외공관/영사콜센터/보험 연락처 저장"),
        checkItem("필수 서류 확인", "여권, 등록, 보험, 예약번호 상태 기록"),
        checkItem("보류 항목 표시", "미확인 항목을 보류로 남김"),
      ],
      recordFields: ["국가", "공식 확인일", "비상 연락처", "미확인 항목"],
      completionDefinition: "출국 전 공식 정보, 서류, 비상 연락처가 모두 저장되면 완료",
    });
  }

  if (["062", "064", "068", "071", "073", "077"].includes(id)) {
    return baseActualFlow(row, {
      title,
      userGoal: "아이/가족 기준일에 맞춰 신청, 접종, 준비물, 관찰 기록을 빠뜨리지 않고 관리한다.",
      primaryDestination: "hybrid",
      structure: "timeline",
      anchor: { name: "기준일", example: "2026-06-01" },
      inputs: [
        input("대상자", "첫째"),
        input("기준일", "2026-06-01"),
        input("마감일/예약일", "2026-06-20", false),
        input("공식 링크", row.resolvedOriginalUrl || row.url, false),
      ],
      calendarItems: [
        calendarItem("공식 기준 확인", "기준일", "공식 안내 또는 원문 링크 확인"),
        calendarItem("신청/예약 마감 전 확인", "마감일 D-3", "서류와 신청 상태 확인"),
      ],
      checklistItems: [
        checkItem("대상자 정보 입력", "이름/월령/신청 대상 상태 기록"),
        checkItem("필요 서류 또는 준비물 확인", "서류/준비물 체크 완료"),
        checkItem("신청/예약/기록 완료", "완료 또는 보류 상태로 기록"),
        checkItem("문의 필요 여부 표시", "확실하지 않은 항목은 문의로 남김"),
      ],
      routineItems: [
        routineItem("관찰/상태 기록", "필요 시 매일", "먹은 양, 컨디션, 이상 반응 등 개인 기록만 남김"),
      ],
      recordFields: ["대상자", "신청/예약 상태", "관찰 메모", "보류 사유"],
      completionDefinition: "신청/예약/관찰 상태가 완료 또는 보류로 정리되면 완료",
      appFitNotes: "의료 판단이 아니라 일정, 신청, 관찰 기록 중심으로만 사용합니다.",
    });
  }

  if (["081", "082", "087", "089", "090", "094"].includes(id)) {
    return baseActualFlow(row, {
      title,
      userGoal: "내 계좌/세금/납부 항목을 조회하고 유지, 해지, 납부, 보류 결정을 기록한다.",
      primaryDestination: "sheet",
      structure: "decision",
      anchor: { name: "점검일 또는 납부 마감일", example: "2026-06-25" },
      inputs: [
        input("점검일/마감일", "2026-06-25"),
        input("대상 항목", "자동이체"),
        input("계정/기관", "어카운트인포", false),
        input("공식 링크", row.resolvedOriginalUrl || row.url, false),
      ],
      calendarItems: [
        calendarItem("조회/납부 마감 전 확인", "마감일 D-3", "공식 사이트에서 상태 확인"),
        calendarItem("월말 점검", "매월 말", "유지/해지/보류 항목 재확인"),
      ],
      checklistItems: [
        checkItem("공식 사이트에서 현재 상태 조회", "조회 결과를 기록"),
        checkItem("유지/해지/납부/보류 결정", "각 항목의 결정 상태 입력"),
        checkItem("증빙 대신 결과 메모 저장", "필요한 경우 확인 번호나 날짜만 기록"),
        checkItem("다음 점검일 생성", "반복 점검일 저장"),
      ],
      recordFields: ["항목명", "현재 상태", "결정", "처리일", "다음 점검일"],
      completionDefinition: "조회 결과와 유지/해지/납부/보류 결정이 기록되면 완료",
    });
  }

  if (["121", "122", "124", "125", "134"].includes(id)) {
    return baseActualFlow(row, {
      title,
      userGoal: "차량 상태나 행정 마감일을 기준으로 조회, 점검, 비교, 보류 결정을 기록한다.",
      primaryDestination: "hybrid",
      structure: "checklist",
      anchor: { name: "조회일 또는 검사/갱신 마감일", example: "2026-06-15" },
      inputs: [
        input("차량명/번호", "쏘나타 12가3456"),
        input("조회일/마감일", "2026-06-15"),
        input("후보 차량/정비 항목", "중고차 A", false),
        input("공식 링크", row.resolvedOriginalUrl || row.url, false),
      ],
      calendarItems: [
        calendarItem("공식 조회/검사 마감 확인", "마감일 D-7", "사고이력, 검사, 갱신 상태 확인"),
      ],
      checklistItems: [
        checkItem("사고이력/주행거리 조회", "조회 결과 기록"),
        checkItem("외관/타이어/누유/실내 상태 확인", "점검 항목별 상태 기록"),
        checkItem("구매/정비/보류 결정", "결정 상태와 이유 입력"),
        checkItem("추가 문의 항목 표시", "불확실한 항목을 보류로 남김"),
      ],
      recordFields: ["차량명", "사고이력", "주행거리", "점검 메모", "결정"],
      completionDefinition: "조회와 점검 결과를 바탕으로 구매/정비/보류 결정이 남으면 완료",
    });
  }

  if (["181", "183", "184", "186", "188", "199"].includes(id)) {
    return baseActualFlow(row, {
      title,
      userGoal: "이사일, 신청일, 계약일 같은 생활 행정 기준일에 맞춰 서류와 신청 상태를 관리한다.",
      primaryDestination: "hybrid",
      structure: "timeline",
      anchor: { name: "기준일", example: "2026-07-01" },
      inputs: [
        input("기준일", "2026-07-01"),
        input("주소/기관", "서울시 강남구", false),
        input("마감일", "2026-07-14", false),
        input("공식 링크", row.resolvedOriginalUrl || row.url, false),
      ],
      calendarItems: [
        calendarItem("신청/신고 마감 전 확인", "마감일 D-3", "공식 사이트에서 신청 가능 조건 확인"),
        calendarItem("처리 결과 확인", "신청 후 D+1", "완료/보류/문의 상태 기록"),
      ],
      checklistItems: [
        checkItem("공식 절차 확인", "신청 대상과 필요 서류 확인"),
        checkItem("서류/주소/계약 정보 입력", "필수 입력값 기록"),
        checkItem("전입신고/주소변경/계약 체크 실행", "실제 신청 또는 체크 완료"),
        checkItem("이사 견적/주소 변경 보류 항목 표시", "미처리 항목을 다음 할 일로 남김"),
      ],
      recordFields: ["신청 상태", "접수 번호", "보류 사유", "다음 확인일"],
      completionDefinition: "신청/신고/계약 체크 상태가 완료 또는 보류로 정리되면 완료",
    });
  }

  return baseActualFlow(row, {
    title,
    userGoal: "기준일과 원문 링크를 바탕으로 사용자가 실제로 처리할 항목을 체크하고 완료 상태를 남긴다.",
    primaryDestination: "hybrid",
    structure: "checklist",
    anchor: { name: "기준일", example: "2026-06-01" },
    inputs: [
      input("기준일", "2026-06-01"),
      input("대상 이름", title),
      input("원문 링크", row.resolvedOriginalUrl || row.url, false),
    ],
    calendarItems: [calendarItem("처리일", "기준일", "원문 기준으로 오늘 처리할 항목 확인")],
    checklistItems: [
      checkItem("원문 기준 확인", "실행 가능한 항목만 선택"),
      checkItem("오늘 처리할 항목 완료", "완료/보류 상태 기록"),
      checkItem("다음 확인일 저장", "필요 시 다음 일정 생성"),
    ],
    recordFields: ["상태", "메모", "다음 확인일"],
    completionDefinition: "오늘 처리할 항목이 완료 또는 보류로 기록되면 완료",
  });
};

const evidenceStatusOf = (row) => {
  const extract = extractMap.get(row.id) || row.extraction || {};
  const hasText = Boolean(extract.textSample && extract.textSample.trim().length > 80);
  if (hasText) {
    return {
      level: "source_text",
      label: "원문 추출본 확인",
      note: "원문 본문/자막/설명에서 짧은 근거 문장을 찾아 체크 항목에 연결함",
    };
  }
  if ((row.reviewStatusLabel || "").includes("검색 색인")) {
    return {
      level: "search_index_only",
      label: "검색 색인 근거",
      note: "직접 본문 추출이 없어 검색 색인/기존 요약 기준으로만 임시 전환함",
    };
  }
  if ((extract.headings || []).length) {
    return {
      level: "heading_only",
      label: "제목/소제목 근거",
      note: "본문 추출은 약하고 제목/소제목 단서 중심으로 임시 전환함",
    };
  }
  return {
    level: "summary_only",
    label: "요약 근거",
    note: "직접 원문 추출본이 없어 기존 원문 요약과 Flow 후보값으로만 임시 전환함",
  };
};

const sourceTextOf = (row) => {
  const extract = extractMap.get(row.id) || row.extraction || {};
  return cleanSignal([extract.h1, ...(extract.headings || []), extract.textSample].filter(Boolean).join(" "));
};

const briefEvidence = (value = "") =>
  cleanSignal(value)
    .replace(/^본문 바로가기\s*/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 90);

const sentenceParts = (text = "") =>
  cleanSignal(text)
    .split(/(?<=[.!?。])\s+|(?=STEP\s*\d+)|(?=Step\s*\d+)|(?=\d+\.\s)|[•·]/g)
    .map((part) => briefEvidence(part))
    .filter((part) => part.length >= 8 && part.length <= 180);

const actionWordPattern =
  /확인|입력|선택|조회|준비|기록|청소|세척|건조|장착|리셋|제출|다운로드|로그인|접속|예약|신청|방문|촬영|비교|분리|교체|점검|보관|작성|저장|실행|따라|체크|문의|상담|해지|변경|납부|출력|열람|설치|차단|정지|끄기|열기|닫기|관찰|먹은 양|연락처/;

const noisePattern =
  /Copyright|SNS|로그인메뉴|장바구니|메인으로 이동|평가하기|매우 만족|만족|불만족|광고문의|이웃추가|카테고리 이동|댓글|공유하기|조회수|회사소개|개인정보처리방침|이용약관|사이트맵|네이버|블로그|유튜브|후원하기|구독|좋아요|https?:|www\.|인스타|포스팅|알려드릴까|자신의 책임|대표번호/;

const labelFromEvidence = (evidence, row) => {
  const stepHeading = briefEvidence(evidence).match(/(?:STEP|Step)\s*\d+\.?\s*([가-힣A-Za-z0-9()[\]·/,.~% -]{2,30}?하기)/);
  if (stepHeading?.[1]) return stepHeading[1].trim();

  const stepTitle = briefEvidence(evidence).match(/(?:STEP|Step)\s*\d+\.?\s*([가-힣A-Za-z0-9()[\]·/,.~% -]{4,34}?)(?:\s{1,}|먼저|1\.|2\.|3\.|$)/);
  if (stepTitle?.[1]) return stepTitle[1].trim();

  let label = briefEvidence(evidence)
    .replace(/\[[^\]]+\]/g, "")
    .replace(/^STEP\s*\d+\.?\s*/i, "")
    .replace(/^Step\s*\d+\.?\s*/i, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/^(먼저|그리고|또한|이제|특히|만약|단,)\s*/g, "")
    .replace(/\s*(해\s*주세요|해주세요|하세요|합니다|됩니다|합니다\.|됩니다\.|하십시오|해둡니다|해 둡니다|합니다)$/g, "")
    .trim();

  label = label
    .replace(/전원 코드가 콘센트에 꽂혀 있는지 확인.*/, "전원 코드 연결 확인")
    .replace(/리모컨 배터리를 교체.*/, "리모컨 배터리 교체")
    .replace(/에어컨 필터를 분리한 후 깨끗이 세척.*/, "필터 분리 후 세척")
    .replace(/직사광선이 닫지 않는 곳에서 충분히 건조.*/, "직사광선을 피해 충분히 건조")
    .replace(/필터 리셋 버튼을 눌러.*/, "필터 리셋 버튼으로 알림 초기화")
    .replace(/본인확인.*진행.*/, "본인확인 절차 진행")
    .replace(/서비스 이용을 위한 개인정보 수집.*/, "개인정보 수집·이용 안내 확인");

  if (label.length > 58) label = `${label.slice(0, 55)}...`;
  if (!actionWordPattern.test(label)) {
    if (row.category.includes("공부") || row.category.includes("자격증")) return `${label} 학습/확인`;
    if (row.category.includes("여행")) return `${label} 준비 여부 확인`;
    if (row.category.includes("육아") || row.category.includes("가족")) return `${label} 기록`;
    return `${label} 확인`;
  }
  return label;
};

const sourceActionCandidates = (row) => {
  const status = evidenceStatusOf(row);
  if (status.level !== "source_text") return [];
  const text = sourceTextOf(row);
  const fromSentences = sentenceParts(text)
    .filter((part) => actionWordPattern.test(part) && !noisePattern.test(part))
    .filter((part) => /(?:STEP|Step)\s*\d+|먼저|이후|클릭|접속|입력|체크|눌러|제출|분리|세척|건조|리셋|조회|해지|변경|준비|기록|확인|선택|예약|신청|점검/.test(part))
    .map((part) => ({
      label: labelFromEvidence(part, row),
      evidence: briefEvidence(part),
      basis: status.level === "source_text" ? "원문 추출" : status.label,
      confidence: status.level === "source_text" ? "direct" : "needs_recheck",
    }));

  const phraseMatches = [...text.matchAll(/([가-힣A-Za-z0-9()[\]·/,.~% -]{4,70}(?:확인|입력|선택|조회|준비|기록|청소|세척|건조|장착|리셋|제출|다운로드|로그인|접속|예약|신청|방문|촬영|비교|분리|교체|점검|보관|작성|저장|실행|따라|체크|문의|상담|해지|변경|납부|출력|열람|설치|차단|정지|관찰))/g)]
    .map((match) => briefEvidence(match[1]))
    .filter((part) => part.length >= 5 && !noisePattern.test(part))
    .map((part) => ({
      label: labelFromEvidence(part, row),
      evidence: part,
      basis: status.level === "source_text" ? "원문 추출" : status.label,
      confidence: status.level === "source_text" ? "direct" : "needs_recheck",
    }));

  const seen = new Set();
  return [...fromSentences, ...phraseMatches]
    .filter((item) => {
      const key = item.label.replace(/\s+/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return item.label.length >= 5 && !noisePattern.test(item.label);
    })
    .slice(0, 7);
};

const keywordTokens = (label = "") =>
  [...new Set(String(label).match(/[가-힣A-Za-z0-9]{2,}/g) || [])]
    .filter((token) => !/확인|준비|기록|상태|현재|공식|절차|결정|후보|여부|기준|대상/.test(token))
    .slice(0, 6);

const evidenceForLabel = (label, row) => {
  const status = evidenceStatusOf(row);
  const tokens = keywordTokens(label);
  const parts = sentenceParts(status.level === "source_text" ? sourceTextOf(row) : row.originalSummary || "");
  const hit = parts.find((part) => tokens.some((token) => part.includes(token)) && !noisePattern.test(part));
  if (hit) {
    return {
      evidence: briefEvidence(hit),
      basis: status.level === "source_text" ? "원문 추출" : status.label,
      confidence: status.level === "source_text" ? "direct" : "needs_recheck",
    };
  }
  return {
    evidence: briefEvidence(row.originalSummary || status.note),
    basis: status.level === "source_text" ? "요약 보강" : status.label,
    confidence: status.level === "source_text" ? "summary_supported" : "needs_recheck",
  };
};

const buildEvidenceFlowChecklist = (row) => {
  const status = evidenceStatusOf(row);
  const fields = inputFieldsOf(row);
  const sourceTitle = sourceTitleOf(row);
  const fromSource = sourceActionCandidates(row);
  const fromFlow = (row.flowContent?.checklist || [])
    .map((label) => {
      const evidence = evidenceForLabel(label, row);
      return {
        label,
        kind: "check",
        ...evidence,
      };
    })
    .filter((item) => item.label && !noisePattern.test(item.label));

  const seen = new Set();
  const concreteItems = [...fromSource, ...fromFlow]
    .filter((item) => {
      const key = item.label.replace(/\s+/g, "").slice(0, 28);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 7);

  return {
    title: `${cleanTitle(row.title.replace(/\s*후보$/, ""))} 실행 체크리스트`,
    intent: "원문에서 확인한 실행 단서만 앞쪽에 두고, 직접 추출이 약한 항목은 재확인 필요로 표시합니다.",
    fields,
    sourceVerification: status,
    items: [
      {
        label: `기준 입력: ${fields.join(", ") || "기준일, 대상 이름"}`,
        kind: "input",
        basis: "FlowMe 입력값",
        confidence: "user_input",
        evidence: "사용자가 일정/시트/메모에서 직접 채워야 하는 실행 기준값",
      },
      {
        label: `원문 열기: ${sourceTitle}`,
        kind: "source",
        basis: "원문 링크",
        confidence: status.level === "source_text" ? "direct" : "needs_recheck",
        evidence: row.resolvedOriginalUrl || row.url || sourceTitle,
      },
      ...concreteItems.map((item) => ({ kind: "check", ...item })),
      {
        label: row.flowContent?.completion || actionGoalOf(row),
        kind: "done",
        basis: "완료 기준",
        confidence: "completion_rule",
        evidence: row.flowContent?.completion || actionGoalOf(row),
      },
    ].slice(0, 10),
  };
};

for (const row of reviews) {
  const sourceTitle = sourceTitleOf(row);
  const checklist = buildChecklist(row);
  const calendar = buildCalendar(row);
  const routine = normalizeList(row.flowContent?.routine || []);
  const firstInput = firstInputOf(row);
  const userContext = userContextOf(row);
  const sourceSignals = sourceSignalsOf(row);
  const flowChecklist = buildEvidenceFlowChecklist(row);
  const flowFit = flowFitOf(row, flowChecklist);
  const actualFlowContent = actualFlowContentOf(row, flowFit);

  row.realFlowDraft = {
    flowTitle: cleanTitle(row.title.replace(/\s*후보$/, "")),
    sourceTitle,
    userNeed: `${userContext}가 "${sourceTitle}"에서 실제로 따라 할 부분만 짧은 실행 목록으로 옮겨 ${actionGoalOf(row)}.`,
    contentShape: sourceTypeOf(row),
    primaryDestination: row.flowContent?.destination || row.destination || "hybrid",
    structure: row.flowContent?.structure || "checklist",
    firstAction: {
      title: `${cleanTitle(row.title.replace(/\s*후보$/, ""))} 기준 입력`,
      how: `준비: ${firstInput}. 실행: 원문을 열고 오늘 처리할 항목만 고릅니다. 마무리: 완료/보류/문의 중 하나로 상태를 남깁니다.`,
      completion: row.flowContent?.completion || actionGoalOf(row),
    },
    calendar,
    checklist,
    flowChecklist,
    sourceVerification: flowChecklist.sourceVerification,
    flowFit,
    actualFlowContent,
    routine,
    sourceSignals,
    completion: row.flowContent?.completion || actionGoalOf(row),
    sourceHandling: sourceHandlingOf(row),
    quality: qualityOf(row, checklist, flowChecklist),
  };
}

for (const row of reviews) {
  const quality = row.realFlowDraft.quality;
  const fit = row.realFlowDraft.flowFit;
  const rawScore = quality.rawWeightedScore ?? quality.weightedScore;
  quality.rawWeightedScore = rawScore;

  const adjustedScore =
    fit.verdict === "Flow 적합"
      ? rawScore
      : fit.verdict === "조건부"
        ? Math.min(rawScore, 3.4)
        : fit.verdict === "원문 재확인"
          ? Math.min(rawScore, 2.5)
          : Math.min(rawScore, 2);

  quality.weightedScore = Number(adjustedScore.toFixed(2));
  quality.average = quality.weightedScore;
}

const ranked = reviews
  .filter((row) => row.realFlowDraft?.flowFit?.verdict === "Flow 적합")
  .sort((a, b) => {
    const qa = a.realFlowDraft.quality;
    const qb = b.realFlowDraft.quality;
    return (
      qb.weightedScore - qa.weightedScore ||
      qb.scores.sourceFidelity - qa.scores.sourceFidelity ||
      qb.scores.demandRepeatImpact - qa.scores.demandRepeatImpact ||
      qb.scores.inputSimplicity - qa.scores.inputSimplicity ||
      a.id.localeCompare(b.id)
    );
  });

ranked.forEach((row, index) => {
  const quality = row.realFlowDraft.quality;
  quality.rank = index + 1;
  quality.priority = index < 30 ? "P0" : "P1";
  quality.label = index < 30 ? "P0 Flow 적합" : "P1 Flow 적합";
});

reviews
  .filter((row) => row.realFlowDraft?.flowFit?.verdict !== "Flow 적합")
  .forEach((row) => {
    const verdict = row.realFlowDraft.flowFit.verdict;
    row.realFlowDraft.quality.priority =
      verdict === "원문 재확인" ? "RECHECK" : verdict === "조건부" ? "P2" : "OUT";
    row.realFlowDraft.quality.label = verdict;
    row.realFlowDraft.quality.rank = null;
  });

fs.writeFileSync(reviewPath, JSON.stringify(reviews, null, 2) + "\n", "utf8");
console.log(`enriched ${reviews.length} real flow drafts`);
