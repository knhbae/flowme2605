// FlowMe — mobile Flow detail screens
// Single-column. First viewport must show: meta · title · anchor · 1 primary export.
// Source/safety collapse into disclosures further down.

// ── iOS-ish phone bezel (lightweight, no full status bar chrome) ──
function Phone({ children, label }) {
  return (
    <div style={{ width: 380, padding: '8px 0' }}>
      {label && <div style={{ fontSize: 11, color: FM.muted, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.005em' }}>{label}</div>}
      <div style={{
        width: 380, height: 780, borderRadius: 38,
        background: '#1F2933', padding: 7,
        boxShadow: '0 1px 0 rgba(31,41,51,0.1), 0 12px 32px rgba(31,41,51,0.18)',
      }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 32, overflow: 'hidden', background: FM.bg, position: 'relative' }}>
          {/* status bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 36,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            padding: '0 22px 6px', zIndex: 10,
          }}>
            <span className="fm-num" style={{ fontSize: 12, fontWeight: 600, color: FM.ink }}>9:41</span>
            <span style={{ fontSize: 11, color: FM.ink, fontWeight: 600 }}>•••</span>
          </div>
          <div style={{
            position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
            width: 100, height: 28, borderRadius: 14, background: '#1F2933',
          }}/>
          <div className="fm fm-scroll" style={{ position: 'absolute', inset: 0, paddingTop: 36, overflowY: 'auto' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── A) Mobile — Moving D-30 (first viewport view) ──
function MobileMoving() {
  return (
    <Phone label="모바일 · 첫 뷰포트에 anchor + primary export 1개">
      {/* top nav */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', justifyContent: 'space-between' }}>
        <button style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
          <Icon name="chev" size={18} color={FM.ink} sw={2}/>
        </button>
        <div style={{ fontSize: 12, fontWeight: 600, color: FM.muted }}>flows / 이사 D-30</div>
        <Icon name="share" size={18} color={FM.ink}/>
      </div>

      <div style={{ padding: '4px 18px 12px' }}>
        {/* meta — compact */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: FM.cat.moving }}/>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: FM.inkSoft }}>이사</span>
          </span>
          <span style={{ fontSize: 11, color: FM.muted }}>· timeline</span>
          <Badge tone="draft" icon={<Icon name="flag" size={10}/>}>초안 깃발</Badge>
        </div>

        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: FM.ink, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          이사 D-30 준비 캘린더
        </h1>
        <div style={{ marginTop: 6, fontSize: 13, color: FM.inkSoft, lineHeight: 1.55 }}>
          이사일을 넣으면 30일 일정이 자동으로 채워져요.
        </div>

        {/* Anchor — single tap */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: FM.muted, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 6 }}>
            이사일 입력
          </div>
          <button style={{
            width: '100%', padding: '14px 14px',
            background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          }}>
            <Icon name="calendar" size={16} color={FM.primary}/>
            <span className="fm-num" style={{ fontSize: 15, fontWeight: 600, color: FM.ink }}>2026. 07. 04 (토)</span>
            <div style={{ flex: 1 }}/>
            <Icon name="chev-d" size={14} color={FM.faint}/>
          </button>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: FM.success, fontWeight: 600 }}>
            <Icon name="check" size={12}/> 산출물에 적용됨 · D-30부터 계산
          </div>
        </div>

        {/* Primary CTA — destination-explicit */}
        <div style={{ marginTop: 14 }}>
          <Btn variant="primary" size="lg" full icon={<Icon name="calendar" size={15}/>}>
            캘린더에 넣기 · .ics 받기
          </Btn>
          <div style={{ marginTop: 6, fontSize: 11, color: FM.muted, textAlign: 'center' }}>
            애플/구글 캘린더에서 열 수 있는 파일이에요.
          </div>
        </div>

        {/* Primary artifact — vertical list (no horizontal scroll) */}
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>이번 주 할 일</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: FM.ink }}>D-30 ~ D-20</div>
            </div>
            <button style={{ background: 'transparent', border: 'none', color: FM.primary, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>전체 보기 →</button>
          </div>

          <div style={{ background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 10, overflow: 'hidden' }}>
            {[
              { d: 'D-30', date: '06.04', t: '이사업체 견적 3곳', done: true,  tone: 'normal' },
              { d: 'D-26', date: '06.08', t: '폐가전 신고',       done: true,  tone: 'normal' },
              { d: 'D-20', date: '06.14', t: '도시가스 이전',     done: false, tone: 'normal' },
              { d: 'D-14', date: '06.20', t: '인터넷 이전 신청',  done: false, tone: 'warn' },
              { d: 'D-9',  date: '06.25', t: '관리비 정산 문의',  done: false, tone: 'normal' },
            ].map((it, i, arr) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '20px 68px 1fr',
                gap: 10, alignItems: 'center',
                padding: '12px 14px',
                borderBottom: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
              }}>
                <input type="checkbox" className="fm-check" defaultChecked={it.done}/>
                <div className="fm-mono" style={{ fontSize: 11, fontWeight: 600, color: it.tone === 'warn' ? FM.warningInk : FM.primaryInk }}>{it.d}<br/><span style={{ color: FM.muted, fontWeight: 500 }}>{it.date}</span></div>
                <div style={{ fontSize: 13, color: it.done ? FM.faint : FM.ink, textDecoration: it.done ? 'line-through' : 'none', fontWeight: 500 }}>{it.t}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <Btn variant="outline" size="md" full icon={<Icon name="copy" size={13}/>}>오늘 할 일 복사</Btn>
            <Btn variant="outline" size="md" full icon={<Icon name="sheet" size={13}/>}>시트로 받기</Btn>
          </div>
        </div>

        {/* Disclosure: source / caution */}
        <details style={{ marginTop: 18, background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 10 }}>
          <summary style={{
            listStyle: 'none', padding: '12px 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="info" size={14} color={FM.muted}/>
            <span style={{ fontSize: 13, fontWeight: 600, color: FM.ink }}>출처 · 주의</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: FM.faint }}>마지막 확인 5/18</span>
          </summary>
          <div style={{ padding: '0 14px 12px', borderTop: `1px solid ${FM.lineSoft}` }}>
            <div style={{ marginTop: 10, fontSize: 12, color: FM.warningInk, padding: 10, background: FM.warningBg, border: `1px solid #EAD9A3`, borderRadius: 7, lineHeight: 1.55 }}>
              인터넷 이전·가스 차단은 지역·통신사에 따라 D-14보다 더 일찍 신청해야 할 수 있어요. 통신사 콜센터에 확인하세요.
            </div>
            <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Badge tone="blue">공식 정보</Badge>
                <span style={{ fontSize: 12, color: FM.ink }}>전입신고 안내 · gov.kr</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Badge tone="neutral">제작자 경험</Badge>
                <span style={{ fontSize: 12, color: FM.ink }}>@junmoves · D-14 인터넷 팁</span>
              </div>
            </div>
          </div>
        </details>

        {/* Footprint */}
        <div style={{ marginTop: 14, padding: 12, background: FM.bgAlt, border: `1px solid ${FM.line}`, borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FM.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>발자국</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 12, color: FM.inkSoft }}>
            <span><strong style={{ color: FM.ink }}>1,284</strong> 열람</span>
            <span><strong style={{ color: FM.ink }}>312</strong> 복사</span>
            <span><strong style={{ color: FM.ink }}>248</strong> 체크</span>
            <span><strong style={{ color: FM.ink }}>18</strong> 막힘</span>
          </div>
        </div>

        <div style={{ height: 40 }}/>
      </div>
    </Phone>
  );
}

// ── B) Mobile — empty/anchor missing ──
function MobileEmpty() {
  return (
    <Phone label="모바일 · 빈 상태 (앵커 없음)">
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', justifyContent: 'space-between' }}>
        <button style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
          <Icon name="chev" size={18} color={FM.ink} sw={2}/>
        </button>
        <div style={{ fontSize: 12, fontWeight: 600, color: FM.muted }}>flows / 이사 D-30</div>
        <Icon name="share" size={18} color={FM.ink}/>
      </div>

      <div style={{ padding: '4px 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: FM.cat.moving }}/>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: FM.inkSoft }}>이사</span>
          <span style={{ fontSize: 11, color: FM.muted }}>· timeline</span>
          <Badge tone="draft" icon={<Icon name="flag" size={10}/>}>초안 깃발</Badge>
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: FM.ink, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          이사 D-30 준비 캘린더
        </h1>

        <div style={{
          marginTop: 14, padding: 12, background: '#FFF7E8',
          border: `1px solid #EAD9A3`, borderRadius: 10,
          display: 'flex', gap: 10,
        }}>
          <Icon name="alert" size={14} color={FM.warningInk}/>
          <div style={{ fontSize: 12.5, color: FM.warningInk, lineHeight: 1.55 }}>
            <strong>앵커가 비어 있어요.</strong> 캘린더로 보내려면 이사일이 필요해요.
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <Btn variant="primary" size="lg" full icon={<Icon name="calendar" size={15}/>} style={{ animation: 'fm-pulse 2.4s ease-in-out infinite' }}>
            이사일 입력하기
          </Btn>
        </div>

        <div style={{ marginTop: 18, padding: 16, background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FM.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>미리보기 · placeholder</div>
          <div className="fm-stripe" style={{
            marginTop: 10, height: 200, borderRadius: 6,
            display: 'grid', placeItems: 'center', color: FM.muted, fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em',
          }}>
            CALENDAR · WAITING FOR ANCHOR
          </div>
          <div style={{ marginTop: 12, display: 'grid', gap: 4, fontSize: 12, color: FM.muted }}>
            <div>D-30 · 이사업체 견적</div>
            <div>D-14 · 인터넷 이전</div>
            <div>D-Day · 이사 당일</div>
          </div>
        </div>

        <div style={{ marginTop: 14, fontSize: 11.5, color: FM.muted, lineHeight: 1.55, textAlign: 'center' }}>
          정확한 이사일이 없으면 임시 날짜를 넣어도 돼요. 나중에 바꿀 수 있어요.
        </div>
      </div>
    </Phone>
  );
}

// ── C) Mobile — Car delivery (memo-first variant) ──
function MobileCar() {
  return (
    <Phone label="모바일 · decision + memo 변형 (인수 현장에서 쓰는 화면)">
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', justifyContent: 'space-between' }}>
        <button style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
          <Icon name="chev" size={18} color={FM.ink} sw={2}/>
        </button>
        <div style={{ fontSize: 12, fontWeight: 600, color: FM.muted }}>flows / 신차 인수 점검</div>
        <Icon name="share" size={18} color={FM.ink}/>
      </div>

      <div style={{ padding: '4px 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: FM.cat.workout }}/>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: FM.inkSoft }}>자동차 · 인수</span>
          <span style={{ fontSize: 11, color: FM.muted }}>· decision</span>
          <Badge tone="draft" icon={<Icon name="flag" size={10}/>}>초안 깃발</Badge>
        </div>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: FM.ink, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          신차 인수 — 받기 전 점검표
        </h1>
        <div style={{ marginTop: 6, fontSize: 13, color: FM.inkSoft, lineHeight: 1.55 }}>
          현장에서 한 줄씩 체크. 의심 가는 부분은 “구매 보류 메모”에 모아 사인 전에 다시 봅니다.
        </div>

        {/* Primary CTA — memo destination first */}
        <div style={{ marginTop: 14 }}>
          <Btn variant="dark" size="lg" full icon={<Icon name="memo" size={15}/>}>
            구매 보류 메모 만들기
          </Btn>
          <div style={{ marginTop: 6, fontSize: 11, color: FM.muted, textAlign: 'center' }}>
            메모 앱에 그대로 붙여넣을 수 있는 형태로 만들어요.
          </div>
        </div>

        {/* On-site checklist */}
        <div style={{ marginTop: 18 }}>
          <SecHead eye="현장 체크" title="인수 사인 전에 확인"/>
          <div style={{ marginTop: 10, background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 10, overflow: 'hidden' }}>
            {[
              ['주행거리 사진 (계기판)', true],
              ['외관 360도 사진', true],
              ['엔진룸 사진', false],
              ['범퍼·도어 단차 확인', false],
              ['시동 후 경고등 점검', false],
              ['에어컨/히터 동작 확인', false],
            ].map(([t, done], i, arr) => (
              <label key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px',
                borderBottom: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
              }}>
                <input type="checkbox" className="fm-check" defaultChecked={done}/>
                <span style={{ fontSize: 13, color: done ? FM.faint : FM.ink, textDecoration: done ? 'line-through' : 'none', fontWeight: 500 }}>{t}</span>
              </label>
            ))}
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <Btn variant="outline" size="md" full icon={<Icon name="copy" size={13}/>}>체크리스트 복사</Btn>
          </div>
        </div>

        {/* Inline caution — placed right above the decision (sign moment) */}
        <div style={{
          marginTop: 18, padding: 12, background: FM.warningBg,
          border: `1px solid #EAD9A3`, borderRadius: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="alert" size={14} color={FM.warningInk}/>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: FM.warningInk }}>사인 전에 확인</div>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: FM.warningInk, lineHeight: 1.6, opacity: 0.92 }}>
            주행거리가 100km 이상이거나 판금·도색 흔적이 의심되면 사인 보류 후 영업소에 ‘인수 보류 신청서’를 요청하세요. 사인 후엔 보상 기준이 바뀝니다.
          </div>
        </div>

        {/* Compact comparison preview */}
        <div style={{ marginTop: 18 }}>
          <SecHead eye="후보 비교 (요약)" title="비교는 데스크톱·시트에서" right={
            <Btn variant="outline" size="sm" icon={<Icon name="sheet" size={12}/>}>시트로</Btn>
          }/>
          <div style={{ marginTop: 10, padding: 12, background: FM.bgAlt, border: `1px solid ${FM.line}`, borderRadius: 10 }}>
            <div style={{ fontSize: 12, color: FM.muted, lineHeight: 1.6 }}>
              모바일에선 후보 비교표를 가로로 펼치지 않아요. <strong style={{ color: FM.ink }}>시트로 받기</strong>로 PC·태블릿에서 한눈에 비교하세요.
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Badge tone="neutral">후보 A · 화이트</Badge>
              <Badge tone="warn">후보 B · 보류 의심</Badge>
            </div>
          </div>
        </div>

        <div style={{ height: 30 }}/>
      </div>
    </Phone>
  );
}

Object.assign(window, { Phone, MobileMoving, MobileEmpty, MobileCar });
