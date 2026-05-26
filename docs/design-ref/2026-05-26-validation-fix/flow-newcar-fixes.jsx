// FlowMe — new-car-delivery-check Before/After
// Validation review의 A6(보류 기준 섹션 신설) + A3·A2·A1 묶음.
//
//   A6. 인수 보류 기준 섹션이 seed에 없음 → 첫 섹션으로 신설 + first-class artifact
//   A3. sign-hold 결정이 일반 확인 list에 묻힘 → caution 패널 + 메모 카드로 분리
//   A2. anchor “기준 날짜” → “인수 예정일”
//   A1. 추상 export → “메모로 복사” + “시트로 받기”
//
// Money-at-risk 라우트의 원칙:
//   사용자가 “확인 다 했고 사인하면 끝”이라고 느끼면 실패. 보류 가능성이 매 순간 보여야 함.

const NCD = {
  deliveryDate: '2026. 06. 14 (일)',
  vehicle: '아반떼 CN7 화이트',
  dealer: '마포지점 김OO',
};

// Evidence rows
const NCD_EVIDENCE = [
  { item: '주행거리 (계기판)',     value: '12 km',         photo: 'odometer-20260614.jpg',     status: 'ok',     note: '' },
  { item: '차대번호 vs 계약서',    value: 'KMHL14JA*L*',   photo: 'vin-20260614.jpg',          status: 'ok',     note: '일치' },
  { item: '운전석 도어 도장',     value: '손톱자국 1',    photo: 'door-scratch-20260614.jpg', status: 'hold',   note: '재도장/보상 합의 필요' },
  { item: '본넷 도장',             value: '잔기스 의심',   photo: 'hood-paint-20260614.jpg',   status: 'check',  note: '페인트 두께 측정 요청' },
  { item: '플로어 매트',           value: '없음',          photo: '—',                          status: 'hold',   note: '옵션 누락 — 발주 메모 요청' },
  { item: '계기판 경고등',         value: '없음',          photo: 'dashboard-20260614.jpg',    status: 'ok',     note: '' },
];

// ═══════════════════════════════════════════════════════════════
// Desktop BEFORE — current seed
// ═══════════════════════════════════════════════════════════════
function NCDDesktopBefore() {
  const sections = [
    { h: '인수 전 준비', items: ['계약서 옵션과 최종 견적 다시 확인하기', '보험 시작일과 결제 수단 준비하기', '번호판, 틴팅, 블랙박스 등 인수 전 작업 범위 확인하기'] },
    { h: '외관 확인',    items: ['차대번호와 계약 차량 일치 여부 확인하기', '도장면 스크래치와 단차 확인하기', '유리, 휠, 타이어 손상 확인하기'] },
    { h: '실내·기능 확인', items: ['계기판 경고등과 주행거리 확인하기', '에어컨, 히터, 오디오, 내비게이션 작동 확인하기', '스마트키, 충전 케이블, 매뉴얼, 기본 공구 확인하기'] },
    { h: '인수 후 정리', items: ['등록증과 보험 증권 보관하기', '첫 주행 후 이상 소음과 경고등 기록하기', '초기 점검 또는 서비스 예약 필요 여부 확인하기'] },
  ];
  return (
    <CSFrame tone="bad" label="문제 3개: 보류 기준 섹션 부재 · 모두 ‘확인하기’ · 사진 증거가 first-class 아님">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: FM.cat.workout }}/>
        <span style={{ fontSize: 12, fontWeight: 600, color: FM.inkSoft }}>자동차 · 인수</span>
        <span style={{ width: 1, height: 12, background: FM.line }}/>
        <span style={{ fontSize: 12, color: FM.muted }}>checklist · 신차 인수일 D-Day</span>
        <div style={{ flex: 1 }}/>
        <Badge tone="draft" icon={<Icon name="flag" size={11}/>}>초안 깃발</Badge>
      </div>

      <h1 style={{ margin: '12px 0 4px', fontSize: 24, fontWeight: 700, color: FM.ink, letterSpacing: '-0.022em', lineHeight: 1.2 }}>
        신차 인수 — 받기 전 점검
      </h1>

      {/* anchor — vague */}
      <div style={{ marginTop: 14, position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: FM.bgAlt, border: `1px solid ${FM.line}`, borderRadius: 8 }}>
        <div style={{ display: 'grid', gap: 2 }}>
          <div style={{ fontSize: 11, color: FM.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>앵커</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: FM.ink }}>
            <span style={{ background: '#FDE4E4', padding: '2px 6px', borderRadius: 4 }}>기준 날짜</span>
          </div>
        </div>
        <div style={{ width: 1, height: 28, background: FM.line }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 7 }}>
          <Icon name="calendar" size={14} color={FM.primary}/>
          <span className="fm-num" style={{ fontSize: 14, fontWeight: 600, color: FM.ink }}>{NCD.deliveryDate}</span>
        </div>
        <Pin n={2} tone="bad" style={{ position: 'absolute', top: -8, left: -8 }}/>
      </div>

      {/* 4 sections — all 확인하기 */}
      <div style={{ marginTop: 16, position: 'relative' }}>
        <Pin n={1} tone="bad" style={{ position: 'absolute', left: -12, top: 0 }}/>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${FM.lineSoft}`, display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>인수 점검표 · primary</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: FM.ink, marginTop: 2 }}>12개 점검 항목</div>
            </div>
            <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
              <Pin n={3} tone="bad" style={{ position: 'absolute', top: -10, right: -8 }}/>
              <Btn variant="outline" size="sm" icon={<Icon name="download" size={13}/>}>
                <span style={{ background: '#FDE4E4', padding: '1px 4px', borderRadius: 3 }}>엑셀로 받기</span>
              </Btn>
            </div>
          </div>
          <div style={{ padding: 16, display: 'grid', gap: 14 }}>
            {sections.map((s, si) => (
              <div key={si}>
                <div style={{ fontSize: 12, fontWeight: 700, color: FM.ink, marginBottom: 6 }}>## {s.h}</div>
                <div style={{ border: `1px solid ${FM.lineSoft}`, borderRadius: 6, overflow: 'hidden' }}>
                  {s.items.map((t, i, arr) => (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '20px 1fr', gap: 12, alignItems: 'center',
                      padding: '9px 12px',
                      borderBottom: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
                    }}>
                      <input type="checkbox" className="fm-check"/>
                      <div style={{ fontSize: 12.5, color: FM.ink, fontWeight: 500 }}>
                        <span style={{ background: '#FDE4E4', padding: '1px 4px', borderRadius: 3 }}>{t}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
        <div style={{ padding: '8px 12px', background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={1} tone="bad"/>
          <div style={{ fontSize: 11.5, color: '#7C2D2D', lineHeight: 1.5 }}>
            <strong>‘인수 보류 기준’ 섹션이 없음.</strong> Money-at-risk 라우트인데 “보류해야 하는 조건”이 어디에도 명시되지 않음. 사용자가 “확인 다 했으니 사인” 흐름으로 빠짐. 사인 후엔 보상 기준이 바뀜.
          </div>
        </div>
        <div style={{ padding: '8px 12px', background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={2} tone="bad"/>
          <div style={{ fontSize: 11.5, color: '#7C2D2D', lineHeight: 1.5 }}>
            <strong>모든 항목이 ‘확인하기’.</strong> ‘기록만 OK한 항목’과 ‘보류 후보 항목’이 시각적으로 같음. 도장 흔적 발견 시 어떻게 할지가 빠져 있음.
          </div>
        </div>
        <div style={{ padding: '8px 12px', background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={3} tone="bad"/>
          <div style={{ fontSize: 11.5, color: '#7C2D2D', lineHeight: 1.5 }}>
            <strong>사진 증거가 first-class 아님.</strong> export는 “엑셀로 받기” 한 개. 사진 파일명 규칙, 보류 메모, 영업소 제출용 메모가 산출물에서 빠짐.
          </div>
        </div>
      </div>
    </CSFrame>
  );
}

// ═══════════════════════════════════════════════════════════════
// Desktop AFTER
// ═══════════════════════════════════════════════════════════════
function NCDDesktopAfter() {
  return (
    <CSFrame tone="good" label="보류 기준 + 증거 시트 + 보류 메모를 first-class · 점검 list는 ‘기록/보류’ 분류">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: FM.cat.workout }}/>
        <span style={{ fontSize: 12, fontWeight: 600, color: FM.inkSoft }}>자동차 · 인수</span>
        <span style={{ width: 1, height: 12, background: FM.line }}/>
        <span style={{ fontSize: 12, color: FM.muted }}>증거 시트 + 보류 메모</span>
        <div style={{ flex: 1 }}/>
        <Badge tone="draft" icon={<Icon name="flag" size={11}/>}>초안 깃발</Badge>
        <Badge tone="danger" icon={<Icon name="alert" size={11}/>}>money-at-risk</Badge>
      </div>

      <h1 style={{ margin: '12px 0 4px', fontSize: 24, fontWeight: 700, color: FM.ink, letterSpacing: '-0.022em', lineHeight: 1.2 }}>
        신차 인수 — 받기 전 점검
      </h1>
      <div style={{ fontSize: 13, color: FM.inkSoft, lineHeight: 1.55, maxWidth: 640 }}>
        사인 전에 확인할 4가지 보류 기준 · 사진 파일명 규칙이 정해진 증거 시트 · 발견 사항을 한 장에 모은 보류 메모. 사인 후엔 보상 기준이 바뀝니다.
      </div>

      {/* anchor */}
      <div style={{ marginTop: 14, position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: FM.bgAlt, border: `1.5px solid ${FM.success}30`, borderRadius: 8 }}>
        <div style={{ display: 'grid', gap: 2 }}>
          <div style={{ fontSize: 11, color: FM.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>앵커</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: FM.ink }}>
            <span style={{ background: '#DCEFE2', padding: '2px 6px', borderRadius: 4 }}>인수 예정일</span>
          </div>
        </div>
        <div style={{ width: 1, height: 28, background: FM.line }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 7 }}>
          <Icon name="calendar" size={14} color={FM.primary}/>
          <span className="fm-num" style={{ fontSize: 14, fontWeight: 600, color: FM.ink }}>{NCD.deliveryDate}</span>
        </div>
        <div style={{ width: 1, height: 28, background: FM.line }}/>
        <div style={{ fontSize: 12.5, color: FM.ink, fontWeight: 500 }}>{NCD.vehicle}</div>
        <span style={{ fontSize: 11, color: FM.muted }}>· {NCD.dealer}</span>
        <Pin n={3} tone="good" style={{ position: 'absolute', top: -8, left: -8 }}/>
      </div>

      {/* FIX 1: 인수 보류 기준 — first section, red */}
      <div style={{ marginTop: 16, position: 'relative' }}>
        <div style={{ padding: 16, background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Icon name="alert" size={16} color={FM.danger}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#7C2D2D', letterSpacing: '0.04em', textTransform: 'uppercase' }}>인수 보류 기준</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#7C2D2D', marginTop: 2 }}>해당되면 사인 보류 · 영업소에 “인수 보류 신청서” 요청</div>
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  '차대번호·차종·연식이 계약서와 불일치',
                  '주행거리 100km 이상',
                  '판금·도색 흔적 의심 (페인트 두께 측정 거부 포함)',
                  '옵션 누락 후 정정 합의 메모 없음',
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(255,255,255,0.5)', border: `1px solid rgba(180,55,55,0.18)`, borderRadius: 6 }}>
                    <span style={{ width: 16, height: 16, borderRadius: 3, background: FM.danger, color: '#fff', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: 12, color: '#7C2D2D', lineHeight: 1.45, fontWeight: 500 }}>{t}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.5)', borderRadius: 6, fontSize: 11.5, color: '#7C2D2D', lineHeight: 1.55 }}>
                <strong>사인 후엔 보상 기준이 바뀝니다.</strong> 의심 항목이 하나라도 있으면 영업소에 인수 보류 신청서를 요청한 뒤에 사인하세요.
              </div>
            </div>
          </div>
        </div>
        <Pin n={1} tone="good" style={{ position: 'absolute', top: -8, left: -8 }}/>
      </div>

      {/* FIX 2: Evidence sheet with photo filename convention — primary */}
      <div style={{ marginTop: 16, position: 'relative' }}>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${FM.lineSoft}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>증거 시트 · primary</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: FM.ink, marginTop: 2 }}>현장 확인 + 사진 파일명</div>
              <div style={{ fontSize: 11.5, color: FM.muted, marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                사진 파일명 규칙: <strong style={{ color: FM.ink }}>&lt;항목&gt;-YYYYMMDD.jpg</strong> · 예: door-scratch-20260614.jpg
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="primary" size="sm" icon={<Icon name="memo" size={13}/>}>메모로 복사</Btn>
              <Btn variant="outline" size="sm" icon={<Icon name="sheet" size={13}/>}>시트로 받기 · .xlsx</Btn>
            </div>
          </div>
          <div style={{ padding: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1.4fr 80px 1.3fr', background: FM.bgAlt }}>
              {['항목', '확인 값', '사진 파일명', '상태', '메모'].map((h, i, arr) => (
                <div key={i} style={{ padding: '8px 12px', borderRight: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', borderBottom: `1px solid ${FM.lineSoft}`, fontSize: 11, fontWeight: 700, color: FM.ink }}>{h}</div>
              ))}
            </div>
            {NCD_EVIDENCE.map((r, ri, arr) => {
              const tones = {
                ok:    { bg: 'transparent', badge: <Badge tone="success">기록</Badge> },
                check: { bg: FM.warningBg,  badge: <Badge tone="warn">측정 요청</Badge> },
                hold:  { bg: FM.dangerBg,   badge: <Badge tone="danger" icon={<Icon name="alert" size={10}/>}>보류 후보</Badge> },
              };
              const t = tones[r.status];
              return (
                <div key={ri} style={{
                  display: 'grid', gridTemplateColumns: '1.3fr 1fr 1.4fr 80px 1.3fr',
                  background: t.bg, borderBottom: ri < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
                }}>
                  <div style={{ padding: '9px 12px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12.5, color: FM.ink, fontWeight: 500 }}>{r.item}</div>
                  <div style={{ padding: '9px 12px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12, color: FM.inkSoft }}>{r.value}</div>
                  <div className="fm-mono" style={{ padding: '9px 12px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 11, color: r.photo === '—' ? FM.faint : FM.primary }}>{r.photo}</div>
                  <div style={{ padding: '6px 8px', borderRight: `1px solid ${FM.lineSoft}`, display: 'flex', alignItems: 'center' }}>{t.badge}</div>
                  <div style={{ padding: '9px 12px', fontSize: 11.5, color: r.status === 'hold' ? '#7C2D2D' : FM.inkSoft, lineHeight: 1.5, fontWeight: r.status === 'hold' ? 600 : 400 }}>{r.note || '—'}</div>
                </div>
              );
            })}
          </div>
        </Card>
        <Pin n={2} tone="good" style={{ position: 'absolute', top: 14, right: -8 }}/>
      </div>

      {/* FIX: hold memo card */}
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
        <Card padding={14}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FM.warning, letterSpacing: '0.04em', textTransform: 'uppercase' }}>인수 보류 메모 (영업소 제출용)</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: FM.ink, marginTop: 2 }}>발견 사항 한 장에 모음</div>
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            {[
              ['차량 정보', `${NCD.vehicle} · ${NCD.deliveryDate} 인수 예정`],
              ['보류 사유 1', '운전석 도어 도장 흠집 (door-scratch-20260614.jpg) — 재도장 또는 보상 합의 서면 요청'],
              ['보류 사유 2', '플로어 매트 옵션 누락 — 발주 메모 또는 가격 정정 합의 요청'],
              ['요청 사항', '위 2건 정정 합의 서면 메모 첨부 후 사인 진행'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: FM.muted, paddingTop: 2 }}>{k}</div>
                <div style={{ fontSize: 12.5, color: FM.ink, lineHeight: 1.55, fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
            <Btn variant="dark" size="sm" icon={<Icon name="copy" size={13}/>}>메모로 복사</Btn>
            <Btn variant="outline" size="sm" icon={<Icon name="download" size={13}/>}>이미지로 받기</Btn>
          </div>
        </Card>

        {/* Side panel: regular checks — secondary, tagged */}
        <Card padding={14}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>현장 확인 · secondary</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: FM.ink, marginTop: 2 }}>기록만 되는 항목</div>
          <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
            {[
              '계기판 경고등',
              '에어컨/히터 작동',
              '오디오·내비',
              '스마트키 / 충전 케이블',
              '보험 시작일',
            ].map((t, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" className="fm-check"/>
                <span style={{ fontSize: 12, color: FM.ink, fontWeight: 500 }}>{t}</span>
              </label>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: 8, background: FM.bgAlt, borderRadius: 5, fontSize: 11, color: FM.muted, lineHeight: 1.5 }}>
            이 항목들은 “기록만” 카테고리. 위 증거 시트의 ‘보류 후보’와 분리되어 있어요.
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
        {[
          [1, '“인수 보류 기준” 4개를 빨간 패널로 첫 섹션. seed text의 ## 인수 보류 기준 섹션 신설 → export 시 메모/시트 모두에 포함.'],
          [2, '증거 시트가 primary artifact. ‘기록 / 측정 요청 / 보류 후보’ 3단계 상태 + 사진 파일명 규칙(<항목>-YYYYMMDD.jpg)으로 영업소 제출 메모로 바로 변환 가능.'],
          [3, 'anchor는 “인수 예정일” + 차량/딜러 정보까지 한 줄에. money-at-risk 카테고리는 ‘무엇을 / 언제 / 누구에게서’를 첫 화면에 박아둠.'],
        ].map(([n, t]) => (
          <div key={n} style={{ padding: '8px 12px', background: FM.successBg, border: `1px solid #C6E1CF`, borderRadius: 6, display: 'flex', gap: 8 }}>
            <Pin n={n} tone="good"/>
            <div style={{ fontSize: 11.5, color: FM.success, lineHeight: 1.5 }}>{t}</div>
          </div>
        ))}
      </div>
    </CSFrame>
  );
}

// ═══════════════════════════════════════════════════════════════
// Mobile BEFORE / AFTER
// ═══════════════════════════════════════════════════════════════
function NCDMobileBefore() {
  return (
    <CSMobileShell tone="bad" label="보류 가능성이 안 보임 · 12개 확인 항목만 끝없이 스크롤">
      <Phone>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', justifyContent: 'space-between' }}>
          <Icon name="chev" size={18} color={FM.ink} sw={2}/>
          <div style={{ fontSize: 12, fontWeight: 600, color: FM.muted }}>flows / 신차 인수</div>
          <Icon name="share" size={18} color={FM.ink}/>
        </div>

        <div style={{ padding: '4px 18px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: FM.cat.workout }}/>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: FM.inkSoft }}>자동차 · 인수</span>
            <Badge tone="draft" icon={<Icon name="flag" size={10}/>}>초안 깃발</Badge>
          </div>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: FM.ink, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            신차 인수 점검
          </h1>

          {/* anchor */}
          <div style={{ marginTop: 14, position: 'relative' }}>
            <div style={{ fontSize: 11, color: FM.muted, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 6 }}>
              <span style={{ background: '#FDE4E4', padding: '1px 6px', borderRadius: 3, color: FM.danger }}>기준 날짜</span>
            </div>
            <div style={{ padding: '12px', background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="calendar" size={16} color={FM.primary}/>
              <span className="fm-num" style={{ fontSize: 14, fontWeight: 600, color: FM.ink }}>{NCD.deliveryDate}</span>
            </div>
            <Pin n={1} tone="bad" style={{ position: 'absolute', top: -4, right: -4 }}/>
          </div>

          {/* 12 check items condensed */}
          <div style={{ marginTop: 16, position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>점검 항목</div>
            <div style={{ background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 8 }}>
              {[
                '계약서 옵션 다시 확인',
                '보험 시작일 준비',
                '인수 전 작업 범위 확인',
                '차대번호 일치 확인',
                '도장면 스크래치 확인',
                '유리·휠·타이어 확인',
                '계기판 경고등 확인',
                '에어컨/히터 작동',
              ].map((t, i, arr) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '20px 1fr', gap: 10, alignItems: 'center',
                  padding: '11px 14px', borderBottom: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
                }}>
                  <input type="checkbox" className="fm-check"/>
                  <div style={{ fontSize: 12.5, color: FM.ink, fontWeight: 500 }}>{t}</div>
                </div>
              ))}
              <div style={{ padding: '10px 14px', fontSize: 11, color: FM.muted, textAlign: 'center', borderTop: `1px dashed ${FM.line}` }}>… 4개 항목 더</div>
            </div>
            <Pin n={2} tone="bad" style={{ position: 'absolute', top: -4, right: -4 }}/>
          </div>
        </div>

        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '12px 18px 18px', background: 'rgba(255,255,255,0.92)',
          borderTop: `1px solid ${FM.line}`, backdropFilter: 'blur(8px)',
        }}>
          <div style={{ position: 'relative' }}>
            <button style={{
              width: '100%', padding: '14px',
              background: FM.ink, color: '#fff',
              border: 'none', borderRadius: 10,
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Icon name="download" size={15}/>
              <span style={{ background: 'rgba(255,255,255,0.18)', padding: '1px 6px', borderRadius: 4 }}>내 도구로 가져가기</span>
            </button>
            <Pin n={3} tone="bad" style={{ position: 'absolute', top: -6, right: -6 }}/>
          </div>
        </div>
      </Phone>

      <div style={{ marginTop: 12, maxWidth: 420, display: 'grid', gap: 6 }}>
        <div style={{ padding: '8px 12px', background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={1} tone="bad"/>
          <div style={{ fontSize: 11.5, color: '#7C2D2D', lineHeight: 1.5 }}>anchor가 “기준 날짜” — money-at-risk 라우트에 의도가 안 박힘.</div>
        </div>
        <div style={{ padding: '8px 12px', background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={2} tone="bad"/>
          <div style={{ fontSize: 11.5, color: '#7C2D2D', lineHeight: 1.5 }}>“12개 확인” 흐름. 사용자가 모두 체크하면 “끝”이라고 느낌 — 보류 가능성이 어디에도 안 보임.</div>
        </div>
        <div style={{ padding: '8px 12px', background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={3} tone="bad"/>
          <div style={{ fontSize: 11.5, color: '#7C2D2D', lineHeight: 1.5 }}>export가 어디로 가는지 불명 — 영업소 제출용 메모를 만들어야 한다는 사실이 안 보임.</div>
        </div>
      </div>
    </CSMobileShell>
  );
}

function NCDMobileAfter() {
  return (
    <CSMobileShell tone="good" label="보류 기준이 첫 줄 · 사진 항목 카드 · sticky CTA = 보류 메모로 복사">
      <Phone>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', justifyContent: 'space-between' }}>
          <Icon name="chev" size={18} color={FM.ink} sw={2}/>
          <div style={{ fontSize: 12, fontWeight: 600, color: FM.muted }}>flows / 신차 인수</div>
          <Icon name="share" size={18} color={FM.ink}/>
        </div>

        <div style={{ padding: '4px 18px 100px' }}>
          {/* STOP / 보류 기준 banner first */}
          <div style={{ marginBottom: 12, position: 'relative' }}>
            <div style={{ padding: 10, background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="alert" size={13} color={FM.danger}/>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#7C2D2D' }}>사인 전 4가지 보류 기준</div>
              </div>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: '#7C2D2D', fontSize: 11, lineHeight: 1.65 }}>
                <li>차대번호·연식 불일치</li>
                <li>주행거리 100km 이상</li>
                <li>판금·도색 흔적 의심</li>
                <li>옵션 누락 + 정정 합의 없음</li>
              </ul>
              <div style={{ marginTop: 6, fontSize: 10.5, color: '#7C2D2D', fontWeight: 600, opacity: 0.8 }}>
                해당되면 영업소에 “인수 보류 신청서” 요청 — 사인 후엔 보상 기준이 바뀝니다.
              </div>
            </div>
            <Pin n={1} tone="good" style={{ position: 'absolute', top: -4, right: -4 }}/>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: FM.cat.workout }}/>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: FM.inkSoft }}>자동차 · 인수</span>
            <Badge tone="danger" icon={<Icon name="alert" size={10}/>}>money-at-risk</Badge>
          </div>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: FM.ink, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            신차 인수 점검
          </h1>

          {/* anchor + vehicle */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: FM.muted, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 6 }}>
              <span style={{ background: '#DCEFE2', padding: '1px 6px', borderRadius: 3, color: FM.success }}>인수 예정일</span>
            </div>
            <div style={{ padding: 12, background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon name="calendar" size={16} color={FM.primary}/>
                <span className="fm-num" style={{ fontSize: 14, fontWeight: 600, color: FM.ink }}>{NCD.deliveryDate}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: FM.inkSoft }}>{NCD.vehicle}</div>
              <div style={{ marginTop: 2, fontSize: 11, color: FM.muted }}>{NCD.dealer}</div>
            </div>
          </div>

          {/* Photo evidence card */}
          <div style={{ marginTop: 14, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>증거 시트 · 현장</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: FM.ink, marginTop: 2 }}>사진 6장 · 보류 2건</div>
              </div>
              <span className="fm-mono" style={{ fontSize: 10, color: FM.muted }}>YYYYMMDD.jpg 규칙</span>
            </div>
            <div style={{ background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 10, overflow: 'hidden' }}>
              {NCD_EVIDENCE.slice(0, 4).map((r, i, arr) => {
                const isHold = r.status === 'hold';
                const isCheck = r.status === 'check';
                return (
                  <div key={i} style={{
                    padding: '11px 14px',
                    borderBottom: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
                    background: isHold ? FM.dangerBg : (isCheck ? FM.warningBg : 'transparent'),
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: isHold ? '#7C2D2D' : FM.ink }}>{r.item}</div>
                      {isHold && <Badge tone="danger" icon={<Icon name="alert" size={9}/>}>보류 후보</Badge>}
                      {isCheck && <Badge tone="warn">측정 요청</Badge>}
                      {r.status === 'ok' && <Badge tone="success">기록</Badge>}
                    </div>
                    <div style={{ fontSize: 11.5, color: isHold ? '#7C2D2D' : FM.inkSoft, marginTop: 3 }}>{r.value}</div>
                    <div className="fm-mono" style={{ fontSize: 10, color: r.photo === '—' ? FM.faint : FM.primary, marginTop: 2 }}>{r.photo}</div>
                    {r.note && <div style={{ fontSize: 11, color: '#7C2D2D', marginTop: 4, fontWeight: 600 }}>→ {r.note}</div>}
                  </div>
                );
              })}
            </div>
            <Pin n={2} tone="good" style={{ position: 'absolute', top: -4, right: -4 }}/>
          </div>
        </div>

        {/* primary CTA = 보류 메모로 복사 */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '10px 18px 18px', background: 'rgba(255,255,255,0.92)',
          borderTop: `1px solid ${FM.line}`, backdropFilter: 'blur(8px)',
        }}>
          <div style={{ position: 'relative' }}>
            <button style={{
              width: '100%', padding: '14px',
              background: FM.ink, color: '#fff',
              border: 'none', borderRadius: 10,
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Icon name="memo" size={15}/>
              <span style={{ background: 'rgba(255,255,255,0.18)', padding: '1px 6px', borderRadius: 4 }}>보류 메모로 복사 (2건)</span>
            </button>
            <div style={{ marginTop: 6, fontSize: 11, color: FM.muted, textAlign: 'center' }}>
              영업소 제출용 · 사인 전에 합의 서면 받기
            </div>
            <Pin n={3} tone="good" style={{ position: 'absolute', top: -6, right: -6 }}/>
          </div>
        </div>
      </Phone>

      <div style={{ marginTop: 12, maxWidth: 420, display: 'grid', gap: 6 }}>
        <div style={{ padding: '8px 12px', background: FM.successBg, border: `1px solid #C6E1CF`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={1} tone="good"/>
          <div style={{ fontSize: 11.5, color: FM.success, lineHeight: 1.5 }}>보류 기준 banner가 첫 줄 — 사용자는 시작부터 “사인 전 의사결정 가능성”을 의식.</div>
        </div>
        <div style={{ padding: '8px 12px', background: FM.successBg, border: `1px solid #C6E1CF`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={2} tone="good"/>
          <div style={{ fontSize: 11.5, color: FM.success, lineHeight: 1.5 }}>점검 항목 카드가 사진 파일명·상태·메모를 한 행에 노출. 보류 후보는 빨강 배경으로 즉시 식별.</div>
        </div>
        <div style={{ padding: '8px 12px', background: FM.successBg, border: `1px solid #C6E1CF`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={3} tone="good"/>
          <div style={{ fontSize: 11.5, color: FM.success, lineHeight: 1.5 }}>sticky CTA가 “보류 메모로 복사 (2건)” — 실제 발견된 보류 건수가 카운터로. 영업소 제출 목적 명시.</div>
        </div>
      </div>
    </CSMobileShell>
  );
}

// ═══════════════════════════════════════════════════════════════
// Rationale
// ═══════════════════════════════════════════════════════════════
function NCDRationaleDoc() {
  return (
    <div className="fm fm-scroll" style={{ height: '100%', overflowY: 'auto', background: FM.bg, padding: '40px 56px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: FM.ink, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 10 }}>F</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: FM.ink }}>FlowMe</div>
          <Badge tone="danger" icon={<Icon name="alert" size={11}/>}>Money-at-risk · new-car-delivery-check</Badge>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: FM.muted }}>validation-routes-ux-review.md A6 + B3</div>
        </div>

        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: FM.ink, letterSpacing: '-0.025em', lineHeight: 1.15 }}>
          확인 list만으로는 보류를 만들 수 없다
        </h1>
        <p style={{ marginTop: 10, fontSize: 14, color: FM.inkSoft, lineHeight: 1.7 }}>
          `new-car-delivery-check`은 사인 한 번에 보상 기준이 바뀌는 라우트다. 현재 seed text는 4개 섹션 12개 “확인하기” 항목으로 구성되어 있는데, 사용자가 모두 체크한 순간 “끝”이라고 느낄 위험이 있다. 보류라는 행동이 어디에도 first-class로 들어가 있지 않기 때문이다.
        </p>

        <div style={{ marginTop: 22, padding: 18, background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#7C2D2D', letterSpacing: '0.04em', textTransform: 'uppercase' }}>원칙</div>
          <div style={{ marginTop: 6, fontSize: 15, fontWeight: 700, color: '#7C2D2D', lineHeight: 1.5 }}>
            money-at-risk 라우트는 ‘확인’이 아니라 ‘보류 메모’가 산출물이다.
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: '#7C2D2D', lineHeight: 1.7 }}>
            12개를 모두 확인하는 것이 아니라, 2개의 의심 항목을 찾아 영업소에 보류 신청을 하기 위해서 화면을 본다. UI는 그 결과(“보류 메모로 복사 · 2건”)를 끝까지 보여줘야 한다.
          </div>
        </div>

        <div style={{ marginTop: 26, border: `1px solid ${FM.line}`, borderRadius: 8, overflow: 'hidden' }}>
          {[
            ['A6', '보류 기준 섹션 부재', '4개 섹션 모두 “확인하기”', '## 인수 보류 기준 신설 — 첫 섹션, 빨강 패널', 'seed-flows.ts newCarDeliveryText에 섹션 추가 — 4 사유'],
            ['A6-b', '항목 분류 없음', '도장 흔적과 매뉴얼 확인이 같은 무게', '상태 3단계: 기록 / 측정 요청 / 보류 후보', 'item에 hold_eligible: boolean 플래그'],
            ['A6-c', '사진 증거가 first-class 아님', '체크박스 list만, 사진 메타 없음', '사진 파일명 규칙(<항목>-YYYYMMDD.jpg)을 카드 헤더에', 'evidence row schema에 photo_filename 추가'],
            ['A3', '보류 메모가 별도 산출물 아님', '체크 다 하면 끝 분위기', '“인수 보류 메모” 카드를 증거 시트 옆에 (영업소 제출용)', 'memo_template 필드, 보류 후보 자동 채움'],
            ['A2', 'anchor 모호', '“기준 날짜”', '“인수 예정일” + 차량/딜러 1줄', 'setup_anchor_label + setup_subject 필드'],
            ['A1', '추상 export', '“내 도구로 가져가기”', '“보류 메모로 복사 (n건)” · primary_destination = memo', 'CTA 라벨에 hold_count 노출'],
          ].map(([id, prob, before, after, fix], i, arr) => (
            <div key={id} style={{
              display: 'grid', gridTemplateColumns: '70px 1fr 1.2fr 1.4fr 1.4fr',
              borderBottom: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
            }}>
              <div style={{ padding: '12px 14px', background: id.startsWith('A6') || id === 'A3' ? FM.dangerBg : FM.bgAlt, borderRight: `1px solid ${FM.lineSoft}`, fontSize: 11, fontWeight: 700, color: id.startsWith('A6') || id === 'A3' ? FM.danger : FM.primary, letterSpacing: '0.04em' }}>{id}</div>
              <div style={{ padding: '12px 14px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12, fontWeight: 600, color: FM.ink, lineHeight: 1.5 }}>{prob}</div>
              <div style={{ padding: '12px 14px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12, color: FM.danger, lineHeight: 1.5 }}>{before}</div>
              <div style={{ padding: '12px 14px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12, color: FM.success, lineHeight: 1.5, fontWeight: 500 }}>{after}</div>
              <div style={{ padding: '12px 14px', fontSize: 11.5, color: FM.muted, lineHeight: 1.55 }}>{fix}</div>
            </div>
          ))}
        </div>

        <h2 style={{ marginTop: 30, fontSize: 16, fontWeight: 700, color: FM.ink, letterSpacing: '-0.01em' }}>
          같은 패턴이 적용될 라우트
        </h2>
        <div style={{ marginTop: 12, border: `1px solid ${FM.line}`, borderRadius: 8, overflow: 'hidden' }}>
          {[
            ['used-car-buying-check',     '## 계약 보류 기준',     '압류·저당 발견 / 사고 골격 손상 / 시운전 이상 신호'],
            ['vehicle-inspection-prep',   '## 즉시 정비 기준',     '제동 이상 / 누유 / 사이드월 손상'],
            ['real-mofa-overseas-travel-prep', '## 출국 보류 신호', '여행경보 격상 / 비자 미확정 / 보험 무효'],
            ['national-health-checkup-d7','## 검진 보류 신호',     '금식 실패 / 약 복용 / 컨디션 이상'],
          ].map(([route, section, examples], i, arr) => (
            <div key={route} style={{
              display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 2fr',
              borderBottom: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
            }}>
              <div className="fm-mono" style={{ padding: '10px 14px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 11.5, color: FM.primaryInk, fontWeight: 600 }}>{route}</div>
              <div style={{ padding: '10px 14px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12, color: '#7C2D2D', fontWeight: 600 }}>{section}</div>
              <div style={{ padding: '10px 14px', fontSize: 11.5, color: FM.muted, lineHeight: 1.55 }}>{examples}</div>
            </div>
          ))}
        </div>

        <h2 style={{ marginTop: 30, fontSize: 16, fontWeight: 700, color: FM.ink, letterSpacing: '-0.01em' }}>
          PR로 묶는 법
        </h2>
        <ol style={{ marginTop: 8, paddingLeft: 18, display: 'grid', gap: 8, fontSize: 13.5, color: FM.inkSoft, lineHeight: 1.65 }}>
          <li>
            <strong style={{ color: FM.ink }}>PR-7 · seed text에 ## 인수 보류 기준 / ## 계약 보류 기준 섹션 추가.</strong>
            new-car, used-car 2개 라우트 · 코드 변경 없음.
          </li>
          <li>
            <strong style={{ color: FM.ink }}>PR-8 · Flow schema에 hold_section 필드 + 항목별 hold_eligible 플래그.</strong>
            PR-4(stop_conditions)와 동일한 패턴. hold_section은 caution 패널로 렌더.
          </li>
          <li>
            <strong style={{ color: FM.ink }}>PR-9 · evidence row에 photo_filename + status (ok / check / hold) 추가.</strong>
            export 시 메모 템플릿에 status=hold만 자동 추출.
          </li>
          <li>
            <strong style={{ color: FM.ink }}>PR-10 · sticky CTA에 보류 카운터 노출.</strong>
            “보류 메모로 복사 (2건)” 형태. status=hold 항목 수가 0이면 라벨이 “체크리스트 복사”로 fallback.
          </li>
        </ol>

        <div style={{ marginTop: 30, padding: 16, background: FM.bgAlt, border: `1px solid ${FM.line}`, borderRadius: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>변경하지 않음</div>
          <div style={{ marginTop: 8, fontSize: 13, color: FM.inkSoft, lineHeight: 1.65 }}>
            “사인하기 / 사인하지 마세요” 같은 결정 명령 금지. FlowMe는 보류 가능성을 노출할 뿐, 사인 자체를 결정하지 않음.<br/>
            영업소 자동 연결·전화·예약 기능 금지. 메모로 복사까지만.<br/>
            “검증된 점검 항목” 라벨 금지. observed session 결과가 candidate signal이라도 validation으로 승격 금지.
          </div>
        </div>

        <div style={{ height: 60 }}/>
      </div>
    </div>
  );
}

Object.assign(window, {
  NCDDesktopBefore, NCDDesktopAfter,
  NCDMobileBefore, NCDMobileAfter,
  NCDRationaleDoc,
});
