// FlowMe — desktop Flow detail screens
// Two artifact-type variations, plus an empty/error state.
//   A) Timeline calendar  — 이사 D-30 (moving)
//   B) Decision + memo    — 신차 인수 점검 (new car delivery)
//
// Both follow the same skeleton so the visual vocabulary stays consistent.
// Layout: 12-col, 8/4 split. Top is full-width meta + title + anchor + primary.

// ─── small shared bits ───────────────────────────────────────
function TopBar() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '12px 28px', background: FM.bg,
      borderBottom: `1px solid ${FM.line}`, position: 'sticky', top: 0, zIndex: 5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 22, height: 22, borderRadius: 5, background: FM.ink, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12 }}>F</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: FM.ink }}>FlowMe</div>
        <div style={{ fontSize: 12, color: FM.muted, marginLeft: 2 }}>/ flows / 이사 D-30 준비</div>
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 7, width: 280 }}>
        <Icon name="search" size={14} color={FM.faint}/>
        <div style={{ fontSize: 12, color: FM.faint }}>다른 플로우 찾기</div>
      </div>
      <Btn variant="ghost" size="sm" icon={<Icon name="share" size={14}/>}>공유</Btn>
      <Btn variant="outline" size="sm" icon={<Icon name="edit" size={14}/>}>내 버전 만들기</Btn>
    </div>
  );
}

function MetaRow({ category, dot, structure, anchorLabel, source, draft, lastChecked }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: dot, display: 'inline-block' }}/>
        <span style={{ fontSize: 12, fontWeight: 600, color: FM.inkSoft }}>{category}</span>
      </div>
      <span style={{ width: 1, height: 12, background: FM.line }}/>
      <span style={{ fontSize: 12, color: FM.muted, fontWeight: 500 }}>{structure}</span>
      <span style={{ fontSize: 12, color: FM.muted, fontWeight: 500 }}>· {anchorLabel}</span>
      <span style={{ fontSize: 12, color: FM.muted, fontWeight: 500 }}>· {source}</span>
      <div style={{ flex: 1 }}/>
      <Badge tone="draft" icon={<Icon name="flag" size={11}/>}>{draft}</Badge>
      <span style={{ fontSize: 11, color: FM.faint }}>마지막 확인 {lastChecked}</span>
    </div>
  );
}

function AnchorBar({ label, value, hint, applied }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', background: FM.bgAlt,
      border: `1px solid ${FM.line}`, borderRadius: 8,
    }}>
      <div style={{ display: 'grid', gap: 2 }}>
        <div style={{ fontSize: 11, color: FM.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>앵커</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: FM.ink }}>{label}</div>
      </div>
      <div style={{ width: 1, height: 28, background: FM.line }}/>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 7,
        minWidth: 180,
      }}>
        <Icon name="calendar" size={14} color={FM.primary}/>
        <span className="fm-num" style={{ fontSize: 14, fontWeight: 600, color: FM.ink, letterSpacing: '-0.01em' }}>{value}</span>
        <Icon name="chev-d" size={14} color={FM.faint}/>
      </div>
      <div style={{ fontSize: 12, color: FM.muted }}>{hint}</div>
      <div style={{ flex: 1 }}/>
      {applied && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: FM.success, fontWeight: 600 }}>
          <Icon name="check" size={13}/> 산출물에 적용됨
        </div>
      )}
    </div>
  );
}

// ─── Artifact card with destination-named export at top-right ─
function ArtifactCard({ eye, title, desc, exports = [], children, footer, mainTone }) {
  return (
    <Card padding={0} tone="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${FM.lineSoft}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{eye}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: FM.ink, letterSpacing: '-0.015em', marginTop: 2 }}>{title}</div>
            {desc && <div style={{ fontSize: 12.5, color: FM.muted, marginTop: 4, lineHeight: 1.55 }}>{desc}</div>}
          </div>
          {exports.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {exports.map((e, i) => (
                <Btn key={i} variant={i === 0 ? (mainTone || 'primary') : 'outline'} size="sm" icon={<Icon name={e.icon} size={13}/>}>
                  {e.label}
                </Btn>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
      {footer && (
        <div style={{ padding: '10px 16px', borderTop: `1px solid ${FM.lineSoft}`, background: FM.bgAlt }}>
          {footer}
        </div>
      )}
    </Card>
  );
}

// ─── Monthly calendar preview (used in timeline flows) ───────
function CalendarMini({ year, month, items, doneIds = new Set() }) {
  const first = new Date(year, month - 1, 1);
  const startDow = first.getDay();
  const days = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const itemByDay = {};
  items.forEach(it => { (itemByDay[it.day] ||= []).push(it); });
  const W = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="fm-num" style={{ fontSize: 13, fontWeight: 600, color: FM.ink }}>{year}. {String(month).padStart(2, '0')}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={{ width: 24, height: 24, border: `1px solid ${FM.line}`, background: FM.card, borderRadius: 5, cursor: 'pointer', color: FM.muted }}>‹</button>
          <button style={{ width: 24, height: 24, border: `1px solid ${FM.line}`, background: FM.card, borderRadius: 5, cursor: 'pointer', color: FM.muted }}>›</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {W.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10.5, color: i === 0 ? '#C0746A' : i === 6 ? '#5B7BB7' : FM.muted, fontWeight: 600, padding: '4px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((d, i) => {
          const its = d ? (itemByDay[d] || []) : [];
          const has = its.length > 0;
          return (
            <div key={i} style={{
              minHeight: 56, padding: 4,
              background: d ? FM.card : 'transparent',
              border: d ? `1px solid ${FM.lineSoft}` : 'none',
              borderRadius: 5, position: 'relative',
            }}>
              {d && (
                <div className="fm-num" style={{ fontSize: 10.5, fontWeight: 600, color: i % 7 === 0 ? '#C0746A' : FM.inkSoft, lineHeight: 1 }}>{d}</div>
              )}
              <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
                {its.slice(0, 2).map((it, j) => {
                  const done = doneIds.has(it.id);
                  return (
                    <div key={j} style={{
                      fontSize: 9.5, fontWeight: 600,
                      padding: '1px 4px', borderRadius: 3,
                      background: done ? FM.successBg : (it.tone === 'warn' ? FM.warningBg : FM.primaryBg),
                      color: done ? FM.success : (it.tone === 'warn' ? FM.warningInk : FM.primaryInk),
                      textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                      textDecoration: done ? 'line-through' : 'none',
                    }}>{it.label}</div>
                  );
                })}
                {its.length > 2 && <div style={{ fontSize: 9.5, color: FM.faint, fontWeight: 600 }}>+{its.length - 2}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Source / safety side panels ─────────────────────────────
function SourcePanel({ items, lastChecked }) {
  return (
    <Card padding={14}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: FM.ink, letterSpacing: '-0.005em' }}>출처</div>
        <span style={{ fontSize: 10.5, color: FM.faint }}>마지막 확인 {lastChecked}</span>
      </div>
      <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
        {items.map((s, i) => (
          <div key={i} style={{ display: 'grid', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Badge tone={s.type === 'official' ? 'blue' : s.type === 'experience' ? 'neutral' : 'outline'}>
                {s.type === 'official' ? '공식 정보' : s.type === 'experience' ? '제작자 경험' : '사용자 메모'}
              </Badge>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: FM.ink }}>{s.title}</div>
            </div>
            <a style={{ fontSize: 11, color: FM.primary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="link" size={11}/> {s.url}
            </a>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CautionPanel({ title, body, tone = 'warn' }) {
  return (
    <Card padding={14} tone={tone}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Icon name="alert" size={14} color={FM.warningInk}/>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: FM.warningInk }}>{title}</div>
          <div style={{ fontSize: 11.5, color: FM.warningInk, marginTop: 4, lineHeight: 1.55, opacity: 0.9 }}>{body}</div>
        </div>
      </div>
    </Card>
  );
}

function FootprintBar({ counts }) {
  const items = [
    { k: 'view', label: '열람', icon: 'flow' },
    { k: 'copy', label: '복사', icon: 'copy' },
    { k: 'check', label: '체크', icon: 'check' },
    { k: 'stuck', label: '막혔어요', icon: 'help' },
  ];
  return (
    <Card padding={12} tone="bg">
      <div style={{ fontSize: 11, fontWeight: 700, color: FM.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>발자국</div>
      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {items.map(it => (
          <button key={it.k} style={{
            display: 'grid', placeItems: 'center', gap: 4, padding: '8px 6px',
            background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 7, cursor: 'pointer',
          }}>
            <Icon name={it.icon} size={14} color={FM.inkSoft}/>
            <div className="fm-num" style={{ fontSize: 13, fontWeight: 600, color: FM.ink }}>{counts[it.k] ?? 0}</div>
            <div style={{ fontSize: 10.5, color: FM.muted, fontWeight: 500 }}>{it.label}</div>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: FM.faint, marginTop: 8, lineHeight: 1.5 }}>
        Stage 0 검증용. 실제 사용 데이터가 충분히 쌓이기 전엔 “검증됨”으로 표시하지 않아요.
      </div>
    </Card>
  );
}

function FeedbackBlock() {
  const tags = ['일정 너무 빡빡', '단계가 빠짐', '내 상황과 다름', '출처가 옛날', '용어가 어려움'];
  return (
    <Card padding={14}>
      <div style={{ fontSize: 12, fontWeight: 700, color: FM.ink }}>이 산출물이 내 상황에 맞나요?</div>
      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {tags.map(t => (
          <button key={t} style={{
            padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 500,
            background: FM.card, border: `1px solid ${FM.line}`, color: FM.inkSoft, cursor: 'pointer',
          }}>{t}</button>
        ))}
      </div>
      <textarea placeholder="어떤 부분이 안 맞았어요? (예: 인터넷 이전 D-14는 너무 늦었어요)" style={{
        marginTop: 10, width: '100%', minHeight: 64,
        border: `1px solid ${FM.line}`, borderRadius: 7, padding: 10,
        background: FM.bgAlt, fontFamily: 'inherit', fontSize: 12.5, color: FM.ink, resize: 'none',
      }}/>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="dark" size="sm">막힌 부분 남기기</Btn>
      </div>
    </Card>
  );
}

Object.assign(window, {
  TopBar, MetaRow, AnchorBar, ArtifactCard, CalendarMini,
  SourcePanel, CautionPanel, FootprintBar, FeedbackBlock,
});
