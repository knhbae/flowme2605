'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import { ALPHA_AUTH_STORAGE_KEY, readAlphaCallback, type AlphaAuthConfig } from '@/lib/flow/integrated-poc/alpha-auth/config';
import { getAlphaBrowserClient } from '@/lib/flow/integrated-poc/alpha-auth/browser-client';
import { isConfirmedAlphaLogout } from '@/lib/flow/integrated-poc/alpha-auth/logout';
import { updateAlphaRecoveryPassword } from '@/lib/flow/integrated-poc/alpha-auth/recovery-password';
import { createAlphaAccountAccess, createAlphaSessionBoundary, type AlphaSessionView, type VerifiedAlphaSession } from '@/lib/flow/integrated-poc/alpha-auth/account-access';
import styles from './AlphaAuthPanel.module.css';
import { AlphaWorkspace } from './AlphaWorkspace';

type Mode = 'login' | 'signup' | 'reset' | 'new-password';
type CallbackPhase = 'pending' | 'failed' | 'ready';
type CallbackOutcome = { session: Session; recovery: boolean } | null;
const callbackFailure = '로그인 링크를 확인하지 못했습니다. 이메일을 요청한 브라우저의 같은 프로필에서 최신 링크를 열어 주세요.';
const logoutKey = `${ALPHA_AUTH_STORAGE_KEY}-logout-pending`;
const recoveryKey = `${ALPHA_AUTH_STORAGE_KEY}-recovery-owner`;
const initial: AlphaSessionView = { ownerId: null, account: null, status: 'signed-out' };
const headings: Record<Mode, string> = { login: '로그인', signup: '이메일로 가입', reset: '비밀번호 찾기', 'new-password': '새 비밀번호 설정' };
const statuses: Partial<Record<AlphaSessionView['status'], string>> = {
  checking: '계정 확인 중…', 'session-expired': '로그인을 다시 확인해 주세요. 개인 자료는 숨겼습니다.',
  unavailable: '서버에 연결하지 못했습니다. 다시 확인해 주세요.', invalid: '계정 자료를 확인하지 못해 열지 않았습니다.',
};
function authError(code?: string) {
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') return '요청이 많습니다. 잠시 후 다시 시도해 주세요.';
  if (code === 'email_not_confirmed') return '이메일의 확인 링크를 먼저 열어 주세요.';
  if (code === 'email_address_not_authorized') return '개발계 이메일 발송 설정이 필요합니다. 관리자에게 알려 주세요.';
  if (code === 'invalid_credentials') return '이메일과 비밀번호를 확인해 주세요.';
  return '요청을 완료하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.';
}

export function AlphaAuthPanel({ config, callback = false }: { config: AlphaAuthConfig | null; callback?: boolean }) {
  const [view, setView] = useState(initial), [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [ready, setReady] = useState(false);
  const [google, setGoogle] = useState(false), [accountEmail, setAccountEmail] = useState(''), [logoutPending, setLogoutPending] = useState(false);
  const [callbackPhase, setCallbackPhase] = useState<CallbackPhase>(callback ? 'pending' : 'ready');
  const callbackGate = useRef<CallbackPhase>(callback ? 'pending' : 'ready');
  const [recoveryBlocked, setRecoveryBlocked] = useState(false);
  const [workspaceSession, setWorkspaceSession] = useState<VerifiedAlphaSession | null>(null);
  const [workspaceOwner, setWorkspaceOwner] = useState<string | null>(null);
  const client = useRef<SupabaseClient | null>(null), boundary = useRef<ReturnType<typeof createAlphaSessionBoundary> | null>(null);
  const epoch = useRef(0), suppressSession = useRef(false), mounted = useRef(false);
  const acceptedOwner = useRef<string | null>(null), recoveringOwner = useRef<string | null>(null);
  const acceptedSession = useRef<VerifiedAlphaSession | null>(null);
  const callbackAttempt = useRef<Promise<CallbackOutcome> | null>(null);
  const callbackRecoveryToken = useRef<string | null>(null);
  const logoutToken = useRef<string | null>(null);

  useEffect(() => {
    if (!config) return;
    mounted.current = true;
    let disposed = false, unsubscribe = () => {};
    const connection = createAlphaSessionBoundary(next => { if (!disposed) {
      setView(next);
      if (next.status === 'ready') setWorkspaceOwner(next.ownerId);
    } });
    boundary.current = connection;
    try {
      const sdk = getAlphaBrowserClient(config); client.current = sdk;
      try { suppressSession.current = localStorage.getItem(logoutKey) === '1'; }
      catch { suppressSession.current = true; setMessage('브라우저 저장소를 읽지 못했습니다. 개인 자료를 열지 않았습니다.'); }
      setLogoutPending(suppressSession.current);
      const accept = (session: Session | null, recovery = false) => {
        // An existing session is not proof that this particular link succeeded.
        // Keep it in SDK storage, but do not bind/load it on a closed callback.
        if (disposed || callbackGate.current !== 'ready') return;
        if (session && (!suppressSession.current || !logoutToken.current)) logoutToken.current = session.access_token;
        else if (!session && !suppressSession.current) logoutToken.current = null;
        // Hide the previous owner before any storage/network operation can throw.
        const nextOwner = !suppressSession.current && session && !session.user.is_anonymous ? session.user.id : null;
        const ownerChanged = nextOwner !== acceptedOwner.current;
        acceptedSession.current = null;
        if (ownerChanged || !nextOwner) { connection.bind(null, null); setWorkspaceSession(null); setWorkspaceOwner(null); }
        if (nextOwner !== acceptedOwner.current) {
          epoch.current++; setPassword(''); setConfirm(''); setEmail(''); setBusy(false);
          recoveringOwner.current = null;
        }
        acceptedOwner.current = nextOwner;
        if (!nextOwner || !session) { setAccountEmail(''); return; }
        const ownerId = session.user.id;
        acceptedSession.current = { userId: ownerId, accessToken: session.access_token };
        setWorkspaceSession(acceptedSession.current);
        setAccountEmail(session.user.email ?? '로그인한 계정');
        if (recovery) recoveringOwner.current = ownerId;
        try {
          if (recovery) localStorage.setItem(recoveryKey, ownerId);
          if (localStorage.getItem(recoveryKey) === ownerId) recoveringOwner.current = ownerId;
        } catch { setMessage('브라우저에 복구 상태를 보관하지 못했습니다. 이 화면에서 작업을 마쳐 주세요.'); }
        if (ownerChanged || recovery) setMode(recoveringOwner.current === ownerId ? 'new-password' : 'login');
        // Same-owner token refresh must not unmount unsaved personal editors.
        // The workspace rebinds its fixed-token adapter and re-verifies on read.
        if (!ownerChanged && connection.snapshot().status === 'ready') return;
        connection.bind(ownerId, createAlphaAccountAccess(config, { userId: ownerId, accessToken: session.access_token }));
        // Auth event handlers must not await other auth methods (SDK lock/re-entrancy).
        queueMicrotask(() => { if (!disposed) void connection.load(); });
      };
      const subscription = sdk.auth.onAuthStateChange((event, session) => {
        // Use the public recovery event, bound to the exact exchanged session.
        // The SDK's internal redirectType is not part of its public return type.
        if (callbackGate.current === 'pending' && event === 'PASSWORD_RECOVERY') callbackRecoveryToken.current = session?.access_token ?? null;
        if (event === 'USER_UPDATED' && session?.user.id === connection.snapshot().ownerId) return;
        accept(session, event === 'PASSWORD_RECOVERY');
      });
      unsubscribe = () => subscription.data.subscription.unsubscribe();
      void (async () => {
        if (callback) {
          if (!callbackAttempt.current) {
            const value = readAlphaCallback(window.location.href, config);
            // The promise survives StrictMode's effect replay; the code is exchanged only once.
            window.history.replaceState(null, '', '/auth/callback');
            callbackAttempt.current = value ? sdk.auth.exchangeCodeForSession(value.code, value.flowId ? { flowId: value.flowId } : undefined)
              .then(result => !result.error && result.data.session && !result.data.session.user.is_anonymous
                ? { session: result.data.session, recovery: callbackRecoveryToken.current === result.data.session.access_token } : null)
              .catch(() => null) : Promise.resolve(null);
          }
          const outcome = await callbackAttempt.current;
          if (disposed) return;
          callbackGate.current = outcome ? 'ready' : 'failed';
          callbackRecoveryToken.current = null;
          setCallbackPhase(callbackGate.current);
          if (outcome) {
            // PASSWORD_RECOVERY is emitted before exchange resolves. Replay the
            // verified result explicitly, including across StrictMode replay.
            accept(outcome.session, outcome.recovery);
            window.history.replaceState(null, '', '/alpha');
          }
        }
        if (!disposed) setReady(true);
      })().catch(() => { if (!disposed) {
        if (callback) { callbackGate.current = 'failed'; setCallbackPhase('failed'); connection.bind(null, null); }
        setReady(true); setMessage('로그인 확인 중 연결이 끊겼습니다. 다시 시도해 주세요.');
      } });
      void fetch(`${config.url}/auth/v1/settings`, { headers: { apikey: config.publishableKey }, cache: 'no-store', redirect: 'error' })
        .then(async response => response.ok ? response.json() : null).then(settings => { if (!disposed) setGoogle(settings?.external?.google === true); }).catch(() => {});
    } catch {
      if (callback) { callbackGate.current = 'failed'; setCallbackPhase('failed'); }
      setMessage('개발 설정 또는 브라우저 저장소를 확인해 주세요. 서버 연결을 시작하지 않았습니다.');
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === logoutKey && event.newValue === '1') {
        suppressSession.current = true; setLogoutPending(true); connection.bind(null, null); setWorkspaceOwner(null); setWorkspaceSession(null); setAccountEmail(''); setPassword(''); setConfirm(''); epoch.current++;
      }
      if (event.key === logoutKey && event.newValue === null) { suppressSession.current = false; setLogoutPending(false); }
    };
    window.addEventListener('storage', onStorage);
    return () => { disposed = true; mounted.current = false; epoch.current++; connection.bind(null, null); unsubscribe(); window.removeEventListener('storage', onStorage); };
  }, [config, callback]);

  function changeMode(next: Mode) { epoch.current++; setMode(next); setMessage(''); setPassword(''); setConfirm(''); setBusy(false); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); const sdk = client.current;
    if (!sdk || !config || busy || !ready || logoutPending || recoveryBlocked || callbackGate.current !== 'ready') return;
    if (mode === 'new-password' && (!view.ownerId || recoveringOwner.current !== view.ownerId)) return;
    if ((mode === 'signup' || mode === 'new-password') && password !== confirm) { setMessage('두 비밀번호가 일치하지 않습니다.'); return; }
    const current = ++epoch.current; setBusy(true); setMessage('');
    try {
      if (mode === 'new-password') {
        const session = acceptedSession.current;
        const isCurrent = () => {
          const stored = JSON.parse(localStorage.getItem(ALPHA_AUTH_STORAGE_KEY) ?? 'null');
          return mounted.current && epoch.current === current && !suppressSession.current && localStorage.getItem(logoutKey) !== '1'
            && !!session && view.ownerId === session.userId && acceptedOwner.current === session.userId
            && recoveringOwner.current === session.userId && stored?.user?.id === session.userId;
        };
        const result = session ? await updateAlphaRecoveryPassword(config, session, password, isCurrent)
          : { ok: false as const, reason: 'context-changed' as const };
        if (!mounted.current || epoch.current !== current) return;
        setPassword(''); setConfirm('');
        if (!result.ok) {
          if (result.reason === 'context-changed') {
            setRecoveryBlocked(true); acceptedSession.current = null; boundary.current?.bind(null, null); setAccountEmail('');
          } else setMessage(authError(result.code));
          return;
        }
        recoveringOwner.current = null; setMode('login'); setMessage('비밀번호를 변경했습니다.');
        try { if (localStorage.getItem(recoveryKey) === session?.userId) localStorage.removeItem(recoveryKey); }
        catch { setMessage('비밀번호는 변경했습니다. 브라우저의 복구 상태를 지우지 못해 다음 로그인에서 다시 확인할 수 있습니다.'); }
        return;
      }
      const result = mode === 'signup' ? await sdk.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: config.redirectUrl } })
        : mode === 'reset' ? await sdk.auth.resetPasswordForEmail(email.trim(), { redirectTo: config.redirectUrl })
        : await sdk.auth.signInWithPassword({ email: email.trim(), password });
      // Auth success may change the generation. Never render old form results into the new account.
      if (!mounted.current || epoch.current !== current) return;
      setPassword(''); setConfirm('');
      if (result.error) setMessage(authError(result.error.code));
      else if (mode === 'signup' || mode === 'reset') setMessage('이메일이 발송 가능한 계정이면 확인 링크가 도착합니다. 요청한 브라우저에서 열어 주세요.');
    } catch { if (mounted.current && epoch.current === current) setMessage(authError()); }
    finally { if (mounted.current && epoch.current === current) setBusy(false); }
  }
  async function signOut() {
    if (!client.current || busy) return;
    epoch.current++; suppressSession.current = true; setBusy(true); setLogoutPending(true); setMessage('');
    setPassword(''); setConfirm(''); setAccountEmail(''); setWorkspaceSession(null); setWorkspaceOwner(null); boundary.current?.bind(null, null);
    let durableMarker = false;
    try { localStorage.setItem(logoutKey, '1'); durableMarker = true; } catch { /* Still attempt server revocation. */ }
    try {
      const stored = await client.current.auth.getSession();
      const tokenToRevoke = stored.data.session?.access_token ?? logoutToken.current;
      if (tokenToRevoke && config) {
        // Revoke before SDK cleanup: this SDK also drops its local session on
        // a server 500, which would otherwise lose reload-safe retry credentials.
        // The closed marker prevents the retained session from showing any data.
        const revoked = await fetch(`${config.url}/auth/v1/logout?scope=local`, { method: 'POST',
          headers: { apikey: config.publishableKey, Authorization: `Bearer ${tokenToRevoke}` },
          cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000) });
        if (!await isConfirmedAlphaLogout(revoked)) { setMessage('로그아웃을 서버에서 확인하지 못했습니다. 개인 자료는 숨겼습니다. 다시 시도해 주세요.'); return; }
      }
      // Server revocation is confirmed above. Remove only the active persisted
      // session before SDK cleanup, so it broadcasts SIGNED_OUT without sending
      // the already-revoked token a second time (the real server returns 403).
      // A storage failure keeps the closed marker and follows the retry path.
      localStorage.removeItem(ALPHA_AUTH_STORAGE_KEY);
      const result = await client.current.auth.signOut({ scope: 'local' });
      if (!mounted.current) return;
      if (result.error) { setMessage('로그아웃을 서버에서 확인하지 못했습니다. 개인 자료는 숨겼습니다. 다시 시도해 주세요.'); return; }
      localStorage.removeItem(recoveryKey); localStorage.removeItem(logoutKey);
      acceptedOwner.current = null; recoveringOwner.current = null;
      logoutToken.current = null;
      suppressSession.current = false; setLogoutPending(false); setMode('login'); setMessage('로그아웃했습니다.');
    } catch { if (mounted.current) setMessage('로그아웃을 완료하지 못했습니다. 연결과 저장소를 확인해 주세요.'); }
    finally {
      if (suppressSession.current) {
        // Keep the SDK's browser-managed refresh/visibility lifecycle intact.
        // A closed marker blocks account reads even if a token is refreshed.
        // With a durable closed marker, retain the SDK session solely for an
        // actual server-revocation retry, including after reload. If the marker
        // could not be stored, remove restorable credentials instead.
        if (!durableMarker) try { localStorage.removeItem(ALPHA_AUTH_STORAGE_KEY); localStorage.removeItem(`${ALPHA_AUTH_STORAGE_KEY}-user`); } catch { /* UI stays closed with a retry action. */ }
      }
      if (mounted.current) setBusy(false);
    }
  }
  async function signInGoogle() {
    if (!client.current || !config || busy || !ready || logoutPending || callbackGate.current !== 'ready') return;
    setBusy(true); setMessage('');
    try { const result = await client.current.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: config.redirectUrl } }); if (result.error) setMessage(authError(result.error.code)); }
    catch { setMessage(authError()); } finally { if (mounted.current) setBusy(false); }
  }
  const signedIn = !!view.ownerId && !logoutPending;
  if (config && workspaceSession && workspaceOwner === workspaceSession.userId && signedIn
    && mode !== 'new-password' && !recoveryBlocked && callbackPhase === 'ready') {
    return <AlphaWorkspace key={workspaceSession.userId} config={config} session={workspaceSession} email={accountEmail} onSignOut={signOut} />;
  }
  return <main className={styles.page}>
    <header className={styles.header}><a href="/alpha" className={styles.brand}>FlowMe</a><span>개발계 · 로그인 검증</span></header>
    <section className={styles.panel} aria-labelledby="alpha-heading">
      {!config ? <><h1 id="alpha-heading">개발계 연결이 꺼져 있습니다</h1><p>설정된 개발 환경에서만 로그인할 수 있습니다. 기존 개인공간에는 영향을 주지 않습니다.</p></>
        : logoutPending ? <><h1 id="alpha-heading">로그아웃 확인이 필요합니다</h1><button disabled={busy} onClick={() => void signOut()}>로그아웃 다시 시도</button></>
        : recoveryBlocked ? <>
          <h1 id="alpha-heading">로그인 상태가 바뀌었습니다</h1>
          <p role="status">비밀번호 변경 화면을 닫았습니다. 현재 계정을 확인한 뒤 다시 시도해 주세요.</p>
          <a className={styles.returnLink} href="/alpha">현재 계정 확인</a>
        </>
        : callbackPhase !== 'ready' ? <>
          <h1 id="alpha-heading">{callbackPhase === 'pending' ? '이메일 링크 확인 중…' : '이메일 링크 확인 실패'}</h1>
          <p role="status" aria-live="polite">{callbackPhase === 'pending' ? '확인을 마칠 때까지 잠시 기다려 주세요.' : callbackFailure}</p>
          {callbackPhase === 'failed' && <a className={styles.returnLink} href="/alpha">FlowMe로 돌아가기</a>}
        </>
        : signedIn && mode !== 'new-password' ? <>
          <h1 id="alpha-heading">내 계정</h1><p className={styles.identity}>{accountEmail}</p>
          {view.status === 'new-account' && <><h2>아직 개인공간이 없습니다</h2><p>이 계정의 빈 개인공간을 만듭니다. 이 브라우저의 기존 PoC 자료는 가져오지 않습니다.</p><button onClick={() => void boundary.current?.load(true)}>빈 개인공간 만들기</button></>}
          {view.status === 'ready' && <><h2>개인공간 연결을 확인했습니다</h2><button className={styles.secondary} onClick={() => void boundary.current?.load()}>개인공간 열기</button></>}
          {['unavailable', 'invalid', 'session-expired'].includes(view.status) && <button onClick={() => void boundary.current?.load()}>계정 다시 확인</button>}
          <button className={styles.secondary} disabled={busy} onClick={() => void signOut()}>로그아웃 · 계정 바꾸기</button>
        </> : <>
          <h1 id="alpha-heading">{headings[mode]}</h1>
          <p>계정과 서버 접근을 확인하는 개발 화면입니다. 실제 개인 자료는 아직 넣지 마세요.</p>
          {google && mode === 'login' && <button className={styles.secondary} disabled={!ready || busy} onClick={() => void signInGoogle()}>Google로 계속</button>}
          <form onSubmit={event => void submit(event)}>
            {mode !== 'new-password' && <label>이메일<input name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={busy} /></label>}
            {mode !== 'reset' && <label>{mode === 'new-password' ? '새 비밀번호' : '비밀번호'}<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'login' ? 1 : 8} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></label>}
            {(mode === 'signup' || mode === 'new-password') && <label>비밀번호 확인<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} disabled={busy} /></label>}
            <button type="submit" disabled={!ready || busy}>{busy ? '확인 중…' : mode === 'reset' ? '복구 이메일 요청' : headings[mode]}</button>
          </form>
          <nav className={styles.actions} aria-label="로그인 방법">
            {mode === 'login' ? <><button className={styles.link} disabled={busy} onClick={() => changeMode('signup')}>이메일로 가입</button><button className={styles.link} disabled={busy} onClick={() => changeMode('reset')}>비밀번호 찾기</button></>
              : mode === 'new-password' ? <button className={styles.link} disabled={busy} onClick={() => void signOut()}>로그아웃</button>
              : <button className={styles.link} disabled={busy} onClick={() => changeMode('login')}>로그인으로 돌아가기</button>}
          </nav>
        </>}
      {(!recoveryBlocked && callbackPhase === 'ready' || logoutPending || !config) && <div className={styles.status} role="status" aria-live="polite">{message || statuses[view.status] || ''}</div>}
      <a className={styles.back} href="/my?personalWorkspacePoc=v1">기존 로컬 PoC 열기 <span>로그인 계정과 별도 저장</span></a>
    </section>
  </main>;
}
