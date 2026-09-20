(function runP3H1DeviceRecorder() {
  'use strict';

  const model = window.P3H1EvidenceModel;
  if (!model) throw new Error('P3-H1 evidence model did not load.');

  const POC_PREFIX = 'flow:poc:personal-workspace:v1:';
  const SCHEMA_VERSION = 2;
  const DRAFT_KEY = `${POC_PREFIX}p3h1-runner-draft:v2`;
  const RECORD_KEY = `${POC_PREFIX}p3h1-runner-record:v2`;
  const BASELINE_KEY = `${POC_PREFIX}p3h1-operating-before:v2`;
  const CANDIDATE_NAME = 'flowme-p3h1-candidate-v2';
  const WRITER_REGRESSION_ID = 'P3-G-X2-exact-candidate-operating-storage-writer-regression';
  const SCENARIO_IDS = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];
  const scenarioNodes = Array.from(document.querySelectorAll('[data-scenario]'));
  const form = document.querySelector('#evidence-form');

  const observationDefinitions = {
    A1: [
      ['captureMethod', '측정 방법', 'choice', [['', '선택'], ['android-pointer-location-video', 'Android 포인터 위치 + 화면 녹화']]],
      ['holdDurationMs', '누른 시간 (ms)', 'number', { min: 0, step: 1 }],
      ['movementCssPx', '이동 거리 (CSS px)', 'number', { min: 0, step: 0.1 }],
      ['movePanelOpened', '이동 패널 열림', 'boolean'],
      ['successfulMutationDelta', '성공 mutation 증가', 'number', { min: 0, step: 1 }],
    ],
    A2: [
      ['nativeMenuOpened', '기본 컨텍스트 메뉴 열림', 'boolean'],
      ['flowMeMovePanelOpened', 'FlowMe 이동 패널 열림', 'boolean'],
      ['destinationSelected', '날짜 목적지 선택', 'boolean'],
      ['successfulMutationDelta', '성공 mutation 증가', 'number', { min: 0, step: 1 }],
    ],
    A3: [
      ['interruptionMethod', '중단 방법', 'choice', [['', '선택'], ['pointercancel', 'pointer cancel'], ['scroll', '스크롤'], ['app-switch', '앱 전환']]],
      ['cancellationFeedbackShown', '취소 안내 표시', 'boolean'],
      ['panelClosed', '패널 닫힘', 'boolean'],
      ['ghostClickCount', 'ghost click 수', 'number', { min: 0, step: 1 }],
      ['successfulMutationDelta', '성공 mutation 증가', 'number', { min: 0, step: 1 }],
    ],
    A4: [
      ['overflowFolderMoveCompleted', '… 폴더 이동 완료', 'boolean'],
      ['inScreenNonDragOrderMoveCompleted', '화면 내 비드래그 순서 이동 완료', 'boolean'],
      ['commonTransitionConfirmed', '공통 transition 확인', 'boolean'],
      ['folderMoveMutationDelta', '폴더 이동 mutation 증가', 'number', { min: 0, step: 1 }],
      ['orderMoveMutationDelta', '순서 이동 mutation 증가', 'number', { min: 0, step: 1 }],
      ['desktopKeyboardRegressionId', '같은 SHA 데스크톱 키보드 회귀 ID', 'text', { placeholder: '예: P3-G-X4-…' }],
    ],
    A5: [
      ['openerLine', 'opener 원문 행', 'number', { min: 1, step: 1 }],
      ['trayOwnerLine', 'tray owner 원문 행', 'number', { min: 1, step: 1 }],
      ['ownerLinesEqual', '행 소유자 동일', 'boolean'],
      ['ownerLabelsEqual', '화면 소유자 이름 동일', 'boolean'],
      ['keyboardType', '확인한 키보드', 'choice', [['', '선택'], ['android-software', 'Android 화면 키보드'], ['hardware', '외부 하드웨어 키보드'], ['none', '키보드 없음']]],
      ['lastPropertyRowReachable', '마지막 속성 행 접근', 'boolean'],
      ['closeMutationDelta', '닫기 mutation 증가', 'number', { min: 0, step: 1 }],
      ['openerFocusRestored', '닫은 뒤 opener 초점 복귀', 'boolean'],
      ['applyMutationDelta', '적용 mutation 증가', 'number', { min: 0, step: 1 }],
    ],
    A6: [
      ['keyboardType', '확인한 키보드', 'choice', [['', '선택'], ['android-software', 'Android 화면 키보드'], ['hardware', '외부 하드웨어 키보드'], ['none', '키보드 없음']]],
      ['caretWithinVisualViewport', 'caret가 visual viewport 안', 'boolean'],
      ['lastFieldWithinVisualViewport', '마지막 입력란이 viewport 안', 'boolean'],
      ['saveCtaWithinVisualViewport', '저장 CTA가 viewport 안', 'boolean'],
      ['reloadCompleted', '새로고침 완료', 'boolean'],
      ['restoredLastSuccessfulStateOnly', '마지막 성공 상태만 복원', 'boolean'],
      ['unexpectedState', '예상 밖 상태 발견', 'boolean'],
    ],
  };

  let manifest = null;
  let runBinding = null;
  let bindingVerified = false;
  let candidateVerification = null;
  let candidateBodyVerified = false;
  let storageComparison = null;
  let candidateWindow = null;
  let observedCandidateDocument = null;
  let activeScenarioId = '';
  let startedAt = '';
  let runId = `android-${new Date().toISOString().replace(/\W/gu, '')}`;
  let userAgentDataEvidence = {
    available: Boolean(navigator.userAgentData),
    mobile: typeof navigator.userAgentData?.mobile === 'boolean' ? navigator.userAgentData.mobile : null,
    platform: typeof navigator.userAgentData?.platform === 'string' ? navigator.userAgentData.platform : null,
  };

  const scenarioTimes = {};
  const observations = Object.fromEntries(SCENARIO_IDS.map((id) => [id, {}]));
  const measurementStarts = {};
  const measurementSignals = Object.fromEntries(SCENARIO_IDS.map((id) => [id, {}]));
  const observerState = {
    bindingFingerprint: '',
    setItemOutsidePrefix: 0,
    removeItemOutsidePrefix: 0,
    clear: 0,
    startedAt: '',
    endedAt: '',
  };

  function byId(id) { return document.getElementById(id); }
  function nowIso() { return new Date().toISOString(); }
  function safeSessionGet(key) { try { return window.sessionStorage.getItem(key); } catch { return null; } }
  function safeSessionSet(key, value) { try { window.sessionStorage.setItem(key, value); return true; } catch { return false; } }
  function safeSessionRemove(key) { try { window.sessionStorage.removeItem(key); } catch { /* exact runner-only session key */ } }

  function rotateRight(value, amount) { return (value >>> amount) | (value << (32 - amount)); }

  function sha256Bytes(input) {
    const source = input instanceof Uint8Array ? input : new TextEncoder().encode(String(input));
    const bitLength = source.length * 8;
    const paddedLength = Math.ceil((source.length + 9) / 64) * 64;
    const bytes = new Uint8Array(paddedLength);
    bytes.set(source);
    bytes[source.length] = 0x80;
    const view = new DataView(bytes.buffer);
    view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
    view.setUint32(paddedLength - 4, bitLength >>> 0, false);
    const constants = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    const hash = new Uint32Array([
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]);
    const words = new Uint32Array(64);
    for (let offset = 0; offset < bytes.length; offset += 64) {
      for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, false);
      for (let index = 16; index < 64; index += 1) {
        const s0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^ (words[index - 15] >>> 3);
        const s1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^ (words[index - 2] >>> 10);
        words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = hash;
      for (let index = 0; index < 64; index += 1) {
        const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
        const choose = (e & f) ^ (~e & g);
        const temp1 = (h + sum1 + choose + constants[index] + words[index]) >>> 0;
        const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
        const majority = (a & b) ^ (a & c) ^ (b & c);
        h = g; g = f; f = e; e = (d + temp1) >>> 0;
        d = c; c = b; b = a; a = (temp1 + ((sum0 + majority) >>> 0)) >>> 0;
      }
      hash[0] = (hash[0] + a) >>> 0; hash[1] = (hash[1] + b) >>> 0;
      hash[2] = (hash[2] + c) >>> 0; hash[3] = (hash[3] + d) >>> 0;
      hash[4] = (hash[4] + e) >>> 0; hash[5] = (hash[5] + f) >>> 0;
      hash[6] = (hash[6] + g) >>> 0; hash[7] = (hash[7] + h) >>> 0;
    }
    return Array.from(hash).map((part) => part.toString(16).padStart(8, '0')).join('').toUpperCase();
  }

  function operatingSnapshot(storage = window.localStorage) {
    const entries = [];
    try {
      const length = storage.length;
      for (let index = 0; index < length; index += 1) {
        const key = storage.key(index);
        if (typeof key !== 'string' || !key.startsWith('flow:') || key.startsWith(POC_PREFIX)) continue;
        const value = storage.getItem(key);
        if (value === null) throw new Error(`Operating key disappeared during capture: ${key}`);
        entries.push([key, value]);
      }
    } catch (error) {
      return { ok: false, entries: [], error: error instanceof Error ? error.message : String(error) };
    }
    entries.sort((left, right) => left[0].localeCompare(right[0]));
    return { ok: true, entries, error: '' };
  }

  function publicSnapshot(snapshot) {
    return {
      keyCount: snapshot.entries.length,
      keys: snapshot.entries.map(([key, value]) => ({
        key,
        valueUtf8Bytes: new TextEncoder().encode(value).length,
        valueSha256: sha256Bytes(value),
      })),
    };
  }

  function parseBoundSession(key) {
    const serialized = safeSessionGet(key);
    if (!serialized) return null;
    try {
      const parsed = JSON.parse(serialized);
      if (parsed?.schemaVersion !== SCHEMA_VERSION
        || parsed.contractVersion !== model.CONTRACT_VERSION
        || parsed.bindingFingerprint !== runBinding?.bindingFingerprint) return null;
      return parsed;
    } catch { return null; }
  }

  function readBaseline() {
    const parsed = parseBoundSession(BASELINE_KEY);
    if (!parsed || !parsed.snapshot || !Array.isArray(parsed.snapshot.entries)) return null;
    return parsed;
  }

  function ensureBaseline() {
    if (!bindingVerified || !candidateBodyVerified || !runBinding) return null;
    const existing = readBaseline();
    if (existing) return existing;
    const baseline = {
      schemaVersion: SCHEMA_VERSION,
      contractVersion: model.CONTRACT_VERSION,
      bindingFingerprint: runBinding.bindingFingerprint,
      capturedAt: nowIso(),
      snapshot: operatingSnapshot(),
    };
    safeSessionSet(BASELINE_KEY, JSON.stringify(baseline));
    return baseline;
  }

  function compareStorage(options = {}) {
    const baseline = readBaseline();
    const after = operatingSnapshot();
    const before = baseline?.snapshot ?? { ok: false, entries: [], error: 'Baseline not captured.' };
    const byteParity = before.ok && after.ok && JSON.stringify(before.entries) === JSON.stringify(after.entries);
    storageComparison = {
      baselineCapturedAt: baseline?.capturedAt || '',
      beforeReadable: before.ok === true,
      afterReadable: after.ok === true,
      byteParity,
      before: publicSnapshot(before),
      after: publicSnapshot(after),
      comparedAt: nowIso(),
      errors: [before.error, after.error].filter(Boolean),
    };
    byId('storage-before-count').textContent = before.ok ? String(before.entries.length) : '읽기 실패';
    byId('storage-after-count').textContent = after.ok ? String(after.entries.length) : '읽기 실패';
    byId('storage-parity').textContent = byteParity ? '동일' : before.ok && after.ok ? '변경 감지' : '확인 불가';
    byId('storage-parity').dataset.valid = String(byteParity);
    if (!options.silent) persistAndEvaluate();
    return storageComparison;
  }

  function createField(definition) {
    const [key, labelText, type, settings] = definition;
    const label = document.createElement('label');
    label.className = 'field';
    const labelSpan = document.createElement('span');
    labelSpan.textContent = labelText;
    label.append(labelSpan);
    let control;
    if (type === 'boolean' || type === 'choice') {
      control = document.createElement('select');
      const options = type === 'boolean'
        ? [['', '선택'], ['true', '예'], ['false', '아니요']]
        : settings;
      options.forEach(([value, text]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        control.append(option);
      });
    } else {
      control = document.createElement('input');
      control.type = type;
      Object.entries(settings || {}).forEach(([name, value]) => control.setAttribute(name, String(value)));
    }
    control.dataset.observation = key;
    control.setAttribute('aria-label', labelText);
    label.append(control);
    return label;
  }

  function installObservationUi() {
    scenarioNodes.forEach((node) => {
      const id = node.dataset.scenario;
      const content = node.querySelector(':scope > div');
      const panel = document.createElement('fieldset');
      panel.className = 'scenario-observation';
      panel.dataset.observationPanel = id;
      const legend = document.createElement('legend');
      legend.textContent = '구조화 관찰값';
      const grid = document.createElement('div');
      grid.className = 'observation-grid';
      observationDefinitions[id].forEach((definition) => grid.append(createField(definition)));
      const actions = document.createElement('div');
      actions.className = 'measurement-actions';
      const start = document.createElement('button');
      start.type = 'button';
      start.dataset.measureStart = id;
      start.textContent = '측정 시작';
      const stop = document.createElement('button');
      stop.type = 'button';
      stop.dataset.measureStop = id;
      stop.textContent = '측정 종료';
      stop.disabled = true;
      const status = document.createElement('span');
      status.dataset.measurementStatus = id;
      status.setAttribute('role', 'status');
      status.textContent = '측정 전';
      actions.append(start, stop, status);
      panel.append(legend, grid, actions);
      content.insertBefore(panel, content.querySelector('.scenario-fields'));
    });
  }

  function readObservation(id) {
    const node = scenarioNodes.find((entry) => entry.dataset.scenario === id);
    const result = {};
    observationDefinitions[id].forEach(([key, _label, type]) => {
      const value = node.querySelector(`[data-observation="${key}"]`).value;
      if (type === 'number') result[key] = value === '' ? null : Number(value);
      else if (type === 'boolean') result[key] = value === '' ? null : value === 'true';
      else result[key] = value.trim();
    });
    observations[id] = result;
    return result;
  }

  function setObservationValue(id, key, value) {
    if (value === null || value === undefined || value === '') return;
    const node = scenarioNodes.find((entry) => entry.dataset.scenario === id);
    const control = node?.querySelector(`[data-observation="${key}"]`);
    if (!control || control.value !== '') return;
    control.value = String(value);
    observations[id][key] = value;
  }

  function restoreObservationUi(id, values) {
    const node = scenarioNodes.find((entry) => entry.dataset.scenario === id);
    if (!node || !values || typeof values !== 'object') return;
    observationDefinitions[id].forEach(([key]) => {
      const value = values[key];
      if (value === undefined || value === null) return;
      node.querySelector(`[data-observation="${key}"]`).value = String(value);
    });
  }

  function normalizeArtifactPath(value) { return String(value || '').trim().replace(/\\/gu, '/'); }
  function artifactId(path) { return `artifact-${sha256Bytes(path).slice(0, 16).toLowerCase()}`; }

  function mediaTypeForPath(path) {
    const lower = path.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.mp4')) return 'video/mp4';
    if (lower.endsWith('.webm')) return 'video/webm';
    return 'application/octet-stream';
  }

  function artifactInputs() {
    const values = [
      [byId('device-identity-artifact').value, 'device-identity', ''],
      [byId('browser-version-artifact').value, 'browser-version', ''],
      [byId('address-bar-artifact').value, 'address-bar', ''],
      [byId('storage-parity-artifact').value, 'storage-parity', ''],
    ];
    scenarioNodes.forEach((node) => {
      values.push([node.querySelector('[data-artifact]').value, node.dataset.scenario, scenarioTimes[node.dataset.scenario]?.endedAt || '']);
    });
    return values;
  }

  function buildArtifacts() {
    const byPath = new Map();
    artifactInputs().forEach(([rawPath, role, capturedAt]) => {
      const path = normalizeArtifactPath(rawPath);
      if (!path) return;
      const existing = byPath.get(path);
      if (existing) {
        if (!existing.roles.includes(role)) existing.roles.push(role);
        if (!existing.capturedAt && capturedAt) existing.capturedAt = capturedAt;
        return;
      }
      byPath.set(path, {
        id: artifactId(path), path, sha256: '', bytes: 0, mediaType: mediaTypeForPath(path),
        capturedAt: capturedAt || nowIso(), roles: [role], verification: null,
      });
    });
    return Array.from(byPath.values());
  }

  function scenarioRecords() {
    return scenarioNodes.map((node) => {
      const id = node.dataset.scenario;
      const path = normalizeArtifactPath(node.querySelector('[data-artifact]').value);
      const times = scenarioTimes[id] || { startedAt: '', endedAt: '' };
      return {
        id,
        status: node.querySelector('[data-result]').value,
        startedAt: times.startedAt || '',
        endedAt: times.endedAt || '',
        notes: node.querySelector('[data-note]').value.trim(),
        artifactRefs: path ? [artifactId(path)] : [],
        bindingFingerprint: runBinding?.bindingFingerprint || '',
        observation: readObservation(id),
      };
    });
  }

  function updateObserverUi() {
    byId('observer-set-count').textContent = observerState.startedAt ? String(observerState.setItemOutsidePrefix) : '—';
    byId('observer-remove-count').textContent = observerState.startedAt ? String(observerState.removeItemOutsidePrefix) : '—';
    byId('observer-clear-count').textContent = observerState.startedAt ? String(observerState.clear) : '—';
  }

  function getCandidateMutationCount(targetWindow = candidateWindow) {
    try {
      const output = targetWindow?.document?.querySelector('#mutation-count');
      const app = targetWindow?.document?.querySelector('#app');
      const raw = output?.dataset.successfulMutations ?? output?.textContent ?? app?.dataset.successfulMutations;
      const count = Number(raw);
      return Number.isSafeInteger(count) && count >= 0 ? count : null;
    } catch { return null; }
  }

  function isMovePanelOpen(targetWindow = candidateWindow) {
    try {
      const panel = targetWindow?.document?.querySelector('#move-panel');
      return Boolean(panel && !panel.hidden && panel.getAttribute('aria-hidden') !== 'true');
    } catch { return false; }
  }

  function elementWithinVisualViewport(element, targetWindow = candidateWindow) {
    if (!element || !targetWindow) return false;
    const rect = element.getBoundingClientRect();
    const viewport = targetWindow.visualViewport;
    const left = viewport?.offsetLeft ?? 0;
    const top = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? targetWindow.innerWidth;
    const height = viewport?.height ?? targetWindow.innerHeight;
    return rect.left >= left && rect.right <= left + width && rect.top >= top && rect.bottom <= top + height;
  }

  function observeActionDelta(id, key, before) {
    window.setTimeout(() => {
      const after = getCandidateMutationCount();
      if (before !== null && after !== null) setObservationValue(id, key, after - before);
      persistAndEvaluate();
    }, 140);
  }

  function attachCandidateObserver() {
    if (!candidateWindow || candidateWindow.closed || !runBinding) return false;
    let candidateDocument;
    try {
      if (candidateWindow.location.origin !== location.origin || candidateWindow.location.pathname !== '/candidate') return false;
      candidateDocument = candidateWindow.document;
      if (!candidateDocument?.documentElement || candidateDocument.readyState === 'loading') return false;
    } catch { return false; }
    if (observedCandidateDocument === candidateDocument) return true;
    observedCandidateDocument = candidateDocument;
    observerState.bindingFingerprint = runBinding.bindingFingerprint;
    observerState.startedAt ||= nowIso();
    observerState.endedAt = '';

    const marker = '__flowmeP3h1EvidenceObserverV2';
    try {
      if (candidateWindow[marker] !== runBinding.bindingFingerprint) {
        const proto = candidateWindow.Storage?.prototype;
        const targetStorage = candidateWindow.localStorage;
        if (proto && targetStorage) {
          const originalSetItem = proto.setItem;
          const originalRemoveItem = proto.removeItem;
          const originalClear = proto.clear;
          proto.setItem = function observedSetItem(key, value) {
            if (this === targetStorage && typeof key === 'string' && !key.startsWith(POC_PREFIX)) observerState.setItemOutsidePrefix += 1;
            updateObserverUi();
            return originalSetItem.call(this, key, value);
          };
          proto.removeItem = function observedRemoveItem(key) {
            if (this === targetStorage && typeof key === 'string' && !key.startsWith(POC_PREFIX)) observerState.removeItemOutsidePrefix += 1;
            updateObserverUi();
            return originalRemoveItem.call(this, key);
          };
          proto.clear = function observedClear() {
            if (this === targetStorage) observerState.clear += 1;
            updateObserverUi();
            return originalClear.call(this);
          };
        }
        candidateWindow[marker] = runBinding.bindingFingerprint;
      }
    } catch { return false; }

    const activeSignals = () => activeScenarioId ? measurementSignals[activeScenarioId] : null;
    let pointer = null;
    let cancelledAt = 0;
    candidateDocument.addEventListener('pointerdown', (event) => {
      if (!activeScenarioId) return;
      pointer = { id: event.pointerId, started: performance.now(), x: event.clientX, y: event.clientY, max: 0 };
    }, true);
    candidateDocument.addEventListener('pointermove', (event) => {
      if (!pointer || event.pointerId !== pointer.id) return;
      pointer.max = Math.max(pointer.max, Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y));
    }, true);
    const finishPointer = (event, cancelled) => {
      if (!pointer || event.pointerId !== pointer.id || !activeScenarioId) return;
      const current = activeSignals();
      current.gesture = {
        holdDurationMs: Math.max(0, Math.round(performance.now() - pointer.started)),
        movementCssPx: Math.round(pointer.max * 10) / 10,
      };
      if (cancelled) {
        current.interruptionMethod = 'pointercancel';
        cancelledAt = Date.now();
      }
      pointer = null;
    };
    candidateDocument.addEventListener('pointerup', (event) => finishPointer(event, false), true);
    candidateDocument.addEventListener('pointercancel', (event) => finishPointer(event, true), true);
    candidateDocument.addEventListener('contextmenu', (event) => {
      if (activeScenarioId !== 'A2') return;
      window.setTimeout(() => { measurementSignals.A2.nativeMenuOpened = !event.defaultPrevented; }, 0);
    });
    candidateDocument.addEventListener('click', (event) => {
      const current = activeSignals();
      if (!current) return;
      if (cancelledAt && Date.now() - cancelledAt < 800) current.ghostClickCount = (current.ghostClickCount || 0) + 1;
      const control = event.target.closest?.('[data-action]');
      const action = control?.dataset.action || '';
      const before = getCandidateMutationCount();
      if (isMovePanelOpen()) current.movePanelOpened = true;
      if (activeScenarioId === 'A2' && action === 'move-date-target') current.destinationSelected = true;
      if (activeScenarioId === 'A4') {
        if (action === 'move-folder-target') {
          current.overflowFolderMoveCompleted = true;
          observeActionDelta('A4', 'folderMoveMutationDelta', before);
        }
        if (['move-top', 'move-up', 'move-down', 'move-bottom'].includes(action)) {
          current.inScreenNonDragOrderMoveCompleted = true;
          observeActionDelta('A4', 'orderMoveMutationDelta', before);
        }
      }
      if (activeScenarioId === 'A5') {
        if (action === 'open-authoring-properties') {
          const line = Number(control.dataset.line);
          if (Number.isSafeInteger(line) && line > 0) current.openerLine = line;
          window.setTimeout(() => {
            const tray = candidateWindow.document.querySelector('[data-authoring-property-tray][data-owner-line]');
            const trayLine = Number(tray?.dataset.ownerLine);
            if (Number.isSafeInteger(trayLine) && trayLine > 0) {
              current.trayOwnerLine = trayLine;
              current.ownerLinesEqual = current.openerLine === trayLine;
            }
          }, 100);
        }
        if (action === 'close-authoring-properties') {
          observeActionDelta('A5', 'closeMutationDelta', before);
          const line = control.dataset.line;
          window.setTimeout(() => {
            const opener = candidateWindow.document.querySelector(`[data-action="open-authoring-properties"][data-line="${line}"]`);
            setObservationValue('A5', 'openerFocusRestored', candidateWindow.document.activeElement === opener);
          }, 160);
        }
      }
      window.setTimeout(() => {
        if (isMovePanelOpen()) current.movePanelOpened = true;
        persistAndEvaluate();
      }, 100);
    }, true);
    candidateDocument.addEventListener('submit', (event) => {
      if (activeScenarioId !== 'A5') return;
      const formNode = event.target;
      if (!formNode.matches?.('[data-authoring-inline-form], [data-dialog-form="authoring-dependent-property"]')) return;
      observeActionDelta('A5', 'applyMutationDelta', getCandidateMutationCount());
    }, true);
    candidateDocument.addEventListener('focusin', (event) => {
      if (!activeScenarioId || !['A5', 'A6'].includes(activeScenarioId)) return;
      const current = activeSignals();
      current.focusedInput = true;
      if (activeScenarioId === 'A6') current.caretWithinVisualViewport = elementWithinVisualViewport(event.target);
    }, true);
    candidateDocument.addEventListener('scroll', () => {
      if (activeScenarioId !== 'A5') return;
      const rows = candidateDocument.querySelectorAll('[data-authoring-property-tray] .property-card');
      if (rows.length && elementWithinVisualViewport(rows[rows.length - 1])) measurementSignals.A5.lastPropertyRowReachable = true;
    }, true);
    const mutationObserver = new candidateWindow.MutationObserver(() => {
      const current = activeSignals();
      if (!current) return;
      if (isMovePanelOpen()) current.movePanelOpened = true;
      if (activeScenarioId === 'A3') {
        const statusText = candidateDocument.querySelector('#save-status')?.textContent || '';
        if (/취소/u.test(statusText)) current.cancellationFeedbackShown = true;
      }
      if (activeScenarioId === 'A5') {
        const rows = candidateDocument.querySelectorAll('[data-authoring-property-tray] .property-card');
        if (rows.length && elementWithinVisualViewport(rows[rows.length - 1])) current.lastPropertyRowReachable = true;
      }
    });
    mutationObserver.observe(candidateDocument.documentElement, {
      subtree: true, childList: true, attributes: true, characterData: true,
    });
    candidateWindow.addEventListener('resize', () => {
      if (!activeScenarioId || !['A5', 'A6'].includes(activeScenarioId)) return;
      const current = activeSignals();
      const viewportHeight = candidateWindow.visualViewport?.height ?? candidateWindow.innerHeight;
      const baselineHeight = measurementStarts[activeScenarioId]?.viewportHeight ?? candidateWindow.innerHeight;
      if (baselineHeight - viewportHeight > 100) current.keyboardType = 'android-software';
      if (activeScenarioId === 'A6') {
        const active = candidateDocument.activeElement;
        if (active?.matches?.('input, textarea, select')) current.caretWithinVisualViewport = elementWithinVisualViewport(active);
        const inputs = candidateDocument.querySelectorAll('input, textarea, select');
        const ctas = candidateDocument.querySelectorAll('button[type="submit"], [data-action="commit-authoring"], [data-action="commit-plan-editor"]');
        if (inputs.length) current.lastFieldWithinVisualViewport = elementWithinVisualViewport(inputs[inputs.length - 1]);
        if (ctas.length) current.saveCtaWithinVisualViewport = Array.from(ctas).some((element) => elementWithinVisualViewport(element));
      }
    });
    if (activeScenarioId === 'A6' && measurementStarts.A6?.documentAttached) measurementSignals.A6.reloadCompleted = true;
    if (activeScenarioId === 'A6' && measurementStarts.A6) measurementStarts.A6.documentAttached = true;
    updateObserverUi();
    byId('observer-status').dataset.status = 'ready';
    byId('observer-status').textContent = '후보 탭 observer 연결됨 · 현재 실행 바인딩에서만 기록합니다.';
    persistDraft();
    return true;
  }

  function openCandidate() {
    if (!bindingVerified || !candidateBodyVerified || !runBinding) {
      window.alert('호스트 실행 바인딩과 후보 본문 SHA를 확인하지 못했습니다. 이 후보를 조작하지 마세요.');
      return false;
    }
    ensureBaseline();
    candidateWindow = window.open('/candidate', CANDIDATE_NAME);
    if (!candidateWindow) {
      byId('observer-status').dataset.status = 'error';
      byId('observer-status').textContent = '후보 탭을 열지 못했습니다. Chrome의 팝업 허용을 확인하세요.';
      return false;
    }
    byId('observer-status').dataset.status = 'connecting';
    byId('observer-status').textContent = '후보 탭을 열었습니다. 로딩 뒤 observer를 연결합니다.';
    window.setTimeout(attachCandidateObserver, 250);
    return true;
  }

  function startMeasurement(id) {
    if (activeScenarioId) {
      window.alert(`${activeScenarioId} 측정을 먼저 종료하세요.`);
      return;
    }
    if (id !== 'A1' && !scenarioTimes.A1?.endedAt) {
      window.alert('실행 경계와 순서를 고정하려면 A1 측정을 먼저 끝내세요.');
      return;
    }
    if (!candidateWindow || candidateWindow.closed) {
      openCandidate();
      return;
    }
    if (!attachCandidateObserver()) {
      byId('observer-status').dataset.status = 'connecting';
      byId('observer-status').textContent = '후보 탭 observer 연결을 기다리는 중입니다. 잠시 뒤 측정 시작을 다시 누르세요.';
      return;
    }
    ensureBaseline();
    const at = nowIso();
    startedAt ||= candidateVerification?.verifiedAt || at;
    scenarioTimes[id] = { startedAt: at, endedAt: '' };
    measurementSignals[id] = {};
    measurementStarts[id] = {
      mutationCount: getCandidateMutationCount(),
      viewportHeight: candidateWindow?.visualViewport?.height ?? candidateWindow?.innerHeight ?? 0,
      documentAttached: id === 'A6' ? observedCandidateDocument === candidateWindow?.document : undefined,
    };
    activeScenarioId = id;
    const node = scenarioNodes.find((entry) => entry.dataset.scenario === id);
    node.querySelector('[data-measure-start]').disabled = true;
    node.querySelector('[data-measure-stop]').disabled = false;
    node.querySelector('[data-measurement-status]').textContent = `측정 중 · ${new Date(at).toLocaleTimeString('ko-KR')}`;
    attachCandidateObserver();
    candidateWindow?.focus();
    persistAndEvaluate();
  }

  function stopMeasurement(id) {
    if (activeScenarioId !== id) return;
    const signals = measurementSignals[id] || {};
    const before = measurementStarts[id]?.mutationCount;
    const after = getCandidateMutationCount();
    const delta = before !== null && before !== undefined && after !== null ? after - before : null;
    if (id === 'A1') {
      setObservationValue(id, 'holdDurationMs', signals.gesture?.holdDurationMs);
      setObservationValue(id, 'movementCssPx', signals.gesture?.movementCssPx);
      setObservationValue(id, 'movePanelOpened', signals.movePanelOpened === true);
      setObservationValue(id, 'successfulMutationDelta', delta);
    } else if (id === 'A2') {
      setObservationValue(id, 'nativeMenuOpened', signals.nativeMenuOpened);
      setObservationValue(id, 'flowMeMovePanelOpened', signals.movePanelOpened === true);
      setObservationValue(id, 'destinationSelected', signals.destinationSelected === true);
      setObservationValue(id, 'successfulMutationDelta', delta);
    } else if (id === 'A3') {
      const statusText = candidateWindow?.document?.querySelector('#save-status')?.textContent || '';
      setObservationValue(id, 'interruptionMethod', signals.interruptionMethod);
      setObservationValue(id, 'cancellationFeedbackShown', signals.cancellationFeedbackShown === true || /취소/u.test(statusText));
      setObservationValue(id, 'panelClosed', !isMovePanelOpen());
      setObservationValue(id, 'ghostClickCount', signals.ghostClickCount || 0);
      setObservationValue(id, 'successfulMutationDelta', delta);
    } else if (id === 'A4') {
      setObservationValue(id, 'overflowFolderMoveCompleted', signals.overflowFolderMoveCompleted === true);
      setObservationValue(id, 'inScreenNonDragOrderMoveCompleted', signals.inScreenNonDragOrderMoveCompleted === true);
    } else if (id === 'A5') {
      ['openerLine', 'trayOwnerLine', 'ownerLinesEqual', 'keyboardType', 'lastPropertyRowReachable'].forEach((key) => setObservationValue(id, key, signals[key]));
    } else if (id === 'A6') {
      ['keyboardType', 'caretWithinVisualViewport', 'lastFieldWithinVisualViewport', 'saveCtaWithinVisualViewport', 'reloadCompleted'].forEach((key) => setObservationValue(id, key, signals[key]));
    }
    const ended = nowIso();
    scenarioTimes[id].endedAt = ended;
    observerState.endedAt = ended;
    activeScenarioId = '';
    const node = scenarioNodes.find((entry) => entry.dataset.scenario === id);
    node.querySelector('[data-measure-start]').disabled = false;
    node.querySelector('[data-measure-stop]').disabled = true;
    node.querySelector('[data-measurement-status]').textContent = `측정 종료 · ${new Date(ended).toLocaleTimeString('ko-KR')}`;
    persistAndEvaluate();
  }

  function buildStorageRecord() {
    if (!storageComparison) compareStorage({ silent: true });
    const comparison = storageComparison || {
      baselineCapturedAt: '', beforeReadable: false, afterReadable: false, byteParity: false,
      before: { keyCount: 0, keys: [] }, after: { keyCount: 0, keys: [] },
    };
    return {
      bindingFingerprint: runBinding?.bindingFingerprint || '',
      scope: 'flow-keys-outside-poc-prefix',
      baselineCapturedAt: comparison.baselineCapturedAt,
      beforeReadable: comparison.beforeReadable,
      afterReadable: comparison.afterReadable,
      byteParity: comparison.byteParity,
      before: comparison.before,
      after: comparison.after,
      observer: {
        bindingFingerprint: observerState.bindingFingerprint,
        scope: 'a1-a6-post-load',
        setItemOutsidePrefix: observerState.setItemOutsidePrefix,
        removeItemOutsidePrefix: observerState.removeItemOutsidePrefix,
        clear: observerState.clear,
        startedAt: observerState.startedAt,
        endedAt: observerState.endedAt,
      },
      automatedWriterRegression: {
        candidateSha256: candidateVerification?.responseSha256 || '',
        testId: WRITER_REGRESSION_ID,
        result: 'PASS',
        forbiddenWriteCount: 0,
      },
    };
  }

  function executedRecord(finalize) {
    const scenarios = scenarioRecords();
    const artifacts = buildArtifacts();
    const endedAt = nowIso();
    const a5 = scenarios.find((scenario) => scenario.id === 'A5');
    return {
      schemaVersion: SCHEMA_VERSION,
      contractVersion: model.CONTRACT_VERSION,
      runStatus: 'EXECUTED',
      runId,
      tester: byId('inspector').value.trim(),
      startedAt,
      endedAt,
      runBinding: runBinding || {
        hostRunId: '', origin: '', candidateSha256: '', candidateBytes: 0, createdAt: '', bindingFingerprint: '',
      },
      environment: {
        kind: 'actual-device',
        physicalDevice: byId('physical-device').checked,
        platform: 'android',
        browser: 'chrome',
        deviceModel: byId('device-model').value.trim(),
        osVersion: byId('os-version').value.trim(),
        browserVersion: byId('browser-version').value.trim(),
        buildFingerprint: byId('build-fingerprint').value.trim(),
        userAgent: navigator.userAgent,
        browserSurface: byId('address-bar').checked ? 'standalone-chrome-tab' : 'embedded-webview',
        openedFromAddressBar: byId('address-bar').checked,
        sameLanConfirmed: byId('same-lan').checked,
        capabilities: {
          isSecureContext: window.isSecureContext,
          visualViewport: Boolean(window.visualViewport),
          virtualKeyboard: Boolean(navigator.virtualKeyboard),
        },
        signals: {
          webdriver: navigator.webdriver === true,
          maxTouchPoints: Number(navigator.maxTouchPoints || 0),
          pointerCoarse: window.matchMedia('(pointer: coarse)').matches,
          userAgentData: userAgentDataEvidence,
        },
      },
      candidate: candidateVerification || {
        url: byId('browser-address').value,
        httpStatus: 0,
        contentType: '',
        responseSha256: '',
        responseBytes: 0,
        responseShaHeader: '',
        verifiedAt: '',
        verificationMethod: 'on-device-byte-hash',
      },
      scenarios,
      a5ControlMapping: {
        evidenceId: `${runId}-A5-control-mapping`,
        protocolControl: 'authoring-owner-plus',
        candidateControl: 'authoring-property-editor',
        candidateSelector: '[data-action="open-authoring-properties"][data-line]',
        ownerIdentityAttribute: 'data-line',
        decision: byId('a5-decision').value,
        decidedBy: byId('inspector').value.trim(),
        artifactRef: a5?.artifactRefs?.[0] || '',
      },
      artifacts,
      storageBoundary: buildStorageRecord(),
      artifactReview: {
        status: 'UNREVIEWED', reviewedBy: '', reviewedAt: '', scenarioIds: [], artifactIds: [],
      },
      notes: byId('overall-notes').value.trim(),
      generatedAt: finalize ? nowIso() : '',
      limitations: [
        '기록기 원본은 artifact 파일의 SHA-256과 사람의 내용 검토 전이므로 최종 E5-D PASS가 될 수 없습니다.',
        'post-load observer는 후보 초기 로드 이전 호출을 보지 못해 같은 SHA의 자동 writer 회귀와 결합합니다.',
        'LAN HTTP에서는 secure-context 전용 API가 제한될 수 있습니다.',
        '이 JSON은 서버로 전송되지 않고 현재 기기에 내려받습니다.',
      ],
    };
  }

  function collectRecord(finalize = false) {
    const scenarios = scenarioRecords();
    const attempted = scenarios.some((scenario) => scenario.status !== 'NOT_RUN' || scenario.startedAt || scenario.endedAt);
    if (!attempted) {
      return {
        schemaVersion: SCHEMA_VERSION,
        contractVersion: model.CONTRACT_VERSION,
        runStatus: 'NOT_RUN',
        reason: 'A physical Android device scenario has not been operated yet.',
      };
    }
    return executedRecord(finalize);
  }

  const missingCopy = {
    notRunRecordValid: 'NOT_RUN 기록 형식이 손상되었습니다.',
    contractValid: 'P3-H1 v2 증거 계약과 맞지 않습니다.',
    runValid: '측정 시작·종료 시각과 검증자를 완성하세요.',
    bindingValid: '현재 호스트 실행·origin·후보 SHA/bytes 바인딩이 맞지 않습니다.',
    identityValid: '실제 기기 모델·Android·Chrome 전체 버전·빌드 정보를 완성하세요.',
    capabilitiesValid: '브라우저 기능 확인값이 누락되었습니다.',
    antiAutomationValid: 'touch·coarse pointer·webdriver·UA Client Hints 실제 기기 신호가 맞지 않습니다.',
    uaValid: 'Android용 Google Chrome UA가 아닙니다. 메신저·앱 내 브라우저는 닫으세요.',
    browserSurfaceValid: 'Chrome 주소창 진입과 같은 LAN 연결을 확인하세요.',
    addressValid: '현재 사설 LAN origin의 정확한 /candidate 주소가 아닙니다.',
    candidateBodyValid: '현재 브라우저가 후보 응답 본문의 SHA-256과 bytes를 검증하지 못했습니다.',
    storageReadableValid: '운영 flow:* 저장 영역의 전후 읽기가 모두 성공하지 않았습니다.',
    storageParityValid: '운영 flow:* key/value의 전후 bytes가 동일하지 않습니다.',
    storageObserverValid: '실제 후보 post-load observer가 없거나 허용 밖 저장 호출이 발견됐습니다.',
    automatedBoundaryValid: '같은 후보 SHA의 자동 writer 회귀 근거가 맞지 않습니다.',
    a5MappingValid: 'A5 조작 대응과 소유자 일치를 판정하세요.',
    artifactRolesValid: '기기·브라우저·주소창·저장 경계와 A1~A6 artifact 역할이 모두 필요합니다.',
    artifactsValid: '근거 파일의 실제 SHA-256·bytes 검증이 남았습니다.',
    artifactsFilesystemValid: '등록한 근거 파일을 PC에서 byte-for-byte 확인해야 합니다.',
    artifactReviewValid: 'A1~A6 근거 파일을 이름 있는 검토자가 아직 확인하지 않았습니다.',
    allScenariosRun: 'A1~A6 측정·구조화 관찰·판정이 모두 필요합니다.',
    scenarioBindingValid: 'A1~A6가 현재 호스트 실행과 같은 바인딩이 아닙니다.',
  };

  function renderEvaluation(record) {
    let result;
    try {
      result = model.evaluate(record);
    } catch (error) {
      result = { status: 'INCOMPLETE', e5d: 'NOT_RUN', missing: ['contractValid'], error: String(error) };
    }
    const verdict = byId('verdict');
    verdict.dataset.status = result.status;
    byId('verdict-status').textContent = result.e5d;
    byId('verdict-copy').textContent = result.status === 'PASS'
      ? '검증된 artifact와 사람의 검토를 포함해 실제 Android Chrome 근거가 충족되었습니다.'
      : result.status === 'FAIL'
        ? '명시적 시나리오 실패나 저장 경계 위반이 있습니다.'
        : result.status === 'NOT_RUN'
          ? '실제 기기 시나리오를 아직 기록하지 않았습니다.'
          : '실기는 시작됐지만 구조화 관찰·파일 SHA·사람 검토가 남았습니다.';
    const missing = Array.isArray(result.missing) ? result.missing : [];
    byId('missing-list').replaceChildren(...missing.map((key) => {
      const item = document.createElement('li');
      item.textContent = missingCopy[key] || key;
      return item;
    }));
    scenarioNodes.forEach((node) => { node.dataset.result = node.querySelector('[data-result]').value; });
    return result;
  }

  function draftRecord() {
    const fields = {};
    [
      'inspector', 'device-model', 'os-version', 'browser-version', 'build-fingerprint',
      'overall-notes', 'a5-decision', 'device-identity-artifact', 'browser-version-artifact',
      'address-bar-artifact', 'storage-parity-artifact',
    ].forEach((id) => { fields[id] = byId(id).value; });
    return {
      schemaVersion: SCHEMA_VERSION,
      contractVersion: model.CONTRACT_VERSION,
      bindingFingerprint: runBinding?.bindingFingerprint || '',
      runId,
      startedAt,
      fields,
      checks: {
        physicalDevice: byId('physical-device').checked,
        addressBar: byId('address-bar').checked,
        sameLan: byId('same-lan').checked,
      },
      scenarios: scenarioNodes.map((node) => ({
        id: node.dataset.scenario,
        status: node.querySelector('[data-result]').value,
        artifactPath: node.querySelector('[data-artifact]').value,
        notes: node.querySelector('[data-note]').value,
        times: scenarioTimes[node.dataset.scenario] || null,
        observation: readObservation(node.dataset.scenario),
      })),
      observer: { ...observerState },
    };
  }

  function persistDraft() {
    if (!runBinding || !bindingVerified || !candidateBodyVerified) return;
    safeSessionSet(DRAFT_KEY, JSON.stringify(draftRecord()));
  }

  function persistAndEvaluate() {
    persistDraft();
    const record = collectRecord(false);
    if (runBinding) safeSessionSet(RECORD_KEY, JSON.stringify(record));
    return renderEvaluation(record);
  }

  function clearStaleBoundData() {
    [DRAFT_KEY, RECORD_KEY, BASELINE_KEY].forEach((key) => {
      const raw = safeSessionGet(key);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        const fingerprint = parsed?.bindingFingerprint || parsed?.runBinding?.bindingFingerprint;
        if (parsed?.schemaVersion === SCHEMA_VERSION
          && parsed.contractVersion === model.CONTRACT_VERSION
          && fingerprint === runBinding?.bindingFingerprint) return;
      } catch { /* remove corrupt v2 runner-only data */ }
      safeSessionRemove(key);
    });
  }

  function restoreDraft() {
    const draft = parseBoundSession(DRAFT_KEY);
    if (!draft) return;
    runId = draft.runId || runId;
    startedAt = draft.startedAt || startedAt;
    Object.entries(draft.fields || {}).forEach(([id, value]) => {
      const element = byId(id);
      if (element && value !== undefined) element.value = String(value);
    });
    byId('physical-device').checked = draft.checks?.physicalDevice === true;
    byId('address-bar').checked = draft.checks?.addressBar === true;
    byId('same-lan').checked = draft.checks?.sameLan === true;
    (Array.isArray(draft.scenarios) ? draft.scenarios : []).forEach((scenario) => {
      const node = scenarioNodes.find((entry) => entry.dataset.scenario === scenario.id);
      if (!node) return;
      node.querySelector('[data-result]').value = scenario.status || 'NOT_RUN';
      node.querySelector('[data-artifact]').value = scenario.artifactPath || '';
      node.querySelector('[data-note]').value = scenario.notes || '';
      if (scenario.times) {
        scenarioTimes[scenario.id] = scenario.times;
        const status = node.querySelector('[data-measurement-status]');
        status.textContent = scenario.times.endedAt ? '이전 측정 복원됨' : '측정 중단됨 · 다시 측정하세요';
      }
      restoreObservationUi(scenario.id, scenario.observation);
    });
    if (draft.observer?.bindingFingerprint === runBinding.bindingFingerprint) Object.assign(observerState, draft.observer);
    updateObserverUi();
  }

  function manifestBinding(value) {
    if (!value || value.schemaVersion !== SCHEMA_VERSION || value.contractVersion !== model.CONTRACT_VERSION) return null;
    const binding = value.runBinding;
    if (!binding || typeof binding !== 'object') return null;
    const fingerprint = [binding.hostRunId, binding.origin, binding.candidateSha256, binding.candidateBytes, binding.createdAt].join('|');
    if (binding.origin !== location.origin
      || binding.bindingFingerprint !== fingerprint
      || value.bindingFingerprint !== fingerprint
      || String(binding.candidateSha256).toUpperCase() !== model.EXPECTED_SHA256
      || Number(binding.candidateBytes) !== model.EXPECTED_BYTES
      || value.artifact?.path !== '/candidate') return null;
    return {
      ...binding,
      candidateSha256: String(binding.candidateSha256).toUpperCase(),
      candidateBytes: Number(binding.candidateBytes),
    };
  }

  async function verifyCandidateBody() {
    const url = new URL('/candidate', location.origin);
    const response = await fetch(url.href, { cache: 'no-store', credentials: 'same-origin' });
    const bytes = new Uint8Array(await response.arrayBuffer());
    const responseSha256 = sha256Bytes(bytes);
    const responseShaHeader = String(response.headers.get('x-flowme-artifact-sha256') || '').toUpperCase();
    const contentType = String(response.headers.get('content-type') || '');
    candidateVerification = {
      url: response.url,
      httpStatus: response.status,
      contentType,
      responseSha256,
      responseBytes: bytes.byteLength,
      responseShaHeader,
      verifiedAt: nowIso(),
      verificationMethod: 'on-device-byte-hash',
    };
    candidateBodyVerified = response.ok
      && response.url === url.href
      && !url.search && !url.hash && !url.username && !url.password
      && /^text\/html\s*;\s*charset=utf-8$/iu.test(contentType.trim())
      && responseSha256 === model.EXPECTED_SHA256
      && bytes.byteLength === model.EXPECTED_BYTES
      && responseShaHeader === model.EXPECTED_SHA256
      && runBinding?.candidateSha256 === responseSha256
      && runBinding?.candidateBytes === bytes.byteLength;
    byId('candidate-body-verification').textContent = candidateBodyVerified
      ? `일치 · ${bytes.byteLength.toLocaleString('ko-KR')} bytes 직접 계산`
      : '불일치 · 후보를 조작하지 마세요';
    byId('candidate-body-verification').dataset.valid = String(candidateBodyVerified);
  }

  async function autofillDeviceIdentity() {
    const data = navigator.userAgentData;
    userAgentDataEvidence = {
      available: Boolean(data),
      mobile: typeof data?.mobile === 'boolean' ? data.mobile : null,
      platform: typeof data?.platform === 'string' ? data.platform : null,
    };
    if (!model.isActualAndroidChromeUa(navigator.userAgent)
      || !data
      || typeof data.getHighEntropyValues !== 'function') return;
    try {
      const values = await data.getHighEntropyValues(['model', 'platformVersion', 'fullVersionList']);
      const hints = values && typeof values === 'object'
        ? { ...values, platform: values.platform || data.platform }
        : { platform: data.platform };
      userAgentDataEvidence = {
        available: true,
        mobile: typeof data.mobile === 'boolean' ? data.mobile : null,
        platform: typeof hints.platform === 'string' ? hints.platform : null,
      };
      const current = {
        deviceModel: byId('device-model').value,
        osVersion: byId('os-version').value,
        browserVersion: byId('browser-version').value,
      };
      const autofilled = model.autofillAndroidIdentity(current, hints);
      [['device-model', 'deviceModel'], ['os-version', 'osVersion'], ['browser-version', 'browserVersion']].forEach(([id, key]) => {
        const input = byId(id);
        if (!input.value.trim() && autofilled[key]) {
          input.value = autofilled[key];
          input.dataset.autofilled = 'user-agent-client-hints';
        }
      });
    } catch {
      // High-entropy client hints are optional; manual fields stay editable.
    }
  }

  async function loadManifestAndCandidate() {
    if (!['http:', 'https:'].includes(location.protocol)) {
      byId('artifact-sha').textContent = '로컬 LAN 호스트에서 열어야 합니다';
      byId('artifact-bytes').textContent = '확인 불가';
      byId('candidate-body-verification').textContent = '확인 불가';
      renderEvaluation(collectRecord(false));
      return;
    }
    const verificationStartedAt = nowIso();
    try {
      const response = await fetch('/manifest.json', { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
      manifest = await response.json();
      runBinding = manifestBinding(manifest);
      bindingVerified = Boolean(runBinding);
      if (!bindingVerified) throw new Error('manifest 실행 바인딩 불일치');
      byId('artifact-sha').textContent = runBinding.candidateSha256;
      byId('artifact-bytes').textContent = `${runBinding.candidateBytes.toLocaleString('ko-KR')} bytes`;
      byId('host-run-id').textContent = runBinding.hostRunId;
      byId('binding-fingerprint').textContent = runBinding.bindingFingerprint;
      byId('binding-fingerprint').title = runBinding.bindingFingerprint;
      byId('artifact-sha').dataset.valid = 'true';
      byId('artifact-bytes').dataset.valid = 'true';
      await verifyCandidateBody();
      if (!candidateBodyVerified) throw new Error('candidate body SHA/bytes 불일치');
      startedAt ||= verificationStartedAt;
      clearStaleBoundData();
      restoreDraft();
      compareStorage({ silent: true });
      await autofillDeviceIdentity();
      persistAndEvaluate();
    } catch (error) {
      bindingVerified = false;
      candidateBodyVerified = false;
      byId('candidate-body-verification').textContent = `확인 실패: ${error instanceof Error ? error.message : String(error)}`;
      byId('candidate-body-verification').dataset.valid = 'false';
      byId('observer-status').dataset.status = 'error';
      byId('observer-status').textContent = '현재 실행과 후보 본문을 고정하지 못했습니다. 후보를 조작하지 마세요.';
      renderEvaluation(collectRecord(false));
    }
  }

  function downloadRecord() {
    observerState.endedAt ||= observerState.startedAt ? nowIso() : '';
    compareStorage({ silent: true });
    const record = collectRecord(true);
    const evaluation = renderEvaluation(record);
    const blob = new Blob([`${JSON.stringify({ ...record, evaluation }, null, 2)}\n`], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `flowme-p3h1-android-${String(evaluation.status || 'not-run').toLowerCase()}-${new Date().toISOString().replace(/[:.]/gu, '-')}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    persistDraft();
  }

  async function copySummary() {
    const record = collectRecord(false);
    const result = renderEvaluation(record);
    const scenarios = record.runStatus === 'EXECUTED' ? record.scenarios : [];
    const statusLine = scenarios.map((scenario) => `${scenario.id} ${scenario.status}`).join(' · ') || 'A1~A6 NOT_RUN';
    const storage = record.runStatus === 'EXECUTED' ? record.storageBoundary : null;
    const summary = `P3-H1 Android E5-D: ${result.e5d}\n${record.runStatus === 'EXECUTED' ? `${record.environment.deviceModel || '기기 미입력'} / ${record.environment.osVersion || 'OS 미입력'} / Chrome ${record.environment.browserVersion || '미입력'}` : '실제 기기 미실행'}\n${statusLine}\n운영 flow:* 저장 데이터: ${storage?.beforeReadable && storage?.afterReadable && storage?.byteParity ? '동일' : '미확인 또는 변경'}\n후보 본문 SHA-256: ${record.runStatus === 'EXECUTED' ? record.candidate.responseSha256 || '미확인' : '미확인'}\nartifact 파일 검증/사람 검토: ${record.runStatus === 'EXECUTED' ? record.artifactReview.status : '미실행'}`;
    try {
      await navigator.clipboard.writeText(summary);
      byId('copy-summary').textContent = '복사됨';
    } catch { byId('copy-summary').textContent = '복사 실패 — JSON을 사용하세요'; }
  }

  function resetRunnerRecord() {
    if (!window.confirm('현재 호스트 실행의 P3-H1 입력과 비교 기준만 초기화할까요? PoC와 운영 localStorage는 건드리지 않습니다.')) return;
    safeSessionRemove(DRAFT_KEY);
    safeSessionRemove(RECORD_KEY);
    safeSessionRemove(BASELINE_KEY);
    location.reload();
  }

  installObservationUi();
  byId('browser-address').value = ['http:', 'https:'].includes(location.protocol) ? new URL('/candidate', location.origin).href : '';
  byId('user-agent').textContent = navigator.userAgent;
  const uaValid = model.isActualAndroidChromeUa(navigator.userAgent);
  byId('ua-verdict').textContent = uaValid ? '일치' : '불일치';
  byId('ua-verdict').dataset.valid = String(uaValid);
  byId('secure-context').textContent = String(window.isSecureContext);
  byId('visual-viewport').textContent = String(Boolean(window.visualViewport));
  byId('virtual-keyboard').textContent = String(Boolean(navigator.virtualKeyboard));
  updateObserverUi();

  form.addEventListener('input', persistAndEvaluate);
  document.querySelector('#scenario-list').addEventListener('input', persistAndEvaluate);
  document.querySelector('#scenario-list').addEventListener('click', (event) => {
    const start = event.target.closest('[data-measure-start]');
    const stop = event.target.closest('[data-measure-stop]');
    if (start) startMeasurement(start.dataset.measureStart);
    else if (stop) stopMeasurement(stop.dataset.measureStop);
  });
  ['overall-notes', 'a5-decision', 'device-identity-artifact', 'browser-version-artifact', 'address-bar-artifact', 'storage-parity-artifact'].forEach((id) => byId(id).addEventListener('input', persistAndEvaluate));
  byId('compare-storage').addEventListener('click', () => compareStorage());
  byId('download-evidence').addEventListener('click', downloadRecord);
  byId('copy-summary').addEventListener('click', copySummary);
  byId('start-over').addEventListener('click', resetRunnerRecord);
  byId('launch-candidate').addEventListener('click', () => { openCandidate(); });
  window.setInterval(() => {
    if (candidateWindow && !candidateWindow.closed) attachCandidateObserver();
  }, 750);

  renderEvaluation(collectRecord(false));
  void loadManifestAndCandidate();
})();
