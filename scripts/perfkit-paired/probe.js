// Read-only diagnostics, installed identically in both synthetic pages before app scripts.
(() => {
  const events = [], phases = {}, pending = new Map(), owners = new WeakMap(); let workerSerial = 0, sequence = 0, ackEnd = 0, commits = 0;
  const add = entry => { if (events.length < 6000) events.push(entry); else state.overflow = true; };
  const state = window.__pairedProbe = { events, phases, overflow: false,
    snapshot: () => ({ pending: pending.size, savePending: [...pending.values()].filter(job => job.kind === 'save').length,
      ackQuietMs: performance.now() - ackEnd, commits }) };
  const OriginalWorker = window.Worker, send = OriginalWorker.prototype.postMessage, terminate = OriginalWorker.prototype.terminate;
  window.Worker = new Proxy(OriginalWorker, { construct(target, args) {
    const worker = Reflect.construct(target, args, target), owner = ++workerSerial; owners.set(worker, owner);
    worker.addEventListener('message', event => {
      const data = event.data, identity = data?.identity, local = identity?.requestId ?? (Number.isInteger(data?.generation) ? `recall-${data.generation}` : null);
      if (!local) return; const key = `${owner}:${local}`, job = pending.get(key); if (!job) return;
      pending.delete(key); add({ type: 'worker-reply', seq: job.seq, kind: job.kind, at: performance.now() });
    });
    return worker;
  } });
  OriginalWorker.prototype.postMessage = function (data, ...rest) {
    const local = data?.identity?.requestId ?? (Number.isInteger(data?.generation) && data?.space ? `recall-${data.generation}` : null);
    const key = local ? `${owners.get(this)}:${local}` : null;
    if (key) { const job = { seq: ++sequence, kind: data.payload?.kind ?? 'recall-index' }; pending.set(key, job); add({ type: 'worker-post', ...job, at: performance.now() }); }
    try { return send.call(this, data, ...rest); } catch (error) { if (key) pending.delete(key); throw error; }
  };
  OriginalWorker.prototype.terminate = function (...args) {
    const prefix = `${owners.get(this)}:`;
    for (const [key, job] of pending) if (key.startsWith(prefix)) { pending.delete(key); add({ type: 'worker-cancel', seq: job.seq, kind: job.kind, at: performance.now() }); }
    return terminate.call(this, ...args);
  };
  const observer = new PerformanceObserver(list => {
    for (const item of list.getEntries()) if (item.name.startsWith('flowme-writing:')) {
      const phase = phases[item.name] ??= { count: 0, totalMs: 0, maxMs: 0 };
      phase.count++; phase.totalMs += item.duration; phase.maxMs = Math.max(phase.maxMs, item.duration);
      // Keep receipt handoff timestamps; repeated render/materialization measures are aggregates.
      if (item.name === 'flowme-writing:ack-host-reconcile' || item.name === 'flowme-writing:ack-draft-accept')
        add({ type: 'writing-phase', name: item.name, at: item.startTime, ms: item.duration,
          ownedAck: typeof item.detail?.requestId === 'string' });
      if (item.name.includes('ack-')) ackEnd = Math.max(ackEnd, item.startTime + item.duration);
    }
  }); observer.observe({ entryTypes: ['measure'] });
  if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__) window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true, renderers: new Map(), inject(renderer) { const id = this.renderers.size + 1; this.renderers.set(id, renderer); return id; },
    onCommitFiberRoot() { commits++; },
    onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, onScheduleFiberRoot() {},
  };
})();
