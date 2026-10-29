'use strict';

// A key-cycle receipt, not a time window after composition. Windows may enqueue
// the settled Enter before compositionend is dispatched, then deliver it after.
module.exports = Object.freeze({ create: function (readFrame) {
  let composing = false, press = null, ended = null, data = null;
  const time = event => typeof event.timeStamp === 'number' && Number.isFinite(event.timeStamp) && event.timeStamp > 0 ? event.timeStamp : null;
  const code = event => event.code === 'Enter' || event.code === 'NumpadEnter' ? event.code : null;
  const modified = event => event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.repeat;
  const clear = () => { press = null; ended = null; };
  const same = (a, b) => a && b && a.raw === b.raw && a.start === b.start && a.end === b.end
    && a.direction === b.direction && a.epoch === b.epoch && b.focused === true && b.editable === true;
  return Object.freeze({
    start() { clear(); composing = true; data = null; },
    input(event) {
      if (composing && event.inputType === 'insertCompositionText' && typeof event.data === 'string') data = event.data;
      else clear();
    },
    end(event) {
      const active = composing; composing = false; ended = null;
      const at = time(event), frame = readFrame();
      if (!active || !press || at === null || at < press.at || typeof event.data !== 'string' || !event.data.length
        || event.data !== data || !frame || frame.focused !== true || frame.editable !== true || frame.start !== frame.end
        || frame.raw.slice(Math.max(0, frame.start - event.data.length), frame.start) !== event.data) { clear(); return; }
      ended = { at, frame: { ...frame } };
    },
    keydown(event) {
      const keyCode = code(event), at = time(event);
      if (!keyCode || !['Enter', 'Process'].includes(event.key) || modified(event) || event.defaultPrevented || event.cancelable === false || at === null) { clear(); return false; }
      if (composing || event.isComposing || event.keyCode === 229) {
        // Only an Enter code observed while this native composition is live.
        // An unpaired 229 elsewhere cannot reserve a later ordinary Enter.
        clear(); if (composing) press = { code: keyCode, at }; return false;
      }
      const held = press, completed = ended; clear();
      return !!held && !!completed && event.key === 'Enter' && keyCode === held.code
        && at >= held.at && at <= completed.at && same(completed.frame, readFrame());
    },
    keyup() { clear(); },
    reconcile() { if (ended && !same(ended.frame, readFrame())) clear(); },
    cancel() { clear(); composing = false; data = null; },
  });
} });
