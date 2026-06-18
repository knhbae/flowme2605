// FlowMe — desktop Flow detail screens
// A) Timeline calendar (이사 D-30) · B) Decision + memo (신차 인수 점검)

// Shared canvas wrapper
function DesktopFrame({ children }) {
  return (
    <div className="fm" style={{ width: '100%', height: '100%', background: FM.bg, display: 'flex', flexDirection: 'column' }}>
      <TopBar/>
      <div className="fm-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '20px 28px 60px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ╔════════════════════════════════════════════════════════════╗
// ║ A) Timeline — 이사 D-30                                    ║
// ╚════════════════════════════════════════════════════════════╝
function ScreenMoving() {
  // Anchor (이사일) = 2026-07-04. All dates computed from anchor + dOffset
  // so July items don't end up as "06.34". `day` is retained as the
  // calendar grid day; we split items by month (June vs July) at render time.
  const ANCHOR = new Date(2026, 6, 4); // 2026-07-04
  const addDaysLocal = (base, d) => {
    const x = new Date(base); x.setDate(x.getDate() + d); return x;
  };
  const fmtMD = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const fmtYMD = (d) => `${d.getFullYear()}.${fmtMD(d)}`;

  const movingItems = [
    { id: 'm1', label: '이사업체 견적 3곳', tone: 'normal', dOffset: -30 },
    { id: 'm2', label: '폐가전 신고',       tone: 'normal', dOffset: -26 },
    { id: 'm3', label: '도시가스 이전',     tone: 'normal', dOffset: -20 },
    { id: 'm4', label: '인터넷 이전 신청',  tone: 'warn',   dOffset: -14 },
    { id: 'm5', label: '관리비 정산 문의',  tone: 'normal', dOffset: -9 },
    { id: 'm6', label: '전입신고 준비',     tone: 'normal', dOffset: -6 },
    { id: 'm7', label: '이삿짐 일정 확정',  tone: 'normal', dOffset: -3 },
    { id: 'm8', label: '이사 당일',         tone: 'warn',   dOffset: 0 },
  ].map(it => {
    const date = addDaysLocal(ANCHOR, it.dOffset);
    return { ...it, date, day: date.getDate(), month: date.getMonth() + 1 };
  });
  const done = new Set(['m1', 'm2']);
  const list = movingItems.map(it => ({
    ...it,
    dateStr: fmtYMD(it.date),
    dStr: it.dOffset === 0 ? 'D-Day' : it.dOffset > 0 ? `D+${it.dOffset}` : `D${it.dOffset}`,
  }));
  const juneItems = movingItems.filter(it => it.month === 6);
  const julyItems = movingItems.filter(it => it.month === 7);

  return (
    <DesktopFrame>
      {/* meta + title + anchor */}
      <MetaRow
        category="이사" dot={FM.cat.moving}
        structure="timeline · D-Day" anchorLabel="앵커: 이사일"
        source="제작자 경험 + 공식 확인"
        draft="초안 깃발 · Stage 0 검증용"
        lastChecked="2026.05.18"
      />
      <h1 style={{ margin: '14px 0 6px', fontSize: 28, fontWeight: 700, color: FM.ink, letterSpacing: '-0.025em', lineHeight: 1.2 }}>
        이사 D-30 준비 캘린더
      </h1>
      <div style={{ fontSize: 14, color: FM.inkSoft, lineHeight: 1.6, maxWidth: 680 }}>
        이사일을 넣으면 견적·신고·이전·전입까지 30일 일정이 캘린더와 체크리스트로 자동으로 들어옵니다. 본인 도구로 가져가 실행하세요.
      </div>

      <div style={{ marginTop: 18 }}>
        <AnchorBar
          label="이사일을 알려주세요"
          value="2026. 07. 04 (토)"
          hint="이 날짜를 기준으로 모든 항목의 D-N이 다시 계산돼요"
          applied
        />
      </div>

      {/* main split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginTop: 18, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          {/* Primary artifact: calendar */}
          <ArtifactCard
            eye="이사 캘린더 · primary"
            title="2026년 7월 · 이사 일정"
            desc="ICS로 받아 캘린더 앱에 통째로 넣을 수 있어요. 표시는 D-30 기준."
            exports={[
              { icon: 'calendar', label: '캘린더에 넣기 · .ics' },
              { icon: 'copy',     label: '일정 텍스트 복사' },
            ]}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 18 }}>
              <CalendarMini year={2026} month={6} items={juneItems} doneIds={done}/>
              <CalendarMini year={2026} month={7} items={julyItems} doneIds={done}/>
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 14, fontSize: 11, color: FM.muted, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: FM.primaryBg, border: `1px solid #CFDEFA`, borderRadius: 2 }}/>예정</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: FM.warningBg, border: `1px solid #EAD9A3`, borderRadius: 2 }}/>마감 임박</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: FM.successBg, border: `1px solid #C6E1CF`, borderRadius: 2 }}/>완료</span>
              <div style={{ flex: 1 }}/>
              <span>2 / 8 완료</span>
            </div>
          </ArtifactCard>

          {/* Secondary: list / checkable */}
          <ArtifactCard
            eye="실행 리스트 · secondary"
            title="이번 주 할 일"
            desc="이사일까지 남은 일정을 한 줄씩 체크. 같은 항목이 위 캘린더에 동기화돼요."
            exports={[
              { icon: 'copy',     label: '체크리스트 복사' },
              { icon: 'sheet',    label: '시트로 받기 · .xlsx' },
            ]}
            mainTone="primarySoft"
          >
            <div style={{ display: 'grid', gap: 4 }}>
              {list.map(it => (
                <div key={it.id} style={{
                  display: 'grid', gridTemplateColumns: '20px 88px 1fr auto', gap: 12, alignItems: 'center',
                  padding: '10px 8px', borderBottom: `1px solid ${FM.lineSoft}`,
                }}>
                  <input type="checkbox" className="fm-check" defaultChecked={done.has(it.id)}/>
                  <div className="fm-mono" style={{ fontSize: 11.5, fontWeight: 600, color: it.tone === 'warn' ? FM.warningInk : FM.primaryInk }}>{it.dStr} · {it.dateStr.slice(5)}</div>
                  <div style={{ fontSize: 13, color: done.has(it.id) ? FM.faint : FM.ink, textDecoration: done.has(it.id) ? 'line-through' : 'none', fontWeight: 500 }}>{it.label}</div>
                  <Badge tone={it.tone === 'warn' ? 'warn' : 'outline'}>{it.tone === 'warn' ? '공식 확인' : '경험'}</Badge>
                </div>
              ))}
            </div>
          </ArtifactCard>
        </div>

        {/* right rail */}
        <div style={{ display: 'grid', gap: 12, position: 'sticky', top: 76 }}>
          <Card padding={14}>
            <div style={{ fontSize: 12, fontWeight: 700, color: FM.ink }}>이 Flow 정보</div>
            <div style={{ marginTop: 10, display: 'grid', gap: 6, fontSize: 11.5 }}>
              {[
                ['카테고리', '이사'],
                ['구조', 'timeline'],
                ['앵커', '이사일'],
                ['항목 수', '8개'],
                ['제작자', '@junmoves'],
                ['버전', 'v0.3 · 5월 18일 갱신'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ color: FM.muted }}>{k}</span>
                  <span style={{ color: FM.ink, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <SourcePanel
            lastChecked="2026.05.18"
            items={[
              { type: 'official',   title: '전입신고 안내', url: 'gov.kr/portal/' },
              { type: 'experience', title: '인터넷 이전 D-14 팁', url: '@junmoves' },
            ]}
          />

          <CautionPanel
            tone="warn"
            title="공식 확인 필요"
            body="인터넷 이전과 가스 차단은 지역·통신사에 따라 D-14보다 더 일찍 신청해야 할 수 있어요. 캘린더에 넣기 전에 통신사 콜센터에 확인하세요."
          />

          <FootprintBar counts={{ view: 1284, copy: 312, check: 248, stuck: 18 }}/>

          <FeedbackBlock/>
        </div>
      </div>
    </DesktopFrame>
  );
}

// ╔════════════════════════════════════════════════════════════╗
// ║ B) Decision + memo — 신차 인수 점검                         ║
// ╚════════════════════════════════════════════════════════════╝
function ScreenCarDelivery() {
  const compareRows = [
    { k: '외관 도장 흠집', a: '운전석 도어 손톱자국 1', b: '깨끗 / 본넷에 가벼운 잔기스' },
    { k: '주행거리 (시승 포함)', a: '12 km', b: '8 km' },
    { k: '판금/도색 흔적', a: '없음', b: '뒷 휀더 의심 — 페인트 두께 측정' },
    { k: '실내 냄새/오염', a: '없음', b: '거의 없음' },
    { k: '옵션 누락', a: '없음', b: '플로어 매트 없음' },
  ];
  const fieldMemo = [
    { id: 'q1', label: '계약서에 명시된 옵션과 실제 일치 여부' },
    { id: 'q2', label: '인수 시점 주행거리 (km)' },
    { id: 'q3', label: '결함/하자 발견 시 보류 사유' },
    { id: 'q4', label: '인수 거부 또는 보류 조건 (서면 합의 여부)' },
  ];
  const onSite = [
    '주행거리 사진 (계기판)', '외관 360도 사진', '엔진룸 사진',
    '범퍼·도어 단차 확인', '시동 후 경고등 점검', '에어컨/히터·전동 시트 동작 확인',
  ];

  return (
    <DesktopFrame>
      <MetaRow
        category="자동차 · 인수" dot={FM.cat.workout}
        structure="checklist · decision" anchorLabel="앵커: 인수일"
        source="제작자 경험 + 사용자 메모"
        draft="초안 깃발 · Stage 0 검증용"
        lastChecked="2026.05.20"
      />
      <h1 style={{ margin: '14px 0 6px', fontSize: 28, fontWeight: 700, color: FM.ink, letterSpacing: '-0.025em', lineHeight: 1.2 }}>
        신차 인수 — 받기 전 점검표
      </h1>
      <div style={{ fontSize: 14, color: FM.inkSoft, lineHeight: 1.6, maxWidth: 680 }}>
        후보 차량을 비교하고, 현장에서 한 줄씩 체크하고, 의심 가는 부분은 “구매 보류 메모”로 한 장에 모읍니다. 인수 사인 전에 가져가세요.
      </div>

      <div style={{ marginTop: 18 }}>
        <AnchorBar
          label="인수 예정일"
          value="2026. 06. 14 (일)"
          hint="이 날짜 전에 모든 점검을 끝낼 수 있게 일정을 잡아드려요"
          applied
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginTop: 18, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          {/* Primary: comparison */}
          <ArtifactCard
            eye="후보 비교표 · primary"
            title="후보 차량 비교"
            desc="딜러에서 본 차량을 같은 기준으로 적어두고, 인수 사인 전에 다시 봅니다."
            exports={[
              { icon: 'sheet', label: '시트로 받기 · .xlsx' },
              { icon: 'copy',  label: '비교표 텍스트 복사' },
            ]}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: '200px 1fr 1fr 130px',
              border: `1px solid ${FM.lineSoft}`, borderRadius: 6, overflow: 'hidden',
            }}>
              {/* header */}
              {['항목', '후보 A · 화이트 · 18km', '후보 B · 그레이 · 32km', ''].map((h, i) => (
                <div key={i} style={{
                  padding: '8px 12px', background: FM.bgAlt,
                  borderBottom: `1px solid ${FM.lineSoft}`,
                  borderRight: i < 3 ? `1px solid ${FM.lineSoft}` : 'none',
                  fontSize: 11.5, fontWeight: 700, color: FM.ink,
                }}>{h}</div>
              ))}
              {compareRows.map((r, ri) => (
                <React.Fragment key={ri}>
                  <div style={{ padding: '10px 12px', borderBottom: ri < compareRows.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12, fontWeight: 600, color: FM.ink }}>{r.k}</div>
                  <div style={{ padding: '10px 12px', borderBottom: ri < compareRows.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12.5, color: FM.inkSoft, lineHeight: 1.55 }}>{r.a}</div>
                  <div style={{ padding: '10px 12px', borderBottom: ri < compareRows.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12.5, color: ri === 2 ? FM.warningInk : FM.inkSoft, lineHeight: 1.55, fontWeight: ri === 2 ? 600 : 400 }}>{r.b}</div>
                  <div style={{ padding: '8px 10px', borderBottom: ri < compareRows.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {ri === 2 && <Badge tone="warn">보류 후보</Badge>}
                  </div>
                </React.Fragment>
              ))}
            </div>
            <button style={{
              marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 10px', background: 'transparent', border: `1px dashed ${FM.line}`,
              borderRadius: 6, color: FM.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Icon name="plus" size={12}/> 후보 추가
            </button>
          </ArtifactCard>

          {/* Secondary: field checklist */}
          <ArtifactCard
            eye="현장 체크 · secondary"
            title="인수 현장에서 한 줄씩 확인"
            desc="딜러 앞에서 휴대폰으로 보면서 체크. 미확인 항목이 있으면 사인 보류."
            exports={[
              { icon: 'copy',  label: '체크리스트 복사' },
              { icon: 'sheet', label: '시트로 받기' },
            ]}
            mainTone="primarySoft"
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {onSite.map((t, i) => (
                <label key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 8px',
                  borderBottom: i < onSite.length - 2 ? `1px solid ${FM.lineSoft}` : 'none',
                  borderRight: i % 2 === 0 ? `1px solid ${FM.lineSoft}` : 'none',
                }}>
                  <input type="checkbox" className="fm-check" defaultChecked={i < 2}/>
                  <span style={{ fontSize: 12.5, color: FM.ink, fontWeight: 500 }}>{t}</span>
                </label>
              ))}
            </div>
          </ArtifactCard>
        </div>

        {/* right rail */}
        <div style={{ display: 'grid', gap: 12, position: 'sticky', top: 76 }}>
          {/* Memo card — close to the decision moment */}
          <Card padding={14}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: FM.warning, letterSpacing: '0.04em', textTransform: 'uppercase' }}>구매 보류 메모</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: FM.ink, marginTop: 2 }}>인수 전 확인할 4가지</div>
              </div>
              <Btn variant="dark" size="sm" icon={<Icon name="memo" size={13}/>}>메모로 복사</Btn>
            </div>
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              {fieldMemo.map(f => (
                <div key={f.id} style={{ display: 'grid', gap: 4 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: FM.inkSoft }}>{f.label}</div>
                  <input className="fm-mono" defaultValue={f.id === 'q2' ? '8 km' : ''} placeholder="현장에서 작성" style={{
                    border: `1px solid ${FM.line}`, borderRadius: 6, padding: '6px 8px',
                    background: FM.bgAlt, fontSize: 11.5, color: FM.ink,
                  }}/>
                </div>
              ))}
            </div>
          </Card>

          <CautionPanel
            tone="warn"
            title="보류·중단 조건"
            body="계기판 주행거리가 100km 이상이거나, 외관에 판금·도색 흔적이 의심되면 인수 사인을 보류하고 영업소에 ‘인수 보류 신청서’를 요청하세요. 사인 후엔 보상 기준이 바뀝니다."
          />

          <SourcePanel
            lastChecked="2026.05.20"
            items={[
              { type: 'experience', title: '신차 인수 후기 12건', url: '@kr-car-handover' },
              { type: 'official',   title: '자동차관리법 인수 규정', url: 'law.go.kr' },
            ]}
          />

          <FootprintBar counts={{ view: 642, copy: 218, check: 184, stuck: 24 }}/>
        </div>
      </div>
    </DesktopFrame>
  );
}

// ╔════════════════════════════════════════════════════════════╗
// ║ C) Empty/error — anchor missing                            ║
// ╚════════════════════════════════════════════════════════════╝
function ScreenEmpty() {
  return (
    <DesktopFrame>
      <MetaRow
        category="이사" dot={FM.cat.moving}
        structure="timeline · D-Day" anchorLabel="앵커: 이사일"
        source="제작자 경험 + 공식 확인"
        draft="초안 깃발 · Stage 0 검증용"
        lastChecked="2026.05.18"
      />
      <h1 style={{ margin: '14px 0 6px', fontSize: 28, fontWeight: 700, color: FM.ink, letterSpacing: '-0.025em', lineHeight: 1.2 }}>
        이사 D-30 준비 캘린더
      </h1>
      <div style={{ fontSize: 14, color: FM.inkSoft, lineHeight: 1.6, maxWidth: 680 }}>
        이사일을 넣으면 견적·신고·이전·전입까지 30일 일정이 캘린더와 체크리스트로 자동으로 들어옵니다.
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', background: '#FFF7E8',
          border: `1px solid #EAD9A3`, borderRadius: 8,
        }}>
          <Icon name="alert" size={16} color={FM.warningInk}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: FM.warningInk }}>앵커가 비어 있어요</div>
            <div style={{ fontSize: 12, color: FM.warningInk, opacity: 0.85 }}>
              캘린더로 보내려면 이사일이 필요해요. 아래 ‘이사일 입력’에 날짜를 넣으면 산출물이 즉시 채워져요.
            </div>
          </div>
          <Btn variant="dark" size="sm" icon={<Icon name="calendar" size={13}/>} className="fm-pulse">이사일 입력</Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginTop: 18, alignItems: 'start' }}>
        <Card padding={20} tone="bg" style={{ minHeight: 380 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FM.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>이사 캘린더 · placeholder</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: FM.ink, marginTop: 2 }}>이사일을 넣으면 7월 일정이 여기로 들어와요</div>

          <div className="fm-stripe" style={{
            marginTop: 16, height: 240, borderRadius: 6,
            display: 'grid', placeItems: 'center', color: FM.muted, fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em',
          }}>
            CALENDAR · WAITING FOR ANCHOR
          </div>

          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              ['D-30', '이사업체 견적'],
              ['D-14', '인터넷 이전'],
              ['D-Day', '이사 당일'],
            ].map(([d, t]) => (
              <Card key={d} padding={10}>
                <div className="fm-mono" style={{ fontSize: 11, fontWeight: 600, color: FM.faint }}>{d}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: FM.faint, marginTop: 4 }}>{t}</div>
              </Card>
            ))}
          </div>

          <div style={{ marginTop: 16, fontSize: 11.5, color: FM.muted, lineHeight: 1.6 }}>
            * 미리보기를 보고 싶다면 아무 날짜나 넣어도 됩니다. 본인 이사일이 정해진 뒤에 다시 바꾸세요.
          </div>
        </Card>

        <div style={{ display: 'grid', gap: 12 }}>
          <Card padding={14}>
            <div style={{ fontSize: 12, fontWeight: 700, color: FM.ink }}>이 Flow가 만드는 것</div>
            <div style={{ marginTop: 8, display: 'grid', gap: 6, fontSize: 12, color: FM.inkSoft, lineHeight: 1.55 }}>
              <div>· 월간 이사 캘린더 (.ics)</div>
              <div>· 체크 가능한 실행 리스트</div>
              <div>· 시트로 받을 수 있는 진행표</div>
            </div>
          </Card>

          <SourcePanel
            lastChecked="2026.05.18"
            items={[
              { type: 'official', title: '전입신고 안내', url: 'gov.kr/portal/' },
            ]}
          />
        </div>
      </div>
    </DesktopFrame>
  );
}

Object.assign(window, { ScreenMoving, ScreenCarDelivery, ScreenEmpty });
