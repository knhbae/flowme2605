// FlowMe — design tokens + small primitives
// Tokens follow design.md exactly:
//   bg #F8F7F4 · surface #FFF · ink #1F2933 · muted #6B7280 · line #E5E7EB
//   primary #2563EB · warning #A16207 · success #15803D · danger #B91C1C
//   category accents: moving #1264F0, parenting #A16207, finance/health #0F766E, …
//
// The product is a workbench, not a marketing site — these primitives stay
// quiet on purpose. Buttons read like document actions; badges are tight.

const FM = {
  // surfaces
  page:    '#F4F2EC',   // canvas around the document
  bg:      '#F8F7F4',   // document background
  bgAlt:   '#FAFAF8',   // inner card surface
  card:    '#FFFFFF',
  // ink
  ink:     '#1F2933',
  inkSoft: '#374151',
  muted:   '#6B7280',
  faint:   '#9AA1AB',
  line:    '#E5E7EB',
  lineSoft:'#EFEDE6',
  // semantic
  primary:    '#2563EB',
  primaryBg:  '#EAF1FE',
  primaryInk: '#1E3A8A',
  warning:    '#A16207',
  warningBg:  '#FDF6E3',
  warningInk: '#7C4A06',
  success:    '#15803D',
  successBg:  '#E7F5EC',
  danger:     '#B91C1C',
  dangerBg:   '#FCEAEA',
  // categories
  cat: {
    moving:    '#1264F0',
    wedding:   '#6D28D9',
    travel:    '#15803D',
    parenting: '#A16207',
    workout:   '#B91C1C',
    finance:   '#0F766E',
  },
};

// ─── icons — monoline, document-friendly ─────────────────────
function Icon({ name, size = 16, color = 'currentColor', sw = 1.6 }) {
  const s = { width: size, height: size, display: 'block', flexShrink: 0 };
  const p = { fill: 'none', stroke: color, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'check':    return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M5 12.5L10 17l9-10"/></svg>;
    case 'copy':     return <svg viewBox="0 0 24 24" style={s}><rect x="9" y="9" width="11" height="11" rx="2" {...p}/><path {...p} d="M5 15V6a2 2 0 012-2h9"/></svg>;
    case 'download': return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M12 4v12M7 11l5 5 5-5M5 20h14"/></svg>;
    case 'calendar': return <svg viewBox="0 0 24 24" style={s}><rect x="3" y="5" width="18" height="16" rx="2" {...p}/><path {...p} d="M3 10h18M8 3v4M16 3v4"/></svg>;
    case 'sheet':    return <svg viewBox="0 0 24 24" style={s}><rect x="3" y="3" width="18" height="18" rx="2" {...p}/><path {...p} d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>;
    case 'memo':     return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M5 4h11l3 3v13a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"/><path {...p} d="M8 11h8M8 15h5"/></svg>;
    case 'list':     return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M8 6h13M8 12h13M8 18h13M4 6h.01M4 12h.01M4 18h.01"/></svg>;
    case 'link':     return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1"/></svg>;
    case 'info':     return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="9" {...p}/><path {...p} d="M12 11v6M12 7.5v.5"/></svg>;
    case 'alert':    return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M12 4l10 17H2L12 4z"/><path {...p} d="M12 11v4M12 18v.5"/></svg>;
    case 'flag':     return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M5 3v18M5 4h12l-2 4 2 4H5"/></svg>;
    case 'edit':     return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M4 20l4-1 12-12-3-3L5 16l-1 4z"/></svg>;
    case 'chev':     return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M9 6l6 6-6 6"/></svg>;
    case 'chev-d':   return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M6 9l6 6 6-6"/></svg>;
    case 'arrow':    return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case 'plus':     return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M12 5v14M5 12h14"/></svg>;
    case 'close':    return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'search':   return <svg viewBox="0 0 24 24" style={s}><circle cx="11" cy="11" r="7" {...p}/><path {...p} d="M21 21l-4.3-4.3"/></svg>;
    case 'menu':     return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M4 7h16M4 12h16M4 17h16"/></svg>;
    case 'share':    return <svg viewBox="0 0 24 24" style={s}><circle cx="6" cy="12" r="2.5" {...p}/><circle cx="18" cy="6" r="2.5" {...p}/><circle cx="18" cy="18" r="2.5" {...p}/><path {...p} d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/></svg>;
    case 'help':     return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="9" {...p}/><path {...p} d="M9.5 9.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5M12 17v.5"/></svg>;
    case 'foot':     return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M9 18s-2-2-2-5 1.5-6 4-6 4 2.5 4 5.5S13 18 13 18M5 13a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM7 8a1 1 0 100-2 1 1 0 000 2zM10 5a1 1 0 100-2 1 1 0 000 2zM14 5.5a1 1 0 100-2 1 1 0 000 2z"/></svg>;
    case 'flow':     return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M4 7c2 0 2 3 5 3s3-3 6-3 3 3 5 3M4 14c2 0 2 3 5 3s3-3 6-3 3 3 5 3"/></svg>;
    default: return null;
  }
}

// ─── Badge — tight, document-style label ─────────────────────
function Badge({ tone = 'neutral', icon, children }) {
  const tones = {
    neutral: { bg: '#F1EFE8', fg: '#374151', bd: '#E5E1D6' },
    blue:    { bg: FM.primaryBg, fg: FM.primaryInk, bd: '#CFDEFA' },
    warn:    { bg: FM.warningBg, fg: FM.warningInk, bd: '#EAD9A3' },
    danger:  { bg: FM.dangerBg, fg: FM.danger, bd: '#F2C2C2' },
    success: { bg: FM.successBg, fg: FM.success, bd: '#C6E1CF' },
    draft:   { bg: '#FFF7E8', fg: '#7C4A06', bd: '#EAD9A3' },
    outline: { bg: 'transparent', fg: FM.muted, bd: FM.line },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 7px', borderRadius: 4,
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
      fontSize: 11, fontWeight: 600, letterSpacing: '-0.005em',
      lineHeight: 1.5, whiteSpace: 'nowrap',
    }}>
      {icon}{children}
    </span>
  );
}

// ─── Button — primary / outline / ghost / destination ────────
function Btn({ children, variant = 'primary', size = 'md', icon, full, style = {}, onClick }) {
  const sizes = {
    sm: { padding: '6px 10px', fontSize: 12, height: 30, gap: 5, radius: 6 },
    md: { padding: '8px 14px', fontSize: 13, height: 36, gap: 6, radius: 7 },
    lg: { padding: '11px 18px', fontSize: 14, height: 44, gap: 8, radius: 8 },
  };
  const variants = {
    primary:     { bg: FM.primary, fg: '#fff', bd: FM.primary },
    primarySoft: { bg: FM.primaryBg, fg: FM.primaryInk, bd: '#CFDEFA' },
    dark:        { bg: FM.ink, fg: '#fff', bd: FM.ink },
    outline:     { bg: FM.card, fg: FM.ink, bd: '#D9D6CE' },
    ghost:       { bg: 'transparent', fg: FM.inkSoft, bd: 'transparent' },
    danger:      { bg: FM.card, fg: FM.danger, bd: '#F2C2C2' },
  };
  const s = sizes[size], v = variants[variant];
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: s.gap, padding: s.padding, height: s.height,
      background: v.bg, color: v.fg, border: `1px solid ${v.bd}`,
      borderRadius: s.radius, fontFamily: 'inherit', fontWeight: 600,
      fontSize: s.fontSize, letterSpacing: '-0.005em',
      cursor: 'pointer', width: full ? '100%' : 'auto',
      ...style,
    }}>
      {icon}<span>{children}</span>
    </button>
  );
}

// ─── Card — neutral document surface ─────────────────────────
function Card({ children, style = {}, padding = 16, tone = 'card' }) {
  const tones = {
    card:  { bg: FM.card,   bd: FM.line },
    bg:    { bg: FM.bgAlt,  bd: FM.line },
    blue:  { bg: '#F4F8FE', bd: '#CFDEFA' },
    warn:  { bg: FM.warningBg, bd: '#EAD9A3' },
  };
  const t = tones[tone] || tones.card;
  return (
    <div style={{
      background: t.bg, border: `1px solid ${t.bd}`,
      borderRadius: 8, padding,
      ...style,
    }}>{children}</div>
  );
}

// ─── Section header — small eyebrow + title ──────────────────
function SecHead({ eye, title, right, mt = 0 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: mt }}>
      <div>
        {eye && <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>{eye}</div>}
        <div style={{ fontSize: 15, fontWeight: 700, color: FM.ink, letterSpacing: '-0.015em' }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

Object.assign(window, { FM, Icon, Badge, Btn, Card, SecHead });
